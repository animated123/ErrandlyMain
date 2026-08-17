import React, { useState, useEffect, useCallback } from 'react';
import { ErrandCategory, User, UserRole, AppSettings } from '../../types';
import { Plus, MapPin, DollarSign, Calendar, Clock, Loader2, Sparkles, AlertCircle, ShoppingBag, Car, ShoppingCart, Waves, Home, Package, Info, Map as MapIcon, X, Target, Navigation, Trash2, Download, ReceiptText, ArrowRight, ChevronLeft, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleMapRoutePicker from './GoogleMapRoutePicker';
import PlacesAutocomplete from './PlacesAutocomplete';
import { geminiService } from '../../services/geminiService';
import { pdfService } from '../../services/pdfService';

interface CreateScreenProps {
  user: User | null;
  errandForm: any;
  setErrandForm: React.Dispatch<React.SetStateAction<any>>;
  postErrand: (e: any) => void;
  loading: boolean;
  errors: any;
  googleMapsApiKey: string;
  googlePlacesApiKey: string;
  googleRoutesApiKey: string;
  settings?: AppSettings;
}

export default function CreateScreen({ 
  user, 
  errandForm, 
  setErrandForm, 
  postErrand, 
  loading, 
  errors, 
  googleMapsApiKey, 
  googlePlacesApiKey, 
  googleRoutesApiKey,
  settings
}: CreateScreenProps) {
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [step, setStep] = useState(1);

  const [drafts, setDrafts] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('errand_drafts') || '[]');
    } catch {
      return [];
    }
  });

  const saveDraftsToStorage = (updatedDrafts: any[]) => {
    setDrafts(updatedDrafts);
    try {
      localStorage.setItem('errand_drafts', JSON.stringify(updatedDrafts));
    } catch (e) {
      console.error('Failed to save drafts to storage:', e);
    }
  };

  const handleSaveDraft = () => {
    const draftId = errandForm.draftId || `draft_${Date.now()}`;
    const newDraft = {
      id: draftId,
      updatedAt: new Date().toISOString(),
      form: { ...errandForm, draftId }
    };
    
    const index = drafts.findIndex(d => d.id === draftId);
    let updated;
    if (index > -1) {
      updated = [...drafts];
      updated[index] = newDraft;
    } else {
      updated = [newDraft, ...drafts];
    }
    
    saveDraftsToStorage(updated);
    setErrandForm((prev: any) => ({ ...prev, draftId }));
    alert("Draft saved successfully!");
  };

  const handleLoadDraft = (draft: any) => {
    setErrandForm({ ...draft.form, draftId: draft.id });
    setStep(1);
    alert("Draft loaded successfully!");
  };

  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = drafts.filter(d => d.id !== draftId);
    saveDraftsToStorage(updated);
    if (errandForm.draftId === draftId) {
      const { draftId: _, ...rest } = errandForm;
      setErrandForm(rest);
    }
  };

  const handleResetForm = () => {
    setErrandForm({
      category: ErrandCategory.GENERAL, 
      title: '', 
      budget: 0, 
      deadline: '', 
      pickup: null, 
      dropoff: null, 
      laundryBaskets: 1, 
      pricePerBasket: 250, 
      houseType: '', 
      minBudget: 0, 
      maxBudget: 0, 
      moveInDate: '', 
      additionalRequirements: '', 
      description: '', 
      isInHouse: false,
      maxShoppingBudget: 0,
      urgency: 'normal',
      packageDescription: '',
      packageCost: 0,
      shoppingList: '',
      marketSection: '',
      paymentMethod: 'Cash on Delivery',
      mamaFuaBreakdown: null,
      targetEstates: [],
      amenities: [],
      runnerTasks: []
    });
    setStep(1);
  };

  const handleEstimateCost = useCallback(async () => {
    if (errandForm.category === ErrandCategory.HOUSE_HUNTING) {
      const min = errandForm.rentBudgetMin || 0;
      const max = errandForm.rentBudgetMax || 0;
      const average = (min + max) / 2;
      
      const baseFee = settings?.sakaKejaBaseFee ?? 500;
      const percentage = (settings?.sakaKejaPercentage ?? 5) / 100;
      
      const serviceFee = baseFee + Math.round(average * percentage);
      
      setErrandForm((prev: any) => ({
        ...prev,
        calculatedPrice: serviceFee,
        aiEstimatedScale: 2, // Fixed scale for house hunting
      }));
      return;
    }

    setIsEstimating(true);
    try {
      const extraData = errandForm.category === ErrandCategory.MAMA_FUA ? {
        loadSize: errandForm.loadSize,
        serviceTypes: errandForm.serviceTypes,
        detergentProvided: errandForm.detergentProvided,
        waterAvailability: errandForm.waterAvailability,
        hangingPreference: errandForm.hangingPreference
      } : {};

      const estimation = await geminiService.estimateErrandCost(
        errandForm.description,
        errandForm.pickup?.name || '',
        errandForm.urgency || 'Normal',
        errandForm.category,
        extraData
      );
      setErrandForm((prev: any) => ({
        ...prev,
        calculatedPrice: Math.round(estimation.breakdown.total),
        aiEstimatedScale: estimation.scale,
        aiEstimationBreakdown: estimation.breakdown,
        mamaFuaBreakdown: estimation.mamaFuaBreakdown || prev.mamaFuaBreakdown,
        propertyType: estimation.propertyType || prev.propertyType,
        vibe: estimation.vibe || prev.vibe,
        amenities: estimation.amenities?.length ? [...new Set([...(prev.amenities || []), ...estimation.amenities])] : prev.amenities
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsEstimating(false);
    }
  }, [errandForm.description, errandForm.urgency, errandForm.pickup?.name, errandForm.category, errandForm.rentBudgetMin, errandForm.rentBudgetMax, errandForm.loadSize, errandForm.serviceTypes, errandForm.detergentProvided, errandForm.waterAvailability, errandForm.hangingPreference, setErrandForm, settings?.sakaKejaBaseFee, settings?.sakaKejaPercentage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const shouldEstimate = errandForm.category === ErrandCategory.HOUSE_HUNTING 
        ? (errandForm.rentBudgetMin > 0 || errandForm.rentBudgetMax > 0)
        : (errandForm.description && errandForm.description.length > 10);

      if (shouldEstimate) {
        handleEstimateCost();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [handleEstimateCost, errandForm.description, errandForm.rentBudgetMin, errandForm.rentBudgetMax, errandForm.category]);

  useEffect(() => {
    let title = errandForm.title;
    let description = errandForm.description;

    if (errandForm.category === ErrandCategory.HOUSE_HUNTING) {
      const location = errandForm.targetEstates?.join(', ') || 'Nairobi';
      const urgency = errandForm.urgency || 'Normal';
      title = `Saka Keja in ${location}, ${urgency}`;
      
      const runnerTaskLabels = {
        video: 'Live Video Call',
        photos: 'Photos of Specific Areas',
        interview: 'Caretaker Interview',
        neighborhood: 'Neighborhood Check'
      };

      const amenities = errandForm.amenities?.length ? `\nAmenities: ${errandForm.amenities.join(', ')}` : '';
      const selectedTasks = (errandForm.runnerTasks || []).map((id: string) => runnerTaskLabels[id as keyof typeof runnerTaskLabels] || id);
      const tasks = selectedTasks.length ? `\nRunner Tasks: ${selectedTasks.join(', ')}` : '';
      description = `Looking for a ${errandForm.houseType || 'house'} in ${location}. 
Budget: Ksh ${errandForm.rentBudgetMin || 0} - ${errandForm.rentBudgetMax || 0}.
Moving Date: ${errandForm.moveInDate || 'Not set'}.${amenities}${tasks}
Additional Info: ${errandForm.additionalRequirements || 'None'}`;
    } else {
      const location = errandForm.pickup?.name || 'Not specified';
      const serviceName = errandForm.category;
      title = `${serviceName} at ${location}`;
    }

    if (errandForm.title !== title || errandForm.description !== description) {
      setErrandForm((prev: any) => ({ ...prev, title, description }));
    }
  }, [
    errandForm.category, 
    errandForm.targetEstates, 
    errandForm.urgency, 
    errandForm.houseType, 
    errandForm.rentBudgetMin, 
    errandForm.rentBudgetMax, 
    errandForm.moveInDate, 
    errandForm.amenities, 
    errandForm.runnerTasks, 
    errandForm.additionalRequirements, 
    errandForm.pickup?.name,
    errandForm.title, 
    errandForm.description, 
    setErrandForm
  ]);

  const downloadShoppingPDF = () => {
    pdfService.downloadShoppingPDF(errandForm as any);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const currentItems = errandForm.shoppingItems || [];
    setErrandForm({ ...errandForm, shoppingItems: [...currentItems, newItem.trim()] });
    setNewItem('');
  };

  const removeItem = (index: number) => {
    const currentItems = [...(errandForm.shoppingItems || [])];
    currentItems.splice(index, 1);
    setErrandForm({ ...errandForm, shoppingItems: currentItems });
  };

  const handleMapConfirm = (pickup: any, dropoff: any, summary: any) => {
    setErrandForm({
      ...errandForm,
      pickup: { name: pickup.address, coords: pickup.coords, placeId: pickup.placeId },
      dropoff: { name: dropoff.address, coords: dropoff.coords, placeId: dropoff.placeId },
      estimatedDistance: summary.distance,
      estimatedDuration: summary.duration,
      distanceValue: summary.distanceValue,
      durationValue: summary.durationValue
    });
    setShowMapPicker(false);
  };
  const categories = [
    { id: ErrandCategory.GENERAL, label: 'General Task', icon: Sparkles, color: 'bg-indigo-50 text-indigo-600' },
    { id: ErrandCategory.MAMA_FUA, label: 'Mama Fua', icon: Waves, color: 'bg-blue-50 text-blue-600' },
    { id: ErrandCategory.MARKET_SHOPPING, label: 'Market Shopping', icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-600' },
    { id: ErrandCategory.HOUSE_HUNTING, label: 'Saka Keja', icon: Home, color: 'bg-amber-50 text-amber-600' },
    { id: ErrandCategory.PACKAGE_DELIVERY, label: 'Package Delivery', icon: Package, color: 'bg-rose-50 text-rose-600' },
    { id: ErrandCategory.TOWN_SERVICE, label: 'Town Service', icon: Car, color: 'bg-muted text-muted-foreground' },
    { id: ErrandCategory.SHOPPING, label: 'Shopping', icon: ShoppingCart, color: 'bg-purple-50 text-purple-600' },
    { id: ErrandCategory.GIKOMBA_STRAWS, label: 'Gikomba Straws', icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
  ];

  const houseTypes = ['Bedsitter', '1 Bedroom', '2 Bedroom', 'Studio', 'Own Compound', 'Office Space'];
  const essentialAmenities = ['Constant Water', 'Tokens/Postpaid', 'Security (Gate/Fence)', 'Parking'];
  const lifestyleAmenities = ['Wi-Fi ready', 'Balcony', 'Tiled floors', 'Instant Shower', 'Top-floor preference', 'Ground-floor preference'];
  const runnerTasks = [
    { id: 'video', label: 'Live Video Call', desc: '5-minute WhatsApp video tour' },
    { id: 'photos', label: 'Photos of Specific Areas', desc: 'Bathroom, view, kitchen cabinets' },
    { id: 'interview', label: 'Caretaker Interview', desc: 'Ask about deposit & water' },
    { id: 'neighborhood', label: 'Neighborhood Check', desc: 'Check for mud/noise' }
  ];

  const toggleAmenity = (amenity: string) => {
    const current = errandForm.amenities || [];
    const updated = current.includes(amenity) 
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    setErrandForm({ ...errandForm, amenities: updated });
  };

  const toggleRunnerTask = (taskId: string) => {
    const current = errandForm.runnerTasks || [];
    const updated = current.includes(taskId)
      ? current.filter((t: string) => t !== taskId)
      : [...current, taskId];
    setErrandForm({ ...errandForm, runnerTasks: updated });
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="px-2">
        <h2 className="text-lg font-black text-foreground tracking-tight">Create Errand</h2>
        <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Tell us what you need help with</p>
      </div>

      {drafts.length > 0 && (
        <div className="px-2 space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Your Saved Drafts ({drafts.length})</h3>
            {errandForm.draftId && (
              <button 
                type="button" 
                onClick={handleResetForm}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> New Errand
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
            {drafts.map((draft) => {
              const cat = categories.find(c => c.id === draft.form.category);
              const Icon = cat ? cat.icon : Sparkles;
              const color = cat ? cat.color : 'bg-indigo-50 text-indigo-600';
              const isSelected = errandForm.draftId === draft.id;
              
              return (
                <div
                  key={draft.id}
                  onClick={() => handleLoadDraft(draft)}
                  className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900' 
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="pr-6">
                    <p className="text-xs font-black text-foreground tracking-tight truncate max-w-[120px]">
                      {draft.form.title || `${cat ? cat.label : 'Draft'}`}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar px-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = errandForm.category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setErrandForm({ ...errandForm, category: cat.id });
                setStep(1);
              }}
              className={`flex-shrink-0 w-32 px-4 py-8 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-4 ${
                isActive 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-105' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : cat.color}`}>
                <Icon size={24} />
              </div>
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-center leading-tight">{cat.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={postErrand} className="space-y-6 px-2">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          {errors?.create && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 mb-8 animate-in shake duration-500">
              <AlertCircle size={20} />
              <p className="text-sm font-black tracking-tight">{errors.create}</p>
            </div>
          )}

          {(errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING || errandForm.category === ErrandCategory.HOUSE_HUNTING || errandForm.category === ErrandCategory.MAMA_FUA) && (
            <div className="flex items-center gap-4 mb-10">
              <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
              <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
              {errandForm.category === ErrandCategory.HOUSE_HUNTING && (
                <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`} />
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    {/* Task Title is now autogenerated */}
                    {errandForm.category !== ErrandCategory.HOUSE_HUNTING && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Task Title (Autogenerated)</label>
                          <div className="w-full px-4 py-2.5 bg-secondary border-none rounded-xl font-black text-foreground text-sm">
                            {errandForm.title || 'Will be generated...'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Description</label>
                          <textarea 
                            value={errandForm.description}
                            onChange={(e) => setErrandForm({ ...errandForm, description: e.target.value })}
                            placeholder="Provide more details about the task..."
                            className="w-full px-4 py-2.5 bg-muted border-none rounded-xl font-bold text-foreground text-sm outline-none h-28 resize-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {errandForm.category === ErrandCategory.HOUSE_HUNTING ? (
                        <div className="space-y-2">
                          <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Target Areas (Up to 3)</label>
                          <PlacesAutocomplete 
                            apiKey={googlePlacesApiKey}
                            placeholder="e.g. Roysambu, Kilimani"
                            onPlaceSelect={(data) => {
                              if ((errandForm.targetEstates || []).length >= 3) return;
                              setErrandForm({ ...errandForm, targetEstates: [...(errandForm.targetEstates || []), data.address] });
                            }}
                            icon={<MapPin size={14} className="text-amber-600" />}
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(errandForm.targetEstates || []).map((estate: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-black tracking-normal font-medium border border-amber-100">
                                {estate}
                                <button type="button" onClick={() => setErrandForm({ ...errandForm, targetEstates: (errandForm.targetEstates || []).filter((_: any, i: number) => i !== idx) })}>
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-black tracking-normal font-medium text-muted-foreground">
                            Pickup & Drop-off Locations
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowMapPicker(true)}
                            className="w-full p-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 group hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                          >
                            <div className="w-10 h-10 bg-card text-card-foreground rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                              <MapIcon size={20} />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-black text-indigo-900 tracking-normal font-medium">
                                {errandForm.pickup?.name || 'Select Locations on Map'}
                              </p>
                              <p className="text-xs font-bold text-indigo-400 tracking-normal font-medium mt-0.5">
                                Pickup & Drop-off
                              </p>
                            </div>
                          </button>
                        </div>
                      )}

                      {errandForm.category !== ErrandCategory.HOUSE_HUNTING && errandForm.pickup?.name && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-card text-card-foreground rounded-lg flex items-center justify-center text-emerald-600 shadow-sm mt-0.5">
                              <MapPin size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-emerald-400 tracking-normal font-medium">Pickup</p>
                              <p className="text-xs font-bold text-emerald-900 truncate max-w-[200px]">{errandForm.pickup.name}</p>
                            </div>
                          </div>
                          {errandForm.dropoff?.name && (
                            <div className="flex items-start gap-3 pt-3 border-t border-emerald-100">
                              <div className="w-6 h-6 bg-card text-card-foreground rounded-lg flex items-center justify-center text-rose-600 shadow-sm mt-0.5">
                                <Target size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-rose-400 tracking-normal font-medium">Drop-off</p>
                                <p className="text-xs font-bold text-rose-900 truncate max-w-[200px]">{errandForm.dropoff.name}</p>
                              </div>
                            </div>
                          )}
                          {errandForm.estimatedDistance && (
                            <div className="flex items-center gap-4 pt-3 border-t border-emerald-100">
                              <div className="flex items-center gap-1.5">
                                <Navigation size={16} className="text-muted-foreground" />
                                <span className="text-sm font-black text-muted-foreground">{errandForm.estimatedDistance}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock size={16} className="text-muted-foreground" />
                                <span className="text-sm font-black text-muted-foreground">{errandForm.estimatedDuration}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Urgency</label>
                      <div className="flex gap-1.5">
                        {['Normal', 'High', 'Urgent'].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setErrandForm({ ...errandForm, urgency: level })}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black tracking-normal font-medium transition-all ${
                              (errandForm.urgency || 'Normal') === level 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'bg-muted text-muted-foreground hover:bg-secondary'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {errandForm.category === ErrandCategory.HOUSE_HUNTING ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Deadline</label>
                            <div className="relative">
                              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <input 
                                type="date" 
                                value={errandForm.deadline || ''}
                                onChange={(e) => setErrandForm({ ...errandForm, deadline: e.target.value })}
                                className="w-full pl-10 pr-3.5 py-3 bg-muted border-none rounded-2xl font-bold text-foreground text-xs outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Moving Date</label>
                            <div className="relative">
                              <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                              <input 
                                type="date" 
                                value={errandForm.moveInDate || ''}
                                onChange={(e) => setErrandForm({ ...errandForm, moveInDate: e.target.value })}
                                className="w-full pl-10 pr-3.5 py-3 bg-muted border-none rounded-2xl font-bold text-foreground text-xs outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Budget (KSH)</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                              {isEstimating ? <Loader2 className="text-indigo-600 animate-spin" size={16} /> : <DollarSign className="text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" size={16} />}
                            </div>
                            <input 
                              type="number" 
                              value={errandForm.budget || ''}
                              onChange={(e) => setErrandForm({ ...errandForm, budget: Number(e.target.value) })}
                              className="w-full pl-11 pr-5 py-3.5 bg-muted border-none rounded-2xl font-black text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                          </div>
                          {errandForm.aiEstimatedScale && (
                            <p className="text-xs font-black text-indigo-400 tracking-normal font-medium ml-1 flex items-center gap-1">
                              <Sparkles size={16} /> AI Estimated Complexity: {errandForm.aiEstimatedScale}/5
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category Specific Fields */}
                <div className="mt-8 space-y-6">
                  {(errandForm.category === ErrandCategory.MAMA_FUA || errandForm.category === ErrandCategory.GENERAL) && (
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl">
                      <input 
                        type="checkbox" 
                        id="isInHouse"
                        checked={errandForm.isInHouse}
                        onChange={(e) => setErrandForm({ ...errandForm, isInHouse: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-border text-black focus:ring-black"
                      />
                      <label htmlFor="isInHouse" className="text-xs font-bold text-muted-foreground">Task is within the house (No delivery needed)</label>
                    </div>
                  )}

                  {!errandForm.isInHouse && errandForm.category !== ErrandCategory.SHOPPING && (errandForm.category === ErrandCategory.MAMA_FUA || errandCategoryRequiresDropoff(errandForm.category)) && (
                    <div className="space-y-2">
                      <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Drop-off Location</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <MapPin className="text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        </div>
                        <input 
                          type="text" 
                          value={errandForm.dropoff?.name || ''}
                          onChange={(e) => setErrandForm({ ...errandForm, dropoff: { name: e.target.value, coords: { lat: 0, lng: 0 } } })}
                          placeholder="Where to deliver?"
                          className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-2xl font-black text-foreground text-base outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {errandForm.category === ErrandCategory.TOWN_SERVICE && (
                    <div className="space-y-2">
                      <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Urgency</label>
                      <select 
                        value={errandForm.urgency}
                        onChange={(e) => setErrandForm({ ...errandForm, urgency: e.target.value })}
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl font-black text-foreground text-base outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  )}

                  {errandForm.category === ErrandCategory.PACKAGE_DELIVERY && (
                    <div className="space-y-2">
                      <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Package Description</label>
                      <input 
                        type="text" 
                        value={errandForm.packageDescription}
                        onChange={(e) => setErrandForm({ ...errandForm, packageDescription: e.target.value })}
                        placeholder="What are we delivering?"
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl font-black text-foreground text-base outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  )}

                  {errandForm.category === ErrandCategory.GIKOMBA_STRAWS && (
                    <div className="space-y-2">
                      <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Market Section</label>
                      <input 
                        type="text" 
                        value={errandForm.marketSection}
                        onChange={(e) => setErrandForm({ ...errandForm, marketSection: e.target.value })}
                        placeholder="e.g. Shoes section, Clothes section"
                        className="w-full px-5 py-4 bg-muted border-none rounded-2xl font-black text-foreground text-base outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  )}
                </div>

                  {errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING || errandForm.category === ErrandCategory.HOUSE_HUNTING || errandForm.category === ErrandCategory.MAMA_FUA ? (
                    <button 
                      type="button" 
                      onClick={() => setStep(2)}
                      disabled={!errandForm.title || (errandForm.category === ErrandCategory.HOUSE_HUNTING ? !(errandForm.targetEstates?.length > 0) : !errandForm.pickup?.name)}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-6"
                    >
                      Next: {errandForm.category === ErrandCategory.HOUSE_HUNTING ? 'Property Specs' : errandForm.category === ErrandCategory.MAMA_FUA ? 'Laundry Details' : 'Items & Quantity'} <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      disabled={loading || !errandForm.pickup?.name}
                      className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-6"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : "Post Errand Now"}
                      {!loading && <Plus size={14} />}
                    </button>
                  )}
              </motion.div>
            ) : step === 2 && errandForm.category === ErrandCategory.MAMA_FUA ? (
              <motion.div 
                key="step2-mamafua"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Load Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Small', 'Medium', 'Large'].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, loadSize: size })}
                          className={`py-3 px-2 rounded-xl text-sm font-black tracking-normal font-medium transition-all ${
                            errandForm.loadSize === size ? 'bg-blue-600 text-white shadow-lg' : 'bg-muted text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {size}
                          <p className="text-sm opacity-70 mt-0.5">
                            {size === 'Small' ? '1-2 Basins' : size === 'Medium' ? '3-4 Basins' : 'Full Sack'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Service Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Wash & Hang', 'Hand Wash Only', 'Ironing', 'Cleaning Only'].map(type => {
                        const isSelected = (errandForm.serviceTypes || []).includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              const current = errandForm.serviceTypes || [];
                              const updated = isSelected ? current.filter((t: string) => t !== type) : [...current, type];
                              setErrandForm({ ...errandForm, serviceTypes: updated });
                            }}
                            className={`py-3 px-4 rounded-xl text-xs font-black tracking-normal font-medium transition-all border ${
                              isSelected ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-card text-card-foreground border-border text-muted-foreground'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Detergent</label>
                      <div className="flex gap-2">
                        {[true, false].map(val => (
                          <button
                            key={val ? 'yes' : 'no'}
                            type="button"
                            onClick={() => setErrandForm({ ...errandForm, detergentProvided: val })}
                            className={`flex-1 py-3 rounded-xl text-sm font-black tracking-normal font-medium transition-all ${
                              errandForm.detergentProvided === val ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {val ? 'I Provide' : 'Runner Buys'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Water Availability</label>
                      <div className="flex gap-2">
                        {['Constant', 'Buying'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setErrandForm({ ...errandForm, waterAvailability: val })}
                            className={`flex-1 py-3 rounded-xl text-sm font-black tracking-normal font-medium transition-all ${
                              errandForm.waterAvailability === val ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Hanging Preference</label>
                    <div className="flex gap-2">
                      {['Indoor', 'Outdoor'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, hangingPreference: val })}
                          className={`flex-1 py-3 rounded-xl text-sm font-black tracking-normal font-medium transition-all ${
                            errandForm.hangingPreference === val ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {errandForm.calculatedPrice && (
                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-micro font-black text-blue-400 tracking-normal font-medium">Estimated Service Fee</p>
                          <Calculator size={14} className="text-blue-400" />
                        </div>
                        <p className="text-2xl font-black text-blue-900">KSH {errandForm.calculatedPrice}</p>
                      </div>
                      <p className="text-sm font-bold text-blue-400 tracking-normal font-medium">Includes base fee, load size, and ironing if selected.</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 bg-secondary text-muted-foreground rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading || !errandForm.loadSize}
                      className="flex-[2] py-5 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Post Errand Now"}
                      {!loading && <Plus size={16} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => pdfService.downloadMamaFuaPDF(errandForm as any)}
                    className="w-full py-4 bg-blue-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                  >
                    <Download size={16} /> Download Mama Fua Receipt
                  </button>
                </div>
              </motion.div>
            ) : step === 2 && (errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING) ? (
              <motion.div 
                key="step2-shopping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Shopping Budget (KSH)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <DollarSign className="text-muted-foreground/70 group-focus-within:text-purple-600 transition-colors" size={18} />
                      </div>
                      <input 
                        type="number" 
                        value={errandForm.budget || ''}
                        onChange={(e) => setErrandForm({ ...errandForm, budget: Number(e.target.value) })}
                        placeholder="Estimated cost of items"
                        className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-2xl font-black text-foreground text-base outline-none focus:ring-2 focus:ring-purple-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Items Required</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                        placeholder="Add an item (e.g. 2kg Sugar)"
                        className="flex-1 px-5 py-4 bg-muted border-none rounded-2xl font-bold text-foreground text-base outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={addItem}
                        className="px-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {(errandForm.shoppingItems || []).map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-card text-card-foreground border border-border rounded-xl shadow-sm group">
                          <span className="text-sm font-bold text-foreground">{item}</span>
                          <button 
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-muted-foreground/70 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Shopping List (Notes)</label>
                    <textarea 
                      value={errandForm.shoppingList}
                      onChange={(e) => setErrandForm({ ...errandForm, shoppingList: e.target.value })}
                      placeholder="Any specific brands or extra instructions..."
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl font-bold text-foreground text-base outline-none h-32 resize-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Cash on Delivery', 'Mobile Money'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, paymentMethod: method })}
                          className={`py-4 px-6 rounded-2xl font-black uppercase text-sm tracking-widest transition-all border-2 ${
                            errandForm.paymentMethod === method 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                              : 'bg-card text-card-foreground text-muted-foreground border-border hover:border-border'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {errandForm.calculatedPrice && (
                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-micro font-black text-indigo-400 tracking-normal font-medium">Calculated Service Fee</p>
                          <Sparkles size={14} className="text-indigo-400" />
                        </div>
                        <p className="text-2xl font-black text-indigo-900">KSH {errandForm.calculatedPrice}</p>
                      </div>
                      
                      <div className="pt-4 border-t border-indigo-100 flex items-center justify-between">
                        <div>
                          <p className="text-micro font-black text-muted-foreground tracking-normal font-medium">Total Estimated Cost</p>
                          <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">(Budget + Service Fee)</p>
                        </div>
                        <p className="text-xl font-black text-indigo-600">KSH {(errandForm.budget || 0) + errandForm.calculatedPrice}</p>
                      </div>
                      
                      <p className="text-sm font-bold text-indigo-400 tracking-normal font-medium">Based on task complexity and urgency</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 bg-secondary text-muted-foreground rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading || (errandForm.shoppingItems || []).length === 0}
                      className="flex-[2] py-5 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Post Errand Now"}
                      {!loading && <Plus size={16} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={downloadShoppingPDF}
                    className="w-full py-4 bg-foreground text-background text-white rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                  >
                    <Download size={16} /> Download Shopping PDF
                  </button>
                </div>
              </motion.div>
            ) : step === 2 && errandForm.category === ErrandCategory.HOUSE_HUNTING ? (
              <motion.div 
                key="step2-house"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">House Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {houseTypes.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, houseType: type })}
                          className={`py-3 px-4 rounded-xl text-sm font-black tracking-normal font-medium transition-all ${
                            errandForm.houseType === type ? 'bg-amber-600 text-white shadow-lg' : 'bg-muted text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Monthly Rent Budget (KSH)</label>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Min</p>
                        <input 
                          type="number" 
                          value={errandForm.rentBudgetMin || ''}
                          onChange={(e) => setErrandForm({ ...errandForm, rentBudgetMin: Number(e.target.value) })}
                          placeholder="e.g. 10000"
                          className="w-full px-4 py-3 bg-muted border-none rounded-xl font-black text-foreground text-sm outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Max</p>
                        <input 
                          type="number" 
                          value={errandForm.rentBudgetMax || ''}
                          onChange={(e) => setErrandForm({ ...errandForm, rentBudgetMax: Number(e.target.value) })}
                          placeholder="e.g. 30000"
                          className="w-full px-4 py-3 bg-muted border-none rounded-xl font-black text-foreground text-sm outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Amenities</label>
                    
                    <div className="space-y-3">
                      <p className="text-xs font-black text-muted-foreground/70 tracking-normal font-medium">Essential</p>
                      <div className="flex flex-wrap gap-2">
                        {essentialAmenities.map(amenity => (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => toggleAmenity(amenity)}
                            className={`px-4 py-2 rounded-full text-xs font-black tracking-normal font-medium transition-all border ${
                              (errandForm.amenities || []).includes(amenity) ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-card text-card-foreground border-border text-muted-foreground'
                            }`}
                          >
                            {amenity}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-black text-muted-foreground/70 tracking-normal font-medium">Lifestyle</p>
                      <div className="flex flex-wrap gap-2">
                        {lifestyleAmenities.map(amenity => (
                          <button
                            key={amenity}
                            type="button"
                            onClick={() => toggleAmenity(amenity)}
                            className={`px-4 py-2 rounded-full text-xs font-black tracking-normal font-medium transition-all border ${
                              (errandForm.amenities || []).includes(amenity) ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-card text-card-foreground border-border text-muted-foreground'
                            }`}
                          >
                            {amenity}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Additional Requirements</label>
                    <textarea 
                      value={errandForm.additionalRequirements || ''}
                      onChange={(e) => setErrandForm({ ...errandForm, additionalRequirements: e.target.value })}
                      placeholder="Any specific features or preferences..."
                      className="w-full px-5 py-4 bg-muted border-none rounded-2xl font-bold text-foreground text-base outline-none h-32 resize-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-card text-card-foreground rounded-xl text-amber-600 shadow-sm">
                          <Navigation size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Commute Distance</p>
                          <p className="text-xs font-bold text-muted-foreground">Prioritize houses near work</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setErrandForm({ ...errandForm, commuteDistanceEnabled: !errandForm.commuteDistanceEnabled })}
                        className={`w-12 h-6 rounded-full transition-all relative ${errandForm.commuteDistanceEnabled ? 'bg-amber-600' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-card text-card-foreground rounded-full transition-all ${errandForm.commuteDistanceEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {errandForm.commuteDistanceEnabled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <label className="text-micro font-black text-muted-foreground tracking-normal font-medium ml-1">Work/Reference Point</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                          <input 
                            type="text" 
                            value={errandForm.commuteReferencePoint || ''}
                            onChange={(e) => setErrandForm({ ...errandForm, commuteReferencePoint: e.target.value })}
                            placeholder="e.g. Haile Selassie Avenue"
                            className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-2xl font-bold text-foreground text-sm outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-5 bg-secondary text-muted-foreground rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setStep(3)}
                      disabled={!errandForm.houseType || !errandForm.targetEstates || errandForm.targetEstates.length === 0}
                      className="flex-[2] py-5 bg-amber-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-amber-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      Next: Runner Tasks <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : step === 3 && errandForm.category === ErrandCategory.HOUSE_HUNTING ? (
              <motion.div 
                key="step3-house"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="px-1">
                      <h3 className="text-sm font-black text-foreground tracking-normal font-medium">Runner Task Checklist</h3>
                      <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium mt-1">Select what the runner should do</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {runnerTasks.map(task => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => toggleRunnerTask(task.id)}
                          className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all text-left ${
                            (errandForm.runnerTasks || []).includes(task.id) ? 'bg-amber-50 border-amber-200' : 'bg-card text-card-foreground border-border'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            (errandForm.runnerTasks || []).includes(task.id) ? 'bg-amber-600 border-amber-600 text-white' : 'border-border'
                          }`}>
                            {(errandForm.runnerTasks || []).includes(task.id) && <Plus size={14} />}
                          </div>
                          <div>
                            <p className={`text-xs font-black tracking-normal font-medium ${
                              (errandForm.runnerTasks || []).includes(task.id) ? 'text-amber-900' : 'text-muted-foreground'
                            }`}>{task.label}</p>
                            <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium mt-0.5">{task.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 p-6 bg-muted rounded-[2rem] border border-border">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Task Title</label>
                      <div className="p-4 bg-card text-card-foreground rounded-xl border border-border font-black text-foreground text-sm">
                        {errandForm.title}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-muted-foreground tracking-normal font-medium ml-1">Generated Brief</label>
                      <div className="p-4 bg-card text-card-foreground rounded-xl border border-border font-bold text-foreground text-xs whitespace-pre-wrap leading-relaxed">
                        {errandForm.description}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-micro font-black text-amber-600 tracking-normal font-medium">Scouting Fee (Base)</p>
                        <Home size={14} className="text-amber-400" />
                      </div>
                      <p className="text-2xl font-black text-amber-900">KSH 500</p>
                    </div>
                    
                    <div className="pt-4 border-t border-amber-100 flex items-center justify-between">
                      <div>
                        <p className="text-micro font-black text-muted-foreground tracking-normal font-medium">Est. Service Fee</p>
                        <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">(Includes complexity & urgency)</p>
                      </div>
                      <p className="text-xl font-black text-amber-600">
                        {isEstimating ? <Loader2 className="animate-spin inline" size={18} /> : `KSH ${errandForm.calculatedPrice || 0}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 py-5 bg-secondary text-muted-foreground rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="flex-[2] py-5 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Post Errand Now"}
                      {!loading && <Plus size={16} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </form>

        {/* Map Picker Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-5xl h-full max-h-[90vh] bg-card text-card-foreground rounded-[3rem] overflow-hidden relative shadow-2xl"
            >
              <button 
                onClick={() => setShowMapPicker(false)}
                className="absolute top-6 right-6 z-[110] w-12 h-12 bg-card text-card-foreground/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-foreground shadow-xl active:scale-90 transition-all"
              >
                <X size={24} />
              </button>
              
              <GoogleMapRoutePicker 
                apiKey={googleRoutesApiKey}
                placesApiKey={googlePlacesApiKey}
                onConfirm={handleMapConfirm}
                className="h-full"
                mode={errandForm.category === ErrandCategory.MAMA_FUA ? 'single' : 'route'}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function errandCategoryRequiresDropoff(category: ErrandCategory) {
  return [
    ErrandCategory.GENERAL,
    ErrandCategory.MARKET_SHOPPING,
    ErrandCategory.PACKAGE_DELIVERY,
    ErrandCategory.SHOPPING,
    ErrandCategory.GIKOMBA_STRAWS
  ].includes(category);
}

