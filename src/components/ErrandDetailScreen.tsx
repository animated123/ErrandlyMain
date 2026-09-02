import React, { useState } from 'react';
import { X, MapPin, DollarSign, Clock, User as UserIcon, MessageSquare, CheckCircle, Star, Shield, ShieldCheck, Navigation, Phone, Mail, ChevronLeft, Loader2, Download, Camera, Image, Trash2, Receipt, Sparkles, ShoppingCart, Check, Home, Map as MapIcon, Plus, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Errand, ErrandStatus, User, UserRole, ErrandCategory, PropertyListing, Coordinates } from '../../types';
import { pdfService } from '../../services/pdfService';
import { cloudinaryService } from '../../services/cloudinaryService';
import { firebaseService } from '../../services/firebaseService';
import { geminiService } from '../../services/geminiService';
import { generateErrandWhatsAppShareUrl, generateErrandDeepLink } from '../../services/whatsappNotificationService';
import CameraCapture from './CameraCapture';
import MapComponent from './MapComponent';
import GoogleMapPicker from './GoogleMapPicker';
import UserAvatar from './UserAvatar';
import { useErrandStatusSync } from '../hooks/useErrandStatusSync';
import { haptics } from '../lib/haptics';

interface ErrandDetailScreenProps {
  errand: Errand;
  user: User | null;
  onClose: () => void;
  onBid: (amount: number, message: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onReview: (id: string, comments: string, photo?: string) => Promise<void>;
  loading: boolean;
  googleMapsApiKey: string;
  googleRoutesApiKey: string;
  initialTab?: 'details' | 'shopping' | 'map' | 'tracking';
}

export default function ErrandDetailScreen({ 
  errand, 
  user, 
  onClose, 
  onBid, 
  onComplete, 
  onReview, 
  loading, 
  googleMapsApiKey, 
  googleRoutesApiKey,
  initialTab = 'details'
}: ErrandDetailScreenProps) {
  const { syncedErrand, hasAdvanced } = useErrandStatusSync(errand.id, errand);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'receipt' | 'listing'>('receipt');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'shopping' | 'map' | 'tracking'>(initialTab);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [newListing, setNewListing] = useState<Partial<PropertyListing>>({
    title: '',
    price: 0,
    location: '',
    type: errand.houseType || 'Bedsitter',
    description: '',
    runnerView: '',
    amenities: []
  });
  const [listingImage, setListingImage] = useState<string | null>(null);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = () => {
    const { deepLink, whatsappUrl } = generateErrandWhatsAppShareUrl(syncedErrand);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deepLink).catch(() => {});
    }
    setCopiedShare(true);
    haptics.light();
    setTimeout(() => setCopiedShare(false), 2500);
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getStageInfo = () => {
    switch (syncedErrand.status) {
      case ErrandStatus.PENDING: return { label: 'Awaiting Bids', percent: 10, color: 'bg-slate-400' };
      case ErrandStatus.BIDDING: return { label: 'Evaluating Bids', percent: 20, color: 'bg-indigo-400' };
      case ErrandStatus.ASSIGNED: return { label: 'Runner Dispatched', percent: 40, color: 'bg-indigo-500' };
      case ErrandStatus.IN_PROGRESS: return { label: 'Task in Progress', percent: 65, color: 'bg-blue-500' };
      case ErrandStatus.ACCEPTED: return { label: 'Work Accepted', percent: 75, color: 'bg-blue-600' };
      case ErrandStatus.VERIFYING: return { label: 'Verifying Results', percent: 85, color: 'bg-amber-500' };
      case ErrandStatus.REVIEW: return { label: 'Final Review', percent: 95, color: 'bg-emerald-500' };
      case ErrandStatus.COMPLETED: return { label: 'Completed', percent: 100, color: 'bg-emerald-600' };
      case ErrandStatus.CANCELLED: return { label: 'Cancelled', percent: 0, color: 'bg-rose-500' };
      case ErrandStatus.FAILED: return { label: 'Failed', percent: 0, color: 'bg-rose-600' };
      case ErrandStatus.DISPUTED: return { label: 'In Dispute', percent: 50, color: 'bg-orange-500' };
      default: return { label: 'Unknown Status', percent: 0, color: 'bg-slate-300' };
    }
  };

