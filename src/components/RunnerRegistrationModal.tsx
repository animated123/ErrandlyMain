import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Camera, 
  MapPin, 
  Wallet, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  X, 
  Loader2,
  Upload,
  User,
  Navigation
} from 'lucide-react';
import { Coordinates, RunnerApplication } from '../../types';

interface RunnerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  currentLocation: Coordinates | null;
  existingApplication?: RunnerApplication | null;
}

export default function RunnerRegistrationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentLocation,
  existingApplication 
}: RunnerRegistrationModalProps) {
  const [step, setStep] = useState(existingApplication ? 5 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(existingApplication ? 5 : 1);
      setError(null);
      if (!existingApplication) {
        setFormData({
          idFrontUrl: '',
          idBackUrl: '',
          passportPhoto: '',
          address: '',
          fullName: '',
          nationalId: ''
        });
      }
    }
  }, [isOpen, existingApplication]);
  
  // Form State
  const [formData, setFormData] = useState({
    idFrontUrl: '',
    idBackUrl: '',
    passportPhoto: '',
    address: '',
    fullName: '',
    nationalId: ''
  });

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      setIsCameraActive(true);
      setError(null);
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
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
      if (!videoRef.current) {
        setError("Camera not ready.");
        return;
      }
      if (!canvasRef.current) {
        setError("Missing canvas element.");
        return;
      }

      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;
      
      if (!context) {
        setError("Could not initialize image capture.");
        return;
      }

      // Fallback for if video hasn't fully loaded metadata yet
      const width = video.videoWidth || video.clientWidth || 640;
      const height = video.videoHeight || video.clientHeight || 480;
      
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // If we are mirroring the video via CSS, we might want to mirror it on canvas too, 
      // but simple drawImage works fine.
      context.drawImage(video, 0, 0, width, height);
      
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      if (dataUrl === 'data:,') {
        // Sometimes toDataURL returns 'data:,' if canvas is 0x0
        setError("Failed to capture image. Please try again.");
        return;
      }

      setFormData(prev => ({ ...prev, passportPhoto: dataUrl }));
      stopCamera();
    } catch (err: any) {
      setError("Error taking photo: " + (err.message || String(err)));
      console.error(err);
    }
  };

  const handleNext = () => {
    if (step === 2 && (!formData.idFrontUrl || !formData.idBackUrl || !formData.fullName || !formData.nationalId)) {
      setError("Please complete all ID details.");
      return;
    }
    if (step === 3 && !formData.passportPhoto) {
      setError("Please take a passport photo.");
      return;
    }
    if (step === 4 && (!formData.address || !currentLocation)) {
      setError("Address and live location are mandatory.");
      return;
    }
    setError(null);
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        location: currentLocation
      });
      setStep(5); // Success step
    } catch (err) {
      setError("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Become a Runner</h2>
            <p className="text-sm text-slate-500 font-medium">Professional Verification Process</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-indigo-600/10 rounded-[1.5rem] flex items-center justify-center text-indigo-600 mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold">Verification Requirements</h3>
                <p className="text-slate-600 dark:text-slate-400">To maintain safety on our platform, all runners must complete our verification process. You will need:</p>
                <div className="grid gap-4">
                  {[
                    { icon: <Wallet size={18} />, title: 'National ID', desc: 'Photos of both sides of your ID card' },
                    { icon: <Camera size={18} />, title: 'Live Passport Photo', desc: 'A clear photo taken with your camera' },
                    { icon: <MapPin size={18} />, title: 'Physical Address', desc: 'Where you currently reside' },
                    { icon: <Navigation size={18} />, title: 'Live Location', desc: 'To coordinate with requesters' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleNext}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold">Identity Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name (as per ID)</label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold mt-1 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">National ID Number</label>
                    <input 
                      type="text"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold mt-1 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all"
                      placeholder="e.g. 12345678"
                      value={formData.nationalId}
                      onChange={e => setFormData(f => ({ ...f, nationalId: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">ID Front</p>
                      <label className="aspect-[3/2] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all overflow-hidden relative">
                         {formData.idFrontUrl ? (
                           <img src={formData.idFrontUrl} className="w-full h-full object-cover" />
                         ) : (
                           <>
                             <Upload size={24} className="text-slate-400 mb-2" />
                             <span className="text-[10px] font-bold">Upload Front</span>
                           </>
                         )}
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setFormData(f => ({ ...f, idFrontUrl: reader.result as string }));
                             reader.readAsDataURL(file);
                           }
                         }} />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">ID Back</p>
                      <label className="aspect-[3/2] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all overflow-hidden relative">
                         {formData.idBackUrl ? (
                           <img src={formData.idBackUrl} className="w-full h-full object-cover" />
                         ) : (
                           <>
                             <Upload size={24} className="text-slate-400 mb-2" />
                             <span className="text-[10px] font-bold">Upload Back</span>
                           </>
                         )}
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setFormData(f => ({ ...f, idBackUrl: reader.result as string }));
                             reader.readAsDataURL(file);
                           }
                         }} />
                      </label>
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                  <button onClick={handleNext} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Next</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold">Live Passport Photo</h3>
                <p className="text-sm text-slate-500">Please take a clear passport-style photo of your face.</p>

                <div className="aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden relative border-4 border-white dark:border-slate-800 shadow-xl">
                  {isCameraActive ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                      <div className="absolute inset-0 border-[40px] border-black/40 rounded-[2.5rem] pointer-events-none">
                        <div className="w-full h-full border-2 border-white/40 border-dashed rounded-[100%] scale-x-[0.7] scale-y-[0.8]" />
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          capturePhoto();
                        }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10"
                      >
                        <div className="w-12 h-12 border-2 border-slate-900 rounded-full" />
                      </button>
                    </>
                  ) : formData.passportPhoto ? (
                    <div className="w-full h-full relative">
                      <img src={formData.passportPhoto} className="w-full h-full object-cover" />
                      <button 
                        onClick={startCamera}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                      <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-white">
                        <User size={40} />
                      </div>
                      <button 
                        onClick={startCamera}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest"
                      >
                        Start Camera
                      </button>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex gap-4">
                  <button onClick={() => { stopCamera(); setStep(2); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                  <button onClick={handleNext} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Next</button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold">Address & Location</h3>
                <p className="text-sm text-slate-500">Finally, provide your current physical residence address.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Current Physical Address</label>
                    <textarea 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold mt-1 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all min-h-[100px]"
                      placeholder="e.g. Apartment 4B, Sunrise Heights, Ngong Road, Nairobi"
                      value={formData.address}
                      onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>

                  <div className={`p-6 rounded-3xl border ${currentLocation ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentLocation ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Navigation size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">Live Location Status</p>
                        <p className="text-xs text-slate-500">
                          {currentLocation ? 'Live location received successfully' : 'Waiting for GPS signal...'}
                        </p>
                      </div>
                      {currentLocation ? (
                         <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                           <Check size={14} />
                         </div>
                      ) : (
                        <Loader2 className="animate-spin text-slate-400" size={20} />
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                      By proceeding, you agree that your live location will be shared with the platform for verification purposes. Mandatorily required for all active runners.
                    </p>
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Submit Application'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
               >
                <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-lg ${
                  existingApplication?.status === 'rejected' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600'
                }`}>
                  {existingApplication?.status === 'rejected' ? <AlertCircle size={48} /> : <Check size={48} />}
                </div>
                <h3 className="text-3xl font-black tracking-tight">
                  {existingApplication ? (
                    existingApplication.status === 'pending' ? 'Review in Progress' :
                    existingApplication.status === 'approved' ? 'Application Approved!' :
                    'Application Rejected'
                  ) : 'Application Sent!'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {existingApplication ? (
                    existingApplication.status === 'pending' ? 'Your details are being reviewed by our team. This usually takes 24-48 hours.' :
                    existingApplication.status === 'approved' ? 'Congratulations! You are now a certified runner.' :
                    'Unfortunately, your application was not successful at this time.'
                  ) : 'Our team will review your application within 24-48 hours. You will receive a notification once verified.'}
                </p>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  {existingApplication?.status === 'rejected' ? 'Try Again Later' : 'Go Back to Home'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
