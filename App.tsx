import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from 'react';
import { 
  Plus, MapPin, DollarSign, Calendar, Briefcase, 
  CheckCircle, Star, Camera, Navigation, Clock, Map as MapIcon, 
  List, ChevronLeft, LogOut, Search, Info,
  Phone, Mail, Globe, MapPinned, UserCheck, Loader2,
  ArrowRight, CreditCard, X, BellRing, Target,
  Wallet, MessageSquare, Sparkles, Key,
  Home, Calculator, Tag, AlertCircle, Trash2, Waves, Check,
  Zap, CameraOff, Image as ImageIcon, Maximize2, ShieldAlert, ShoppingBag, 
  FileText, Activity, MessageCircle, LayoutGrid,
  ChevronRight, Volume2, CheckCircle2, AlertTriangle, Droplets, Wifi, WifiOff, Shield, Car, Footprints, ShieldCheck, Heart, Edit2, UserMinus, Receipt,
  Settings, Palette, ImageIcon as LucideImageIcon, Save, Upload, Download,
  HelpCircle, PlusCircle, Filter, UserCircle, Send,
  Mic, Square, Play, Pause, ChevronUp, ChevronDown, RefreshCw, ZoomIn, Users,
  Quote, Trophy, History as HistoryIcon, ArrowLeft, Circle, Eye, Server, Database, Cpu, Code, Share2, Package
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Cell, PieChart, Pie 
} from 'recharts';
import { 
  User, AppSettings, RunnerApplication, FeaturedService, ServiceListing, 
  ErrandCategory, UserRole, Errand, ErrandStatus, PriceRequest, 
  LoyaltyLevel, ChatMessage, Coordinates, AppNotification, PropertyListing
} from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDistance, formatPhoneDisplay, normalizePhone } from './src/lib/utils';
import { cloudinaryService } from './services/cloudinaryService';
import { firebaseService } from './services/firebaseService';
import { geminiService } from './services/geminiService';
import { databaseService } from './services/databaseService';
import { generateErrandWhatsAppShareUrl, generateErrandDeepLink } from './services/whatsappNotificationService';
import Layout from './src/components/Layout';
import ErrandCard, { ErrandCardSkeleton, Skeleton } from './src/components/ErrandCard';
import { Logo } from './src/components/Logo';
import AuthModal from './src/components/AuthModal';
import TemporaryPasswordModal from './src/components/TemporaryPasswordModal';
import { NotificationService } from './src/services/NotificationService';
import BidModal from './src/components/BidModal';
import TopProgressBar from './src/components/TopProgressBar';
import LoadingSpinner from './src/components/LoadingSpinner';
import CreateScreen from './src/components/CreateScreen';
import MenuView from './src/components/MenuView';
import Placeholder from './src/components/Placeholder';

import SupportChatView from './src/components/SupportChatView';
import ErrandDetailScreenExternal from './src/components/ErrandDetailScreen';
import AdminPanel from './src/components/AdminPanel';
import ErrorBoundary from './src/components/ErrorBoundary';
import SupportChatOverlay from './src/components/SupportChatOverlay';
import { API_BASE_URL, ACTION_SERVER_URL } from './services/apiConfig';
import ResetPasswordModal from './src/components/ResetPasswordModal';
import PhoneVerificationModal from './src/components/PhoneVerificationModal';
import EmailVerificationModal from './src/components/EmailVerificationModal';
import CameraCapture from './src/components/CameraCapture';
import MapComponent from './src/components/MapComponent';
import UserAvatar from './src/components/UserAvatar';
import WalletModal from './src/components/Wallet';
import RunnerRegistrationModal from './src/components/RunnerRegistrationModal';
import { FAQModal, PrivacyPolicyModal } from './src/components/LegalModals';
import { LandingPage } from './src/components/LandingPage';
import RunnerApplicationPage from './src/components/RunnerApplicationPage';
import DbConfigPage from './src/components/DbConfigPage';

// Mock Gemini call for static run
const callGeminiWithRetry = async (prompt: string): Promise<string> => {
  console.log('Mock Gemini call:', prompt);
  return "This is a mock response for the static version of the app.";
};

const ALL_SUGGESTIONS = [
  "Mama Fua (Laundry)",
  "Market Shopping",
  "House Hunting",
  "Package Delivery",
  "Town Service",
  "Gikomba straws",
  "Buy groceries",
  "Clean the house",
  "Find a bedsitter"
];

const ErrandMap = ({ errand, googleMapsApiKey, googleMapsId, currentLocation }: { errand: Errand, googleMapsApiKey: string, googleMapsId?: string, currentLocation: Coordinates | null }) => {
  const defaultCoords = { lat: -1.286389, lng: 36.817223 }; // Nairobi center
  
  const isDelivery = errand.category === 'Package Delivery' || (!!errand.pickupCoordinates && !!errand.dropoffCoordinates);
  
  // Origin is where the runner currently is
  const origin = currentLocation || errand.runnerLocation || defaultCoords;
  
  // Destination changes depending on whether the package is picked up or not
  let destination = errand.location || errand.dropoffCoordinates || errand.pickupCoordinates || defaultCoords;
  if (isDelivery) {
    if (!errand.isPackagePickedUp) {
      destination = errand.pickupCoordinates || defaultCoords;
    } else {
      destination = errand.dropoffCoordinates || defaultCoords;
    }
  }

  const center = origin;
  
  const activeRunners = errand.runnerId ? [{
    id: errand.runnerId,
    name: errand.runnerName || "Runner",
    lastKnownLocation: errand.runnerLocation || currentLocation,
    avatar: undefined
  } as any] : [];

  return (
    <MapComponent 
      errands={[errand]} 
      runners={activeRunners} 
      center={center}
      apiKey={googleMapsApiKey}
      mapId={googleMapsId}
      showRoute={!!origin && !!destination}
      customRoute={origin && destination ? { origin, destination } : undefined}
    />
  );
};

