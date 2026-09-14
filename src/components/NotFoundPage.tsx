import React, { useState } from 'react';
import { 
  Home, 
  ArrowLeft, 
  Compass, 
  Search, 
  Truck, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  PhoneCall,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Logo } from './Logo';
import { AppSettings } from '../../types';

interface NotFoundPageProps {
  path?: string;
  appSettings?: AppSettings;
  onBackToHome: () => void;
  onNavigateTo?: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  path = '',
  appSettings,
  onBackToHome,
  onNavigateTo = onBackToHome
}) => {
  const [searchErrandId, setSearchErrandId] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchErrandId.trim();
    if (cleanId) {
      if (typeof window !== 'undefined') {
        window.location.href = `/?errandId=${encodeURIComponent(cleanId)}`;
      } else {
        onNavigateTo(`/?errandId=${encodeURIComponent(cleanId)}`);
      }
    } else {
      onBackToHome();
    }
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      window.history.back();
    } else {
      onBackToHome();
    }
  };

  const currentYear = new Date().getFullYear();
  const appName = appSettings?.appName || 'Errands';

  return (
    <div 
      id="notfound-page-root" 
      className="min-h-screen bg-[#fcfcfd] dark:bg-[#050b15] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#2891e2] selection:text-white"
    >
      {/* Top Header */}
      <header 
        id="notfound-header" 
        className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-4 sm:px-8 py-3.5"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            id="notfound-logo-btn" 
            onClick={onBackToHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <Logo size={36} url={appSettings?.logoUrl} scale={appSettings?.logoScale} className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none text-[#0a2e5c] dark:text-white">
                {appName}<span className="text-[#2891e2]">.</span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 leading-none mt-1">
                Coordination Network
              </span>
            </div>
          </div>

          <button
            id="notfound-back-home-nav-btn"
            onClick={onBackToHome}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <Home size={14} />
            <span className="hidden sm:inline">Return to Home</span>
          </button>
        </div>
      </header>

      {/* Main 404 Hero Section */}
      <main 
        id="notfound-main-content" 
        className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center justify-center text-center"
      >
        {/* Status Badge */}
        <div 
          id="notfound-status-badge"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-400 text-[11px] font-black uppercase tracking-widest mb-6"
        >
          <Compass size={14} className="animate-spin" style={{ animationDuration: '10s' }} />
          <span>Route Disconnected • Error 404</span>
        </div>

        {/* Large 404 Typography */}
        <div 
          id="notfound-code-display" 
          className="relative select-none mb-2"
        >
          <span className="text-8xl sm:text-[140px] font-black tracking-tighter leading-none text-[#0a2e5c] dark:text-white block opacity-95">
            404
          </span>
          <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#2891e2]/10 dark:bg-[#2891e2]/20 border border-[#2891e2]/30 flex items-center justify-center text-[#2891e2]">
            <MapPin size={22} />
          </div>
        </div>

        {/* Headline */}
        <h1 
          id="notfound-heading" 
          className="text-2xl sm:text-4xl font-black text-[#0a2e5c] dark:text-white tracking-tight mb-4"
        >
          Destination Unreachable
        </h1>

        {/* Subtitle & Attempted Path Details */}
        <p 
          id="notfound-description" 
          className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed mb-4"
        >
          The resource or location you are navigating toward does not exist on our network, may have expired, or took an unexpected detour.
        </p>

        {path && path !== '/' && (
          <div 
            id="notfound-attempted-url-container"
            className="mb-8 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300 max-w-md truncate"
          >
            Requested path: <span className="text-[#2891e2] font-semibold">{path}</span>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-14 w-full max-w-md">
          <button
            id="notfound-btn-home"
            onClick={onBackToHome}
            className="flex-1 min-w-[160px] px-6 py-3.5 bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-[#082346] dark:hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Back to Home
          </button>
          <button
            id="notfound-btn-go-back"
            onClick={handleGoBack}
            className="flex-1 min-w-[160px] px-6 py-3.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Previous Page
          </button>
        </div>

        {/* Quick Search for Errand */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-12">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 mb-3 text-left">
            <Search size={14} className="text-[#2891e2]" />
            Looking for a specific task or errand?
          </div>
          <form 
            id="notfound-search-form" 
            onSubmit={handleSearchSubmit} 
            className="flex items-center gap-2"
          >
            <input
              id="notfound-search-input"
              type="text"
              value={searchErrandId}
              onChange={(e) => setSearchErrandId(e.target.value)}
              placeholder="Paste Errand ID (e.g., err_83b2...)"
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#2891e2] transition-colors"
            />
            <button
              id="notfound-search-submit"
              type="submit"
              className="px-4 py-3 bg-[#2891e2] hover:bg-[#207bc2] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shrink-0"
            >
              Track
            </button>
          </form>
        </div>

        {/* Recommended Destinations Grid */}
        <div className="w-full max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
            Helpful Destinations
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div
              id="notfound-card-post"
              onClick={onBackToHome}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2891e2]/50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2891e2] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Truck size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0a2e5c] dark:text-white group-hover:text-[#2891e2] transition-colors">
                  Post an Errand
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Get laundry, shopping, delivery, or logistics handled by verified runners.
                </p>
              </div>
            </div>

            <div
              id="notfound-card-runner"
              onClick={() => onNavigateTo('/application-runner')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2891e2]/50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0a2e5c] dark:text-white group-hover:text-[#2891e2] transition-colors">
                  Join as Runner
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Earn competitive payouts executing verified daily community tasks.
                </p>
              </div>
            </div>

            <div
              id="notfound-card-terms"
              onClick={() => onNavigateTo('/terms')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2891e2]/50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0a2e5c] dark:text-white group-hover:text-[#2891e2] transition-colors">
                  Platform Terms
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Read operating guidelines, escrow standards, and member policies.
                </p>
              </div>
            </div>

            <div
              id="notfound-card-support"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = 'mailto:Errands@codexict.co.ke?subject=Need%20Help%20Finding%20Page';
                }
              }}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#2891e2]/50 transition-all cursor-pointer group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PhoneCall size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#0a2e5c] dark:text-white group-hover:text-[#2891e2] transition-colors">
                  Contact Support
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Reach our 24/7 concierge desk for direct assistance and inquiries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Discreet Footer */}
      <footer 
        id="notfound-footer" 
        className="w-full border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-400 font-medium"
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {currentYear} {appName}. All rights reserved.</p>
          <div className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-wider">
            <button
              id="notfound-footer-privacy"
              onClick={() => onNavigateTo('/privacy')}
              className="hover:text-[#2891e2] transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              id="notfound-footer-terms"
              onClick={() => onNavigateTo('/terms')}
              className="hover:text-[#2891e2] transition-colors"
            >
              Terms of Service
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              id="notfound-footer-support"
              onClick={() => onNavigateTo('/')}
              className="hover:text-[#2891e2] transition-colors"
            >
              Home Hub
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
