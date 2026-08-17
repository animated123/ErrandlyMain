import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, DollarSign, Clock, Star, ChevronRight, CheckCircle2, AlertCircle, ArrowUpRight, FileText, MessageCircle, Activity, Zap, User, ArrowRight, Navigation, Home, Waves, ShoppingBag, Package, Car, ShoppingCart, Sparkles, MessageSquare, Share2, Check, Copy } from 'lucide-react';
import { Errand, ErrandStatus, Coordinates, ErrandCategory } from '../../types';
import { calculateDistance } from '../lib/utils';
import { generateErrandDeepLink, generateErrandWhatsAppShareUrl } from '../../services/whatsappNotificationService';

interface ErrandCardProps {
  errand: Errand;
  onClick: (errand: Errand, tab?: 'details' | 'map' | 'chat' | 'progress' | 'finish') => void;
  currentLocation: Coordinates | null;
}

export default React.memo(function ErrandCard({ errand, onClick, currentLocation }: ErrandCardProps) {
  const [copied, setCopied] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  const distance = currentLocation && errand.pickupCoordinates 
    ? calculateDistance(currentLocation, errand.pickupCoordinates) 
    : null;

  const handleMapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(errand, 'map');
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { deepLink, whatsappUrl } = generateErrandWhatsAppShareUrl(errand);
    
    // Copy deep link to clipboard seamlessly
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deepLink).catch(() => {});
    }
    
    setCopied(true);
    setShowShareTooltip(true);
    setTimeout(() => {
      setCopied(false);
      setShowShareTooltip(false);
    }, 2500);

    // Open WhatsApp in a new tab
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deepLink = generateErrandDeepLink(errand.id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deepLink).catch(() => {});
    }
    setCopied(true);
    setShowShareTooltip(true);
    setTimeout(() => {
      setCopied(false);
      setShowShareTooltip(false);
    }, 2500);
  };

  const getStatusStyles = (status: ErrandStatus) => {
    switch (status) {
      case ErrandStatus.PENDING: return 'bg-slate-100 text-slate-600 border-slate-200';
      case ErrandStatus.BIDDING: return 'bg-blue-50 text-blue-700 border-blue-200/50';
      case ErrandStatus.ASSIGNED: return 'bg-indigo-50 text-indigo-700 border-indigo-200/50';
      case ErrandStatus.IN_PROGRESS: return 'bg-amber-50 text-amber-700 border-amber-200/50';
      case ErrandStatus.REVIEW: return 'bg-purple-50 text-purple-700 border-purple-200/50';
      case ErrandStatus.COMPLETED: return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case ErrandStatus.CANCELLED: return 'bg-rose-50 text-rose-700 border-rose-200/50';
      case ErrandStatus.FAILED: return 'bg-red-50 text-red-700 border-red-200/50';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getCategoryIcon = (category: ErrandCategory) => {
    switch (category) {
      case ErrandCategory.MAMA_FUA: return Waves;
      case ErrandCategory.MARKET_SHOPPING: return ShoppingBag;
      case ErrandCategory.HOUSE_HUNTING: return Home;
      case ErrandCategory.PACKAGE_DELIVERY: return Package;
      case ErrandCategory.TOWN_SERVICE: return Car;
      case ErrandCategory.SHOPPING: return ShoppingCart;
      case ErrandCategory.GIKOMBA_STRAWS: return ShoppingBag;
      default: return Sparkles;
    }
  };

  const CategoryIcon = getCategoryIcon(errand.category);

  return (
    <motion.div 
      whileHover={{ y: -4, shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(errand)}
      className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all cursor-pointer group relative overflow-hidden w-full flex flex-col gap-3 md:gap-4"
    >
      {/* Background Category Accent - Subtle */}
      <div className="absolute -right-8 -bottom-8 text-slate-50 dark:text-slate-800/20 group-hover:text-primary/5 transition-all rotate-12 duration-500 pointer-events-none group-hover:scale-110">
        <CategoryIcon size={140} />
      </div>

      {/* Top Section: Status and Distance & Share */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(errand.status)}`}>
            {errand.status}
          </div>
          {errand.urgency && (
            <div className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${
              errand.urgency === 'Urgent' 
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900 animate-pulse'
                : errand.urgency === 'High'
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
            }`}>
              {errand.urgency === 'Urgent' && <span className="w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400 animate-ping inline-block shrink-0" />}
              {errand.urgency === 'High' && <span className="text-[9px] shrink-0">⚡</span>}
              {errand.urgency === 'Normal' && <span className="text-[9px] shrink-0">🟢</span>}
              {errand.urgency} Urgency
            </div>
          )}
          {errand.category === ErrandCategory.HOUSE_HUNTING && (
            <div className="px-2 py-0.5 md:px-2.5 md:py-1 bg-primary text-white rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-primary">
              Agent
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {distance !== null && (
            <div className="flex items-center gap-1 px-2 md:gap-1.5 md:px-3 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700">
              <Navigation size={10} className="text-primary" />
              <span className="text-[9px] md:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {distance.toFixed(1)}km
              </span>
            </div>
          )}

          {/* Quick Share Link Button */}
          <button
            onClick={handleCopyOnly}
            title="Copy Deep Link"
            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full border border-slate-200/60 dark:border-slate-700 transition-all"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-1.5 md:space-y-2 relative z-10">
        <div className="flex justify-between items-start gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-display text-slate-900 dark:text-white font-black tracking-tight group-hover:text-primary transition-colors truncate">
              {errand.title}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
              {errand.description}
            </p>
          </div>
          
          <div className="text-right shrink-0">
            <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-end gap-1">
              <span className="text-[8px] md:text-[10px] text-primary font-black uppercase tracking-widest mr-0.5">KSH</span>
              {(errand.budget || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2">
          <div className="flex items-center gap-2 truncate max-w-[200px]">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="truncate">
              {errand.category === ErrandCategory.HOUSE_HUNTING 
                ? (errand.targetEstates?.length ? errand.targetEstates.join(', ') : errand.pickupLocation)
                : errand.pickupLocation
              }
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Clock size={14} className="text-primary" />
            <span>
              {errand.createdAt && (
                new Date(errand.createdAt?.seconds ? errand.createdAt.seconds * 1000 : errand.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              )}
            </span>
          </div>
          {errand.lastMessage && (errand.status === ErrandStatus.ASSIGNED || errand.status === ErrandStatus.IN_PROGRESS || errand.status === ErrandStatus.REVIEW) && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onClick(errand, 'chat');
              }}
              className="flex items-center gap-2 w-full mt-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl text-indigo-700 dark:text-indigo-300 normal-case font-bold border border-indigo-100/50 dark:border-indigo-800/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors cursor-pointer"
            >
              <MessageSquare size={12} className="shrink-0 text-indigo-500" />
              <span className="truncate">"{errand.lastMessage}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Action Section */}
      <div className="flex items-center justify-between gap-3 relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800/50 mt-1">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-xl border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                <img src={`https://picsum.photos/seed/${i + 42}/100/100`} className="w-full h-full object-cover" alt="User" />
              </div>
            ))}
            {errand.bids && errand.bids.length > 3 && (
              <div className="w-8 h-8 rounded-xl border-2 border-white dark:border-slate-900 bg-primary flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                +{errand.bids.length - 3}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {errand.bids?.length || 0} Offers
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Share Errand via WhatsApp Button */}
          <button
            onClick={handleShareWhatsApp}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group/share ${
              copied
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white'
            }`}
            title="Share Errand via WhatsApp (Deep Link Generated)"
          >
            {copied ? (
              <>
                <Check size={13} className="shrink-0 animate-bounce" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 size={13} className="shrink-0 group-hover/share:rotate-12 transition-transform" />
                <span>Share</span>
              </>
            )}
          </button>

          {/* Active Quick Actions */}
          {(errand.status === ErrandStatus.ASSIGNED || errand.status === ErrandStatus.IN_PROGRESS || errand.status === ErrandStatus.REVIEW) && (
             <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(errand, 'chat');
                  }}
                  className="px-3 py-2 bg-primary/5 dark:bg-primary/20 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm relative flex items-center gap-2 group/btn"
                  title="Open Chat"
                >
                  <MessageCircle size={14} className="group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase">Chat</span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full border border-white dark:border-slate-900 absolute -top-0.5 -right-0.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(errand, 'progress');
                  }}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all shadow-sm flex items-center gap-2 group/prog"
                  title="View Progress"
                >
                  <Activity size={14} className="group-hover/prog:animate-pulse" />
                  <span className="text-[10px] font-black uppercase">Progress</span>
                </button>
             </div>
          )}
          
          {/* Quick Action Overlay */}
          <div className="px-4 md:px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center gap-2">
            View
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export const ErrandCardSkeleton = () => (
  <div className="bg-card text-card-foreground p-5 rounded-[2rem] border border-border shadow-soft animate-pulse w-full flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div className="w-24 h-6 bg-secondary rounded-full"></div>
      <div className="w-16 h-6 bg-muted rounded-full"></div>
    </div>
    
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div className="w-2/3 h-7 bg-secondary rounded-xl"></div>
        <div className="w-16 h-7 bg-secondary rounded-xl"></div>
      </div>
      <div className="w-full h-4 bg-muted rounded-xl"></div>
      <div className="w-3/4 h-4 bg-muted rounded-xl"></div>
      
      <div className="flex gap-4 pt-2">
        <div className="w-24 h-3 bg-muted rounded-full"></div>
        <div className="w-24 h-3 bg-muted rounded-full"></div>
      </div>
    </div>

    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
      <div className="flex -space-x-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-7 h-7 rounded-xl bg-secondary border-2 border-white"></div>
        ))}
      </div>
      <div className="w-20 h-8 bg-secondary rounded-xl"></div>
    </div>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-secondary animate-pulse rounded ${className}`}></div>
);
