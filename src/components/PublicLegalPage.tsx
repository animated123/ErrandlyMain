import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ShieldCheck, FileText, Printer, ExternalLink } from 'lucide-react';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../constants/legal';
import { AppSettings } from '../../types';

interface PublicLegalPageProps {
  type: 'privacy' | 'terms';
  appSettings?: AppSettings;
  onBackToHome: () => void;
  onNavigateTo: (path: string) => void;
}

export const PublicLegalPage: React.FC<PublicLegalPageProps> = ({
  type,
  appSettings,
  onBackToHome,
  onNavigateTo
}) => {
  const isPrivacy = type === 'privacy';
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE;
  const title = isPrivacy ? 'Public Privacy Policy' : 'Public Terms of Service';
  const description = isPrivacy 
    ? 'Official Data Protection, Privacy Practices, and Information Security Policy for ErrandRunner / Errandly.'
    : 'Official User Agreement, Service Conditions, and Platform Operating Terms for ErrandRunner / Errandly.';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm font-bold"
              aria-label="Back to home"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back to Home</span>
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2 cursor-pointer" onClick={onBackToHome}>
              {appSettings?.logoUrl ? (
                <img src={appSettings.logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
              ) : (
                <span className="font-black text-lg tracking-tight text-[#0a2e5c] dark:text-white">
                  Errands<span className="text-[#2891e2]">.</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              title="Print document"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={() => onNavigateTo(isPrivacy ? '/terms' : '/privacy')}
              className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors"
            >
              Switch to {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-10 md:p-14">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-2xl ${isPrivacy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
              {isPrivacy ? <ShieldCheck size={28} /> : <FileText size={28} />}
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Legal Transparency</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h1>
            </div>
          </div>
          
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed pb-6 border-b border-slate-100 dark:border-slate-800">
            {description}
          </p>

          <div className="pt-8 text-slate-700 dark:text-slate-300 leading-relaxed markdown-body dark:prose-invert max-w-none prose prose-slate">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>Certified Platform Agreement • ErrandRunner by Codexict</p>
            <div className="flex gap-4 font-bold">
              <button 
                onClick={() => onNavigateTo('/privacy')} 
                className={`hover:text-primary transition-colors ${isPrivacy ? 'text-primary font-black underline' : ''}`}
              >
                Privacy Policy
              </button>
              <span>•</span>
              <button 
                onClick={() => onNavigateTo('/terms')} 
                className={`hover:text-primary transition-colors ${!isPrivacy ? 'text-primary font-black underline' : ''}`}
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 ErrandRunner / Errandly. All rights reserved.</p>
          <div className="flex items-center gap-6 font-semibold">
            <a 
              href="/privacy" 
              onClick={(e) => { e.preventDefault(); onNavigateTo('/privacy'); }} 
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="/terms" 
              onClick={(e) => { e.preventDefault(); onNavigateTo('/terms'); }} 
              className="hover:text-primary transition-colors"
            >
              Terms of Service
            </a>
            <a 
              href="https://codexict.co.ke" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary flex items-center gap-1 transition-colors"
            >
              Codexict <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
