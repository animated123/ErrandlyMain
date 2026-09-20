import React, { useState } from 'react';
import { 
  Truck, 
  Sparkles, 
  ShoppingBag, 
  Layers, 
  Home, 
  Car, 
  ShieldCheck, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  ArrowRight,
  Search,
  Plus
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { User, AppSettings } from '../../types';

interface ServicesPageProps {
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

export const ServicesPage: React.FC<ServicesPageProps> = ({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    {
      id: "logistics",
      title: "Logistics & Delivery",
      icon: Truck,
      desc: "Fast, tracked urban parcel and courier handling.",
      items: [
        { label: "Express Couriers", desc: "Same-day document and package delivery across Nairobi with 15-minute dispatch.", price: "From KSh 150" },
        { label: "High-Value Escrow Courier", desc: "Safe custody and verified handover for electronics, passports, and sensitive items.", price: "From KSh 350" },
        { label: "Inter-Estate Transit", desc: "Scheduled parcel drops connecting residential estates and satellite towns.", price: "From KSh 250" },
        { label: "Market Wholesales Run", desc: "Fresh produce sourcing from Gikomba, Marikiti, Muthurwa & City Market.", price: "From KSh 300" }
      ]
    },
    {
      id: "lifestyle",
      title: "Lifestyle & Home Concierge",
      icon: Sparkles,
      desc: "Household errands and trusted domestic support.",
      items: [
        { label: "Mama Fua Laundry Service", desc: "Vetted laundry experts for wash, dry, fold, and delicate fabric care.", price: "From KSh 400" },
        { label: "Supermarket & Grocery Shopping", desc: "Direct shopping from Carrefour, Naivas, or Quickmart with itemized receipts.", price: "From KSh 200" },
        { label: "Chemist & Pharmacy Run", desc: "Prompt medicine pickup and prescription delivery straight to your door.", price: "From KSh 150" },
        { label: "Gas Cylinder Refill", desc: "Safe pickup and refill exchange for 6kg and 13kg gas cylinders.", price: "From KSh 200" }
      ]
    },
    {
      id: "errands",
      title: "Town & Administrative Tasks",
      icon: ShoppingBag,
      desc: "Skip long queues and government building visits.",
      items: [
        { label: "Government Bureaucracy & Queues", desc: "Queue-holding and document submission at Huduma Centre, NTSA, and Ardhi House.", price: "From KSh 350" },
        { label: "Bank & Cheque Drops", desc: "Secure document deliveries and bank deposits with real-time photo confirmation.", price: "From KSh 300" },
        { label: "Office Supplies & Printing", desc: "Lamination, architectural blueprints, and high-volume document binding.", price: "From KSh 200" },
        { label: "Saka Keja (House Hunting)", desc: "Physical property scouting, video tours, neighborhood inspection, and caretaker interviews.", price: "From KSh 500" }
      ]
    }
  ];

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      (selectedCategory === 'all' || cat.id === selectedCategory) &&
      (item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
       item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(cat => cat.items.length > 0);

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
            <span className="text-primary">Services</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Verified Logistics Portfolio
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-[#0a2e5c] dark:text-white tracking-tight">
                Our Services & Errand Network<span className="text-primary text-sky-500">.</span>
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Delegate your daily errands to trusted, background-checked Kenyan runners. From market shopping to express delivery, we coordinate everything seamlessly.
              </p>
            </div>

            {/* Quick Action Link */}
            <div className="flex items-center gap-3">
              <a
                href="/post"
                onClick={(e) => { e.preventDefault(); onNavigateTo('/post'); }}
                className="px-6 py-3.5 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} />
                <span>Post an Errand Now</span>
              </a>
              <a
                href="/pricing"
                onClick={(e) => { e.preventDefault(); onNavigateTo('/pricing'); }}
                className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Check Pricing
              </a>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="pt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search errands (e.g. Mama Fua, Gikomba, Gas refill, Documents)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'All Services' },
                { id: 'logistics', label: 'Logistics' },
                { id: 'lifestyle', label: 'Lifestyle' },
                { id: 'errands', label: 'Town Errands' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c]'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 flex-1">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.id} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {category.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{category.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {category.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {item.label}
                        </h3>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {item.price}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span>Background Verified Runners</span>
                      </div>
                      <a
                        href="/post"
                        onClick={(e) => { e.preventDefault(); onNavigateTo('/post'); }}
                        className="text-xs font-black uppercase tracking-wider text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                      >
                        <span>Book Errand</span>
                        <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Guarantees Strip */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">ID & Police Cleared</h4>
              <p className="text-xs text-slate-500">Every runner undergoes biometric national ID and Certificate of Good Conduct checks.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Real-Time GPS Tracking</h4>
              <p className="text-xs text-slate-500">Live telemetry and step-by-step receipt photo auditing on every delivery run.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Layers size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">M-Pesa Escrow Protection</h4>
              <p className="text-xs text-slate-500">Funds are held safely in escrow and released only upon satisfactory errand completion.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter onNavigateTo={onNavigateTo} appSettings={appSettings} />
    </div>
  );
};
