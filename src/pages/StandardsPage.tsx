import React from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Scale, 
  Clock, 
  HeartHandshake, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  PhoneCall,
  Plus
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { User, AppSettings } from '../../types';

interface StandardsPageProps {
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

export const StandardsPage: React.FC<StandardsPageProps> = ({
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
            <span className="text-primary">Standards & Trust</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Safety First Protocol
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-[#0a2e5c] dark:text-white tracking-tight">
                Trust, Verification & Network Standards<span className="text-primary text-sky-500">.</span>
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                We enforce strict vetting, biometrics, M-Pesa escrow protection, and continuous quality audits so you can trust every runner in your home or business.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/runners"
                onClick={(e) => { e.preventDefault(); onNavigateTo('/runners'); }}
                className="px-6 py-3.5 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Join as a Vetted Runner</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Pillars */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 flex-1">
        
        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: UserCheck,
              title: "1. 100% ID Verification",
              desc: "Every runner is verified using physical Government National ID (front and back), verified phone number, and facial matching."
            },
            {
              icon: Lock,
              title: "2. Escrow Payment Hold",
              desc: "Your M-Pesa payment is never paid out directly to the runner until you confirm that the task was completed satisfactorily."
            },
            {
              icon: Clock,
              title: "3. Live GPS Telemetry",
              desc: "Follow the runner's location live on our interactive map with real-time transit status updates and geofencing alerts."
            },
            {
              icon: Scale,
              title: "4. Rapid Dispute Resolution",
              desc: "Dedicated Kenya-based support desk available 7 days a week to mediate disputes, review receipts, or issue refunds."
            }
          ].map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{pillar.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Detailed Verification Steps */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-sm space-y-8">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-primary">Runner Onboarding Pipeline</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              How Runners Are Screened Before First Errand
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">1</div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Document & Identity Check</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                National ID cards are validated against government registries. Proof of residence and recent utility bills or chief letters are audited.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">2</div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Police Clearance (DCI)</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Priority status is given to runners holding a valid Certificate of Good Conduct from the Directorate of Criminal Investigations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">3</div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">Trial Runs & Quality Audits</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                New runners complete initial supervised errands. Any runner falling below a 4.5/5.0 star rating undergoes re-training or suspension.
              </p>
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <span>For Errand Posters & Clients</span>
            </h3>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-black">•</span>
                <span>Provide exact pickup and delivery instructions with landmarks or Google Maps pins.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-black">•</span>
                <span>Release escrow funds promptly once the delivery or task is confirmed intact.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-black">•</span>
                <span>Maintain professional, respectful communication in the in-app chat at all times.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-black">•</span>
                <span>Never ask runners to transport prohibited, hazardous, or illegal substances.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} />
              <span>For Runners & Couriers</span>
            </h3>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-primary font-black">•</span>
                <span>Upload photographic evidence and itemized receipts for all shopping errands.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-black">•</span>
                <span>Keep GPS enabled during active errands to provide transparent transit telemetry.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-black">•</span>
                <span>Honor placed bids and communicate immediately if unavoidable delays occur.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-black">•</span>
                <span>Handle all goods, laundry, and documents with care and confidentiality.</span>
              </li>
            </ul>
          </div>
        </section>

      </main>

      <SiteFooter onNavigateTo={onNavigateTo} appSettings={appSettings} />
    </div>
  );
};
