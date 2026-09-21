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
  ArrowRight
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
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-6 pb-28">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Post an Errand
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Connect with verified runners across Nairobi. Quick dispatch, live updates & email receipt.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {drafts.length > 0 && (
            <button 
              type="button"
              onClick={() => setShowDrafts(!showDrafts)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Bookmark size={14} className="text-[#2891e2]" />
              Drafts ({drafts.length})
            </button>
          )}

          <button 
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            title="Save draft"
          >
            Save Draft
          </button>

          <button 
            type="button"
            onClick={handleResetForm}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
            title="Reset form"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      {/* Saved Drafts Drawer */}
      {showDrafts && drafts.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saved Errand Drafts</span>
            <button 
              type="button" 
              onClick={() => setShowDrafts(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {drafts.map((d) => (
              <div 
                key={d.id} 
                onClick={() => handleLoadDraft(d)}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#2891e2] rounded-lg cursor-pointer transition-all flex items-start justify-between group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {d.form?.title || d.form?.category || 'Untitled Draft'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(d.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => handleDeleteDraft(d.id, e)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Error Banner */}
      {errors?.create && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm font-semibold">{errors.create}</div>
        </div>
      )}

      <form onSubmit={postErrand} className="space-y-6">
        
        {/* ===================================================================
            SECTION 1: CATEGORY SELECTION (OPEN & PROPORTIONAL)
            =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0a2e5c] text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Choose Service Category</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Selected: <strong className="text-slate-700 dark:text-slate-200">{errandForm.category}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = errandForm.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setErrandForm({ ...errandForm, category: cat.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 relative group ${
                    isSelected 
                      ? 'border-[#2891e2] bg-sky-50/50 dark:bg-sky-950/20 ring-1 ring-[#2891e2]' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat.color}`}>
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#2891e2] text-white flex items-center justify-center">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-[#0a2e5c] dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {cat.label}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {cat.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================================================================
            SECTION 2: TASK ESSENTIALS (TITLE, INSTRUCTIONS, URGENCY)
            =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-[#0a2e5c] text-white text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Task Details</h2>
          </div>

          {/* Errand Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              value={errandForm.title || ''}
              onChange={(e) => setErrandForm({ ...errandForm, title: e.target.value })}
              placeholder="e.g. Pick and deliver laptop charger from Kilimani"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#2891e2] focus:ring-2 focus:ring-[#2891e2]/10 transition-all"
            />
            {/* Quick Title Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400">Suggestions:</span>
              {getSuggestions().map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setErrandForm({ ...errandForm, title: suggestion })}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-[11px] font-medium transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Instructions & Notes
            </label>
            <textarea 
              value={errandForm.description || ''}
              onChange={(e) => setErrandForm({ ...errandForm, description: e.target.value })}
              placeholder="Give details: gate codes, contact person, specific brand requirements, elevator status..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-[#2891e2] focus:ring-2 focus:ring-[#2891e2]/10 transition-all resize-none"
            />
          </div>

          {/* Urgency Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'Normal', desc: 'Standard (today)' },
                { level: 'High', desc: 'Priority (1-2 hrs)' },
                { level: 'Urgent', desc: 'Immediate (< 45 min)' }
              ].map((item) => {
                const isSelected = (errandForm.urgency || 'Normal').toLowerCase() === item.level.toLowerCase();
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setErrandForm({ ...errandForm, urgency: item.level })}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      isSelected 
                        ? 'border-[#2891e2] bg-sky-50 dark:bg-sky-950/30 text-[#0a2e5c] dark:text-sky-300 font-bold' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.level}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================================================================
            SECTION 3: CASCADING CATEGORY SPECIFICS (SMOOTH & INTEGRATED)
            =================================================================== */}
        
        {/* Mama Fua Specifics */}
        {errandForm.category === ErrandCategory.MAMA_FUA && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Mama Fua Laundry Options</h2>
              </div>
              <button
                type="button"
                onClick={() => pdfService.downloadMamaFuaPDF(errandForm as any)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Download size={13} />
                Download Rate Card
              </button>
            </div>

            {/* Load Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Laundry Load Size
              </label>
              <div className="grid grid-cols-3 gap-2.5">
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
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-600' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{load.size}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{load.label}</p>
                      <p className="text-xs font-black text-blue-600 mt-1">{load.price}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Types */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Service Specifics (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Supplies & Water */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Detergent</label>
                <div className="flex gap-1.5">
                  {[true, false].map((val) => (
                    <button
                      key={val ? 'yes' : 'no'}
                      type="button"
                      onClick={() => setErrandForm({ ...errandForm, detergentProvided: val })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                        (errandForm.detergentProvided ?? true) === val 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      {val ? 'I Provide' : 'Runner Buys'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Water Supply</label>
                <div className="flex gap-1.5">
                  {['Constant', 'Buying/Bowser'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setErrandForm({ ...errandForm, waterAvailability: val })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                        (errandForm.waterAvailability || 'Constant') === val 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Hanging Area</label>
                <div className="flex gap-1.5">
                  {['Outdoor Lines', 'Indoor Rack'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setErrandForm({ ...errandForm, hangingPreference: val })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                        (errandForm.hangingPreference || 'Outdoor Lines') === val 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shopping / Market Shopping Specifics */}
        {(errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING || errandForm.category === ErrandCategory.GIKOMBA_STRAWS) && (
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Shopping Item List</h2>
              </div>
              <button
                type="button"
                onClick={() => pdfService.downloadShoppingPDF(errandForm as any)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <Download size={13} />
                Download PDF
              </button>
            </div>

            {/* Item Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                  placeholder="e.g. 2kg Sugar, 1 tray Eggs, 500ml Milk..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
                <button 
                  type="button"
                  onClick={addItem}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus size={15} /> Add
                </button>
              </div>

              {/* Items List Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {(errandForm.shoppingItems || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">No items added yet. Type an item above and press Enter or Add.</p>
                ) : (
                  (errandForm.shoppingItems || []).map((item: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold"
                    >
                      <span>{item}</span>
                      <button 
                        type="button" 
                        onClick={() => removeItem(idx)}
                        className="text-emerald-500 hover:text-rose-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Shopping Notes & Market Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Preferred Brands / Substitutions</label>
                <input 
                  type="text" 
                  value={errandForm.shoppingList || ''}
                  onChange={(e) => setErrandForm({ ...errandForm, shoppingList: e.target.value })}
                  placeholder="e.g. Broadways bread, Tuzo milk if available"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Payment for Goods</label>
                <div className="flex gap-2">
                  {['Cash on Delivery', 'Mobile Money / M-Pesa'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setErrandForm({ ...errandForm, paymentMethod: method })}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        (errandForm.paymentMethod || 'Cash on Delivery') === method 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saka Keja (House Hunting) Specifics */}
        {errandForm.category === ErrandCategory.HOUSE_HUNTING && (
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">House Hunting Specifications</h2>
              </div>
              <span className="text-xs font-bold text-amber-600">Saka Keja Protocol</span>
            </div>

            {/* House Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Property Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {houseTypes.map((type) => {
                  const isSelected = errandForm.houseType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setErrandForm({ ...errandForm, houseType: type })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        isSelected 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Estates Autocomplete */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Estates / Neighborhoods (Up to 3) <span className="text-rose-500">*</span>
              </label>
              <PlacesAutocomplete 
                apiKey={googlePlacesApiKey}
                placeholder="Search area (e.g. Roysambu, Kilimani, Ruaka, Ngong Rd)..."
                onPlaceSelect={(data) => {
                  if ((errandForm.targetEstates || []).length >= 3) return;
                  const current = errandForm.targetEstates || [];
                  if (!current.includes(data.address)) {
                    setErrandForm({ ...errandForm, targetEstates: [...current, data.address] });
                  }
                }}
                icon={<MapPin size={15} className="text-amber-600" />}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {(errandForm.targetEstates || []).map((estate: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold">
                    <span>{estate}</span>
                    <button 
                      type="button" 
                      onClick={() => setErrandForm({ ...errandForm, targetEstates: (errandForm.targetEstates || []).filter((_: any, i: number) => i !== idx) })}
                      className="text-amber-700 hover:text-rose-600"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Rent Range & Move Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Min Rent Budget (KSh)</label>
                <input 
                  type="number" 
                  value={errandForm.rentBudgetMin || ''}
                  onChange={(e) => setErrandForm({ ...errandForm, rentBudgetMin: Number(e.target.value) })}
                  placeholder="e.g. 15000"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Max Rent Budget (KSh) *</label>
                <input 
                  type="number" 
                  value={errandForm.rentBudgetMax || ''}
                  onChange={(e) => setErrandForm({ ...errandForm, rentBudgetMax: Number(e.target.value) })}
                  placeholder="e.g. 30000"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Desired Move-in Date</label>
                <input 
                  type="date" 
                  value={errandForm.moveInDate || ''}
                  onChange={(e) => setErrandForm({ ...errandForm, moveInDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {/* Runner Tasks */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Runner Verification Checklist
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {runnerTasks.map((task) => {
                  const isChecked = (errandForm.runnerTasks || []).includes(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleRunnerTask(task.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isChecked 
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                        isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300'
                      }`}>
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{task.label}</p>
                        <p className="text-[11px] text-slate-500">{task.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Package Delivery Specifics */}
        {errandForm.category === ErrandCategory.PACKAGE_DELIVERY && (
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Delivery Package Details</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Package Description <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={errandForm.packageDescription || ''}
                  onChange={(e) => setErrandForm({ ...errandForm, packageDescription: e.target.value })}
                  placeholder="e.g. Enveloped documents, Electronics, Clothes package..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Approximate Value / Care
                </label>
                <input 
                  type="text" 
                  value={errandForm.packageCost ? `KSh ${errandForm.packageCost}` : ''}
                  onChange={(e) => setErrandForm({ ...errandForm, packageCost: Number(e.target.value.replace(/\D/g, '')) })}
                  placeholder="e.g. Fragile, Handle with care"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 4: LOCATIONS & ROUTING (CLEAN & OPEN)
            =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0a2e5c] text-white text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Locations & Route</h2>
            </div>
            
            {/* Delivery Mode Toggle */}
            {(errandForm.category === ErrandCategory.MAMA_FUA || errandForm.category === ErrandCategory.GENERAL) && (
              <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                <input 
                  type="checkbox"
                  checked={errandForm.isInHouse || false}
                  onChange={(e) => setErrandForm({ ...errandForm, isInHouse: e.target.checked })}
                  className="rounded border-slate-300 text-[#0a2e5c] focus:ring-[#0a2e5c]"
                />
                On-site task (Runner comes to my house / office)
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup / Starting Point */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#2891e2]" />
                  {errandForm.isInHouse ? 'Service Location' : 'Pickup / Starting Location'} 
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="text-xs font-bold text-[#2891e2] hover:underline flex items-center gap-1"
                >
                  <MapIcon size={12} /> Pin on Map
                </button>
              </div>

              <PlacesAutocomplete 
                apiKey={googlePlacesApiKey}
                placeholder="Enter pickup address, estate, or landmark..."
                initialValue={errandForm.pickup?.name || ''}
                onPlaceSelect={(data) => {
                  setErrandForm({
                    ...errandForm,
                    pickup: { name: data.address, coords: data.coords, placeId: data.placeId }
                  });
                }}
                icon={<MapPin size={14} className="text-[#2891e2]" />}
              />
            </div>

            {/* Dropoff / Destination Point */}
            {!errandForm.isInHouse && errandForm.category !== ErrandCategory.HOUSE_HUNTING && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Target size={14} className="text-rose-500" />
                    Delivery / Destination
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="text-xs font-bold text-[#2891e2] hover:underline flex items-center gap-1"
                  >
                    <MapIcon size={12} /> Pin on Map
                  </button>
                </div>

                <PlacesAutocomplete 
                  apiKey={googlePlacesApiKey}
                  placeholder="Enter drop-off address or recipient location..."
                  initialValue={errandForm.dropoff?.name || ''}
                  onPlaceSelect={(data) => {
                    setErrandForm({
                      ...errandForm,
                      dropoff: { name: data.address, coords: data.coords, placeId: data.placeId }
                    });
                  }}
                  icon={<Target size={14} className="text-rose-500" />}
                />
              </div>
            )}
          </div>

          {/* Route Distance Badge */}
          {errandForm.estimatedDistance && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Navigation size={13} className="text-[#2891e2]" />
                  Distance: <strong className="text-slate-800 dark:text-slate-200">{errandForm.estimatedDistance}</strong>
                </span>
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Clock size={13} className="text-[#2891e2]" />
                  Estimated Time: <strong className="text-slate-800 dark:text-slate-200">{errandForm.estimatedDuration}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="text-xs font-bold text-[#2891e2] hover:underline"
              >
                Change Route
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================
            SECTION 5: BUDGET & PRICING (KENYAN SHILLINGS, TRANSPARENT)
            =================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0a2e5c] text-white text-xs font-bold flex items-center justify-center">5</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Budget & Pricing</h2>
            </div>
            {isEstimating && (
              <span className="text-xs font-semibold text-[#2891e2] flex items-center gap-1">
                <Loader2 size={13} className="animate-spin" /> Estimating fee...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Budget Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Runner Fee (in KSh) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  KSh
                </div>
                <input 
                  type="number" 
                  value={errandForm.budget || ''}
                  onChange={(e) => setErrandForm({ ...errandForm, budget: Number(e.target.value) })}
                  placeholder="e.g. 500"
                  className="w-full pl-14 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white outline-none focus:border-[#2891e2] focus:ring-2 focus:ring-[#2891e2]/10 transition-all"
                />
              </div>

              {/* Quick Budget Presets */}
              <div className="flex gap-1.5 pt-1">
                {[300, 500, 800, 1200, 2000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setErrandForm({ ...errandForm, budget: amount })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      errandForm.budget === amount 
                        ? 'bg-[#0a2e5c] text-white border-[#0a2e5c]' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    KSh {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Breakdown & Transparency */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Estimated Total Runner Payout:</span>
                  <span className="text-base font-black text-[#0a2e5c] dark:text-[#2891e2]">
                    KSh {Number(errandForm.budget || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Verified runners accept or bid on your task. Escrow protection secures your funds until completion.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={14} />
                <span>Protected by Errandly Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            SECTION 6: REVIEW, EMAIL NOTICE & SUBMIT
            =================================================================== */}
        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-[#2891e2] flex items-center justify-center shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Immediate Email Confirmation
              </p>
              <p className="text-[11px] text-slate-500">
                Upon posting, an errand confirmation and live runner tracking link will be sent to{' '}
                <strong className="text-slate-700 dark:text-slate-300">{user?.email || 'your registered email'}</strong>.
              </p>
            </div>
          </div>

          {missingNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Info size={14} className="shrink-0" />
              <span>{missingNotice}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !!missingNotice}
            className="w-full py-4 bg-[#0a2e5c] hover:bg-[#071f3e] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl font-black text-sm tracking-wide shadow-lg shadow-slate-900/10 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Broadcasting to Runners...</span>
              </>
            ) : (
              <>
                <span>Post Errand Now</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
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
