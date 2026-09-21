import React, { useState, useEffect, useCallback } from 'react';
import { ErrandCategory, User, AppSettings } from '../../types';
import { 
  Plus, 
  MapPin, 
  Calendar, 
  Clock, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  ShoppingBag, 
  Car, 
  ShoppingCart, 
  Waves, 
  Home, 
  Package, 
  Map as MapIcon, 
  MapPinned,
  X, 
  Target, 
  Navigation, 
  Trash2, 
  Download, 
  Check, 
  ChevronRight, 
  Info, 
  ShieldCheck, 
  Mail, 
  Bookmark, 
  RotateCcw,
  Layers,
  ArrowRight,
  PlusCircle,
  DollarSign
} from 'lucide-react';
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
  const [showDrafts, setShowDrafts] = useState(false);

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
    setShowDrafts(false);
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
      budget: 500, 
      deadline: '', 
      pickup: null, 
      dropoff: null, 
      laundryBaskets: 1, 
      pricePerBasket: 250, 
      houseType: '1 Bedroom', 
      rentBudgetMin: 15000, 
      rentBudgetMax: 30000, 
      moveInDate: '', 
      additionalRequirements: '', 
      description: '', 
      isInHouse: false,
      maxShoppingBudget: 0,
      urgency: 'Normal',
      packageDescription: '',
      packageCost: 0,
      shoppingList: '',
      marketSection: '',
      paymentMethod: 'Cash on Delivery',
      mamaFuaBreakdown: null,
      targetEstates: [],
      amenities: ['Constant Water', 'Security (Gate/Fence)'],
      runnerTasks: ['video', 'photos', 'interview']
    });
  };

  // Automated Cost Estimation
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
        budget: serviceFee
      }));
      return;
    }

    if (errandForm.category === ErrandCategory.MAMA_FUA) {
      const loadMultiplier = errandForm.loadSize === 'Large' ? 3 : errandForm.loadSize === 'Medium' ? 2 : 1;
      const baseLaundry = 350 * loadMultiplier;
      const ironingExtra = (errandForm.serviceTypes || []).includes('Ironing') ? 200 : 0;
      const calculatedTotal = baseLaundry + ironingExtra;

      setErrandForm((prev: any) => ({
        ...prev,
        calculatedPrice: calculatedTotal,
        budget: calculatedTotal
      }));
      return;
    }

    if (!errandForm.description || errandForm.description.length < 8) return;

    setIsEstimating(true);
    try {
      const estimation = await geminiService.estimateErrandCost(
        errandForm.description,
        errandForm.pickup?.name || '',
        errandForm.urgency || 'Normal',
        errandForm.category,
        {}
      );
      if (estimation?.breakdown?.total) {
        const estTotal = Math.round(estimation.breakdown.total);
        setErrandForm((prev: any) => ({
          ...prev,
          calculatedPrice: estTotal,
          budget: prev.budget && prev.budget > 0 ? prev.budget : estTotal,
          aiEstimationBreakdown: estimation.breakdown
        }));
      }
    } catch (e) {
      console.warn('Cost estimation warning:', e);
    } finally {
      setIsEstimating(false);
    }
  }, [
    errandForm.description, 
    errandForm.urgency, 
    errandForm.pickup?.name, 
    errandForm.category, 
    errandForm.rentBudgetMin, 
    errandForm.rentBudgetMax, 
    errandForm.loadSize, 
    errandForm.serviceTypes, 
    setErrandForm, 
    settings?.sakaKejaBaseFee, 
    settings?.sakaKejaPercentage
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const shouldEstimate = errandForm.category === ErrandCategory.HOUSE_HUNTING 
        ? (errandForm.rentBudgetMin > 0 || errandForm.rentBudgetMax > 0)
        : (errandForm.category === ErrandCategory.MAMA_FUA) || (errandForm.description && errandForm.description.length > 10);

      if (shouldEstimate) {
        handleEstimateCost();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [handleEstimateCost, errandForm.description, errandForm.rentBudgetMin, errandForm.rentBudgetMax, errandForm.category, errandForm.loadSize]);

  // Keep title smartly populated if the user hasn't typed a custom one
  useEffect(() => {
    if (!errandForm.title || errandForm.title.startsWith('General Task') || errandForm.title.startsWith('Saka Keja') || errandForm.title.startsWith('Mama Fua')) {
      let defaultTitle = '';
      if (errandForm.category === ErrandCategory.HOUSE_HUNTING) {
        const location = errandForm.targetEstates?.length > 0 ? errandForm.targetEstates.join(', ') : 'Nairobi';
        defaultTitle = `Saka Keja: ${errandForm.houseType || 'House'} in ${location}`;
      } else if (errandForm.category === ErrandCategory.MAMA_FUA) {
        defaultTitle = `Mama Fua Laundry (${errandForm.loadSize || 'Standard'})`;
      } else if (errandForm.category === ErrandCategory.MARKET_SHOPPING) {
        defaultTitle = 'Fresh Market Shopping & Delivery';
      } else if (errandForm.category === ErrandCategory.PACKAGE_DELIVERY) {
        defaultTitle = errandForm.packageDescription ? `Deliver: ${errandForm.packageDescription}` : 'Express Package Delivery';
      } else if (errandForm.category === ErrandCategory.GIKOMBA_STRAWS) {
        defaultTitle = 'Gikomba Market Straws Sourcing';
      } else {
        const loc = errandForm.pickup?.name ? ` near ${errandForm.pickup.name.split(',')[0]}` : '';
        defaultTitle = `${errandForm.category}${loc}`;
      }

      if (defaultTitle && defaultTitle !== errandForm.title) {
        setErrandForm((prev: any) => ({ ...prev, title: defaultTitle }));
      }
    }
  }, [errandForm.category, errandForm.pickup?.name, errandForm.houseType, errandForm.targetEstates, errandForm.loadSize, errandForm.packageDescription, errandForm.title, setErrandForm]);

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
    { id: ErrandCategory.GENERAL, label: 'General Task', icon: Sparkles, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400', desc: 'Any everyday errand or task' },
    { id: ErrandCategory.MAMA_FUA, label: 'Mama Fua', icon: Waves, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400', desc: 'Laundry & home cleaning' },
    { id: ErrandCategory.MARKET_SHOPPING, label: 'Market Shopping', icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400', desc: 'Fresh produce & grocery runs' },
    { id: ErrandCategory.HOUSE_HUNTING, label: 'Saka Keja', icon: Home, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400', desc: 'House scouting & inspections' },
    { id: ErrandCategory.PACKAGE_DELIVERY, label: 'Package Delivery', icon: Package, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400', desc: 'Point-to-point courier' },
    { id: ErrandCategory.TOWN_SERVICE, label: 'Town Service', icon: Car, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300', desc: 'CBD queues & office runs' },
    { id: ErrandCategory.SHOPPING, label: 'Store Shopping', icon: ShoppingCart, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400', desc: 'Malls, supermarkets & stores' },
    { id: ErrandCategory.GIKOMBA_STRAWS, label: 'Gikomba Straws', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400', desc: 'Bale sourcing & market picks' },
  ];

  const houseTypes = ['Bedsitter', '1 Bedroom', '2 Bedroom', 'Studio', 'Own Compound', 'Office Space'];
  const essentialAmenities = ['Constant Water', 'Tokens/Postpaid', 'Security (Gate/Fence)', 'Parking'];
  const lifestyleAmenities = ['Wi-Fi ready', 'Balcony', 'Tiled floors', 'Instant Shower', 'Top-floor', 'Ground-floor'];
  const runnerTasks = [
    { id: 'video', label: 'Live Video Call Tour', desc: 'Real-time WhatsApp video walkthrough' },
    { id: 'photos', label: 'Detailed Photos', desc: 'Bathroom, view, cabinets, fixtures' },
    { id: 'interview', label: 'Caretaker Interview', desc: 'Check deposit terms & water schedule' },
    { id: 'neighborhood', label: 'Neighborhood Check', desc: 'Road accessibility, noise, security' }
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

  // Quick title suggestions based on selected category
  const getSuggestions = () => {
    switch (errandForm.category) {
      case ErrandCategory.MAMA_FUA:
        return ['Wash & Fold 2 Basins', 'Hand Wash Delicate Clothes', 'House Cleaning & Laundry', 'Ironing & Wardrobe Setup'];
      case ErrandCategory.MARKET_SHOPPING:
        return ['Groceries from City Market', 'Vegetables from Muthurwa', 'Supermarket run at Carrefour', 'Meat & Kitchen Supplies'];
      case ErrandCategory.HOUSE_HUNTING:
        return ['Find 1 Bedroom in Roysambu', 'Scout Bedsitter in Kilimani', 'Modern 2BR in South B', 'Studio in Westlands'];
      case ErrandCategory.PACKAGE_DELIVERY:
        return ['Pick Documents from CBD', 'Drop parcel at Parcel Office', 'Deliver package to client', 'Food delivery pickup'];
      default:
        return ['Pick & Deliver urgent item', 'Stand in line at Government office', 'Collect medicines from Chemist', 'Bank deposit / errand'];
    }
  };

  // Check if form is missing any required field
  const getMissingFieldNotice = () => {
    if (!errandForm.title) return 'Please provide an errand title';
    if (!errandForm.pickup?.name && errandForm.category !== ErrandCategory.HOUSE_HUNTING) {
      return 'Please specify pickup or starting location';
    }
    if (errandForm.category === ErrandCategory.HOUSE_HUNTING && (!errandForm.targetEstates || errandForm.targetEstates.length === 0)) {
      return 'Please add at least one target estate or area';
    }
    if ((errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING) && (!errandForm.shoppingItems || errandForm.shoppingItems.length === 0)) {
      return 'Please add at least one item to your shopping list';
    }
    if (errandForm.category !== ErrandCategory.MAMA_FUA && errandForm.category !== ErrandCategory.HOUSE_HUNTING && (!errandForm.budget || errandForm.budget <= 0)) {
      return 'Please specify your budget (in KSh)';
    }
    return null;
  };

  const missingNotice = getMissingFieldNotice();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-12 pb-32">
      {/* Executive Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              Post an Errand
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
              Connect with verified local runners for custom deliveries, shopping, laundry, and specialized town services across Nairobi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <button 
                type="button"
                onClick={() => setShowDrafts(!showDrafts)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Bookmark size={14} className="text-[#2891e2]" />
                Drafts ({drafts.length})
              </button>
            )}

            <button 
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Save size={14} />
              Save
            </button>

            <button 
              type="button"
              onClick={handleResetForm}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Reset Form"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Form Error Banner */}
        {errors?.create && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-sm font-semibold">{errors.create}</div>
          </motion.div>
        )}
      </div>

      {/* Saved Drafts List */}
      <AnimatePresence>
        {showDrafts && drafts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Your Saved Drafts</h3>
                <button onClick={() => setShowDrafts(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {drafts.map((d) => (
                  <div 
                    key={d.id} 
                    onClick={() => handleLoadDraft(d)}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2891e2] rounded-xl cursor-pointer transition-all flex items-start justify-between group shadow-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {d.form?.title || d.form?.category || 'Untitled Draft'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                        {new Date(d.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={(e) => handleDeleteDraft(d.id, e)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={postErrand} className="space-y-16">
        
        {/* Step 1: Service Category */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black flex items-center justify-center">1</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Choose Category</h2>
              <p className="text-xs font-medium text-slate-500">What kind of task do you need help with?</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = errandForm.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setErrandForm({ ...errandForm, category: cat.id })}
                  className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col gap-4 relative group ${
                    isSelected 
                      ? 'border-[#2891e2] bg-[#2891e2]/5 dark:bg-[#2891e2]/10 shadow-md shadow-[#2891e2]/10' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color} ${isSelected ? 'scale-110' : ''} transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className={`text-sm font-black leading-tight ${isSelected ? 'text-[#0a2e5c] dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {cat.label}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#2891e2] text-white flex items-center justify-center shadow-lg">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Task Details */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black flex items-center justify-center">2</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Task Essentials</h2>
              <p className="text-xs font-medium text-slate-500">Provide clear instructions for your runner.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Title & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Task Title</label>
                  <input 
                    type="text"
                    value={errandForm.title || ''}
                    onChange={(e) => setErrandForm({ ...errandForm, title: e.target.value })}
                    placeholder="Briefly describe what needs to be done..."
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#2891e2] focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-base font-bold text-slate-900 dark:text-white outline-none transition-all"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {getSuggestions().map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setErrandForm({ ...errandForm, title: s })}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Instructions & Notes</label>
                  <textarea 
                    value={errandForm.description || ''}
                    onChange={(e) => setErrandForm({ ...errandForm, description: e.target.value })}
                    placeholder="Specific details like gate codes, contact person, or delicate handling..."
                    rows={5}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#2891e2] focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-base font-medium text-slate-900 dark:text-white outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {/* Urgency */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Urgency Level</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { level: 'Normal', desc: 'Standard turnaround (today)', icon: Clock },
                      { level: 'High', desc: 'Priority request (1-2 hours)', icon: Zap },
                      { level: 'Urgent', desc: 'Immediate attention (ASAP)', icon: ShieldAlert }
                    ].map((item) => {
                      const isSelected = (errandForm.urgency || 'Normal').toLowerCase() === item.level.toLowerCase();
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, urgency: item.level })}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                            isSelected 
                              ? 'border-[#2891e2] bg-[#2891e2]/5 text-[#0a2e5c] dark:text-sky-300' 
                              : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#2891e2] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <Icon size={20} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black">{item.level}</p>
                            <p className="text-[10px] font-medium opacity-60">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Specific Requirements & Locations */}
        <div className="space-y-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black flex items-center justify-center">3</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Requirement Logic</h2>
              <p className="text-xs font-medium text-slate-500">Fine-tune the specifics based on your service.</p>
            </div>
          </div>

          {/* Mama Fua Specifics */}
          {errandForm.category === ErrandCategory.MAMA_FUA && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-2 border-blue-100 dark:border-blue-900/30 pb-4">
                <h3 className="text-lg font-black text-blue-600 dark:text-blue-400">Laundry & Cleaning Options</h3>
                <button
                  type="button"
                  onClick={() => pdfService.downloadMamaFuaPDF(errandForm as any)}
                  className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-blue-100 transition-colors"
                >
                  <Download size={14} />
                  Rate Card
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Load Size */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Laundry Load Size</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { size: 'Small', label: '1–2 Basins', price: 'KSh 350' },
                      { size: 'Medium', label: '3–4 Basins', price: 'KSh 700' },
                      { size: 'Large', label: 'Full Sack / Bulk', price: 'KSh 1,050' }
                    ].map((load) => {
                      const isSelected = (errandForm.loadSize || 'Small') === load.size;
                      return (
                        <button
                          key={load.size}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, loadSize: load.size })}
                          className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' 
                              : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-black">{load.size}</p>
                            <p className="text-[10px] font-medium opacity-60">{load.label}</p>
                          </div>
                          <p className="text-sm font-black text-blue-600">{load.price}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Service Types */}
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Service Selection</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Wash & Hang', 'Hand Wash Only', 'Ironing (+KSh 200)', 'House Cleaning'].map((type) => {
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
                          className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all text-center ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' 
                              : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detergent</label>
                      <select 
                        value={errandForm.detergentProvided ?? true ? 'yes' : 'no'}
                        onChange={(e) => setErrandForm({ ...errandForm, detergentProvided: e.target.value === 'yes' })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none text-xs font-bold"
                      >
                        <option value="yes">I Provide</option>
                        <option value="no">Runner Buys</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Water Supply</label>
                      <select 
                        value={errandForm.waterAvailability || 'Constant'}
                        onChange={(e) => setErrandForm({ ...errandForm, waterAvailability: e.target.value })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none text-xs font-bold"
                      >
                        <option value="Constant">Constant Tap</option>
                        <option value="Buying/Bowser">Buying / Tanker</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hanging Area</label>
                      <select 
                        value={errandForm.hangingPreference || 'Outdoor Lines'}
                        onChange={(e) => setErrandForm({ ...errandForm, hangingPreference: e.target.value })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none text-xs font-bold"
                      >
                        <option value="Outdoor Lines">Outdoor Lines</option>
                        <option value="Indoor Rack">Indoor Rack</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shopping / Market Shopping Specifics */}
          {(errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING || errandForm.category === ErrandCategory.GIKOMBA_STRAWS) && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-2 border-emerald-100 dark:border-emerald-900/30 pb-4">
                <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">Shopping Inventory</h3>
                <button
                  type="button"
                  onClick={() => pdfService.downloadShoppingPDF(errandForm as any)}
                  className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                >
                  <Download size={14} />
                  Shopping List PDF
                </button>
              </div>

              <div className="space-y-6">
                {/* Item Input */}
                <div className="relative group">
                  <input 
                    type="text" 
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                    placeholder="Add item: e.g. 2kg Sugar, 1 tray Eggs..."
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-base font-bold text-slate-900 dark:text-white outline-none transition-all pr-24"
                  />
                  <button 
                    type="button"
                    onClick={addItem}
                    className="absolute right-3 top-3 bottom-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    Add
                  </button>
                </div>

                {/* Items List */}
                <div className="flex flex-wrap gap-3">
                  {(errandForm.shoppingItems || []).length === 0 ? (
                    <div className="w-full p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
                      <ShoppingBag size={24} />
                      <p className="text-xs font-bold uppercase tracking-widest">No items in your list yet</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {(errandForm.shoppingItems || []).map((item: string, idx: number) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-xl text-sm font-bold shadow-sm"
                        >
                          <span>{item}</span>
                          <button 
                            type="button" 
                            onClick={() => removeItem(idx)}
                            className="p-1 hover:bg-rose-500 hover:text-white rounded-md transition-all"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Brands / Quality Preferences</label>
                    <input 
                      type="text" 
                      value={errandForm.shoppingList || ''}
                      onChange={(e) => setErrandForm({ ...errandForm, shoppingList: e.target.value })}
                      placeholder="e.g. Medium-sized eggs, ripe avocados only"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Goods Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Cash on Delivery', 'Mobile Money'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, paymentMethod: method })}
                          className={`p-4 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${
                            (errandForm.paymentMethod || 'Cash on Delivery') === method 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' 
                              : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Saka Keja (House Hunting) Specifics */}
          {errandForm.category === ErrandCategory.HOUSE_HUNTING && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-2 border-amber-100 dark:border-amber-900/30 pb-4">
                <h3 className="text-lg font-black text-amber-600 dark:text-amber-400">House Hunting Specifications</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
                  <ShieldCheck size={14} className="text-amber-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Saka Keja Protocol</span>
                </div>
              </div>

              <div className="space-y-8">
                {/* House Type */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Property Type <span className="text-rose-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {houseTypes.map((type) => {
                      const isSelected = errandForm.houseType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setErrandForm({ ...errandForm, houseType: type })}
                          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                            isSelected 
                              ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20' 
                              : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    {/* Target Estates */}
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Target Neighborhoods (Up to 3)</label>
                      <PlacesAutocomplete 
                        apiKey={googlePlacesApiKey}
                        onPlaceSelect={(data) => {
                          const current = errandForm.targetEstates || [];
                          if (current.length < 3 && !current.includes(data.address)) {
                            setErrandForm({ ...errandForm, targetEstates: [...current, data.address] });
                          }
                        }}
                        placeholder="Search area (e.g. Roysambu, Kilimani, Ruaka, Ngong Rd)..."
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none text-base font-bold"
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(errandForm.targetEstates || []).map((estate: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-black border-2 border-amber-100">
                            <span>{estate}</span>
                            <button onClick={() => {
                              const updated = (errandForm.targetEstates || []).filter((_: any, i: number) => i !== idx);
                              setErrandForm({ ...errandForm, targetEstates: updated });
                            }}><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rent Budget */}
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Rent Budget (Monthly)</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400">MIN KSH</span>
                          <input 
                            type="number"
                            value={errandForm.rentBudgetMin || ''}
                            onChange={(e) => setErrandForm({ ...errandForm, rentBudgetMin: Number(e.target.value) })}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-black text-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400">MAX KSH</span>
                          <input 
                            type="number"
                            value={errandForm.rentBudgetMax || ''}
                            onChange={(e) => setErrandForm({ ...errandForm, rentBudgetMax: Number(e.target.value) })}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none font-black text-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Runner Tasks */}
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Runner Deliverables</label>
                      <div className="space-y-3">
                        {runnerTasks.map((task) => {
                          const isSelected = (errandForm.runnerTasks || []).includes(task.id);
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => toggleRunnerTask(task.id)}
                              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left ${
                                isSelected 
                                  ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/30' 
                                  : 'border-slate-50 dark:border-slate-800 hover:border-slate-100'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">{task.label}</p>
                                <p className="text-[10px] font-medium text-slate-400">{task.desc}</p>
                              </div>
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                {isSelected && <Check size={14} strokeWidth={4} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location Selection (Generic) */}
          <div className="space-y-8 pt-8">
            <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Logistics & Locations</h3>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
              >
                <MapPinned size={14} />
                Open Interactive Map
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Pickup / Origin */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <MapPin size={18} />
                  </div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Starting Point / Pickup</label>
                </div>
                <PlacesAutocomplete 
                  apiKey={googlePlacesApiKey}
                  onPlaceSelect={(place) => setErrandForm({ ...errandForm, pickup: place })}
                  placeholder="Enter shop, building or estate..."
                  className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none text-base font-bold"
                  initialValue={errandForm.pickup?.name}
                />
              </div>

              {/* Dropoff / Destination */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Navigation size={18} />
                  </div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Destination (Optional)</label>
                </div>
                <PlacesAutocomplete 
                  apiKey={googlePlacesApiKey}
                  onPlaceSelect={(place) => setErrandForm({ ...errandForm, dropoff: place })}
                  placeholder="Where should the runner deliver?"
                  className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none text-base font-bold"
                  initialValue={errandForm.dropoff?.name}
                />
              </div>
            </div>
          </div>

          {/* Final Payout / Budget */}
          <div className="pt-12">
            <div className="bg-slate-900 dark:bg-white rounded-[32px] p-8 md:p-12 text-white dark:text-slate-900 relative overflow-hidden shadow-2xl shadow-slate-900/20">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <DollarSign size={200} strokeWidth={1} />
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tight">Set Your Payout</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm">How much are you offering the runner for this service?</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-black">KSH</div>
                    <input 
                      type="number"
                      value={errandForm.budget || ''}
                      onChange={(e) => setErrandForm({ ...errandForm, budget: Number(e.target.value) })}
                      className="bg-transparent border-b-4 border-slate-700 dark:border-slate-200 outline-none w-full text-5xl font-black pb-2 focus:border-[#2891e2] transition-colors"
                      placeholder="0"
                    />
                  </div>

                  {isEstimating && (
                    <div className="flex items-center gap-2 text-sky-400 animate-pulse">
                      <Sparkles size={16} />
                      <span className="text-xs font-black uppercase tracking-widest">AI Calculating optimal rate...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest opacity-60">
                      <span>Service Summary</span>
                      <span>Rate</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between font-bold">
                        <span className="opacity-80">Base Service Fee</span>
                        <span>KSh {Math.round((errandForm.calculatedPrice || 0) * 0.8)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="opacity-80">Urgency Multiplier</span>
                        <span>x{errandForm.urgency === 'Urgent' ? '1.5' : errandForm.urgency === 'High' ? '1.2' : '1.0'}</span>
                      </div>
                      <div className="pt-4 border-t border-white/10 flex justify-between text-2xl font-black">
                        <span>Total Offer</span>
                        <span className="text-[#2891e2]">KSh {errandForm.budget || 0}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !!missingNotice}
                    className={`w-full py-6 rounded-2xl font-black text-lg uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${
                      loading || !!missingNotice
                        ? 'bg-slate-800 dark:bg-slate-100 text-slate-500 cursor-not-allowed opacity-50'
                        : 'bg-[#2891e2] hover:bg-[#2891e2]/90 text-white shadow-[#2891e2]/30 hover:-translate-y-1 active:scale-95'
                    }`}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <PlusCircle size={24} />}
                    {loading ? 'Posting...' : 'Dispatch Errand'}
                  </button>
                  
                  {missingNotice && (
                    <p className="text-center text-rose-400 text-[10px] font-black uppercase tracking-widest">{missingNotice}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Google Map Route Modal */}
      <AnimatePresence>
        {showMapPicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Interactive Route Map Picker</h3>
                  <p className="text-xs text-slate-500">Click or search to set your pickup and delivery points</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowMapPicker(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 relative">
                <GoogleMapRoutePicker 
                  apiKey={googleMapsApiKey}
                  placesApiKey={googlePlacesApiKey}
                  onConfirm={handleMapConfirm}
                  mode={errandForm.isInHouse || errandForm.category === ErrandCategory.MAMA_FUA ? 'single' : 'route'}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
