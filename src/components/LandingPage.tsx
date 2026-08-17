import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  MapPin, 
  ShieldCheck, 
  Star, 
  ArrowRight, 
  Search, 
  ShoppingBag, 
  Truck, 
  Sparkles,
  Users,
  ChevronRight,
  Loader2,
  Package,
  Layers,
  Heart,
  Menu,
  X,
  Activity
} from 'lucide-react';
import { AppSettings, Errand } from '../../types';
import { Logo } from './Logo';
import { firebaseService } from '../../services/firebaseService';
import { 
  ServicesPage, 
  ElitePricingPage, 
  NetworkStandardsPage, 
  HelpPage, 
  PartnerGuidePage 
} from './InfoPages';

const PricingCalculator = () => {
  const [distance, setDistance] = useState(5);
  const [urgency, setUrgency] = useState('normal');
  const [service, setService] = useState('general');
  const [weight, setWeight] = useState(2);
  const [shopValue, setShopValue] = useState(1000);

  const getDistanceFee = (km: number) => {
    if (km < 1) return 50;
    if (km < 3) return 100;
    return 100 + (km - 3) * 50;
  };

  const multipliers: Record<string, number> = {
    normal: 1,
    priority: 1.25,
    urgent: 1.5
  };

  const basePickup = 40;
  const distanceFee = getDistanceFee(distance);
  let serviceFee = 0;

  if (service === 'laundry') {
    serviceFee = weight * 70;
  } else if (service === 'shopping') {
    serviceFee = shopValue * 0.05;
  }

  const total = Math.round((basePickup + distanceFee + serviceFee) * multipliers[urgency]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors" />
      
      <h3 className="text-2xl font-black mb-8 dark:text-white">Estimate Your <span className="text-primary italic">Cost.</span></h3>
      
      <div className="space-y-8 relative z-10">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Service Category</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'General', id: 'general', icon: <Package size={14} /> },
              { label: 'Shopping', id: 'shopping', icon: <ShoppingBag size={14} /> },
              { label: 'Laundry', id: 'laundry', icon: <Layers size={14} /> },
              { label: 'Delivery', id: 'delivery', icon: <Truck size={14} /> }
            ].map(s => (
              <button 
                key={s.id}
                onClick={() => setService(s.id)}
                className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                  service === s.id 
                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Distance</label>
              <span className="text-sm font-black text-primary">{distance} KM</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={distance} 
              onChange={(e) => setDistance(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {service === 'laundry' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Weight (KG)</label>
                <span className="text-sm font-black text-primary">{weight} KG</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={weight} 
                onChange={(e) => setWeight(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          ) : service === 'shopping' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Bill Value</label>
                <span className="text-sm font-black text-primary">KSh {shopValue}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="10000" 
                step="100"
                value={shopValue} 
                onChange={(e) => setShopValue(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          ) : (
            <div>
               <div className="flex items-center justify-between mb-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Package Load</label>
                <span className="text-sm font-black text-primary">Standard</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-primary/40" />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Urgency Level</label>
          <div className="flex gap-3">
            {['Normal', 'Priority', 'Urgent'].map(u => (
              <button 
                key={u}
                onClick={() => setUrgency(u.toLowerCase())}
                className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  urgency === u.toLowerCase() 
                    ? 'bg-secondary border-secondary text-white shadow-xl shadow-secondary/20' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-secondary/30'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub-total Breakdown</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">KSh {basePickup + distanceFee + serviceFee}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Total Cost</span>
            <span className="text-4xl font-black text-primary italic">KSh {total}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-right mt-4">Pricing subject to runner availability.</p>
        </div>
      </div>
    </div>
  );
};

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onBecomeRunner?: () => void;
  onTrackRunnerApplication?: () => void;
  appSettings?: AppSettings;
}

const maskName = (name?: string) => {
  if (!name) return 'Anonymous';
  const trimmed = String(name).trim();
  if (!trimmed) return 'Anonymous';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return trimmed;
  if (parts.length > 1 && parts[1]) {
    return `${parts[0]} ${parts[1][0]}.`; // e.g., "John Doe" -> "John D."
  }
  return parts[0];
};

const maskPhone = (phone?: string) => {
  if (!phone) return '';
  const clean = String(phone).trim();
  if (!clean) return '';
  if (clean.length <= 6) return '***';
  return clean.substring(0, 4) + '***' + clean.substring(clean.length - 3);
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, onBecomeRunner, onTrackRunnerApplication, appSettings }) => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeInfoPage, setActiveInfoPage] = useState<'services' | 'pricing' | 'standards' | 'help' | 'partner' | null>(null);
  
  // Tracking Errand State
  const [searchId, setSearchId] = useState('');
  const [trackedErrand, setTrackedErrand] = useState<Errand | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleTrackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchId.trim()) {
      setTrackingError('Please enter an Errand ID first');
      return;
    }

    setIsSearching(true);
    setTrackingError(null);
    try {
      const idToSearch = searchId.trim();
      const errand = await firebaseService.fetchErrandById(idToSearch);
      if (errand) {
        setTrackedErrand(errand);
      } else {
        setTrackingError(`No errand found for "${idToSearch.substring(0, 8)}..."`);
        setTrackedErrand(null);
      }
    } catch (err: any) {
      console.error('[LandingPage] Tracking error:', err);
      setTrackingError('Failed to fetch status. Try again.');
      setTrackedErrand(null);
    } finally {
      setIsSearching(false);
    }
  };

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "Premium Logistics",
      description: "From luxury laundry handling to same-day courier services, we manage the movement of your life.",
      icon: <Truck />,
      tag: "Efficiency"
    },
    {
      title: "Errand Intelligence",
      description: "Our AI-powered platform matches your complex needs with the highest-rated runners in your city.",
      icon: <Sparkles />,
      tag: "Smart Match"
    },
    {
      title: "Real-time Trust",
      description: "Track every step of your errand with real-time GPS and secure escrow payments.",
      icon: <ShieldCheck />,
      tag: "Security"
    }
  ];

  const logoUrl = appSettings?.logoUrl || "https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png";

  if (activeInfoPage === 'services') return <ServicesPage onBack={() => setActiveInfoPage(null)} appSettings={appSettings} />;
  if (activeInfoPage === 'pricing') return <ElitePricingPage onBack={() => setActiveInfoPage(null)} appSettings={appSettings} />;
  if (activeInfoPage === 'standards') return <NetworkStandardsPage onBack={() => setActiveInfoPage(null)} appSettings={appSettings} />;
  if (activeInfoPage === 'help') return <HelpPage onBack={() => setActiveInfoPage(null)} appSettings={appSettings} />;
  if (activeInfoPage === 'partner') return <PartnerGuidePage onBack={() => setActiveInfoPage(null)} appSettings={appSettings} onStartApplication={onBecomeRunner} />;

  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#050b15] overflow-x-hidden selection:bg-primary selection:text-white">
      {/* Announcement Bar */}
      <div className="h-12 bg-[#0a2e5c] flex items-center justify-center px-6 overflow-hidden relative">
        <motion.div 
          animate={{ x: [-800, 800] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 flex items-center gap-16"
        >
          <span>✨ NEW: Premium Laundry Concierge active in Nairobi</span>
          <span>⚡ FAST: Response times under 4 minutes</span>
          <span>📦 SMART: Weight-based pricing now active</span>
          <span>✨ NEW: Premium Laundry Concierge active in Nairobi</span>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className={`w-full z-50 transition-all duration-500 px-4 md:px-12 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl sticky top-0`}>
        <div className="flex items-center gap-2 md:gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-2xl flex items-center justify-center p-0.5 group-hover:rotate-6 transition-transform overflow-hidden shrink-0">
            <Logo size={48} url={logoUrl} className="object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-lg md:text-3xl font-black tracking-tighter leading-none text-[#0a2e5c] dark:text-white">{appSettings?.appName || 'Errands'}<span className="text-primary">.</span></span>
            <span className="text-[7px] md:text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 leading-none mt-1 truncate">Coordination Network</span>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          <div className="flex items-center gap-4 xl:gap-6">
            {[
              { label: 'Services', id: 'services', page: 'services' },
              { label: 'Elite Pricing', id: 'pricing', page: 'pricing' },
              { label: 'Network Standards', id: 'about', page: 'standards' },
              { label: 'Help', id: 'footer', page: 'help' },
              { label: 'Become a Partner', id: 'pricing', highlight: true, page: 'partner' },
            ].map(item => (
              <button 
                key={item.label} 
                onClick={() => {
                  if (item.page) {
                    setActiveInfoPage(item.page as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`text-[9px] xl:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                  item.highlight ? 'text-secondary hover:text-secondary/80' : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <button 
              onClick={onLogin}
              className="px-4 py-2.5 text-[9px] xl:text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white hover:text-primary transition-colors whitespace-nowrap"
            >
              Member Login
            </button>
            <button 
              onClick={onGetStarted}
              className="px-5 xl:px-8 py-3 bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] rounded-2xl text-[9px] xl:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex lg:hidden items-center">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#0a2e5c] dark:text-white hover:text-primary transition-colors focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute top-full left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-2xl z-40 overflow-hidden flex flex-col px-6 py-6 lg:hidden"
            >
              <div className="flex flex-col gap-4 mb-6">
                {[
                  { label: 'Services', id: 'services', page: 'services' },
                  { label: 'Elite Pricing', id: 'pricing', page: 'pricing' },
                  { label: 'Network Standards', id: 'about', page: 'standards' },
                  { label: 'Help', id: 'footer', page: 'help' },
                  { label: 'Become a Partner', id: 'pricing', highlight: true, page: 'partner' },
                ].map(item => (
                  <button 
                    key={item.label} 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.page) {
                        setActiveInfoPage(item.page as any);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`text-left py-2 text-[11px] font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-900/50 transition-colors ${
                      item.highlight ? 'text-secondary font-black' : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogin();
                  }}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-center"
                >
                  Member Login
                </button>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGetStarted();
                  }}
                  className="w-full py-4 bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-[#061d3c] dark:hover:bg-slate-100 transition-colors text-center"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-12 pb-16 md:pt-16 md:pb-20 overflow-hidden">
        {/* Subtle Brand Background */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-12 xl:col-span-7"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white shadow-sm border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] mb-10">
                <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
                Kenya's Premier Task Concierge
              </div>
              <h1 className="text-6xl md:text-[92px] font-black tracking-tighter leading-[0.85] text-[#0a2e5c] dark:text-white mb-10">
                Logistics <br /> 
                <span className="text-primary italic relative">
                  Refined.
                  <svg className="absolute -bottom-2 left-0 w-full h-4 text-secondary/30 pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-300 mb-12 max-w-2xl leading-relaxed font-medium">
                The elite coordination layer for your daily life. Surgical precision for every task, from luxury document courier to lifestyle errands.
              </p>
              
              <div className="flex flex-wrap items-center gap-6 mb-16">
                <button 
                  onClick={onGetStarted}
                  className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/25 hover:scale-105 hover:-translate-y-1 transition-all flex items-center gap-4"
                >
                  Create Your Task <ArrowRight size={18} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=${i + 50}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Trusted by 15k+ Members
                  </div>
                </div>
              </div>

              {/* Service Quick-Links */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 {[
                   { label: 'Shopping', icon: <ShoppingBag size={14} /> },
                   { label: 'Laundry', icon: <Layers size={14} /> },
                   { label: 'Medicine', icon: <Heart size={14} /> },
                   { label: 'Couriers', icon: <Truck size={14} /> }
                 ].map((s, i) => (
                   <div key={i} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/40 transition-colors cursor-pointer group">
                      <div className="text-primary group-hover:scale-110 transition-transform">
                        {s.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider dark:text-white">{s.label}</span>
                   </div>
                 ))}
              </div>
            </motion.div>

            {/* Right Content - Dynamic Tracking Visual */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="col-span-1 lg:col-span-12 xl:col-span-5 relative block w-full max-w-lg mx-auto xl:max-w-none mt-12 xl:mt-0"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-[#f97316]/10 to-primary/20 blur-[100px] pointer-events-none" />
                <div className="relative bg-white dark:bg-slate-900 rounded-[4rem] p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800">
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner animate-pulse">
                                <Package className="text-[#10b981]" size={24} />
                             </div>
                             <div>
                                <p className="text-xs font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white">
                                   {trackedErrand && trackedErrand.id ? `Service Order #${trackedErrand.id.substring(0, 6).toUpperCase()}` : 'Service Order #842'}
                                </p>
                                <p className="text-[#10b981] text-[10px] font-black uppercase tracking-widest mt-1">
                                   {trackedErrand ? (
                                      trackedErrand.status === 'in_progress' ? 'In Route • Live' :
                                      trackedErrand.status === 'completed' ? 'Delivered • Arrived' :
                                      trackedErrand.status === 'assigned' ? 'Assigned • Preparing' :
                                      trackedErrand.status === 'pending' ? 'Pending • Matching' :
                                      `${trackedErrand.status?.toUpperCase() || 'ACTIVE'} • LIVE`
                                   ) : 'In Route • Live'}
                                </p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-[#0a2e5c] dark:text-white">
                                {trackedErrand ? `KSh ${Number(trackedErrand.budget || 0).toLocaleString()}` : 'KSh 1,250'}
                             </p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {trackedErrand ? `${String(trackedErrand.category || 'Express').toUpperCase()} RATE` : 'Express Rate'}
                             </p>
                          </div>
                       </div>

                       <div className="h-48 bg-slate-50 dark:bg-slate-800/50 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 relative flex flex-col items-center justify-center p-4">
                          <img src="https://picsum.photos/seed/nairobi/600/400" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay pointer-events-none" />
                          <div className="relative z-10 flex flex-col items-center gap-2">
                             <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-2xl">
                                <MapPin className="text-[#0a2e5c] dark:text-primary animate-bounce" size={24} />
                             </div>
                             {trackedErrand && (
                                <div className="px-3 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-xl shadow-md text-center max-w-[245px] animate-fade-in">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white truncate">
                                      {trackedErrand.title}
                                   </p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">
                                      📍 {trackedErrand.pickupLocation}
                                   </p>
                                </div>
                             )}
                          </div>
                       </div>

                       {/* Secure Live Tracking Timeline Overlay */}
                       {trackedErrand && (
                          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 p-5 rounded-3xl space-y-4 animate-fade-in font-sans">
                             <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Guard Tracking</span>
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-500/10">Masked & Secure</span>
                             </div>
                             
                             {/* Horizontal Timeline Tracker */}
                             <div className="grid grid-cols-4 gap-2 relative">
                                {[
                                   { label: 'Created', done: true, current: false },
                                   { 
                                     label: 'Matching', 
                                     done: ['assigned', 'review', 'completed', 'disputed'].includes(trackedErrand.status),
                                     current: ['pending', 'bidding'].includes(trackedErrand.status)
                                   },
                                   { 
                                     label: 'In Route', 
                                     done: ['completed'].includes(trackedErrand.status), 
                                     current: ['assigned', 'review'].includes(trackedErrand.status)
                                   },
                                   { 
                                     label: 'Arrived', 
                                     done: ['completed'].includes(trackedErrand.status),
                                     current: false 
                                   }
                                ].map((step, idx) => (
                                   <div key={idx} className="flex flex-col items-center text-center space-y-1.5">
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border transition-all ${
                                         step.done 
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20' 
                                            : step.current 
                                               ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20'
                                               : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                      }`}>
                                         {step.done ? '✓' : idx + 1}
                                      </div>
                                      <span className={`text-[8px] font-black uppercase tracking-widest leading-tight ${
                                         step.done ? 'text-emerald-500' : step.current ? 'text-orange-500' : 'text-slate-400'
                                      }`}>
                                         {step.label}
                                      </span>
                                   </div>
                                ))}
                             </div>

                             {/* Masked client and runner attributes to fully guarantee high-level security */}
                             <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] border-t border-slate-100 dark:border-slate-800/60 mt-2">
                                <div>
                                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Client</p>
                                   <p className="font-black text-[#0a2e5c] dark:text-white mt-0.5">{maskName(trackedErrand.requesterName)}</p>
                                </div>
                                <div>
                                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Assigned Runner</p>
                                   <p className="font-black text-[#0a2e5c] dark:text-white mt-0.5">
                                      {trackedErrand.runnerName ? maskName(trackedErrand.runnerName) : 'Searching network...'}
                                   </p>
                                </div>
                                {trackedErrand.runnerPhone && (
                                   <div className="col-span-2">
                                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Runner Hotline</p>
                                      <p className="font-black text-slate-600 dark:text-slate-300 mt-0.5">
                                         📞 {maskPhone(trackedErrand.runnerPhone)} <span className="text-[8px] text-slate-400 font-normal italic inline-block ml-1">(Log in for dialer access)</span>
                                      </p>
                                   </div>
                                )}
                                <div className="col-span-2">
                                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">Destination Path</p>
                                   <p className="font-black text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                                      {trackedErrand.pickupLocation} {trackedErrand.dropoffLocation ? ` → ${trackedErrand.dropoffLocation}` : ''}
                                    </p>
                                 </div>
                              </div>
                           </div>
                        )}

                       {/* Search Input Section */}
                       <div className="space-y-3 pt-2">
                          <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                             Enter Errand ID to Track Livestream
                          </label>
                          <form onSubmit={(e) => { e.preventDefault(); handleTrackSubmit(); }} className="relative">
                             <input 
                                type="text"
                                value={searchId}
                                onChange={(e) => {
                                   setSearchId(e.target.value);
                                   if (trackingError) setTrackingError(null);
                                }}
                                placeholder="e.g. jf89H2pS90e"
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-[11px] font-bold tracking-wider text-[#0a2e5c] dark:text-white placeholder-slate-400 border border-slate-100 dark:border-slate-800 outline-none focus:border-orange-500/40 transition-all pr-12 focus:ring-1 focus:ring-orange-500/10"
                             />
                             {searchId && (
                                <button 
                                   type="button"
                                   onClick={() => {
                                      setSearchId('');
                                      setTrackedErrand(null);
                                      setTrackingError(null);
                                   }}
                                   className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                                >
                                   Clear
                                </button>
                             )}
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                {isSearching ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Search size={16} />}
                             </div>
                          </form>
                          {trackingError && (
                             <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter transition-all">
                                ⚠️ {trackingError}
                             </p>
                          )}
                       </div>

                       <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 font-sans">
                          <div className="flex -space-x-3">
                             <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 hover:scale-110 transition-transform overflow-hidden">
                                <img src="https://i.pravatar.cc/100?u=jane" className="w-full h-full object-cover animate-fade-in" />
                             </div>
                             <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 hover:scale-110 transition-transform overflow-hidden font-mono text-[9px] flex items-center justify-center">
                                <img src="https://i.pravatar.cc/100?u=jack" className="w-full h-full object-cover animate-fade-in" />
                             </div>
                             <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-300 hover:scale-110 transition-transform overflow-hidden font-mono text-[9px] flex items-center justify-center">
                                <img src="https://i.pravatar.cc/100?u=john" className="w-full h-full object-cover animate-fade-in" />
                             </div>
                          </div>
                          <button 
                             onClick={() => handleTrackSubmit()}
                             className="px-6 py-3.5 bg-[#f97316] hover:bg-[#e05e00] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                             {isSearching ? <Loader2 size={12} className="animate-spin" /> : null}
                             Track Errand
                          </button>
                       </div>
                    </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="bg-white dark:bg-slate-900 py-6 md:py-8 px-6 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-12 sm:gap-20">
           {[
             { label: 'Verified Partners', value: '2,800+' },
             { label: 'Success Rate', value: '99.8%' },
             { label: 'Average Pickup', value: '6 Mins' },
             { label: 'Cities Covered', value: '14+' }
           ].map((s, i) => (
             <div key={i} className="text-center md:text-left">
                <p className="text-2xl font-black text-[#0a2e5c] dark:text-white tracking-tighter">{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{s.label}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Pricing and Calculator */}
      <section id="pricing" className="px-6 py-16 md:py-20 bg-[#f8fbff] dark:bg-slate-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div>
              <div className="inline-block px-4 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] mb-8">
                Pricing Standards
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-[#0a2e5c] dark:text-white leading-tight mb-8">
                Value for <br /> <span className="text-primary italic underline decoration-secondary/30">Your Time.</span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 max-w-xl leading-relaxed">
                Elite logistics shouldn't be a mystery. We operate on a transparent base structure, allowing you to estimate costs with precision before booking.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                 {[
                   { label: 'Base Pickup', val: 'KSh 40' },
                   { label: 'Delivery Step (<1km)', val: 'KSh 50' },
                   { label: 'Delivery Step (<3km)', val: 'KSh 100' },
                   { label: 'Laundry Service', val: 'KSh 70/KG' }
                 ].map((p, i) => (
                   <div key={i} className="flex flex-col gap-1 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{p.label}</span>
                      <span className="text-xl font-black text-[#0a2e5c] dark:text-white">{p.val}</span>
                   </div>
                 ))}
              </div>
              
              <div className="p-8 bg-[#0a2e5c] dark:bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl" />
                 <h4 className="text-xl font-black mb-4 relative z-10">Premium Member Benefits</h4>
                 <ul className="space-y-4 relative z-10">
                    {['Zero priority upcharges', 'Personalized concierge channel', 'Unlimited active errands'].map((l, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium opacity-90">
                         <ShieldCheck className="text-cyan-400" size={16} />
                         {l}
                      </li>
                    ))}
                 </ul>
              </div>
           </div>

           <PricingCalculator />
        </div>
      </section>

      {/* Services Context */}
      <section id="services" className="px-6 py-16 md:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-[#0a2e5c] dark:text-white mb-8">Capabilities Overview</h2>
            <p className="text-lg text-slate-500 font-medium">From the routine to the complex, our network handles 120+ unique errand categories daily.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 transition-all hover:shadow-2xl hover:shadow-primary/5 group"
              >
                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner mb-8 transition-transform group-hover:scale-110">
                  {React.cloneElement(feature.icon as React.ReactElement, { size: 28, className: 'text-primary' })}
                </div>
                <div className="inline-block px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-cyan-400 mb-6 border border-slate-100 dark:border-slate-700">
                  {feature.tag}
                </div>
                <h3 className="text-2xl font-black mb-6 text-[#0a2e5c] dark:text-white">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section Standards */}
      <section id="about" className="px-6 py-16 md:py-20 bg-[#0a2e5c] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
             <div>
                <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tighter">The <span className="text-cyan-400">Standard</span> of Trust.</h2>
                <p className="text-xl opacity-80 mb-12 leading-relaxed">We founded Errand Runner because professional life demands professional delegation. Every runner in our elite fleet undergoes multi-step verification and performance monitoring to ensure your peace of mind.</p>
                
                <div className="space-y-6">
                   {[
                     { label: 'Insurance Coverage', desc: 'Every errand insured up to KSh 50,000' },
                     { label: 'GPS Transparency', desc: 'Secure live-tracking for all movements' },
                     { label: 'Vetted Partners', desc: 'Rigorous background & social verification' }
                   ].map((item, i) => (
                     <div key={i} className="flex items-start gap-4 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                        <ShieldCheck className="text-cyan-400 mt-1 shrink-0" size={20} />
                        <div>
                           <p className="font-black text-lg mb-1">{item.label}</p>
                           <p className="text-sm opacity-70">{item.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="relative w-full max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-primary/20 blur-[100px]" />
                <div className="relative aspect-square rounded-[4rem] overflow-hidden border border-white/20 p-2 flex items-center justify-center backdrop-blur-sm">
                   <Logo size={512} url={logoUrl} className="opacity-95 saturate-[0.9] w-full h-full object-contain" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 md:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="p-16 md:p-24 bg-gradient-to-br from-[#0a2e5c] via-[#0d2a4d] to-cyan-900 text-white rounded-[4rem] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full -mr-48 -mt-48 blur-[120px]" />
            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <h2 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter">Ready for <br /> <span className="text-cyan-400 italic">Elite</span> Efficiency?</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <button 
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-12 py-5 bg-white text-[#0a2e5c] rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Join the Network
                </button>
                <div className="flex flex-wrap justify-center gap-6">
                  <button 
                    onClick={() => setActiveInfoPage('partner')}
                    className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] border-b border-white/30 py-2 hover:border-white transition-all group"
                  >
                    <Users size={18} />
                    Become a Partner
                  </button>
                  {onTrackRunnerApplication && (
                    <button 
                      onClick={onTrackRunnerApplication}
                      className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] border-b border-white/30 py-2 hover:text-cyan-400 hover:border-cyan-400 transition-all group"
                    >
                      <Activity size={18} />
                      Track My Application
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="px-6 md:px-12 py-10 md:py-12 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16 md:gap-24">
          <div className="max-w-md">
            <div className="flex items-center gap-5 mb-8">
               <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-sm">
                  <Logo size={80} url={logoUrl} />
               </div>
               <span className="text-3xl md:text-4xl font-black tracking-tighter text-[#0a2e5c] dark:text-white">Errands<span className="text-primary">.</span></span>
            </div>
            <p className="text-slate-500 font-medium text-base leading-relaxed mb-8">
              The premier task coordination fleet for those who value every minute. Reinventing the standard for lifestyle logistics.
            </p>
            <div className="flex gap-6">
               {['Twitter', 'Instagram', 'LinkedIn'].map(s => (
                 <span key={s} className="text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white cursor-pointer hover:text-primary transition-colors">{s}</span>
               ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 md:gap-24">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0a2e5c] dark:text-white mb-8">Network</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li onClick={() => setActiveInfoPage('standards')} className="hover:text-primary transition-colors cursor-pointer">Network Standards</li>
                <li onClick={() => setActiveInfoPage('services')} className="hover:text-primary transition-colors cursor-pointer">Our Services</li>
                <li onClick={() => setActiveInfoPage('pricing')} className="hover:text-primary transition-colors cursor-pointer">Elite Pricing</li>
                <li onClick={() => setActiveInfoPage('partner')} className="hover:text-primary transition-colors cursor-pointer">Become a Partner</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0a2e5c] dark:text-white mb-8">Help & Support</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-500">
                <li onClick={() => setActiveInfoPage('help')} className="hover:text-primary transition-colors cursor-pointer">Help Center</li>
                <li onClick={() => setActiveInfoPage('help')} className="hover:text-primary transition-colors cursor-pointer">Contact Us</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Terms of Service</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-6 mt-6 border-t border-slate-100 dark:border-slate-900 text-center flex flex-col items-center gap-3">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">© 2026 Errands Coordination Network</p>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
             Errandly by <a href="https://codexict.co.ke" target="_blank" rel="noopener noreferrer" className="text-primary dark:text-[#2891e2] font-black hover:underline transition-all">Codexict</a>
           </p>
        </div>
      </footer>
    </div>
  );
};