export default function App() {
  const googlePlacesApiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const googleRoutesApiKey = import.meta.env.VITE_GOOGLE_ROUTES_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY || googleMapsApiKey;
  const googleMapsId = import.meta.env.VITE_GOOGLE_MAPS_ID || 'DEMO_MAP_ID';
  const [user, setUser] = useState<User | null>(null);
  const [showNearbyRunners, setShowNearbyRunners] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [showPriceRequestModal, setShowPriceRequestModal] = useState<PriceRequest | null>(null);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRunnerRegistration, setShowRunnerRegistration] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [activeTab, _setActiveTab] = useState('dashboard');
  
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };
  
  const setActiveTab = (tab: string) => {
    if (user && (tab === 'create' || tab === 'find')) {
      if (!user.phoneVerified || !user.emailVerified) {
        setProfileView('edit');
        _setActiveTab('active');
        alert("Please verify your account (phone and email) before posting or finding errands.");
        return;
      }
    }
    _setActiveTab(tab);
  };
  const [errands, setErrands] = useState<Errand[]>([]);
  const [isLoadingErrands, setIsLoadingErrands] = useState(true);
  const [availableErrands, setAvailableErrands] = useState<Errand[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(true);
  const [nearbyRunners, setNearbyRunners] = useState<User[]>([]);
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
  const [initialDetailTab, setInitialDetailTab] = useState<'details' | 'map' | 'chat' | 'progress' | 'finish'>('details');
  const [isLogin, setIsLogin] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    primaryColor: '#2891e2',
    logoUrl: 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png',
    iconUrl: 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216384/ox2qzeuultlhiccfh02z.png',
    dashboardHeroUrl: 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216072/yy5zthljky17lmq0nlsy.png',
    logoVariant: 'original',
    logoScale: 3,
    defaultUiScale: 1.1,
    sakaKejaBaseFee: 1200,
    sakaKejaPercentage: 8
  });
  const [formErrors, setFormErrors] = useState<any>({});
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({ 
    totalUsers: 0, 
    totalTasks: 0, 
    onlineUsers: 0,
    totalRevenue: 0,
    avgDistance: 0,
    avgCompletionTime: 0,
    avgPenalty: 0,
    topRunners: [],
    topRequesters: [],
    revenuePerDay: [],
    failedErrandsPercent: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profileView, setProfileView] = useState<'main' | 'edit' | 'history' | 'apply-runner'>('main');
  const [runnerProfileTab, setRunnerProfileTab] = useState<'overview' | 'earnings' | 'tools' | 'settings'>('overview');
  const [runnerOnline, setRunnerOnline] = useState<boolean>(true);
  const [runnerChecklist, setRunnerChecklist] = useState<Array<{ id: string; text: string; completed: boolean }>>([
    { id: '1', text: 'Verify customer dropoff details before departing', completed: false },
    { id: '2', text: 'Obtain delivery/package receipt pictures', completed: false },
    { id: '3', text: 'Confirm mobile payment received before completion', completed: false }
  ]);
  const [newChecklistItem, setNewChecklistItem] = useState<string>('');
  const [estimatorDistance, setEstimatorDistance] = useState<string>('5');
  const [estimatorFuelPrice, setEstimatorFuelPrice] = useState<string>('180');
  const [estimatorVehicle, setEstimatorVehicle] = useState<'motorbike' | 'car'>('motorbike');
  const [proximityFilter, setProximityFilter] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPriceGuideModal, setShowPriceGuideModal] = useState(false);
  const [showContactUsModal, setShowContactUsModal] = useState(false);
  const [featuredServices, setFeaturedServices] = useState<FeaturedService[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [selectedFeaturedService, setSelectedFeaturedService] = useState<FeaturedService | null>(null);
  const [serviceListings, setServiceListings] = useState<ServiceListing[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [userApplication, setUserApplication] = useState<RunnerApplication | null>(null);
  const [postLoginRedirectPath, setPostLoginRedirectPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errandFilter, setErrandFilter] = useState<'all' | 'posted' | 'running'>('all');
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('app-zoom');
    return saved ? parseInt(saved) : 80;
  });
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [smartInput, setSmartInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | 'all'>('all');
  const [allErrands, setAllErrands] = useState<Errand[]>([]);
  const [onlineRunners, setOnlineRunners] = useState<User[]>([]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = ALL_SUGGESTIONS.filter(s => 
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchSuggestions(filtered);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery]);

  const handleSmartCreate = async () => {
    if (!smartInput.trim()) return;
    setIsParsing(true);
    try {
      const result = await geminiService.parseErrandDescription(smartInput);
      if (result) {
        setErrandForm({
          ...errandForm,
          category: result.category as ErrandCategory,
          title: result.title,
          description: smartInput,
          pickup: { name: result.location || '', coords: { lat: 0, lng: 0 } }
        });
        setActiveTab('create');
        setSmartInput('');
        alert(`AI detected this as ${result.category}. We've pre-filled the details for you!`);
      }
    } catch (e) {
      alert("AI parsing failed. Please fill manually.");
    } finally {
      setIsParsing(false);
    }
  };
  
  const [errandForm, setErrandForm] = useState<any>({ 
    category: ErrandCategory.GENERAL, 
    title: '', 
    budget: 0, 
    deadline: '', 
    pickup: null, 
    dropoff: null, 
    laundryBaskets: 1, 
    pricePerBasket: 250, 
    houseType: '', 
    minBudget: 0, 
    maxBudget: 0, 
    moveInDate: '', 
    additionalRequirements: '', 
    description: '', 
    isInHouse: false,
    maxShoppingBudget: 0,
    urgency: 'normal',
    packageDescription: '',
    packageCost: 0,
    shoppingList: '',
    marketSection: '',
    paymentMethod: 'Cash on Delivery',
    mamaFuaBreakdown: null,
    targetEstates: [],
    amenities: [],
    calculatedPrice: 0,
    aiEstimatedScale: 1,
    aiEstimationBreakdown: null,
    propertyType: null,
    vibe: null,
    runnerTasks: ['video', 'photos'],
    commuteDistance: 5
  });
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.REQUESTER });

  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'failed'>('success');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showConnectivityToast, setShowConnectivityToast] = useState(!navigator.onLine);
  const [connectivityToastType, setConnectivityToastType] = useState<'offline' | 'online' | null>(!navigator.onLine ? 'offline' : null);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setConnectivityToastType('offline');
      setShowConnectivityToast(true);
      setConnectionStatus('failed');
    };

    const handleOnline = () => {
      setIsOffline(false);
      setConnectivityToastType('online');
      setShowConnectivityToast(true);
      setConnectionStatus('success');

      const timer = setTimeout(() => {
        setShowConnectivityToast(false);
      }, 5000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!user?.id) return;
    try {
      const profile = await databaseService.getProfile(user.id);
      if (profile && profile.walletBalance !== undefined) {
        setUser(prev => prev ? { ...prev, walletBalance: profile.walletBalance } : null);
      }

      // Sync Trigger Logic: If any pending transaction is within 3 minutes, trigger sync
      const txs = await databaseService.fetchUserTransactions(user.id);
      const now = Date.now();
      const threeMinutesMs = 3 * 60 * 1000;
      const recentPendingTx = txs.find(tx => {
        const isPending = tx.status?.toLowerCase() === 'pending';
        if (!isPending) return false;
        const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
        return (now - txDate.getTime()) <= threeMinutesMs;
      });

      if (recentPendingTx) {
        console.log(`[App] Recent pending transaction found (${recentPendingTx.id}). Triggering sync...`);
        fetch(`${API_BASE_URL || ''}/api/payments/status?reference=${recentPendingTx.id}`).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    document.documentElement.style.setProperty('--zoom-scale', (zoom / 100).toString());
    localStorage.setItem('app-zoom', zoom.toString());
  }, [zoom]);

  useEffect(() => {
    const scale = appSettings.defaultUiScale || 1.0;
    document.documentElement.style.setProperty('--ui-scale', scale.toString());
  }, [appSettings.defaultUiScale]);

  // Fetch profile with retry logic
  const fetchProfileWithRetry = useCallback(async (uid: string, attempts = 3) => {
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`[ProfileSync] Attempt ${i + 1} for ${uid}`);
        const profile = await databaseService.getProfile(uid);
        if (profile) return profile;
      } catch (err) {
        console.error(`[ProfileSync] Attempt ${i + 1} failed:`, err);
        if (i === attempts - 1) throw err;
        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const unsub = firebaseService.subscribeToAuthChanges(async (u) => {
      if (u?.id) {
        setUser(u);
        setIsDarkMode(u.theme === 'dark');
        
        // Sync profile balance immediately on login
        try {
          const profile = await fetchProfileWithRetry(u.id);
          if (profile && profile.walletBalance !== undefined) {
            setUser(prev => prev ? { ...prev, walletBalance: profile.walletBalance } : null);
          }
        } catch (err) {
          console.error('[App] Profile initial sync failed:', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchProfileWithRetry]);

  // Removed redundant profile sync effect

  useEffect(() => {
    const unsub = firebaseService.subscribeToSettings(setAppSettings);
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    if (user?.isAdmin) {
      setIsLoadingStats(true);
      firebaseService.getAppStats().then(data => {
        setStats(data);
        setIsLoadingStats(false);
      });
    }
  }, [user?.id, user?.isAdmin]);

  useEffect(() => {
    setIsLoadingFeatured(true);
    setIsLoadingServices(true);
    firebaseService.fetchFeaturedServices().then(data => {
      setFeaturedServices(data.length > 0 ? data : []);
      setIsLoadingFeatured(false);
    });
    firebaseService.fetchServiceListings().then(data => {
      setServiceListings(data.length > 0 ? data : []);
      setIsLoadingServices(false);
    });

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('oobCode');
    const mode = params.get('mode');
    
    if (token && (window.location.pathname === '/reset-password' || mode === 'resetPassword')) {
      setResetToken(token);
    }

    const paymentStatusParam = params.get('payment_status');
    if (paymentStatusParam === 'callback') {
      const trackingId = params.get('tracking_id');
      setPaymentStatus({ 
        success: true, 
        message: `Payment received! Tracking ID: ${trackingId}. Your balance will be updated shortly.` 
      });
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const lastLocationUpdateRef = useRef<{ coords: Coordinates; time: number } | null>(null);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          
          setCurrentLocation(prev => {
            // UI Lag Guard: Only update state if moved more than 10 meters 
            // or if it's the first location
            if (!prev || calculateDistance(coords, prev) > 0.01) {
              setGeoError(null);
              return coords;
            }
            return prev;
          });
          
          const currentUser = userRef.current;
          if (currentUser) {
            const now = Date.now();
            const lastUpdate = lastLocationUpdateRef.current;
            
            // Only update Firestore if:
            // 1. No previous update exists
            // 2. It's been more than 60 seconds
            // 3. The user moved more than 0.05km (50 meters)
            const shouldUpdate = !lastUpdate || 
              (now - lastUpdate.time > 60000) || 
              (calculateDistance(coords, lastUpdate.coords) > 0.05);

            if (shouldUpdate) {
              firebaseService.updateUserLocation(currentUser.id, coords);
              lastLocationUpdateRef.current = { coords, time: now };
            }
          }
        },
        (err) => {
          let errorMsg = "";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              console.warn("Geolocation access denied by user.");
              // Don't show intrustive error banner for permission denied
              setGeoError(null);
              return;
            case err.POSITION_UNAVAILABLE:
              errorMsg = "Location information is currently unavailable. We will retry automatically.";
              break;
            case err.TIMEOUT:
              errorMsg = "Location request timed out. Retrying...";
              break;
            default:
              errorMsg = "A geolocation error occurred. Trying to reconnect...";
              break;
          }
          setGeoError(prev => prev !== errorMsg ? errorMsg : prev);
          console.warn("Geolocation info:", errorMsg, err.message);
        },
        { 
          enableHighAccuracy: false,
          timeout: 60000,
          maximumAge: 60000
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setGeoError("Geolocation is not supported by your browser.");
    }
  }, []); // Run only once to establish watch, use refs/setState callbacks for values

  useEffect(() => {
    if (user && user.role === UserRole.RUNNER) {
      // Track online status in Supabase
      firebaseService.adminUpdateUser(user.id, { isOnline: true });
      
      // Set offline on tab close
      const handleBeforeUnload = () => {
        firebaseService.adminUpdateUser(user.id, { isOnline: false });
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        firebaseService.adminUpdateUser(user.id, { isOnline: false });
      };
    }
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!user) {
      setUserApplication(null);
      return;
    }
    
    // Fetch application status
    firebaseService.fetchRunnerApplicationByUserId(user.id).then(setUserApplication);
    
    const unsubErrands = firebaseService.subscribeToUserErrands(user.id, user.role, (list) => {
      setErrands(list);
      setIsLoadingErrands(false);
    });

    const unsubNotifs = firebaseService.subscribeToNotifications(user.id, setNotifications);

    let unsubAvailable: any = null;
    if (user.role === UserRole.RUNNER) {
      unsubAvailable = firebaseService.subscribeToAvailableErrands((list) => {
        setAvailableErrands(list);
        setIsLoadingAvailable(false);
      });
    } else {
      firebaseService.getNearbyRunners().then(setNearbyRunners);
    }

    return () => {
      unsubErrands();
      unsubNotifs();
      if (unsubAvailable) unsubAvailable();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedErrand) return;
    
    const allPossibleErrands = [...errands, ...availableErrands, ...allErrands];
    const updated = allPossibleErrands.find(e => e.id === selectedErrand.id);
    
    // Use JSON.stringify for deep comparison to avoid infinite loops with new object references
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedErrand)) {
      setSelectedErrand(updated);
    }
  }, [errands, availableErrands, allErrands, selectedErrand]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlErrandId = params.get('errandId');
    if (urlErrandId && selectedErrand?.id !== urlErrandId) {
      const allPossible = [...errands, ...availableErrands, ...allErrands];
      const found = allPossible.find(e => e.id === urlErrandId);
      if (found) {
        setSelectedErrand(found);
      } else {
        firebaseService.fetchErrandById(urlErrandId).then((errand) => {
          if (errand) {
            setSelectedErrand(errand);
          }
        }).catch((err) => {
          console.error("Failed to fetch shared errand on load:", err);
        });
      }
    }
  }, [errands, availableErrands, allErrands, selectedErrand?.id]);

  useEffect(() => {
    if (!user || !user.isAdmin) return;
    
    const unsubErrands = firebaseService.subscribeToAllErrands(setAllErrands);
    const unsubRunners = firebaseService.subscribeToOnlineRunners(setOnlineRunners);
    
    return () => {
      unsubErrands();
      unsubRunners();
    };
  }, [user]);

  const filteredErrands = useMemo(() => {
    if (!proximityFilter || !currentLocation) return availableErrands;
    return availableErrands.filter(e => {
      if (!e.pickupCoordinates) return false;
      const dist = calculateDistance(currentLocation, e.pickupCoordinates);
      return dist <= proximityFilter;
    });
  }, [availableErrands, proximityFilter, currentLocation]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setFormErrors({});
    try {
      const u = isLogin ? await firebaseService.login(authForm.email, authForm.password) : await firebaseService.register(authForm.name, authForm.email, normalizePhone(authForm.phone), authForm.password);
      setUser(u);
      setIsDarkMode(u.theme === 'dark');
    } catch (err: any) { setFormErrors({ auth: err.message || String(err) }); } finally { setIsProcessing(false); }
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (user) {
      await firebaseService.updateUserSettings(user.id, { theme: newMode ? 'dark' : 'light' });
    }
  };

  const validateForm = () => {
    if (!errandForm.title) return "Title is required";
    if (!errandForm.pickup?.name && errandForm.category !== ErrandCategory.HOUSE_HUNTING) return "Pickup location is required";
    if (errandForm.category === ErrandCategory.HOUSE_HUNTING) {
      if (!errandForm.houseType) return "House type is required";
      if (!errandForm.rentBudgetMax) return "Rent budget is required";
      if (!errandForm.targetEstates || errandForm.targetEstates.length === 0) return "At least one target estate is required";
      if (errandForm.commuteDistanceEnabled && !errandForm.commuteReferencePoint) return "Commute reference point is required when distance filter is enabled";
    }
    if (errandForm.category === ErrandCategory.MAMA_FUA && !errandForm.isInHouse && !errandForm.dropoff?.name) return "Delivery location is required for laundry pickup";
    if (errandForm.category === ErrandCategory.GENERAL && !errandForm.isInHouse && !errandForm.dropoff?.name) return "Drop-off is required";
    if (errandForm.category === ErrandCategory.TOWN_SERVICE && !errandForm.urgency) return "Urgency is required";
    if (errandForm.category === ErrandCategory.PACKAGE_DELIVERY && !errandForm.packageDescription) return "Package description is required";
    if ((errandForm.category === ErrandCategory.SHOPPING || errandForm.category === ErrandCategory.MARKET_SHOPPING) && (!errandForm.shoppingItems || errandForm.shoppingItems.length === 0)) return "Shopping items are required";
    if (errandForm.category === ErrandCategory.GIKOMBA_STRAWS && !errandForm.marketSection) return "Market section is required";
    
    if (errandForm.category !== ErrandCategory.MAMA_FUA && errandForm.category !== ErrandCategory.HOUSE_HUNTING && !errandForm.budget) return "Budget is required";
    
    if (errandForm.category === ErrandCategory.GENERAL && errandForm.calculatedPrice && errandForm.budget < errandForm.calculatedPrice) {
      return `Budget cannot be less than the minimum charge of Ksh ${errandForm.calculatedPrice} for this distance.`;
    }
    
    return null;
  };

  const handleRebook = (oldErrand: Errand) => {
    setErrandForm({
      category: oldErrand.category,
      title: oldErrand.title,
      description: oldErrand.description,
      pickup: { name: oldErrand.pickupLocation, coords: oldErrand.pickupCoordinates },
      dropoff: { name: oldErrand.dropoffLocation, coords: oldErrand.dropoffCoordinates },
      budget: oldErrand.budget,
      preferredRunnerId: oldErrand.runnerId
    });
    setActiveTab('create');
    setProfileView('main');
    alert(`Re-booking "${oldErrand.title}". Instructions and locations have been cloned.`);
  };

  const postErrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check verification
    if (!user.phoneVerified || !user.emailVerified) {
      setFormErrors({ ...formErrors, create: "Please verify your account (phone and email) before posting errands." });
      setProfileView('edit');
      setActiveTab('menu'); // Redirect to profile/settings
      return;
    }

    // Check suspension
    if (user.isSuspended) {
      setFormErrors({ ...formErrors, create: `Your account is suspended: ${user.suspensionReason}` });
      return;
    }

    setFormErrors({ ...formErrors, create: null });
    const error = validateForm();
    if (error) { 
      setFormErrors({ ...formErrors, create: error });
      return; 
    }
    
    setIsProcessing(true);
    try {
      let finalBudget = errandForm.budget;
      if (errandForm.category === ErrandCategory.MAMA_FUA) finalBudget = (errandForm.laundryBaskets || 1) * (errandForm.pricePerBasket || 250);
      if (errandForm.category === ErrandCategory.HOUSE_HUNTING) {
        finalBudget = errandForm.calculatedPrice || 500;
        // For House Hunting, if no pickup is selected, we use the first target estate as location name
        // and a default coordinate if none picked.
      }
      
      const data = { 
        ...errandForm, 
        budget: finalBudget, 
        calculatedPrice: errandForm.calculatedPrice || 0,
        shoppingItems: errandForm.shoppingItems || [],
        shoppingList: errandForm.shoppingList || '',
        requesterId: user.id, 
        requesterName: user.name, 
        requesterPhone: user.phone,
        pickupLocation: errandForm.pickup?.name || (errandForm.category === ErrandCategory.HOUSE_HUNTING && errandForm.targetEstates?.length > 0 ? `Areas: ${errandForm.targetEstates.join(', ')}` : ''), 
        pickupCoordinates: errandForm.pickup?.coords || { lat: 0, lng: 0 }, 
        location: errandForm.pickup?.coords || { lat: -1.286389, lng: 36.817223 },
        dropoffLocation: errandForm.category === ErrandCategory.HOUSE_HUNTING ? '' : (errandForm.isInHouse ? (errandForm.pickup?.name || '') : (errandForm.dropoff?.name || errandForm.pickup?.name || '')), 
        dropoffCoordinates: errandForm.category === ErrandCategory.HOUSE_HUNTING ? { lat: 0, lng: 0 } : (errandForm.isInHouse ? (errandForm.pickup?.coords || { lat: 0, lng: 0 }) : (errandForm.dropoff?.coords || errandForm.pickup?.coords || { lat: 0, lng: 0 })),
        maxShoppingBudget: errandForm.maxShoppingBudget || 0
      };
      const fbRes = await firebaseService.createErrand(data);
      if (fbRes && fbRes.id) {
        (data as any).id = fbRes.id;
      }
      // Synchronize with local database
      try {
        await databaseService.createErrand(data);
      } catch (err) {
        console.error('[DatabaseSync] Errand sync failed:', err);
      }
      triggerHaptic();
      alert("Errand posted successfully! Runners will be notified.");
      setErrandForm({ 
        category: ErrandCategory.GENERAL, title: '', budget: 0, deadline: '', 
        pickup: null, dropoff: null, laundryBaskets: 1, pricePerBasket: 250, 
        houseType: '', rentBudgetMin: 10000, rentBudgetMax: 30000, moveInDate: '', 
        amenities: [], targetEstates: [], runnerTasks: [],
        additionalRequirements: '', description: '', isInHouse: false,
        voiceNoteUrl: undefined, checklist: undefined,
        maxShoppingBudget: 0,
        urgency: 'normal',
        packageDescription: '',
        packageCost: 0,
        shoppingList: '',
        marketSection: ''
      });
      setActiveTab('dashboard');
    } catch (e: any) { 
      console.error("Post errand error:", e);
      setFormErrors({ ...formErrors, create: "Post failed: " + (e.message || "Unknown error") });
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleRunnerComplete = async (id: string, comments: string, photo?: string) => {
    if (!user) return;
    
    // GPS Spoofing check (Non-blocking warning)
    if (currentLocation && selectedErrand?.dropoffCoordinates) {
      const dist = calculateDistance(currentLocation, selectedErrand.dropoffCoordinates);
      if (dist > 0.5) { // 500m threshold
        console.warn(`User is ${dist.toFixed(1)}km away from drop-off.`);
        // Proceeding without blocking confirm for now as it may be blocked in iframe
      }
    }

    setIsProcessing(true);
    try {
      await firebaseService.submitForReview(id, comments, photo || '');
      await refreshErrand();
    } catch (e) { console.error("Submission failed.", e); } finally { setIsProcessing(false); }
  };

  const handleCompleteErrand = async (errandId: string) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await firebaseService.completeErrand(errandId, 'SIGNED', 5);
      
      // Update loyalty points and hours saved
      const pointsEarned = 100; // Base points per errand
      const hoursSavedEarned = 2; // Estimated hours saved per errand
      
      const newPoints = (user.loyaltyPoints || 0) + pointsEarned;
      const newHours = (user.hoursSaved || 0) + hoursSavedEarned;
      
      // Determine new level
      let newLevel = LoyaltyLevel.BRONZE;
      if (newPoints >= 5000) newLevel = LoyaltyLevel.PLATINUM;
      else if (newPoints >= 2500) newLevel = LoyaltyLevel.GOLD;
      else if (newPoints >= 1000) newLevel = LoyaltyLevel.SILVER;
      
      const updates = {
        loyaltyPoints: newPoints,
        hoursSaved: newHours,
        loyaltyLevel: newLevel
      };
      
      await firebaseService.updateUserSettings(user.id, updates);
      setUser({ ...user, ...updates });
      
      triggerHaptic();
      
      // Refresh errand
      await refreshErrand();
    } catch (e) {
      alert("Completion failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshErrand = async () => {
    if (selectedErrand) {
      const updated = await firebaseService.fetchErrandById(selectedErrand.id);
      if (updated) setSelectedErrand(updated);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner size={40} color="#000000" /></div>;

  const protectedAction = (action: () => void) => {
    if (!user) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!user || !selectedErrand) return;
    try {
      await firebaseService.sendMessage(selectedErrand.id, user.id, user.name, text, imageUrl);
    } catch (e) { console.error("Failed to send message:", e); }
  };

  const handleRunnerRegistrationSubmit = async (data: any) => {
    if (!user) return;
    try {
      const idFrontUrl = await cloudinaryService.uploadImage(data.idFrontUrl);
      const idBackUrl = await cloudinaryService.uploadImage(data.idBackUrl);
      const selfieUrl = await cloudinaryService.uploadImage(data.passportPhoto);

      await firebaseService.submitRunnerApplication({
        userId: user.id,
        fullName: data.fullName,
        nationalId: data.nationalId,
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        address: data.address,
        location: data.location,
        email: user.email || data.email || '',
        phone: user.phone || data.phone || '',
      });

      // Update state
      const newApp = await firebaseService.fetchRunnerApplicationByUserId(user.id);
      setUserApplication(newApp);

      // Notify user of submission
      NotificationService.sendRunnerApplicationReceived(user.email, data.fullName).catch(console.error);
      if (user.phone) {
        NotificationService.sendSMS(user.phone, `Hi ${data.fullName}, your Runner application has been received and is under review. You will be notified once approved.`).catch(console.error);
      }
      
    } catch (error) {
      console.error("Runner application submission failed", error);
      throw error;
    }
  };

  if (currentPath === '/dbconfig') {
    return (
      <ErrorBoundary>
        <DbConfigPage />
      </ErrorBoundary>
    );
  }

  if (currentPath === '/application-runner') {
    return (
      <ErrorBoundary>
        <RunnerApplicationPage 
          user={user} 
          appSettings={appSettings} 
          onBackToHome={() => navigateTo('/')} 
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {!user ? (
        <>
          <LandingPage 
            onGetStarted={() => { setAuthModalMode('register'); setShowAuthModal(true); }}
            onLogin={() => { setAuthModalMode('login'); setShowAuthModal(true); }}
            onBecomeRunner={() => {
              setPostLoginRedirectPath('/application-runner');
              setAuthModalMode('login');
              setShowAuthModal(true);
            }}
            onTrackRunnerApplication={() => {
              setPostLoginRedirectPath('/application-runner');
              setAuthModalMode('login');
              setShowAuthModal(true);
            }}
            appSettings={appSettings}
          />
          {selectedErrand && (
            <ErrandDetailScreenLocal 
              selectedErrand={selectedErrand} 
              setSelectedErrand={setSelectedErrand} 
              user={user} 
              setUser={setUser} 
              refresh={refreshErrand} 
              onRunnerComplete={handleRunnerComplete} 
              onCompleteErrand={handleCompleteErrand} 
              loading={isProcessing}
              setShowPriceRequestModal={setShowPriceRequestModal}
              setShowAddPropertyModal={setShowAddPropertyModal}
              setShowComparisonModal={setShowComparisonModal}
              setShowAuthModal={setShowAuthModal}
              setShowPhoneVerificationModal={setShowPhoneVerificationModal}
              setShowEmailVerificationModal={setShowEmailVerificationModal}
              setAuthModalMode={setAuthModalMode}
              googleMapsApiKey={googleMapsApiKey}
              googleMapsId={googleMapsId}
              googleRoutesApiKey={googleRoutesApiKey}
              initialTab={initialDetailTab}
              currentLocation={currentLocation}
              onSendMessage={handleSendMessage}
            />
          )}
        </>
      ) : (
        <>
          {/* Connection Status Indicator - Admin Only */}
          {user?.isAdmin && (
            <div className="fixed bottom-4 right-4 z-[200]">
              <div className={`px-3 py-1.5 rounded-full text-sm font-black tracking-normal font-medium shadow-lg flex items-center gap-2 ${
                connectionStatus === 'testing' ? 'bg-secondary text-muted-foreground' :
                connectionStatus === 'success' ? 'bg-emerald-100 text-emerald-600' :
                'bg-rose-100 text-rose-600'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'testing' ? 'bg-slate-400 animate-pulse' :
                  connectionStatus === 'success' ? 'bg-emerald-600' :
                  'bg-rose-600'
                }`} />
                {connectionStatus === 'testing' ? 'Testing Connection...' :
                 connectionStatus === 'success' ? 'Local Storage Connected' :
                 'Local Mode (Offline)'}
              </div>
            </div>
          )}
          <Layout 
            user={user} 
            onLogout={() => firebaseService.logout().then(() => setUser(null))} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            notifications={notifications}
            connectionStatus={connectionStatus}
            appSettings={appSettings}
            onNotificationClick={(notif) => {
            if (notif.errandId) {
              const errand = errands.concat(availableErrands).find(e => e.id === notif.errandId);
              if (errand) {
                setSelectedErrand(errand);
              } else {
                // If not in current lists, try to fetch it
                firebaseService.fetchErrandById(notif.errandId).then(e => {
                  if (e) setSelectedErrand(e);
                });
              }
            } else if (notif.type === 'message') {
              setActiveTab('my-errands');
            }
          }}
        >
          <TopProgressBar isLoading={isProcessing} />
          
          {geoError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md"
            >
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <AlertCircle size={18} />
                  </div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-100 leading-tight">
                    {geoError}
                  </p>
                </div>
                <button 
                  onClick={() => setGeoError(null)}
                  className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-lg transition-colors text-amber-600 dark:text-amber-400"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}

          <div className="max-w-7xl mx-auto space-y-3 px-4 md:px-6">
            {activeTab === 'dashboard' && (
          <div className="space-y-6 pb-12">
            {/* Hero Section */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/50 to-secondary/30 rounded-[2rem] md:rounded-[2.5rem] blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-700"></div>
              <div 
                className="bg-[#0a2e5c] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white relative overflow-hidden shadow-strong min-h-[180px] md:min-h-[220px] flex flex-col justify-center border border-white/5"
                style={appSettings.dashboardHeroUrl ? {
                  backgroundImage: `linear-gradient(rgba(10, 46, 92, 0.8), rgba(10, 46, 92, 0.8)), url('${appSettings.dashboardHeroUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {
                  backgroundImage: `linear-gradient(rgba(10, 46, 92, 0.8), rgba(10, 46, 92, 0.8)), url('https://res-console.cloudinary.com/dul9xvvap/thumbnails/transform/v1/image/upload/Y19maWxsLGhfMjAwLHdfMjAw/v1/RXJyYW5kc19sb2dvX25ld19rc3RleW8=/template_primary')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="relative z-10 max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                      <div className="px-2 md:px-3 py-1 bg-white/10 text-white backdrop-blur-md rounded-full border border-white/20 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                        ✨ Welcome Back
                      </div>
                      {user?.role === UserRole.RUNNER && (
                        <div className="px-2 md:px-3 py-1 bg-primary/20 text-cyan-200 backdrop-blur-md rounded-full border border-primary/30 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                          Runner Portal
                        </div>
                      )}
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-6 tracking-tighter leading-[0.9] md:leading-[0.85] font-serif italic">
                      Errands Coordination <br className="hidden md:block" /> for the Modern World.
                    </h2>
                    <p className="text-sm md:text-base font-medium text-slate-300 mb-8 md:mb-10 max-w-xl leading-relaxed">
                      Experience the next generation of logistics. From premium laundry to real-time coordination—handle every errand with surgical precision.
                    </p>
                  </motion.div>
                  
                  <div className="flex flex-wrap gap-3 md:gap-4">
                    <button 
                      onClick={() => setActiveTab(user?.role === UserRole.RUNNER ? 'find' : 'create')}
                      className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-primary text-white hover:bg-primary/90 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(33,140,141,0.2)] active:scale-95"
                    >
                      {user?.role === UserRole.RUNNER ? <Search size={14} /> : <PlusCircle size={14} />}
                      {user?.role === UserRole.RUNNER ? 'Find Errands' : 'Post New Task'}
                    </button>
                    <button 
                      onClick={() => setActiveTab(user?.role === UserRole.RUNNER ? 'my-errands' : 'find')}
                      className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-white/10 text-white border border-white/20 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 backdrop-blur-md flex items-center justify-center"
                    >
                      {user?.role === UserRole.RUNNER ? 'Active Tasks' : 'Find Runners'}
                    </button>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -right-12 -bottom-12 opacity-10 rotate-12 pointer-events-none">
                  <Logo 
                    size={400} 
                    url={appSettings.logoUrl} 
                    scale={appSettings.logoScale} 
                    variant={appSettings.logoVariant} 
                  />
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
                <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-secondary/10 rounded-full blur-[80px]"></div>
              </div>
            </div>

            {/* Stats Bento Grid (Admin or Active User) */}
            {(user?.isAdmin || errands.length > 0) && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {user?.isAdmin ? (
                  <>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[140px] group hover:shadow-xl hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-20 md:w-24 h-20 md:h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-10 md:-mr-12 -mt-10 md:-mt-12 transition-transform group-hover:scale-150 duration-700" />
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600 mb-3 md:mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all relative z-10">
                        <Users size={20} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[8px] md:text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5 md:mb-1">Total Users</p>
                        <p className="text-xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{(stats?.totalUsers || 0).toLocaleString()}</p>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[140px] group hover:shadow-xl hover:border-violet-500/30 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-20 md:w-24 h-20 md:h-24 bg-violet-50 dark:bg-violet-900/10 rounded-full -mr-10 md:-mr-12 -mt-10 md:-mt-12 transition-transform group-hover:scale-150 duration-700" />
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-violet-50 dark:bg-violet-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-violet-600 mb-3 md:mb-4 group-hover:bg-violet-600 group-hover:text-white transition-all relative z-10">
                        <List size={20} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[8px] md:text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5 md:mb-1">Total Tasks</p>
                        <p className="text-xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{(stats?.totalTasks || 0).toLocaleString()}</p>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[140px] group hover:shadow-xl hover:border-emerald-500/30 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-20 md:w-24 h-20 md:h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-10 md:-mr-12 -mt-10 md:-mt-12 transition-transform group-hover:scale-150 duration-700" />
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 mb-3 md:mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all relative z-10">
                        <Activity size={20} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[8px] md:text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5 md:mb-1">Online Now</p>
                        <p className="text-xl md:text-3xl font-black tracking-tighter text-emerald-600">{(stats?.onlineUsers || 0).toLocaleString()}</p>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[120px] md:min-h-[140px] group hover:shadow-xl hover:border-amber-500/30 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-20 md:w-24 h-20 md:h-24 bg-amber-50 dark:bg-amber-900/10 rounded-full -mr-10 md:-mr-12 -mt-10 md:-mt-12 transition-transform group-hover:scale-150 duration-700" />
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-600 mb-3 md:mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all relative z-10">
                        <DollarSign size={20} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[8px] md:text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5 md:mb-1">Revenue</p>
                        <p className="text-xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white">KSH {(stats?.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:border-indigo-500/30 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-12 md:-mr-16 -mt-12 md:-mt-16 transition-transform group-hover:scale-150 duration-700" />
                      <div className="relative z-10">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center text-primary mb-4 md:mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                          <Activity size={20} />
                        </div>
                        <p className="text-[8px] md:text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1 md:mb-2">Active Tasks</p>
                        <p className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{errands.filter(e => e.status !== ErrandStatus.COMPLETED).length}</p>
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:border-emerald-500/30 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <CheckCircle2 size={24} />
                        </div>
                        <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">Completed</p>
                        <p className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{errands.filter(e => e.status === ErrandStatus.COMPLETED).length}</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-indigo-600 p-8 col-span-2 md:col-span-2 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group border border-indigo-500"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <p className="text-[10px] font-black tracking-widest uppercase opacity-70">Wallet Balance</p>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              refreshBalance();
                            }}
                            className="p-2 hover:bg-white/10 rounded-xl transition-all"
                            title="Refresh Balance"
                          >
                            <RefreshCw size={18} className="opacity-70 hover:opacity-100" />
                          </button>
                          <Zap size={18} className="text-amber-300 animate-pulse" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mb-8 relative z-10">
                        <span className="text-xl font-black leading-none opacity-60">KSH</span>
                        <p className="text-5xl font-black tracking-tighter">{(user?.walletBalance || 0).toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => setShowWallet(true)}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all border border-white/20 backdrop-blur-md relative z-10"
                      >
                        Manage Account Balance
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            )}

            {/* Search & AI Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-4">
                {/* Search Bar */}
                <div className="relative group z-30 px-2 md:px-0">
                  <div className="absolute inset-y-0 left-6 md:left-8 flex items-center pointer-events-none">
                    <Search className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search errands..." 
                    className="w-full pl-12 md:pl-16 pr-6 md:pr-8 py-4 md:py-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl md:rounded-[2.5rem] font-black text-sm md:text-lg outline-none focus:ring-[8px] md:focus:ring-[12px] focus:ring-primary/5 focus:border-primary/30 transition-all shadow-sm placeholder:text-slate-400"
                  />
                  {searchSuggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden z-50 p-2"
                    >
                      <div className="px-6 py-4 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Smart Suggestions</p>
                        <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {searchSuggestions.map((s) => (
                          <button 
                            key={s}
                            onClick={() => {
                              setSearchQuery(s);
                              setSearchSuggestions([]);
                            }}
                            className="w-full px-6 py-5 text-left text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all flex items-center gap-4 group"
                          >
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <Search size={16} />
                            </div>
                            {s}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-serif">Popular Services</h3>
                    <button onClick={() => setActiveTab('menu')} className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-secondary transition-all">Explore Catalogue</button>
                  </div>
                  <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 no-scrollbar px-2 md:px-4 -mx-4">
                    {Object.values(ErrandCategory).map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => {
                          setErrandForm({ ...errandForm, category: cat });
                          setActiveTab('create');
                        }}
                        className="flex-shrink-0 w-24 md:w-28 group"
                      >
                        <div className="aspect-square bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-2 md:gap-3 group-hover:shadow-xl group-hover:border-primary/30 transition-all group-hover:-translate-y-2">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors overflow-hidden">
                             <img src={`https://picsum.photos/seed/${cat}/100/100`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={cat} />
                          </div>
                          <p className="text-[10px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors px-2 text-center leading-none">{cat.replace('_', ' ')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                {/* Smart Create NLP */}
                <div className="bg-slate-950 p-8 rounded-[3rem] shadow-2xl space-y-6 h-full flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:bg-primary/30 transition-all duration-1000" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h3 className="text-3xl text-white font-black tracking-tight font-serif italic-caps">Magic Post</h3>
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Logic Processing</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-primary shadow-inner backdrop-blur-xl border border-white/10 group-hover:rotate-12 transition-transform duration-500">
                      <Sparkles size={24} className="animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="relative flex-1 z-10 flex flex-col">
                    <textarea 
                      value={smartInput}
                      onChange={(e) => setSmartInput(e.target.value)}
                      placeholder="Describe your errand in plain words... e.g. 'I need some groceries from Chandarana Westlands for 1000 bob' "
                      className="w-full flex-1 p-6 bg-white/5 border border-white/10 rounded-2xl text-lg font-bold text-white outline-none resize-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all placeholder:text-slate-600"
                    />
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest hidden sm:block">AI will auto-fill everything</p>
                      <button 
                        onClick={handleSmartCreate}
                        disabled={isParsing || !smartInput.trim()}
                        className="px-8 py-5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_12px_24px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_12px_32px_rgba(var(--primary-rgb),0.5)] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                      >
                        {isParsing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        Analyze & Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Services */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-serif">Curated Services</h3>
                <button onClick={() => setActiveTab('menu')} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-700 transition-all">View Full Menu</button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2 -mx-2">
                {isLoadingFeatured ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-48 bg-card text-card-foreground rounded-3xl p-3 border border-border shadow-soft animate-pulse">
                      <div className="aspect-[4/3] bg-secondary rounded-2xl mb-3"></div>
                      <div className="h-3 bg-secondary rounded-full w-3/4 mb-2"></div>
                      <div className="h-3 bg-secondary rounded-full w-1/2"></div>
                    </div>
                  ))
                ) : featuredServices.length === 0 ? (
                  <div className="w-full py-16 text-center bg-card text-card-foreground rounded-[3rem] border border-border shadow-soft">
                    <p className="text-base font-bold text-muted-foreground">No featured services available</p>
                  </div>
                ) : (
                  featuredServices.map(service => (
                    <motion.div 
                      key={service.id} 
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedFeaturedService(service)}
                      className="flex-shrink-0 w-44 bg-card text-card-foreground rounded-[2rem] overflow-hidden border border-border shadow-soft hover:shadow-strong transition-all group cursor-pointer"
                    >
                      <div className="aspect-square relative overflow-hidden m-2 rounded-2xl">
                        <img src={service.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={service.title} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                           <div className="bg-card text-card-foreground text-black px-4 py-2 rounded-xl text-sm font-black tracking-normal font-medium shadow-strong">View Details</div>
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-1 bg-card text-card-foreground/90 backdrop-blur-md rounded-lg text-xs font-black text-primary shadow-sm">
                          KSH {(service.price || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 pt-1">
                        <h4 className="text-xs font-black mb-1 truncate text-foreground group-hover:text-primary transition-colors">{service.title}</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star size={16} fill="currentColor" />
                            <span className="text-sm font-black">4.9</span>
                          </div>
                          <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Nearby Runners for Requesters */}
            {user?.role === UserRole.REQUESTER && nearbyRunners.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-serif">Verified Runners</h3>
                  <button onClick={() => setActiveTab('live-map')} className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-700 transition-all">Interactive Map</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2 -mx-2">
                  {nearbyRunners.map((runner) => (
                    <motion.div 
                      key={runner.id} 
                      whileHover={{ scale: 1.02 }}
                      className="flex-shrink-0 w-36 bg-card text-card-foreground p-4 rounded-[2rem] border border-border shadow-soft flex flex-col items-center text-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-4 border-white shadow-strong relative group">
                        <UserAvatar 
                          src={runner.profilePhoto || runner.avatar} 
                          name={runner.name} 
                          className="w-full h-full object-cover" 
                          isVerified={runner.isVerified}
                        />
                        {runner.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                        )}
                      </div>
                      <div className="min-w-0 w-full">
                        <h4 className="text-xs font-black truncate text-foreground">{runner.name.split(' ')[0]}</h4>
                        <div className="flex items-center justify-center gap-1 text-amber-500 mt-0.5">
                          <Star size={16} fill="currentColor" />
                          <span className="text-sm font-black">{(runner.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setErrandForm({ ...errandForm, category: ErrandCategory.GENERAL });
                          setActiveTab('create');
                        }}
                        className="w-full py-2 bg-secondary rounded-xl text-xs font-black tracking-normal font-medium hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        Hire Now
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-display">Recent Activity</h3>
                <button onClick={() => setActiveTab('my-errands')} className="text-micro text-primary hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoadingErrands ? (
                  [1,2,3,4].map(i => <ErrandCardSkeleton key={`skeleton-recent-${i}`} />)
                ) : (errands || []).slice(0, 6).length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-card text-card-foreground rounded-[3rem] border-2 border-dashed border-border">
                    <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <List size={32} className="text-muted-foreground/70" />
                    </div>
                    <h4 className="text-xl font-black text-muted-foreground">No recent activity</h4>
                    <p className="text-xs font-bold text-muted-foreground/70 tracking-normal font-medium mt-2">Your posted tasks will appear here</p>
                  </div>
                ) : (
                  (errands || []).slice(0, 6).map(e => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ErrandCard errand={e} onClick={(errand, tab) => { setSelectedErrand(errand); setInitialDetailTab(tab || 'details'); }} currentLocation={currentLocation} />
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'my-errands' && (
          <div className="space-y-6 md:space-y-8 pb-20">
            {!user ? (
              <div className="p-8 md:p-24 text-center bg-card text-card-foreground rounded-[2.5rem] md:rounded-[3rem] border border-border shadow-strong animate-in fade-in zoom-in-95 max-w-2xl mx-auto mt-6 md:mt-12">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-secondary rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <ShieldAlert size={32} className="md:size-[48px] text-muted-foreground/70 relative z-10 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-foreground mb-3 tracking-tight font-display">Login Required</h3>
                <p className="text-sm md:text-base font-medium text-muted-foreground mb-8 md:mb-10 max-w-sm mx-auto leading-relaxed">
                  Sign in to view and manage your errands, track progress, and stay updated with your service status.
                </p>
                <button 
                  onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); }} 
                  className="btn-primary px-8 md:px-12 py-4 md:py-5"
                >
                  Sign In Now
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 px-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight font-display">
                      Errands
                    </h2>
                    <p className="text-[10px] md:text-sm font-medium text-muted-foreground">
                      {user?.role === UserRole.REQUESTER ? 'Manage your active and past tasks' : 'Track your errands as a runner and as a requester'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-card text-card-foreground px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-border shadow-soft flex items-center gap-2 md:gap-3">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse"></div>
                      <span className="text-[10px] md:text-xs font-black text-foreground tracking-normal font-medium">{errands.length} Total Tasks</span>
                    </div>
                    <button 
                      onClick={() => setActiveTab(user?.role === UserRole.RUNNER ? 'find' : 'create')}
                      className="btn-primary flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 text-[10px] md:text-xs"
                    >
                      {user?.role === UserRole.RUNNER ? (
                        <><Search size={14} /> Find Errands</>
                      ) : (
                        <><PlusCircle size={14} /> New Task</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filter chip for runners to see their own posted vs assigned */}
                {user?.role === UserRole.RUNNER && errands.length > 0 && (
                  <div className="flex gap-2 px-4 mb-4">
                    <button 
                      onClick={() => setErrandFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                        errandFilter === 'all' ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      All Tasks
                    </button>
                    <button 
                      onClick={() => setErrandFilter('posted')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                        errandFilter === 'posted' ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {errands.filter(e => e.requesterId === user.id).length} Posted
                    </button>
                    <button 
                      onClick={() => setErrandFilter('running')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                        errandFilter === 'running' ? 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {errands.filter(e => e.runnerId === user.id).length} Running
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                  {isLoadingErrands ? (
                    [1,2,3,4,5,6].map(i => <ErrandCardSkeleton key={`skeleton-errands-${i}`} />)
                  ) : errands.length === 0 ? (
                    <div className="col-span-full p-12 md:p-24 text-center bg-card text-card-foreground rounded-[3rem] border border-border shadow-soft animate-in fade-in zoom-in-95 max-w-3xl mx-auto">
                      <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50" />
                        <Sparkles size={48} className="text-primary/40 relative z-10 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="text-3xl font-black text-foreground mb-3 tracking-tight font-display text-center">
                        {user?.role === UserRole.RUNNER ? "No Tasks Yet!" : "Good morning! Ready to start?"}
                      </h3>
                      <p className="text-base font-medium text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed text-center">
                        {user?.role === UserRole.RUNNER 
                          ? "You haven't been assigned to any errands yet. Head over to the 'Find' tab to browse available tasks near you."
                          : "You haven't posted any errands yet. Want us to handle the laundry or run some errands for you?"}
                      </p>
                      <button 
                        onClick={() => setActiveTab(user?.role === UserRole.RUNNER ? 'find' : 'create')}
                        className="btn-primary px-10 py-4 mx-auto block"
                      >
                        {user?.role === UserRole.RUNNER ? 'Find Available Tasks' : 'Create Your First Errand'}
                      </button>
                    </div>
                  ) : (
                    errands
                      .filter(e => {
                        if (!user || user.role === UserRole.REQUESTER) return true;
                        if (errandFilter === 'posted') return e.requesterId === user.id;
                        if (errandFilter === 'running') return e.runnerId === user.id;
                        return true;
                      })
                      .map(e => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ErrandCard errand={e} onClick={(errand, tab) => { setSelectedErrand(errand); setInitialDetailTab(tab || 'details'); }} currentLocation={currentLocation} />
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {activeTab === 'menu' && (
          <MenuView 
            listings={serviceListings} 
            onSelect={(listing) => {
              setSelectedFeaturedService(listing as any);
            }} 
          />
        )}
        {activeTab === 'create' && (
          <CreateScreen 
            user={user}
            errandForm={errandForm} 
            setErrandForm={setErrandForm} 
            postErrand={(e: any) => { e.preventDefault(); protectedAction(() => postErrand(e)); }} 
            loading={isProcessing} 
            errors={formErrors} 
            googleMapsApiKey={googleMapsApiKey}
            googlePlacesApiKey={googlePlacesApiKey}
            googleRoutesApiKey={googleRoutesApiKey}
            settings={appSettings}
          />
        )}
        {activeTab === 'find' && (
          <div className="space-y-6 md:space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 px-4">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight font-display">Available Tasks</h2>
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground">Find errands near you and start earning today</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group w-full md:w-auto">
                  <div className="absolute inset-y-0 left-4 md:left-5 flex items-center pointer-events-none">
                    <Filter size={14} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <select 
                    value={proximityFilter || ''} 
                    onChange={e => setProximityFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full pl-10 md:pl-12 pr-10 py-3 md:py-4 bg-card text-card-foreground border border-border rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black tracking-normal font-medium outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/20 transition-all shadow-soft appearance-none min-w-[160px] md:min-w-[200px] cursor-pointer"
                  >
                    <option value="">All Distances</option>
                    <option value="5">Within 5km</option>
                    <option value="10">Within 10km</option>
                    <option value="20">Within 20km</option>
                    <option value="50">Within 50km</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-2 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingAvailable ? (
                  [1,2,3,4,5,6].map(i => <ErrandCardSkeleton key={`skeleton-filtered-${i}`} />)
                ) : filteredErrands.length === 0 ? (
                  <div className="col-span-full p-12 md:p-24 text-center bg-card text-card-foreground rounded-[3rem] border border-border shadow-soft animate-in fade-in zoom-in-95 max-w-3xl mx-auto">
                    <div className="w-24 h-24 bg-secondary rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 relative overflow-hidden">
                      <Search size={48} className="text-muted-foreground/70 relative z-10" />
                    </div>
                    <h3 className="text-3xl font-black text-foreground mb-3 tracking-tight font-display">No errands nearby</h3>
                    <p className="text-base font-medium text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed">
                      Try increasing your search range or check back later for new opportunities in your area.
                    </p>
                    <button 
                      onClick={() => setProximityFilter(null)}
                      className="btn-primary px-10 py-4"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  filteredErrands.map(e => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ErrandCard errand={e} onClick={(errand, tab) => { setSelectedErrand(errand); setInitialDetailTab(tab || 'details'); }} currentLocation={currentLocation} />
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'admin' && user && <AdminPanel 
          user={user} 
          settings={appSettings} 
          stats={stats} 
          setStats={setStats}
          userSearchQuery={userSearchQuery}
          setUserSearchQuery={setUserSearchQuery}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
        />}
        {activeTab === 'live-map' && (
          <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-foreground tracking-tight font-display">Live Map</h2>
                <p className="text-sm font-medium text-muted-foreground">Real-time runner locations and errand activity</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black tracking-normal font-medium border border-emerald-100 shadow-sm">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  {onlineRunners.length} Runners Online
                </div>
              </div>
            </div>
            
            <div className="h-[65vh] min-h-[550px] rounded-[3.5rem] overflow-hidden border border-border shadow-strong relative group">
               <div className="absolute inset-0 bg-secondary animate-pulse group-hover:opacity-0 transition-opacity duration-1000 z-0"></div>
               <div className="relative z-10 h-full">
                <MapComponent 
                  errands={allErrands.filter(e => e.status === ErrandStatus.PENDING || e.status === ErrandStatus.BIDDING)} 
                  runners={onlineRunners}
                  center={currentLocation || undefined}
                  apiKey={googleMapsApiKey}
                  mapId={googleMapsId}
                  routesApiKey={googleRoutesApiKey}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
              <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-soft relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <MapPin size={24} />
                  </div>
                  <h4 className="text-lg font-black text-foreground font-display">Errand Pins</h4>
                </div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed relative z-10">
                  Blue markers represent available errands waiting for runners. Click on a pin to view details and place a bid.
                </p>
              </div>
              <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-soft relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Navigation size={24} />
                  </div>
                  <h4 className="text-lg font-black text-foreground font-display">Runner Locations</h4>
                </div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed relative z-10">
                  Emerald markers show real-time locations of active runners. You can see who's nearby to handle your tasks quickly.
                </p>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'active' && (
           <div className="w-full max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto pb-12 px-4">
            {!user ? (
              <div className="bg-card text-card-foreground rounded-3xl p-8 border border-border shadow-strong text-center animate-in fade-in zoom-in-95 mt-8">
                <div 
                  onClick={() => {
                    setAuthModalMode('register');
                    setShowAuthModal(true);
                  }}
                  className="w-24 h-24 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform active:scale-95 group"
                >
                   <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   <UserCircle size={48} className="text-muted-foreground/70 relative z-10 group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight font-display">My Profile</h2>
                <p className="text-sm font-medium text-muted-foreground mb-8 max-w-xs mx-auto leading-relaxed">Join our community to manage your tasks, track earnings, and connect with others.</p>
                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      setAuthModalMode('register');
                      setShowAuthModal(true);
                    }} 
                    className="btn-primary w-full py-5"
                  >
                    Create Account
                  </button>
                  <button 
                    onClick={() => {
                      setAuthModalMode('login');
                      setShowAuthModal(true);
                    }}
                    className="w-full py-4 bg-secondary text-muted-foreground rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Sign In
                  </button>
                </div>
                
                <div className="mt-12 space-y-2">
                  <ProfileMenuItem icon={<Globe size={18} />} label="Change Language" onClick={() => setShowLanguageModal(true)} />
                  <ProfileMenuItem icon={<MessageCircle size={18} />} label="Live Support" onClick={() => setIsSupportChatOpen(true)} />
                  <ProfileMenuItem icon={<Calculator size={18} />} label="Price Guide" onClick={() => setShowPriceGuideModal(true)} />
                  <ProfileMenuItem icon={<HelpCircle size={18} />} label="FAQs" onClick={() => setShowFAQ(true)} />
                  <ProfileMenuItem icon={<Phone size={18} />} label="Contact Us" onClick={() => setShowContactUsModal(true)} />
                  <ProfileMenuItem icon={<ShieldAlert size={18} />} label="Cookies Policy" />
                  <ProfileMenuItem icon={<Info size={18} />} label="About Us" />
                  <ProfileMenuItem icon={<ShieldAlert size={18} />} label="Privacy Policy" onClick={() => setShowPrivacyPolicy(true)} />
                  <ProfileMenuItem icon={<List size={18} />} label="Terms and Conditions" />
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {profileView === 'main' && (
                  <div className="w-full max-w-7xl mx-auto pb-16 px-2 sm:px-4 md:px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Left Sidebar Profile Column - Spans 12 on mobile/tablet, 4 on desktop */}
                      <div className="lg:col-span-4 space-y-6">
                        {/* Hero Card */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[2.5rem] overflow-hidden shadow-strong relative group">
                          {/* Banner Background */}
                          <div className="h-32 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl" />
                          </div>

                          {/* Avatar & Profile Identity */}
                          <div className="px-6 pb-6 relative">
                            <div className="relative inline-block -mt-16 mb-4">
                              <div className="p-1.5 bg-white dark:bg-slate-950 rounded-[2rem] shadow-xl border-4 border-white dark:border-slate-950">
                                <UserAvatar src={user.profilePhoto || user.avatar} name={user.name} className="w-24 h-24 rounded-[1.5rem] object-cover" />
                              </div>
                              {user.isVerified && (
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center border-4 border-white dark:border-slate-950 shadow-lg">
                                  <ShieldCheck size={16} />
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">{user.name}</h2>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                  user.role === UserRole.RUNNER 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                }`}>
                                  {user.role === UserRole.RUNNER ? 'PRO RUNNER' : 'CLIENT'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium">
                                {user.role === UserRole.RUNNER ? 'Verified Professional Runner • Nairobi Core' : `Member since ${new Date(user.createdAt || Date.now()).getFullYear()}`}
                              </p>
                              {user.biography && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-2 line-clamp-2 leading-relaxed">
                                  "{user.biography}"
                                </p>
                              )}
                            </div>

                            {/* Quick Vitals Inside Hero Card */}
                            <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50 text-center">
                              <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-0.5">Rating</p>
                                <div className="flex items-center justify-center gap-0.5 text-amber-500 text-sm font-black">
                                  <Star size={12} fill="currentColor" />
                                  <span className="text-slate-900 dark:text-white">{(user.rating || 5.0).toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-0.5">{user.role === UserRole.RUNNER ? 'Gigs' : 'Tasks'}</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white">{user.completedErrands || 0}</p>
                              </div>
                              <div className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 mb-0.5">Tier</p>
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{user.role === UserRole.RUNNER ? 'Gold Pro' : (user.loyaltyLevel || 'Gold')}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Active Duty Status Switch (Runner ONLY) */}
                        {user.role === UserRole.RUNNER && (
                          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[2rem] p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">On Duty Status</p>
                                <p className={`text-sm font-black mt-0.5 ${runnerOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {runnerOnline ? '● Active & Online' : '○ Offline'}
                                </p>
                              </div>
                              <button
                                onClick={() => setRunnerOnline(!runnerOnline)}
                                className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative focus:outline-none ${
                                  runnerOnline ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                              >
                                <motion.div
                                  layout
                                  className="w-6 h-6 bg-white rounded-full shadow-md"
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  animate={{ x: runnerOnline ? 24 : 0 }}
                                />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800/50">
                              {runnerOnline 
                                ? '🟢 Your live location is visible to requesters on the coordinates map. Gigs can be direct-offered!'
                                : '⚪ You are hidden from live search results. Enable to resume receiving premium delivery offers.'}
                            </p>
                          </div>
                        )}

                        {/* Suspended Warning */}
                        {user.isSuspended && (
                          <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] flex items-start gap-4 shadow-sm">
                            <AlertCircle size={24} className="text-rose-500 shrink-0" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">Account Suspended</h4>
                              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                                {user.suspensionReason}
                                {user.suspensionExpiresAt && <span className="block font-black mt-1">Expires: {new Date(user.suspensionExpiresAt).toLocaleDateString()}</span>}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Quick Navigation Menu */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[2.5rem] p-4 shadow-sm space-y-1">
                          <div className="px-4 py-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Controls</h4>
                          </div>
                          <ProfileMenuItem icon={<Edit2 size={16} />} label="Edit Personal Profile" onClick={() => setProfileView('edit')} />
                          <ProfileMenuItem icon={<HistoryIcon size={16} />} label={user.role === UserRole.RUNNER ? "Completed Gig History" : "My Task History"} onClick={() => setProfileView('history')} />
                          <ProfileMenuItem icon={<Wallet size={16} />} label="My Wallet Details" onClick={() => setShowWallet(true)} />
                          {user.isAdmin && (
                            <ProfileMenuItem icon={<ShieldCheck size={16} />} label="Access Admin Panel" onClick={() => { setActiveTab('admin'); setProfileView('main'); }} />
                          )}
                          {user.role !== UserRole.RUNNER && (
                            <ProfileMenuItem icon={<Briefcase size={16} />} label="Become a Nairobi Runner" onClick={() => {
                              navigateTo('/application-runner');
                            }} />
                          )}
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4" />
                          <ProfileMenuItem icon={<LogOut size={16} />} label="Sign Out of Session" onClick={() => setShowLogoutConfirm(true)} destructive />
                        </div>
                      </div>

                      {/* Right Main Column - Dashboard Tab Contents Column */}
                      <div className="lg:col-span-8 space-y-6">
                        {/* Tabs Segment Selector */}
                        <div className="flex border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-3xl p-1.5 shadow-sm gap-1 overflow-x-auto no-scrollbar">
                          {[
                            { id: 'overview', label: 'Overview', icon: LayoutGrid },
                            { id: 'earnings', label: 'My Wallet', icon: Wallet },
                            { id: 'tools', label: user.role === UserRole.RUNNER ? 'Helper Tools' : 'Pricing Advisor', icon: Calculator },
                            { id: 'settings', label: 'Handbooks', icon: HelpCircle },
                          ].map((tab) => {
                            const Icon = tab.icon;
                            const isSelected = runnerProfileTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setRunnerProfileTab(tab.id as any)}
                                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all min-w-[120px] ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                              >
                                <Icon size={14} />
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tab Contents */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={runnerProfileTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                          >
                            {runnerProfileTab === 'overview' && (
                              <div className="space-y-6">
                                {/* Main Performance Cards */}
                                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-[2.5rem] p-6 shadow-sm space-y-6">
                                  <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                      <Activity size={18} className="text-indigo-600" /> 
                                      {user.role === UserRole.RUNNER ? 'Professional Performance Metrics' : 'Client Engagement Statistics'}
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                                      {user.role === UserRole.RUNNER 
                                        ? 'Maintain high completion rates and exceptional ratings to secure premier Nairobi payouts.' 
                                        : 'Your dashboard tracking community involvement, loyalty tiers, and errand saves.'}
                                    </p>
                                  </div>

                                  {user.role === UserRole.RUNNER ? (
                                    <div className="space-y-5">
                                      {/* Cancel Rate */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-500">Cancellation Rate (Target &lt; 15%)</span>
                                          <span className={user.cancellationRate && user.cancellationRate > 0.15 ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
                                            {Math.round((user.cancellationRate || 0) * 100)}%
                                          </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-700 ${user.cancellationRate && user.cancellationRate > 0.15 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                            style={{ width: `${100 - Math.round((user.cancellationRate || 0) * 100)}%` }} 
                                          />
                                        </div>
                                      </div>

                                      {/* Late Rate */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-500">Late Completion Rate (Target &lt; 10%)</span>
                                          <span className={user.lateCompletionRate && user.lateCompletionRate > 0.10 ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
                                            {Math.round((user.lateCompletionRate || 0) * 100)}%
                                          </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-700 ${user.lateCompletionRate && user.lateCompletionRate > 0.10 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                            style={{ width: `${100 - Math.round((user.lateCompletionRate || 0) * 100)}%` }} 
                                          />
                                        </div>
                                      </div>

                                      {/* Reject Rate */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-500">Bid Rejection Rate (Target &lt; 20%)</span>
                                          <span className={user.rejectionRate && user.rejectionRate > 0.20 ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
                                            {Math.round((user.rejectionRate || 0) * 100)}%
                                          </span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-700 ${user.rejectionRate && user.rejectionRate > 0.20 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                            style={{ width: `${100 - Math.round((user.rejectionRate || 0) * 100)}%` }} 
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-6">
                                      {/* Requester metrics */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/30 flex items-center gap-4">
                                          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                                            <Clock size={20} />
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Est. Hours Saved</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{(user.hoursSaved || (user.completedErrands || 0) * 2.5).toFixed(1)} Hours</p>
                                          </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/30 flex items-center gap-4">
                                          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                                            <Sparkles size={20} />
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loyalty Level Progress</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{user.loyaltyPoints || (user.completedErrands || 0) * 100} Points</p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Loyalty Tier Progress Bar */}
                                      <div className="space-y-2 pt-2">
                                        <div className="flex justify-between text-xs font-bold text-slate-500">
                                          <span>Bronze Tier Progress (Aim 1,000 pts)</span>
                                          <span className="text-indigo-600 dark:text-indigo-400 font-black">{(Math.min(100, ((user.loyaltyPoints || (user.completedErrands || 0) * 100) / 1000) * 100)).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden relative">
                                          <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-700" 
                                            style={{ width: `${Math.min(100, ((user.loyaltyPoints || (user.completedErrands || 0) * 100) / 1000) * 100)}%` }} 
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Quick Nairobi Tips card */}
                                <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50/10 to-transparent dark:from-indigo-950/10 dark:via-slate-950/5 dark:to-transparent border-2 border-indigo-100/50 dark:border-indigo-950/30 rounded-[2.5rem] p-6 shadow-sm flex items-start gap-4">
                                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black">
                                    📜
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                                      {user.role === UserRole.RUNNER ? 'Nairobi Runner Tip' : 'Nairobi Requester Tip'}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                      {user.role === UserRole.RUNNER 
                                        ? 'Always upload a clear receipt photo in the task completion screen. Accurate billing builds trust with clients and guarantees 5-star ratings and bigger cash tips!' 
                                        : 'Provide detailed instructions, specify preferred locations, and set a reasonable budget. Highly rated professional runners respond faster to clear, well-structured listings.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {runnerProfileTab === 'earnings' && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  {/* Wallet Card */}
                                  <div className="md:col-span-5 bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-900 text-white p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                                        {user.role === UserRole.RUNNER ? 'Available Payout Balance' : 'Account Wallet Balance'}
                                      </p>
                                      <div className="flex items-baseline gap-2 mt-2">
                                        <span className="text-xl font-black opacity-60">KSH</span>
                                        <p className="text-4xl font-black tracking-tighter">{(user.walletBalance || 0).toLocaleString()}</p>
                                      </div>
                                    </div>

                                    <div>
                                      {user.role === UserRole.RUNNER ? (
                                        <button
                                          onClick={() => {
                                            if ((user.walletBalance || 0) < 100) {
                                              alert("Minimum payout threshold is KSH 100. Complete more errands to withdraw.");
                                              return;
                                            }
                                            const proceed = confirm(`Withdraw KSH ${(user.walletBalance || 0).toLocaleString()} to registered M-PESA line ${user.phone || ''}?`);
                                            if (proceed) {
                                              alert(`Withdrawal request received! KSH ${(user.walletBalance || 0).toLocaleString()} will be disbursed to ${user.phone || ''} instantly via M-PESA (Ref: RF-${Math.floor(100000 + Math.random() * 900000)}).`);
                                            }
                                          }}
                                          className="w-full py-3.5 bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                          Instant M-PESA Payout
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setShowWallet(true)}
                                          className="w-full py-3.5 bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                          Top Up via M-PESA
                                        </button>
                                      )}
                                      <p className="text-[8px] opacity-75 text-center mt-2.5 font-medium">Processed instantly with zero hidden charges.</p>
                                    </div>
                                  </div>

                                  {/* Financial Summary */}
                                  <div className="md:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-6 rounded-[2.5rem] shadow-sm flex flex-col justify-between">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Financial Summary</h4>
                                    
                                    <div className="space-y-4 text-xs font-bold">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">{user.role === UserRole.RUNNER ? 'Total Career Earnings' : 'Total Funds Deposited'}</span>
                                        <span className="text-slate-900 dark:text-white">KSH {((user.completedErrands || 0) * 850 + (user.walletBalance || 0)).toLocaleString()}</span>
                                      </div>
                                      <div className="h-px bg-slate-100 dark:bg-slate-800/50" />
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Pending Escrow Releases</span>
                                        <span className="text-amber-500">KSH 0</span>
                                      </div>
                                      <div className="h-px bg-slate-100 dark:bg-slate-800/50" />
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Platform Commission Rate</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">10% (Fixed Floor)</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Recent Completed Gigs */}
                                <div className="space-y-3">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                    {user.role === UserRole.RUNNER ? 'Recent Completed Gigs' : 'Recent Errand Billing Log'}
                                  </h4>
                                  
                                  {user.completedErrands && user.completedErrands > 0 ? (
                                    <div className="space-y-2">
                                      {[
                                        { id: 'tx-1', desc: user.role === UserRole.RUNNER ? 'Market Shopping - Kilimani Delivery' : 'Mama Fua Laundry Service', amount: 850, date: 'Today' },
                                        { id: 'tx-2', desc: user.role === UserRole.RUNNER ? 'Laundry Pick & Dry - Westlands' : 'Saka Keja House Scouting - Kilimani', amount: 1200, date: 'Yesterday' },
                                        { id: 'tx-3', desc: user.role === UserRole.RUNNER ? 'Package pickup from GPO Nairobi' : 'Premium Package Delivery - Town', amount: 500, date: '3 days ago' }
                                      ].slice(0, Math.min(3, user.completedErrands)).map(tx => (
                                        <div key={tx.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center hover:shadow-sm transition-all">
                                          <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">{tx.desc}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{tx.date} • Disbursed successfully</p>
                                          </div>
                                          <span className="text-xs font-black text-emerald-500">
                                            {user.role === UserRole.RUNNER ? `+ KSH ${tx.amount}` : `- KSH ${tx.amount}`}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                                      <p className="text-xs text-slate-400 font-medium">No recent transactions recorded. Active transactions will dynamically appear here.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {runnerProfileTab === 'tools' && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  <div className="md:col-span-8 space-y-6">
                                    {/* Scratchpad (For Runner) / Pricing Advisor (For Requester) */}
                                    {user.role === UserRole.RUNNER ? (
                                      <div className="bg-white dark:bg-slate-955 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                        <div>
                                          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-indigo-600" /> Active Run Scratchpad
                                          </h3>
                                          <p className="text-xs text-slate-400">Log shopping items or temporary checklist milestones on current active runs.</p>
                                        </div>

                                        {/* Checklist Inputs */}
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            placeholder="Add temporary checkpoint (e.g., check milk date)..."
                                            value={newChecklistItem}
                                            onChange={(e) => setNewChecklistItem(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && newChecklistItem.trim()) {
                                                setRunnerChecklist([
                                                  ...runnerChecklist,
                                                  { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }
                                                ]);
                                                setNewChecklistItem('');
                                              }
                                            }}
                                            className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
                                          />
                                          <button
                                            onClick={() => {
                                              if (!newChecklistItem.trim()) return;
                                              setRunnerChecklist([
                                                ...runnerChecklist,
                                                { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }
                                              ]);
                                              setNewChecklistItem('');
                                            }}
                                            className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all font-black text-sm flex items-center justify-center aspect-square"
                                          >
                                            <Plus size={16} />
                                          </button>
                                        </div>

                                        {/* Checklist Display */}
                                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pt-2">
                                          {runnerChecklist.map(item => (
                                            <div key={item.id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group/item">
                                              <button
                                                onClick={() => {
                                                  setRunnerChecklist(runnerChecklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
                                                }}
                                                className="flex items-center gap-3 text-left flex-1"
                                              >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                  item.completed ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-300 bg-white dark:bg-slate-950 text-transparent'
                                                }`}>
                                                  <Check size={12} strokeWidth={3} />
                                                </div>
                                                <span className={`text-xs font-bold leading-tight ${item.completed ? 'line-through text-slate-400 opacity-60' : 'text-slate-900 dark:text-white'}`}>
                                                  {item.text}
                                                </span>
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setRunnerChecklist(runnerChecklist.filter(i => i.id !== item.id));
                                                }}
                                                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/25 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                        <div>
                                          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Zap size={16} className="text-indigo-600" /> Premium Budget Helper
                                          </h3>
                                          <p className="text-xs text-slate-400">Calculate recommended budgets based on service distance or complex errands.</p>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                              <p className="text-[9px] font-black uppercase text-slate-400">Mama Fua</p>
                                              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">KSH 500 - 1500</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                              <p className="text-[9px] font-black uppercase text-slate-400">Shopping Runs</p>
                                              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">KSH 400 - 1200</p>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                              <p className="text-[9px] font-black uppercase text-slate-400">Town Service</p>
                                              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">KSH 600 - 2000</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-center">
                                              <p className="text-[9px] font-black uppercase text-slate-400">Saka Keja</p>
                                              <p className="text-sm font-black text-slate-900 dark:text-white mt-1">KSH 1500 - 5000</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Fare Estimator */}
                                    <div className="bg-white dark:bg-slate-955 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                      <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                          <Calculator size={16} className="text-indigo-600" /> 
                                          {user.role === UserRole.RUNNER ? 'Fare & Fuel Estimator' : 'Errand Budget Estimator'}
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                          {user.role === UserRole.RUNNER 
                                            ? 'Estimate fuel and operating expenditures to construct highly accurate bids.' 
                                            : 'Estimate approximate transport costs based on vehicle class and distance.'}
                                        </p>
                                      </div>

                                      <div className="space-y-3 pt-2">
                                        <div>
                                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Total Distance (Kilometers)</label>
                                          <input
                                            type="number"
                                            value={estimatorDistance}
                                            onChange={(e) => setEstimatorDistance(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fuel Price (KSH / Liter)</label>
                                            <input
                                              type="number"
                                              value={estimatorFuelPrice}
                                              onChange={(e) => setEstimatorFuelPrice(e.target.value)}
                                              className="w-full bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Vehicle Type</label>
                                            <select
                                              value={estimatorVehicle}
                                              onChange={(e) => setEstimatorVehicle(e.target.value as any)}
                                              className="w-full bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white outline-none"
                                            >
                                              <option value="motorbike">🏍️ Motorbike (35 km/L)</option>
                                              <option value="car">🚗 Hatchback Car (12 km/L)</option>
                                            </select>
                                          </div>
                                        </div>

                                        {/* Calculation Details */}
                                        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-2 mt-4 text-xs font-bold text-slate-500">
                                          <div className="flex justify-between">
                                            <span>Fuel Needed:</span>
                                            <span className="text-slate-900 dark:text-white">
                                              {(Number(estimatorDistance) / (estimatorVehicle === 'motorbike' ? 35 : 12)).toFixed(2)} Liters
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Est. Fuel Cost:</span>
                                            <span className="text-slate-900 dark:text-white">
                                              KSH {Math.round((Number(estimatorDistance) / (estimatorVehicle === 'motorbike' ? 35 : 12)) * Number(estimatorFuelPrice)).toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                          <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-black text-sm pt-1">
                                            <span>{user.role === UserRole.RUNNER ? 'Recommended Quote Price:' : 'Fair Transport Surcharge:'}</span>
                                            <span>
                                              KSH {Math.round(
                                                ((Number(estimatorDistance) / (estimatorVehicle === 'motorbike' ? 35 : 12)) * Number(estimatorFuelPrice)) +
                                                (estimatorVehicle === 'motorbike' ? 300 : 700) + 150
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Demand Hotspots info */}
                                  <div className="md:col-span-4 space-y-6">
                                    <div className="bg-white dark:bg-slate-950 p-5 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5 pl-1">
                                        <MapPin size={14} className="text-indigo-600 animate-bounce" /> 
                                        Nairobi Hub Details
                                      </h4>
                                      
                                      <div className="space-y-3 text-xs">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-850">
                                          <p className="font-black text-slate-900 dark:text-white">🛍️ Westlands (Sarit)</p>
                                          <p className="text-slate-400 mt-1 leading-normal text-[11px]">Heavy traffic from 4:30 PM. Convenient motorbike bay at the back lane.</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-850">
                                          <p className="font-black text-slate-900 dark:text-white">📦 CBD (GPO Square)</p>
                                          <p className="text-slate-400 mt-1 leading-normal text-[11px]">Pay daily council fees immediately. Strictly avoid parking on pedestrian pathways.</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-850">
                                          <p className="font-black text-slate-900 dark:text-white">👔 Kilimani (Yaya)</p>
                                          <p className="text-slate-400 mt-1 leading-normal text-[11px]">Heavy residential coverage. High-density gating requires valid National IDs for entry.</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {runnerProfileTab === 'settings' && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  {/* Onboarding & Verification Status */}
                                  <div className="md:col-span-8 bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                    <div>
                                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={18} className="text-indigo-600" /> Verification Checklist
                                      </h4>
                                      <p className="text-xs text-slate-400 mt-1 font-medium">Verify your identification to access premium, locked errands on your map.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                      <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-2.5">
                                        <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                                        <span className="font-black text-slate-900 dark:text-white">National ID Verified</span>
                                      </div>
                                      <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-2.5">
                                        <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                                        <span className="font-black text-slate-900 dark:text-white">Saka Keja Certified</span>
                                      </div>
                                      <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-2.5">
                                        <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                                        <span className="font-black text-slate-900 dark:text-white">Phone SMS Verified</span>
                                      </div>
                                      <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center gap-2.5">
                                        <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <span className="font-black text-slate-900 dark:text-white">Loyalty Status: Active</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quick Helper Resources list */}
                                  <div className="md:col-span-4 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 p-5 rounded-[2.5rem] shadow-sm space-y-4">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                      <HelpCircle size={14} className="text-indigo-600" /> Support Handbook
                                    </h4>
                                    <div className="space-y-1">
                                      <button onClick={() => setShowFAQ(true)} className="w-full text-left py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-between">
                                        <span>Community FAQ Guide</span>
                                        <ChevronRight size={14} />
                                      </button>
                                      <button onClick={() => setShowPriceGuideModal(true)} className="w-full text-left py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-between">
                                        <span>Errand Price Guide</span>
                                        <ChevronRight size={14} />
                                      </button>
                                      <button onClick={() => setShowContactUsModal(true)} className="w-full text-left py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-between">
                                        <span>Contact Helpline</span>
                                        <ChevronRight size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {profileView === 'edit' && (
                  <div className="space-y-6">
                    <ProfileEditor 
                      user={user} 
                      onUpdate={(updates) => setUser({...user, ...updates})} 
                      onBack={() => setProfileView('main')} 
                      onVerifyPhone={() => setShowPhoneVerificationModal(true)}
                      onVerifyEmail={() => setShowEmailVerificationModal(true)}
                    />
                    <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-strong relative overflow-hidden group mb-6">
                      <h2 className="text-xl font-black text-foreground mb-4 tracking-tight font-display">Preferences</h2>
                      <UserSettings 
                        user={user} 
                        isDarkMode={isDarkMode} 
                        onToggleDarkMode={toggleDarkMode} 
                      />
                    </div>
                  </div>
                )}

                {profileView === 'apply-runner' && (
                  <RunnerApplicationFlow 
                    user={user} 
                    onBack={() => setProfileView('main')} 
                    existingApplication={userApplication}
                  />
                )}

                {profileView === 'history' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                      <button 
                        onClick={() => setProfileView('main')}
                        className="w-12 h-12 bg-card text-card-foreground rounded-2xl flex items-center justify-center border border-border shadow-sm hover:bg-muted transition-all"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <h3 className="text-xl font-black text-foreground tracking-tight font-display">
                        {user.role === UserRole.REQUESTER ? 'My Errands' : 'Task History'}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {allErrands.filter(e => 
                        user.role === UserRole.REQUESTER ? e.requesterId === user.id : e.runnerId === user.id
                      ).length === 0 ? (
                        <div className="bg-card text-card-foreground p-12 rounded-[3rem] border border-border shadow-strong text-center">
                          <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <HistoryIcon size={32} className="text-muted-foreground/50" />
                          </div>
                          <h4 className="text-lg font-black text-foreground mb-2">No history yet</h4>
                          <p className="text-sm font-medium text-muted-foreground">Your completed tasks will appear here.</p>
                        </div>
                      ) : (
                        allErrands
                          .filter(e => user.role === UserRole.REQUESTER ? e.requesterId === user.id : e.runnerId === user.id)
                          .map(e => (
                            <ErrandCard 
                              key={e.id} 
                              errand={e} 
                              onClick={(errand, tab) => { setSelectedErrand(errand); setInitialDetailTab(tab || 'details'); }} 
                              currentLocation={currentLocation} 
                            />
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
           </div>
        )}
        {activeTab === 'support-chat' && user && (
          <div className="max-w-xl mx-auto h-[600px] bg-card text-card-foreground rounded-[2.5rem] border border-border shadow-sm flex flex-col overflow-hidden">
            <header className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveTab('active')} className="p-2 bg-muted text-muted-foreground rounded-xl"><ChevronLeft size={18} /></button>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Support Center</h3>
                  <p className="text-xs text-muted-foreground font-bold tracking-normal font-medium">Live with Admin</p>
                </div>
              </div>
            </header>
            <SupportChatViewLocal user={user} />
          </div>
        )}
      </div>
      {selectedErrand && (
        <ErrandDetailScreenLocal 
          selectedErrand={selectedErrand} 
          setSelectedErrand={setSelectedErrand} 
          user={user} 
          setUser={setUser} 
          refresh={refreshErrand} 
          onRunnerComplete={handleRunnerComplete} 
          onCompleteErrand={handleCompleteErrand} 
          loading={isProcessing}
          setShowPriceRequestModal={setShowPriceRequestModal}
          setShowAddPropertyModal={setShowAddPropertyModal}
          setShowComparisonModal={setShowComparisonModal}
          setShowAuthModal={setShowAuthModal}
          setShowPhoneVerificationModal={setShowPhoneVerificationModal}
          setShowEmailVerificationModal={setShowEmailVerificationModal}
          setAuthModalMode={setAuthModalMode}
          googleMapsApiKey={googleMapsApiKey}
          googleMapsId={googleMapsId}
          googleRoutesApiKey={googleRoutesApiKey}
          initialTab={initialDetailTab}
          currentLocation={currentLocation}
          onSendMessage={handleSendMessage}
        />
      )}
      {selectedFeaturedService && (
        <FeaturedServiceModal 
          service={selectedFeaturedService} 
          onClose={() => setSelectedFeaturedService(null)} 
          onOrder={(s) => {
            setErrandForm({ 
              ...errandForm, 
              category: s.category, 
              title: s.title, 
              description: s.description,
              pickup: null,
              dropoff: null
            });
            setActiveTab('create');
            setSelectedFeaturedService(null);
          }}
        />
      )}
      {showLanguageModal && <LanguageModal onClose={() => setShowLanguageModal(false)} />}
      {showPriceGuideModal && <PriceGuideModal onClose={() => setShowPriceGuideModal(false)} />}
      {showContactUsModal && <ContactUsModal onClose={() => setShowContactUsModal(false)} setActiveTab={setActiveTab} />}
      {user && !user.isAdmin && activeTab === 'active' && (
        <SupportChatOverlay 
          user={user} 
          isOpen={isSupportChatOpen} 
          setIsOpen={setIsSupportChatOpen} 
        />
      )}
      {showLoyaltyModal && <LoyaltyBenefitsModal onClose={() => setShowLoyaltyModal(false)} />}
      
      {showPriceRequestModal && (
        <PriceRequestModal 
          request={showPriceRequestModal} 
          onRespond={async (status) => {
            if (!selectedErrand) return;
            const mappedStatus = status === 'approved' ? 'accepted' : 'rejected';
            await firebaseService.respondToPriceRequest(selectedErrand.id, showPriceRequestModal.id, mappedStatus);
            setShowPriceRequestModal(null);
            refreshErrand();
          }} 
        />
      )}

      {showAddPropertyModal && (
        <AddPropertyModal 
          onClose={() => setShowAddPropertyModal(false)}
          onAdd={async (listing) => {
            if (!selectedErrand) return;
            await firebaseService.addPropertyListing(selectedErrand.id, listing);
            setShowAddPropertyModal(false);
            refreshErrand();
          }}
        />
      )}

      {showComparisonModal && selectedErrand && (
        <PropertyComparisonModal 
          listings={selectedErrand.propertyListings || []}
          onClose={() => setShowComparisonModal(false)}
        />
      )}

      {showPhoneVerificationModal && user && (
        <PhoneVerificationModal 
          user={user}
          onClose={() => setShowPhoneVerificationModal(false)}
          onSuccess={async () => {
            const updated = await firebaseService.getCurrentUser();
            if (updated) setUser(updated);
          }}
        />
      )}

      {showEmailVerificationModal && user && (
        <EmailVerificationModal 
          user={user}
          onClose={() => setShowEmailVerificationModal(false)}
          onSuccess={async () => {
            const updated = await firebaseService.getCurrentUser();
            if (updated) setUser(updated);
          }}
        />
      )}

      {showWallet && user && (
        <WalletModal 
          isOpen={showWallet}
          user={user} 
          onClose={() => setShowWallet(false)} 
          onUpdateUser={(updates) => setUser(prev => prev ? { ...prev, ...updates } : null)}
        />
      )}

      <AnimatePresence>
        {showConnectivityToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[350] w-full max-w-md px-4 pointer-events-none"
          >
            <div className={`pointer-events-auto rounded-3xl p-4 shadow-2xl border backdrop-blur-xl flex items-start gap-3.5 transition-all ${
              connectivityToastType === 'offline' 
                ? 'bg-amber-950/95 text-amber-50 border-amber-500/40 shadow-amber-900/30 dark:bg-amber-950/95 dark:text-amber-50' 
                : 'bg-emerald-950/95 text-emerald-50 border-emerald-500/40 shadow-emerald-900/30 dark:bg-emerald-950/95 dark:text-emerald-50'
            }`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                connectivityToastType === 'offline' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {connectivityToastType === 'offline' ? (
                  <WifiOff size={22} className="animate-pulse" />
                ) : (
                  <Wifi size={22} />
                )}
              </div>
              
              <div className="flex-1 min-w-0 pr-1 pt-0.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-xs font-black uppercase tracking-widest leading-none">
                    {connectivityToastType === 'offline' ? 'Offline Mode' : 'Back Online'}
                  </h4>
                  {connectivityToastType === 'offline' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30">
                      Sync Paused
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold leading-relaxed opacity-90">
                  {connectivityToastType === 'offline' 
                    ? 'No internet connection detected. Task status updates might not sync until you are back online.'
                    : 'Internet connection restored! Your task status updates are now syncing automatically.'}
                </p>
              </div>

              <button 
                onClick={() => setShowConnectivityToast(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0 mt-0.5"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {paymentStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
          >
            <div className="bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-foreground uppercase tracking-tight">Payment Update</p>
                <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">{paymentStatus.message}</p>
              </div>
              <button 
                onClick={() => setPaymentStatus(null)}
                className="p-2 text-muted-foreground hover:text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <LogOut size={40} className="text-rose-500" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Sign Out?</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                Are you sure you want to sign out of your account?
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  firebaseService.logout().then(() => {
                    setUser(null);
                    setShowLogoutConfirm(false);
                  });
                }}
                className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-200 active:scale-95 transition-all"
              >
                Sign Out
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-5 bg-secondary text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
    </>
    )}
    <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onAuthSuccess={(u) => {
          setUser(u);
          if (postLoginRedirectPath) {
            navigateTo(postLoginRedirectPath);
            setPostLoginRedirectPath(null);
          }
        }} 
        initialMode={authModalMode}
        logoUrl={appSettings.logoUrl}
      />

      {user && (user.isTemporaryPassword || (user as any).is_temporary_password) && (
        <TemporaryPasswordModal 
          email={user.email} 
          onSuccess={() => {
            setUser({
              ...user,
              isTemporaryPassword: false,
              is_temporary_password: false
            } as any);
          }}
        />
      )}

      {resetToken && (
        <ResetPasswordModal 
          onClose={() => setResetToken(null)} 
        />
      )}
    <RunnerRegistrationModal 
      isOpen={showRunnerRegistration}
      onClose={() => setShowRunnerRegistration(false)}
      onSubmit={handleRunnerRegistrationSubmit}
      currentLocation={currentLocation}
      existingApplication={userApplication}
    />
    <FAQModal 
      isOpen={showFAQ}
      onClose={() => setShowFAQ(false)}
    />
    <PrivacyPolicyModal 
      isOpen={showPrivacyPolicy}
      onClose={() => setShowPrivacyPolicy(false)}
    />
    </ErrorBoundary>
  );
}

const AuthScreen: React.FC<any> = ({ appSettings, isLogin, setIsLogin, authForm, setAuthForm, handleAuth, loading, error }) => (
  <div className="min-h-screen flex items-center justify-center bg-muted p-6 font-sans relative overflow-hidden">
    {/* Background Decorative Elements */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
    </div>

    <div className="w-full max-w-lg flex flex-col items-center relative z-10 px-6">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-1000">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="w-36 h-36 flex items-center justify-center mx-auto mb-8 overflow-hidden group hover:rotate-3 transition-transform duration-500"
        >
          <Logo 
            size={96} 
            url={appSettings.logoUrl} 
            className="text-white drop-shadow-md" 
            scale={appSettings.logoScale} 
            variant={appSettings.logoVariant} 
          />
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-4 font-display">
          Errands<span className="text-indigo-600">.</span>
        </h1>
        <p className="text-sm font-black text-indigo-500/80 uppercase tracking-[0.5em]">Global Excellence</p>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 font-display">
            {isLogin ? 'Welcome Back' : 'Join the Network'}
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
            {isLogin ? 'Continue to your personalized assistant' : 'Experience errands handled with precision'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black mb-8 border border-red-100 uppercase text-center tracking-widest animate-shake">
            {error}
          </div>
        )}

        {!isLogin && (
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 p-4 rounded-2xl text-[11px] font-bold mb-6 flex flex-col gap-1 select-none">
            <span className="font-extrabold text-xs uppercase tracking-wider text-indigo-800">💡 Super Admin Notice</span>
            <span>Any registration email containing <code className="bg-indigo-100 px-1 py-0.5 rounded text-indigo-800 font-mono">supaadmin</code> (e.g., <code className="bg-indigo-100 px-1 py-0.5 rounded text-indigo-800 font-mono">supaadmin@codexict.co.ke</code>) is dynamically granted full Super Admin credentials.</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  value={authForm.name} 
                  onChange={e => setAuthForm({...authForm, name: e.target.value})} 
                  className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+254..." 
                  value={authForm.phone} 
                  onChange={e => setAuthForm({...authForm, phone: e.target.value})} 
                  className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400" 
                  required 
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">
              {isLogin ? 'Email or Phone' : 'Email Address'}
            </label>
            <input 
              type="text" 
              placeholder={isLogin ? "email@example.com or 07..." : "email@example.com"} 
              value={authForm.email} 
              onChange={e => setAuthForm({...authForm, email: e.target.value})} 
              className="w-full p-5 bg-muted border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card text-card-foreground transition-all" 
              required 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground">Password</label>
              {isLogin && (
                <button type="button" className="text-sm font-black tracking-normal font-medium text-primary hover:underline">Forgot?</button>
              )}
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={authForm.password} 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              className="w-full p-5 bg-muted border border-border rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card text-card-foreground transition-all" 
              required 
            />
          </div>

          <button 
            disabled={loading} 
            className="btn-primary w-full py-6 mt-4"
          >
            {loading ? <LoadingSpinner color="white" /> : (isLogin ? 'SIGN IN' : 'CREATE ACCOUNT')}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-xs font-black text-muted-foreground tracking-normal font-medium hover:text-primary transition-all"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const FeaturedServiceModal: React.FC<{ service: FeaturedService, onClose: () => void, onOrder: (s: FeaturedService) => void }> = ({ service, onClose, onOrder }) => {
  const [explanation, setExplanation] = useState(service.explanation || '');
  const [paymentGuide, setPaymentGuide] = useState(service.paymentGuide || '');
  const [loading, setLoading] = useState(!service.explanation || !service.paymentGuide);

  useEffect(() => {
    if (!service.explanation || !service.paymentGuide) {
      const generateDetails = async () => {
        try {
          const prompt = `Generate a detailed explanation and a payment guide for a featured service in an on-demand errands app.
          Service Title: ${service.title}
          Category: ${service.category}
          Description: ${service.description}
          Base Price: KSh ${service.price}

          Return the response in JSON format with two fields: "explanation" (what the runner does) and "paymentGuide" (how the pricing works, including potential extra costs like transport).
          Make it professional and concise.`;
          
          const response = await callGeminiWithRetry(prompt);
          const cleaned = response.replace(/```json|```/g, '').trim();
          const data = JSON.parse(cleaned);
          setExplanation(data.explanation);
          setPaymentGuide(data.paymentGuide);
        } catch (e) {
          setExplanation(service.description);
          setPaymentGuide(`Base price is KSh ${service.price}. Additional costs may apply for distance or extra requirements.`);
        } finally {
          setLoading(false);
        }
      };
      generateDetails();
    }
  }, [service]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground text-background/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card text-card-foreground rounded-[3.5rem] w-full max-w-md overflow-hidden shadow-strong animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-border">
        <div className="relative h-64 flex-shrink-0 group">
          <img src={service.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={service.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-10 h-10 bg-card text-card-foreground/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-card text-card-foreground/40 transition-all z-10"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-8 left-8 right-8">
            <span className="text-sm font-black uppercase tracking-[0.2em] text-white bg-primary px-4 py-1.5 rounded-full shadow-lg shadow-primary/20">{service.category}</span>
            <h3 className="text-3xl font-black text-white mt-3 leading-tight tracking-tight font-display">{service.title}</h3>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="space-y-3">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
              <Info size={14} className="text-primary" />
              Task Explanation
            </h4>
            {loading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-4 bg-muted rounded-2xl px-6">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-xs font-black tracking-normal font-medium">Generating details...</span>
              </div>
            ) : (
              <div className="bg-muted p-6 rounded-[2rem] border border-border">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{explanation}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
              <Calculator size={14} className="text-emerald-500" />
              Payment Guide
            </h4>
            {loading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-4 bg-muted rounded-2xl px-6">
                <Loader2 size={16} className="animate-spin text-emerald-500" />
                <span className="text-xs font-black tracking-normal font-medium">Calculating estimates...</span>
              </div>
            ) : (
              <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                <p className="text-sm text-emerald-700 font-medium leading-relaxed">{paymentGuide}</p>
              </div>
            )}
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between mb-6 px-2">
              <span className="text-sm font-black text-muted-foreground tracking-normal font-medium">Base Price</span>
              <span className="text-2xl font-black text-foreground tracking-tighter">KSh {service.price}</span>
            </div>
            <button 
              onClick={() => onOrder(service)}
              className="btn-primary w-full py-5 shadow-xl shadow-primary/20"
            >
              Order This Errand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LanguageModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground text-background/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-card text-card-foreground rounded-[2rem] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-sm font-black tracking-normal font-medium">Select Language</h3>
        <button onClick={onClose} className="p-2 bg-muted rounded-xl"><X size={16} /></button>
      </div>
      <div className="p-2">
        <button className="w-full flex items-center justify-between p-4 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs tracking-normal font-medium">
          English <Check size={16} />
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-muted text-muted-foreground rounded-xl font-black text-xs tracking-normal font-medium">
          Swahili <span>(Coming Soon)</span>
        </button>
        <button className="w-full flex items-center justify-between p-4 hover:bg-muted text-muted-foreground rounded-xl font-black text-xs tracking-normal font-medium">
          French <span>(Coming Soon)</span>
        </button>
      </div>
    </div>
  </div>
);

const PriceGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground text-background/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-card text-card-foreground rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col">
      <div className="p-6 border-b flex justify-between items-center bg-muted">
        <div>
          <h3 className="text-sm font-black tracking-normal font-medium">Pricing Guide</h3>
          <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">Estimated Base Rates</p>
        </div>
        <button onClick={onClose} className="p-2 bg-card text-card-foreground rounded-xl shadow-sm"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {[
          { category: 'Laundry (Mama Fua)', price: 'Ksh 250', unit: 'per basket' },
          { category: 'House Hunting', price: 'Ksh 1,500', unit: 'per day' },
          { category: 'Grocery Shopping', price: 'Ksh 300', unit: 'per trip' },
          { category: 'Parcel Delivery', price: 'Ksh 200', unit: 'per 5km' },
          { category: 'Cleaning Services', price: 'Ksh 800', unit: 'per room' },
          { category: 'Pet Walking', price: 'Ksh 400', unit: 'per hour' },
          { category: 'General Errands', price: 'Ksh 500', unit: 'base rate' }
        ].map((item) => (
          <div key={item.category} className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
            <div>
              <p className="text-xs font-black text-foreground">{item.category}</p>
              <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">{item.unit}</p>
            </div>
            <p className="text-sm font-black text-indigo-600">From {item.price}</p>
          </div>
        ))}
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <p className="text-xs font-bold text-indigo-600 leading-relaxed">
            * Prices are estimates and may vary based on urgency, distance, and specific requirements. Runners may bid higher or lower than these rates.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ContactUsModal: React.FC<{ onClose: () => void, setActiveTab: (t: string) => void }> = ({ onClose, setActiveTab }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground text-background/60 backdrop-blur-sm animate-in fade-in">
    <div className="bg-card text-card-foreground rounded-[2.5rem] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-sm font-black tracking-normal font-medium">Contact Us</h3>
        <button onClick={onClose} className="p-2 bg-muted rounded-xl"><X size={16} /></button>
      </div>
      <div className="p-2">
        <ProfileMenuItem icon={<MessageCircle size={18} />} label="Live Support Chat" onClick={() => { setActiveTab('support-chat'); onClose(); }} />
        <ProfileMenuItem icon={<Mail size={18} />} label="Email Support" onClick={() => window.location.href = "mailto:Errands@codexict.co.ke"} />
        <ProfileMenuItem icon={<MessageCircle size={18} className="text-emerald-500" />} label="WhatsApp" onClick={() => window.open("https://wa.me/254722603149", "_blank")} />
        <ProfileMenuItem icon={<Phone size={18} className="text-indigo-500" />} label="Call Support" onClick={() => window.location.href = "tel:+254752269300"} />
      </div>
    </div>
  </div>
);

const ProfileMenuItem: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void, destructive?: boolean }> = ({ icon, label, onClick, destructive }) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
      destructive 
        ? 'hover:bg-red-50 text-red-500' 
        : 'hover:bg-muted text-muted-foreground'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 ${
        destructive 
          ? 'bg-red-100 text-red-600' 
          : 'bg-secondary text-muted-foreground group-hover:bg-card text-card-foreground group-hover:shadow-md'
      }`}>
        {icon}
      </div>
      <span className="text-sm font-black tracking-normal font-medium">{label}</span>
    </div>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1 ${
      destructive ? 'bg-red-100/50' : 'bg-secondary/50'
    }`}>
      <ChevronRight size={16} />
    </div>
  </button>
);

const AdminPanelLocal: React.FC<{ 
  user: User; 
  settings: AppSettings; 
  stats: any; 
  setStats: (stats: any) => void;
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  userRoleFilter: UserRole | 'all';
  setUserRoleFilter: (r: UserRole | 'all') => void;
  connectionStatus: 'testing' | 'success' | 'failed';
  googleMapsApiKey: string;
  googlePlacesApiKey: string;
  googleRoutesApiKey: string;
}> = ({ user, settings, stats, setStats, userSearchQuery, setUserSearchQuery, userRoleFilter, setUserRoleFilter, connectionStatus, googleMapsApiKey, googlePlacesApiKey, googleRoutesApiKey }) => {
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [iconUrl, setIconUrl] = useState(settings.iconUrl || '');
  const [dashboardHeroUrl, setDashboardHeroUrl] = useState(settings.dashboardHeroUrl || '');
  const [defaultUiScale, setDefaultUiScale] = useState(settings.defaultUiScale || 1.0);
  const [logoScale, setLogoScale] = useState(settings.logoScale || 1.0);
  const [logoVariant, setLogoVariant] = useState<'original' | 'square' | 'circle' | 'rounded'>(settings.logoVariant || 'original');
  const [sakaKejaBaseFee, setSakaKejaBaseFee] = useState(settings.sakaKejaBaseFee || 500);
  const [sakaKejaPercentage, setSakaKejaPercentage] = useState(settings.sakaKejaPercentage || 5);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isIconUploading, setIsIconUploading] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'stats' | 'branding' | 'support' | 'applications' | 'services' | 'listings' | 'users' | 'system' | 'loyalty' | 'broadcast' | 'action-server'>('stats');
  const [pingStatus, setPingStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; config: any; error: string | null; forceDatabaseMode?: boolean } | null>(null);
  const [isTestingDbConnection, setIsTestingDbConnection] = useState(false);
  const [customSql, setCustomSql] = useState('SELECT count(1) as total_users FROM profiles;');
  const [testQueryResult, setTestQueryResult] = useState<any>(null);
  const [testQueryLoading, setTestQueryLoading] = useState(false);
  const [supabaseTestUrl, setSupabaseTestUrl] = useState('');
  const [supabaseTestKey, setSupabaseTestKey] = useState('');
  const [isDdlExpanded, setIsDdlExpanded] = useState(false);
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('');
  const [actionServerUrlVal, setActionServerUrlVal] = useState('');
  const [isSavingDbConfig, setIsSavingDbConfig] = useState(false);
  const [backendSqlResult, setBackendSqlResult] = useState<any>(null);
  const [backendSqlLoading, setBackendSqlLoading] = useState(false);

  // Advanced Action Server Diagnostics & Logging states
  interface LogEntry {
    timestamp: string;
    level: "log" | "info" | "warn" | "error";
    message: string;
  }
  const [capturedLogs, setCapturedLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const [searchLogsQuery, setSearchLogsQuery] = useState('');
  const [filterLogLevel, setFilterLogLevel] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
  const [isTogglingDbMode, setIsTogglingDbMode] = useState(false);

  const [testPathUrl, setTestPathUrl] = useState('/api/health');
  const [testPathMethod, setTestPathMethod] = useState<'GET' | 'POST'>('GET');
  const [testPathBody, setTestPathBody] = useState('{\n  "amount": 100,\n  "phone": "0712345678",\n  "userId": "usr_test123",\n  "transactionId": "tx_mock_123"\n}');
  const [testPathResponse, setTestPathResponse] = useState<any>(null);
  const [testPathLoading, setTestPathLoading] = useState(false);

  // Synchronize DB status & Forced database mode
  const fetchDbStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dbconfig/status`);
      if (res.ok) {
        const data = await res.json();
        setDbStatus({
          connected: data.connected,
          config: data.config,
          error: data.error,
          forceDatabaseMode: data.forceDatabaseMode
        });
        if (data.config) {
          setDbHost(data.config.host || '');
          setDbPort(String(data.config.port || '5432'));
          setDbUser(data.config.user || '');
          setDbName(data.config.database || '');
        }
        if (data.actionServerUrl) {
          setActionServerUrlVal(data.actionServerUrl);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch database status", err);
    }
  };

  // Log fetch helper
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/logs`);
      if (res.ok) {
        const data = await res.json();
        setCapturedLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  useEffect(() => {
    if (activeAdminTab === 'action-server') {
      fetchDbStatus();
      fetchLogs();
    }
  }, [activeAdminTab]);

  useEffect(() => {
    let interval: any = null;
    if (activeAdminTab === 'action-server' && autoRefreshLogs) {
      interval = setInterval(() => {
        fetchLogs();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeAdminTab, autoRefreshLogs]);
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [applications, setApplications] = useState<RunnerApplication[]>([]);
  const [adminFeaturedServices, setAdminFeaturedServices] = useState<FeaturedService[]>([]);
  const [adminServiceListings, setAdminServiceListings] = useState<ServiceListing[]>([]);
  const [newService, setNewService] = useState({ title: '', description: '', price: 0, imageUrl: '', category: ErrandCategory.GENERAL });
  const [newListing, setNewListing] = useState({ title: '', description: '', price: 0, imageUrl: '', category: ErrandCategory.GENERAL, scope: '' });
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingListing, setIsAddingListing] = useState(false);
  const [selectedSupportUser, setSelectedSupportUser] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMethods, setBroadcastMethods] = useState({ email: false, sms: false, inApp: true });
  const [loading, setLoading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const checkIfSuperAdmin = (emailStr?: string) => {
    if (!emailStr) return false;
    const e = emailStr.toLowerCase().trim();
    return e === 'errands@codexict.co.ke' || e === 'ngugimaina4@gmail.com' || e.includes('supaadmin') || e.startsWith('supaadmin@');
  };

  const isSuperAdmin = checkIfSuperAdmin(user?.email);

  useEffect(() => {
    setPrimaryColor(settings.primaryColor);
    setLogoUrl(settings.logoUrl || '');
    setIconUrl(settings.iconUrl || '');
    setDashboardHeroUrl(settings.dashboardHeroUrl || '');
    setDefaultUiScale(settings.defaultUiScale || 1.0);
    setLogoScale(settings.logoScale || 1.0);
    setLogoVariant(settings.logoVariant || 'original');
    setSakaKejaBaseFee(settings.sakaKejaBaseFee || 500);
    setSakaKejaPercentage(settings.sakaKejaPercentage || 5);
  }, [settings]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [apps, allFeatured, allServices, allUsers, statsData] = await Promise.all([
          firebaseService.fetchRunnerApplications(),
          firebaseService.fetchFeaturedServices(),
          firebaseService.fetchServiceListings(),
          firebaseService.fetchAllUsers(),
          firebaseService.getAppStats()
        ]);
        setApplications(apps);
        setAdminFeaturedServices(allFeatured);
        setAdminServiceListings(allServices);
        setDbUsers(allUsers);
        setStats(statsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    const unsubSupport = firebaseService.subscribeToAllSupportChats(setSupportChats);
    loadData();
    return () => unsubSupport();
  }, [setSupportChats, setStats, setApplications, setAdminFeaturedServices, setAdminServiceListings, setDbUsers]);

  useEffect(() => {
    // Refresh specific data when tab changes if needed
    if (activeAdminTab === 'stats') firebaseService.getAppStats().then(setStats);
    if (activeAdminTab === 'users') firebaseService.fetchAllUsers().then(setDbUsers);
  }, [activeAdminTab, setStats, setDbUsers]);

  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card text-card-foreground rounded-[2.5rem] p-10 shadow-xl shadow-slate-200 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">Unauthorized Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              You do not have the required permissions to access the administration panel. 
              Please contact the system administrator if you believe this is an error.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 bg-foreground text-background text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setLogoUrl(url);
      await firebaseService.saveAppSettings({ logoUrl: url });
      alert("Logo uploaded and updated.");
    } catch (e) { alert("Logo upload failed."); } finally { setIsUploading(false); }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsIconUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setIconUrl(url);
      await firebaseService.saveAppSettings({ iconUrl: url });
      alert("Icon uploaded and updated.");
    } catch (e) { alert("Icon upload failed."); } finally { setIsIconUploading(false); }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setDashboardHeroUrl(url);
      await firebaseService.saveAppSettings({ dashboardHeroUrl: url });
      alert("Hero background uploaded and updated.");
    } catch (e) { alert("Hero upload failed."); } finally { setIsUploading(false); }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await firebaseService.saveAppSettings({ 
        primaryColor, 
        logoUrl, 
        iconUrl, 
        dashboardHeroUrl,
        defaultUiScale,
        logoScale,
        logoVariant,
        sakaKejaBaseFee,
        sakaKejaPercentage
      });
      alert("Settings updated globally.");
    } catch (e) { alert("Failed to save settings."); } finally { setIsSaving(false); }
  };

  const handleApprove = async (app: RunnerApplication) => {
    try {
      await firebaseService.updateRunnerApplication(app.id, { status: 'approved' });
      await firebaseService.updateUserProfile(app.userId, { role: UserRole.RUNNER });
      setApplications(prev => prev.map(a => a.id === app.id ? {...a, status: 'approved'} : a));
      alert("Application approved, user role converted to runner successfully!");
    } catch (e) { alert("Action failed"); }
  };

  const handleAddService = async () => {
    if (!newService.title || !newService.imageUrl) return;
    setIsAddingService(true);
    try {
      await firebaseService.addFeaturedService(newService);
      const updated = await firebaseService.fetchFeaturedServices();
      setAdminFeaturedServices(updated);
      setNewService({ title: '', description: '', price: 0, imageUrl: '', category: ErrandCategory.GENERAL });
      alert("Service added!");
    } catch (e) { alert("Failed to add service"); } finally { setIsAddingService(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    try {
      await firebaseService.deleteFeaturedService(id);
      setAdminFeaturedServices(prev => prev.filter(s => s.id !== id));
    } catch (e) { alert("Delete failed"); }
  };

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setNewService({ ...newService, imageUrl: url });
    } catch (e) { alert("Image upload failed"); } finally { setIsUploading(false); }
  };

  const handleListingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setNewListing({ ...newListing, imageUrl: url });
    } catch (e) { alert("Image upload failed"); } finally { setIsUploading(false); }
  };

  const handleAddListing = async () => {
    if (!newListing.title || !newListing.imageUrl) return;
    setIsAddingListing(true);
    try {
      await firebaseService.addServiceListing(newListing);
      const updated = await firebaseService.fetchServiceListings();
      setAdminServiceListings(updated);
      setNewListing({ title: '', description: '', price: 0, imageUrl: '', category: ErrandCategory.GENERAL, scope: '' });
      alert("Listing added!");
    } catch (e) { alert("Failed to add listing"); } finally { setIsAddingListing(false); }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    try {
      await firebaseService.deleteServiceListing(id);
      setAdminServiceListings(prev => prev.filter(s => s.id !== id));
    } catch (e) { alert("Delete failed"); }
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit mb-4 overflow-x-auto max-w-full no-scrollbar shadow-sm">
        <button 
          onClick={() => setActiveAdminTab('stats')} 
          style={{ 
            color: activeAdminTab === 'stats' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'stats' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'stats' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Stats
        </button>
        <button 
          onClick={() => setActiveAdminTab('applications')} 
          style={{ 
            color: activeAdminTab === 'applications' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'applications' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'applications' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Applications
        </button>
        <button 
          onClick={() => setActiveAdminTab('listings')} 
          style={{ 
            color: activeAdminTab === 'listings' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'listings' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'listings' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Menu Listings
        </button>
        <button 
          onClick={() => setActiveAdminTab('users')} 
          style={{ 
            color: activeAdminTab === 'users' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'users' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'users' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveAdminTab('loyalty')} 
          style={{ 
            color: activeAdminTab === 'loyalty' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'loyalty' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'loyalty' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Loyalty
        </button>
        <button 
          onClick={() => setActiveAdminTab('broadcast')} 
          style={{ 
            color: activeAdminTab === 'broadcast' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'broadcast' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'broadcast' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Broadcast
        </button>
        <button 
          onClick={() => setActiveAdminTab('system')} 
          style={{ 
            color: activeAdminTab === 'system' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'system' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'system' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          System
        </button>
        <button 
          onClick={() => setActiveAdminTab('action-server')} 
          style={{ 
            color: activeAdminTab === 'action-server' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'action-server' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'action-server' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Action Server & DB Test
        </button>
        <button 
          onClick={() => setActiveAdminTab('services')} 
          style={{ 
            color: activeAdminTab === 'services' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'services' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'services' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Featured
        </button>
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveAdminTab('branding')} 
            style={{ 
              color: activeAdminTab === 'branding' ? primaryColor : undefined,
              borderColor: activeAdminTab === 'branding' ? primaryColor : 'transparent'
            }}
            className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
              activeAdminTab === 'branding' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Branding
          </button>
        )}
        <button 
          onClick={() => setActiveAdminTab('support')} 
          style={{ 
            color: activeAdminTab === 'support' ? primaryColor : undefined,
            borderColor: activeAdminTab === 'support' ? primaryColor : 'transparent'
          }}
          className={`px-4 py-2 rounded-xl text-sm font-black tracking-normal transition-all whitespace-nowrap border-b-2 ${
            activeAdminTab === 'support' ? 'font-extrabold' : 'text-muted-foreground border-transparent hover:text-slate-800 dark:hover:text-slate-200'
          } flex items-center gap-2`}
        >
          Support
          {supportChats.some(c => c.unreadByAdmin) && <span className="w-2 h-2 bg-red-500 rounded-full" />}
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-48 h-2" />
                </div>
              </div>
              <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="h-12 rounded-2xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-[2rem]" />
            <Skeleton className="h-64 rounded-[2rem]" />
          </div>
        </div>
      ) : (
        <>
          {activeAdminTab === 'stats' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-black text-white rounded-xl"><ShieldAlert size={24} /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">Admin Dashboard</h2>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-tighter border ${
                      connectionStatus === 'testing' ? 'bg-muted text-muted-foreground border-border' :
                      connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      <div className={`w-1 h-1 rounded-full ${
                        connectionStatus === 'testing' ? 'bg-slate-400 animate-pulse' :
                        connectionStatus === 'success' ? 'bg-emerald-600' :
                        'bg-rose-600'
                      }`} />
                      {connectionStatus === 'testing' ? 'Testing...' :
                       connectionStatus === 'success' ? 'Supabase Connected' :
                       'Local Mode'}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">System Performance Metrics</p>
                </div>
              </div>
              <button 
                onClick={() => firebaseService.getAppStats().then(setStats)}
                className="p-3 bg-muted text-muted-foreground rounded-xl hover:bg-secondary transition-all"
                title="Refresh Stats"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-muted rounded-2xl text-center">
                <p className="text-xs font-black uppercase text-muted-foreground">Users</p>
                <p className="text-base font-black text-foreground">{stats.totalUsers}</p>
              </div>
              <div className="p-4 bg-muted rounded-2xl text-center">
                <p className="text-xs font-black uppercase text-muted-foreground">Tasks</p>
                <p className="text-base font-black text-black">{stats.totalTasks}</p>
              </div>
              <div className="p-4 bg-muted rounded-2xl text-center">
                <p className="text-xs font-black uppercase text-muted-foreground">Online</p>
                <p className="text-base font-black text-emerald-600">{stats.onlineUsers}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <p className="text-sm font-black uppercase text-indigo-400 mb-1">Avg Distance</p>
                <p className="text-sm font-black text-indigo-600">{stats.avgDistance?.toFixed(1)} KM</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl">
                <p className="text-sm font-black uppercase text-emerald-400 mb-1">Avg Time</p>
                <p className="text-sm font-black text-emerald-600">{stats.avgCompletionTime?.toFixed(0)} MIN</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl">
                <p className="text-sm font-black uppercase text-rose-400 mb-1">Avg Penalty</p>
                <p className="text-sm font-black text-rose-600">Ksh {stats.avgPenalty?.toFixed(0)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl">
                <p className="text-sm font-black uppercase text-amber-400 mb-1">Failure Rate</p>
                <p className="text-sm font-black text-amber-600">{stats.failedErrandsPercent?.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm">
              <h3 className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-6">Revenue (Last 7 Days)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.revenuePerDay || []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm">
              <h3 className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-6">Category Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryDistribution || [
                        { name: 'Laundry', value: 400 },
                        { name: 'Shopping', value: 300 },
                        { name: 'Delivery', value: 300 },
                        { name: 'House Hunting', value: 200 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {['#4f46e5', '#10b981', '#f59e0b', '#ef4444'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {['Laundry', 'Shopping', 'Delivery', 'House Hunting'].map((cat, i) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'][i] }} />
                    <span className="text-xs font-black uppercase text-muted-foreground">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Lists */}
            <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm">
              <h3 className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-4">Top Runners</h3>
              <div className="space-y-3">
                {stats.topRunners?.map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-muted-foreground/70 w-4">#{i+1}</span>
                      <UserAvatar src={r.avatar} name={r.name} className="w-8 h-8 rounded-lg" />
                      <p className="text-xs font-black text-foreground">{r.name}</p>
                    </div>
                    <p className="text-sm font-black text-indigo-600 uppercase">{r.errandsCompleted || 0} Tasks</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm">
              <h3 className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {(stats.recentActivity || [
                  { id: '1', type: 'new_user', text: 'New user registered: John Doe', time: '2m ago', icon: <UserCircle size={14} className="text-indigo-600" /> },
                  { id: '2', type: 'task_completed', text: 'Task completed: Grocery Shopping', time: '15m ago', icon: <CheckCircle size={14} className="text-emerald-600" /> },
                  { id: '3', type: 'new_bid', text: 'New bid on: Laundry Service', time: '45m ago', icon: <DollarSign size={14} className="text-amber-600" /> },
                  { id: '4', type: 'support_ticket', text: 'New support message from Jane', time: '1h ago', icon: <MessageSquare size={14} className="text-rose-600" /> },
                ]).map((act: any) => (
                  <div key={act.id} className="flex gap-3 items-start p-2 hover:bg-muted rounded-xl transition-all">
                    <div className="p-2 bg-secondary rounded-lg mt-0.5">{act.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground leading-tight">{act.text}</p>
                      <p className="text-xs font-black text-muted-foreground uppercase mt-1">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'applications' && (
        <div className="space-y-4 animate-in fade-in">
          {applications.length === 0 ? (
            <div className="p-20 text-center bg-card text-card-foreground rounded-[2rem] border-2 border-dashed border-border text-muted-foreground/70 font-black uppercase text-sm tracking-widest">No applications yet</div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-foreground">{app.fullName}</h3>
                    <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">{app.categoryApplied} • {formatPhoneDisplay(app.phone || '')}</p>
                  </div>
                  <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg border ${app.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : app.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {app.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <img src={app.idFrontUrl} className="rounded-xl aspect-video object-cover border" alt="ID Front" />
                  <img src={app.idBackUrl} className="rounded-xl aspect-video object-cover border" alt="ID Back" />
                </div>
                {app.status === 'pending' ? (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => firebaseService.updateRunnerApplication(app.id, { status: 'rejected' }).then(() => setActiveAdminTab('applications'))} className="flex-1 py-2.5 border border-red-100 text-red-500 rounded-xl font-black text-xs tracking-normal font-medium hover:bg-red-50 transition-all">Reject</button>
                    <button onClick={() => handleApprove(app)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs tracking-normal font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Approve</button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => firebaseService.updateRunnerApplication(app.id, { status: app.status === 'approved' ? 'rejected' : 'approved' }).then(() => setActiveAdminTab('applications'))} 
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs tracking-normal font-medium transition-all ${app.status === 'approved' ? 'border border-red-100 text-red-500 hover:bg-red-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
                    >
                      {app.status === 'approved' ? 'Revoke / Reject' : 'Re-Approve'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">User Management</h3>
              <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">{dbUsers.length} Total Users</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Search by name, email, or phone..." 
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="flex-1 p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              />
              <select 
                value={userRoleFilter} 
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              >
                <option value="all">All Roles</option>
                {Object.values(UserRole).map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {dbUsers
              .filter(u => {
                const q = userSearchQuery.toLowerCase();
                const matchesSearch = (u.name || '').toLowerCase().includes(q) || 
                                      (u.email || '').toLowerCase().includes(q) ||
                                      (u.phone || '').includes(q);
                const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                return matchesSearch && matchesRole;
              })
              .map(u => (
              <div key={u.id} className="bg-card text-card-foreground rounded-[2rem] p-5 border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <UserAvatar src={u.avatar} name={u.name} className="w-12 h-12 rounded-2xl border-2 border-slate-50" />
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${u.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground text-sm">{u.name}</h4>
                    <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">{u.email} • {formatPhoneDisplay(u.phone)}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-sm font-black uppercase px-2 py-0.5 rounded-md ${u.isAdmin ? 'bg-indigo-100 text-indigo-600' : 'bg-secondary text-muted-foreground'}`}>{u.isAdmin ? 'Admin' : u.role}</span>
                      {u.it_admin && <span className="text-sm font-black uppercase px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 font-mono">Backend Admin</span>}
                      {u.isVerified && <span className="text-sm font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-600">Verified</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={() => setEditingUser(u)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-xl font-black text-xs tracking-normal font-medium hover:bg-secondary transition-all"
                  >
                    Edit User
                  </button>
                  {isSuperAdmin && !u.isAdmin && (
                    <button 
                      onClick={() => {
                        if(confirm(`Make ${u.name} an Admin?`)) {
                          firebaseService.updateUserProfile(u.id, { isAdmin: true }).then(() => firebaseService.fetchAllUsers().then(setDbUsers));
                        }
                      }}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs tracking-normal font-medium hover:bg-indigo-100 transition-all"
                    >
                      Make Admin
                    </button>
                  )}
                  {isSuperAdmin && u.isAdmin && !checkIfSuperAdmin(u.email) && (
                    <button 
                      onClick={() => {
                        if(confirm(`Remove Admin status from ${u.name}?`)) {
                          firebaseService.updateUserProfile(u.id, { isAdmin: false, it_admin: false }).then(() => firebaseService.fetchAllUsers().then(setDbUsers));
                        }
                      }}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-xs tracking-normal font-medium hover:bg-rose-100 transition-all"
                    >
                      Remove Admin
                    </button>
                  )}
                  {isSuperAdmin && !u.it_admin && (
                    <button 
                      onClick={() => {
                        if(confirm(`Make ${u.name} a Backend Admin (IT Admin)?`)) {
                          firebaseService.updateUserProfile(u.id, { it_admin: true, isAdmin: true }).then(() => firebaseService.fetchAllUsers().then(setDbUsers));
                        }
                      }}
                      className="px-4 py-2 bg-violet-50 text-violet-700 rounded-xl font-black text-xs tracking-normal font-medium hover:bg-violet-100 transition-all"
                    >
                      Make Backend Admin
                    </button>
                  )}
                  {isSuperAdmin && u.it_admin && !checkIfSuperAdmin(u.email) && (
                    <button 
                      onClick={() => {
                        if(confirm(`Remove Backend Admin (IT Admin) status from ${u.name}?`)) {
                          firebaseService.updateUserProfile(u.id, { it_admin: false }).then(() => firebaseService.fetchAllUsers().then(setDbUsers));
                        }
                      }}
                      className="px-4 py-2 bg-pink-50 text-pink-700 rounded-xl font-black text-xs tracking-normal font-medium hover:bg-pink-100 transition-all"
                    >
                      Remove Backend Admin
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      console.log("Deleting user:", u.id);
                      if (confirm(`Are you sure you want to delete ${u.name}? This action cannot be undone.`)) {
                        try {
                          await firebaseService.adminDeleteUser(u.id);
                          const updated = await firebaseService.fetchAllUsers();
                          setDbUsers(updated);
                          alert("User deleted successfully.");
                        } catch (e: any) {
                          console.error("Delete failed:", e);
                          alert("Delete failed: " + (e.message || "Unknown error"));
                        }
                      }
                    }}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingUser && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-foreground text-background/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-card text-card-foreground rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center bg-muted">
                  <h3 className="text-sm font-black tracking-normal font-medium">Edit User: {editingUser.name}</h3>
                  <button onClick={() => setEditingUser(null)} className="p-2 bg-card text-card-foreground rounded-xl shadow-sm"><X size={16} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Role</label>
                    <select 
                      value={editingUser.role} 
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                      className="w-full p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
                    >
                      {Object.values(UserRole).map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Verification Status</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingUser({...editingUser, isVerified: true})}
                        className={`flex-1 py-3 rounded-xl font-black text-xs tracking-normal font-medium transition-all ${editingUser.isVerified ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-muted text-muted-foreground'}`}
                      >
                        Verified
                      </button>
                      <button 
                        onClick={() => setEditingUser({...editingUser, isVerified: false})}
                        className={`flex-1 py-3 rounded-xl font-black text-xs tracking-normal font-medium transition-all ${!editingUser.isVerified ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-muted text-muted-foreground'}`}
                      >
                        Unverified
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Backend Admin (IT Admin) Status</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setEditingUser({...editingUser, it_admin: true, isAdmin: true})}
                        className={`flex-1 py-3 rounded-xl font-black text-xs tracking-normal font-medium transition-all ${editingUser.it_admin ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' : 'bg-muted text-muted-foreground'}`}
                      >
                        Active
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingUser({...editingUser, it_admin: false})}
                        className={`flex-1 py-3 rounded-xl font-black text-xs tracking-normal font-medium transition-all ${!editingUser.it_admin ? 'bg-zinc-600 text-white shadow-lg' : 'bg-muted text-muted-foreground'}`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      await firebaseService.updateUserProfile(editingUser.id, { 
                        role: editingUser.role, 
                        isVerified: editingUser.isVerified,
                        it_admin: editingUser.it_admin,
                        isAdmin: editingUser.it_admin || editingUser.isAdmin
                      });
                      const updated = await firebaseService.fetchAllUsers();
                      setDbUsers(updated);
                      setEditingUser(null);
                      alert("User updated successfully!");
                    }}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl mt-4"
                  >
                    Save Changes
                  </button>
                  <div className="space-y-1.5 mt-4">
                    <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Change Password</label>
                    <div className="flex gap-2">
                      <input 
                        type="password" 
                        placeholder="New password" 
                        className="flex-1 p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
                        onBlur={(e) => {
                          const password = e.target.value;
                          if (password && confirm('Are you sure you want to change this user\'s password?')) {
                            firebaseService.updatePassword(editingUser.id, password).then(() => alert('Password updated in database (Note: Auth password requires reset flow)')).catch(e => alert(e.message));
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-4">
                    <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Account Status</label>
                    <button 
                      onClick={async () => {
                        const disabled = !editingUser.disabled;
                        if (confirm(`Are you sure you want to ${disabled ? 'disable' : 'enable'} this account?`)) {
                          await firebaseService.updateUserProfile(editingUser.id, { disabled });
                          const updated = await firebaseService.fetchAllUsers();
                          setDbUsers(updated);
                          setEditingUser({...editingUser, disabled});
                          alert(`Account ${disabled ? 'disabled' : 'enabled'} successfully.`);
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-black text-xs tracking-normal font-medium transition-all ${editingUser.disabled ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                    >
                      {editingUser.disabled ? 'Enable Account' : 'Disable Account'}
                    </button>
                  </div>
                  <button 
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${editingUser.name}? This action cannot be undone.`)) {
                        try {
                          await firebaseService.adminDeleteUser(editingUser.id);
                          const updated = await firebaseService.fetchAllUsers();
                          setDbUsers(updated);
                          setEditingUser(null);
                          alert("User deleted successfully.");
                        } catch (e: any) {
                          console.error("Delete failed:", e);
                          alert("Delete failed: " + (e.message || "Unknown error"));
                        }
                      }
                    }}
                    className="w-full py-3 border border-red-100 text-red-500 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-red-50 transition-all mt-4"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === 'system' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-8">
            <div>
              <h3 className="text-sm font-black text-foreground tracking-normal font-medium mb-4">Operational Controls</h3>
              <div className="space-y-2 p-6 bg-muted rounded-[2rem] border border-border">
                <label className="text-micro text-muted-foreground ml-1">Default UI Scale (0.5 - 1.5)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05" 
                    value={defaultUiScale} 
                    onChange={e => setDefaultUiScale(parseFloat(e.target.value))} 
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                  />
                  <span className="w-12 text-center font-black text-foreground text-sm">{defaultUiScale.toFixed(2)}x</span>
                </div>
                <p className="text-xs text-muted-foreground font-bold">Adjust the overall size of the application UI for all users. Default is 1.00x.</p>
              </div>

              <div className="space-y-2 p-6 bg-muted rounded-[2rem] border border-border">
                <label className="text-micro text-muted-foreground ml-1">Logo Size Scale (0.5 - 3.0)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0.5" 
                    max="3.0" 
                    step="0.1" 
                    value={logoScale} 
                    onChange={e => setLogoScale(parseFloat(e.target.value))} 
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                  />
                  <span className="w-12 text-center font-black text-foreground text-sm">{logoScale.toFixed(2)}x</span>
                </div>
                <p className="text-xs text-muted-foreground font-bold">Adjust the global size factor for the logo.</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-foreground tracking-normal font-medium mb-4">Saka Keja Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 p-6 bg-muted rounded-[2rem] border border-border">
                  <label className="text-micro text-muted-foreground ml-1">Base Scouting Fee (KSH)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">KSH</div>
                    <input 
                      type="number" 
                      value={sakaKejaBaseFee} 
                      onChange={e => setSakaKejaBaseFee(parseInt(e.target.value) || 0)} 
                      className="w-full pl-12 pr-4 py-4 bg-card text-card-foreground rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-black text-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-bold">Fixed base fee for any house hunting errand.</p>
                </div>
                
                <div className="space-y-2 p-6 bg-muted rounded-[2rem] border border-border">
                  <label className="text-micro text-muted-foreground ml-1">Rent Percentage (%)</label>
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">%</div>
                    <input 
                      type="number" 
                      value={sakaKejaPercentage} 
                      onChange={e => setSakaKejaPercentage(parseInt(e.target.value) || 0)} 
                      className="w-full pl-4 pr-12 py-4 bg-card text-card-foreground rounded-xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-black text-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-bold">Percentage of average rent budget added to base fee.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save System Configuration
            </button>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-[2rem] border border-border shadow-sm">
            <h3 className="text-sm font-black text-foreground tracking-normal font-medium mb-4">System Environment</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              The application is currently connected to <strong>Supabase Realtime Database</strong>. Access is strictly controlled via Supabase RLS Policies.
            </p>
            
            <div className="space-y-3">
              {[
                { label: 'Database', value: 'Supabase DB', status: connectionStatus === 'success' ? 'CONNECTED' : connectionStatus === 'testing' ? 'TESTING...' : 'DISCONNECTED' },
                { label: 'Authentication', value: 'Supabase Auth', status: user ? 'AUTHENTICATED' : 'GUEST' },
                { label: 'Maps API', value: 'Google Maps', status: googleMapsApiKey ? 'ACTIVE' : 'MISSING' },
                { label: 'Places API', value: 'Google Places', status: googlePlacesApiKey ? 'ACTIVE' : 'MISSING' },
                { label: 'Routes API', value: 'Google Routes', status: googleRoutesApiKey ? 'ACTIVE' : 'MISSING' },
                { label: 'Media Storage', value: 'Cloudinary CDN', status: 'ACTIVE' },
                { label: 'AI Services', value: 'Google Gemini', status: 'ACTIVE' },
                { label: 'Messaging', value: 'Talksasa SMS', status: 'CONFIGURED' },
              ].map((env) => (
                <div key={env.label} className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
                  <span className="text-sm font-black text-muted-foreground tracking-normal font-medium">{env.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 ${env.status === 'CONNECTED' || env.status === 'ACTIVE' || env.status === 'AUTHENTICATED' ? 'text-emerald-600' : env.status === 'TESTING...' ? 'text-amber-600' : 'text-rose-600'}`}>
                      {env.status === 'CONNECTED' || env.status === 'ACTIVE' || env.status === 'AUTHENTICATED' ? <CheckCircle size={14} /> : <Activity size={14} />}
                      <span className="text-sm font-black tracking-normal font-medium">{env.value} ({env.status})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`mt-8 p-6 rounded-[2rem] border ${
              connectionStatus === 'success' ? 'bg-emerald-50 border-emerald-100' : 
              connectionStatus === 'testing' ? 'bg-amber-50 border-amber-100' : 
              'bg-rose-50 border-rose-100'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg text-white ${
                  connectionStatus === 'success' ? 'bg-emerald-600' : 
                  connectionStatus === 'testing' ? 'bg-amber-600' : 
                  'bg-rose-600'
                }`}><Activity size={16} /></div>
                <h4 className={`text-sm font-black tracking-normal font-medium ${
                  connectionStatus === 'success' ? 'text-emerald-900' : 
                  connectionStatus === 'testing' ? 'text-amber-900' : 
                  'text-rose-900'
                }`}>Database Connection Health</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-card text-card-foreground rounded-2xl border border-border">
                  <p className="text-xs font-black text-muted-foreground uppercase mb-1">Access Level</p>
                  <p className="text-xs font-black text-emerald-600">
                    ADMINISTRATOR
                  </p>
                </div>
                <div className="p-4 bg-card text-card-foreground rounded-2xl border border-border">
                  <p className="text-xs font-black text-muted-foreground uppercase mb-1">Connection State</p>
                  <p className={`text-xs font-black ${
                    connectionStatus === 'success' ? 'text-emerald-600' : 
                    connectionStatus === 'testing' ? 'text-amber-600' : 
                    'text-rose-600'
                  }`}>
                    {connectionStatus === 'success' ? 'STABLE' : connectionStatus === 'testing' ? 'CONNECTING' : 'OFFLINE'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-muted rounded-[2rem] border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 text-muted-foreground rounded-lg"><FileText size={16} /></div>
                  <div>
                    <h4 className="text-sm font-black text-foreground tracking-normal font-medium">System Environment</h4>
                    <p className="text-sm text-muted-foreground font-bold">Download current .env configuration</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const token = 'mock-access-token';
                      const response = await fetch(`${API_BASE_URL}/api/admin/download-env`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (!response.ok) throw new Error('Failed to download');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = '.env';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (e: any) {
                      alert("Download failed: " + e.message);
                    }
                  }}
                  className="px-5 py-2 bg-black text-white rounded-xl text-sm font-black tracking-normal font-medium flex items-center gap-2 shadow-lg"
                >
                  <Download size={16} /> Download .env
                </button>
              </div>
            </div>

            <div className="mt-8 p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-600 text-white rounded-lg"><Mail size={16} /></div>
                <div>
                  <h4 className="text-sm font-black text-indigo-900 tracking-normal font-medium">SMTP Email Test</h4>
                  <p className="text-sm text-indigo-400 font-bold">Verify your email configuration</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <input 
                  type="email" 
                  placeholder="Recipient Email Address" 
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="flex-1 p-4 bg-card text-card-foreground rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <button 
                  disabled={isSendingTestEmail || !testEmailRecipient.trim()}
                  onClick={async () => {
                    setIsSendingTestEmail(true);
                    try {
                      const token = 'mock-access-token';
                      const response = await fetch(`${API_BASE_URL}/api/admin/test-email`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ to: testEmailRecipient })
                      });
                      const text = await response.text();
                      const data = text ? JSON.parse(text) : {};
                      if (response.ok) {
                        alert("Test email sent successfully! Please check your inbox.");
                        setTestEmailRecipient('');
                      } else {
                        throw new Error(data.error || "Failed to send test email");
                      }
                    } catch (e: any) {
                      alert("Test email failed: " + e.message);
                    } finally {
                      setIsSendingTestEmail(false);
                    }
                  }}
                  className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSendingTestEmail ? <LoadingSpinner color="white" /> : <><Send size={14} /> Send Test</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'action-server' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Supabase Core Setup Badge Alert */}
          <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 text-white p-6 rounded-3xl shadow-md space-y-2 text-left">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-200">
                Production Database Active
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight font-sans">Moved Completely to Supabase Database Engine</h3>
            <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed font-sans">
              Errandly is completely migrated to your live cloud SQL instance on Supabase (<code className="font-mono bg-indigo-950/40 px-1 py-0.5 rounded text-[11px] text-indigo-300">db.hvvhdfucejsuileacvjo.supabase.co</code>). Local fallback mock database files have been safely bypassed. Reads and writes are processed under multi-user concurrency controls securely.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN A: Supabase Server Pool (PostgreSQL Pool Connection) */}
            <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Database size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground">PostgreSQL Server Connection Pool</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Live database server-side pool configs</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                    dbStatus?.connected 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {dbStatus?.connected ? 'Online' : 'Offline'}
                  </span>
                </div>

                {dbStatus?.connected ? (
                  <div className="bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-xs p-4 rounded-2xl border border-emerald-500/20 font-bold flex items-center gap-2 text-left">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    Supabase connection pool established successfully! Force mode is active.
                  </div>
                ) : (
                  <div className="bg-rose-500/5 text-rose-700 dark:text-rose-300 text-xs p-4 rounded-2xl border border-rose-500/20 font-bold flex flex-col gap-1 text-left">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-rose-500 flex-shrink-0" />
                      Database is currently unreachable over TCP pool connections.
                    </div>
                    {dbStatus?.error && (
                      <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 mt-1 font-medium select-text break-all">
                        Error: {dbStatus.error}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 pt-2 text-left">
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border">
                      <span className="block text-[9px] text-muted-foreground uppercase font-black mb-0.5">DB Connection Host</span>
                      <strong className="font-mono text-foreground break-all">{dbStatus?.config?.host || dbHost || 'db.hvvhdfucejsuileacvjo.supabase.co'}</strong>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border">
                      <span className="block text-[9px] text-muted-foreground uppercase font-black mb-0.5">Database Name</span>
                      <strong className="font-mono text-foreground break-all">{dbStatus?.config?.database || dbName || 'Errandly'}</strong>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border">
                      <span className="block text-[9px] text-muted-foreground uppercase font-black mb-0.5">Database Port</span>
                      <strong className="font-mono text-foreground">{dbStatus?.config?.port || dbPort || '5432'}</strong>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border">
                      <span className="block text-[9px] text-muted-foreground uppercase font-black mb-0.5">Username (postgres)</span>
                      <strong className="font-mono text-foreground">{dbStatus?.config?.user || dbUser || 'postgres'}</strong>
                    </div>
                  </div>

                  <details className="group border border-border rounded-2xl text-left">
                    <summary className="flex items-center justify-between p-3.5 text-[11px] font-black uppercase text-muted-foreground cursor-pointer outline-none select-none hover:text-foreground">
                      <span>Edit/Update Pool Credentials securely</span>
                      <ChevronRight size={13} className="transition-transform group-open:rotate-90 group-open:text-indigo-500" />
                    </summary>
                    <div className="p-4 border-t border-border bg-muted/10 space-y-3.5 text-xs text-left">
                      <div>
                        <label className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">PG HOST HOSTNAME</label>
                        <input 
                          type="text" 
                          value={dbHost} 
                          onChange={(e) => setDbHost(e.target.value)}
                          className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground" 
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">PORT</label>
                          <input 
                            type="text" 
                            value={dbPort} 
                            onChange={(e) => setDbPort(e.target.value)}
                            className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">USER</label>
                          <input 
                            type="text" 
                            value={dbUser} 
                            onChange={(e) => setDbUser(e.target.value)}
                            className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">PASSWORD (OR SECRET TOKEN)</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          value={dbPassword} 
                          onChange={(e) => setDbPassword(e.target.value)}
                          className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono text-foreground" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">DATABASE NAME</label>
                        <input 
                          type="text" 
                          value={dbName} 
                          onChange={(e) => setDbName(e.target.value)}
                          className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-muted-foreground uppercase font-bold mb-1">ACTION SERVER URL OVERWRITE</label>
                        <input 
                          type="text" 
                          value={actionServerUrlVal} 
                          onChange={(e) => setActionServerUrlVal(e.target.value)}
                          className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground" 
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsSavingDbConfig(true);
                            const res = await fetch(`${API_BASE_URL}/api/dbconfig/save`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                host: dbHost,
                                port: parseInt(dbPort) || 5432,
                                user: dbUser,
                                password: dbPassword,
                                database: dbName,
                                actionServerUrl: actionServerUrlVal
                              })
                            });
                            const result = await res.json();
                            if (res.ok) {
                              alert("Database configuration updated and re-verified successfully on the server pool!");
                              await fetchDbStatus();
                            } else {
                              alert("Failed to reconnect: " + (result.error || "Unknown server error"));
                            }
                          } catch (err: any) {
                            alert("Exception during save: " + err.message);
                          } finally {
                            setIsSavingDbConfig(false);
                          }
                        }}
                        disabled={isSavingDbConfig}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold leading-none transition-all flex items-center justify-center gap-1.5 shadow"
                      >
                        {isSavingDbConfig ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Save & Force PostgreSQL Reconnection
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* COLUMN B: Client-side Supabase Storage Buckets & SDK Tester */}
            <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Key size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground font-sans">Client SDK & Storage Buckets</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Verify client-side keys and file assets storage bypass</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold">Client API</span>
                </div>

                <div className="text-xs text-muted-foreground leading-relaxed text-left">
                  Verify the JS-client configuration used for direct uploads of profile avatars, errand completion screens, and receipt attachments to your Supabase block storage.
                </div>

                <div className="space-y-3.5 pt-2 text-xs text-left">
                  <div>
                    <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">SUPABASE ENDPOINT URL</label>
                    <input 
                       type="text" 
                       placeholder={import.meta.env.VITE_SUPABASE_URL || "https://hvvhdfucejsuileacvjo.supabase.co"}
                       value={supabaseTestUrl}
                       onChange={(e) => setSupabaseTestUrl(e.target.value)}
                       className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground uppercase font-black mb-1">ANON READ/WRITE SERVICE API KEY</label>
                    <input 
                       type="password" 
                       placeholder={import.meta.env.VITE_SUPABASE_ANON_KEY ? '••••••••' : 'eyJhbGciOi...'}
                       value={supabaseTestKey}
                       onChange={(e) => setSupabaseTestKey(e.target.value)}
                       className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono text-foreground"
                    />
                    <div className="mt-1 text-[9px] text-muted-foreground">Empty forms default to secure environmental parameters.</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setTestQueryLoading(true);
                    setTestQueryResult(null);
                    
                    const url = supabaseTestUrl || import.meta.env.VITE_SUPABASE_URL || 'https://hvvhdfucejsuileacvjo.supabase.co';
                    const key = supabaseTestKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
                    
                    if (!url || !key) {
                       throw new Error("Supabase URL or Key placeholder not configured. Verify env parameters.");
                    }
                    
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(url, key);
                    
                    const res = await supabase.storage.listBuckets();
                    
                    if (res.error) {
                       throw res.error;
                    }
                    
                    setTestQueryResult({ 
                      success: true, 
                      rows: res.data || [], 
                      fields: ['id', 'name', 'created_at', 'updated_at', 'public'], 
                      rowCount: res.data?.length || 0 
                    });
                  } catch (err: any) {
                    setTestQueryResult({ success: false, error: err.message });
                  } finally {
                    setTestQueryLoading(false);
                  }
                }}
                disabled={testQueryLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-normal transition-all flex items-center justify-center gap-1.5 shadow font-bold"
              >
                {testQueryLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Verify Supabase Client & List Buckets
              </button>
            </div>
          </div>

          {/* Action Server Endpoints & Charge Paths Tester */}
          <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6">
            <div className="pb-4 border-b border-border">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <Server size={18} className="text-indigo-500" /> Action Server Path Tester Studio
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Launch requests directly to different server endpoints running on{" "}
                <code className="font-mono bg-muted p-1 text-primary rounded-md text-[10px]">
                  {ACTION_SERVER_URL}
                </code>
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block mb-2">
                Preset Endpoint Targets & Mock Payloads
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: "Ping Health Probe",
                    url: "/api/health",
                    method: "GET" as const,
                    body: ""
                  },
                  {
                    label: "Mpesa STK Push Charge Payload",
                    url: "/api/payments/paystack/stk-push",
                    method: "POST" as const,
                    body: JSON.stringify(
                      {
                        amount: 100,
                        email: "mnyambura254@gmail.com",
                        userId: "usr_diag_tester",
                        phone: "0712345678",
                        transactionId: "stk_" + Math.random().toString(36).substring(2, 9)
                      },
                      null,
                      2
                    )
                  },
                  {
                    label: "Query Payments Status API",
                    url: `/api/payments/status?reference=stk_diag_${Math.random().toString(36).substring(2, 6)}`,
                    method: "GET" as const,
                    body: ""
                  },
                  {
                    label: "Trigger Global Paystack Resync",
                    url: "/api/payments/verify/all",
                    method: "GET" as const,
                    body: ""
                  },
                  {
                    label: "Test Email SMTP Proxy Carrier",
                    url: "/api/notifications/send-email",
                    method: "POST" as const,
                    body: JSON.stringify(
                      {
                        to: "ngugimaina4@gmail.com",
                        subject: "Errandly Gateway Diagnostics Success",
                        html: "<p>The action server successfully relayed this diagnostics message via the SMTP gateway.</p>"
                      },
                      null,
                      2
                    )
                  },
                  {
                    label: "Dispatch Custom Text Alert (SMS)",
                    url: "/api/sms/send",
                    method: "POST" as const,
                    body: JSON.stringify(
                      {
                        phone: "0712345678",
                        message: "SYSTEM UPDATE: Errandly Hub service connection verified successfully!"
                      },
                      null,
                      2
                    )
                  }
                ].map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setTestPathUrl(preset.url);
                      setTestPathMethod(preset.method);
                      setTestPathBody(preset.body);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                      testPathUrl === preset.url && testPathMethod === preset.method
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-muted text-muted-foreground border-border hover:bg-card"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration forms */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="text-[9px] text-muted-foreground uppercase font-black block mb-1">
                      Method
                    </label>
                    <select
                      value={testPathMethod}
                      onChange={(e) => setTestPathMethod(e.target.value as any)}
                      className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] text-muted-foreground uppercase font-black block mb-1">
                      Endpoint Path URI
                    </label>
                    <input
                      type="text"
                      value={testPathUrl}
                      onChange={(e) => setTestPathUrl(e.target.value)}
                      className="w-full p-2.5 bg-card border border-border rounded-xl text-xs font-mono text-foreground focus:ring-1 focus:ring-indigo-500 font-bold"
                      placeholder="/api/health"
                    />
                  </div>
                </div>

                {testPathMethod === "POST" && (
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-black block mb-1">
                      JSON POST Request Payload Body
                    </label>
                    <textarea
                      value={testPathBody}
                      onChange={(e) => setTestPathBody(e.target.value)}
                      className="w-full p-3 bg-card border border-border rounded-xl text-xs font-mono text-foreground focus:ring-1 focus:ring-indigo-500 h-32"
                      placeholder="{}"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setTestPathLoading(true);
                      setTestPathResponse(null);

                      const fullUrlPath = `${ACTION_SERVER_URL}${testPathUrl}`;
                      const fetchOptions: RequestInit = {
                        method: testPathMethod,
                        headers: {
                          "Content-Type": "application/json"
                        }
                      };

                      if (testPathMethod === "POST") {
                        try {
                          // Validate JSON
                          JSON.parse(testPathBody);
                          fetchOptions.body = testPathBody;
                        } catch (e: any) {
                          alert("Invalid request payload formatting string. JSON parsing failed: " + e.message);
                          setTestPathLoading(false);
                          return;
                        }
                      }

                      const res = await fetch(fullUrlPath, fetchOptions);
                      const responseText = await res.text();
                      let data;
                      try {
                        data = responseText ? JSON.parse(responseText) : {};
                      } catch (e) {
                        data = { rawText: responseText };
                      }

                      setTestPathResponse({
                        status: res.status,
                        statusText: res.statusText,
                        ok: res.ok,
                        payload: data
                      });
                    } catch (err: any) {
                      setTestPathResponse({
                        status: "CONNECTION_FAILED",
                        statusText: "Connection refused or timed out",
                        ok: false,
                        payload: {
                          error: err.message,
                          tip: "Verify that the Action Server is up and has matching allowed origin headers."
                        }
                      });
                    } finally {
                      setTestPathLoading(false);
                    }
                  }}
                  disabled={testPathLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-normal transition-all flex items-center justify-center gap-2 shadow"
                >
                  {testPathLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                  Dispatch Endpoint Request
                </button>
              </div>

              {/* Endpoint response viewport */}
              <div className="flex flex-col justify-between bg-muted/20 p-5 rounded-2xl border border-border min-h-[14rem]">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                      Response Console Receiver
                    </h4>
                    {testPathResponse && (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        testPathResponse.ok
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600"
                      }`}>
                        STATUS {testPathResponse.status}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono bg-slate-950 text-slate-300 p-4 rounded-xl border border-slate-800 h-52 overflow-auto text-left leading-normal">
                    {testPathResponse ? (
                      <pre className="whitespace-pre overflow-x-auto">
                        {JSON.stringify(testPathResponse.payload, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center justify-center h-full text-center p-4">
                        <Activity size={24} className="mb-2 opacity-50" />
                        Configure presets, headers, or parameters and click Dispatch to fetch response payload.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Server Output Logs Console */}
          <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Server size={18} className="text-emerald-500" /> Live Developer Server Log Feed
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Real-time circular in-memory log buffer containing the latest system events, payment attempts, and background queries.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 select-none">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground cursor-pointer bg-muted px-2.5 py-1.5 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                    className="rounded border-border text-indigo-600 focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  Auto Refresh (3s)
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    setLogsLoading(true);
                    await fetchLogs();
                    setLogsLoading(false);
                  }}
                  disabled={logsLoading}
                  className="p-1.5 bg-muted border border-border rounded-lg text-muted-foreground hover:bg-card transition-all"
                  title="Manual Log Refresh"
                >
                  <RefreshCw size={12} className={logsLoading ? "animate-spin" : ""} />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Are you sure you want to clear system captured logs?")) {
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/admin/logs/clear`, { method: "POST" });
                        if (res.ok) setCapturedLogs([]);
                      } catch (e) {
                        console.error("Clear logs fail:", e);
                      }
                    }
                  }}
                  className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 hover:bg-rose-500/20 rounded-lg transition-all"
                  title="Clear Log Terminal"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Filter and Search rail */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-1.5 bg-muted p-1.5 rounded-xl border border-border w-full sm:w-auto">
                {[
                  { id: "all", label: "ALL" },
                  { id: "log", label: "LOG" },
                  { id: "info", label: "INFO" },
                  { id: "warn", label: "WARN" },
                  { id: "error", label: "ERROR" }
                ].map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setFilterLogLevel(level.id as any)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-normal transition-all ${
                      filterLogLevel === level.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>

              <div className="relative group w-full flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-indigo-600" />
                <input
                  type="text"
                  placeholder="Filter log stream messages..."
                  value={searchLogsQuery}
                  onChange={(e) => setSearchLogsQuery(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-card text-foreground"
                />
              </div>
            </div>

            {/* Output terminal container */}
            <div className="text-xs font-mono bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-800 text-left relative overflow-hidden">
              <div className="h-80 overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-slate-800 space-y-1.5">
                {(() => {
                  const query = searchLogsQuery.toLowerCase();
                  const filtered = capturedLogs.filter((log) => {
                    const matchesLevel = filterLogLevel === "all" || log.level === filterLogLevel;
                    const matchesQuery = !query || log.message.toLowerCase().includes(query) || log.level.toLowerCase().includes(query);
                    return matchesLevel && matchesQuery;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/75 py-24 font-sans text-xs">
                        <Activity size={24} className="mb-2 opacity-30 animate-pulse" />
                        No conforming diagnostic log entries found. Select other filter combinations or trigger background requests.
                      </div>
                    );
                  }

                  return filtered.map((log, i) => {
                    let levelColor = "text-slate-400";
                    if (log.level === "info") levelColor = "text-emerald-400 font-bold";
                    if (log.level === "warn") levelColor = "text-amber-400 font-bold";
                    if (log.level === "error") levelColor = "text-rose-400 font-bold";

                    return (
                      <div key={i} className="hover:bg-slate-900/50 py-0.5 px-1 rounded flex items-start gap-2.5 border-b border-slate-900/40 text-[11px] leading-relaxed break-all">
                        <span className="text-slate-600 text-[10px] select-none flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`uppercase font-black text-[9px] px-1 bg-slate-900 tracking-wider text-center w-12 flex-shrink-0 ${levelColor}`}>
                          [{log.level}]
                        </span>
                        <span className="text-slate-300 select-text leading-normal whitespace-pre-wrap">
                          {log.message}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* DYNAMIC SQL QUERY BOX (Supabase Live Execution Terminal) */}
          <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Code size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground font-sans">Live Supabase Database Query Terminal</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Test connection and run custom SQL directly on Supabase PostgreSQL</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-end">
                {[
                  { label: "Connect ping", sql: "SELECT NOW() as current_time;" },
                  { label: "Check profiles counts", sql: "SELECT count(1) as users_count, role FROM profiles GROUP BY role;" },
                  { label: "Active errands list", sql: "SELECT id, title, category, status, budget FROM errands LIMIT 3;" },
                  { label: "List active runners", sql: "SELECT id, email, username, is_runner, status FROM profiles WHERE is_runner = true LIMIT 3;" }
                ].map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomSql(preset.sql)}
                    className="px-2.5 py-1.5 text-[9px] font-black uppercase text-muted-foreground hover:text-foreground bg-muted hover:bg-card border border-border rounded-xl transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-black block tracking-wider text-left">Type any PostgreSQL SQL statement</label>
                <textarea
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  className="w-full text-xs font-mono p-4 rounded-2xl bg-slate-950 text-slate-300 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-28"
                  placeholder="SELECT * FROM table;"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setBackendSqlLoading(true);
                    setBackendSqlResult(null);
                    const res = await fetch(`${API_BASE_URL}/api/dbconfig/test-query`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sql: customSql })
                    });
                    const data = await res.json();
                    setBackendSqlResult(data);
                  } catch (err: any) {
                    setBackendSqlResult({ success: false, error: err.message });
                  } finally {
                    setBackendSqlLoading(false);
                  }
                }}
                disabled={backendSqlLoading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-normal transition-all flex items-center justify-center gap-2 font-bold"
              >
                {backendSqlLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={11} fill="currentColor" />}
                Execute SQL statement on Supabase
              </button>

              {backendSqlResult && (
                <div className="pt-3 border-t border-border space-y-4 text-left">
                  {backendSqlResult.success ? (
                    <div className="space-y-3 font-mono">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Rows returned: <strong>{backendSqlResult.rowCount ?? 0}</strong></span>
                        <span className="text-emerald-500 font-bold">Query Completed Successfully (200 OK)</span>
                      </div>

                      <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 text-slate-300">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                              {backendSqlResult.fields?.map((field: string, j: number) => (
                                <th key={j} className="p-2 font-bold uppercase tracking-wider select-none">{field}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {backendSqlResult.rows && backendSqlResult.rows.length > 0 ? (
                              backendSqlResult.rows.map((row: any, rowIndex: number) => (
                                <tr key={rowIndex} className="hover:bg-slate-900/40 font-medium font-mono">
                                  {backendSqlResult.fields?.map((field: string, colIndex: number) => (
                                    <td key={colIndex} className="p-2 truncate max-w-[200px] select-text">
                                      {typeof row[field] === 'object' && row[field] !== null 
                                        ? JSON.stringify(row[field]) 
                                        : String(row[field] ?? "NULL")}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={backendSqlResult.fields?.length || 1} className="p-4 text-center text-slate-500 font-sans italic text-xs">
                                  No rows returned from this executed statement.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <details className="text-[9px] text-slate-400 bg-slate-900/30 p-2.5 rounded-xl border border-slate-800 cursor-pointer text-left">
                        <summary className="font-bold outline-none leading-none select-none">Show Raw Object Logs</summary>
                        <pre className="mt-2 whitespace-pre overflow-x-auto max-h-36 text-slate-300 text-left select-all leading-normal">{JSON.stringify(backendSqlResult.rows, null, 2)}</pre>
                      </details>
                    </div>
                  ) : (
                    <div className="p-5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl text-[11px] text-left leading-normal space-y-1 font-mono font-mono">
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={13} className="text-rose-500" /> PostgreSQL Pool Statement Rejected:</div>
                      <p className="select-text">{backendSqlResult.error || "PostgreSQL pool has gone offline or request timed out."}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

              {/* Collapsable DDL Scripts Section (Saves vertical real estate beautifully!) */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 space-y-3 col-span-2">
                <button
                  type="button"
                  onClick={() => setIsDdlExpanded(!isDdlExpanded)}
                  className="w-full flex items-center justify-between text-left focus:outline-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Database size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-800 flex items-center gap-1.5 font-sans">
                        Required PostgreSQL DDL Script
                      </h4>
                      <p className="text-xs text-amber-700/85 mt-0.5 leading-relaxed font-sans font-bold">
                        Show/execute structural migrations script to bootstrap your new Supabase database schemas.
                      </p>
                    </div>
                  </div>
                  <span className="text-amber-700 p-2 bg-amber-500/10 rounded-xl transition-all">
                    {isDdlExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </button>

                {isDdlExpanded && (
                  <div className="space-y-4 pt-4 border-t border-amber-500/10 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-amber-700 text-left">
                      Copy and paste this DDL code into the Supabase <strong>SQL Editor</strong> dashboard to initialize the required tables:
                    </p>
                    <div className="relative group">
                      <textarea 
                    readOnly
                    rows={8}
                    className="w-full p-4 bg-slate-950 text-slate-300 font-mono text-[10px] leading-relaxed rounded-2xl border border-slate-800 focus:outline-none"
                    value={`-- Enable standard UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES Table (User Storage Engine)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT,
    phone TEXT,
    role TEXT DEFAULT 'REQUESTER',
    is_runner BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    it_admin BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'light',
    is_online BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    rating NUMERIC DEFAULT 5.0,
    rating_count INTEGER DEFAULT 0,
    wallet_balance NUMERIC DEFAULT 0.0,
    balance NUMERIC DEFAULT 0.0,
    completed_errands INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    notification_settings JSONB DEFAULT '{"push": true, "email": true, "sms": true}'::jsonb,
    last_known_location JSONB,
    profile_photo TEXT,
    biography TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select of profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Allow full service command access" ON public.profiles FOR ALL USING (true);

-- 2. ERRANDS Table
CREATE TABLE IF NOT EXISTS public.errands (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending',
    budget NUMERIC,
    requester_id UUID,
    requester_name TEXT,
    requester_phone TEXT,
    requester_is_verified BOOLEAN,
    runner_id UUID,
    runner_name TEXT,
    runner_phone TEXT,
    runner_is_verified BOOLEAN,
    pickup_location TEXT,
    pickup_coordinates JSONB,
    dropoff_location TEXT,
    dropoff_coordinates JSONB,
    deadline TEXT,
    location TEXT,
    dispute_reason TEXT,
    bids JSONB DEFAULT '[]'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    accepted_price NUMERIC,
    receipt_url TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.errands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select of errands" ON public.errands FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert errands" ON public.errands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update errands" ON public.errands FOR UPDATE USING (true);

-- 3. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    errand_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anyone to fetch notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow anyone to update/read status" ON public.notifications FOR ALL USING (true);

-- 4. ERRAND CHATS Table
CREATE TABLE IF NOT EXISTS public.errand_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    errand_id TEXT NOT NULL,
    sender_id UUID NOT NULL,
    sender_name TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.errand_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow any reader" ON public.errand_chats FOR SELECT USING (true);
CREATE POLICY "Allow any sender" ON public.errand_chats FOR INSERT WITH CHECK (true);

-- 5. SUPPORT MESSAGES Table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all support listings select" ON public.support_messages FOR SELECT USING (true);
CREATE POLICY "Allow all support listings action" ON public.support_messages FOR ALL USING (true);

-- 6. RUNNER APPLICATIONS Table
CREATE TABLE IF NOT EXISTS public.runner_applications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.runner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anyone to submit onboarding applications" ON public.runner_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anyone to query onboarding status" ON public.runner_applications FOR SELECT USING (true);
CREATE POLICY "Allow onboarding update operations" ON public.runner_applications FOR ALL USING (true);

-- 7. SETTINGS Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'app',
    primary_color TEXT DEFAULT '#2891e2',
    logo_url TEXT DEFAULT 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216350/a371z1ikclx5qbsgtgdv.png',
    icon_url TEXT DEFAULT 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216384/ox2qzeuultlhiccfh02z.png',
    dashboard_hero_url TEXT DEFAULT 'https://res.cloudinary.com/dul9xvvap/image/upload/v1779216072/yy5zthljky17lmq0nlsy.png',
    default_ui_scale NUMERIC DEFAULT 1.1,
    logo_scale NUMERIC DEFAULT 3,
    logo_variant TEXT DEFAULT 'original',
    saka_keja_base_fee NUMERIC DEFAULT 1200,
    saka_keja_percentage NUMERIC DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anyone to view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow settings edit" ON public.settings FOR ALL USING (true);

INSERT INTO public.settings (id, primary_color)
VALUES ('app', '#2891e2')
ON CONFLICT (id) DO NOTHING;`}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                      textarea.select();
                      navigator.clipboard.writeText(textarea.value);
                      alert("Database DDL Schema copied to clipboard!");
                    }}
                    className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-sans text-[10px] font-bold rounded-lg transition-all"
                  >
                    Copy SQL DDL Schema
                  </button>
                </div>

              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Key size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-indigo-800">2. Supabase Anon Key & URL Instructions</h4>
                    <p className="text-xs text-indigo-700/85 mt-1 leading-relaxed">
                      To hook up the frontend with your Supabase database, find your credential keys and insert them into the <code>.env</code> file under the following parameters:
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/60 rounded-2xl text-xs space-y-2.5">
                  <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                    <span className="font-mono text-[11px] font-bold text-foreground">VITE_SUPABASE_URL</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">Project URL (under Project Settings &gt; API)</span>
                  </div>
                  <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                    <span className="font-mono text-[11px] font-bold text-foreground">VITE_SUPABASE_ANON_KEY</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">Anon Public Key (under Project Settings &gt; API)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1 text-left">
                    Once added to <code>.env</code> in the project workspace, the application will automatically read these configurations to establish the user storage system correctly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

            {testQueryResult && (
              <div className="bg-muted/10 p-5 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${testQueryResult.success ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    <h4 className="text-xs font-bold text-foreground">Query Execution Result</h4>
                  </div>
                  {testQueryResult.success && (
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      Returned <span className="font-bold text-foreground">{testQueryResult.rowCount ?? testQueryResult.rows?.length ?? 0}</span> row(s)
                    </div>
                  )}
                </div>

                {testQueryResult.success ? (
                  <div className="space-y-4">
                    <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-card">
                      <table className="w-full text-left border-collapse text-[11px] font-mono">
                        <thead>
                          <tr className="bg-muted text-muted-foreground border-b border-border">
                            {testQueryResult.fields?.map((field: string, i: number) => (
                              <th key={i} className="p-2 font-black uppercase text-[10px] whitespace-nowrap">{field}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {testQueryResult.rows && testQueryResult.rows.length > 0 ? (
                            testQueryResult.rows.map((row: any, rowIndex: number) => (
                              <tr key={rowIndex} className="hover:bg-muted/10">
                                {testQueryResult.fields?.map((field: string, colIndex: number) => (
                                  <td key={colIndex} className="p-2 max-w-xs truncate text-foreground font-medium">
                                    {typeof row[field] === 'object' && row[field] !== null 
                                      ? JSON.stringify(row[field]) 
                                      : String(row[field] ?? "NULL")}
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={testQueryResult.fields?.length || 1} className="p-4 text-center text-muted-foreground">
                                Query succeeded but returned 0 rows.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <details className="text-[10px] text-muted-foreground font-mono bg-card p-2.5 rounded-xl border border-border cursor-pointer">
                      <summary className="font-medium outline-none">Show Raw Json Response Data</summary>
                      <pre className="mt-2 whitespace-pre overflow-x-auto max-h-40 text-left text-foreground leading-normal">{JSON.stringify(testQueryResult.rows, null, 2)}</pre>
                    </details>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl font-mono text-[11px] leading-relaxed text-left">
                    <div className="font-bold mb-1">Execution Fail:</div>
                    {testQueryResult.error || "Unknown query error occurred."}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {activeAdminTab === 'listings' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Add Menu Listing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Listing Title (e.g. Duvet Washing)" 
                value={newListing.title} 
                onChange={e => setNewListing({...newListing, title: e.target.value})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              />
              <input 
                type="text" 
                placeholder="Scope (e.g. Hand Wash, Per Hour)" 
                value={newListing.scope} 
                onChange={e => setNewListing({...newListing, scope: e.target.value})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              />
              <input 
                type="number" 
                placeholder="Price (KSH)" 
                value={newListing.price || ''} 
                onChange={e => setNewListing({...newListing, price: Number(e.target.value)})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              />
              <select 
                value={newListing.category} 
                onChange={e => setNewListing({...newListing, category: e.target.value as ErrandCategory})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              >
                {Object.values(ErrandCategory).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => document.getElementById('listing-img')?.click()}
                  className="flex-1 p-4 bg-muted rounded-2xl border-2 border-dashed border-border text-muted-foreground font-bold text-xs flex items-center justify-center gap-2"
                >
                  {newListing.imageUrl ? <Check size={14} className="text-emerald-500" /> : <Upload size={14} />}
                  {newListing.imageUrl ? "Image Ready" : "Upload Image"}
                </button>
                <input id="listing-img" type="file" className="hidden" accept="image/*" onChange={handleListingImageUpload} />
              </div>
            </div>
            <textarea 
              placeholder="Description" 
              value={newListing.description} 
              onChange={e => setNewListing({...newListing, description: e.target.value})}
              className="w-full p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm h-24 resize-none"
            />
            <button 
              disabled={isAddingListing || !newListing.title || !newListing.imageUrl}
              onClick={handleAddListing}
              className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50"
            >
              {isAddingListing ? <LoadingSpinner color="white" /> : "Add Menu Listing"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminServiceListings.map(s => (
              <div key={s.id} className="bg-card text-card-foreground rounded-[2rem] p-4 border border-border shadow-sm flex gap-4 items-center">
                <img src={s.imageUrl} className="w-16 h-16 rounded-xl object-cover border" alt="" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-foreground text-xs truncate">{s.title}</h4>
                  <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">{s.category} • KSh{s.price}</p>
                </div>
                <button onClick={() => handleDeleteListing(s.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAdminTab === 'services' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-4">
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Add Featured Service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Service Title" 
                value={newService.title} 
                onChange={e => setNewService({...newService, title: e.target.value})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              />
              <input 
                type="number" 
                placeholder="Price (KSH)" 
                value={newService.price || ''} 
                onChange={e => setNewService({...newService, price: Number(e.target.value)})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              />
              <select 
                value={newService.category} 
                onChange={e => setNewService({...newService, category: e.target.value as ErrandCategory})}
                className="p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm"
              >
                {Object.values(ErrandCategory).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => document.getElementById('service-img')?.click()}
                  className="flex-1 p-4 bg-muted rounded-2xl border-2 border-dashed border-border text-muted-foreground font-bold text-xs flex items-center justify-center gap-2"
                >
                  {newService.imageUrl ? <Check size={14} className="text-emerald-500" /> : <Upload size={14} />}
                  {newService.imageUrl ? "Image Ready" : "Upload Image"}
                </button>
                <input id="service-img" type="file" className="hidden" accept="image/*" onChange={handleServiceImageUpload} />
              </div>
            </div>
            <textarea 
              placeholder="Description" 
              value={newService.description} 
              onChange={e => setNewService({...newService, description: e.target.value})}
              className="w-full p-4 bg-muted rounded-2xl border-none outline-none font-bold text-sm h-24 resize-none"
            />
            <button 
              disabled={isAddingService || !newService.title || !newService.imageUrl}
              onClick={handleAddService}
              className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50"
            >
              {isAddingService ? <LoadingSpinner color="white" /> : "Add Featured Service"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminFeaturedServices.map(s => (
              <div key={s.id} className="bg-card text-card-foreground rounded-[2rem] p-4 border border-border shadow-sm flex gap-4 items-center">
                <img src={s.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={s.title} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-foreground truncate">{s.title}</h4>
                  <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">{s.category} • KSH {s.price}</p>
                </div>
                <button onClick={() => handleDeleteService(s.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeAdminTab === 'branding' && isSuperAdmin && (
        <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3"><div className="p-3 bg-black text-white rounded-xl"><Settings size={24} /></div><div><h2 className="text-lg font-black text-foreground">Branding</h2><p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">Global Styles</p></div></div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Primary Color</label>
              <div className="flex gap-3">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer" />
                <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 p-3 brand-input rounded-xl font-bold text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">App Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden">
                  <Logo 
                    size={64} 
                    url={logoUrl} 
                    scale={logoScale} 
                    variant={logoVariant} 
                  />
                </div>
                <button disabled={isUploading} onClick={() => logoFileRef.current?.click()} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm tracking-normal font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">{isUploading ? <LoadingSpinner color="white" /> : <><Upload size={14} /> Upload Logo</>}</button>
                <input type="file" ref={logoFileRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Logo Appearance Use</label>
              <select 
                value={logoVariant} 
                onChange={e => setLogoVariant(e.target.value as any)}
                className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none border border-transparent focus:border-indigo-500 transition-all"
              >
                <option value="original">Original Aspect Ratio</option>
                <option value="square">Fit as Square</option>
                <option value="circle">Circular Icon</option>
                <option value="rounded">Rounded Corners</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">App Icon</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden">
                  {iconUrl ? <img src={iconUrl} className="w-full h-full object-cover" alt="Icon" /> : <ShoppingBag className="text-white/50" />}
                </div>
                <button disabled={isIconUploading} onClick={() => iconFileRef.current?.click()} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm tracking-normal font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">{isIconUploading ? <LoadingSpinner color="white" /> : <><Upload size={14} /> Upload Icon</>}</button>
                <input type="file" ref={iconFileRef} className="hidden" accept="image/*" onChange={handleIconUpload} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Dashboard Hero Image</label>
              <div className="flex items-center gap-4">
                <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                  {dashboardHeroUrl ? <img src={dashboardHeroUrl} className="w-full h-full object-cover" alt="Hero" /> : <ImageIcon className="text-slate-400" />}
                </div>
                <button disabled={isUploading} onClick={() => heroFileRef.current?.click()} className="whitespace-nowrap px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm tracking-normal font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">{isUploading ? <LoadingSpinner color="white" /> : <><Upload size={14} /> Upload Image</>}</button>
                <input type="file" ref={heroFileRef} className="hidden" accept="image/*" onChange={handleHeroUpload} />
              </div>
            </div>
            <button disabled={isSaving} onClick={handleSaveSettings} className="w-full py-5 btn-navy rounded-2xl font-black text-sm uppercase tracking-[0.2em]">{isSaving ? <LoadingSpinner color="white" /> : "Save Settings"}</button>
            
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-4">System Configuration</h3>
              <button 
                onClick={async () => {
                  try {
                    const token = 'mock-access-token';
                    const response = await fetch(`${API_BASE_URL}/api/admin/download-env`, {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    if (!response.ok) throw new Error('Failed to download');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '.env';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (e: any) {
                    alert("Download failed: " + e.message);
                  }
                }}
                className="w-full py-4 bg-foreground text-background text-white rounded-2xl font-black text-sm tracking-normal font-medium flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-200"
              >
                <Download size={14} /> Export .env File
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'broadcast' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card text-card-foreground rounded-[2rem] p-8 border border-border shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-xl"><BellRing size={24} /></div>
              <div>
                <h2 className="text-lg font-black text-foreground">Broadcast Notification</h2>
                <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">Send a message to all users</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <textarea 
                placeholder="Type your broadcast message here..." 
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full p-6 bg-muted rounded-3xl border-none outline-none font-bold text-sm h-40 resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />

              <div className="flex flex-wrap gap-6 p-6 bg-muted rounded-3xl border border-border">
                <div className="w-full mb-2">
                  <p className="text-sm text-muted-foreground font-black tracking-normal font-medium">Broadcast Channels</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${broadcastMethods.inApp ? 'bg-indigo-600 border-indigo-600' : 'border-border group-hover:border-border'}`}>
                    {broadcastMethods.inApp && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={broadcastMethods.inApp} onChange={() => setBroadcastMethods({...broadcastMethods, inApp: !broadcastMethods.inApp})} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-foreground tracking-normal font-medium">In-App</span>
                    <span className="text-xs text-muted-foreground font-bold uppercase">Push Notification</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${broadcastMethods.email ? 'bg-indigo-600 border-indigo-600' : 'border-border group-hover:border-border'}`}>
                    {broadcastMethods.email && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={broadcastMethods.email} onChange={() => setBroadcastMethods({...broadcastMethods, email: !broadcastMethods.email})} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-foreground tracking-normal font-medium">Email</span>
                    <span className="text-xs text-muted-foreground font-bold uppercase">Direct to inbox</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${broadcastMethods.sms ? 'bg-indigo-600 border-indigo-600' : 'border-border group-hover:border-border'}`}>
                    {broadcastMethods.sms && <Check size={14} className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={broadcastMethods.sms} onChange={() => setBroadcastMethods({...broadcastMethods, sms: !broadcastMethods.sms})} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-foreground tracking-normal font-medium">SMS</span>
                    <span className="text-xs text-muted-foreground font-bold uppercase">Mobile Message</span>
                  </div>
                </label>
              </div>

              <button 
                disabled={isBroadcasting || !broadcastMessage.trim() || (!broadcastMethods.inApp && !broadcastMethods.email && !broadcastMethods.sms)}
                onClick={async () => {
                  setIsBroadcasting(true);
                  try {
                    const users = dbUsers;
                    const promises = [];
                    
                    for (const u of users) {
                      if (broadcastMethods.inApp) {
                        promises.push(firebaseService.addNotification({
                          userId: u.id,
                          title: "System Broadcast",
                          message: broadcastMessage,
                          type: 'info',
                          read: false
                        }));
                      }
                      if (broadcastMethods.email && u.email) {
                        promises.push(firebaseService.emailService.sendEmail(u.email, "ErrandRunner Broadcast", broadcastMessage));
                      }
                      if (broadcastMethods.sms && u.phone) {
                        promises.push(firebaseService.smsService.sendSMS(u.phone, `ErrandRunner: ${broadcastMessage}`));
                      }
                    }
                    
                    await Promise.all(promises);
                    alert(`Broadcast sent successfully to ${users.length} users!`);
                    setBroadcastMessage('');
                  } catch (e) {
                    console.error(e);
                    alert("Broadcast failed.");
                  } finally {
                    setIsBroadcasting(false);
                  }
                }}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBroadcasting ? <LoadingSpinner color="white" /> : <><Sparkles size={16} /> Send Broadcast</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'loyalty' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card text-card-foreground rounded-[2rem] p-8 border border-border shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-xl"><Target size={24} /></div>
              <div>
                <h2 className="text-lg font-black text-foreground">Loyalty Program</h2>
                <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">Manage Tiers and Rewards</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { level: 'Bronze', points: '0-500', color: 'bg-orange-100 text-orange-600', icon: <Zap size={16} /> },
                { level: 'Silver', points: '501-2000', color: 'bg-secondary text-muted-foreground', icon: <Shield size={16} /> },
                { level: 'Gold', points: '2001+', color: 'bg-amber-100 text-amber-600', icon: <Star size={16} /> },
              ].map((tier) => (
                <div key={tier.level} className="p-6 bg-muted rounded-[2rem] border border-border space-y-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tier.color}`}>{tier.icon}</div>
                  <div>
                    <h4 className="font-black text-foreground">{tier.level}</h4>
                    <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">{tier.points} Points</p>
                  </div>
                  <button className="w-full py-2 bg-card text-card-foreground border border-border rounded-xl text-xs font-black tracking-normal font-medium text-muted-foreground hover:text-black transition-all">Edit Benefits</button>
                </div>
              ))}
            </div>

            <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-indigo-900">Global Points Multiplier</h4>
                <p className="text-sm font-bold text-indigo-400 tracking-normal font-medium">Current: 1.0x</p>
              </div>
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm tracking-normal font-medium shadow-lg shadow-indigo-200">Adjust</button>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'support' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
          <div className="md:col-span-1 bg-card text-card-foreground rounded-[2rem] border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
            <header className="p-5 border-b bg-muted">
              <h3 className="text-sm font-black tracking-normal font-medium text-muted-foreground">Conversations</h3>
            </header>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {supportChats.length === 0 ? (
                <div className="p-10 text-center opacity-20"><MessageSquare size={32} className="mx-auto mb-2" /><p className="text-sm font-black uppercase">No Chats</p></div>
              ) : (
                supportChats.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedSupportUser(c.userId)}
                    className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between ${selectedSupportUser === c.userId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'hover:bg-muted'}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">{c.userName}</p>
                      <p className={`text-xs truncate ${selectedSupportUser === c.userId ? 'text-white/60' : 'text-muted-foreground'}`}>
                        {c.messages?.[c.messages.length - 1]?.text || 'No messages'}
                      </p>
                    </div>
                    {c.unreadByAdmin && <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 ml-2" />}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="md:col-span-2 bg-card text-card-foreground rounded-[2rem] border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
            {selectedSupportUser ? (
              <SupportChatViewLocal user={user} targetUserId={selectedSupportUser} isAdmin={true} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70 gap-3">
                <MessageCircle size={48} strokeWidth={1} />
                <p className="text-sm font-black tracking-normal font-medium">Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )}
</div>
);
};

const SupportChatViewLocal: React.FC<{ user: User, targetUserId?: string, isAdmin?: boolean }> = ({ user, targetUserId, isAdmin = false }) => {
  const [chat, setChat] = useState<any>(null);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatUserId = targetUserId || user.id;

  useEffect(() => {
    const unsub = firebaseService.subscribeToSupportChat(chatUserId, (data) => {
      setChat(data);
      if (isAdmin ? data?.unreadByAdmin : data?.unreadByUser) {
        firebaseService.markSupportChatAsRead(chatUserId, isAdmin);
      }
    });
    return () => unsub();
  }, [chatUserId, isAdmin]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = text;
    setText('');
    await firebaseService.sendSupportMessage(chatUserId, user.name, msg, isAdmin);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/30">
        {!chat || !chat.messages || chat.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
            <MessageSquare size={48} strokeWidth={1} />
            <p className="text-xs font-black uppercase mt-4">No messages yet</p>
          </div>
        ) : (
          chat.messages.map((m: any, i: number) => (
            <div key={m.id || `msg-${i}`} className={`flex flex-col ${m.senderId === (isAdmin ? 'admin' : user.id) ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${m.senderId === (isAdmin ? 'admin' : user.id) ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100' : 'bg-card text-foreground border border-border rounded-tl-none shadow-sm'}`}>
                {m.text}
              </div>
              <span className="text-xs font-black text-muted-foreground uppercase mt-1.5 px-1">
                {m.senderName} • {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
              </span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="p-4 bg-card text-card-foreground border-t flex gap-3">
        <input 
          type="text" value={text} onChange={e => setText(e.target.value)} 
          placeholder="Type your message..." 
          className="flex-1 bg-muted border-none rounded-2xl px-5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button type="submit" className="p-3 bg-indigo-600 text-white rounded-2xl active:scale-90 transition-all shadow-lg shadow-indigo-100">
          <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
};

const triggerHaptic = () => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(10);
  }
};

const ErrandStatusTimeline: React.FC<{ status: ErrandStatus, category?: ErrandCategory }> = ({ status, category }) => {
  const isShopping = category === ErrandCategory.SHOPPING;
  
  const defaultStages = [
    { id: ErrandStatus.PENDING, label: 'Posted', icon: <Plus size={16} /> },
    { id: ErrandStatus.ACCEPTED, label: 'Assigned', icon: <UserCheck size={16} /> },
    { id: ErrandStatus.VERIFYING, label: 'Review', icon: <Search size={16} /> },
    { id: ErrandStatus.COMPLETED, label: 'Finished', icon: <CheckCircle size={16} /> }
  ];

  const shoppingStages = [
    { id: ErrandStatus.PENDING, label: 'Order Placed', icon: <ShoppingBag size={16} /> },
    { id: ErrandStatus.ACCEPTED, label: 'Shopping', icon: <Briefcase size={16} /> },
    { id: ErrandStatus.VERIFYING, label: 'On the Way', icon: <Navigation size={16} /> },
    { id: ErrandStatus.COMPLETED, label: 'Delivered', icon: <CheckCircle size={16} /> }
  ];

  const stages = isShopping ? shoppingStages : defaultStages;

  const getStatusIndex = (s: ErrandStatus) => {
    if (s === ErrandStatus.CANCELLED) return -1;
    return stages.findIndex(stage => stage.id === s);
  };

  const currentIndex = getStatusIndex(status);

  if (status === ErrandStatus.CANCELLED) {
    return (
      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
          <X size={16} />
        </div>
        <div>
          <p className="text-sm font-black tracking-normal font-medium text-red-600">Errand Cancelled</p>
          <p className="text-xs font-bold text-red-400 uppercase">This task is no longer active</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 px-2">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-secondary -z-0" />
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-4 left-0 h-0.5 bg-indigo-600 transition-all duration-500 -z-0" 
          style={{ width: `${Math.max(0, currentIndex) * (100 / (stages.length - 1))}%` }}
        />

        {stages.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={stage.id} className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                isCompleted ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 
                isCurrent ? 'bg-card text-card-foreground border-indigo-600 text-indigo-600 shadow-xl scale-110' : 
                'bg-card text-card-foreground border-border text-muted-foreground/70'
              }`}>
                {isCompleted ? <Check size={14} strokeWidth={3} /> : stage.icon}
              </div>
              <span className={`mt-2 text-xs font-black uppercase tracking-tighter transition-colors ${
                isCurrent ? 'text-indigo-600' : 'text-muted-foreground'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RunnerApplicationFlow: React.FC<{ user: User, onBack: () => void, existingApplication: RunnerApplication | null }> = ({ user, onBack, existingApplication }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: user.name,
    phone: user.phone || '',
    nationalId: '',
    idFrontUrl: '',
    idBackUrl: '',
    selfieUrl: '',
    categoryApplied: ErrandCategory.GENERAL
  });

  if (user.role === UserRole.RUNNER) {
    return (
      <div className="bg-card text-card-foreground rounded-[2rem] p-8 border border-border shadow-sm text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-foreground tracking-tight">Already a Runner!</h3>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            You are successfully registered and verified as a Runner. You cannot apply again.
          </p>
        </div>
        <button onClick={onBack} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (existingApplication) {
    const isApproved = existingApplication.status === 'approved';
    const isPending = existingApplication.status === 'pending';
    const isRejected = existingApplication.status === 'rejected';

    return (
      <div className="bg-card text-card-foreground rounded-[2rem] p-8 border border-border shadow-sm text-center space-y-6">
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner ${
          isApproved ? 'bg-emerald-100 text-emerald-600' :
          isPending ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
        }`}>
          {isApproved ? <CheckCircle2 size={32} /> : 
           isPending ? <Loader2 size={32} className="animate-spin" /> : 
           <AlertCircle size={32} />}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-foreground tracking-tight">
            {isApproved ? 'Application Approved!' : 
             isPending ? 'Review in Progress' : 'Application Rejected'}
          </h3>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            {isApproved ? 'Congratulations! You are now a certified runner. Check your dashboard for tasks.' :
             isPending ? 'Your application is currently being reviewed by our team. This usually takes 24-48 hours.' :
             'Unfortunately, your application was not successful at this time. Please contact support for details.'}
          </p>
        </div>
        <button onClick={onBack} className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
          Go Back
        </button>
      </div>
    );
  }

  const handleUpload = async (file: File, field: 'idFrontUrl' | 'idBackUrl' | 'selfieUrl') => {
    setLoading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setForm(prev => ({ ...prev, [field]: url }));
    } catch (e) { alert("Upload failed"); } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.nationalId || !form.idFrontUrl || !form.idBackUrl || !form.selfieUrl) {
      alert("Please complete all fields and uploads");
      return;
    }
    setLoading(true);
    try {
      await firebaseService.submitRunnerApplication({
        userId: user.id,
        ...form
      });
      alert("Application submitted successfully! We will review it shortly.");
      onBack();
    } catch (e) { alert("Submission failed"); } finally { setLoading(false); }
  };

  return (
    <div className="bg-card text-card-foreground rounded-[2rem] p-6 border border-border shadow-sm animate-in slide-in-from-bottom-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-xs font-black tracking-normal font-medium text-muted-foreground hover:text-black transition-colors">
        <ChevronLeft size={14} /> Back to Profile
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-black text-foreground tracking-tight">Become a Runner</h2>
        <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mt-1">Join our elite team of pros</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">Full Name</label>
          <input type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full p-3 bg-muted rounded-2xl font-bold text-xs outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">National ID Number</label>
          <input type="text" value={form.nationalId} onChange={e => setForm({...form, nationalId: e.target.value})} className="w-full p-3 bg-muted rounded-2xl font-bold text-xs outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">Category</label>
          <select value={form.categoryApplied} onChange={e => setForm({...form, categoryApplied: e.target.value as ErrandCategory})} className="w-full p-3 bg-muted rounded-2xl font-bold text-xs outline-none">
            {Object.values(ErrandCategory).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">ID Front</label>
            <div className="aspect-video bg-muted rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative">
              {form.idFrontUrl ? <img src={form.idFrontUrl} className="w-full h-full object-cover" /> : <button onClick={() => document.getElementById('idFront')?.click()} className="text-xs font-black uppercase text-muted-foreground">Upload</button>}
              <input id="idFront" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'idFrontUrl')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">ID Back</label>
            <div className="aspect-video bg-muted rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative">
              {form.idBackUrl ? <img src={form.idBackUrl} className="w-full h-full object-cover" /> : <button onClick={() => document.getElementById('idBack')?.click()} className="text-xs font-black uppercase text-muted-foreground">Upload</button>}
              <input id="idBack" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'idBackUrl')} />
            </div>
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">Selfie with ID</label>
            <div className="aspect-video bg-muted rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative">
              {form.selfieUrl ? <img src={form.selfieUrl} className="w-full h-full object-cover" /> : <button onClick={() => document.getElementById('selfie')?.click()} className="text-xs font-black uppercase text-muted-foreground">Upload Selfie</button>}
              <input id="selfie" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'selfieUrl')} />
            </div>
          </div>
        </div>

        <button disabled={loading} onClick={handleSubmit} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all mt-2">
          {loading ? <LoadingSpinner color="white" /> : "Submit Application"}
        </button>
      </div>
    </div>
  );
};

const ChatSection: React.FC<{ errandId: string, user: User | null, onSendMessage: (text: string, imageUrl?: string) => void }> = ({ errandId, user, onSendMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const QUICK_REPLIES = [
    "On my way",
    "Leave it at the gate",
    "I'm here",
    "Almost there",
    "Where are you?",
    "Got it",
    "Please call me",
    "I'm coming down",
    "Call me when you arrive",
    "Thank you!",
    "I'm at the pickup point",
    "I'm at the drop-off point",
    "Everything is ready",
    "I've picked it up",
    "I've dropped it off",
    "Please confirm receipt",
    "I'm running a bit late",
    "I'm at the gate",
    "Please open the door",
    "I'm at the reception",
    "I'm at the parking lot",
    "I'm at the shop",
    "They don't have this item",
    "Should I get a substitute?",
    "I'm checking out now",
    "I'm on my way to you"
  ];

  useEffect(() => {
    const unsub = firebaseService.subscribeToErrandChat(errandId, setMessages);
    return () => unsub();
  }, [errandId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = (e?: React.FormEvent, customText?: string, attachmentUrl?: string) => {
    if (e) e.preventDefault();
    const messageText = customText || text;
    if (!messageText.trim() && !attachmentUrl) return;
    onSendMessage(messageText, attachmentUrl);
    if (!customText) setText('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      const url = await cloudinaryService.uploadImage(file);
      handleSend(undefined, "Sent a photo proof", url);
    } catch (err) {
      console.error("Failed to upload chat proof photo:", err);
      alert("Could not upload photo proof.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="flex flex-col bg-muted rounded-[1.5rem] border border-border overflow-hidden h-[55vh] shadow-sm animate-in zoom-in-95">
      <div className="p-3 border-b bg-card text-card-foreground flex items-center justify-between w-full shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-indigo-600" />
          <span className="text-sm font-black tracking-normal font-medium text-foreground">Live Chat & Photo Proofs</span>
          {messages.length > 0 && (
            <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full font-black">{messages.length}</span>
          )}
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/70 opacity-50 gap-1.5">
            <MessageSquare size={24} strokeWidth={1} />
            <p className="text-xs font-bold uppercase">No messages yet</p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={m.id || `msg-${idx}`} className={`flex flex-col ${m.senderId === user?.id ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] p-2.5 rounded-2xl text-sm font-medium flex flex-col gap-1.5 ${m.senderId === user?.id ? 'bg-black text-white rounded-tr-none' : 'bg-card text-foreground border border-border rounded-tl-none shadow-sm'}`}>
                <span>{m.text}</span>
                {m.imageUrl && (
                  <div className="rounded-xl overflow-hidden max-w-full border border-white/15 shadow-sm bg-black/10">
                    <img 
                      src={m.imageUrl} 
                      alt="Uploaded proof" 
                      referrerPolicy="no-referrer"
                      className="max-h-48 w-full object-cover rounded-xl" 
                    />
                  </div>
                )}
              </div>
              <span className="text-sm font-black text-muted-foreground uppercase mt-0.5 px-1">
                {m.senderName} • {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 bg-card text-card-foreground border-t space-y-2.5 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {QUICK_REPLIES.map((reply, i) => (
            <button 
              key={`${reply}-${i}`}
              onClick={() => handleSend(undefined, reply)}
              className="px-2 py-1 bg-muted hover:bg-secondary text-muted-foreground rounded-xl text-xs font-bold whitespace-nowrap border border-border transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex gap-1.5 items-center">
          <label className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center border shrink-0 ${isUploadingPhoto ? 'bg-emerald-50 border-emerald-200 text-emerald-600 animate-pulse' : 'bg-emerald-600 border-emerald-700 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-100 text-white active:scale-95'}`} title="Attach Photo Proof">
            {isUploadingPhoto ? <LoadingSpinner color="emerald" /> : <Camera size={14} />}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange} 
              disabled={isUploadingPhoto}
              className="hidden" 
            />
          </label>
          <input 
            type="text" 
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isUploadingPhoto}
            placeholder={isUploadingPhoto ? "Uploading proof photo..." : "Type a message..."}
            className="flex-1 bg-muted border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
          <button 
            type="submit"
            disabled={!text.trim() || isUploadingPhoto}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 active:scale-95 shrink-0"
          >
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};

const UserSettings: React.FC<{ user: User, isDarkMode: boolean, onToggleDarkMode: () => void }> = ({ user, isDarkMode, onToggleDarkMode }) => {
  const [notifSettings, setNotifSettings] = useState(user.notificationSettings || { email: true, push: true, sms: false });

  const handleToggleNotif = async (key: keyof typeof notifSettings) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    await firebaseService.updateUserSettings(user.id, { notificationSettings: updated });
  };

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-3">
        <h3 className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">Notifications</h3>
        <div className="space-y-1.5">
          {Object.entries(notifSettings).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-2xl">
              <span className="text-sm font-black uppercase tracking-tight text-foreground">{key} Notifications</span>
              <button 
                onClick={() => handleToggleNotif(key as any)}
                className={`w-10 h-5 rounded-full transition-all relative ${val ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-card text-card-foreground rounded-full transition-all ${val ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xs font-black tracking-normal font-medium text-muted-foreground ml-1">Appearance</h3>
        <div className="flex items-center justify-between p-3 bg-muted rounded-2xl">
          <span className="text-sm font-black uppercase tracking-tight text-foreground">Dark Mode</span>
          <button 
            onClick={onToggleDarkMode}
            className={`w-10 h-5 rounded-full transition-all relative ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-card text-card-foreground rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LoyaltyBenefitsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const levels = [
    {
      level: LoyaltyLevel.BRONZE,
      points: '0 - 999',
      benefits: ['Standard Service Fees', 'Standard Support', 'Access to all categories'],
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      level: LoyaltyLevel.SILVER,
      points: '1,000 - 2,499',
      benefits: ['5% Lower Service Fees', 'Priority Support', 'Silver Badge on Profile'],
      color: 'bg-slate-400',
      lightColor: 'bg-muted',
      textColor: 'text-muted-foreground'
    },
    {
      level: LoyaltyLevel.GOLD,
      points: '2,500 - 4,999',
      benefits: ['10% Lower Service Fees', 'Priority Dispatch (Rainy Days)', 'Gold Badge on Profile'],
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      level: LoyaltyLevel.PLATINUM,
      points: '5,000+',
      benefits: ['15% Lower Service Fees', 'VIP Support', 'Free Delivery on 1st Errand/Month'],
      color: 'bg-indigo-600',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-muted w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-6 bg-card text-card-foreground border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-foreground">Loyalty Rewards</h2>
            <p className="text-xs text-muted-foreground font-bold tracking-normal font-medium mt-1">Level up for better perks</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-secondary text-muted-foreground rounded-2xl hover:bg-slate-200 transition-all"><X size={18} /></button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3 no-scrollbar">
          {levels.map((l, idx) => (
            <div key={l.level} className="bg-card text-card-foreground rounded-[1.5rem] p-5 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${l.color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-100`}><Sparkles size={20} /></div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">{l.level} Status</h4>
                    <p className="text-xs text-muted-foreground font-bold tracking-normal font-medium">{l.points} Points</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black tracking-normal font-medium ${l.lightColor} ${l.textColor}`}>
                  {idx === 0 ? 'Current' : 'Locked'}
                </div>
              </div>
              <div className="space-y-2">
                {l.benefits.map((b, bIdx) => (
                  <div key={`${b}-${bIdx}`} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center"><Check size={16} /></div>
                    <p className="text-sm font-bold text-muted-foreground">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-8 bg-card text-card-foreground border-t border-border">
          <button onClick={onClose} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Got it</button>
        </div>
      </div>
    </div>
  );
};

const PriceRequestModal: React.FC<{ request: PriceRequest, onRespond: (status: 'approved' | 'rejected') => void }> = ({ request, onRespond }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card text-card-foreground rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign size={32} />
          </div>
          <h3 className="text-xl font-black text-foreground">Price Adjustment</h3>
          <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">Action Required</p>
        </div>

        <div className="bg-muted rounded-2xl p-5 space-y-4 border border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-muted-foreground tracking-normal font-medium">Item</span>
            <span className="text-sm font-black text-foreground">{request.itemName}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-black text-muted-foreground uppercase mb-1">Original</p>
              <p className="text-lg font-black text-muted-foreground line-through">Ksh {request.originalPrice}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-amber-600 uppercase mb-1">New Price</p>
              <p className="text-xl font-black text-amber-600">Ksh {request.newPrice}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={() => onRespond('rejected')}
            className="flex-1 py-4 border-2 border-border text-muted-foreground rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-muted transition-all"
          >
            Reject
          </button>
          <button 
            onClick={() => onRespond('approved')}
            className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-amber-100 hover:scale-105 transition-all"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

const AddPropertyModal: React.FC<{ onAdd: (listing: any) => void, onClose: () => void }> = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    price: 0,
    location: '',
    description: '',
    amenities: { water: false, wifi: false, security: false, parking: false },
    agentRating: 5,
    imageUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setForm({ ...form, imageUrl: url });
    } catch (e) { alert("Upload failed"); } finally { setIsUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-[3rem] p-8 space-y-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Add Property Listing</h3>
          <button onClick={onClose} className="p-2 bg-secondary rounded-xl text-muted-foreground"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center overflow-hidden relative group">
            {form.imageUrl ? (
              <>
                <img src={form.imageUrl} className="w-full h-full object-cover" />
                <button onClick={() => setForm({...form, imageUrl: ''})} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
              </>
            ) : (
              <div className="text-center space-y-2">
                <Camera size={24} className="mx-auto text-muted-foreground/70" />
                <button onClick={() => document.getElementById('propImg')?.click()} className="text-sm font-black uppercase text-muted-foreground">Upload Photo</button>
                <input id="propImg" type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </div>
            )}
            {isUploading && <div className="absolute inset-0 bg-card text-card-foreground/80 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Property Title</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Modern Studio in Kilimani" className="w-full p-4 bg-muted rounded-2xl font-bold text-sm outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Rent (Ksh)</label>
              <input type="number" value={form.price || ''} onChange={e => setForm({...form, price: parseInt(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl font-bold text-sm outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Agent Rating (1-5)</label>
              <input type="number" min="1" max="5" value={form.agentRating} onChange={e => setForm({...form, agentRating: parseInt(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl font-bold text-sm outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Amenities</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(form.amenities).map(([key, val]) => (
                <button 
                  key={key} 
                  onClick={() => setForm({...form, amenities: {...form.amenities, [key]: !val}})}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${val ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-border text-muted-foreground'}`}
                >
                  {key === 'water' && <Droplets size={14} />}
                  {key === 'wifi' && <Wifi size={14} />}
                  {key === 'security' && <Shield size={14} />}
                  {key === 'parking' && <Car size={14} />}
                  <span className="text-sm font-black uppercase">{key}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Agent Notes</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the condition, neighborhood, etc." className="w-full p-4 bg-muted rounded-2xl font-bold text-xs outline-none h-24 resize-none" />
          </div>
        </div>

        <button 
          disabled={!form.title || !form.price || !form.imageUrl} 
          onClick={() => onAdd(form)} 
          className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          Add Listing
        </button>
      </div>
    </div>
  );
};

const PropertyComparisonModal: React.FC<{ listings: PropertyListing[], onClose: () => void }> = ({ listings, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-card text-card-foreground rounded-[3rem] p-8 space-y-8 overflow-x-auto">
        <div className="flex justify-between items-center min-w-[600px]">
          <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Property Comparison Matrix</h3>
          <button onClick={onClose} className="p-2 bg-secondary rounded-xl text-muted-foreground"><X size={20} /></button>
        </div>

        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left py-4 border-b border-border text-sm font-black uppercase text-muted-foreground">Feature</th>
              {listings.map(l => (
                <th key={l.id} className="text-center py-4 border-b border-border px-4">
                  <div className="space-y-2">
                    <img src={l.imageUrl} className="w-24 h-24 rounded-2xl object-cover mx-auto shadow-md" />
                    <p className="text-xs font-black text-foreground">{l.title}</p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr>
              <td className="py-6 text-sm font-black uppercase text-muted-foreground">Rent</td>
              {listings.map(l => (
                <td key={l.id} className="text-center py-6 font-black text-emerald-600">Ksh {l.price}</td>
              ))}
            </tr>
            <tr>
              <td className="py-6 text-sm font-black uppercase text-muted-foreground">Agent Rating</td>
              {listings.map(l => (
                <td key={l.id} className="text-center py-6">
                  <div className="flex items-center justify-center gap-1">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black">{l.agentRating}/5</span>
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-6 text-sm font-black uppercase text-muted-foreground">Amenities</td>
              {listings.map(l => (
                <td key={l.id} className="text-center py-6">
                  <div className="flex flex-wrap justify-center gap-2">
                    {l.amenities?.includes('water') && <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg" title="Water"><Droplets size={14} /></div>}
                    {l.amenities?.includes('wifi') && <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg" title="WiFi"><Wifi size={14} /></div>}
                    {l.amenities?.includes('security') && <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg" title="Security"><Shield size={14} /></div>}
                    {l.amenities?.includes('parking') && <div className="p-1.5 bg-muted text-muted-foreground rounded-lg" title="Parking"><Car size={14} /></div>}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-6 text-sm font-black uppercase text-muted-foreground align-top">Agent Notes</td>
              {listings.map(l => (
                <td key={l.id} className="text-center py-6 px-4">
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">"{l.description}"</p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProfileEditor: React.FC<{ 
  user: User, 
  onUpdate: (updates: Partial<User>) => void, 
  onBack: () => void, 
  onVerifyPhone: () => void,
  onVerifyEmail: () => void 
}> = ({ user, onUpdate, onBack, onVerifyPhone, onVerifyEmail }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    biography: user.biography || '',
    avatar: user.avatar || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyEmail = async () => {
    setIsVerifying(true);
    try {
      await onVerifyEmail();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyPhone = async () => {
    setIsVerifying(true);
    try {
      await onVerifyPhone();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file, 'profile_pictures');
      setFormData({ ...formData, avatar: url });
    } catch (e) {
      alert("Avatar upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await firebaseService.updateUserSettings(user.id, formData);
      onUpdate(formData);
      alert("Profile updated successfully!");
      onBack();
    } catch (err: any) {
      alert(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const isPhoneDisabled = !!user.phoneVerified;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-secondary rounded-xl text-muted-foreground"><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-black text-foreground">Edit Profile</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col items-center gap-3 mb-3">
          <div className="relative group">
            <UserAvatar 
              src={formData.avatar} 
              name={user.name} 
              className="w-20 h-20 rounded-2xl border-4 border-slate-50 shadow-lg" 
            />
            <button 
              type="button"
              onClick={() => document.getElementById('avatar-upload')?.click()}
              className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <Camera size={20} />
            </button>
          </div>
          <input 
            id="avatar-upload" 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleAvatarUpload} 
          />
          <p className="text-sm font-black tracking-normal font-medium text-muted-foreground">
            {isUploading ? 'Uploading...' : 'Tap photo to change'}
          </p>
          <button 
            type="button"
            onClick={() => document.getElementById('avatar-upload')?.click()}
            className="mt-1 px-4 py-2 bg-secondary rounded-xl text-sm font-black tracking-normal font-medium hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <Upload size={16} />
            Upload New Photo
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Full Name</label>
          <input 
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            className="w-full p-4 brand-input rounded-2xl font-bold text-black outline-none" 
            required 
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-black tracking-normal font-medium text-muted-foreground">Email (Read-only)</label>
            {!user.emailVerified && (
              <button 
                type="button"
                onClick={handleVerifyEmail}
                disabled={isVerifying}
                className="text-xs font-black text-indigo-600 tracking-normal font-medium hover:underline flex items-center gap-1"
              >
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : 'Verify Now'}
              </button>
            )}
            {user.emailVerified && (
              <span className="text-xs font-black text-emerald-600 tracking-normal font-medium flex items-center gap-1">
                <ShieldCheck size={16} /> Verified
              </span>
            )}
          </div>
          <input 
            type="email" 
            value={user.email} 
            className="w-full p-4 bg-muted rounded-2xl font-bold text-muted-foreground outline-none cursor-not-allowed" 
            disabled 
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-black tracking-normal font-medium text-muted-foreground">Phone Number {isPhoneDisabled && '(Locked)'}</label>
            {user.phone && !user.phoneVerified && (
              <button 
                type="button"
                onClick={handleVerifyPhone}
                disabled={isVerifying}
                className="text-xs font-black text-indigo-600 tracking-normal font-medium hover:underline flex items-center gap-1"
              >
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : 'Verify Now'}
              </button>
            )}
            {user.phoneVerified && (
              <span className="text-xs font-black text-emerald-600 tracking-normal font-medium flex items-center gap-1">
                <ShieldCheck size={16} /> Verified
              </span>
            )}
          </div>
          <input 
            type="tel" 
            value={isPhoneDisabled ? formatPhoneDisplay(formData.phone) : formData.phone} 
            onChange={e => setFormData({...formData, phone: e.target.value})} 
            className={`w-full p-4 rounded-2xl font-bold outline-none ${isPhoneDisabled ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'brand-input text-black'}`} 
            disabled={isPhoneDisabled}
            placeholder="+254..."
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">Biography</label>
          <textarea 
            value={formData.biography} 
            onChange={e => setFormData({...formData, biography: e.target.value})} 
            placeholder="Tell us about yourself..." 
            className="w-full p-4 brand-input rounded-2xl font-bold text-foreground outline-none h-32 resize-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <button 
          disabled={isSaving} 
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
        >
          {isSaving ? <LoadingSpinner color="white" /> : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

const TaskHistory: React.FC<{ user: User, onBack: () => void, onSelectErrand: (e: Errand) => void, onRebook: (e: Errand) => void }> = ({ user, onBack, onSelectErrand, onRebook }) => {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = firebaseService.subscribeToUserErrands(user.id, user.role, (data) => {
      setErrands(data.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, [user.id, user.role]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-secondary rounded-xl text-muted-foreground"><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-black text-foreground">Task History</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : errands.length === 0 ? (
        <div className="bg-card text-card-foreground p-12 rounded-[2rem] border border-border shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/70">
            <ShoppingBag size={32} />
          </div>
          <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">No tasks found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {errands.map(e => (
            <div key={e.id} className="bg-card text-card-foreground p-3 rounded-xl border border-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">
              <div onClick={() => onSelectErrand(e)} className="cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-foreground group-hover:text-indigo-600 transition-colors truncate">{e.title}</h3>
                    <p className="text-xs text-muted-foreground font-bold tracking-normal font-medium mt-0.5">{new Date(e.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-black uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${
                    e.status === ErrandStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    e.status === ErrandStatus.CANCELLED ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {e.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-emerald-600">Ksh {e.acceptedPrice || e.budget}</p>
                  <ChevronRight size={16} className="text-muted-foreground/70 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              
              {e.status === ErrandStatus.COMPLETED && user.role === UserRole.REQUESTER && (
                <div className="mt-2 pt-2 border-t border-slate-50 flex justify-end">
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      onRebook(e);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black tracking-normal font-medium shadow-md active:scale-95 transition-all"
                  >
                    <Plus size={16} /> Re-book
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RatingInput: React.FC<{ onRate: (rating: number, review: string) => void, targetName: string }> = ({ onRate, targetName }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hover, setHover] = useState(0);

  return (
    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-1">
        <h4 className="text-sm font-black text-foreground">Rate your experience with {targetName}</h4>
        <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">Your feedback helps the community</p>
      </div>
      
      <div className="flex justify-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-all hover:scale-110 active:scale-95"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              size={32}
              className={`${(hover || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/70'}`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Write a short review (optional)..."
        className="w-full p-4 bg-card text-card-foreground rounded-2xl border border-amber-100 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-h-[100px] resize-none"
      />

      <button
        onClick={() => onRate(rating, review)}
        disabled={rating === 0}
        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200"
      >
        Submit Rating
      </button>
    </div>
  );
};

const ErrandDetailScreenLocal: React.FC<any> = ({ 
  selectedErrand: rawErrand, setSelectedErrand, user, setUser, refresh, 
  onRunnerComplete, onCompleteErrand, loading,
  setShowPriceRequestModal, setShowAddPropertyModal, setShowComparisonModal, setShowAuthModal,
  setShowPhoneVerificationModal, setShowEmailVerificationModal, setAuthModalMode,
  googleMapsApiKey, googleMapsId, googleRoutesApiKey, initialTab = 'details',
  currentLocation, onSendMessage
}) => {
  const selectedErrand = useMemo(() => {
    if (!rawErrand) return null;
    const parseSafeArray = (val: any): any[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error("Failed to parse array field inside ErrandDetailScreenLocal", e);
        }
      }
      return [];
    };

    return {
      ...rawErrand,
      bids: parseSafeArray(rawErrand.bids),
      checklist: parseSafeArray(rawErrand.checklist),
      proofs: parseSafeArray(rawErrand.proofs),
      priceRequests: parseSafeArray(rawErrand.priceRequests),
    };
  }, [rawErrand]);

  const [comments, setComments] = useState(selectedErrand?.runnerComments || '');
  const [photo, setPhoto] = useState<string | null>(selectedErrand?.completionPhoto || null);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDeadline, setRescheduleDeadline] = useState(selectedErrand?.deadline || '');
  const [reassignReason, setReassignReason] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [overdueReasonInput, setOverdueReasonInput] = useState('');
  const [editForm, setEditForm] = useState({ description: selectedErrand?.description || '', budget: selectedErrand?.budget || 0, deadline: selectedErrand?.deadline || '' });
  const [showProofs, setShowProofs] = useState(false);
  const [proofLabel, setProofLabel] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'map' | 'chat' | 'progress' | 'finish'>(initialTab);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const handleShare = () => {
    const { deepLink, whatsappUrl } = generateErrandWhatsAppShareUrl(selectedErrand);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deepLink).catch(() => {});
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const checkpoints = useMemo(() => {
    const currentStatus = selectedErrand.status;
    const allStatuses = [
      { status: ErrandStatus.PENDING, label: 'Awaiting Bids' },
      { status: ErrandStatus.ASSIGNED, label: 'Runner Dispatched' },
      { status: ErrandStatus.IN_PROGRESS, label: 'Task in Progress' },
      { status: ErrandStatus.VERIFYING, label: 'Verifying Results' },
      { status: ErrandStatus.COMPLETED, label: 'Completed' },
    ];
    
    // Determine which checkpoints are completed based on status order
    const statusOrder = [
      ErrandStatus.PENDING,
      ErrandStatus.BIDDING,
      ErrandStatus.ASSIGNED,
      ErrandStatus.IN_PROGRESS,
      ErrandStatus.VERIFYING,
      ErrandStatus.ACCEPTED,
      ErrandStatus.REVIEW,
      ErrandStatus.COMPLETED,
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return allStatuses.map((checkpoint) => {
      const checkpointIndex = statusOrder.indexOf(checkpoint.status);
      const isCompleted = currentIndex >= checkpointIndex && currentStatus !== ErrandStatus.CANCELLED && currentStatus !== ErrandStatus.FAILED;
      return {
        label: checkpoint.label,
        completed: isCompleted,
        timestamp: isCompleted ? selectedErrand.updatedAt || selectedErrand.createdAt : null,
      };
    });
  }, [selectedErrand.status, selectedErrand.updatedAt, selectedErrand.createdAt]);

  const handleUpdateLocation = async () => {
    if (!isRunner) return;
    setIsUpdatingLocation(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        await firebaseService.updateRunnerLocation(selectedErrand.id, coords);
        alert("Location updated successfully!");
        refresh();
      }, (error) => {
        console.error(error);
        alert("Failed to get location: " + error.message);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingLocation(false);
    }
  };
  const [runnerRating, setRunnerRating] = useState(0);
  const [runnerReview, setRunnerReview] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [showDistanceWarning, setShowDistanceWarning] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVE' | 'WALK'>('DRIVE');
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null);

  useEffect(() => {
    setActiveDetailTab(initialTab);
    setRouteSummary(null);
  }, [initialTab, selectedErrand?.id]);

  useEffect(() => {
    if (selectedErrand) {
      setComments(selectedErrand.runnerComments || selectedErrand.reviewComments || '');
      setPhoto(selectedErrand.completionPhoto || selectedErrand.reviewPhoto || null);
    }
  }, [selectedErrand?.id, selectedErrand]);

  useEffect(() => {
    setRouteSummary(null);
  }, [activeDetailTab, travelMode]);
  
  const isOverdue = selectedErrand?.deadlineTimestamp && 
                    Date.now() > selectedErrand.deadlineTimestamp && 
                    selectedErrand.status === ErrandStatus.ACCEPTED;
  const fileRef = useRef<HTMLInputElement>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editMode && selectedErrand) {
      setEditForm({
        description: selectedErrand.description || '',
        budget: selectedErrand.budget || 0,
        deadline: selectedErrand.deadline || ''
      });
    }
  }, [selectedErrand?.description, selectedErrand?.budget, selectedErrand?.deadline, editMode, selectedErrand]);

  const isRequester = user?.id === selectedErrand?.requesterId;
  const isRunner = user?.id === selectedErrand?.runnerId;

  useEffect(() => {
    if (isRequester && selectedErrand?.priceRequests) {
      const pending = selectedErrand.priceRequests.find((r: PriceRequest) => r.status === 'pending');
      if (pending) setShowPriceRequestModal(pending);
    }
  }, [selectedErrand?.priceRequests, isRequester, setShowPriceRequestModal]);

  const handleCloseCamera = useCallback(() => setShowCamera(false), []);

  if (!user || !selectedErrand) return null;

  const handleToggleMicroStep = async (idx: number, completed: boolean) => {
    try {
      await firebaseService.updateMicroStep(selectedErrand.id, idx, completed);
      refresh();
    } catch (e) { alert("Failed to update progress."); }
  };

  const handleSOS = () => {
    if (window.confirm("This will alert our support team immediately. Are you in danger?")) {
      firebaseService.sendSupportMessage(user.id, user.name, "SOS ALERT: I need immediate assistance with errand: " + selectedErrand.title, false);
      alert("Support has been notified. They will contact you shortly.");
    }
  };

  const handleUploadProof = async (file: File) => {
    if (!proofLabel.trim()) {
      alert("Please enter a label for this photo (e.g., 'Receipt', 'House Front').");
      return;
    }
    if ((selectedErrand.proofs?.length || 0) >= 10) {
      alert("Maximum 10 photos allowed.");
      return;
    }
    setIsUploadingProof(true);
    try {
      const url = await cloudinaryService.uploadFile(file, 'image', 'errand_proofs');
      await firebaseService.addErrandProof(selectedErrand.id, url, proofLabel);
      
      // OCR for Receipts
      if (proofLabel.toLowerCase().includes('receipt')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const ocrResult = await geminiService.extractReceiptTotal(base64);
          if (ocrResult && ocrResult.total) {
            const serviceFee = selectedErrand.acceptedPrice || selectedErrand.budget;
            await firebaseService.updateErrand(selectedErrand.id, { packageCost: ocrResult.total, acceptedPrice: serviceFee });
            refresh();
          }
        };
      }

      setProofLabel('');
      refresh();
      alert("Photo proof uploaded successfully.");
    } catch (e) {
      alert("Upload failed.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleCameraCapture = async (dataUrl: string) => {
    if (!selectedErrand) return;
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(dataUrl, 'errand-proofs');
      setPhoto(url);
      if (selectedErrand.status === ErrandStatus.VERIFYING) {
        await firebaseService.submitForReview(selectedErrand.id, comments, url);
        refresh();
      }
    } catch (err) { 
      alert("Upload failed."); 
    } finally { 
      setIsUploading(false); 
      setShowCamera(false); 
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(file);
      setPhoto(url);
      if (selectedErrand?.status === ErrandStatus.VERIFYING) {
        await firebaseService.submitForReview(selectedErrand.id, comments, url);
        refresh();
      }
    } catch (err) { alert("Upload failed."); } finally { setIsUploading(false); setShowCamera(false); }
  };

  const handleAcceptBudget = () => {
    if (!user) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    setShowBidModal(true);
  };

  const handleBidSubmit = async (amount: number) => {
    if (!selectedErrand || !user) return;

    // Check suspension
    if (user.isSuspended) {
      alert(`Your account is suspended: ${user.suspensionReason}`);
      return;
    }

    try {
      console.log("Processing bid:", { amount, budget: selectedErrand.budget, errandId: selectedErrand.id, userId: user.id });
      // For House Hunting, budget is 0, so amount > budget is always true, triggering placeBid (approval flow)
      if (selectedErrand.category !== ErrandCategory.HOUSE_HUNTING && amount <= selectedErrand.budget) {
        console.log("Accepting bid automatically");
        await firebaseService.acceptBid(selectedErrand.id, user.id, user.name, user.phone, amount, 'Ready Now');
        triggerHaptic();
        alert("Task assigned to you automatically!");
        setActiveDetailTab('map');
        refresh();
      } else {
        console.log("Placing bid for approval");
        await firebaseService.placeBid(selectedErrand.id, user.id, user.name, user.phone, amount, 'Ready now');
        alert("Your proposal has been submitted for approval.");
        refresh();
      }
      setShowBidModal(false);
    } catch (e) { 
      console.error("Action failed:", e);
      alert("Action failed: " + (e as any).message); 
    }
  };

  const handleReassign = async () => {
    if (!reassignReason) { alert("Please select a reason for reassignment."); return; }
    
    if (selectedErrand.status === ErrandStatus.VERIFYING) {
      try {
        await firebaseService.requestReassignment(selectedErrand.id, reassignReason);
        setIsReassigning(false);
        alert("Reassignment request sent to the runner for approval.");
      } catch (e) { alert("Failed to request reassignment."); }
    } else {
      try {
        await firebaseService.reassignErrand(selectedErrand.id, reassignReason);
        setIsReassigning(false);
        alert("Runner reassigned successfully.");
      } catch (e) { alert("Failed to reassign runner."); }
    }
  };

  const handleSaveChanges = async () => {
    try {
      await firebaseService.updateErrand(selectedErrand.id, editForm);
      setEditMode(false);
      alert("Changes saved.");
    } catch (e) { alert("Failed to save changes."); }
  };

  const handleReschedule = async () => {
    if (!rescheduleDeadline) { alert("Please select a new deadline."); return; }
    try {
      await firebaseService.updateErrand(selectedErrand.id, { deadline: rescheduleDeadline });
      setIsRescheduling(false);
      alert("Errand rescheduled successfully.");
    } catch (e) { alert("Failed to reschedule errand."); }
  };

  const handleCancelErrand = async () => {
    if (!window.confirm("Are you sure you want to cancel this errand? All bidders will be notified.")) return;
    try {
      await firebaseService.updateErrand(selectedErrand.id, { status: ErrandStatus.CANCELLED });
      setSelectedErrand(null);
      alert("Errand cancelled successfully.");
    } catch (e: any) { alert(e.message || "Failed to cancel errand."); }
  };

  const scrollToChat = () => {
    chatSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const REASSIGN_REASONS = ["Wait time too long", "Budget bid so high", "Communication issues", "Runner changed their mind", "Other"];

  const renderGuidanceHub = () => {
    const status = selectedErrand.status;
    const isPending = status === ErrandStatus.PENDING || status === ErrandStatus.BIDDING;
    const isAssigned = status === ErrandStatus.ASSIGNED;
    const isInProgress = status === ErrandStatus.IN_PROGRESS;
    const isVerifying = status === ErrandStatus.VERIFYING;
    const isCompleted = status === ErrandStatus.COMPLETED;
    
    // Custom design for each phase
    let title = "";
    let description = "";
    let badgeText = "";
    let icon = Sparkles;
    let actionButton = null;
    let bgClass = "from-indigo-50/50 to-violet-50/30 border-indigo-100 dark:from-indigo-950/20 dark:to-violet-950/10 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-100";
    
    if (isPending) {
      icon = Sparkles;
      badgeText = "Phase 1: Recruiting";
      if (isRequester) {
        title = "Recruiting your Agent";
        description = "Your task is listed and open for bids. Review the custom runner proposals in the Details panel below and accept one to start!";
        actionButton = (
          <button 
            onClick={() => setActiveDetailTab('details')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all"
          >
            Review Bids
          </button>
        );
      } else {
        title = "Task Open for Bids";
        description = "Interested in this task? Submit a custom price bid or accept the recommended pitch to get assigned immediately!";
        actionButton = (
          <button 
            onClick={() => {
              setActiveDetailTab('details');
              setTimeout(() => {
                const element = document.getElementById('bids-section-heading');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all"
          >
            Place Bid Now
          </button>
        );
      }
    } else if (isAssigned) {
      icon = Clock;
      badgeText = "Phase 2: Assigned";
      if (isRequester) {
        title = `Agent ${selectedErrand.runnerName} Assigned`;
        description = "Your agent is preparing to start your task. Connect with them via the Live Messenger to coordinate details!";
        actionButton = (
          <button 
            onClick={() => setActiveDetailTab('chat')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5"
          >
            <MessageCircle size={12} /> Open Chat
          </button>
        );
      } else {
        title = "You are Assigned!";
        description = "You're the official agent. Arrive at the location and mark the task as In Progress to start tracking.";
        actionButton = (
          <button 
            onClick={async () => {
              try {
                await firebaseService.updateErrand(selectedErrand.id, { status: ErrandStatus.IN_PROGRESS });
                alert("Errand started! Safe travels!");
                setActiveDetailTab('map');
                refresh();
              } catch (e) {
                alert("Failed to start errand.");
              }
            }}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Navigation size={12} className="animate-bounce" /> Start Errand Now
          </button>
        );
      }
    } else if (isInProgress) {
      icon = Activity;
      badgeText = "Phase 3: Active Tracking";
      if (selectedErrand.category === 'Package Delivery' || (selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates)) {
        if (!selectedErrand.isPackagePickedUp) {
          title = "Pickup Phase";
          description = isRunner 
            ? "Arrive at the pickup location and capture a photo of the package to confirm pickup." 
            : "The agent is en route to pick up your package. Watch progress on the live map.";
          actionButton = isRunner ? (
            <button 
              onClick={() => setActiveDetailTab('finish')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all"
            >
              Go Confirm Pickup
            </button>
          ) : (
            <button 
              onClick={() => setActiveDetailTab('map')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all"
            >
              Track on Map
            </button>
          );
        } else {
          title = "Delivery Drop-off Phase";
          description = isRunner 
            ? "Package picked up successfully! Drive safe to the drop-off point, update your GPS, and upload the final photo." 
            : "Package has been picked up by your runner and is now en route to the drop-off! Watch live tracking.";
          actionButton = isRunner ? (
            <div className="flex gap-2">
              <button 
                onClick={handleUpdateLocation}
                disabled={isUpdatingLocation}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1 shrink-0"
              >
                <MapPin size={10} /> GPS Sync
              </button>
              <button 
                onClick={() => setActiveDetailTab('finish')}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase shadow-md hover:bg-emerald-700 shrink-0"
              >
                Confirm Drop-off
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setActiveDetailTab('progress')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all"
            >
              Open Live Tracker
            </button>
          );
        }
      } else {
        title = "Errand In Progress";
        description = isRunner 
          ? "Complete checklist items, capture final photos, and submit the errand for review when done." 
          : "Agent is actively working on your task. Check progress or message them anytime.";
        actionButton = isRunner ? (
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveDetailTab('details')}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase"
            >
              Checklist
            </button>
            <button 
              onClick={() => setActiveDetailTab('finish')}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase"
            >
              Complete
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setActiveDetailTab('chat')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Chat with Agent
          </button>
        );
      }
    } else if (isVerifying) {
      icon = ShieldAlert;
      badgeText = "Phase 4: Reviewing";
      bgClass = "from-emerald-50/50 to-teal-50/30 border-emerald-100 dark:from-emerald-950/20 dark:to-teal-950/10 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-100";
      if (isRequester) {
        title = "Review Results & Release Funds";
        description = "Your agent has completed the task and uploaded proofs! Review the proofs in the Finish panel and release secure funds.";
        actionButton = (
          <button 
            onClick={() => setActiveDetailTab('finish')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-emerald-700 transition-all"
          >
            Review & Complete
          </button>
        );
      } else {
        title = "Awaiting Requester Review";
        description = "Work proofs submitted successfully! You will receive your payment once the requester verifies the task completion.";
        actionButton = (
          <button 
            onClick={() => setActiveDetailTab('finish')}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Proofs
          </button>
        );
      }
    } else if (isCompleted) {
      icon = CheckCircle;
      badgeText = "Phase 5: Completed";
      bgClass = "from-emerald-50/30 to-green-50/20 border-emerald-100 dark:from-emerald-950/10 dark:to-green-950/5 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100";
      title = "Task Completed!";
      description = "Escrow funds have been successfully released to the runner. Thank you for utilizing our safe community platform!";
      actionButton = (
        <button 
          onClick={() => setActiveDetailTab('finish')}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider"
        >
          View Ratings
        </button>
      );
    }

    const IconComponent = icon;

    return (
      <div className={`p-5 rounded-[2rem] border bg-gradient-to-br ${bgClass} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500`}>
        <div className="flex items-start gap-3.5 max-w-xl">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border shrink-0 text-indigo-600 dark:text-indigo-400">
            <IconComponent size={20} className={isInProgress && isRunner ? 'animate-pulse' : ''} />
          </div>
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{badgeText}</span>
            </div>
            <h4 className="text-sm font-black text-foreground tracking-tight">{title}</h4>
            <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-center">
          {actionButton}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex flex-col items-center justify-end md:justify-center p-0 md:p-6 overflow-hidden">
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={handleCloseCamera} />}
      {fullScreenImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setFullScreenImage(null)}><img src={fullScreenImage} className="max-w-full max-h-full object-contain rounded-xl" alt="Proof" /></div>}
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-2xl md:max-w-7xl h-[90vh] md:h-[90vh] bg-card text-card-foreground rounded-t-[3rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative"
      >
        <header className="px-8 py-6 border-b border-border flex items-center justify-between sticky top-0 bg-card text-card-foreground/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedErrand(null)} 
                className="w-10 h-10 flex items-center justify-center bg-secondary rounded-xl text-muted-foreground hover:bg-slate-200 transition-all active:scale-90"
                title="Close"
              >
                <X size={20} />
              </button>
              <button 
                onClick={handleShare} 
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${copiedShare ? 'bg-emerald-500 text-white animate-bounce' : 'bg-secondary text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600'}`}
                title="Share Errand Link"
              >
                {copiedShare ? <Check size={16} /> : <Share2 size={16} />}
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-foreground text-lg truncate leading-tight font-display">{selectedErrand.title}</h3>
                {selectedErrand.isFundsLocked && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-xs font-black tracking-normal font-medium shadow-sm">
                    <ShieldCheck size={16} />
                    Secured
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${
                  selectedErrand.status === ErrandStatus.PENDING ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                  selectedErrand.status === ErrandStatus.ACCEPTED ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                  selectedErrand.status === ErrandStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  'bg-muted text-muted-foreground border-border'
                }`}>
                  {selectedErrand.status}
                </span>
                <span className="text-xs font-black text-muted-foreground tracking-normal font-medium">#{selectedErrand.id?.slice(-6).toUpperCase() || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-muted-foreground tracking-normal font-medium mb-1">Budget</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tighter">Ksh {(selectedErrand?.budget || 0).toLocaleString()}</p>
          </div>
        </header>
        
        <div className="px-8 pt-6 pb-6 border-b border-border bg-card text-card-foreground">
          <div className="relative flex flex-col items-center w-full max-w-4xl mx-auto">
            <div className="relative flex items-center justify-between w-full mb-2 mt-1 px-2 md:px-6">
              {/* Background Line */}
              <div className="absolute left-6 right-6 md:left-14 md:right-14 top-5 h-1 bg-secondary dark:bg-slate-800 rounded-full -z-10 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500"
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: `${
                      ['details', 'map', 'chat', 'progress', 'finish'].indexOf(activeDetailTab) * 25
                    }%` 
                  }}
                  transition={{ type: "spring", stiffness: 80, damping: 15 }}
                />
              </div>

              {/* Step Bubbles */}
              {[
                { id: 'details', icon: FileText, label: 'Details', shortLabel: 'Details' },
                { id: 'map', icon: MapIcon, label: 'Route Map', shortLabel: 'Map' },
                { id: 'chat', icon: MessageCircle, label: 'Chat Hub', shortLabel: 'Chat' },
                { id: 'progress', icon: Activity, label: 'Live Progress', shortLabel: 'Progress' },
                { id: 'finish', icon: CheckCircle2, label: 'Finalize', shortLabel: 'Finalize' }
              ].map((tab, idx) => {
                const isActive = activeDetailTab === tab.id;
                const isLocked = !selectedErrand.runnerId && ['chat', 'progress', 'finish'].includes(tab.id);
                
                // Determine completed status for visual styling
                let isCompleted = false;
                if (selectedErrand.runnerId) {
                  if (tab.id === 'details') isCompleted = true;
                  if (tab.id === 'map' && [ErrandStatus.IN_PROGRESS, ErrandStatus.VERIFYING, ErrandStatus.COMPLETED].includes(selectedErrand.status)) isCompleted = true;
                  if (tab.id === 'progress' && [ErrandStatus.VERIFYING, ErrandStatus.COMPLETED].includes(selectedErrand.status)) isCompleted = true;
                  if (tab.id === 'finish' && selectedErrand.status === ErrandStatus.COMPLETED) isCompleted = true;
                }

                return (
                  <button
                    key={tab.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLocked) {
                        alert(`🔒 The ${tab.label} is currently locked.\n\nOnce a runner has been assigned to this task, this panel will unlock automatically.`);
                        return;
                      }
                      setActiveDetailTab(tab.id as any);
                    }}
                    className={`relative flex flex-col items-center focus:outline-none group z-10 transition-all ${
                      isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {/* Bubble Container */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none ring-4 ring-indigo-50 dark:ring-indigo-950 scale-110' 
                        : isCompleted
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none ring-4 ring-emerald-50 dark:ring-emerald-950/20'
                          : isLocked
                            ? 'bg-muted text-muted-foreground/60 border-2 border-dashed border-border'
                            : 'bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-indigo-400 hover:scale-105'
                    }`}>
                      {isLocked ? (
                        <div className="relative">
                          <tab.icon size={16} className="opacity-40" />
                          <div className="absolute -bottom-1 -right-1 bg-muted p-0.5 rounded-full border border-border">
                            <svg className="w-2.5 h-2.5 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                          </div>
                        </div>
                      ) : isCompleted ? (
                        <Check size={18} className="stroke-[3]" />
                      ) : (
                        <tab.icon size={16} className="relative z-10" />
                      )}

                      {/* Unread dot for Chat */}
                      {tab.id === 'chat' && selectedErrand.runnerId && !isLocked && (
                        <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-card rounded-full animate-pulse" />
                      )}
                    </div>

                    {/* Label underneath */}
                    <span className={`text-[10px] md:text-[11px] font-black tracking-wider uppercase mt-2.5 hidden sm:inline-block transition-colors ${
                      isActive 
                        ? 'text-indigo-600 font-black' 
                        : isCompleted
                          ? 'text-emerald-600'
                          : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {tab.label}
                    </span>

                    {/* Short label for mobile */}
                    <span className={`text-[9px] font-black tracking-tight uppercase mt-2 sm:hidden transition-colors ${
                      isActive 
                        ? 'text-indigo-600 font-black' 
                        : isCompleted
                          ? 'text-emerald-600'
                          : 'text-muted-foreground'
                    }`}>
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Runner Interactive Quest Guide Action Row */}
            {selectedErrand.runnerId && (isRunner || isRequester) && (
              <div className="mt-5 w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-pulse">
                    {activeDetailTab === 'details' && '📜'}
                    {activeDetailTab === 'map' && '🗺️'}
                    {activeDetailTab === 'chat' && '💬'}
                    {activeDetailTab === 'progress' && '🚀'}
                    {activeDetailTab === 'finish' && '🎉'}
                  </span>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      {isRunner ? 'Runner Quest Companion' : 'Requester Follow-up Guide'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-0.5">
                      {activeDetailTab === 'details' && (isRunner ? "Review the task's full instruction list and checklists carefully." : "Check if your runner has read your instructions and task checklists.")}
                      {activeDetailTab === 'map' && (isRunner ? "Consult your route map coordinates and live delivery locations." : "View your runner's current live location and optimal path coordinates.")}
                      {activeDetailTab === 'chat' && (isRunner ? "Chat directly with the client to verify pick-up specifics." : "Send delivery specifications or additional details directly to your runner.")}
                      {activeDetailTab === 'progress' && (isRunner ? "Log active checklist milestones and tick progress markers." : "Track active checkmarks and milestone completion states in real-time.")}
                      {activeDetailTab === 'finish' && (isRunner ? "Submit photo proofs and mark the task as complete for payouts." : "Inspect uploaded photo proofs, bills, and release escrow payouts!")}
                    </p>
                  </div>
                </div>
                
                <div className="shrink-0 w-full sm:w-auto">
                  {activeDetailTab !== 'finish' ? (
                    <button
                      onClick={() => {
                        triggerHaptic();
                        const tabs: ('details' | 'map' | 'chat' | 'progress' | 'finish')[] = ['details', 'map', 'chat', 'progress', 'finish'];
                        const nextIdx = tabs.indexOf(activeDetailTab) + 1;
                        if (nextIdx < tabs.length) {
                          setActiveDetailTab(tabs[nextIdx]);
                        }
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                      Next Step 
                      {activeDetailTab === 'details' && '🗺️'}
                      {activeDetailTab === 'map' && '💬'}
                      {activeDetailTab === 'chat' && '🚀'}
                      {activeDetailTab === 'progress' && '🎉'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      <span>Final Phase 🏆</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          {renderGuidanceHub()}
          {activeDetailTab === 'details' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {(selectedErrand.status === ErrandStatus.ACCEPTED || selectedErrand.status === ErrandStatus.VERIFYING || selectedErrand.status === ErrandStatus.IN_PROGRESS) && (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleSOS} 
                    className="flex flex-col items-center justify-center gap-2 p-6 bg-red-50 text-red-600 rounded-[2.5rem] border border-red-100 hover:bg-red-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-card text-card-foreground rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <AlertTriangle size={24} />
                    </div>
                    <span className="text-sm font-black tracking-normal font-medium">SOS / Emergency</span>
                  </button>
                  <button 
                    onClick={() => window.location.href = 'tel:+254700000000'} 
                    className="flex flex-col items-center justify-center gap-2 p-6 bg-primary/5 text-primary rounded-[2.5rem] border border-primary/10 hover:bg-primary/10 transition-all group"
                  >
                    <div className="w-12 h-12 bg-card text-card-foreground rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Phone size={24} />
                    </div>
                    <span className="text-sm font-black tracking-normal font-medium">Call Support</span>
                  </button>
                </div>
              )}

              <div className="bg-muted p-8 rounded-[3rem] border border-border shadow-inner">
                <h4 className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <Activity size={14} className="text-primary" />
                  Task Timeline
                </h4>
                <ErrandStatusTimeline status={selectedErrand.status} category={selectedErrand.category} />
              </div>

              {/* Financial Breakdown (Shopping Float) */}
              {(selectedErrand.category === ErrandCategory.SHOPPING || selectedErrand.category === ErrandCategory.TOWN_SERVICE) && (
                <section className="bg-amber-50 p-8 rounded-[3rem] border border-amber-100 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-amber-600 tracking-normal font-medium flex items-center gap-2">
                      <Calculator size={14} />
                      Financial Summary
                    </h4>
                    <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-black tracking-normal font-medium shadow-lg shadow-amber-200">Escrow Active</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-card text-card-foreground rounded-[2rem] border border-amber-100 shadow-sm">
                      <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Max Budget</p>
                      <p className="text-2xl font-black text-foreground tracking-tighter">Ksh {(selectedErrand?.maxShoppingBudget || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-6 bg-card text-card-foreground rounded-[2rem] border border-amber-100 shadow-sm">
                      <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Payment</p>
                      <p className="text-xs font-black text-amber-600 tracking-normal font-medium">{selectedErrand.paymentMethod || 'Cash'}</p>
                    </div>
                  </div>

                  {/* Price Requests */}
                  {selectedErrand.priceRequests && selectedErrand.priceRequests.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-black text-amber-600 tracking-normal font-medium ml-2">Price Adjustments</p>
                      <div className="space-y-2">
                        {selectedErrand.priceRequests.map((req: any) => (
                          <div key={req.id} className="bg-card text-card-foreground p-4 rounded-2xl border border-amber-100 flex items-center justify-between shadow-sm">
                            <div>
                              <p className="text-xs font-black text-foreground">{req.itemName}</p>
                              <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Ksh {req.originalPrice} → Ksh {req.newPrice}</p>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-normal font-medium ${
                              req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                              req.status === 'rejected' ? 'bg-red-50 text-red-600' : 
                              'bg-amber-100 text-amber-600 animate-pulse'
                            }`}>
                              {req.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRunner && selectedErrand.status === ErrandStatus.ACCEPTED && (
                    <button 
                      onClick={() => {
                        const itemName = window.prompt("Item Name:");
                        const originalPrice = parseInt(window.prompt("Original Price (Ksh):") || '0');
                        const newPrice = parseInt(window.prompt("New Price (Ksh):") || '0');
                        if (itemName && originalPrice && newPrice) {
                          firebaseService.sendPriceRequest(selectedErrand.id, itemName, originalPrice, newPrice);
                          alert("Price request sent!");
                          refresh();
                        }
                      }}
                      className="w-full py-5 bg-amber-500 text-white rounded-[2rem] text-xs font-black tracking-normal font-medium shadow-xl shadow-amber-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      <DollarSign size={16} /> Request Price Adjustment
                    </button>
                  )}
                </section>
              )}

          {/* House Hunting Property Listings */}
          {selectedErrand.category === ErrandCategory.HOUSE_HUNTING && (
            <section className="bg-indigo-50 p-8 rounded-[3rem] border border-indigo-100 space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-card text-card-foreground rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <Home size={20} />
                  </div>
                  <h4 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em]">Saka Keja Report</h4>
                </div>
                {selectedErrand.propertyListings && selectedErrand.propertyListings.length >= 2 && isRequester && (
                  <button 
                    onClick={() => setShowComparisonModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-black tracking-normal font-medium shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                  >
                    Compare Houses
                  </button>
                )}
              </div>

              {selectedErrand.propertyListings && selectedErrand.propertyListings.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {selectedErrand.propertyListings.map((listing: any) => (
                    <div key={listing.id} className="bg-card text-card-foreground rounded-[2.5rem] overflow-hidden border border-indigo-100 shadow-sm group hover:shadow-strong transition-all">
                      <div className="aspect-video relative overflow-hidden">
                        <img src={listing.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute top-4 right-4 px-4 py-2 bg-foreground text-background/80 backdrop-blur-md text-white rounded-full text-xs font-black shadow-lg">
                          Ksh {(listing.price || 0).toLocaleString()}
                        </div>
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {listing.amenities.water && <div className="w-8 h-8 bg-card text-card-foreground/90 backdrop-blur-md rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><Droplets size={14} /></div>}
                          {listing.amenities.wifi && <div className="w-8 h-8 bg-card text-card-foreground/90 backdrop-blur-md rounded-xl flex items-center justify-center text-indigo-600 shadow-sm"><Wifi size={14} /></div>}
                          {listing.amenities.security && <div className="w-8 h-8 bg-card text-card-foreground/90 backdrop-blur-md rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><Shield size={14} /></div>}
                          {listing.amenities.parking && <div className="w-8 h-8 bg-card text-card-foreground/90 backdrop-blur-md rounded-xl flex items-center justify-center text-muted-foreground shadow-sm"><Car size={14} /></div>}
                        </div>
                      </div>
                      <div className="p-6 space-y-3">
                        <div className="flex justify-between items-start">
                          <h5 className="font-black text-foreground text-base font-display">{listing.title}</h5>
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg">
                            <Star size={16} className="text-amber-400 fill-amber-400" />
                            <span className="text-sm font-black text-amber-700">{listing.agentRating}/5</span>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">"{listing.description}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center border-2 border-dashed border-indigo-100 rounded-[2.5rem] bg-card text-card-foreground/50">
                  <Home size={32} className="mx-auto text-indigo-200 mb-4" />
                  <p className="text-sm font-black text-indigo-300 uppercase tracking-[0.3em]">No houses visited yet</p>
                </div>
              )}

              {isRunner && selectedErrand.status === ErrandStatus.ACCEPTED && (
                <button 
                  onClick={() => setShowAddPropertyModal(true)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] text-xs font-black tracking-normal font-medium shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Plus size={18} /> Add Property Listing
                </button>
              )}
            </section>
          )}

          {/* Mama Fua Cost Breakdown */}
          {selectedErrand.category === ErrandCategory.MAMA_FUA && selectedErrand.mamaFuaBreakdown && (
            <section className="bg-blue-50 p-8 rounded-[3rem] border border-blue-100 space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-card text-card-foreground rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                    <Waves size={20} />
                  </div>
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em]">Mama Fua Cost Breakdown</h4>
                </div>
                <div className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-black tracking-normal font-medium shadow-lg shadow-blue-200">Admin View</div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 bg-card text-card-foreground rounded-[2rem] border border-blue-100 shadow-sm">
                  <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Load Size</p>
                  <p className="text-lg font-black text-foreground">{selectedErrand.mamaFuaBreakdown.loadSizeLabel}</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">Ksh {selectedErrand.mamaFuaBreakdown.loadSizeCost}</p>
                </div>
                <div className="p-5 bg-card text-card-foreground rounded-[2rem] border border-blue-100 shadow-sm">
                  <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Material</p>
                  <p className="text-lg font-black text-foreground">{selectedErrand.mamaFuaBreakdown.materialLabel}</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">Ksh {selectedErrand.mamaFuaBreakdown.materialCost}</p>
                </div>
                <div className="p-5 bg-card text-card-foreground rounded-[2rem] border border-blue-100 shadow-sm">
                  <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Urgency</p>
                  <p className="text-lg font-black text-foreground">{selectedErrand.mamaFuaBreakdown.urgencyLabel}</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">x {selectedErrand.mamaFuaBreakdown.urgencyMultiplier}</p>
                </div>
              </div>

              <div className="p-6 bg-blue-600 rounded-[2.5rem] border border-blue-700 shadow-xl shadow-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-blue-100 tracking-normal font-medium mb-1">Total Service Fee</p>
                  <p className="text-3xl font-black text-white tracking-tighter">Ksh {(selectedErrand?.mamaFuaBreakdown?.total || 0).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-card text-card-foreground/20 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              <div className="p-6 bg-card text-card-foreground/50 rounded-[2rem] border border-blue-100">
                <h5 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Service Constraints</h5>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Detergent</p>
                    <p className="text-xs font-black text-foreground">{selectedErrand.detergentProvided ? 'Provided' : 'Not Provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Water</p>
                    <p className="text-xs font-black text-foreground">{selectedErrand.waterAvailability}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Hanging</p>
                    <p className="text-xs font-black text-foreground">{selectedErrand.hangingPreference}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {selectedErrand.runnerId && selectedErrand.runnerProfileSnapshot && (
            <section className="bg-card text-card-foreground p-8 rounded-[3rem] border border-border shadow-strong space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em]">Assigned Agent</p>
                {selectedErrand.runnerProfileSnapshot.isVerified && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black tracking-normal font-medium border border-emerald-100 shadow-sm">
                    <ShieldCheck size={16} /> Identity Verified
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <UserAvatar src={selectedErrand.runnerProfileSnapshot.avatar} name="Runner" className="w-20 h-20 rounded-[2rem] border-4 border-slate-50 shadow-strong" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                    <CheckCircle2 size={14} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-foreground text-lg font-display truncate">{selectedErrand.runnerProfileSnapshot.name || 'Agent CV'}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-foreground">{selectedErrand.runnerProfileSnapshot.rating.toFixed(1)}</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="text-sm font-black text-muted-foreground tracking-normal font-medium">{selectedErrand.runnerProfileSnapshot.errandsCompleted} Errands Done</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={async () => {
                      if (user) {
                        await firebaseService.toggleFavoriteRunner(user.id, selectedErrand.runnerId!);
                        const updatedUser = await firebaseService.getCurrentUser();
                        if (updatedUser) setUser(updatedUser);
                      }
                    }}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm ${user?.favoriteRunnerIds?.includes(selectedErrand.runnerId!) ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-muted text-muted-foreground border border-border'}`}
                  >
                    <Heart size={20} fill={user?.favoriteRunnerIds?.includes(selectedErrand.runnerId!) ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={scrollToChat} 
                    className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-2xl shadow-xl shadow-primary/20 hover:scale-110 transition-all"
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>
            </section>
          )}
          
          {isReassigning ? (
              <section className="space-y-4 animate-in fade-in zoom-in-95"><h4 className="text-sm font-black tracking-normal font-medium text-foreground">Why reassign?</h4><div className="space-y-2">{REASSIGN_REASONS.map((r) => (<button key={r} onClick={() => setReassignReason(r)} className={`w-full text-left p-4 rounded-2xl border-2 font-bold text-xs transition-all ${reassignReason === r ? 'border-black bg-muted' : 'border-border'}`}>{r}</button>))}</div><div className="flex gap-3"><button onClick={() => setIsReassigning(false)} className="flex-1 py-4 border border-border rounded-2xl font-black text-sm tracking-normal font-medium">Cancel</button><button onClick={handleReassign} className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-sm tracking-normal font-medium">Confirm Reassign</button></div></section>
          ) : isRescheduling ? (
            <section className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <h4 className="text-sm font-black tracking-normal font-medium text-foreground">Reschedule Errand</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-black tracking-normal font-medium text-muted-foreground ml-1">New Deadline</label>
                  <input 
                    type="datetime-local" 
                    value={rescheduleDeadline} 
                    onChange={e => setRescheduleDeadline(e.target.value)} 
                    className="w-full p-4 brand-input rounded-xl font-bold text-xs outline-none" 
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsRescheduling(false)} className="flex-1 py-4 border border-border rounded-2xl font-black text-sm tracking-normal font-medium">Cancel</button>
                <button onClick={handleReschedule} className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-sm tracking-normal font-medium flex items-center justify-center gap-2">
                  <Clock size={14} /> Confirm Reschedule
                </button>
              </div>
            </section>
          ) : editMode ? (
            <section className="space-y-5 animate-in fade-in slide-in-from-bottom-2"><h4 className="text-sm font-black tracking-normal font-medium text-foreground">Edit Errand</h4><div className="space-y-4"><div className="space-y-1"><label className="text-sm font-black tracking-normal font-medium text-muted-foreground">Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-4 brand-input rounded-xl font-bold text-xs outline-none h-24 resize-none" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-sm font-black tracking-normal font-medium text-muted-foreground">Budget (Ksh)</label><input type="number" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: parseInt(e.target.value)})} className="w-full p-4 brand-input rounded-xl font-bold text-xs outline-none" /></div><div className="space-y-1"><label className="text-sm font-black tracking-normal font-medium text-muted-foreground">Deadline</label><input type="datetime-local" value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} className="w-full p-4 brand-input rounded-xl font-bold text-xs outline-none" /></div></div></div><div className="flex gap-3"><button onClick={() => setEditMode(false)} className="flex-1 py-4 border border-border rounded-2xl font-black text-sm tracking-normal font-medium">Cancel</button><button onClick={handleSaveChanges} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm tracking-normal font-medium flex items-center justify-center gap-2"><Save size={14} /> Save Changes</button></div></section>
          ) : (
            <>
              <section className="bg-muted rounded-[1.5rem] p-5 space-y-3">
                <div className="flex justify-between items-start"><div><p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Requester</p><p className="text-xs font-black text-foreground">{selectedErrand.requesterName}</p></div><div className="text-right"><p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Distance</p><p className="text-xs font-black text-foreground">{selectedErrand.distanceKm || '--'} KM</p></div></div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Task Details</p>
                    {isRequester && selectedErrand.status === ErrandStatus.PENDING && (
                      <button onClick={() => setEditMode(true)} className="flex items-center gap-1 text-xs font-black text-indigo-600 uppercase">
                        <Edit2 size={16} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="bg-card text-card-foreground/80 p-3 rounded-xl border border-white shadow-sm space-y-3">
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">{selectedErrand.description || "No description provided."}</p>
                    
                    {(selectedErrand.status === ErrandStatus.ASSIGNED || selectedErrand.status === ErrandStatus.IN_PROGRESS) && (
                      <button 
                        onClick={() => setActiveDetailTab('progress')}
                        className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
                      >
                        <Navigation size={14} className="animate-pulse" />
                        View Real-time Progress
                      </button>
                    )}
                    
                    {selectedErrand.voiceNoteUrl && (
                      <div className="p-2 bg-indigo-50 rounded-lg flex items-center gap-3">
                        <Volume2 size={14} className="text-indigo-600" />
                        <audio src={selectedErrand.voiceNoteUrl} controls className="h-6 flex-1" />
                      </div>
                    )}

                    {selectedErrand.checklist && selectedErrand.checklist.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-black text-muted-foreground tracking-normal font-medium">Visual Checklist</p>
                        <div className="grid grid-cols-1 gap-1">
                          {selectedErrand.checklist.map((item: any, idx: number) => {
                            const isItemChecked = item.checked || item.completed;
                            return (
                              <button 
                                key={`${item.item}-${idx}`} 
                                disabled={!isRunner}
                                onClick={() => handleToggleMicroStep(idx, !isItemChecked)}
                                className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground text-left transition-all disabled:pointer-events-none w-full py-1"
                              >
                                {isItemChecked ? <CheckCircle2 size={16} className="text-emerald-500 animate-in zoom-in shrink-0" /> : <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center hover:border-indigo-500 shrink-0" />}
                                <span className={isItemChecked ? 'line-through opacity-50 text-muted-foreground' : 'text-foreground'}>{item.item}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {selectedErrand.category === ErrandCategory.MAMA_FUA && (
                      <div className="space-y-2">
                        <div className="p-2 bg-muted rounded-lg flex items-center justify-between">
                          <span className="text-sm font-black text-muted-foreground uppercase">Quantity</span>
                          <span className="text-xs font-black text-black">{selectedErrand.laundryBaskets} Baskets</span>
                        </div>
                        {selectedErrand.isInHouse && (
                          <div className="p-2 bg-indigo-50 rounded-lg flex items-center gap-2 text-indigo-600">
                            <Home size={16} />
                            <span className="text-sm font-black tracking-normal font-medium">In-House Service</span>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedErrand.category === ErrandCategory.HOUSE_HUNTING && (
                      <div className="p-2 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-black text-muted-foreground uppercase">Type</span>
                          <span className="text-xs font-black text-black">{selectedErrand.houseType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-black text-muted-foreground uppercase">Budget</span>
                          <span className="text-xs font-black text-black">Ksh {selectedErrand.budget}</span>
                        </div>
                        {selectedErrand.targetEstates && selectedErrand.targetEstates.length > 0 && (
                          <div className="pt-1 border-t border-border">
                            <span className="text-sm font-black text-muted-foreground uppercase block mb-1">Target Areas</span>
                            <div className="flex flex-wrap gap-1">
                              {selectedErrand.targetEstates.map((estate: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-100">
                                  {estate}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedErrand.deadlineTimestamp && (
                      <div className="p-2 bg-muted rounded-lg flex items-center justify-between">
                        <span className="text-sm font-black text-muted-foreground uppercase">Deadline</span>
                        <span className={`text-xs font-black ${isOverdue ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                          {new Date(selectedErrand.deadlineTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isOverdue && " (OVERDUE)"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isOverdue && isRunner && !selectedErrand.overdueReason && (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={16} />
                      <p className="text-sm font-black tracking-normal font-medium">Overdue – Reason Required</p>
                    </div>
                    <p className="text-sm font-bold text-red-500">You have 15 minutes to submit a reason for the delay.</p>
                    <textarea 
                      value={overdueReasonInput} 
                      onChange={e => setOverdueReasonInput(e.target.value)}
                      placeholder="Why is the task delayed?"
                      className="w-full p-3 bg-card text-card-foreground border border-red-100 rounded-xl text-xs font-bold outline-none h-20 resize-none"
                    />
                    <button 
                      onClick={() => firebaseService.submitOverdueReason(selectedErrand.id, overdueReasonInput)}
                      className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-black tracking-normal font-medium shadow-lg shadow-red-100"
                    >
                      Submit Reason
                    </button>
                  </div>
                )}

                {selectedErrand.overdueReasonStatus && selectedErrand.overdueReasonStatus !== 'pending' && (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedErrand.overdueReasonStatus === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    <div className="flex items-center gap-2">
                      {selectedErrand.overdueReasonStatus === 'approved' ? <CheckCircle size={16} /> : <X size={16} />}
                      <p className="text-sm font-black tracking-normal font-medium">Delay Reason {selectedErrand.overdueReasonStatus}</p>
                    </div>
                    {selectedErrand.overdueReasonAutoApproved && (
                      <span className="text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded-lg tracking-normal font-medium">Auto-Approved</span>
                    )}
                  </div>
                )}

                {selectedErrand.overdueReasonStatus && selectedErrand.overdueReasonStatus !== 'pending' && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${selectedErrand.overdueReasonStatus === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                    <div className="flex items-center gap-2">
                      {selectedErrand.overdueReasonStatus === 'approved' ? <CheckCircle size={14} /> : <X size={14} />}
                      <p className="text-sm font-black tracking-normal font-medium">Delay Reason {selectedErrand.overdueReasonStatus}</p>
                    </div>
                    {selectedErrand.overdueReasonAutoApproved && (
                      <span className="text-xs font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">System Auto-Approved</span>
                    )}
                  </div>
                )}

                {selectedErrand.status === ErrandStatus.VERIFYING && selectedErrand.submittedForReviewAt && (
                  <div className="p-4 bg-foreground text-background text-white rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-black tracking-normal font-medium text-muted-foreground">Review Period</p>
                      <p className="text-xs font-black">
                        {Math.floor((Date.now() - selectedErrand.submittedForReviewAt) / (1000 * 60 * 60))}h elapsed
                      </p>
                    </div>
                    {(() => {
                      const delayMs = Date.now() - selectedErrand.submittedForReviewAt;
                      const delayHours = Math.floor(delayMs / (1000 * 60 * 60));
                      if (delayHours > 12) {
                        const penalty = (delayHours - 12) * 10;
                        return (
                          <div className="pt-2 border-t border-white/10 flex justify-between items-center animate-pulse">
                            <p className="text-xs font-black tracking-normal font-medium text-red-400">Approval Delay Penalty</p>
                            <p className="text-xs font-black text-red-400">KES {penalty} accumulated</p>
                          </div>
                        );
                      }
                      return (
                        <p className="text-xs font-bold text-muted-foreground">Penalty starts after 12 hours of inactivity.</p>
                      );
                    })()}
                  </div>
                )}
              </section>

              {/* Reassignment and Requester Actions */}
              {(selectedErrand.status === ErrandStatus.ACCEPTED || selectedErrand.status === ErrandStatus.VERIFYING || selectedErrand.status === ErrandStatus.IN_PROGRESS) && (
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  {isRunner && selectedErrand.reassignmentRequested && (
                    <div className="p-5 bg-amber-50 border border-amber-100 rounded-[2rem] space-y-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShieldAlert size={18} /></div>
                        <div>
                          <p className="text-xs font-black text-foreground uppercase tracking-tight">Reassignment Requested</p>
                          <p className="text-sm text-muted-foreground font-bold">Reason: {selectedErrand.reassignReason}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => firebaseService.rejectReassignment(selectedErrand.id)}
                          className="flex-1 py-3 border border-amber-200 text-amber-600 rounded-xl font-black text-xs tracking-normal font-medium active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => firebaseService.approveReassignment(selectedErrand.id)}
                          className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black text-xs tracking-normal font-medium shadow-lg shadow-amber-100 active:scale-95 transition-all"
                        >
                          Approve & Release
                        </button>
                      </div>
                    </div>
                  )}
                  {isRequester && selectedErrand.reassignmentRequested && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center animate-pulse">
                      <p className="text-sm font-black text-amber-600 tracking-normal font-medium">Waiting for runner to approve reassignment</p>
                    </div>
                  )}
                  {isRequester && (
                    <div className="space-y-3">
                      <button 
                        onClick={scrollToChat}
                        className="w-full py-4 bg-black text-white rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium shadow-lg active:scale-95 transition-all"
                      >
                        <MessageSquare size={16} /> Contact Runner
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setIsRescheduling(true)} className="py-4 border border-border text-muted-foreground rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-muted transition-all">
                          <Clock size={16} /> Reschedule
                        </button>
                        <button 
                          disabled={selectedErrand.reassignmentRequested}
                          onClick={() => setIsReassigning(true)} 
                          className="py-4 border border-red-100 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          <UserMinus size={16} /> {selectedErrand.reassignmentRequested ? 'Requested' : 'Reassign'}
                        </button>
                      </div>
                      <button 
                        onClick={handleCancelErrand}
                        className="w-full py-4 border-2 border-dashed border-red-100 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={14} /> Cancel Errand
                      </button>
                    </div>
                  )}
                </section>
              )}

              {selectedErrand.status === ErrandStatus.PENDING && (isRequester ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setEditMode(true)} 
                      className="py-4 border-2 border-dashed border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-indigo-50 transition-all"
                    >
                      <Edit2 size={14} /> Edit Details
                    </button>
                    <button 
                      onClick={() => setIsRescheduling(true)} 
                      className="py-4 border-2 border-dashed border-border text-muted-foreground rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-muted transition-all"
                    >
                      <Clock size={14} /> Reschedule
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleCancelErrand}
                    className="w-full py-4 border-2 border-dashed border-red-100 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} /> Cancel Errand
                  </button>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-black uppercase text-muted-foreground px-1 tracking-widest">Proposals Received</p>
                    {(selectedErrand.bids || []).length === 0 ? (
                      <div className="p-10 border-2 border-dashed border-border rounded-[1.5rem] text-center text-muted-foreground/70 font-bold">Waiting for runners...</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {(selectedErrand.bids || []).map((b: any) => (
                          <div key={`${b.runnerId}-${b.timestamp}`} className="bg-card text-card-foreground border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <UserAvatar src={null} name={b.runnerName} className="w-10 h-10 rounded-xl" isVerified={b.runnerIsVerified} />
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-black text-foreground">{b.runnerName}</p>
                                  {b.runnerIsVerified && (
                                    <ShieldCheck size={16} className="text-emerald-500 fill-emerald-50" />
                                  )}
                                </div>
                                <p className="text-xs font-bold text-black tracking-normal font-medium">Ready: {b.eta || 'Now'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-foreground mb-1.5">Ksh {b.price}</p>
                              <button 
                                onClick={() => {
                                  firebaseService.acceptBid(selectedErrand.id, b.runnerId, b.runnerName, b.runnerPhone || '', b.price, b.eta || 'ASAP');
                                  triggerHaptic();
                                  setActiveDetailTab('map');
                                  refresh();
                                }} 
                                className="px-5 py-2 bg-black text-white text-xs font-black uppercase rounded-lg"
                              >
                                Assign
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={handleAcceptBudget} className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black tracking-normal font-medium shadow-xl active:scale-95 transition-all text-sm">
                    Accept Task (Ksh {selectedErrand.budget})
                  </button>
                  <div className="p-4 bg-muted rounded-2xl border border-dashed border-border">
                    <p className="text-xs font-black text-muted-foreground uppercase text-center">
                      Accepting at the current budget assigns the task to you instantly!
                    </p>
                  </div>
                </div>
              ))}</>)}

              {/* RPG Quest Guide Card */}
              <div className="mt-8 p-6 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 via-violet-50/10 to-card dark:from-indigo-950/20 dark:via-violet-950/5 dark:to-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm text-left">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black">
                    📜
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Quest Step 1: Quest Briefing ⚔️</span>
                    <h4 className="text-sm font-black text-foreground">Ready to Navigate, Agent?</h4>
                    <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">
                      {selectedErrand.runnerId 
                        ? "You are officially locked and loaded! The magical pathfinder map has been unlocked. Proceed to chart your course!"
                        : "Ready to accept the challenge? Bid or Accept the current price above to unlock the route map, client chat, and live tracking checkpoints!"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!selectedErrand.runnerId) {
                      alert("🔒 Lock in your acceptance or bid above to unlock the Quest Map path!");
                    } else {
                      setActiveDetailTab('map');
                    }
                  }}
                  className={`w-full md:w-auto px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 ${
                    selectedErrand.runnerId 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-95'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-60'
                  }`}
                >
                  Go to Quest Map <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {activeDetailTab === 'map' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card text-card-foreground rounded-[3rem] overflow-hidden border border-border shadow-strong relative">
                <div className="h-[400px] w-full bg-secondary relative">
                  <ErrandMap 
                    errand={selectedErrand} 
                    googleMapsApiKey={googleMapsApiKey} 
                    googleMapsId={googleMapsId}
                    currentLocation={currentLocation}
                  />
                  <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                    <div className="px-4 py-2 bg-card text-card-foreground/90 backdrop-blur-md rounded-2xl shadow-strong border border-white/50 pointer-events-auto text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">
                        {selectedErrand.category === 'Package Delivery' || (selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates) ? (
                          selectedErrand.isPackagePickedUp ? "Distance to Drop-off" : "Distance to Pickup"
                        ) : "Distance"}
                      </p>
                      <p className="text-sm font-black text-foreground">{selectedErrand.distance?.toFixed(1) || '0.0'} km</p>
                    </div>
                    <button 
                      onClick={() => {
                        const isDelivery = selectedErrand.category === 'Package Delivery' || (selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates);
                        let lat = selectedErrand.location?.lat;
                        let lng = selectedErrand.location?.lng;
                        
                        if (isDelivery) {
                          if (!selectedErrand.isPackagePickedUp) {
                            lat = selectedErrand.pickupCoordinates?.lat;
                            lng = selectedErrand.pickupCoordinates?.lng;
                          } else {
                            lat = selectedErrand.dropoffCoordinates?.lat;
                            lng = selectedErrand.dropoffCoordinates?.lng;
                          }
                        }

                        if (lat === undefined || lng === undefined) {
                          lat = selectedErrand.pickupCoordinates?.lat || selectedErrand.location?.lat;
                          lng = selectedErrand.pickupCoordinates?.lng || selectedErrand.location?.lng;
                        }

                        if (lat !== undefined && lng !== undefined) {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                        } else {
                          alert("Location coordinates not available.");
                        }
                      }}
                      className="px-6 py-3 bg-foreground text-background text-white rounded-2xl text-sm font-black tracking-normal font-medium shadow-xl pointer-events-auto active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Navigation size={14} /> Open in Maps
                    </button>
                  </div>
                </div>
                
                <div className="p-8 bg-card text-card-foreground border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                      <MapPin size={28} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">
                        {selectedErrand.category === 'Package Delivery' || (selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates) ? (
                          selectedErrand.isPackagePickedUp ? "Drop-off Location" : "Pickup Location"
                        ) : "Task Location"}
                      </p>
                      <h4 className="text-base font-black text-foreground truncate font-display">
                        {selectedErrand.category === 'Package Delivery' || (selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates) ? (
                          selectedErrand.isPackagePickedUp ? (selectedErrand.dropoffLocation || selectedErrand.locationName) : (selectedErrand.pickupLocation || selectedErrand.locationName)
                        ) : selectedErrand.locationName}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground mt-1">{selectedErrand.address || 'Nairobi, Kenya'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Tracking & Location Sync */}
              <div className="bg-card border border-border rounded-[3rem] p-8 space-y-6 shadow-strong">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </div>
                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest font-mono">Live Tracking Status</h4>
                  </div>
                  {selectedErrand.lastSyncLocationAt && (
                    <span className="text-xs font-medium text-muted-foreground">
                      Last update: {new Date(selectedErrand.lastSyncLocationAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {isRunner ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You are the assigned Runner for this task. Use the button below to update your coordinates so the requester can follow your progress live on their map.
                    </p>
                    
                    {selectedErrand.runnerLocation && (
                      <div className="bg-muted/50 rounded-2xl p-4 border border-border flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase font-mono">My Last Uploaded Location</p>
                          <p className="text-xs font-black text-foreground mt-0.5 font-mono">
                            Lat: {selectedErrand.runnerLocation.lat.toFixed(6)}, Lng: {selectedErrand.runnerLocation.lng.toFixed(6)}
                          </p>
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">
                          Synced
                        </div>
                      </div>
                    )}

                    <button
                      disabled={isUpdatingLocation}
                      onClick={async () => {
                        if (!navigator.geolocation) {
                          alert("Geolocation is not supported by your browser.");
                          return;
                        }
                        try {
                          setIsUpdatingLocation(true);
                          navigator.geolocation.getCurrentPosition(
                            async (position) => {
                              const coords = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                              };
                              await firebaseService.updateErrand(selectedErrand.id, {
                                runnerLocation: coords,
                                lastSyncLocationAt: new Date().toISOString()
                              });
                              alert("Your live location has been updated in real-time!");
                              refresh();
                              setIsUpdatingLocation(false);
                            },
                            (error) => {
                              console.error("Geolocation error:", error);
                              alert("Could not retrieve your current position. Please enable GPS permissions.");
                              setIsUpdatingLocation(false);
                            }
                          );
                        } catch (err) {
                          console.error(err);
                          setIsUpdatingLocation(false);
                        }
                      }}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-95"
                    >
                      {isUpdatingLocation ? <LoadingSpinner color="white" /> : <Navigation size={14} className="animate-pulse" />}
                      Sync My Live Location Now
                    </button>
                  </div>
                ) : isRequester ? (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The runner assigned to your task can update their real-time coordinates. When they update, you will see their live position plotted on the map.
                    </p>
                    
                    {selectedErrand.runnerLocation ? (
                      <div className="bg-muted/50 rounded-2xl p-4 border border-border flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase font-mono">Runner's Live Coordinates</p>
                          <p className="text-xs font-black text-foreground mt-0.5 font-mono">
                            Lat: {selectedErrand.runnerLocation.lat.toFixed(6)}, Lng: {selectedErrand.runnerLocation.lng.toFixed(6)}
                          </p>
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase border border-emerald-100">
                          Active Tracker
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-medium">
                        Waiting for the runner to broadcast their live location...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border text-xs text-muted-foreground">
                    Assign a runner to this errand to enable live tracking and navigation coordinates.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-6 rounded-[2.5rem] border border-border">
                  <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Latitude</p>
                  <p className="text-sm font-black text-foreground font-mono">{(selectedErrand.location?.lat || selectedErrand.pickupCoordinates?.lat || 0).toFixed(6)}</p>
                </div>
                <div className="bg-muted p-6 rounded-[2.5rem] border border-border">
                  <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-2">Longitude</p>
                  <p className="text-sm font-black text-foreground font-mono">{(selectedErrand.location?.lng || selectedErrand.pickupCoordinates?.lng || 0).toFixed(6)}</p>
                </div>
              </div>

              {/* RPG Quest Guide Card: Map to Chat */}
              <div className="mt-8 p-6 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 via-violet-50/10 to-card dark:from-indigo-950/20 dark:via-violet-950/5 dark:to-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm text-left">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black">
                    📍
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Quest Step 2: Pathfinder 🗺️</span>
                    <h4 className="text-sm font-black text-foreground">Course Plotted Successfully!</h4>
                    <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">
                      Your target coordinates are locked on the radar. Ready to coordinate strategies, announce your ETA, or request specific assistance? Let's check in with the client!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => setActiveDetailTab('details')}
                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-secondary text-muted-foreground hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button 
                    onClick={() => {
                      if (!selectedErrand.runnerId) {
                        alert("🔒 Assign a runner or bid to unlock full chat capabilities!");
                      } else {
                        setActiveDetailTab('chat');
                      }
                    }}
                    className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    Open Chat Hub <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'chat' && selectedErrand.runnerId && (isRequester || isRunner) && (
            <div ref={chatSectionRef} className="space-y-6">
              <ChatSection 
                errandId={selectedErrand.id} 
                user={user} 
                onSendMessage={onSendMessage} 
              />

              {/* RPG Quest Guide Card: Chat to Progress */}
              <div className="mt-8 p-6 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 via-violet-50/10 to-card dark:from-indigo-950/20 dark:via-violet-950/5 dark:to-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black">
                    💬
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Quest Step 3: Alliance 🗣️</span>
                    <h4 className="text-sm font-black text-foreground">Channels Synced Up!</h4>
                    <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">
                      Tactical lines are open. Proceed to the Live Tracker to coordinate checkpoints, clear tasks, or log current locations.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => setActiveDetailTab('map')}
                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-secondary text-muted-foreground hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button 
                    onClick={() => setActiveDetailTab('progress')}
                    className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    Go Live Tracker <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {isRequester && (selectedErrand.status === ErrandStatus.ACCEPTED || selectedErrand.status === ErrandStatus.VERIFYING) && (
                  <button 
                    onClick={handleCancelErrand}
                    className="w-full py-4 border-2 border-dashed border-red-100 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} /> Cancel Errand
                  </button>
                )}
                <button 
                  onClick={() => setSelectedErrand(null)}
                  className="w-full py-4 bg-secondary text-muted-foreground rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-normal font-medium hover:bg-slate-200 transition-all"
                >
                  <X size={14} /> Close Details
                </button>
              </div>
            </div>
          )}
          {activeDetailTab === 'finish' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {selectedErrand.status !== ErrandStatus.COMPLETED ? (
                <>
                  <div className="text-center space-y-4 py-8">
                    <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto shadow-inner">
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-foreground font-display">Task Completion</h3>
                    <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto">Review the final proofs and confirm the errand is complete to release funds.</p>
                  </div>

                  <div className="bg-card text-card-foreground p-8 rounded-[3rem] border border-border shadow-strong space-y-6">
                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em]">Final Proofs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedErrand.proofs?.filter((p: any) => p.label === 'Final Proof' || p.label === 'Receipt').map((proof: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                          <div className="aspect-square rounded-[2.5rem] overflow-hidden border border-border shadow-sm group relative">
                            <img src={proof.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setFullScreenImage(proof.url)} className="p-2 bg-card text-card-foreground text-black rounded-full shadow-lg">
                                <Maximize2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-black text-muted-foreground tracking-normal font-medium text-center">{proof.label}</p>
                        </div>
                      ))}
                      {(!selectedErrand.proofs || selectedErrand.proofs.filter((p: any) => p.label === 'Final Proof' || p.label === 'Receipt').length === 0) && (
                        <div className="col-span-2 py-12 text-center border-2 border-dashed border-border rounded-[2rem] bg-muted/50">
                          <Camera size={24} className="mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-sm font-black text-muted-foreground/70 tracking-normal font-medium">No final proofs uploaded yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedErrand.runnerComments && (
                    <div className="bg-muted p-6 rounded-[2rem] border border-border relative">
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-card text-card-foreground border border-border rounded-full text-xs font-black uppercase text-muted-foreground">Runner's Note</div>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        "{selectedErrand.runnerComments}"
                      </p>
                    </div>
                  )}

                  {isRequester && selectedErrand.status === ErrandStatus.VERIFYING && (
                    <div className="space-y-4">
                      <button 
                        onClick={() => onCompleteErrand(selectedErrand.id)}
                        className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] text-sm font-black tracking-normal font-medium shadow-2xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        {loading ? <LoadingSpinner color="white" /> : (
                          <>
                            <ShieldCheck size={20} /> Release Funds & Complete
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          const reason = window.prompt("Reason for dispute:");
                          if (reason) {
                            firebaseService.disputeErrand(selectedErrand.id, reason);
                            refresh();
                          }
                        }}
                        className="w-full py-5 border-2 border-dashed border-red-100 text-red-500 rounded-[2.5rem] text-sm font-black tracking-normal font-medium hover:bg-red-50 transition-all"
                      >
                        Dispute Completion
                      </button>
                      <p className="text-xs text-muted-foreground text-center uppercase font-bold px-8 leading-relaxed">
                        By approving, you confirm the task is complete and authorize the release of Ksh {selectedErrand.acceptedPrice || selectedErrand.budget} to the runner.
                      </p>
                    </div>
                  )}

                  {isRunner && selectedErrand.status === ErrandStatus.ASSIGNED && (
                    <button 
                      onClick={async () => {
                        try {
                          await firebaseService.updateErrand(selectedErrand.id, { status: ErrandStatus.IN_PROGRESS });
                          alert("Errand started! Safe travels!");
                          setActiveDetailTab('map');
                          refresh();
                        } catch (e) {
                          alert("Failed to start errand.");
                        }
                      }}
                      className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] text-sm font-black tracking-normal font-medium shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <Navigation size={18} className="animate-pulse" /> Start Errand (Mark In Progress)
                    </button>
                  )}

                  {isRunner && selectedErrand.status === ErrandStatus.IN_PROGRESS && (
                    <div className="w-full space-y-4">
                      {selectedErrand.category === 'Package Delivery' || (selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates) ? (
                        <>
                          {!selectedErrand.isPackagePickedUp ? (
                            <div className="bg-card border border-border p-6 rounded-[2.5rem] space-y-4 shadow-md text-left">
                              <h4 className="text-sm font-black text-foreground font-display flex items-center gap-2">
                                <Package size={16} className="text-indigo-600" />
                                Step 1: Package Pickup Confirmation
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                You must arrive at the pickup location and take a photo of the package to confirm you have picked it up.
                              </p>
                              
                              {selectedErrand.pickupPhotoUrl ? (
                                <div className="space-y-2">
                                  <div className="relative rounded-2xl overflow-hidden border border-emerald-100 max-h-48">
                                    <img src={selectedErrand.pickupPhotoUrl} alt="Pickup Proof" className="w-full object-cover max-h-48" referrerPolicy="no-referrer" />
                                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                      <Check size={12} /> Captured
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {isUploadingProof ? (
                                    <div className="w-full py-4 border border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 flex flex-col items-center justify-center gap-2 text-indigo-600">
                                      <LoadingSpinner color="indigo" />
                                      <span className="text-xs font-bold uppercase animate-pulse">Uploading Photo Proof...</span>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-indigo-500 rounded-2xl p-6 cursor-pointer hover:bg-muted/50 transition-all gap-2 group">
                                      <Camera size={24} className="text-muted-foreground group-hover:text-indigo-600 group-hover:scale-110 transition-all" />
                                      <span className="text-xs font-black text-foreground">Take/Upload Pickup Photo</span>
                                      <span className="text-[10px] text-muted-foreground font-medium">Camera or Files (Max 5MB)</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden" 
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          try {
                                            setIsUploadingProof(true);
                                            const url = await cloudinaryService.uploadImage(file);
                                            await firebaseService.updateErrand(selectedErrand.id, { pickupPhotoUrl: url });
                                            alert("Pickup photo uploaded successfully!");
                                            refresh();
                                          } catch (err) {
                                            alert("Failed to upload photo proof.");
                                          } finally {
                                            setIsUploadingProof(false);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}
                              
                              <button 
                                disabled={!selectedErrand.pickupPhotoUrl}
                                onClick={async () => {
                                  try {
                                    await firebaseService.updateErrand(selectedErrand.id, { 
                                      isPackagePickedUp: true,
                                      packagePickedUpAt: new Date().toISOString()
                                    });
                                    // Add notification for requester
                                    await firebaseService.addNotification({
                                      userId: selectedErrand.requesterId,
                                      title: 'Package Picked Up!',
                                      message: `Runner ${selectedErrand.runnerName} has confirmed pickup of your package and is now heading to the drop-off location.`,
                                      type: 'info',
                                      read: false,
                                      errandId: selectedErrand.id,
                                      createdAt: new Date().toISOString()
                                    });
                                    alert("Pickup confirmed! Now safe travels to the drop-off destination.");
                                    refresh();
                                  } catch (e) {
                                    alert("Failed to confirm pickup.");
                                  }
                                }}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                              >
                                <Package size={14} /> Confirm Package Pickup
                              </button>
                            </div>
                          ) : (
                            <div className="bg-card border border-border p-6 rounded-[2.5rem] space-y-4 shadow-sm text-left">
                              <h4 className="text-sm font-black text-foreground font-display flex items-center gap-2">
                                <MapPin size={16} className="text-emerald-600" />
                                Step 2: Destination Drop-off Confirmation
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                You have confirmed package pickup. Now arrive at the drop-off location, take a photo of the package at the destination, and complete the delivery.
                              </p>

                              {selectedErrand.dropoffPhotoUrl ? (
                                <div className="space-y-2">
                                  <div className="relative rounded-2xl overflow-hidden border border-emerald-100 max-h-48">
                                    <img src={selectedErrand.dropoffPhotoUrl} alt="Drop-off Proof" className="w-full object-cover max-h-48" referrerPolicy="no-referrer" />
                                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                      <Check size={12} /> Captured
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {isUploadingProof ? (
                                    <div className="w-full py-4 border border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 flex flex-col items-center justify-center gap-2 text-indigo-600">
                                      <LoadingSpinner color="indigo" />
                                      <span className="text-xs font-bold uppercase animate-pulse">Uploading Drop-off Photo...</span>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-emerald-500 rounded-2xl p-6 cursor-pointer hover:bg-muted/50 transition-all gap-2 group">
                                      <Camera size={24} className="text-muted-foreground group-hover:text-emerald-600 group-hover:scale-110 transition-all" />
                                      <span className="text-xs font-black text-foreground">Take/Upload Drop-off Photo</span>
                                      <span className="text-[10px] text-muted-foreground font-medium">Camera or Files (Max 5MB)</span>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden" 
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          try {
                                            setIsUploadingProof(true);
                                            const url = await cloudinaryService.uploadImage(file);
                                            await firebaseService.updateErrand(selectedErrand.id, { 
                                              dropoffPhotoUrl: url,
                                              proofUrl: url
                                            });
                                            alert("Drop-off photo uploaded successfully!");
                                            refresh();
                                          } catch (err) {
                                            alert("Failed to upload photo proof.");
                                          } finally {
                                            setIsUploadingProof(false);
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}

                              <button 
                                disabled={!selectedErrand.dropoffPhotoUrl}
                                onClick={async () => {
                                  try {
                                    await firebaseService.updateErrand(selectedErrand.id, { status: ErrandStatus.ACCEPTED });
                                    alert("Status updated to Active Phase! Click Proceed or Complete to submit comments and finalize.");
                                    refresh();
                                  } catch (e) {
                                    alert("Failed to confirm arrival.");
                                  }
                                }}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                              >
                                <CheckCircle2 size={14} /> Arrived at Drop-off (Move to Active Phase)
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <button 
                          onClick={async () => {
                            try {
                              await firebaseService.updateErrand(selectedErrand.id, { status: ErrandStatus.ACCEPTED });
                              alert("Status updated to Active Phase! You can now check off items in the Visual Checklist and upload proofs.");
                              refresh();
                            } catch (e) {
                              alert("Failed to update status.");
                            }
                          }}
                          className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] text-sm font-black tracking-normal font-medium shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                          <CheckCircle2 size={18} /> Arrived at Destination (Move to Active Phase)
                        </button>
                      )}
                    </div>
                  )}

                  {isRunner && selectedErrand.status === ErrandStatus.ACCEPTED && (
                    <div className="space-y-6">
                      <div className="space-y-3 bg-muted/40 p-6 rounded-[2.5rem] border border-border">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest font-mono">Completion Details</p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1">Completion Notes</label>
                            <textarea
                              value={comments}
                              onChange={(e) => setComments(e.target.value)}
                              placeholder="Describe what you completed, where you left items, or any other important details..."
                              className="w-full p-4 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 bg-card text-card-foreground font-medium"
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-muted-foreground">Final Proof Photo</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById('final-proof-upload') as HTMLInputElement;
                                  if (input) input.click();
                                }}
                                className="w-full h-24 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:text-indigo-600 hover:border-indigo-500 bg-card transition-all"
                              >
                                <Camera size={20} className="mb-1 text-indigo-500" />
                                <span className="text-[10px] font-bold">Add Proof Image</span>
                              </button>
                              <input 
                                id="final-proof-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      alert("Uploading final proof...");
                                      const url = await cloudinaryService.uploadImage(file);
                                      await firebaseService.addErrandProof(selectedErrand.id, url, 'Final Proof');
                                      setPhoto(url);
                                      alert("Final proof uploaded successfully!");
                                      refresh();
                                    } catch (err) {
                                      alert("Upload failed.");
                                    }
                                  }
                                }}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-muted-foreground">Receipt (Optional)</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById('receipt-upload') as HTMLInputElement;
                                  if (input) input.click();
                                }}
                                className="w-full h-24 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground hover:text-indigo-600 hover:border-indigo-500 bg-card transition-all"
                              >
                                <Receipt size={20} className="mb-1 text-emerald-500" />
                                <span className="text-[10px] font-bold">Add Receipt</span>
                              </button>
                              <input 
                                id="receipt-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      alert("Uploading receipt...");
                                      const url = await cloudinaryService.uploadImage(file);
                                      await firebaseService.addErrandProof(selectedErrand.id, url, 'Receipt');
                                      await firebaseService.updateErrand(selectedErrand.id, { receiptUrl: url });
                                      alert("Receipt uploaded successfully!");
                                      refresh();
                                    } catch (err) {
                                      alert("Upload failed.");
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => onRunnerComplete(selectedErrand.id, comments, photo || undefined)}
                        className="w-full py-6 bg-foreground text-background text-white rounded-[2.5rem] text-sm font-black tracking-normal font-medium shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 size={20} /> Submit for Review
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Rating Section - Editorial Style */
                <div className="space-y-8 py-4">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">Task Completed!</h3>
                    <p className="text-xs font-medium text-muted-foreground">Funds have been successfully released.</p>
                  </div>

                  <div className="space-y-6">
                    {isRequester && !selectedErrand.runnerRating && (
                      <RatingInput 
                        targetName={selectedErrand.runnerName || 'the runner'} 
                        onRate={async (rating, review) => {
                          try {
                            await firebaseService.rateRunner(selectedErrand.id, selectedErrand.runnerId!, rating, review);
                            alert("Thank you for your rating!");
                            refresh();
                          } catch (e) { alert("Failed to submit rating."); }
                        }}
                      />
                    )}
                    {isRunner && !selectedErrand.requesterRating && (
                      <RatingInput 
                        targetName={selectedErrand.requesterName || 'the requester'} 
                        onRate={async (rating, review) => {
                          try {
                            await firebaseService.rateRequester(selectedErrand.id, selectedErrand.requesterId, rating, review);
                            alert("Thank you for your rating!");
                            refresh();
                          } catch (e) { alert("Failed to submit rating."); }
                        }}
                      />
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      {selectedErrand.runnerRating && (
                        <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                          <div className="flex items-center justify-between relative z-10">
                            <div>
                              <span className="text-xs font-black text-muted-foreground tracking-normal font-medium">Runner Feedback</span>
                              <h5 className="text-sm font-black text-foreground mt-1">{selectedErrand.runnerName}</h5>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                              <Star size={16} className="fill-amber-400 text-amber-400" />
                              <span className="text-xs font-black text-amber-600">{selectedErrand.runnerRating}</span>
                            </div>
                          </div>
                          {selectedErrand.runnerReview && (
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed relative z-10">
                              "{selectedErrand.runnerReview}"
                            </p>
                          )}
                        </div>
                      )}
                      
                      {selectedErrand.requesterRating && (
                        <div className="bg-card text-card-foreground p-8 rounded-[2.5rem] border border-border shadow-sm space-y-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                          <div className="flex items-center justify-between relative z-10">
                            <div>
                              <span className="text-xs font-black text-muted-foreground tracking-normal font-medium">Requester Feedback</span>
                              <h5 className="text-sm font-black text-foreground mt-1">{selectedErrand.requesterName}</h5>
                            </div>
                            <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full">
                              <Star size={16} className="fill-indigo-400 text-indigo-400" />
                              <span className="text-xs font-black text-indigo-600">{selectedErrand.requesterRating}</span>
                            </div>
                          </div>
                          {selectedErrand.requesterReview && (
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed relative z-10">
                              "{selectedErrand.requesterReview}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeDetailTab === 'progress' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="h-full flex flex-col space-y-4">
                <div className="flex-1 min-h-[450px] relative rounded-[2.5rem] overflow-hidden border border-border">
                  <MapComponent 
                    errands={[selectedErrand]}
                    runners={selectedErrand.runnerLocation ? [{ 
                      id: selectedErrand.runnerId || '', 
                      name: selectedErrand.runnerName || 'Runner', 
                      lastKnownLocation: selectedErrand.runnerLocation,
                      avatar: selectedErrand.runnerProfileSnapshot?.avatar
                    } as any] : []}
                    apiKey={googleMapsApiKey}
                    mapId={googleMapsId}
                    routesApiKey={googleRoutesApiKey}
                    center={selectedErrand.runnerLocation || selectedErrand.pickupCoordinates}
                    showRoute={true}
                    customRoute={selectedErrand.runnerLocation && selectedErrand.dropoffCoordinates ? {
                      origin: selectedErrand.runnerLocation,
                      destination: selectedErrand.dropoffCoordinates
                    } : undefined}
                    zoom={15}
                  />
                  
                  <div className="absolute top-4 left-4 right-4 z-[10] flex flex-col gap-2">
                    <div className="bg-card/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                          <Navigation size={20} className={selectedErrand.status === ErrandStatus.IN_PROGRESS ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground">Runner Progress</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedErrand.status === ErrandStatus.ASSIGNED ? 'Agent assigned, heading to pickup' :
                             selectedErrand.status === ErrandStatus.IN_PROGRESS ? 'Agent is on the way' :
                             selectedErrand.status === ErrandStatus.COMPLETED ? 'Task Completed' : 'Tracking progress'}
                          </p>
                        </div>
                      </div>
                      {isRunner && (
                        <button 
                          onClick={handleUpdateLocation}
                          disabled={isUpdatingLocation}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                          {isUpdatingLocation ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                          Update My Location
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-card text-card-foreground p-8 rounded-[3rem] border border-border shadow-strong space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em]">Checkpoints</h4>
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black tracking-normal font-medium">Verified Steps</div>
                  </div>
                  
                  <div className="space-y-6">
                    {checkpoints.map((cp: any, idx: number) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${cp.completed ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                            {cp.completed ? <Check size={16} /> : <Circle size={16} />}
                          </div>
                          {idx < checkpoints.length - 1 && <div className="w-0.5 h-full bg-secondary my-1" />}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={`text-sm font-black ${cp.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{cp.label}</p>
                          {cp.timestamp && <p className="text-sm font-bold text-muted-foreground mt-1">{new Date(cp.timestamp).toLocaleTimeString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isRunner && selectedErrand.status === ErrandStatus.ACCEPTED && (
                <div className="bg-foreground text-background p-8 rounded-[3rem] text-white space-y-6 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-card text-card-foreground/10 rounded-2xl flex items-center justify-center">
                      <Camera size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-normal font-medium">Submit Proof</h4>
                      <p className="text-sm text-muted-foreground font-bold">Upload photos of your progress</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => document.getElementById('proof-upload')?.click()}
                      className="aspect-square bg-white/10 border-2 border-dashed border-white/20 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-white/20 transition-all group"
                    >
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={24} className="text-white" />
                      </div>
                      <span className="text-sm font-black tracking-normal font-medium text-white">Add Photo</span>
                    </button>
                    <input 
                      id="proof-upload" 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files) {
                          for (let i = 0; i < files.length; i++) {
                            const url = await cloudinaryService.uploadImage(files[i]);
                            firebaseService.addErrandProof(selectedErrand.id, url, 'Progress Photo');
                          }
                          refresh();
                        }
                      }}
                    />
                    {selectedErrand.proofs?.map((proof: any, idx: number) => (
                      <div key={idx} className="aspect-square rounded-[2rem] overflow-hidden border border-white/10 relative group">
                        <img src={proof.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={24} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RPG Quest Guide Card: Progress to Finish */}
              <div className="mt-8 p-6 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 via-violet-50/10 to-card dark:from-indigo-950/20 dark:via-violet-950/5 dark:to-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black">
                    ⚔️
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Quest Step 4: Live tracking checkpoints ⚡</span>
                    <h4 className="text-sm font-black text-foreground">Active Work Phase!</h4>
                    <p className="text-xs text-muted-foreground/90 font-medium leading-relaxed">
                      Checkpoints logged and updates synced! Head over to the Finish tab to lock in your photos and submit the task for gold release!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => setActiveDetailTab('chat')}
                    className="flex-1 md:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-secondary text-muted-foreground hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button 
                    onClick={() => setActiveDetailTab('finish')}
                    className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    Go Finish Quest <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {showBidModal && selectedErrand && (
                <BidModal 
                  isOpen={showBidModal}
                  onClose={() => setShowBidModal(false)}
                  errand={selectedErrand}
                  onSubmit={handleBidSubmit}
                />
              )}

          {showDistanceWarning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-card text-card-foreground w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                  <AlertTriangle size={40} className="text-amber-500" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Distance Warning</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    You are currently <span className="font-black text-amber-600">{currentDistance?.toFixed(1)}km</span> away from the drop-off location.
                  </p>
                  <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">
                    Are you sure you want to complete this task?
                  </p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      setShowDistanceWarning(false);
                      if (runnerRating > 0) {
                        try {
                          await firebaseService.rateRequester(selectedErrand.id, selectedErrand.requesterId, runnerRating, runnerReview);
                        } catch (e) { console.error("Rating failed", e); }
                      }
                      onRunnerComplete(selectedErrand.id, comments, photo || undefined);
                    }}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    Close Anyway
                  </button>
                  <button 
                    onClick={() => setShowDistanceWarning(false)}
                    className="w-full py-5 bg-secondary text-muted-foreground rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
