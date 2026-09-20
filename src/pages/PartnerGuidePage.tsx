import React from 'react';
import { 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  Award, 
  CheckCircle, 
  ArrowRight, 
  CheckCircle2,
  Smartphone,
  ChevronRight,
  Plus
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { User, AppSettings } from '../../types';

interface PartnerGuidePageProps {
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

export const PartnerGuidePage: React.FC<PartnerGuidePageProps> = ({
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
            <span className="text-primary">Become a Runner</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Earn On Your Own Schedule
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-[#0a2e5c] dark:text-white tracking-tight">
                Run Errands, Earn Daily, Be Your Own Boss<span className="text-primary text-sky-500">.</span>
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Join Kenya's top logistics and personal assistance network. Top runners earn KSh 1,500 to KSh 4,000+ daily with instant M-Pesa payouts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/application-runner"
                onClick={(e) => { e.preventDefault(); onNavigateTo('/application-runner'); }}
                className="px-6 py-3.5 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Start Application</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 flex-1">
        
        {/* Earnings KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">KSh 35,000 - 80,000+</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Average Monthly Take-Home</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">100% Flexible</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Choose When & Where You Run</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">Instant M-Pesa</div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Withdraw Earnings Immediately</p>
          </div>
        </div>

        {/* What You Need to Get Started */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-sm space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-primary">Onboarding Criteria</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Runner Requirements & Gear
            </h2>
            <p className="text-sm text-slate-500 font-medium">Simple prerequisites to ensure safety and quality across our network.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "1. National ID",
                desc: "Valid Kenyan National ID card (or Alien ID / Work Permit). Must be 18 years or older."
              },
              {
                title: "2. Smartphone & GPS",
                desc: "An Android or iPhone with internet connection, camera for receipt uploads, and GPS enabled."
              },
              {
                title: "3. Registered M-Pesa",
                desc: "Active Safaricom M-Pesa account in your legal name for instant task payouts."
              },
              {
                title: "4. Clean Background",
                desc: "Certificate of Good Conduct or police clearance letter demonstrating zero criminal record."
              }
            ].map((req, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{req.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{req.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 Step Application Pipeline */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Three Steps to Start Earning
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white text-sm font-black flex items-center justify-center">1</div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Submit Online Form</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Upload your ID photo, proof of address, and select your preferred errand categories.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white text-sm font-black flex items-center justify-center">2</div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Quick Review (24 hrs)</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Our verification team audits your credentials. You receive an SMS notification once approved.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white text-sm font-black flex items-center justify-center">3</div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Browse Errands & Bid</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Open the live runner console, accept tasks in your area, fulfill requests, and cash out daily.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-[#0a2e5c] to-sky-900 text-white p-8 md:p-12 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight">Ready to Start Running Errands?</h3>
            <p className="text-sm text-slate-300 font-medium">Takes less than 5 minutes to submit your runner credentials.</p>
          </div>
          <a
            href="/application-runner"
            onClick={(e) => { e.preventDefault(); onNavigateTo('/application-runner'); }}
            className="px-8 py-4 bg-sky-400 hover:bg-sky-300 text-[#0a2e5c] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 shrink-0"
          >
            Apply as a Runner
          </a>
        </section>

      </main>

      <SiteFooter onNavigateTo={onNavigateTo} appSettings={appSettings} />
    </div>
  );
};
