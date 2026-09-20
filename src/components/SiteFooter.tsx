import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Heart,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Logo } from './Logo';
import { AppSettings } from '../../types';

export interface SiteFooterProps {
  onNavigateTo: (path: string) => void;
  appSettings?: AppSettings;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({ onNavigateTo, appSettings }) => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigateTo(path);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer id="site-main-footer" className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Col 1: Brand & Identity */}
          <div className="lg:col-span-2 space-y-4">
            <a 
              href="/"
              onClick={(e) => handleLinkClick(e, '/')}
              className="flex items-center gap-3 group focus:outline-none"
              aria-label="ErrandRunner Home"
            >
              <Logo 
                size={36} 
                url={appSettings?.logoUrl} 
                className="group-hover:scale-105 transition-transform" 
                scale={appSettings?.logoScale}
              />
              <span className="text-xl font-black tracking-tight text-[#0a2e5c] dark:text-white">
                {appSettings?.appName || 'ErrandRunner'}
                <span className="text-primary text-sky-500">.</span>
              </span>
            </a>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-sm">
              Kenya's premier on-demand errand and logistics coordination network. Connecting busy households, businesses, and professionals with trusted, background-checked local runners in real time.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={13} /> Verified Backgrounds
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                <Truck size={13} /> Real-Time GPS
              </span>
            </div>
          </div>

          {/* Col 2: Services & Errands */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white">
              Logistics Network
            </h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <a 
                  href="/services" 
                  onClick={(e) => handleLinkClick(e, '/services')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  All Services
                </a>
              </li>
              <li>
                <a 
                  href="/pricing" 
                  onClick={(e) => handleLinkClick(e, '/pricing')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Pricing Calculator
                </a>
              </li>
              <li>
                <a 
                  href="/menu" 
                  onClick={(e) => handleLinkClick(e, '/menu')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Service Catalogue
                </a>
              </li>
              <li>
                <a 
                  href="/map" 
                  onClick={(e) => handleLinkClick(e, '/map')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Live Errands Map
                </a>
              </li>
              <li>
                <a 
                  href="/post" 
                  onClick={(e) => handleLinkClick(e, '/post')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Post an Errand
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Earn & Work */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white">
              Earn With Us
            </h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <a 
                  href="/runners" 
                  onClick={(e) => handleLinkClick(e, '/runners')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Become a Runner
                </a>
              </li>
              <li>
                <a 
                  href="/application-runner" 
                  onClick={(e) => handleLinkClick(e, '/application-runner')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Runner Application
                </a>
              </li>
              <li>
                <a 
                  href="/find" 
                  onClick={(e) => handleLinkClick(e, '/find')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Browse Open Errands
                </a>
              </li>
              <li>
                <a 
                  href="/standards" 
                  onClick={(e) => handleLinkClick(e, '/standards')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Quality & Safety
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <a 
                  href="/help" 
                  onClick={(e) => handleLinkClick(e, '/help')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Help Center & FAQ
                </a>
              </li>
              <li>
                <a 
                  href="/support" 
                  onClick={(e) => handleLinkClick(e, '/support')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Support Desk
                </a>
              </li>
              <li>
                <a 
                  href="/privacy" 
                  onClick={(e) => handleLinkClick(e, '/privacy')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="/terms" 
                  onClick={(e) => handleLinkClick(e, '/terms')}
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight size={12} className="text-slate-400" />
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar with Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-500">
            © {currentYear} {appSettings?.appName || 'ErrandRunner'} Coordination Network. All rights reserved. Registered in Kenya.
          </p>
          <div className="flex items-center gap-6">
            <a 
              href="/privacy" 
              onClick={(e) => handleLinkClick(e, '/privacy')}
              className="text-slate-500 hover:text-primary transition-colors"
            >
              Data Protection
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a 
              href="/terms" 
              onClick={(e) => handleLinkClick(e, '/terms')}
              className="text-slate-500 hover:text-primary transition-colors"
            >
              Operating Terms
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a 
              href="/help" 
              onClick={(e) => handleLinkClick(e, '/help')}
              className="text-slate-500 hover:text-primary transition-colors"
            >
              Contact
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
