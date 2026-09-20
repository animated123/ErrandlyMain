import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Wallet as WalletIcon
} from 'lucide-react';
import { Logo } from './Logo';
import { User, UserRole, AppSettings, AppNotification } from '../../types';

export interface SiteHeaderProps {
  currentPath: string;
  onNavigateTo: (path: string) => void;
  user: User | null;
  appSettings?: AppSettings;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  notifications?: AppNotification[];
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu whenever path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  const logoUrl = appSettings?.logoUrl || "https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png";

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigateTo(path);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/services' },
    { label: 'Elite Pricing', path: '/pricing' },
    { label: 'Network Standards', path: '/standards' },
    { label: 'Help', path: '/help' },
    { label: 'Become a Partner', path: '/runners', highlight: true },
  ];

  return (
    <header id="site-main-header" className="w-full">
      {/* Announcement Bar - Matches Home header */}
      <div className="h-12 bg-[#0a2e5c] flex items-center justify-center px-6 overflow-hidden relative">
        <motion.div 
          animate={{ x: [-800, 800] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 flex items-center gap-16"
        >
          <span>✨ NEW: Premium Laundry Concierge active in Nairobi</span>
          <span>⚡ FAST: Response times under 4 minutes</span>
          <span>📦 SMART: Weight-based pricing now active</span>
          <span>✨ NEW: Premium Laundry Concierge active in Nairobi</span>
        </motion.div>
      </div>

      {/* Navigation Bar - Matches Home header */}
      <nav className="w-full z-50 transition-all duration-500 px-4 md:px-12 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl sticky top-0 relative">
        {/* Brand / Logo */}
        <a 
          href="/" 
          onClick={(e) => handleLinkClick(e, '/')}
          className="flex items-center gap-2 md:gap-4 group cursor-pointer focus:outline-none"
          aria-label="Home"
        >
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-2xl flex items-center justify-center p-0.5 group-hover:rotate-6 transition-transform overflow-hidden shrink-0">
            <Logo size={48} url={logoUrl} className="object-contain" scale={appSettings?.logoScale} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-lg md:text-3xl font-black tracking-tighter leading-none text-[#0a2e5c] dark:text-white">
              {appSettings?.appName || 'Errands'}
              <span className="text-primary">.</span>
            </span>
            <span className="text-[7px] md:text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 leading-none mt-1 truncate">
              Coordination Network
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          <div className="flex items-center gap-4 xl:gap-6">
            {navLinks.map((item) => {
              const isCurrent = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <a 
                  key={item.label} 
                  href={item.path}
                  onClick={(e) => handleLinkClick(e, item.path)}
                  className={`text-[9px] xl:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                    isCurrent 
                      ? 'text-primary dark:text-sky-400 font-black' 
                      : item.highlight 
                      ? 'text-secondary hover:text-secondary/80' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* Desktop Right Hand Actions */}
          <div className="flex items-center gap-2.5">
            {/* Dark Mode Toggle */}
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none mr-1"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
              >
                {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
              </button>
            )}

            {user ? (
              <>
                {/* Wallet Balance */}
                <a
                  href="/profile"
                  onClick={(e) => handleLinkClick(e, '/profile')}
                  className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:scale-105 transition-transform"
                  title="Wallet Balance"
                >
                  <WalletIcon size={13} />
                  <span className="text-[10px] font-black">
                    KSh {user.walletBalance?.toLocaleString?.() ?? (user.walletBalance ?? 0)}
                  </span>
                </a>

                {/* Dashboard button */}
                <button
                  onClick={() => {
                    onNavigateTo('/dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2.5 text-[9px] xl:text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white hover:text-primary transition-colors whitespace-nowrap"
                >
                  Dashboard
                </button>

                {/* Profile Avatar */}
                <a
                  href="/profile"
                  onClick={(e) => handleLinkClick(e, '/profile')}
                  className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary transition-colors"
                  title="Account Profile"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xs">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      user.name?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                </a>

                {/* Action button: Post Errand or Find Jobs */}
                <button 
                  onClick={() => {
                    onNavigateTo(user.role === UserRole.RUNNER ? '/find' : '/post');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 xl:px-8 py-3 bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] rounded-2xl text-[9px] xl:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  {user.role === UserRole.RUNNER ? 'Find Jobs' : 'Post Errand'}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    if (onLogin) onLogin();
                    else onNavigateTo('/?login=true');
                  }}
                  className="px-4 py-2.5 text-[9px] xl:text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white hover:text-primary transition-colors whitespace-nowrap cursor-pointer"
                >
                  Member Login
                </button>
                <button 
                  onClick={onRegister || onLogin || (() => { onNavigateTo('/post'); window.scrollTo({ top: 0, behavior: 'smooth' }); })}
                  className="px-5 xl:px-8 py-3 bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] rounded-2xl text-[9px] xl:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex lg:hidden items-center gap-2">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </button>
          )}
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
              {user && (
                <div className="p-3.5 mb-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        user.name?.charAt(0)?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">{user.name}</h4>
                      <p className="text-[10px] text-slate-500 capitalize">{user.role} • KSh {user.walletBalance ?? 0}</p>
                    </div>
                  </div>
                  <a
                    href="/dashboard"
                    onClick={(e) => handleLinkClick(e, '/dashboard')}
                    className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase tracking-wider"
                  >
                    Console
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-4 mb-6">
                {[
                  { label: 'Home', path: '/' },
                  { label: 'Services', path: '/services' },
                  { label: 'Elite Pricing', path: '/pricing' },
                  { label: 'Network Standards', path: '/standards' },
                  { label: 'Help & FAQ', path: '/help' },
                  { label: 'Become a Partner', path: '/runners', highlight: true },
                ].map(item => (
                  <a 
                    key={item.label} 
                    href={item.path}
                    onClick={(e) => handleLinkClick(e, item.path)}
                    className={`text-left py-2 text-[11px] font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-900/50 transition-colors ${
                      item.highlight ? 'text-secondary font-black' : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {user ? (
                  <>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigateTo('/dashboard');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full py-3.5 text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-center"
                    >
                      Go to Dashboard
                    </button>
                    {onLogout && (
                      <button 
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50/50 dark:bg-red-950/20 rounded-2xl transition-colors text-center"
                      >
                        Sign Out
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onLogin) onLogin();
                        else onNavigateTo('/?login=true');
                      }}
                      className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-[#0a2e5c] dark:text-white bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-center cursor-pointer"
                    >
                      Member Login
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onRegister) onRegister();
                        else if (onLogin) onLogin();
                        else {
                          onNavigateTo('/post');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="w-full py-4 bg-[#0a2e5c] dark:bg-white text-white dark:text-[#0a2e5c] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-[#061d3c] dark:hover:bg-slate-100 transition-colors text-center"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};
