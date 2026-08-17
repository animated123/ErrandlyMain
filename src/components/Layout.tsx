import React from 'react';
import { Home, List, PlusCircle, Map, UserCircle, Bell, LogOut, Menu, X, Search, ShieldAlert, MapPin, ShieldCheck } from 'lucide-react';
import { User, AppNotification, UserRole, AppSettings } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import UserAvatar from './UserAvatar';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNotificationClick: (notif: AppNotification) => void;
  children: React.ReactNode;
  notifications: AppNotification[];
  connectionStatus: 'testing' | 'success' | 'failed';
  appSettings?: AppSettings;
}

export default function Layout({ 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  children, 
  notifications,
  connectionStatus,
  appSettings
}: LayoutProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'my-errands', label: 'Errands', icon: List },
    { 
      id: user?.role === UserRole.RUNNER ? 'find' : 'create', 
      label: user?.role === UserRole.RUNNER ? 'Find' : 'Post', 
      icon: user?.role === UserRole.RUNNER ? Search : PlusCircle, 
      primary: true 
    },
    { id: 'live-map', label: 'Map', icon: Map },
    { id: 'active', label: 'Profile', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans selection:bg-primary selection:text-white">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 fixed inset-y-0 left-0 z-50" id="main-nav">
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-12 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="flex items-center justify-center">
              <Logo 
                size={40} 
                url={appSettings?.logoUrl} 
                className="text-white drop-shadow-lg" 
                scale={appSettings?.logoScale}
              />
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
                    isActive 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none' 
                      : 'text-slate-400 hover:text-secondary dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
                  <span className="text-sm font-black uppercase tracking-widest leading-none">
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="ml-auto w-2 h-2 bg-white rounded-full shadow-sm"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            {user && (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-6">
                  <UserAvatar 
                    src={user.profilePhoto || user.avatar} 
                    name={user.name} 
                    className="w-12 h-12"
                    isVerified={user.role === UserRole.RUNNER}
                  />
                  <div className="min-w-0">
                    <p className="text-base font-black text-slate-900 dark:text-white truncate leading-none mb-1">{user.name}</p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{user.role}</p>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-slate-800 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-100 dark:border-rose-900/30 shadow-sm"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-4 text-slate-300 dark:text-slate-700 pt-6">
              <div className="w-1.5 h-1.5 bg-current rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">v2.5.0</p>
              <div className="w-1.5 h-1.5 bg-current rounded-full" />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col md:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-40 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
              <Logo size={32} url={appSettings?.logoUrl} className="text-white" scale={appSettings?.logoScale} />
            </div>
            <h1 className="text-xl leading-none font-black tracking-tighter text-slate-900 dark:text-white">{appSettings?.appName || 'Errands'}<span className="text-primary">.</span></h1>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <MapPin size={16} className="text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nairobi Headquarters</p>
              </div>
              {user?.isAdmin && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter border ${
                  connectionStatus === 'testing' ? 'bg-muted text-muted-foreground border-border' :
                  connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'testing' ? 'bg-slate-400 animate-pulse' :
                    connectionStatus === 'success' ? 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                    'bg-rose-600'
                  }`} />
                  {connectionStatus === 'testing' ? 'Connecting...' :
                   connectionStatus === 'success' ? 'Cloud Sync Active' :
                   'Offline Mode'}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-secondary/50 rounded-xl px-3 py-1.5 border border-border focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/20 transition-all">
              <Search size={14} className="text-muted-foreground mr-2" />
              <input type="text" placeholder="Search anything..." className="bg-transparent border-none outline-none text-sm font-bold w-36 placeholder:text-muted-foreground text-foreground" />
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative group">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-white animate-pulse shadow-sm"></span>
                )}
              </button>
              
              <div className="md:hidden">
                {user && (
                  <UserAvatar 
                    src={user.profilePhoto || user.avatar} 
                    name={user.name} 
                    className="w-9 h-9 cursor-pointer shadow-sm"
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-32 md:pb-12 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {user && (!user.phoneVerified || !user.emailVerified) && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-amber-50/80 backdrop-blur-sm border-b border-amber-100 px-8 py-4 flex items-center justify-between gap-6 m-4 md:m-8 rounded-[2rem]"
              >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-900 tracking-normal font-medium">Security Action Required</p>
                  <p className="text-sm font-bold text-amber-700/80">Verify your identity to unlock full platform capabilities.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('active')}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-black tracking-normal font-medium shadow-strong hover:bg-amber-700 transition-all active:scale-95 whitespace-nowrap"
              >
                Verify Identity
              </button>
            </motion.div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="p-4 md:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

        {/* Bottom Navigation (Mobile Only) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-md md:hidden pointer-events-none">
          <nav className="glass rounded-3xl p-1.5 flex items-center justify-between shadow-2xl border border-white/20 backdrop-blur-3xl pointer-events-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              if (item.primary) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl relative group z-30 ${
                      isActive ? 'bg-primary text-white scale-110 -translate-y-4' : 'bg-primary text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    <Icon size={28} strokeWidth={2.5} />
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 transition-all rounded-2xl z-10 ${
                    isActive ? 'text-primary' : 'text-slate-400 hover:text-secondary dark:text-slate-500 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="mobile-nav-active"
                      className="absolute inset-x-1 inset-y-0.5 bg-primary/10 dark:bg-primary/20 rounded-xl -z-10 pointer-events-none"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon size={20} className="relative z-20" />
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-all relative z-20 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
    </div>
  </div>
  );
}
