import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Briefcase, 
  ShieldCheck, 
  Check, 
  Loader2, 
  Upload, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Activity,
  FileText,
  Search,
  Navigation,
  Sparkles
} from 'lucide-react';
import { Logo } from './Logo';
import { ErrandCategory, RunnerApplication, User as AppUser, AppSettings } from '../../types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { firebaseService } from '../../services/firebaseService';
import { API_BASE_URL } from '../../services/apiConfig';

interface RunnerApplicationPageProps {
  user: AppUser | null;
  appSettings?: AppSettings;
  onBackToHome: () => void;
}

export default function RunnerApplicationPage({ 
  user, 
  appSettings, 
  onBackToHome 
}: RunnerApplicationPageProps) {
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Application State
  const [form, setForm] = useState({
    fullName: user ? user.name : '',
    email: user ? user.email : '',
    phone: user ? user.phone : '',
    nationalId: '',
    idFrontUrl: '',
    idBackUrl: '',
    passportPhoto: '',
    address: '',
    categoryApplied: ErrandCategory.GENERAL,
    location: null as { lat: number; lng: number } | null
  });

  // Track State
  const [trackEmail, setTrackEmail] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackedApplications, setTrackedApplications] = useState<RunnerApplication[]>([]);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isTrackingInput, setIsTrackingInput] = useState(true);

  // Verification Overlay / Logic
  const [showVerification, setShowVerification] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Camera Capture for Selfie
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Location/GPS State
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        fullName: user.name,
        email: user.email,
        phone: user.phone
      }));
      // If user session is already authenticated and verified in profile, we pre-mark as verified
      if (user.emailVerified) setEmailVerified(true);
      if (user.phoneVerified) setPhoneVerified(true);

      const fetchMyApplications = async () => {
        try {
          const apps = await firebaseService.fetchRunnerApplicationsByUserId(user.id);
          setTrackedApplications(apps);
          if (apps.length > 0) {
            setIsTrackingInput(false);
          }
        } catch (err: any) {
          console.error("Failed to auto-fetch applications for user tracking:", err);
        }
      };
      fetchMyApplications();
    }
  }, [user]);

  // Request physical location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        }));
        setIsGettingLocation(false);
      },
      (err) => {
        console.error("GPS error:", err);
        alert("Failed to capture live location coordinates. Please enable site permissions.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Camera Helpers
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      setIsCameraActive(true);
      setError(null);
    } catch (err) {
      setError("Could not access camera. Please double check app permissions.");
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        setError("Camera is not initialized properly");
        return;
      }
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      const video = videoRef.current;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      context.drawImage(video, 0, 0, width, height);

      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.82);
      setForm(prev => ({ ...prev, passportPhoto: dataUrl }));
      stopCamera();
    } catch (err: any) {
      setError("Failed to capture image: " + err.message);
    }
  };

  // Upload trigger (supports Base64 or native File)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'idFrontUrl' | 'idBackUrl' | 'passportPhoto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const uploadedUrl = await cloudinaryService.uploadImage(file);
      setForm(prev => ({ ...prev, [field]: uploadedUrl }));
    } catch (err: any) {
      setError("Document upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP triggers
  const handleTriggerOtp = async (channel: 'email' | 'phone') => {
    setError(null);
    try {
      const payload = channel === 'email' ? { email: form.email } : { phone: form.phone };
      const response = await fetch(`${API_BASE_URL}/api/runner-applications/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to transmit OTP");

      if (channel === 'email') {
        setEmailOtpSent(true);
        alert("A 6-digit OTP code has been dispatched to your email: " + form.email);
      } else {
        setPhoneOtpSent(true);
        alert("A 6-digit OTP code has been transmitted to your phone: " + form.phone);
      }
    } catch (err: any) {
      setError(err.message || "Failed to transmit verification code.");
    }
  };

  const handleVerifyOtp = async (channel: 'email' | 'phone') => {
    setError(null);
    const code = channel === 'email' ? emailOtp : phoneOtp;
    if (!code) {
      setError("Please fill the verification OTP code first.");
      return;
    }

    try {
      const payload = channel === 'email' 
        ? { email: form.email, code } 
        : { phone: form.phone, code };

      const response = await fetch(`${API_BASE_URL}/api/runner-applications/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed");

      if (channel === 'email') {
        setEmailVerified(true);
        alert("Email verification successful!");
      } else {
        setPhoneVerified(true);
        alert("Phone contact verification successful!");
      }
    } catch (err: any) {
      setError(err.message || "Incorrect verification credential.");
    }
  };

  // Check Email exists & trigger Case A checks
  const handlePreApproveSubmit = async () => {
    setError(null);

    // Validate absolute requirement fields
    if (!form.fullName || !form.email || !form.phone || !form.nationalId || !form.address) {
      setError("All form fields (Name, Email, Phone, National ID, Address) are required");
      return;
    }

    if (!form.idFrontUrl || !form.idBackUrl || !form.passportPhoto) {
      setError("Please upload images for ID Card (Front and Back) and face selfie photo");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if email already has profile
      const response = await fetch(`${API_BASE_URL}/api/runner-applications/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email })
      });
      const data = await response.json();

      if (data.exists) {
        // Case A: exists -> trigger notification & must verify
        alert("Account Linked: Your existing account will be automatically converted to a Runner account once your application is approved.");
        setShowVerification(true);
        // Dispatch OTPs automatically to save steps
        if (!emailVerified) handleTriggerOtp('email');
        if (!phoneVerified) handleTriggerOtp('phone');
      } else {
        // Case B: does NOT exist -> proceed direct to creation submit!
        await proceedSubmit();
      }
    } catch (err: any) {
      setError("Pre-check failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit actual runner application
  const proceedSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let finalSelfieUrl = form.passportPhoto;
      // If we tookBase64 selfie on device, upload to Cloudinary first
      if (form.passportPhoto.startsWith('data:image')) {
        finalSelfieUrl = await cloudinaryService.uploadImage(form.passportPhoto);
      }

      const payload = {
        ...form,
        passportPhoto: finalSelfieUrl
      };

      const response = await fetch(`${API_BASE_URL}/api/runner-applications/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");

      if (data.isResubmission) {
        setSuccessMsg("Application Resubmitted! Your updated details and corrected files have been successfully resubmitted. Your application is now under formal review.");
      } else if (data.isNewAccount) {
        setSuccessMsg("Application Sent! We have automatically provisioned your brand new account. Please check your inbox for temporary temporary password and onboarding credentials!");
      } else {
        setSuccessMsg("Application Sent! Your registration is linked to your existing profile and is now under formal review. Usually approved in 24-48 hours!");
      }
      
      // Reset form variables
      setShowVerification(false);
    } catch (err: any) {
      setError(err.message || "Failed to submit runner application");
    } finally {
      setLoading(false);
    }
  };

  // Track Application Status
  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingError(null);
    if (!trackEmail.trim() && !trackPhone.trim()) {
      setTrackingError("Please enter email address or phone number to tracking application status");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/runner-applications/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trackEmail, phone: trackPhone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No active application found");

      setTrackedApplications(data.applications || []);
      setIsTrackingInput(false);
    } catch (err: any) {
      setTrackingError(err.message || "Unable to retrieve status. Triple check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = appSettings?.logoUrl || "https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Pristine Modern Corporate Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-all font-sans">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={onBackToHome}>
            <div className="w-10 h-10 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-center p-1 bg-white dark:bg-slate-900 shadow-sm">
              <Logo size={28} url={logoUrl} />
            </div>
            <span className="text-xl font-black tracking-tight text-[#0a2e5c] dark:text-white">
              Errands<span className="text-indigo-600">.</span>Runner
            </span>
          </div>

          <button 
            onClick={onBackToHome}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-12 md:py-20 px-6 max-w-4xl w-full mx-auto">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Onboarding & <span className="text-[#0ea5e9] italic font-serif">Fleet</span> Verification
            </h1>
            <p className="text-slate-500 font-medium text-base">
              Apply to join our elite task fleet, complete identity credentials, or trace your application approval logs instantly below.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-3xl flex gap-1 max-w-sm mx-auto shadow-inner">
            <button
              onClick={() => { setActiveTab('apply'); setSuccessMsg(null); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${
                activeTab === 'apply' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Apply as Runner
            </button>
            <button
              onClick={() => { setActiveTab('track'); setSuccessMsg(null); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${
                activeTab === 'track' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Track Application
            </button>
          </div>

          <AnimatePresence mode="wait">
            {successMsg ? (
              <motion.div 
                key="successScreen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl text-center space-y-8"
              >
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Application Successfully Uploaded!</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed text-sm">
                    {successMsg}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => { setSuccessMsg(null); setActiveTab('track'); }}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Track Review Progress
                  </button>
                  <button 
                    onClick={onBackToHome}
                    className="px-8 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Return Home
                  </button>
                </div>
              </motion.div>
            ) : activeTab === 'apply' ? (
              <motion.div 
                key="applySection"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden p-8 md:p-12 space-y-10"
              >
                {/* Form header details */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Become an Elite Runner</h3>
                    <p className="text-xs font-bold text-slate-400">Provide verified identity background and physical address coordinates.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Full Name (per ID Card)</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={form.fullName} 
                        onChange={e => setForm({...form, fullName: e.target.value})}
                        placeholder="John Doe" 
                        className="w-full text-sm font-bold pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* National ID */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">National ID Number</label>
                    <div className="relative">
                      <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={form.nationalId} 
                        onChange={e => setForm({...form, nationalId: e.target.value})}
                        placeholder="e.g. 34567890" 
                        className="w-full text-sm font-bold pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email" 
                        value={form.email} 
                        onChange={e => setForm({...form, email: e.target.value})}
                        disabled={user !== null}
                        placeholder="yourname@gmail.com" 
                        className="w-full text-sm font-bold pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Phone Number (10-Digit Mobile)</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={form.phone} 
                        onChange={e => setForm({...form, phone: e.target.value})}
                        disabled={user !== null}
                        placeholder="e.g. 0712345678" 
                        className="w-full text-sm font-bold pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Errand Category Choice */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Select Core Category Requested</label>
                    <select 
                      value={form.categoryApplied} 
                      onChange={e => setForm({...form, categoryApplied: e.target.value as ErrandCategory})}
                      className="w-full text-sm font-bold px-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                    >
                      {Object.values(ErrandCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Residence address */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Physical Residence Address</label>
                    <textarea 
                      value={form.address} 
                      onChange={e => setForm({...form, address: e.target.value})}
                      placeholder="e.g. Apartment A2, Oasis Terraces, Ngong Road, Nairobi" 
                      className="w-full text-sm font-medium p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all min-h-[100px]"
                    />
                  </div>

                  {/* GPS Coordinates tracking */}
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Live Location Capture (GPS Coordinates)</p>
                    <div className={`p-4 border rounded-3xl flex items-center justify-between transition-all ${
                      form.location 
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' 
                        : 'bg-slate-50/50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.location ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <Navigation size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold font-sans">Verification Coordinates</p>
                          <p className="text-[10px] text-slate-500">
                            {form.location 
                              ? `Coordinates Registered: Lat ${form.location.lat.toFixed(4)}, Lng ${form.location.lng.toFixed(4)}` 
                              : 'Capture GPS coordinates to confirm real presence residence'
                            }
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                          form.location 
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                            : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isGettingLocation ? <Loader2 size={12} className="animate-spin" /> : form.location ? 'Captured ✓' : 'Get Location'}
                      </button>
                    </div>
                  </div>

                  {/* Identity Document Upload Section */}
                  <div className="space-y-3 md:col-span-2 pt-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Identity Documents & Verification Uploads</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* ID Front */}
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 flex flex-col items-center justify-center aspect-[5/3] overflow-hidden relative group">
                        {form.idFrontUrl ? (
                          <>
                            <img src={form.idFrontUrl} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer">
                                Update Front
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'idFrontUrl')} />
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload size={24} className="text-slate-400" />
                            <div>
                              <p className="text-xs font-bold">National ID Card (Front)</p>
                              <p className="text-[10px] text-slate-400">Allowed formats: PNG, JPG, WEBP</p>
                            </div>
                            <label className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer">
                              Upload Front File
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'idFrontUrl')} />
                            </label>
                          </>
                        )}
                      </div>

                      {/* ID Back */}
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 flex flex-col items-center justify-center aspect-[5/3] overflow-hidden relative group">
                        {form.idBackUrl ? (
                          <>
                            <img src={form.idBackUrl} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer">
                                Update Back
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'idBackUrl')} />
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload size={24} className="text-slate-400" />
                            <div>
                              <p className="text-xs font-bold">National ID Card (Back)</p>
                              <p className="text-[10px] text-slate-400">Allowed formats: PNG, JPG, WEBP</p>
                            </div>
                            <label className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer">
                              Upload Back File
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'idBackUrl')} />
                            </label>
                          </>
                        )}
                      </div>

                      {/* Face Selfie Check with Live Camera Option */}
                      <div className="sm:col-span-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 flex flex-col items-center justify-center">
                        <p className="text-xs font-bold">Take Live Face Selfie Photo</p>
                        <p className="text-[10px] text-slate-400 max-w-sm">Capture a well-lit self-portrait photo to confirm consistency with document identities.</p>

                        <div className="w-56 h-56 rounded-full overflow-hidden relative border-4 border-white dark:border-slate-800 shadow-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center mx-auto">
                          {isCameraActive ? (
                            <>
                              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                              <button 
                                type="button" 
                                onClick={capturePhoto}
                                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white rounded-full p-3 shadow-lg active:scale-90 transition-transform z-10"
                              >
                                <Camera size={16} />
                              </button>
                            </>
                          ) : form.passportPhoto ? (
                            <div className="w-full h-full relative">
                              <img src={form.passportPhoto} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button type="button" onClick={startCamera} className="p-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">Retake</button>
                              </div>
                            </div>
                          ) : (
                            <User size={64} className="text-slate-300" />
                          )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="flex gap-2">
                          {!isCameraActive && (
                            <button 
                              type="button" 
                              onClick={startCamera} 
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              Start Camera
                            </button>
                          )}
                          {isCameraActive && (
                            <button 
                              type="button" 
                              onClick={stopCamera} 
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              Cancel Camera
                            </button>
                          )}
                          <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer">
                            Upload File Instead
                            <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'passportPhoto')} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={16} />
                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handlePreApproveSubmit}
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 disabled:cursor-not-allowed text-white rounded-2.5xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Runner Onboarding'}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="trackSection"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl p-8 md:p-12 space-y-10"
              >
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Activity size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Trace My Application</h3>
                    <p className="text-xs font-bold text-slate-400">Query the real-time review status of your submitted runner registration.</p>
                  </div>
                </div>

                {isTrackingInput ? (
                  <form onSubmit={handleTrackSearch} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="email" 
                            value={trackEmail} 
                            onChange={e => setTrackEmail(e.target.value)}
                            placeholder="yourname@gmail.com" 
                            className="w-full text-sm font-bold pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            value={trackPhone} 
                            onChange={e => setTrackPhone(e.target.value)}
                            placeholder="e.g. 0712345678" 
                            className="w-full text-sm font-bold pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2.5xl outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {trackingError && (
                      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 rounded-2xl flex items-start gap-3">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <p className="text-xs font-bold leading-relaxed">{trackingError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 disabled:cursor-not-allowed text-white rounded-2.5xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={14} /> Search My Application</>}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-8">
                    {trackedApplications.map((app) => {
                      const isApproved = app.status === 'approved';
                      const isPending = app.status === 'pending';
                      const isRejected = app.status === 'rejected';
                      const isReturned = app.status === 'returned';
                      const isResubmitted = app.status === 'Resubmitted' || app.status === 'resubmitted';

                      return (
                        <div key={app.id} className="p-8 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-950 space-y-6 shadow-sm">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Application Reference ID</p>
                              <p className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{app.id}</p>
                            </div>
                            <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl ${
                              isApproved ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' :
                              isResubmitted ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40' :
                              isPending ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' :
                              isReturned ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40' :
                              'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                            }`}>
                              {app.status}
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Applicant Name:</span>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{app.fullName}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Core Category:</span>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{app.categoryApplied}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Email / Contact:</span>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{app.email}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium font-sans">Registered Address:</span>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{app.address}</p>
                            </div>
                          </div>

                          {/* Descriptive timeline notes */}
                          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Onboarding Action Status Notes</p>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                              {isApproved && "Status Approved: Congratulations! Our verification office has elevated your account credentials. Open the main portal dashboard and log in to inspect available client runs."}
                              {isResubmitted && "Status Resubmitted: Your corrected registration details and uploaded documents have been successfully resubmitted. Your application has been returned to the verification queue and is under review."}
                              {isPending && "Status Under Review: Your physical residence geolocation coordinates, background credentials, and uploaded identity cards are currently progressing through our safety queues. Usually completed in 24-48 hours."}
                              {isReturned && "Status Returned for Correction: Our review board identified missing documents or details requiring correction. Please review the comments below, edit and resubmit your application."}
                              {isRejected && "Status Rejected: Unfortunately, your document credentials could not be fully verified against national record services. Please contact support to appeal."}
                            </p>
                          </div>

                          {/* Correction Reason Card */}
                          {isReturned && (
                            <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/35 rounded-2xl space-y-3">
                              <div>
                                <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">Correction & Remarks Comments:</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5 font-medium leading-relaxed italic">
                                  "{app.returnReason || 'A correction is needed on your documentation. Please review and resubmit.'}"
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setForm({
                                    fullName: app.fullName || '',
                                    email: app.email || '',
                                    phone: app.phone || '',
                                    nationalId: app.nationalId || '',
                                    idFrontUrl: app.idFrontUrl || '',
                                    idBackUrl: app.idBackUrl || '',
                                    passportPhoto: app.passportPhoto || '',
                                    address: app.address || '',
                                    categoryApplied: app.categoryApplied || ErrandCategory.GENERAL,
                                    location: app.location || null
                                  });
                                  setActiveTab('apply');
                                }}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm shadow-amber-200"
                              >
                                Update & Resubmit Application
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={() => setIsTrackingInput(true)}
                      className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all"
                    >
                      Track Another Application
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Verification Code overlay (modal popup for linking Case A accounts) */}
      <AnimatePresence>
        {showVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowVerification(false)}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative space-y-6 z-10"
            >
              <div className="space-y-2 text-center">
                <ShieldCheck size={36} className="text-indigo-600 mx-auto" />
                <h3 className="text-xl font-black">Security Pin Verification</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  To trace and link this application securely to your pre-existing profile, verify ownership of email & phone counters.
                </p>
              </div>

              <div className="space-y-6 pt-4">
                {/* Email verification input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Verify: {form.email}</span>
                    <button 
                      type="button" 
                      onClick={() => handleTriggerOtp('email')}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      {emailOtpSent ? 'Resend Pin' : 'Send Pin'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={emailOtp} 
                      onChange={e => setEmailOtp(e.target.value)}
                      placeholder="6-digit PIN" 
                      disabled={emailVerified}
                      className="flex-1 text-sm font-semibold p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-600"
                    />
                    <button 
                      type="button" 
                      disabled={emailVerified}
                      onClick={() => handleVerifyOtp('email')}
                      className={`px-5 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all ${
                        emailVerified ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {emailVerified ? 'Success ✓' : 'Verify'}
                    </button>
                  </div>
                </div>

                {/* Phone verification input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Verify: {form.phone}</span>
                    <button 
                      type="button" 
                      onClick={() => handleTriggerOtp('phone')}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      {phoneOtpSent ? 'Resend Pin' : 'Send Pin'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={phoneOtp} 
                      onChange={e => setPhoneOtp(e.target.value)}
                      placeholder="6-digit PIN" 
                      disabled={phoneVerified}
                      className="flex-1 text-sm font-semibold p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-600"
                    />
                    <button 
                      type="button" 
                      disabled={phoneVerified}
                      onClick={() => handleVerifyOtp('phone')}
                      className={`px-5 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all ${
                        phoneVerified ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {phoneVerified ? 'Success ✓' : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <p className="text-xs font-bold leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-slate-600 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={proceedSubmit}
                  disabled={!emailVerified || !phoneVerified || loading}
                  className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all flex items-center justify-center gap-1"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : 'Confirm & Proceed'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