  const { label: stageLabel, percent: progress, color: stageColor } = getStageInfo();
  
  const isRequester = user?.id === errand.requesterId;
  const isRunner = user?.id === syncedErrand.runnerId;
  const canBid = user?.role === UserRole.RUNNER && !syncedErrand.runnerId && syncedErrand.status === ErrandStatus.PENDING;

  const handleUpdateLocation = async () => {
    if (!isRunner) return;
    setIsUpdatingLocation(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        await firebaseService.updateRunnerLocation(errand.id, coords);
        haptics.light();
        alert("Location updated successfully!");
      }, (error) => {
        console.error(error);
        alert("Failed to get location: " + error.message);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleCapture = async (dataUrl: string) => {
    if (cameraMode === 'receipt') {
      setUploadingReceipt(true);
      try {
        const url = await cloudinaryService.uploadFile(dataUrl, 'receipts');
        await firebaseService.updateErrand(errand.id, { receiptUrl: url });
        haptics.medium();
        alert("Receipt uploaded successfully!");
      } catch (e) {
        console.error(e);
        alert("Failed to upload receipt.");
      } finally {
        setUploadingReceipt(false);
      }
    } else {
      setListingImage(dataUrl);
    }
    setShowCamera(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-20 duration-500 md:max-w-none md:rounded-none">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl z-10">
        <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all hover:rotate-90">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight font-display">Errand Details</h2>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${syncedErrand.status === ErrandStatus.COMPLETED ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest ${syncedErrand.status === ErrandStatus.COMPLETED ? 'text-emerald-500' : 'text-slate-400'}`}>
              {syncedErrand.status}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare} 
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 ${
              copiedShare 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-600 hover:text-white'
            }`}
            title="Share via WhatsApp"
          >
            {copiedShare ? (
              <>
                <Check size={14} className="shrink-0" />
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} className="shrink-0" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>
      </header>
      
      {/* Visual Progress Bar */}
      <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 transition-colors duration-500 ${hasAdvanced ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-slate-50 dark:bg-slate-900'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stageColor} ${hasAdvanced ? 'animate-bounce' : 'animate-pulse'}`} />
            <span className={`text-[10px] font-black uppercase tracking-[0.1em] transition-colors ${hasAdvanced ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {hasAdvanced ? '✨ Stage Advanced: ' : 'Current Stage: '}
              <span className={hasAdvanced ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}>{stageLabel}</span>
            </span>
          </div>
          <span className={`text-[10px] font-black tabular-nums transition-colors ${hasAdvanced ? 'text-indigo-700 dark:text-indigo-300 scale-110' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {progress}% COMPLETE
          </span>
        </div>
        <div className="relative h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ 
              duration: hasAdvanced ? 2.5 : 1.2, 
              ease: hasAdvanced ? [0.34, 1.56, 0.64, 1] : "easeOut"
            }}
            className={`absolute inset-y-0 left-0 rounded-full ${stageColor} shadow-[0_0_10px_rgba(79,70,229,0.3)]`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 ${hasAdvanced ? 'animate-[shimmer_1s_infinite_linear]' : 'animate-shimmer'}`} />
          </motion.div>
        </div>
        
        {/* Stage Timeline Dots */}
        <div className="flex justify-between mt-3 px-1">
          {[0, 25, 50, 75, 100].map((dot) => (
            <div 
              key={dot} 
              className={`w-1 h-1 rounded-full transition-colors duration-500 ${progress >= dot ? stageColor : 'bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>
      </div>

      {/* Tabs */}
      {(errand.category === ErrandCategory.SHOPPING || errand.category === ErrandCategory.MARKET_SHOPPING || errand.category === ErrandCategory.HOUSE_HUNTING) && (
        <div className="px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'details', label: 'Overview' },
            { id: 'shopping', label: errand.category === ErrandCategory.HOUSE_HUNTING ? 'Requirements' : 'Checklist' },
            { id: 'map', label: 'Map View', hidden: errand.category !== ErrandCategory.HOUSE_HUNTING },
            { id: 'tracking', label: 'Real-time', hidden: !(syncedErrand.status === ErrandStatus.ASSIGNED || syncedErrand.status === ErrandStatus.IN_PROGRESS || syncedErrand.status === ErrandStatus.COMPLETED) }
          ].filter(t => !t.hidden).map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-[10px] font-black tracking-[0.2em] uppercase transition-all relative flex-shrink-0 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full pointer-events-none" 
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'details' ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black text-foreground tracking-tight">{errand.title}</h1>
                <div className="bg-indigo-50 px-3 py-1.5 rounded-xl text-indigo-600 font-black text-sm">
                  KSH {errand.budget}
                </div>
              </div>
              <p className="text-sm font-bold text-muted-foreground leading-relaxed">{errand.description}</p>
            </div>

            {(syncedErrand.status === ErrandStatus.ASSIGNED || syncedErrand.status === ErrandStatus.IN_PROGRESS) && (
              <button 
                onClick={() => setActiveTab('tracking')}
                className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wider hover:bg-emerald-100 transition-all"
              >
                <Navigation size={18} className="animate-pulse" />
                View Real-time Progress
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-muted p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-card text-card-foreground rounded-lg text-indigo-600 shadow-sm">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Pickup Location</p>
                    <p className="text-xs font-black text-foreground">{errand.pickupLocation}</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-card text-card-foreground rounded-lg text-emerald-600 shadow-sm">
                    <Navigation size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Drop-off Location</p>
                    <p className="text-xs font-black text-foreground">{errand.dropoffLocation || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-black text-foreground tracking-tight">Requester</h3>
              <div className="bg-card text-card-foreground p-3 rounded-2xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar src={null} name={errand.requesterName} className="w-10 h-10 rounded-xl" isVerified={errand.requesterIsVerified} />
                  <div>
                    <p className="text-sm font-black text-foreground">{errand.requesterName}</p>
                    <div className="flex items-center gap-1 text-xs font-black text-amber-500 tracking-normal font-medium">
                      <Star size={14} fill="currentColor" />
                      4.9 Rating
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {errand.requesterPhone && (
                    <a 
                      href={`tel:${errand.requesterPhone}`}
                      className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:text-indigo-600 transition-colors"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                  <button className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:text-indigo-600 transition-colors">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>
            </div>

            {syncedErrand.runnerId && (
              <div className="space-y-3">
                <h3 className="text-lg font-black text-foreground tracking-tight">Runner</h3>
                <div className="bg-card text-card-foreground p-3 rounded-2xl border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar src={null} name={syncedErrand.runnerName} className="w-10 h-10 rounded-xl" isVerified={syncedErrand.runnerIsVerified} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-foreground">{syncedErrand.runnerName}</p>
                        {errand.runnerIsVerified && (
                          <ShieldCheck size={14} className="text-emerald-500 fill-emerald-50" />
                        )}
                      </div>
                      {errand.runnerIsVerified && (
                        <div className="flex items-center gap-1 text-xs font-black text-emerald-500 tracking-normal font-medium">
                          <Shield size={14} fill="currentColor" />
                          Verified Runner
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {errand.runnerPhone && (
                      <a 
                        href={`tel:${errand.runnerPhone}`}
                        className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:text-indigo-600 transition-colors"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                    <button className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:text-indigo-600 transition-colors">
                      <MessageSquare size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : errand.category === ErrandCategory.HOUSE_HUNTING ? (
          <div className="space-y-6">
            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-amber-900 tracking-tight">Property Specs</h3>
                <div className="px-3 py-1.5 bg-amber-100 text-amber-600 rounded-xl text-sm font-black tracking-normal font-medium">
                  {errand.houseType}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-amber-400 tracking-normal font-medium">Rent Budget</p>
                  <p className="text-base font-black text-amber-900">KSH {(errand.rentBudgetMin || 0).toLocaleString()} - {(errand.rentBudgetMax || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-amber-400 tracking-normal font-medium">Target Estates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {errand.targetEstates?.map((estate, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-card text-card-foreground rounded-lg text-xs font-black text-amber-600 tracking-normal font-medium border border-amber-100 shadow-sm">
                        {estate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {errand.commuteDistanceEnabled && (
                <div className="p-4 bg-card text-card-foreground rounded-2xl border border-amber-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 shadow-sm">
                      <Navigation size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Commute Priority</p>
                      <p className="text-xs font-black text-foreground">Near {errand.commuteReferencePoint || 'Work'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-black text-amber-400 tracking-normal font-medium">Required Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {errand.amenities?.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-card-foreground rounded-xl text-sm font-bold text-foreground border border-amber-100 shadow-sm">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-amber-200 space-y-4">
                <div className="px-1">
                  <h4 className="text-sm font-black text-amber-900 tracking-normal font-medium">Runner Task Checklist</h4>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {errand.runnerTasks?.map((taskId, idx) => {
                    const taskLabels: Record<string, string> = {
                      video: 'Live Video Call',
                      photos: 'Photos of Specific Areas',
                      interview: 'Caretaker Interview',
                      neighborhood: 'Neighborhood Check'
                    };
                    return (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-card text-card-foreground rounded-2xl border border-amber-100 shadow-sm">
                        <div className="w-5 h-5 bg-amber-600 rounded-lg flex items-center justify-center text-white">
                          <Check size={16} />
                        </div>
                        <span className="text-xs font-black text-amber-900 tracking-normal font-medium">{taskLabels[taskId] || taskId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 border-t border-amber-200 space-y-3">
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-black text-amber-400 tracking-normal font-medium">Scouting Base Fee</span>
                  <span className="text-base font-black text-amber-900">KSH 500</span>
                </div>
                {errand.calculatedPrice && (
                  <>
                    <div className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={16} className="text-amber-400" />
                        <span className="text-sm font-black text-amber-400 tracking-normal font-medium">Service Fee</span>
                      </div>
                      <span className="text-base font-black text-amber-900">KSH {errand.calculatedPrice}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-amber-600 rounded-2xl shadow-lg shadow-amber-100">
                      <span className="text-sm font-black text-white tracking-normal font-medium">Total Service Cost</span>
                      <span className="text-lg font-black text-white">KSH {errand.calculatedPrice}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Runner Property Listing Section */}
              {isRunner && syncedErrand.status === ErrandStatus.IN_PROGRESS && (
                <div className="pt-6 border-t border-amber-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-amber-900 tracking-normal font-medium">Your Findings</h4>
                    <button 
                      onClick={() => setShowAddListing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-black tracking-normal font-medium shadow-lg shadow-amber-100"
                    >
                      <Plus size={16} /> Add House
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {errand.propertyListings?.map((listing: PropertyListing) => (
                      <div key={listing.id} className="bg-card text-card-foreground rounded-2xl border border-amber-100 overflow-hidden shadow-sm flex">
                        <img src={listing.imageUrl} alt={listing.title} className="w-20 h-20 object-cover" />
                        <div className="p-3 flex-1">
                          <div className="flex justify-between items-start">
                            <h5 className="text-xs font-black text-foreground">{listing.title}</h5>
                            <span className="text-sm font-black text-amber-600">KSH {(listing.price || 0).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{listing.location}</p>
                          <p className="text-xs font-bold text-amber-500 mt-0.5">"{listing.runnerView}"</p>
                        </div>
                      </div>
                    ))}
                    {(!errand.propertyListings || errand.propertyListings.length === 0) && (
                      <div className="p-8 text-center bg-card text-card-foreground rounded-2xl border border-dashed border-amber-200">
                        <Home size={24} className="mx-auto text-amber-200 mb-1.5" />
                        <p className="text-sm font-bold text-amber-400">No houses added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'map' ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex-1 min-h-[500px] relative">
              <MapComponent 
                errands={[errand]}
                runners={[]}
                apiKey={googleMapsApiKey}
                routesApiKey={googleRoutesApiKey}
                center={errand.pickupCoordinates}
                onSelectProperty={(listing) => setSelectedListing(listing)}
                zoom={14}
              />
              
              {/* Custom Overlay for Property Pins */}
              <div className="absolute inset-0 pointer-events-none">
                {/* This is a placeholder for actual map integration. 
                    In a real app, I'd update MapComponent to handle propertyListings.
                    For now, I'll ensure MapComponent is updated next. */}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-foreground tracking-tight">Found Houses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {errand.propertyListings?.map((listing: PropertyListing) => (
                  <button 
                    key={listing.id}
                    onClick={() => setSelectedListing(listing)}
                    className="bg-card text-card-foreground p-4 rounded-3xl border border-border shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-all text-left"
                  >
                    <img src={listing.imageUrl} alt={listing.title} className="w-16 h-16 rounded-2xl object-cover" />
                    <div>
                      <p className="text-sm font-black text-foreground">{listing.title}</p>
                      <p className="text-xs font-bold text-indigo-600">KSH {(listing.price || 0).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[150px]">{listing.location}</p>
                    </div>
                  </button>
                ))}
                {(!errand.propertyListings || errand.propertyListings.length === 0) && (
                  <div className="col-span-full p-10 text-center bg-muted rounded-3xl border border-dashed border-border">
                    <MapIcon size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs font-bold text-muted-foreground">No houses mapped yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'tracking' ? (
          <div className="h-full flex flex-col space-y-4">
            <div className="flex-1 min-h-[500px] relative rounded-[2.5rem] overflow-hidden border border-border">
              <MapComponent 
                errands={[errand]}
                runners={errand.runnerLocation ? [{ 
                  id: errand.runnerId || '', 
                  name: errand.runnerName || 'Runner', 
                  lastKnownLocation: errand.runnerLocation,
                  avatar: null
                } as any] : []}
                apiKey={googleMapsApiKey}
                routesApiKey={googleRoutesApiKey}
                center={errand.runnerLocation || errand.pickupCoordinates}
                showRoute={true}
                customRoute={errand.runnerLocation && errand.dropoffCoordinates ? {
                  origin: errand.runnerLocation,
                  destination: errand.dropoffCoordinates
                } : undefined}
                zoom={15}
              />
              
              <div className="absolute top-4 left-4 right-4 z-[10] flex flex-col gap-2">
                <div className="bg-card/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Navigation size={20} className={syncedErrand.status === ErrandStatus.IN_PROGRESS ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">Runner Progress</p>
                      <p className="text-xs text-muted-foreground">
                        {syncedErrand.status === ErrandStatus.ASSIGNED ? 'Runner assigned, heading to pickup' :
                         syncedErrand.status === ErrandStatus.IN_PROGRESS ? 'Runner is on the way' :
                         syncedErrand.status === ErrandStatus.COMPLETED ? 'Task Completed' : 'Tracking runner'}
                      </p>
                    </div>
                  </div>
                  {isRunner && (
                    <button 
                      onClick={handleUpdateLocation}
                      disabled={isUpdatingLocation}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingLocation ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                      Update Location
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-muted p-6 rounded-[2rem] space-y-4">
              <h3 className="text-lg font-black text-foreground tracking-tight">Timeline</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"></div>
                    <div className="w-0.5 h-full bg-border mt-1"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-black text-foreground">Errand Posted</p>
                    <p className="text-xs text-muted-foreground">{new Date(errand.createdAt?.seconds * 1000 || Date.now()).toLocaleTimeString()}</p>
                  </div>
                </div>
                
                {errand.runnerId && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"></div>
                      <div className="w-0.5 h-full bg-border mt-1"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-black text-foreground">Runner Assigned: {errand.runnerName}</p>
                      <p className="text-xs text-muted-foreground">Assigned & Heading to Pick-up</p>
                    </div>
                  </div>
                )}

                {syncedErrand.status === ErrandStatus.IN_PROGRESS && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_0_4px_rgba(59,130,246,0.1)] animate-pulse"></div>
                      <div className="w-0.5 h-full bg-border mt-1"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-black text-foreground">In Progress</p>
                      <p className="text-xs text-muted-foreground">Runner is active on this task</p>
                    </div>
                  </div>
                )}

                {syncedErrand.status === ErrandStatus.COMPLETED && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"></div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">Completed</p>
                      <p className="text-xs text-muted-foreground">Successfully Delivered</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-muted rounded-[2rem] border border-border space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-foreground tracking-tight">Shopping List</h3>
                <div className="px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-xl text-sm font-black tracking-normal font-medium">
                  {errand.shoppingItems?.length || 0} Items
                </div>
              </div>
              
              <div className="space-y-2.5">
                {errand.shoppingItems?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-card text-card-foreground rounded-2xl border border-border shadow-sm">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                    <span className="text-sm font-bold text-foreground">{item}</span>
                  </div>
                ))}
                {(!errand.shoppingItems || errand.shoppingItems.length === 0) && (
                  <div className="py-8 text-center">
                    <ShoppingCart size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-xs font-bold text-muted-foreground">No items listed</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border space-y-3">
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-black text-muted-foreground tracking-normal font-medium">Items Budget</span>
                  <span className="text-base font-black text-foreground">KSH {errand.budget}</span>
                </div>
                {errand.calculatedPrice && (
                  <>
                    <div className="flex justify-between items-center px-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={16} className="text-indigo-400" />
                        <span className="text-sm font-black text-muted-foreground tracking-normal font-medium">Service Fee</span>
                      </div>
                      <span className="text-base font-black text-foreground">KSH {errand.calculatedPrice}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <span className="text-sm font-black text-indigo-600 tracking-normal font-medium">Total Cost</span>
                      <span className="text-lg font-black text-indigo-600">KSH {errand.budget + errand.calculatedPrice}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Receipt Section */}
            {(syncedErrand.status === ErrandStatus.IN_PROGRESS || syncedErrand.status === ErrandStatus.REVIEW || syncedErrand.status === ErrandStatus.COMPLETED) && (
              <div className="space-y-3">
                <h3 className="text-lg font-black text-foreground tracking-tight">Receipt</h3>
                {errand.receiptUrl ? (
                  <div className="relative group rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-xl">
                    <img src={errand.receiptUrl} alt="Receipt" className="w-full aspect-[3/4] object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={errand.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-4 bg-card text-card-foreground rounded-full text-foreground shadow-2xl">
                        <Download size={24} />
                      </a>
                    </div>
                  </div>
                ) : isRunner && syncedErrand.status === ErrandStatus.IN_PROGRESS ? (
                  <button 
                    onClick={() => {
                      setCameraMode('receipt');
                      setShowCamera(true);
                    }}
                    disabled={uploadingReceipt}
                    className="w-full aspect-[3/4] bg-muted border-4 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-secondary hover:border-indigo-200 hover:text-indigo-500 transition-all group"
                  >
                    {uploadingReceipt ? (
                      <Loader2 size={40} className="animate-spin" />
                    ) : (
                      <>
                        <div className="p-6 bg-card text-card-foreground rounded-full shadow-xl group-hover:scale-110 transition-transform">
                          <Camera size={32} />
                        </div>
                        <p className="text-sm font-black tracking-normal font-medium">Upload Receipt</p>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-8 bg-muted rounded-[2rem] border border-dashed border-border text-center">
                    <Receipt size={32} className="mx-auto text-muted-foreground/70 mb-3" />
                    <p className="text-xs font-bold text-muted-foreground">No receipt uploaded yet</p>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={() => pdfService.downloadShoppingPDF(errand)}
              className="w-full py-4 bg-foreground text-background text-white rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2.5 hover:bg-black transition-all shadow-xl shadow-slate-200"
            >
              <Download size={18} /> Download List as PDF
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <footer className="p-4 border-t border-slate-50 bg-card text-card-foreground sticky bottom-0 space-y-2">
        {canBid && (
          <button 
            onClick={() => {
              onBid(errand.budget, "I'm interested in this task!");
              haptics.success();
            }}
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Place a Bid"}
          </button>
        )}
        {isRunner && syncedErrand.status === ErrandStatus.ASSIGNED && (
          <button 
            onClick={() => {
              onReview(errand.id, "Task completed successfully!");
              haptics.success();
            }}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Submit for Review"}
          </button>
        )}
        {isRequester && syncedErrand.status === ErrandStatus.REVIEW && (
          <button 
            onClick={() => {
              onComplete(errand.id);
              haptics.success();
            }}
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Mark as Completed"}
          </button>
        )}
      </footer>

      {showCamera && (
        <CameraCapture 
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Add Property Listing Modal */}
      <AnimatePresence>
        {showAddListing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-card text-card-foreground w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-xl font-black text-foreground tracking-tight">Add House Finding</h3>
                <button onClick={() => setShowAddListing(false)} className="p-2 bg-muted text-muted-foreground rounded-xl">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Image Upload */}
                <div className="space-y-2">
                  <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">House Photo</p>
                  {listingImage ? (
                    <div className="relative rounded-3xl overflow-hidden aspect-video">
                      <img src={listingImage} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setListingImage(null)}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setCameraMode('listing');
                        setShowCamera(true);
                      }}
                      className="w-full aspect-video bg-muted border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Camera size={32} />
                      <span className="text-xs font-bold tracking-normal font-medium">Take Photo</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Title/Building Name</p>
                    <input 
                      type="text"
                      value={newListing.title}
                      onChange={e => setNewListing({...newListing, title: e.target.value})}
                      placeholder="e.g. South B Heights"
                      className="w-full p-4 bg-muted rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Monthly Rent (KSH)</p>
                    <input 
                      type="number"
                      value={newListing.price}
                      onChange={e => setNewListing({...newListing, price: Number(e.target.value)})}
                      placeholder="e.g. 25000"
                      className="w-full p-4 bg-muted rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Specific Location</p>
                  <div className="h-48 rounded-2xl overflow-hidden border border-border">
                    <GoogleMapPicker 
                      apiKey={googleMapsApiKey}
                      onConfirm={(loc) => setNewListing({...newListing, location: loc.address, coords: loc.coords})}
                      placeholder="Search for building location..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Runner's View/Comments</p>
                  <textarea 
                    value={newListing.runnerView}
                    onChange={e => setNewListing({...newListing, runnerView: e.target.value})}
                    placeholder="Tell the requester what you think about this house..."
                    className="w-full p-4 bg-muted rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold min-h-[100px]"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-50">
                <button 
                  disabled={isSubmittingListing || !newListing.title || !newListing.price || !newListing.location || !listingImage}
                  onClick={async () => {
                    setIsSubmittingListing(true);
                    try {
                      const imageUrl = await cloudinaryService.uploadFile(listingImage!, 'properties');
                      await firebaseService.addPropertyListing(errand.id, {
                        ...newListing,
                        imageUrl
                      });
                      setShowAddListing(false);
                      setNewListing({ title: '', price: 0, location: '', type: errand.houseType || 'Bedsitter', description: '', runnerView: '', amenities: [] });
                      setListingImage(null);
                      alert("House added successfully!");
                    } catch (e) {
                      console.error(e);
                      alert("Failed to add house.");
                    } finally {
                      setIsSubmittingListing(false);
                    }
                  }}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingListing ? <Loader2 size={18} className="animate-spin" /> : "Save House Finding"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-card text-card-foreground w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative h-64">
                <img src={selectedListing.imageUrl} alt={selectedListing.title} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedListing(null)}
                  className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div className="bg-card text-card-foreground/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl">
                    <h3 className="text-xl font-black text-foreground leading-tight">{selectedListing.title}</h3>
                    <p className="text-xs font-bold text-muted-foreground">{selectedListing.location}</p>
                  </div>
                  <div className="bg-indigo-600 px-4 py-2 rounded-2xl text-white font-black shadow-xl">
                    KSH {(selectedListing.price || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Runner's Assessment</p>
                  <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 italic font-bold text-indigo-900 leading-relaxed">
                    "{selectedListing.runnerView}"
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-2xl">
                    <p className="text-micro text-muted-foreground uppercase font-black tracking-widest mb-1">Type</p>
                    <p className="text-sm font-black text-foreground">{selectedListing.type}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-2xl">
                    <p className="text-micro text-muted-foreground uppercase font-black tracking-widest mb-1">Agent Rating</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={16} fill="currentColor" />
                      <span className="text-sm font-black">{selectedListing.agentRating || '4.5'}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    // In a real app, this would open directions or start a call
                    alert("Starting video call with runner...");
                  }}
                  className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  <Phone size={18} /> Call Runner for Tour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
