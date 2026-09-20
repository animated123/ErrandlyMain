import React, { useState } from 'react';
import { 
  DollarSign, 
  Calculator, 
  Check, 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  Package, 
  ShoppingBag, 
  Layers, 
  Truck,
  Plus
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { User, AppSettings } from '../../types';

interface PricingPageProps {
  currentPath: string;
  onNavigateTo: (path: string) => void;
  user: User | null;
  appSettings?: AppSettings;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentPath,
  onNavigateTo,
  user,
  appSettings,
  isDarkMode,
  onToggleDarkMode,
  onLogin,
  onRegister,
  onLogout
}) => {
  // Calculator state
  const [distance, setDistance] = useState(5);
  const [urgency, setUrgency] = useState<'normal' | 'priority' | 'urgent'>('normal');
  const [service, setService] = useState<'general' | 'shopping' | 'laundry' | 'delivery'>('general');
  const [weight, setWeight] = useState(3);
  const [shopValue, setShopValue] = useState(1500);

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
    serviceFee = Math.round(shopValue * 0.05);
  } else if (service === 'delivery') {
    serviceFee = 50;
  }

  const calculatedTotal = Math.round((basePickup + distanceFee + serviceFee) * multipliers[urgency]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <SiteHeader 
        currentPath={currentPath}
        onNavigateTo={onNavigateTo}
        user={user}
        appSettings={appSettings}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
      />

      {/* Hero Breadcrumb Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <a 
              href="/" 
              onClick={(e) => { e.preventDefault(); onNavigateTo('/'); }}
              className="hover:text-primary transition-colors"
            >
              Home
            </a>
            <span>/</span>
            <span className="text-primary">Pricing</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Transparent Kenyan Rates
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-[#0a2e5c] dark:text-white tracking-tight">
                Honest, Fair Pricing with Zero Hidden Fees<span className="text-primary text-sky-500">.</span>
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Calculate your errand cost upfront. Runners place competitive bids or accept standard transparent rates. Every transaction is held in safe M-Pesa escrow.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/post"
                onClick={(e) => { e.preventDefault(); onNavigateTo('/post'); }}
                className="px-6 py-3.5 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} />
                <span>Post an Errand</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Interactive Estimator & Breakdown */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 flex-1">
        
        {/* Estimator Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Interactive Controls */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-8">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-primary">Interactive Estimator</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Customize Your Errand Parameters
              </h2>
            </div>

            {/* Category Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                1. Select Errand Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'general', label: 'General', icon: Package },
                  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
                  { id: 'laundry', label: 'Laundry', icon: Layers },
                  { id: 'delivery', label: 'Delivery', icon: Truck },
                ].map((s) => {
                  const Icon = s.icon;
                  const isSel = service === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setService(s.id as any)}
                      className={`p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-2 ${
                        isSel
                          ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/40'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Distance Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  2. Travel Distance
                </label>
                <span className="text-sm font-black text-primary">{distance} Kilometers</span>
              </div>
              <input 
                type="range"
                min="1"
                max="40"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>1 KM (Neighborhood)</span>
                <span>20 KM</span>
                <span>40 KM (Cross-county)</span>
              </div>
            </div>

            {/* Conditional Fields */}
            {service === 'laundry' && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Laundry Weight (KG)</label>
                  <span className="text-sm font-black text-primary">{weight} KG</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="15"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}

            {service === 'shopping' && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Estimated Shopping Bill</label>
                  <span className="text-sm font-black text-primary">KSh {shopValue.toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="500"
                  max="10000"
                  step="250"
                  value={shopValue}
                  onChange={(e) => setShopValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}

            {/* Urgency */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                3. Urgency / Priority
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'normal', label: 'Standard', desc: 'Within 2-4 hrs' },
                  { id: 'priority', label: 'Priority', desc: 'Within 1 hr' },
                  { id: 'urgent', label: 'Rush Express', desc: 'Immediate (<30m)' },
                ].map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setUrgency(u.id as any)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      urgency === u.id
                        ? 'bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] border-[#0a2e5c] dark:border-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-black uppercase">{u.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 font-medium">{u.desc}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right: Pricing Breakdown Summary */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#0a2e5c] to-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">Live Breakdown</span>
              <h3 className="text-2xl font-black tracking-tight">Errand Cost Estimate</h3>
            </div>

            <div className="space-y-3 divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-300">Base Dispatch Fee</span>
                <span className="font-bold">KSh {basePickup}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-300">Distance Fee ({distance} km)</span>
                <span className="font-bold">KSh {distanceFee}</span>
              </div>
              {serviceFee > 0 && (
                <div className="flex items-center justify-between pt-3">
                  <span className="text-slate-300">Category Service Fee</span>
                  <span className="font-bold">KSh {serviceFee}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-300">Urgency Multiplier</span>
                <span className="font-bold">{multipliers[urgency]}x</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/20">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Estimated Cost</div>
              <div className="text-4xl sm:text-5xl font-black text-sky-400 mt-1">
                KSh {calculatedTotal.toLocaleString()}
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Subject to runner availability and custom bidding on specialized errands.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/post"
                onClick={(e) => { e.preventDefault(); onNavigateTo('/post'); }}
                className="w-full py-4 bg-sky-400 hover:bg-sky-300 text-[#0a2e5c] rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <span>Book With This Estimate</span>
                <ArrowRight size={16} />
              </a>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Safe M-Pesa Escrow: Runner only gets paid after your confirmation.</span>
            </div>
          </div>

        </div>

        {/* Transparent Rates Grid */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Standard Errand Reference Rates
            </h3>
            <p className="text-sm text-slate-500 font-medium">Clear benchmark prices so you always know what to expect.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Town Document & Parcel Delivery",
                fee: "KSh 150 - 300",
                desc: "Pick-up and direct hand-delivery of letters, invoices, and small boxes across town.",
                features: ["Real-time GPS tracking", "Digital receipt confirmation", "15-min runner dispatch"]
              },
              {
                title: "Mama Fua Full Laundry Run",
                fee: "KSh 400 - 800",
                desc: "Professional washing, sun-drying, and delicate hand-folding of household clothes.",
                features: ["Vetted laundry specialists", "Detergent & care options", "Ironing on request"]
              },
              {
                title: "Fresh Market Produce Run",
                fee: "KSh 300 - 600",
                desc: "Expert bargaining and wholesale sourcing directly from Marikiti or Gikomba.",
                features: ["Live WhatsApp verification", "Freshness quality check", "Itemized cost breakdown"]
              },
              {
                title: "Queue Standing & Bureaucracy",
                fee: "KSh 350 - 700",
                desc: "Runner stands in line at Huduma Centre, KRA, NTSA, or private service centers.",
                features: ["Real-time queue updates", "Document handover", "No missed appointments"]
              },
              {
                title: "Chemist & Medicine Delivery",
                fee: "KSh 150 - 250",
                desc: "Urgent prescription pickup from licensed pharmacies directly to your doorstep.",
                features: ["Tamper-evident packaging", "Verified pharmacy receipts", "Confidential delivery"]
              },
              {
                title: "Saka Keja (House Hunting Scout)",
                fee: "KSh 500 - 1,500",
                desc: "Field scout visits vacant units, captures video walk-throughs, and checks water pressure.",
                features: ["HD video & photos", "Caretaker contacts", "Neighborhood safety overview"]
              },
            ].map((plan, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-slate-900 dark:text-white">{plan.title}</h4>
                  </div>
                  <div className="text-2xl font-black text-primary">{plan.fee}</div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{plan.desc}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {plan.features.map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      <SiteFooter onNavigateTo={onNavigateTo} appSettings={appSettings} />
    </div>
  );
};
