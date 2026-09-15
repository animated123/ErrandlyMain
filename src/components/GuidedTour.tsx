import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PlusCircle, 
  Map as MapIcon, 
  MessageSquare, 
  Compass, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Check, 
  Sparkles,
  ExternalLink,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  targetIds: string[]; // Fallback list of element IDs to spotlight
  preferredTab?: string;
  actionLabel?: string;
  featurePoints: string[];
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ErrandRunner',
    subtitle: 'Your On-Demand Coordination & Delivery Network',
    description: 'Let\'s take a brief guided tour of your command center. We\'ll explore creating errands, tracking couriers on the live map, and getting instant support.',
    badge: 'Quick Tour',
    icon: Compass,
    targetIds: [], // Centered intro
    featurePoints: [
      'Fast, verified errand execution across Nairobi',
      'Transparent M-Pesa escrow payments',
      'Real-time fleet tracking & live dispatch'
    ]
  },
  {
    id: 'errand-creation',
    title: 'Post & Create Errands',
    subtitle: 'From groceries to laundry runs & custom town errands',
    description: 'Easily submit any errand request. Specify pickup and drop-off points, set your budget, or pick from popular categories. Verified runners receive your request and submit real-time bids.',
    badge: 'Feature 1 of 3',
    icon: PlusCircle,
    targetIds: ['tour-post-errand-btn', 'tour-nav-create', 'mobile-tour-nav-create', 'tour-errand-categories'],
    preferredTab: 'dashboard',
    actionLabel: 'Open Errand Form',
    featurePoints: [
      'Choose from laundry (Mama Fua), market shopping, and parcel delivery',
      'Set instant pricing or accept competitive courier bids',
      'Full photo proof verification for pickup & drop-off'
    ]
  },
  {
    id: 'live-map',
    title: 'Live Courier Fleet & GPS',
    subtitle: 'Track nearby runners and ongoing deliveries in real time',
    description: 'Keep tabs on our active courier network across Nairobi. When your errand is active, watch turn-by-turn route progress and estimated arrival times with live location updates.',
    badge: 'Feature 2 of 3',
    icon: MapIcon,
    targetIds: ['tour-live-map-card', 'tour-nav-map', 'mobile-tour-nav-map'],
    preferredTab: 'dashboard',
    actionLabel: 'View Live Map',
    featurePoints: [
      'Real-time courier fleet radar across city zones',
      'Turn-by-turn routing with Google Maps integration',
      'Live delivery ETA & status progression'
    ]
  },
  {
    id: 'support-chat',
    title: 'Live Support & Operations',
    subtitle: 'Instant two-way chat with dispatchers and admin team',
    description: 'Need to modify drop-off instructions, verify a payment, or ask a question? Our support team is online to assist you directly through real-time encrypted messaging.',
    badge: 'Feature 3 of 3',
    icon: MessageSquare,
    targetIds: ['tour-support-chat', 'tour-nav-support', 'tour-support-card'],
    preferredTab: 'dashboard',
    actionLabel: 'Open Support Chat',
    featurePoints: [
      'Direct chat with dispatchers and administrative staff',
      'Immediate dispute and payment assistance',
      'Accessible anytime from your header or profile'
    ]
  },
  {
    id: 'completed',
    title: 'You\'re Ready to Roll!',
    subtitle: 'Everything is set for your first errand',
    description: 'You\'re now equipped to make the most of ErrandRunner. You can revisit this guided tour at any time from the top navigation or your account settings.',
    badge: 'All Done',
    icon: Sparkles,
    targetIds: [], // Centered wrap-up
    featurePoints: [
      'Post your first task or browse vetted couriers',
      'Top up your M-Pesa balance safely',
      'Restart this tour anytime from the Help menu'
    ]
  }
];

interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function GuidedTour({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  userName = 'Member'
}: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!isOpen) return;
    const targets = currentStep.targetIds;
    if (!targets || targets.length === 0) {
      setTargetRect(null);
      return;
    }

    let foundEl: HTMLElement | null = null;
    for (const id of targets) {
      const el = document.getElementById(id);
      if (el && el.offsetParent !== null) { // visible in DOM
        foundEl = el;
        break;
      }
    }

    if (foundEl) {
      // Scroll into view if out of viewport
      const rect = foundEl.getBoundingClientRect();
      const inView = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );

      if (!inView) {
        foundEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }

      // Read fresh bounding rect after scroll attempt
      const updatedRect = foundEl.getBoundingClientRect();
      setTargetRect({
        x: updatedRect.left,
        y: updatedRect.top,
        width: updatedRect.width,
        height: updatedRect.height
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Handle step changes & tab synchronization
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.preferredTab && activeTab !== currentStep.preferredTab) {
      setActiveTab(currentStep.preferredTab);
    }

    // Give DOM a tick to update layout before measuring
    const timer = setTimeout(() => {
      measureTarget();
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, currentStep, activeTab, setActiveTab, measureTarget]);

  // Update on window resize or scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      measureTarget();
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [isOpen, measureTarget]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem('errandly_tour_completed', 'true');
    } catch {
      // Ignore localStorage errors
    }
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStepIndex, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!isLastStep) {
          handleNext();
        } else {
          handleComplete();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!isFirstStep) {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirstStep, isLastStep, handleComplete, handleNext, handlePrev]);

  const handleFeatureAction = () => {
    if (currentStep.id === 'errand-creation') {
      setActiveTab('create');
      handleComplete();
    } else if (currentStep.id === 'live-map') {
      setActiveTab('live-map');
      handleComplete();
    } else if (currentStep.id === 'support-chat') {
      setActiveTab('support-chat');
      handleComplete();
    }
  };

  if (!isOpen) return null;

  // Calculate card position relative to spotlight cutout
  const padding = 8;
  const isCentered = !targetRect;

  let cardStyle: React.CSSProperties = {};
  if (targetRect && typeof window !== 'undefined') {
    const cardWidth = Math.min(window.innerWidth - 32, 440);
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    // Mobile: keep card anchored near bottom or top
    if (windowW < 640) {
      if (targetRect.y > windowH / 2) {
        cardStyle = {
          position: 'fixed',
          top: '20px',
          left: '16px',
          right: '16px',
          maxWidth: 'calc(100vw - 32px)'
        };
      } else {
        cardStyle = {
          position: 'fixed',
          bottom: '20px',
          left: '16px',
          right: '16px',
          maxWidth: 'calc(100vw - 32px)'
        };
      }
    } else {
      // Desktop: place card intelligently below or above the target
      const spaceBelow = windowH - (targetRect.y + targetRect.height + padding * 2);
      const spaceAbove = targetRect.y - padding;

      let topPos: number;
      if (spaceBelow > 380 || spaceBelow >= spaceAbove) {
        topPos = targetRect.y + targetRect.height + padding + 14;
      } else {
        topPos = Math.max(20, targetRect.y - padding - 360);
      }

      let leftPos = targetRect.x + targetRect.width / 2 - cardWidth / 2;
      leftPos = Math.max(16, Math.min(windowW - cardWidth - 16, leftPos));

      cardStyle = {
        position: 'fixed',
        top: `${topPos}px`,
        left: `${leftPos}px`,
        width: `${cardWidth}px`
      };
    }
  }

  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      <div 
        id="getting-started-guided-tour"
        className="fixed inset-0 z-[9999] overflow-hidden select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
      >
        {/* Light Overlay Backdrop with Cutout Spotlight */}
        <svg 
          className="fixed inset-0 w-full h-full pointer-events-auto transition-all duration-300"
          style={{ width: '100vw', height: '100vh' }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              {/* White background: overlay opacity applies here */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black rectangle: crystal clear cutout window around target */}
              {targetRect && (
                <rect
                  x={Math.max(0, targetRect.x - padding)}
                  y={Math.max(0, targetRect.y - padding)}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="16"
                  ry="16"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          {/* Refined light overlay mask */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(241, 245, 249, 0.88)"
            mask="url(#tour-spotlight-mask)"
            className="dark:hidden transition-all duration-300"
          />
          {/* Subtle dark mode support for the light overlay scrim */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.82)"
            mask="url(#tour-spotlight-mask)"
            className="hidden dark:block transition-all duration-300"
          />
        </svg>

        {/* Highlight Ring & Pulsing Pin over target */}
        {targetRect && (
          <motion.div
            layoutId="tour-highlight-box"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed pointer-events-none rounded-2xl ring-4 ring-primary/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-xl z-[10000]"
            style={{
              top: targetRect.y - padding,
              left: targetRect.x - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2
            }}
          >
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
            </span>
          </motion.div>
        )}

        {/* Modal / Popover Tooltip Card */}
        <div 
          className={`fixed z-[10001] pointer-events-auto ${
            isCentered 
              ? 'inset-0 flex items-center justify-center p-4' 
              : ''
          }`}
          style={isCentered ? {} : cardStyle}
        >
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-7 relative overflow-hidden backdrop-blur-md"
          >
            {/* Top Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-xs">
                  <StepIcon size={20} />
                </div>
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {currentStep.badge}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                    Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                  </p>
                </div>
              </div>

              <button
                id="tour-close-btn"
                onClick={handleComplete}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Exit Tour"
                aria-label="Exit Guided Tour"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1 mb-3">
              <h2 id="tour-step-title" className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentStep.id === 'welcome' 
                  ? `Welcome, ${userName.split(' ')[0]}!` 
                  : currentStep.title}
              </h2>
              <p className="text-xs font-bold text-primary">
                {currentStep.subtitle}
              </p>
            </div>

            {/* Body Description */}
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {currentStep.description}
            </p>

            {/* Key Value Bullets */}
            <div className="space-y-2 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {currentStep.featurePoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span className="font-semibold leading-tight">{point}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons & Navigation */}
            <div className="space-y-3">
              {/* Optional direct action button for the highlighted feature */}
              {currentStep.actionLabel && (
                <button
                  id="tour-feature-action-btn"
                  onClick={handleFeatureAction}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span>{currentStep.actionLabel}</span>
                  <ExternalLink size={14} />
                </button>
              )}

              {/* Progress dots & Controls */}
              <div className="flex items-center justify-between pt-1">
                {/* Step Dots */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {TOUR_STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`transition-all rounded-full ${
                        idx === currentStepIndex
                          ? 'w-6 h-2 bg-primary'
                          : 'w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                      }`}
                      aria-label={`Jump to tour step ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Back / Next / Finish Controls */}
                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <button
                      id="tour-prev-btn"
                      onClick={handlePrev}
                      className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>
                  )}

                  <button
                    id="tour-next-btn"
                    onClick={handleNext}
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 active:scale-95"
                  >
                    <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Keyboard shortcut tip */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <HelpCircle size={12} /> Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">Esc</kbd> to skip
              </span>
              <button 
                onClick={handleComplete} 
                className="hover:underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Skip Tour
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
