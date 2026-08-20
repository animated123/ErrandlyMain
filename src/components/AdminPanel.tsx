import React, { useState, useEffect, useRef } from 'react';
import { User, AppSettings, RunnerApplication, FeaturedService, ServiceListing, ErrandCategory, UserRole, Errand, ErrandStatus, PriceRequest, LoyaltyLevel, ChatMessage, Coordinates } from '../../types';
import { formatPhoneDisplay } from '../lib/utils';
import { cloudinaryService } from '../../services/cloudinaryService';
import { firebaseService } from '../../services/firebaseService';
import { NotificationService } from '../services/NotificationService';
import { Skeleton } from './ErrandCard';
import { 
  ShieldAlert, RefreshCw, Plus, Trash2, Upload, Save, MessageSquare, Loader2, 
  X, Settings, ImageIcon, ShoppingBag, Download, Check, MessageCircle, FileText,
  Search, UserCheck, CheckCircle, Briefcase, Navigation, Info, DollarSign, 
  Droplets, Wifi, Shield, Car, Star, ChevronRight, ChevronLeft, Camera, 
  ShieldCheck, ArrowRight, Sparkles, Map, MapPin, Mail, ReceiptText, CreditCard,
  Server, Play, Cpu, AlertTriangle, Database, Activity, Globe, Send, Terminal,
  Settings2, CheckCircle2, XCircle, Key, Sliders, Zap, Users, HardDrive, RotateCw,
  LayoutDashboard
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import SupportChatView from './SupportChatView';
import UserAvatar from './UserAvatar';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'framer-motion';

import { API_BASE_URL, ACTION_SERVER_URL } from '../../services/apiConfig';

interface AdminPanelProps {
  user: User;
  settings: AppSettings;
  stats: any;
  setStats: (stats: any) => void;
  userSearchQuery: string;
  setUserSearchQuery: (q: string) => void;
  userRoleFilter: UserRole | 'all';
  setUserRoleFilter: (r: UserRole | 'all') => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  user, 
  settings, 
  stats, 
  setStats, 
  userSearchQuery, 
  setUserSearchQuery, 
  userRoleFilter, 
  setUserRoleFilter 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'users' | 'services' | 'featured' | 'system' | 'branding' | 'support' | 'sms' | 'email' | 'pricing' | 'payments' | 'action-server' | 'backend'>('overview');
  const [selectedApp, setSelectedApp] = useState<RunnerApplication | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReasonText, setReturnReasonText] = useState('');
  const [applications, setApplications] = useState<RunnerApplication[]>([]);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'approved' | 'returned' | 'rejected'>('all');
  const [appGroupFilter, setAppGroupFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [featured, setFeatured] = useState<FeaturedService[]>([]);
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState<AppSettings>(settings);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [selectedSupportUser, setSelectedSupportUser] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<{ connected: boolean; info: any } | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [envKeys, setEnvKeys] = useState<string[]>([]);
  const [envOverrides, setEnvOverrides] = useState<Record<string, string>>({});

  // Action Server testing states
  const [pingStatus, setPingStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [stkPhone, setStkPhone] = useState(user.phone || '');
  const [stkAmount, setStkAmount] = useState('1');
  const [stkResult, setStkResult] = useState('');
  const [stkLoading, setStkLoading] = useState(false);
  
  const [verifyRef, setVerifyRef] = useState('');
  const [verifyResult, setVerifyResult] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  
  const [emailTo, setEmailTo] = useState(user.email || '');
  const [emailSubject, setEmailSubject] = useState('Action Server Test Email');
  const [emailHtml, setEmailHtml] = useState('<p>This is a test email sent directly from the action server.</p>');
  const [emailType, setEmailType] = useState('verification');
  const [emailResult, setEmailResult] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [smsTo, setSmsTo] = useState(user.phone || '');
  const [smsMessageText, setSmsMessageText] = useState('This is a test SMS from Action Server');
  const [smsResult, setSmsResult] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Database testing states
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; config: any; error: string | null } | null>(null);
  const [isTestingDbConnection, setIsTestingDbConnection] = useState(false);
  const [customSql, setCustomSql] = useState('SELECT count(1) as total_users FROM profiles;');
  const [testQueryResult, setTestQueryResult] = useState<any>(null);
  const [testQueryLoading, setTestQueryLoading] = useState(false);

  // Backend Accounts states
  const [backendAccounts, setBackendAccounts] = useState<User[]>([]);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(false);
  const [backendSubTab, setBackendSubTab] = useState<'action-server' | 'accounts' | 'db' | 'rate-limiter' | 'sync'>('action-server');
  
  // Multi-Tier DB Sync & Force Sync Engine states
  const [adminSyncStatus, setAdminSyncStatus] = useState<any>(null);
  const [adminSyncLoading, setAdminSyncLoading] = useState(false);
  const [adminSyncTriggering, setAdminSyncTriggering] = useState(false);
  const [adminSyncMsg, setAdminSyncMsg] = useState('');

  // Dedicated Force Sync Routine State with Visual Progress Indicator
  const [showForceSyncModal, setShowForceSyncModal] = useState(false);
  const [forceSyncProgress, setForceSyncProgress] = useState(0);
  const [forceSyncStepTitle, setForceSyncStepTitle] = useState('');
  const [forceSyncStepSubtitle, setForceSyncStepSubtitle] = useState('');
  const [forceSyncCurrentPhase, setForceSyncCurrentPhase] = useState<number>(0); // 1=handshake, 2=scan, 3=heal, 4=done
  const [forceSyncRunning, setForceSyncRunning] = useState(false);
  const [forceSyncResult, setForceSyncResult] = useState<any>(null);
  const [forceSyncError, setForceSyncError] = useState<string | null>(null);
  const [forceSyncLogs, setForceSyncLogs] = useState<Array<{ text: string; time: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);

  const appendSyncLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setForceSyncLogs(prev => [...prev.slice(-30), { text, time, type }]);
  };

  const fetchAdminSyncStatus = async (autoHeal = true) => {
    try {
      setAdminSyncLoading(true);
      const res = await fetch(`${API_BASE_URL || ''}/api/connectionadmin/sync/status?autoHeal=${autoHeal}`);
      if (res.ok) {
        const data = await res.json();
        setAdminSyncStatus(data);
      }
    } catch (e: any) {
      console.error("Error fetching sync status in AdminPanel:", e);
    } finally {
      setAdminSyncLoading(false);
    }
  };

  const triggerAdminFullSync = async () => {
    // Forward directly into the comprehensive Force Sync routine with visual progress
    await executeForceSyncRoutine();
  };

  const executeForceSyncRoutine = async () => {
    setShowForceSyncModal(true);
    setForceSyncRunning(true);
    setForceSyncError(null);
    setForceSyncResult(null);
    setForceSyncLogs([]);
    setForceSyncProgress(10);
    setForceSyncCurrentPhase(1);
    setForceSyncStepTitle("Phase 1: Database Tier Handshake & Table Discovery");
    setForceSyncStepSubtitle("Connecting to Primary PostgreSQL, Local PG Fallback, and Local Resilient Store...");
    
    appendSyncLog("Starting multi-tier re-synchronization routine...", "info");
    appendSyncLog("Probing PostgreSQL database schemas & active connection pool...", "info");

    const startTime = Date.now();

    try {
      // Phase 1 -> Phase 2 (Handshake & Discovery)
      await new Promise(r => setTimeout(r, 450));
      setForceSyncProgress(35);
      setForceSyncCurrentPhase(2);
      setForceSyncStepTitle("Phase 2: Scanning Table Diffs & Timestamp Conflicts");
      setForceSyncStepSubtitle("Comparing record checksums, created_at/updated_at timestamps across sources...");
      appendSyncLog("Analyzing tables: profiles, errands, runner_applications, reviews, support_chats...", "info");
      appendSyncLog("Evaluating authoritative records based on latest timestamps...", "info");

      // Phase 2 -> Phase 3 (Auto-Healing & API Trigger)
      await new Promise(r => setTimeout(r, 450));
      setForceSyncProgress(70);
      setForceSyncCurrentPhase(3);
      setForceSyncStepTitle("Phase 3: Bi-Directional Auto-Reconciliation & Mirroring");
      setForceSyncStepSubtitle("Synchronizing missing records and updating drifted rows in all available tiers...");
      appendSyncLog("Dispatching bi-directional auto-heal payload to sync engine...", "info");

      // Execute actual backend synchronization
      const res = await fetch(`${API_BASE_URL || ''}/api/admin/sync/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        throw new Error(`Sync routine failed with server status ${res.status}: ${res.statusText}`);
      }

      const syncData = await res.json();
      setAdminSyncStatus(syncData);

      // Phase 3 -> Phase 4 (Verification & Completion)
      await new Promise(r => setTimeout(r, 400));
      setForceSyncProgress(100);
      setForceSyncCurrentPhase(4);
      setForceSyncStepTitle("Phase 4: Parity Verification & Cache Refresh Complete");
      setForceSyncStepSubtitle(`Successfully reconciled ${syncData.recordsReconciled || 0} record(s) across ${syncData.tables?.length || 0} database tables in ${Date.now() - startTime}ms.`);
      
      appendSyncLog(`Sync Engine verified: ${syncData.tables?.length || 0} tables checked.`, "success");
      if ((syncData.recordsReconciled || 0) > 0) {
        appendSyncLog(`Auto-reconciled ${syncData.recordsReconciled} mismatched record(s) to achieve 100% parity.`, "success");
      } else {
        appendSyncLog("Zero data drift detected. All database tiers are in full lock-step consistency.", "success");
      }
      appendSyncLog("Cache invalidated and local memory store updated.", "success");

      setForceSyncResult(syncData);
      setAdminSyncMsg(`Sync completed! ${syncData.recordsReconciled} records reconciled across ${syncData.tables?.length || 0} tables.`);

      // Refresh in-memory admin collections
      try {
        const [freshApps, freshUsers] = await Promise.all([
          firebaseService.fetchRunnerApplications(),
          firebaseService.fetchAllUsers()
        ]);
        setApplications(freshApps);
        setUsers(freshUsers);
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      console.error("Force Sync Routine Error:", err);
      setForceSyncError(err.message || "An unexpected error occurred during database re-synchronization.");
      appendSyncLog(`Error encountered: ${err.message}`, "error");
      setForceSyncStepTitle("Synchronization Stalled");
      setForceSyncStepSubtitle("A network or database issue interrupted the reconciliation routine.");
    } finally {
      setForceSyncRunning(false);
      setTimeout(() => setAdminSyncMsg(''), 5000);
    }
  };
  
  // Rate Limiter states
  const [rateLimitData, setRateLimitData] = useState<any>(null);
  const [loadingRateLimit, setLoadingRateLimit] = useState(false);
  const [savingRateLimit, setSavingRateLimit] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState('');
  const [simulatingCalls, setSimulatingCalls] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const fetchRateLimitStats = async () => {
    try {
      setLoadingRateLimit(true);
      const res = await fetch(`${API_BASE_URL || ''}/api/admin/rate-limit-stats`);
      if (res.ok) {
        const data = await res.json();
        setRateLimitData(data);
      }
    } catch (e: any) {
      console.error("Error fetching rate limit stats:", e);
    } finally {
      setLoadingRateLimit(false);
    }
  };
  
  // Gateway & Action Server Configuration states
  const [actionServerGatewayUrl, setActionServerGatewayUrl] = useState<string>(() => {
    return localStorage.getItem('custom_action_server_url') || ACTION_SERVER_URL || '';
  });
  const [gatewaySavedMsg, setGatewaySavedMsg] = useState<string>('');

  // Universal Call Tester State
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [customPath, setCustomPath] = useState<string>('/api/health');
  const [customHeaders, setCustomHeaders] = useState<string>('{\n  "Content-Type": "application/json"\n}');
  const [customBody, setCustomBody] = useState<string>('{\n  "test": true\n}');
  const [customLoading, setCustomLoading] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<{ status?: number; statusText?: string; timeMs?: number; data?: any; error?: string } | null>(null);

  const handleSaveGatewayUrl = (urlToSave: string) => {
    const trimmed = urlToSave.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    localStorage.setItem('custom_action_server_url', trimmed);
    setActionServerGatewayUrl(trimmed);
    setGatewaySavedMsg('Gateway URL confirmed and saved successfully across app sessions!');
    setTimeout(() => setGatewaySavedMsg(''), 4000);
  };

  const handleResetGatewayUrl = () => {
    localStorage.removeItem('custom_action_server_url');
    localStorage.removeItem('custom_gateway_url');
    const defaultUrl = 'https://gateway.errandly.site';
    setActionServerGatewayUrl(defaultUrl);
    setGatewaySavedMsg('Gateway URL reset to system default (https://gateway.errandly.site)');
    setTimeout(() => setGatewaySavedMsg(''), 4000);
  };

  const handleExecuteCustomCall = async () => {
    if (!customPath) {
      setCustomResult({ error: 'Endpoint sub-path is required.' });
      return;
    }
    setCustomLoading(true);
    setCustomResult(null);
    const startTime = performance.now();
    try {
      const fullUrl = `${actionServerGatewayUrl}${customPath.startsWith('/') ? '' : '/'}${customPath}`;
      let headersObj: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customHeaders.trim()) {
        try {
          headersObj = JSON.parse(customHeaders);
        } catch (e: any) {
          setCustomResult({ error: `Invalid Headers JSON format: ${e.message}` });
          setCustomLoading(false);
          return;
        }
      }

      const options: RequestInit = {
        method: customMethod,
        headers: headersObj,
      };

      if (['POST', 'PUT', 'PATCH'].includes(customMethod) && customBody.trim()) {
        options.body = customBody;
      }

      const res = await fetch(fullUrl, options);
      const endTime = performance.now();
      const timeMs = Math.round(endTime - startTime);

      let responseData: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      setCustomResult({
        status: res.status,
        statusText: res.statusText,
        timeMs,
        data: responseData
      });
    } catch (err: any) {
      const endTime = performance.now();
      setCustomResult({
        error: `Network / Connection Error: ${err.message}`,
        timeMs: Math.round(endTime - startTime)
      });
    } finally {
      setCustomLoading(false);
    }
  };

  const [backendForm, setBackendForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'ADMIN'
  });

  const fetchBackendAccounts = async () => {
    try {
      setLoadingBackend(true);
      const res = await fetch(`${API_BASE_URL || ''}/api/admin/backend-accounts`);
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setBackendAccounts(body.data);
        }
      }
    } catch (err) {
      console.error("Error loading backend accounts:", err);
    } finally {
      setLoadingBackend(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backend') {
      fetchBackendAccounts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'action-server') {
      const fetchDbStatus = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/config-status`);
          if (res.ok) {
            const data = await res.json();
            setDbStatus({
              connected: data.databaseConnected || false,
              config: data.database || null,
              error: data.databaseError || null
            });
          }
        } catch (err: any) {
          console.error("Failed to fetch database status", err);
        }
      };
      fetchDbStatus();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchEnvData = async () => {
      try {
        const [keysRes, overridesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/env-keys`),
          fetch(`${API_BASE_URL}/api/admin/env-overrides`)
        ]);
        if (keysRes.ok) {
          const { keys } = await keysRes.json();
          setEnvKeys(keys);
        }
        if (overridesRes.ok) {
          const { overrides } = await overridesRes.json();
          setEnvOverrides(overrides);
        }
      } catch (e) {
        console.error("Failed to fetch environment data", e);
      }
    };
    fetchEnvData();
  }, []);

  const handleUpdateEnv = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/update-env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: envOverrides })
      });
      if (res.ok) {
        alert("Environment secrets updated successfully!");
        // Refresh config status
        const statusRes = await fetch(`${API_BASE_URL}/api/admin/config-status`);
        if (statusRes.ok) setConfigStatus(await statusRes.json());
      } else {
        alert("Failed to update environment secrets");
      }
    } catch (e) {
      alert("Error: " + e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      // 1. Trigger payment verification loop
      await fetch(`${ACTION_SERVER_URL}/api/payments/verify/all`).catch(() => {});
      
      // 2. Sync all users profiles to Supabase
      const usersToSync = users.length > 0 ? users : await firebaseService.fetchAllUsers();
      let successCount = 0;
      for (const u of usersToSync) {
        try {
          await fetch(`${API_BASE_URL}/api/profiles/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: u.id,
              email: u.email,
              username: u.name,
              phone: u.phone,
              avatar_url: u.avatar
            })
          });
          successCount++;
        } catch (e) {
          console.warn(`Failed to sync user ${u.id}`);
        }
      }
      
      alert(`Sync Complete! ${successCount} profiles synchronized with Supabase.`);
    } catch (e: any) {
      alert("Sync failed: " + e.message);
    } finally {
      setSyncingAll(false);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/config-status`);
        if (res.ok) {
          const data = await res.json();
          setConfigStatus(data);
        }
      } catch (e) {
        console.error("Failed to fetch config status", e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const checkFirebase = async () => {
      const connected = await firebaseService.checkConnection();
      const info = firebaseService.getFirebaseInfo();
      setFirebaseStatus({ connected, info });
    };
    checkFirebase();
    const interval = setInterval(checkFirebase, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const loadedTabsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchAdminSyncStatus(false);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const isOverview = activeTab === 'overview';
      const isUsersTab = activeTab === 'users' || isOverview;
      const isAppsTab = activeTab === 'applications' || isOverview;
      const isServicesTab = activeTab === 'services' || isOverview;
      const isFeaturedTab = activeTab === 'featured';

      const needsUsers = isUsersTab && !loadedTabsRef.current.has('users');
      const needsApps = isAppsTab && !loadedTabsRef.current.has('apps');
      const needsServices = isServicesTab && !loadedTabsRef.current.has('services');
      const needsFeatured = isFeaturedTab && !loadedTabsRef.current.has('featured');

      if (!needsUsers && !needsApps && !needsServices && !needsFeatured) return;

      if (!isOverview) setLoading(true);
      try {
        const promises: Promise<any>[] = [];
        const taskMap: string[] = [];

        if (needsApps) { promises.push(firebaseService.fetchRunnerApplications()); taskMap.push('apps'); }
        if (needsUsers) { promises.push(firebaseService.fetchAllUsers()); taskMap.push('users'); }
        if (needsServices) { promises.push(firebaseService.fetchServiceListings()); taskMap.push('services'); }
        if (needsFeatured) { promises.push(firebaseService.fetchFeaturedServices()); taskMap.push('featured'); }

        const results = await Promise.all(promises);
        
        results.forEach((result, idx) => {
          const task = taskMap[idx];
          if (task === 'apps') { setApplications(result); loadedTabsRef.current.add('apps'); }
          if (task === 'users') { setUsers(result); loadedTabsRef.current.add('users'); }
          if (task === 'services') { setServices(result); loadedTabsRef.current.add('services'); }
          if (task === 'featured') { setFeatured(result); loadedTabsRef.current.add('featured'); }
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'pricing' || activeTab === 'overview') {
      const unsub = firebaseService.subscribeToAllErrands((allErrands: Errand[]) => {
        setErrands(allErrands);
      });
      return () => unsub();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'support' || activeTab === 'overview') {
      const unsub = firebaseService.subscribeToAllSupportChats((chats) => {
        setSupportChats(chats.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0)));
      });
      return () => unsub();
    }
  }, [activeTab]);

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

  const handleApproveApplication = async (app: RunnerApplication) => {
    if (!confirm(`Approve ${app.fullName} as a runner?`)) return;
    try {
      setLoading(true);
      const urlBase = API_BASE_URL || "";
      const response = await fetch(`${urlBase}/api/runner-applications/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, userId: app.userId, approverName: user.name || user.email })
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Approval endpoint returned failure");

      // Direct local database updates for maximum resilience
      try {
        await firebaseService.updateRunnerApplication(app.id, { 
          status: 'approved', 
          reviewedByName: user.name || user.email 
        });
        await firebaseService.updateUserProfile(app.userId, { 
          role: UserRole.RUNNER 
        });
      } catch (dbErr: any) {
        console.warn("[Local DB Update Fallback Warning]:", dbErr.message);
      }

      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved', reviewedByName: user.name || user.email } : a));
      setSelectedApp(null);
      alert("Application approved, user role converted to runner under Firestore & Supabase profiles, onboarding guide email transmitted, and active SMS notifications sent!");
    } catch (e: any) { 
      alert("Action failed: " + e.message); 
    } finally {
      setLoading(false);
    }
  };

  const handleReturnApplication = async (app: RunnerApplication, reason: string) => {
    if (!reason.trim()) {
      alert("Please provide a return reason or collection instructions.");
      return;
    }
    try {
      setLoading(true);
      const urlBase = API_BASE_URL || "";
      const response = await fetch(`${urlBase}/api/runner-applications/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, userId: app.userId, reason, approverName: user.name || user.email })
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Return endpoint returned failure");

      // Direct local database updates for maximum resilience
      try {
        await firebaseService.updateRunnerApplication(app.id, { 
          status: 'returned', 
          returnReason: reason, 
          reviewedByName: user.name || user.email 
        });
        await firebaseService.updateUserProfile(app.userId, { 
          role: UserRole.REQUESTER 
        });
      } catch (dbErr: any) {
        console.warn("[Local DB Return Fallback Warning]:", dbErr.message);
      }

      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'returned', returnReason: reason, reviewedByName: user.name || user.email } : a));
      alert("Application successfully returned with feedback. SMS and email notifications transmitted!");
      setSelectedApp(null);
      setShowReturnModal(false);
      setReturnReasonText('');
    } catch (e: any) { 
      alert("Action failed: " + e.message); 
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await firebaseService.saveAppSettings(systemSettings);
      alert("Settings updated!");
    } catch (e) { alert("Update failed"); }
  };

  const handleFeaturedUpload = async (file: File, index: number) => {
    try {
      const url = await cloudinaryService.uploadImage(file);
      const updated = [...featured];
      updated[index].imageUrl = url;
      setFeatured(updated);
    } catch (e) { alert("Upload failed"); }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                         u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.fullName || '').toLowerCase().includes(appSearchQuery.toLowerCase()) ||
      (app.email || '').toLowerCase().includes(appSearchQuery.toLowerCase()) ||
      (app.phone || '').toLowerCase().includes(appSearchQuery.toLowerCase()) ||
      (app.nationalId || '').toLowerCase().includes(appSearchQuery.toLowerCase());
      
    const matchesStatus = appStatusFilter === 'all' || 
      (app.status || 'pending') === appStatusFilter ||
      (appStatusFilter === 'Resubmitted' && (app.status === 'Resubmitted' || app.status === 'resubmitted'));
    
    const appStatus = app.status || 'pending';
    const matchesGroup = 
      appGroupFilter === 'all' ||
      (appGroupFilter === 'open' && (appStatus === 'pending' || appStatus === 'returned' || appStatus === 'Resubmitted' || appStatus === 'resubmitted')) ||
      (appGroupFilter === 'closed' && (appStatus === 'approved' || appStatus === 'rejected'));
    
    return matchesSearch && matchesStatus && matchesGroup;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Top Header & System Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Admin Operations</h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-secondary text-muted-foreground border border-border/50">
              v2.4 Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Platform throughput, fleet oversight, and system infrastructure</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={executeForceSyncRoutine}
            disabled={forceSyncRunning}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5 ${
              forceSyncRunning 
                ? 'bg-emerald-600/80 text-white cursor-wait' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
            }`}
            title="Trigger Re-synchronization Routine to reconcile PostgreSQL & Local State"
          >
            {forceSyncRunning ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>Force Sync</span>
            {adminSyncStatus && (
              <span className={`w-1.5 h-1.5 rounded-full ${adminSyncStatus.synced ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`} />
            )}
          </button>

          <a
            href="/connectionadmin"
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
            title="Open Live Database, Gateway & Diagnostics Panel"
          >
            <Server size={13} />
            <span>Connection Admin</span>
          </a>
        </div>
      </div>

      {/* Unified Administrative Navigation Bar */}
      <div className="bg-card p-1.5 rounded-xl border border-border/80 flex gap-1 overflow-x-auto custom-scrollbar shadow-xs">
        {[
          { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
          { 
            id: 'applications', 
            label: 'Applications', 
            icon: <ShieldAlert size={14} />, 
            count: applications.filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted').length || undefined,
            badgeVariant: 'warning'
          },
          { id: 'users', label: 'User Directory', icon: <Users size={14} />, count: users.length },
          { id: 'services', label: 'Service List', icon: <ShoppingBag size={14} />, count: services.length },
          { id: 'featured', label: 'Featured', icon: <Plus size={14} />, count: featured.length },
          { id: 'pricing', label: 'Pricing Matrix', icon: <DollarSign size={14} /> },
          { id: 'payments', label: 'Payments', icon: <CreditCard size={14} /> },
          { id: 'sms', label: 'SMS Gateway', icon: <MessageSquare size={14} /> },
          { id: 'email', label: 'Email Gateway', icon: <Mail size={14} /> },
          { 
            id: 'support', 
            label: 'Support Desk', 
            icon: <MessageCircle size={14} />, 
            count: supportChats.filter(c => c.unreadByAdmin).length || undefined,
            badgeVariant: 'danger'
          },
          { id: 'branding', label: 'Branding', icon: <ImageIcon size={14} /> },
          { id: 'backend', label: 'Backend & DB', icon: <Server size={14} /> },
          { id: 'system', label: 'System', icon: <Settings size={14} /> }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-foreground text-background shadow-xs font-bold' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive 
                    ? 'bg-background/20 text-background' 
                    : tab.badgeVariant === 'danger'
                      ? 'bg-rose-500 text-white'
                      : tab.badgeVariant === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-card text-card-foreground rounded-2xl border border-border/80 shadow-xs overflow-hidden p-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-muted/40 p-5 rounded-xl border border-border/60 space-y-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="w-20 h-3" />
                    <Skeleton className="w-28 h-7" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="w-40 h-5" />
                      <Skeleton className="w-32 h-3" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="w-20 h-8 rounded-lg" />
                    <Skeleton className="w-20 h-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="w-32 h-4" />
                      <Skeleton className="w-48 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-5 rounded" />
                </div>
              ))}
            </div>
          )}
          {['services', 'featured', 'sms', 'branding', 'system', 'action-server', 'backend'].includes(activeTab) && (
            <div className="space-y-6">
              <Skeleton className="w-1/3 h-6" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card text-card-foreground rounded-2xl border border-border/80 shadow-xs overflow-hidden min-h-[500px]">
          {activeTab === 'overview' && (
            <div className="p-6 sm:p-8 space-y-6">
              {/* 1. Executive Metric KPIs (4-Column Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gross Volume */}
                <div className="bg-card text-card-foreground p-5 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross Volume</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <DollarSign size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      Ksh {(stats?.totalRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">15% Take-Rate</span>
                      <span>≈ Ksh {Math.round((stats?.totalRevenue || 0) * 0.15).toLocaleString()} est. fee</span>
                    </p>
                  </div>
                </div>

                {/* Task Fulfillment */}
                <div className="bg-card text-card-foreground p-5 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fulfillment</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <CheckCircle size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {(stats?.completedCount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium truncate">
                      {errands.length > 0 
                        ? `${errands.filter(e => e.status !== ErrandStatus.COMPLETED && e.status !== ErrandStatus.CANCELLED).length} in-flight • ${errands.length} total`
                        : 'Tasks completed successfully'}
                    </p>
                  </div>
                </div>

                {/* Runner Fleet & KYC */}
                <div className="bg-card text-card-foreground p-5 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Runner Fleet</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <UserCheck size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-bold font-mono text-foreground">
                        {users.filter(u => u.role === UserRole.RUNNER).length}
                      </p>
                      {applications.filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted').length > 0 && (
                        <button 
                          onClick={() => setActiveTab('applications')}
                          className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold rounded-md transition"
                        >
                          {applications.filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted').length} pending KYC
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Active verified courier fleet
                    </p>
                  </div>
                </div>

                {/* User Ecosystem */}
                <div className="bg-card text-card-foreground p-5 rounded-xl border border-border/80 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Accounts</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {users.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium truncate">
                      {users.filter(u => u.role === UserRole.CUSTOMER || !u.role).length} Customers • {users.filter(u => u.role === UserRole.ADMIN).length} Admins
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Platform Infrastructure & Database Parity Strip */}
              <div className="bg-muted/40 p-5 rounded-xl border border-border/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${adminSyncStatus?.synced ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600'}`}>
                      <Database size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">Multi-Tier Data Consistency</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          adminSyncStatus?.synced 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          {adminSyncStatus?.synced ? '100% In Sync' : 'Reconciliation Ready'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bi-directional sync engine across Primary PostgreSQL, Local PG Fallback, and Local Resilient Store.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={executeForceSyncRoutine}
                      disabled={forceSyncRunning}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-60"
                    >
                      {forceSyncRunning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      <span>{forceSyncRunning ? 'Synchronizing...' : 'Force Re-Sync'}</span>
                    </button>
                    <a
                      href="/connectionadmin"
                      className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border/50 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Server size={13} />
                      <span>Diagnostics</span>
                    </a>
                  </div>
                </div>

                {/* 4 Infrastructure Metric Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/50">
                  <div className="p-2.5 bg-card rounded-lg border border-border/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className={`w-2 h-2 rounded-full ${adminSyncStatus?.sources?.primary?.connected ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                        Primary PG
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {adminSyncStatus?.sources?.primary?.totalRecords ?? '—'} rows
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-card rounded-lg border border-border/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className={`w-2 h-2 rounded-full ${adminSyncStatus?.sources?.localPg?.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        Local PG
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {adminSyncStatus?.sources?.localPg?.totalRecords ?? '—'} rows
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-card rounded-lg border border-border/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        JSON Store
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {adminSyncStatus?.sources?.json?.totalRecords ?? '—'} rows
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-card rounded-lg border border-border/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className={`w-2 h-2 rounded-full ${firebaseStatus?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        Firebase
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {firebaseStatus?.connected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Operational Hub: 2-Column Split (Action Queues & System Controls) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (7/12): KYC Pending Queue & Support Inquiries */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Pending Runner Applications Card */}
                  <div className="bg-card text-card-foreground rounded-xl border border-border/80 p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-amber-500" />
                        <h3 className="text-sm font-bold text-foreground">Runner Verification Queue</h3>
                        {applications.filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted').length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {applications.filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted').length} awaiting action
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveTab('applications')}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>View All</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Pending Applications List */}
                    {applications.filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted').length === 0 ? (
                      <div className="p-6 bg-muted/20 border border-dashed border-border rounded-xl text-center space-y-1.5">
                        <CheckCircle2 size={24} className="mx-auto text-emerald-500/80" />
                        <p className="text-xs font-bold text-foreground">KYC Verification Queue Clear</p>
                        <p className="text-[11px] text-muted-foreground">All runner applications and identity documents are processed.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {applications
                          .filter(a => !a.status || a.status === 'pending' || a.status === 'Resubmitted' || a.status === 'resubmitted')
                          .slice(0, 3)
                          .map(app => (
                            <div key={app.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border/60">
                                  <img 
                                    src={app.idFrontUrl || app.selfieUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"} 
                                    alt={app.fullName} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer" 
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-foreground truncate">{app.fullName}</p>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                      {app.status || 'pending'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {app.categoryApplied} • {app.phone ? formatPhoneDisplay(app.phone) : 'No Phone'} • National ID: {app.nationalId || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setSelectedApp(app);
                                    setActiveTab('applications');
                                  }}
                                  className="px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-bold rounded-md transition"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => handleApproveApplication(app)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md transition flex items-center gap-1"
                                >
                                  <Check size={12} />
                                  <span>Approve</span>
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Live Support Inquiries Card */}
                  <div className="bg-card text-card-foreground rounded-xl border border-border/80 p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-indigo-500" />
                        <h3 className="text-sm font-bold text-foreground">Support & Communications</h3>
                        {supportChats.filter(c => c.unreadByAdmin).length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {supportChats.filter(c => c.unreadByAdmin).length} unread
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveTab('support')}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>Support Desk</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {supportChats.length === 0 ? (
                      <div className="p-5 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                        <p className="text-xs text-muted-foreground">No active support conversations currently.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {supportChats.slice(0, 3).map(chat => (
                          <div 
                            key={chat.userId}
                            onClick={() => {
                              setSelectedSupportUser(chat.userId);
                              setActiveTab('support');
                            }}
                            className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 px-2 rounded-lg transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {chat.userName ? chat.userName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-foreground truncate">{chat.userName || 'Customer'}</p>
                                  {chat.unreadByAdmin && (
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {chat.lastMessage || 'Sent an attachment or message'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                              {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (5/12): Operational Workflows & Environment Metadata */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Quick Administration Controls */}
                  <div className="bg-card text-card-foreground rounded-xl border border-border/80 p-5 space-y-3 shadow-xs">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Operational Workflows</h3>
                      <p className="text-xs text-muted-foreground">Direct access to core administrative management tools</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {[
                        { tab: 'users', label: 'User Directory & Roles', desc: 'Manage customers, runners, and admin roles', icon: <Users size={15} className="text-indigo-500" /> },
                        { tab: 'pricing', label: 'Pricing Matrix & Distance Logic', desc: 'Configure base fares, per-km rates, and surcharges', icon: <DollarSign size={15} className="text-emerald-500" /> },
                        { tab: 'payments', label: 'M-Pesa & Escrow Reconciliation', desc: 'View transactions, payouts, and ledger entries', icon: <CreditCard size={15} className="text-sky-500" /> },
                        { tab: 'sms', label: 'SMS Gateway & Templates', desc: 'AfricasTalking API keys & dispatch notifications', icon: <MessageSquare size={15} className="text-amber-500" /> },
                        { tab: 'backend', label: 'Backend Database & Accounts', desc: 'PostgreSQL queries, rate limiter, and sync manager', icon: <Server size={15} className="text-purple-500" /> }
                      ].map(item => (
                        <button
                          key={item.tab}
                          onClick={() => setActiveTab(item.tab as any)}
                          className="w-full p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/60 flex items-center justify-between text-left transition group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md bg-card flex items-center justify-center border border-border/40 shrink-0">
                              {item.icon}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground group-hover:text-primary transition">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Platform Environment Metadata */}
                  <div className="bg-card text-card-foreground rounded-xl border border-border/80 p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">Environment & Core Config</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary text-muted-foreground border border-border/40">
                        Production Mode
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-sans">Firebase Project:</span>
                        <span className="font-bold text-foreground truncate max-w-[160px]">
                          {firebaseStatus?.info?.projectId || 'Configured'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-sans">Action Server Gateway:</span>
                        <span className="font-bold text-foreground truncate max-w-[160px]">
                          {actionServerGatewayUrl.replace('https://', '').replace('http://', '') || 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/40">
                        <span className="text-muted-foreground font-sans">SMS Provider:</span>
                        <span className="font-bold text-foreground">AfricasTalking Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (() => {
            const openGroup = filteredApplications.filter(app => {
              const status = app.status || 'pending';
              return status === 'pending' || status === 'returned' || status === 'Resubmitted' || status === 'resubmitted';
            });
            const closedGroup = filteredApplications.filter(app => {
              const status = app.status || 'pending';
              return status === 'approved' || status === 'rejected';
            });

            const renderApplicationRow = (app: RunnerApplication) => {
              const isApproved = app.status === 'approved';
              const isPending = app.status === 'pending' || !app.status;
              const isReturned = app.status === 'returned';
              const isRejected = app.status === 'rejected';
              const isResubmitted = app.status === 'Resubmitted' || app.status === 'resubmitted';

              return (
                <div 
                  key={app.id} 
                  onClick={() => setSelectedApp(app)}
                  className="p-6 flex flex-col lg:flex-row lg:items-center justify-between hover:bg-muted/40 cursor-pointer transition-all gap-4 text-left"
                >
                  <div className="flex items-start md:items-center gap-5">
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-12 h-12 bg-secondary rounded-2xl overflow-hidden border border-border">
                        <img src={app.idFrontUrl} className="w-full h-full object-cover" alt="ID Front" referrerPolicy="no-referrer" />
                      </div>
                      <div className="w-12 h-12 bg-secondary rounded-2xl overflow-hidden border border-border">
                        <img src={app.idBackUrl} className="w-full h-full object-cover" alt="ID Back" referrerPolicy="no-referrer" />
                      </div>
                      {app.selfieUrl && (
                        <div className="w-12 h-12 bg-secondary rounded-2xl overflow-hidden border border-border">
                          <img src={app.selfieUrl} className="w-full h-full object-cover" alt="Selfie" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-foreground">{app.fullName}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30' :
                          isResubmitted ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30' :
                          isPending ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30' :
                          isReturned ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30' :
                          'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30'
                        }`}>
                          {app.status || 'pending'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground">
                        {app.categoryApplied} • {app.phone ? formatPhoneDisplay(app.phone) : 'N/A'} • {app.email}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">ID: {app.nationalId} • Address: {app.address}</p>
                      
                      {app.reviewedByName && (
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1 bg-indigo-50/40 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md w-fit border border-indigo-100/30">
                          <ShieldCheck size={12} className="text-indigo-600 dark:text-indigo-400" />
                          <span>Reviewed by: <strong className="font-black">{app.reviewedByName}</strong></span>
                        </p>
                      )}

                      {isReturned && app.returnReason && (
                        <div className="mt-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-xl">
                          <p className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Return comments / Correction instructions:</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-300 italic font-medium mt-0.5">"{app.returnReason}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0 lg:self-center self-end" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedApp(app)} 
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border border-blue-100/20"
                    >
                      <FileText size={14} />
                      Review Files
                    </button>
                    
                    {!isApproved && (
                      <button 
                        onClick={() => handleApproveApplication(app)} 
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-100/10 flex items-center gap-1"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                    )}
                    
                    {!isReturned && (
                      <button 
                        onClick={() => {
                          setSelectedApp(app);
                          setShowReturnModal(true);
                        }} 
                        className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1"
                      >
                        <RefreshCw size={14} />
                        Return / Correct
                      </button>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="flex flex-col h-full">
                {/* Filter and Search Bar */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-muted/30">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search by applicant name, email, phone, ID..." 
                      value={appSearchQuery}
                      onChange={e => setAppSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-card text-card-foreground rounded-2xl border border-border text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={appStatusFilter}
                      onChange={e => setAppStatusFilter(e.target.value as any)}
                      className="px-4 py-4 bg-card text-card-foreground rounded-2xl border border-border text-xs font-black tracking-normal font-medium outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Review</option>
                      <option value="Resubmitted">Resubmitted</option>
                      <option value="approved">Approved</option>
                      <option value="returned">Returned for Correction</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Group Tab Selector */}
                <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-muted/10">
                  <button
                    onClick={() => setAppGroupFilter('all')}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
                      appGroupFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    All Applications ({applications.length})
                  </button>
                  <button
                    onClick={() => setAppGroupFilter('open')}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                      appGroupFilter === 'open'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    Open / Pending ({applications.filter(a => !a.status || a.status === 'pending' || a.status === 'returned' || a.status === 'Resubmitted' || a.status === 'resubmitted').length})
                  </button>
                  <button
                    onClick={() => setAppGroupFilter('closed')}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                      appGroupFilter === 'closed'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    Closed / Decided ({applications.filter(a => a.status === 'approved' || a.status === 'rejected').length})
                  </button>
                </div>

                {/* Application List grouped or flat */}
                <div className="divide-y divide-slate-100 overflow-y-auto">
                  {filteredApplications.length === 0 ? (
                    <div className="p-20 text-center text-muted-foreground/70 font-black tracking-normal font-medium text-sm">
                      No runner applications found matching selection criteria.
                    </div>
                  ) : appGroupFilter === 'all' ? (
                    <div className="space-y-8 p-6">
                      {/* Open Group Section */}
                      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-amber-500/[0.04] border-b border-border flex items-center justify-between">
                          <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Open Applications ({openGroup.length})
                          </h3>
                          <span className="text-[10px] font-bold text-muted-foreground">Action Required</span>
                        </div>
                        <div className="divide-y divide-border">
                          {openGroup.length === 0 ? (
                            <p className="p-8 text-center text-xs font-medium text-muted-foreground">No open applications pending action.</p>
                          ) : (
                            openGroup.map(app => renderApplicationRow(app))
                          )}
                        </div>
                      </div>

                      {/* Closed Group Section */}
                      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-emerald-500/[0.04] border-b border-border flex items-center justify-between">
                          <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            Closed Applications ({closedGroup.length})
                          </h3>
                          <span className="text-[10px] font-bold text-muted-foreground">Decided</span>
                        </div>
                        <div className="divide-y divide-border">
                          {closedGroup.length === 0 ? (
                            <p className="p-8 text-center text-xs font-medium text-muted-foreground">No completed runner applications.</p>
                          ) : (
                            closedGroup.map(app => renderApplicationRow(app))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 p-6">
                      {filteredApplications.map(app => renderApplicationRow(app))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === 'users' && (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-50 flex gap-4 bg-muted/50">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-card text-card-foreground rounded-2xl border border-border text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <select 
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value as any)}
                  className="px-6 py-4 bg-card text-card-foreground rounded-2xl border border-border text-xs font-black tracking-normal font-medium outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value={UserRole.REQUESTER}>Requesters</option>
                  <option value={UserRole.RUNNER}>Runners</option>
                  <option value={UserRole.ADMIN}>Admins</option>
                </select>
              </div>
              <div className="divide-y divide-slate-50">
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <UserAvatar src={u.avatar} name={u.name} className="w-10 h-10 rounded-xl" />
                      <div>
                        <h4 className="text-sm font-black text-foreground">{u.name}</h4>
                        <p className="text-sm font-bold text-muted-foreground tracking-normal font-medium">{u.email} • {formatPhoneDisplay(u.phone)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-normal font-medium ${
                        u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' :
                        u.role === UserRole.RUNNER ? 'bg-emerald-50 text-emerald-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {u.role}
                      </span>
                      <button 
                        onClick={async () => {
                          const newStatus = !u.isVerified;
                          if (confirm(`${newStatus ? 'Verify' : 'Unverify'} ${u.name}?`)) {
                            await firebaseService.updateUserProfile(u.id, { isVerified: newStatus });
                            setUsers(users.map(user => user.id === u.id ? { ...user, isVerified: newStatus } : user));
                          }
                        }}
                        className={`p-1.5 transition-colors ${u.isVerified ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground/70 hover:text-muted-foreground'}`}
                        title={u.isVerified ? "Verified" : "Not Verified"}
                      >
                        <ShieldCheck size={14} fill={u.isVerified ? "currentColor" : "none"} />
                      </button>
                      <button className="p-1.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors"><Settings size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="p-10 space-y-10 max-w-2xl">
              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Financial Configuration</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-micro text-muted-foreground ml-1">Platform Fee (%)</label>
                    <input type="number" value={systemSettings.platformFee} onChange={e => setSystemSettings({...systemSettings, platformFee: parseFloat(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-micro text-muted-foreground ml-1">Min Errand Price (Ksh)</label>
                    <input type="number" value={systemSettings.minErrandPrice} onChange={e => setSystemSettings({...systemSettings, minErrandPrice: parseFloat(e.target.value)})} className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Operational Controls</h3>
                <div className="flex items-center justify-between p-6 bg-muted rounded-[2rem] border border-border">
                  <div>
                    <h4 className="text-base font-black text-foreground">Maintenance Mode</h4>
                    <p className="text-micro text-muted-foreground">Disable all new errand postings</p>
                  </div>
                  <button onClick={() => setSystemSettings({...systemSettings, maintenanceMode: !systemSettings.maintenanceMode})} className={`w-14 h-8 rounded-full transition-all relative ${systemSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-card text-card-foreground rounded-full transition-all ${systemSettings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                
                <div className="space-y-2 p-6 bg-muted rounded-[2rem] border border-border">
                  <label className="text-micro text-muted-foreground ml-1">Default UI Scale (0.5 - 1.5)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.05" 
                      value={systemSettings.defaultUiScale || 1.0} 
                      onChange={e => setSystemSettings({...systemSettings, defaultUiScale: parseFloat(e.target.value)})} 
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                    />
                    <span className="w-12 text-center font-black text-foreground text-sm">{(systemSettings.defaultUiScale || 1.0).toFixed(2)}x</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-bold">Adjust the overall size of the application UI. Default is 1.00x.</p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Service Synchronization</h3>
                <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                      <RefreshCw size={20} className={syncingAll ? 'animate-spin' : ''} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-indigo-900">Force Full Sync</h4>
                      <p className="text-micro text-indigo-700">Sync all Firebase profiles to Supabase and verify transactions</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSyncAll}
                    disabled={syncingAll}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black tracking-normal font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {syncingAll ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {syncingAll ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">API Integrations Status</h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { id: 'googleMaps', label: 'Google Maps API', desc: 'Real-time runner tracking & errand pins', icon: <Map size={20} />, color: 'bg-indigo-100 text-indigo-600' },
                    { id: 'gemini', label: 'Gemini AI', desc: 'Smart errand parsing & automation', icon: <Sparkles size={20} />, color: 'bg-amber-100 text-amber-600' },
                    { id: 'cloudinary', label: 'Cloudinary', desc: 'Image hosting & optimization', icon: <ImageIcon size={20} />, color: 'bg-blue-100 text-blue-600' },
                    { id: 'paystack', label: 'Paystack', desc: 'Financial transactions & STK Push', icon: <CreditCard size={20} />, color: 'bg-emerald-100 text-emerald-600' },
                    { id: 'sms', label: 'SMS Gateway', desc: 'Phone verification & notifications', icon: <MessageSquare size={20} />, color: 'bg-pink-100 text-pink-600' },
                    { id: 'smtp', label: 'Email Gateway', desc: 'Transactional emails & alerts', icon: <Mail size={20} />, color: 'bg-slate-100 text-slate-600' }
                  ].map(service => (
                    <div key={service.id} className="flex items-center justify-between p-6 bg-muted rounded-[2rem] border border-border transition-all hover:bg-card">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 ${service.color} rounded-xl flex items-center justify-center`}>
                          {service.icon}
                        </div>
                        <div>
                          <h4 className="text-base font-black text-foreground">{service.label}</h4>
                          <p className="text-micro text-muted-foreground">{service.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${configStatus?.[service.id]?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <span className={`text-sm font-black tracking-normal font-medium ${configStatus?.[service.id]?.isConfigured ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {configStatus?.[service.id]?.isConfigured ? 'Active' : 'Not Set'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Environment Secrets & API Keys</h3>
                <div className="bg-muted p-8 rounded-[2.5rem] border border-border space-y-6 shadow-inner">
                  <div className="grid grid-cols-1 gap-6">
                    {envKeys.map(key => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                          {configStatus?.[key.toLowerCase().includes('google') ? 'googleMaps' : key.toLowerCase().includes('gemini') ? 'gemini' : key.toLowerCase().includes('cloudinary') ? 'cloudinary' : key.toLowerCase().includes('paystack') ? 'paystack' : key.toLowerCase().includes('sms') ? 'sms' : 'system']?.isConfigured && (
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Set in Env</span>
                          )}
                        </div>
                        <div className="relative group">
                          <input 
                            type={key.includes('KEY') || key.includes('TOKEN') || key.includes('URL') || key.includes('PASS') ? 'password' : 'text'} 
                            value={envOverrides[key] || ''} 
                            onChange={e => setEnvOverrides({...envOverrides, [key]: e.target.value})} 
                            placeholder={`Enter ${key}...`}
                            className="w-full p-4 bg-card text-card-foreground rounded-2xl font-mono text-xs border border-border shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Settings size={14} className="text-muted-foreground/30" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-center gap-4">
                    <Shield size={20} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-900 leading-relaxed">
                      Secrets entered here are saved to Firestore and will override the default server environment variables. 
                      They will also be included in the .env file when downloaded.
                    </p>
                  </div>

                  <button 
                    onClick={handleUpdateEnv}
                    disabled={loading}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {loading ? 'Saving Overrides...' : 'Save Environment Overrides'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">System Manifest Export</h3>
                <div className="flex items-center justify-between p-6 bg-muted rounded-[2rem] border border-border shadow-sm group hover:bg-card transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 text-muted-foreground rounded-xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-foreground">Portable Config (.env)</h4>
                      <p className="text-micro text-muted-foreground">Download manifest for local deployment or cloning</p>
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
                        a.download = 'env-config.txt';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (e: any) {
                        alert("Download failed: " + e.message);
                      }
                    }}
                    className="px-6 py-3 bg-black text-white rounded-xl text-sm font-black tracking-normal font-medium flex items-center gap-2"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>

              <button onClick={handleUpdateSettings} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
                <Save size={18} /> Save System Configuration
              </button>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Service Listings</h3>
                <button 
                  onClick={async () => {
                    const title = prompt("Service Title:");
                    const price = prompt("Price (Ksh):");
                    const category = prompt("Category:");
                    const description = prompt("Description:");
                    if (title && price && category) {
                      await firebaseService.addServiceListing({ 
                        title, 
                        price: parseFloat(price), 
                        category, 
                        description: description || '' 
                      });
                      // Refresh data
                      const allServices = await firebaseService.fetchServiceListings();
                      setServices(allServices);
                    }
                  }}
                  className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black tracking-normal font-medium flex items-center gap-2"
                >
                  <Plus size={14} /> Add Service
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services.map(s => (
                  <div key={s.id} className="bg-muted p-6 rounded-[2rem] border border-border relative group">
                    <button 
                      onClick={async () => {
                        if (confirm("Delete this service?")) {
                          await firebaseService.deleteServiceListing(s.id);
                          setServices(services.filter(item => item.id !== s.id));
                        }
                      }}
                      className="absolute top-4 right-4 p-2 bg-card text-card-foreground text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                    <h4 className="text-lg font-black text-foreground">{s.title}</h4>
                    <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium mt-1">{s.category}</p>
                    <p className="text-2xl font-black text-indigo-600 mt-4">Ksh {s.price}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'featured' && (
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Featured Services</h3>
                <button 
                  onClick={async () => {
                    const title = prompt("Service Title:");
                    const price = prompt("Price (Ksh):");
                    const category = prompt("Category:");
                    const description = prompt("Description:");
                    if (title && price && category) {
                      await firebaseService.addFeaturedService({ 
                        title, 
                        price: parseFloat(price), 
                        category, 
                        description: description || '',
                        imageUrl: 'https://picsum.photos/seed/service/800/600'
                      });
                      // Refresh data
                      const allFeatured = await firebaseService.fetchFeaturedServices();
                      setFeatured(allFeatured);
                    }
                  }}
                  className="px-6 py-3 bg-black text-white rounded-xl text-xs font-black tracking-normal font-medium flex items-center gap-2"
                >
                  <Plus size={14} /> Add Featured
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featured.map((f, idx) => (
                  <div key={f.id} className="bg-muted rounded-[2.5rem] border border-border overflow-hidden relative group">
                    <div className="aspect-video relative">
                      <img src={f.imageUrl} className="w-full h-full object-cover" alt={f.title} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="p-3 bg-card text-foreground rounded-2xl cursor-pointer hover:scale-110 transition-transform">
                          <Upload size={18} />
                          <input type="file" className="hidden" onChange={async e => {
                            if (e.target.files?.[0]) {
                              const url = await cloudinaryService.uploadImage(e.target.files[0]);
                              const updated = [...featured];
                              updated[idx].imageUrl = url;
                              // Update in Firebase
                              await firebaseService.updateFeaturedService(f.id, { imageUrl: url });
                              setFeatured(updated);
                            }
                          }} />
                        </label>
                        <button 
                          onClick={async () => {
                            if (confirm("Delete this featured service?")) {
                              await firebaseService.deleteFeaturedService(f.id);
                              setFeatured(featured.filter(item => item.id !== f.id));
                            }
                          }}
                          className="p-3 bg-red-500 text-white rounded-2xl hover:scale-110 transition-transform"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="text-lg font-black text-foreground">{f.title}</h4>
                      <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium mt-1">{f.category}</p>
                      <p className="text-2xl font-black text-indigo-600 mt-4">Ksh {f.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="p-10 space-y-10 max-w-2xl">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <CreditCard size={24} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-white">
                        <CreditCard size={14} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-foreground">Paystack Direct</h3>
                        <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">STK Push Integrated</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-foreground text-background text-white p-6 rounded-[2rem] space-y-4 shadow-xl shadow-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black tracking-normal font-medium text-muted-foreground">Direct integration Status</h4>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tighter ${configStatus?.paystack?.isConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-muted-foreground'}`}>
                      {configStatus?.paystack?.isConfigured ? 'Active' : 'Offline'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                      <p className="text-xs font-black text-muted-foreground uppercase mb-1">Public Key</p>
                      <p className="text-sm font-bold text-white">{configStatus?.paystack?.publicKey || 'Not set'}</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                      <p className="text-xs font-black text-muted-foreground uppercase mb-1">Currency</p>
                      <p className="text-sm font-bold text-white">KES</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-4">
                  <h4 className="text-xs font-black tracking-normal font-medium text-indigo-600">Test Paystack STK Push</h4>
                  <p className="text-sm font-bold text-indigo-800">Trigger a direct Paystack M-Pesa prompt.</p>
                  <button 
                    onClick={async () => {
                      const phone = prompt("Enter test phone number (e.g. 2547...):", user.phone || "254722603149");
                      if (!phone) return;
                      
                      try {
                        setLoading(true);
                        const res = await fetch(`${ACTION_SERVER_URL}/api/payments/paystack/stk-push`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: user.email,
                            amount: 1,
                            userId: user.id,
                            phoneNumber: phone
                          })
                        });
                        const data = await res.json();
                        alert("Response: " + JSON.stringify(data));
                      } catch (e: any) {
                        alert("Error: " + e.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-indigo-100"
                  >
                    Send Direct STK Push (1 KSH)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="p-10 space-y-10 max-w-2xl">
              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Talksasa SMS Integration</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-micro text-muted-foreground ml-1">API Token</label>
                    <input 
                      type="password" 
                      placeholder="Enter Talksasa API Token"
                      className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" 
                      onChange={(e) => {
                        // This would ideally be saved to a secure backend setting
                        // For now, we'll just show a test interface
                      }}
                    />
                    <p className="text-sm text-muted-foreground font-bold">Note: Token should be set in environment variables (TALKSASA_API_TOKEN) for security.</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 space-y-4">
                    <h4 className="text-sm font-black text-indigo-900">Test SMS Connection</h4>
                    <div className="space-y-3">
                      <input 
                        id="test-phone"
                        type="text" 
                        placeholder="Recipient Phone (e.g. 254...)" 
                        className="w-full p-3 bg-card text-card-foreground rounded-xl text-xs font-bold outline-none"
                      />
                      <textarea 
                        id="test-message"
                        placeholder="Test Message Content" 
                        className="w-full p-3 bg-card text-card-foreground rounded-xl text-xs font-bold outline-none h-20 resize-none"
                      />
                      <button 
                        onClick={async () => {
                          const phone = (document.getElementById('test-phone') as HTMLInputElement).value;
                          const msg = (document.getElementById('test-message') as HTMLTextAreaElement).value;
                          if (!phone || !msg) return alert("Phone and message required");
                          
                          const res = await firebaseService.smsService.sendSMS(phone, msg);
                          if (res.success) {
                            alert("SMS Sent Successfully!");
                          } else {
                            alert("Failed to send SMS: " + JSON.stringify(res.error));
                          }
                        }}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-black tracking-normal font-medium shadow-lg shadow-indigo-100"
                      >
                        Send Test SMS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="p-10 space-y-10 max-w-2xl">
              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">SMTP Email Integration</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-micro text-muted-foreground ml-1">SMTP Host</label>
                      <input type="text" placeholder="smtp.example.com" className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-micro text-muted-foreground ml-1">SMTP Port</label>
                      <input type="number" placeholder="587" className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-micro text-muted-foreground ml-1">SMTP User</label>
                      <input type="text" placeholder="user@example.com" className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-micro text-muted-foreground ml-1">SMTP Password</label>
                      <input type="password" placeholder="••••••••" className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold">Note: SMTP credentials should be set in environment variables (SMTP_HOST, SMTP_USER, etc.) for security.</p>
                  
                  <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 space-y-4">
                    <h4 className="text-sm font-black text-emerald-900">Test Email Connection</h4>
                    <div className="space-y-3">
                      <input 
                        id="test-email-to"
                        type="email" 
                        placeholder="Recipient Email" 
                        className="w-full p-3 bg-card text-card-foreground rounded-xl text-xs font-bold outline-none"
                      />
                      <input 
                        id="test-email-subject"
                        type="text" 
                        placeholder="Subject" 
                        className="w-full p-3 bg-card text-card-foreground rounded-xl text-xs font-bold outline-none"
                      />
                      <textarea 
                        id="test-email-message"
                        placeholder="Message Content" 
                        className="w-full p-3 bg-card text-card-foreground rounded-xl text-xs font-bold outline-none h-20 resize-none"
                      />
                      <button 
                        onClick={async () => {
                          const to = (document.getElementById('test-email-to') as HTMLInputElement).value;
                          const subject = (document.getElementById('test-email-subject') as HTMLInputElement).value;
                          const msg = (document.getElementById('test-email-message') as HTMLTextAreaElement).value;
                          if (!to || !subject || !msg) return alert("To, subject and message required");
                          
                          try {
                            setLoading(true);
                            const res = await firebaseService.emailService.sendEmail(to, subject, msg);
                            alert("Email Sent via Action Server! Response: " + JSON.stringify(res.data));
                          } catch (err: any) {
                            const errorMsg = err.message || JSON.stringify(err);
                            alert("Failed to send email: " + errorMsg);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-black tracking-normal font-medium shadow-lg shadow-emerald-100"
                      >
                        Send Test Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="p-10 space-y-10 max-w-2xl">
              <div className="space-y-6">
                <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">Visual Identity</h3>
                <div className="flex items-center gap-8">
                  <div className="w-32 h-32 rounded-[2.5rem] border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative group">
                    <Logo 
                      size={64} 
                      url={systemSettings.logoUrl} 
                      scale={systemSettings.logoScale} 
                      variant={systemSettings.logoVariant} 
                    />
                    <button onClick={() => document.getElementById('logo-up')?.click()} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Upload size={20} /></button>
                    <input id="logo-up" type="file" className="hidden" onChange={async e => {
                      if (e.target.files?.[0]) {
                        setLoading(true);
                        try {
                          const url = await cloudinaryService.uploadImage(e.target.files[0]);
                          setSystemSettings({...systemSettings, logoUrl: url});
                        } catch (err) {
                          alert("Upload failed");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-micro text-muted-foreground ml-1">App Name</label>
                      <input type="text" value={systemSettings.appName} onChange={e => setSystemSettings({...systemSettings, appName: e.target.value})} className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-micro text-muted-foreground ml-1">Logo Appearance Use</label>
                      <select 
                        value={systemSettings.logoVariant || 'original'} 
                        onChange={e => setSystemSettings({...systemSettings, logoVariant: e.target.value as any})}
                        className="w-full p-4 bg-muted rounded-2xl font-bold text-base outline-none"
                      >
                        <option value="original">Original Aspect Ratio</option>
                        <option value="square">Fit as Square</option>
                        <option value="circle">Circular Icon</option>
                        <option value="rounded">Rounded Corners</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 p-6 bg-muted rounded-[2rem] border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-foreground">Logo Size Scale</h4>
                      <p className="text-xs text-muted-foreground">Adjust the global size factor for the logo</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black">{(systemSettings.logoScale || 1.0).toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="3.0" 
                    step="0.1" 
                    value={systemSettings.logoScale || 1.0} 
                    onChange={e => setSystemSettings({...systemSettings, logoScale: parseFloat(e.target.value)})} 
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" 
                  />
                </div>
              </div>
              <button onClick={handleUpdateSettings} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3">
                <Save size={18} /> Update Branding
              </button>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black tracking-normal font-medium text-muted-foreground">AI Pricing Oversight</h3>
                  <p className="text-xs text-muted-foreground mt-1">Review and override AI-calculated errand costs</p>
                </div>
              </div>

              <div className="space-y-4">
                {errands.filter(e => e.aiEstimationBreakdown).length === 0 ? (
                  <div className="p-20 text-center text-muted-foreground/70 font-black tracking-normal font-medium text-sm">No AI-estimated errands found</div>
                ) : (
                  errands.filter(e => e.aiEstimationBreakdown).map(errand => (
                    <div key={errand.id} className="bg-muted p-8 rounded-[2.5rem] border border-border space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <ReceiptText size={24} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-foreground">{errand.title}</h4>
                            <p className="text-xs font-bold text-muted-foreground tracking-normal font-medium">ID: {errand.id} • {errand.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary">Ksh {errand.budget}</p>
                          <p className="text-sm font-black text-muted-foreground tracking-normal font-medium">Total Estimation</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                          { label: 'Base Fee', value: `Ksh ${errand.aiEstimationBreakdown?.baseFee}` },
                          { label: 'Size Multiplier', value: `Ksh ${errand.aiEstimationBreakdown?.sizeMultiplier}` },
                          { label: 'Work Scale', value: `${errand.aiEstimationBreakdown?.workScale}/5`, highlight: true },
                          { label: 'Loc. Premium', value: `Ksh ${errand.aiEstimationBreakdown?.locationPremium}` },
                          { label: 'Urgency Mult.', value: `${errand.aiEstimationBreakdown?.urgencyMultiplier}x` },
                          { label: 'Final Total', value: `Ksh ${errand.aiEstimationBreakdown?.total}`, bold: true }
                        ].map((stat, i) => (
                          <div key={i} className="bg-card text-card-foreground p-4 rounded-2xl border border-border">
                            <p className="text-xs font-black text-muted-foreground tracking-normal font-medium mb-1">{stat.label}</p>
                            <p className={`text-sm font-black ${stat.highlight ? 'text-primary' : stat.bold ? 'text-foreground' : 'text-muted-foreground'}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                        <div className="flex-1">
                          <p className="text-sm font-black text-muted-foreground tracking-normal font-medium mb-2">Override AI Work Scale (1-5)</p>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(scale => (
                              <button
                                key={scale}
                                onClick={async () => {
                                  if (!errand.aiEstimationBreakdown) return;
                                  const breakdown = errand.aiEstimationBreakdown;
                                  const newTotal = (breakdown.baseFee + (breakdown.sizeMultiplier * scale) + breakdown.locationPremium) * breakdown.urgencyMultiplier;
                                  
                                  await firebaseService.updateErrand(errand.id, {
                                    aiEstimatedScale: scale,
                                    budget: Math.round(newTotal),
                                    aiEstimationBreakdown: {
                                      ...breakdown,
                                      workScale: scale,
                                      total: newTotal
                                    }
                                  });
                                  alert(`Scale overridden to ${scale}. New budget: Ksh ${Math.round(newTotal)}`);
                                }}
                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                                  errand.aiEstimationBreakdown?.workScale === scale 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                    : 'bg-card text-card-foreground border border-border text-muted-foreground hover:border-primary/40'
                                }`}
                              >
                                {scale}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3 max-w-xs">
                          <Info size={16} className="text-amber-600 shrink-0" />
                          <p className="text-sm font-bold text-amber-900 leading-tight">Overriding the scale will automatically recalculate the total budget based on the pricing formula.</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {(activeTab === 'backend' || activeTab === 'action-server') && (
            <div className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Server size={18} />
                    </div>
                    <h2 className="text-2xl font-black text-foreground">Backend & Action Server Hub</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Check, confirm, configure and test Action Server gateway calls, inspect database status, and manage backend admin accounts.
                  </p>
                </div>

                {/* Sub-tab pills */}
                <div className="flex items-center bg-muted p-1 rounded-2xl border border-border">
                  <button
                    onClick={() => setBackendSubTab('action-server')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      backendSubTab === 'action-server'
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Globe size={14} />
                    Action Server Calls & Gateway
                  </button>
                  <button
                    onClick={() => setBackendSubTab('accounts')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      backendSubTab === 'accounts'
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserCheck size={14} />
                    Backend Accounts
                  </button>
                  <button
                    onClick={() => setBackendSubTab('db')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      backendSubTab === 'db'
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Database size={14} />
                    PostgreSQL Diagnostics
                  </button>
                  <button
                    onClick={() => {
                      setBackendSubTab('rate-limiter');
                      fetchRateLimitStats();
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      backendSubTab === 'rate-limiter'
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Zap size={14} className="text-amber-500" />
                    Session Rate Limiter
                  </button>
                  <button
                    onClick={() => {
                      setBackendSubTab('sync');
                      fetchAdminSyncStatus(true);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      backendSubTab === 'sync'
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <RefreshCw size={14} className="text-emerald-500" />
                    Multi-DB Sync Engine
                    {adminSyncStatus && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        adminSyncStatus.synced ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                      }`}>
                        {adminSyncStatus.synced ? 'Synced' : `${adminSyncStatus.recordsReconciled} Healed`}
                      </span>
                    )}
                  </button>
                </div>
              </div>
                
              {/* Sub-tab 1: Action Server Calls & Gateway */}
              {backendSubTab === 'action-server' && (
                <div className="space-y-8">
                  {/* Gateway URL Check, Confirm, & Configure Card */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-[2rem] shadow-xl border border-indigo-900/40 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                          <Settings2 size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white flex items-center gap-2">
                            Action Server Gateway Configuration
                          </h3>
                          <p className="text-xs text-indigo-200/80 mt-0.5">
                            Configure, verify and save target Action Server endpoint URL
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {pingStatus.status === 'success' && (
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Gateway Online
                          </span>
                        )}
                        {pingStatus.status === 'error' && (
                          <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            Gateway Disconnected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black tracking-wider uppercase text-indigo-200">
                        Action Server Target Base URL
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={actionServerGatewayUrl}
                          onChange={(e) => setActionServerGatewayUrl(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-950/80 border border-indigo-900/60 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-all"
                          placeholder="https://gateway.errandly.site"
                        />
                        <button
                          onClick={() => handleSaveGatewayUrl(actionServerGatewayUrl)}
                          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-indigo-600/30"
                        >
                          <CheckCircle2 size={14} />
                          Confirm & Save Gateway
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setPingStatus({ status: 'testing', message: 'Pinging gateway...' });
                              const controller = new AbortController();
                              const id = setTimeout(() => controller.abort(), 6000);
                              const res = await fetch(`${actionServerGatewayUrl}/api/health`, {
                                signal: controller.signal
                              }).catch(() => fetch(`${actionServerGatewayUrl}/`, { signal: controller.signal }));
                              clearTimeout(id);
                              if (res.ok) {
                                const body = await res.text();
                                setPingStatus({ status: 'success', message: `Status ${res.status} OK: ${body.substring(0, 100)}` });
                              } else {
                                setPingStatus({ status: 'error', message: `HTTP ${res.status}: ${res.statusText}` });
                              }
                            } catch (e: any) {
                              setPingStatus({ status: 'error', message: `Connection failed: ${e.message}` });
                            }
                          }}
                          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 border border-slate-700"
                        >
                          {pingStatus.status === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                          Ping Gateway
                        </button>
                        <button
                          onClick={handleResetGatewayUrl}
                          className="px-3 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all shrink-0 border border-slate-800"
                          title="Reset to default system URL"
                        >
                          Reset
                        </button>
                      </div>

                      {gatewaySavedMsg && (
                        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                          <span>{gatewaySavedMsg}</span>
                        </div>
                      )}

                      {pingStatus.message && (
                        <div className={`p-3 rounded-xl border text-xs font-mono whitespace-pre-wrap ${
                          pingStatus.status === 'success' ? 'bg-emerald-950/40 text-emerald-200 border-emerald-900/50' : 'bg-rose-950/40 text-rose-200 border-rose-900/50'
                        }`}>
                          <strong>Ping Output:</strong> {pingStatus.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Universal Interactive Action Call Tester */}
                  <div className="bg-card text-card-foreground p-6 rounded-[2rem] border border-border shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Terminal size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-foreground">Universal Action Server Call Tester</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Check, configure parameters, and execute direct HTTP calls to any endpoint on <code className="font-mono">{actionServerGatewayUrl}</code>
                          </p>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black text-muted-foreground uppercase mr-1">Presets:</span>
                        {[
                          { label: 'Health', method: 'GET', path: '/api/health', body: '' },
                          { label: 'STK Push', method: 'POST', path: '/api/payments/paystack/stk-push', body: JSON.stringify({ email: user.email, amount: 1, userId: user.id, phoneNumber: user.phone || '254700000000' }, null, 2) },
                          { label: 'Pay Status', method: 'GET', path: '/api/payments/status?reference=TX-1001', body: '' },
                          { label: 'Verify All', method: 'GET', path: '/api/payments/verify/all', body: '' },
                          { label: 'Email Relay', method: 'POST', path: '/api/notifications/send-email', body: JSON.stringify({ to: user.email, subject: 'Test', html: '<p>Hello</p>', type: 'verification' }, null, 2) },
                          { label: 'SMS Gateway', method: 'POST', path: '/api/sms/send', body: JSON.stringify({ recipient: user.phone || '254700000000', message: 'Test message' }, null, 2) },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setCustomMethod(preset.method as any);
                              setCustomPath(preset.path);
                              if (preset.body) setCustomBody(preset.body);
                            }}
                            className="px-2.5 py-1 bg-muted hover:bg-secondary text-foreground text-[10px] font-bold rounded-lg border border-border transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Method selector */}
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Method</label>
                        <select
                          value={customMethod}
                          onChange={(e) => setCustomMethod(e.target.value as any)}
                          className="w-full p-3 bg-muted border border-border rounded-xl text-xs font-black outline-none font-mono text-foreground"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>

                      {/* Path input */}
                      <div className="md:col-span-9 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Endpoint Sub-Path</label>
                        <div className="flex items-center gap-1">
                          <span className="p-3 bg-muted border border-border rounded-xl text-xs font-mono font-bold text-muted-foreground shrink-0">
                            {actionServerGatewayUrl}
                          </span>
                          <input
                            type="text"
                            value={customPath}
                            onChange={(e) => setCustomPath(e.target.value)}
                            placeholder="/api/health"
                            className="w-full p-3 bg-muted border border-border rounded-xl text-xs font-mono font-bold outline-none text-foreground"
                          />
                        </div>
                      </div>

                      {/* Headers */}
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Request Headers (JSON)</label>
                        <textarea
                          value={customHeaders}
                          onChange={(e) => setCustomHeaders(e.target.value)}
                          className="w-full p-3 bg-muted border border-border rounded-xl text-xs font-mono outline-none h-24 resize-none text-foreground font-medium"
                        />
                      </div>

                      {/* Body */}
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Request Body (JSON)</label>
                        <textarea
                          value={customBody}
                          onChange={(e) => setCustomBody(e.target.value)}
                          disabled={['GET', 'DELETE'].includes(customMethod)}
                          className="w-full p-3 bg-muted border border-border rounded-xl text-xs font-mono outline-none h-24 resize-none text-foreground font-medium disabled:opacity-40"
                        />
                      </div>

                      {/* Action Button */}
                      <div className="md:col-span-12">
                        <button
                          onClick={handleExecuteCustomCall}
                          disabled={customLoading}
                          className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                          {customLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                          Execute Action Server Call ({customMethod} {customPath})
                        </button>
                      </div>

                      {/* Call Results output */}
                      {customResult && (
                        <div className="md:col-span-12 p-5 bg-muted/60 border border-border rounded-2xl space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border">
                            <div className="flex items-center gap-2">
                              {customResult.status && customResult.status >= 200 && customResult.status < 300 ? (
                                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px] font-black">
                                  {customResult.status} {customResult.statusText || 'OK'}
                                </span>
                              ) : customResult.status ? (
                                <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-full text-[10px] font-black">
                                  {customResult.status} {customResult.statusText || 'Error'}
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-[10px] font-black">
                                  Call Exception
                                </span>
                              )}
                              {customResult.timeMs !== undefined && (
                                <span className="text-[10px] font-mono text-muted-foreground font-bold">
                                  Latency: {customResult.timeMs}ms
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => setCustomResult(null)}
                              className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                            >
                              Clear Result
                            </button>
                          </div>

                          {customResult.error ? (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl font-mono text-xs font-bold">
                              {customResult.error}
                            </div>
                          ) : (
                            <div className="p-3 bg-card border border-border rounded-xl font-mono text-xs max-h-60 overflow-y-auto">
                              <pre className="whitespace-pre-wrap leading-relaxed text-foreground">
                                {typeof customResult.data === 'object' ? JSON.stringify(customResult.data, null, 2) : String(customResult.data)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {pingStatus.message && (
                    <div className={`p-4 rounded-2xl border text-xs font-mono leading-relaxed max-w-full overflow-x-auto ${
                      pingStatus.status === 'success' 
                        ? 'bg-emerald-50/50 text-emerald-800 border-emerald-100' 
                        : 'bg-rose-50/50 text-rose-800 border-rose-100'
                    }`}>
                      <strong>Response Detail:</strong> {pingStatus.message}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: Database Status & Connection Test Toolkit */}
              {backendSubTab === 'db' && (
                <div className="bg-card shadow-sm p-6 rounded-[2rem] border border-border space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">PostgreSQL Database Connection & Query Toolkit</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Verify database pooling, active credentials, and execute read-only check queries</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          setIsTestingDbConnection(true);
                          const res = await fetch(`${API_BASE_URL}/api/admin/config-status`);
                          if (res.ok) {
                            const data = await res.json();
                            setDbStatus({
                              connected: data.databaseConnected || false,
                              config: data.database || null,
                              error: data.databaseError || null
                            });
                          }
                        } catch (err: any) {
                          console.error("Test DB connection fail:", err);
                        } finally {
                          setIsTestingDbConnection(false);
                        }
                      }}
                      disabled={isTestingDbConnection}
                      className="px-4 py-2 bg-foreground text-background dark:bg-slate-800 dark:text-white rounded-xl text-xs font-bold hover:opacity-95 transition-all flex items-center gap-1.5"
                    >
                      {isTestingDbConnection ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Check & Sync DB Status
                    </button>
                  </div>
                </div>

                {dbStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Database Credentials & Connection Health Badge */}
                    <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border">
                      <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Cpu size={14} className="text-indigo-500" /> Active Credentials & Config
                      </h4>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-card rounded-xl border border-border">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Service Host</span>
                          <span className="font-mono font-bold text-foreground">{dbStatus.config?.host || "127.0.0.1"}</span>
                        </div>
                        <div className="p-3 bg-card rounded-xl border border-border">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Port</span>
                          <span className="font-mono font-bold text-foreground">{dbStatus.config?.port || "5432"}</span>
                        </div>
                        <div className="p-3 bg-card rounded-xl border border-border">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Database Name</span>
                          <span className="font-mono font-bold text-foreground">{dbStatus.config?.database || "Errandly"}</span>
                        </div>
                        <div className="p-3 bg-card rounded-xl border border-border">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Database User</span>
                          <span className="font-mono font-bold text-foreground">{dbStatus.config?.user || "postgres"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dbStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                        <div className="text-xs">
                          <p className="font-bold text-foreground">
                            Status: <span className={dbStatus.connected ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>{dbStatus.connected ? "CONNECTED (OK)" : "DISCONNECTED / FAIL"}</span>
                          </p>
                          {dbStatus.error && (
                            <p className="text-[10px] text-rose-500 font-mono mt-1 max-h-16 overflow-y-auto">{dbStatus.error}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Query Runner */}
                    <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <Play size={10} fill="currentColor" className="text-indigo-500" /> Live Schema Query Runner
                          </h4>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold">Read-Only Safety</span>
                        </div>

                        <div>
                          <label className="text-[9px] text-muted-foreground font-black uppercase ml-1">Predefined Presets</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[
                              { label: 'Check Table Count', sql: 'SELECT count(1) as total_users FROM profiles;' },
                              { label: 'Show User List', sql: 'SELECT id, email, role, full_name, created_at FROM profiles ORDER BY created_at DESC LIMIT 3;' },
                              { label: 'List Errands', sql: 'SELECT id, title, category, status, budget FROM errands LIMIT 3;' },
                              { label: 'Database Time', sql: 'SELECT NOW() as current_db_time;' }
                            ].map((preset, index) => (
                              <button
                                key={index}
                                onClick={() => setCustomSql(preset.sql)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-colors ${
                                  customSql === preset.sql 
                                    ? 'bg-primary text-primary-foreground border-primary' 
                                    : 'bg-card hover:bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-muted-foreground font-black uppercase ml-1">Database SQL Editor</label>
                          <textarea
                            value={customSql}
                            onChange={(e) => setCustomSql(e.target.value)}
                            className="w-full p-2.5 bg-card rounded-xl text-[11px] font-mono border border-border h-20 outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-foreground"
                            placeholder="SELECT * FROM table..."
                          />
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            setTestQueryLoading(true);
                            setTestQueryResult(null);
                            const res = await fetch(`${API_BASE_URL}/api/dbconfig/test-query`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sql: customSql })
                            });
                            const data = await res.json();
                            setTestQueryResult(data);
                          } catch (err: any) {
                            setTestQueryResult({ success: false, error: err.message });
                          } finally {
                            setTestQueryLoading(false);
                          }
                        }}
                        disabled={testQueryLoading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        {testQueryLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                        Run Diagnostic Query
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                    <p className="text-xs text-muted-foreground">Waiting for Database configurations...</p>
                  </div>
                )}

                {testQueryResult && (
                  <div className="bg-muted/10 p-5 rounded-2xl border border-border space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${testQueryResult.success ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                        <h4 className="text-xs font-black text-foreground">Query Execution Result</h4>
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
                          <pre className="mt-2 whitespace-pre overflow-x-auto max-h-40">{JSON.stringify(testQueryResult.rows, null, 2)}</pre>
                        </details>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl font-mono text-[11px] leading-relaxed">
                        <div className="font-bold mb-1">Execution Fail:</div>
                        {testQueryResult.error || "Unknown query error occurred."}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Sub-tab 4: Session Rate Limiter & Protection */}
              {backendSubTab === 'rate-limiter' && (
                <div className="space-y-6">
                  {/* Top Stats Banner */}
                  <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-950 text-white p-6 rounded-[2rem] shadow-xl border border-amber-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 text-2xl font-black">
                        ⚡
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">Session Rate Limiter & Resource Protection</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            rateLimitData?.config?.enabled 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}>
                            {rateLimitData?.config?.enabled ? "Protection Active" : "Protection Disabled"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 max-w-xl">
                          Prevents spamming and tiring host memory and PostgreSQL database connections by enforcing sliding-window call quotas per session and IP address.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={fetchRateLimitStats}
                        disabled={loadingRateLimit}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={13} className={loadingRateLimit ? "animate-spin" : ""} />
                        Refresh Metrics
                      </button>

                      <button
                        onClick={async () => {
                          if (!confirm("Are you sure you want to clear all active session rate limits and unblock all throttled clients?")) return;
                          try {
                            setSavingRateLimit(true);
                            const res = await fetch(`${API_BASE_URL || ''}/api/admin/rate-limit-reset`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            const data = await res.json();
                            setRateLimitMsg(data.message || "Cleared all rate limits successfully!");
                            await fetchRateLimitStats();
                            setTimeout(() => setRateLimitMsg(''), 4000);
                          } catch (e: any) {
                            setRateLimitMsg(`Error: ${e.message}`);
                          } finally {
                            setSavingRateLimit(false);
                          }
                        }}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2"
                      >
                        <ShieldAlert size={14} />
                        Clear All Rate Limits
                      </button>
                    </div>
                  </div>

                  {rateLimitMsg && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={16} />
                      {rateLimitMsg}
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                      <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Total Calls Processed</div>
                      <div className="text-2xl font-black text-foreground mt-1 font-mono">
                        {rateLimitData?.metrics?.totalRequestsProcessed ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Since last server boot</div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                      <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Throttled Requests</div>
                      <div className={`text-2xl font-black mt-1 font-mono ${
                        (rateLimitData?.metrics?.totalRequestsBlocked ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"
                      }`}>
                        {rateLimitData?.metrics?.totalRequestsBlocked ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">429 Too Many Requests returned</div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                      <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Active Tracked Sessions</div>
                      <div className="text-2xl font-black text-indigo-500 mt-1 font-mono">
                        {rateLimitData?.metrics?.currentTrackedSessionsCount ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">In-memory sliding window</div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                      <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Admin Call Multiplier</div>
                      <div className="text-2xl font-black text-emerald-500 mt-1 font-mono">
                        {rateLimitData?.config?.adminMultiplier ?? 5}x
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Granted to backend admins</div>
                    </div>
                  </div>

                  {/* Settings & Threshold Configuration Form */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Sliders className="text-amber-500" size={18} />
                          <div>
                            <h4 className="text-sm font-black text-foreground">Session Threshold Settings</h4>
                            <p className="text-[10px] text-muted-foreground">Adjust maximum allowed requests per 1-minute window per tier</p>
                          </div>
                        </div>
                      </div>

                      {rateLimitData?.config && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                              setSavingRateLimit(true);
                              const formEl = e.currentTarget;
                              const payload = {
                                enabled: (formEl.elements.namedItem('limiter_enabled') as HTMLInputElement).checked,
                                general: {
                                  maxRequests: parseInt((formEl.elements.namedItem('general_max') as HTMLInputElement).value, 10)
                                },
                                ai: {
                                  maxRequests: parseInt((formEl.elements.namedItem('ai_max') as HTMLInputElement).value, 10)
                                },
                                auth: {
                                  maxRequests: parseInt((formEl.elements.namedItem('auth_max') as HTMLInputElement).value, 10)
                                },
                                payment: {
                                  maxRequests: parseInt((formEl.elements.namedItem('payment_max') as HTMLInputElement).value, 10)
                                },
                                adminMultiplier: parseInt((formEl.elements.namedItem('admin_mult') as HTMLInputElement).value, 10)
                              };

                              const res = await fetch(`${API_BASE_URL || ''}/api/admin/rate-limit-config`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                              });

                              const data = await res.json();
                              setRateLimitMsg(data.message || "Threshold settings updated successfully!");
                              await fetchRateLimitStats();
                              setTimeout(() => setRateLimitMsg(''), 4000);
                            } catch (err: any) {
                              setRateLimitMsg(`Error saving settings: ${err.message}`);
                            } finally {
                              setSavingRateLimit(false);
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border">
                            <div>
                              <span className="text-xs font-bold text-foreground block">Global Rate Limiting System</span>
                              <span className="text-[10px] text-muted-foreground">Master switch to enable/disable session rate limiting</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="limiter_enabled"
                                defaultChecked={rateLimitData.config.enabled}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-foreground mb-1">General API Limit (/api/*)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  name="general_max"
                                  defaultValue={rateLimitData.config.general?.maxRequests ?? 100}
                                  min="10"
                                  max="1000"
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-bold">req/min</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-foreground mb-1">AI Gemini Tier (/api/gemini/*)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  name="ai_max"
                                  defaultValue={rateLimitData.config.ai?.maxRequests ?? 20}
                                  min="2"
                                  max="200"
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-bold">req/min</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-foreground mb-1">Auth & SMS Tier (/api/auth/*)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  name="auth_max"
                                  defaultValue={rateLimitData.config.auth?.maxRequests ?? 15}
                                  min="3"
                                  max="100"
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-bold">req/min</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-foreground mb-1">Payment Tier (/api/payments/*)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  name="payment_max"
                                  defaultValue={rateLimitData.config.payment?.maxRequests ?? 20}
                                  min="3"
                                  max="200"
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-bold">req/min</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-foreground mb-1">Admin Account Multiplier</label>
                            <input
                              type="number"
                              name="admin_mult"
                              defaultValue={rateLimitData.config.adminMultiplier ?? 5}
                              min="1"
                              max="20"
                              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Multiplies allowed requests for verified admin credentials (e.g. 5x = 500 req/min for general API)</p>
                          </div>

                          <button
                            type="submit"
                            disabled={savingRateLimit}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            {savingRateLimit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Rate Limiting Config
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Live Simulation & Test Station */}
                    <div className="lg:col-span-5 bg-muted/40 p-6 rounded-[2rem] border border-border space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Play className="text-amber-500" size={16} />
                        <div>
                          <h4 className="text-xs font-black text-foreground">Interactive Rate Limit Tester</h4>
                          <p className="text-[10px] text-muted-foreground font-normal">Simulate burst requests from current session to verify 429 response handling</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Click below to send a burst of 15 rapid API requests in succession. You will witness the rate limiter tracking calls and returning HTTP 429 status with <code className="font-mono text-primary bg-muted px-1 rounded">Retry-After</code> headers when limit is exceeded.
                        </p>

                        <button
                          onClick={async () => {
                            setSimulatingCalls(true);
                            setSimulationLogs([]);
                            const logs: string[] = [];

                            logs.push(`[Test] Starting 15 rapid API calls from current session...`);
                            setSimulationLogs([...logs]);

                            for (let i = 1; i <= 15; i++) {
                              try {
                                const start = Date.now();
                                const res = await fetch(`${API_BASE_URL || ''}/api/health`);
                                const duration = Date.now() - start;
                                const remaining = res.headers.get('X-RateLimit-Remaining');
                                const limit = res.headers.get('X-RateLimit-Limit');

                                if (res.status === 429) {
                                  logs.push(`❌ Call #${i}: HTTP 429 Too Many Requests (Blocked! Limit: ${limit}, Retry-After: ${res.headers.get('Retry-After')}s)`);
                                } else {
                                  logs.push(`✅ Call #${i}: HTTP ${res.status} (${duration}ms) - Remaining: ${remaining}/${limit}`);
                                }
                              } catch (err: any) {
                                logs.push(`⚠️ Call #${i}: Network Error (${err.message})`);
                              }
                              setSimulationLogs([...logs]);
                              await new Promise(r => setTimeout(r, 60)); // 60ms gap
                            }

                            logs.push(`[Test] Simulation complete! Refreshing live stats...`);
                            setSimulationLogs([...logs]);
                            setSimulatingCalls(false);
                            await fetchRateLimitStats();
                          }}
                          disabled={simulatingCalls}
                          className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          {simulatingCalls ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-400" />}
                          Simulate Rapid Call Burst (15 Requests)
                        </button>

                        {simulationLogs.length > 0 && (
                          <div className="p-3 bg-card border border-border rounded-xl font-mono text-[10px] space-y-1 max-h-48 overflow-y-auto font-medium">
                            {simulationLogs.map((log, idx) => (
                              <div key={idx} className={log.includes('429') ? 'text-amber-500 font-bold' : log.includes('✅') ? 'text-emerald-500' : 'text-foreground'}>
                                {log}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Tracked Sessions Table */}
                  <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Users className="text-amber-500" size={18} />
                        <div>
                          <h4 className="text-sm font-black text-foreground">Active Tracked Sessions & IPs</h4>
                          <p className="text-[10px] text-muted-foreground">Live list of active client sessions making requests in the current window</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {rateLimitData?.activeSessions?.length ?? 0} Active Session(s)
                      </span>
                    </div>

                    <div className="max-w-full overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-muted/60 text-muted-foreground border-b border-border">
                            <th className="p-3 font-black text-[10px] uppercase">Session / Client Key</th>
                            <th className="p-3 font-black text-[10px] uppercase">Service Tier</th>
                            <th className="p-3 font-black text-[10px] uppercase">Calls in Last Min</th>
                            <th className="p-3 font-black text-[10px] uppercase">Status</th>
                            <th className="p-3 font-black text-[10px] uppercase text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rateLimitData?.activeSessions && rateLimitData.activeSessions.length > 0 ? (
                            rateLimitData.activeSessions.map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-muted/10 transition-colors">
                                <td className="p-3 text-foreground font-bold font-mono">
                                  {item.session}
                                </td>
                                <td className="p-3 uppercase text-[10px] font-black text-amber-500">
                                  {item.tier}
                                </td>
                                <td className="p-3 font-bold text-foreground">
                                  {item.activeCallsInLastMin} calls
                                </td>
                                <td className="p-3">
                                  {item.isBlocked ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                      Throttled ({item.blockedTimeRemainingSec}s left)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                      Normal
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`${API_BASE_URL || ''}/api/admin/rate-limit-reset`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ sessionKey: item.key })
                                        });
                                        const data = await res.json();
                                        setRateLimitMsg(data.message);
                                        await fetchRateLimitStats();
                                        setTimeout(() => setRateLimitMsg(''), 3000);
                                      } catch (e: any) {
                                        setRateLimitMsg(`Error: ${e.message}`);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-muted hover:bg-amber-500 hover:text-white text-foreground rounded-lg text-[10px] font-bold transition-colors"
                                  >
                                    Reset Session
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs font-sans">
                                No active session throttles or heavy traffic detected in the current window.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 5: Multi-Tier Database Sync Engine */}
              {backendSubTab === 'sync' && (
                <div className="space-y-6">
                  {/* Notification message */}
                  {adminSyncMsg && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-2xl text-xs font-mono flex items-center justify-between">
                      <span>{adminSyncMsg}</span>
                      <button onClick={() => setAdminSyncMsg('')} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Header Banner */}
                  <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                          <RefreshCw size={20} className={adminSyncLoading || adminSyncTriggering ? 'animate-spin' : ''} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-foreground">Multi-Tier Database Consistency & Sync Engine</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              adminSyncStatus?.synced 
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}>
                              {adminSyncStatus?.synced ? 'All Tiers Synchronized' : 'Auto-Healing Drift'}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Continuous 25s auto-reconciliation engine ensuring parity across Primary PostgreSQL, Fallback Local PostgreSQL, and Resilient Local JSON.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchAdminSyncStatus(true)}
                          disabled={adminSyncLoading}
                          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <RefreshCw size={13} className={adminSyncLoading ? 'animate-spin' : ''} />
                          Check Parity
                        </button>

                        <button
                          onClick={triggerAdminFullSync}
                          disabled={adminSyncTriggering}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          {adminSyncTriggering ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                          Force Full Auto-Sync
                        </button>
                      </div>
                    </div>

                    {/* Tier Diagnostics 3-Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tier 1: Primary PostgreSQL */}
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Database size={14} className="text-indigo-500" /> Primary PostgreSQL
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            adminSyncStatus?.sources?.primary?.connected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {adminSyncStatus?.sources?.primary?.connected ? 'Connected' : 'Offline'}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-muted-foreground font-mono">
                          <div className="flex justify-between">
                            <span>Host:</span>
                            <span className="font-bold text-foreground truncate max-w-[120px]" title={adminSyncStatus?.sources?.primary?.host}>
                              {adminSyncStatus?.sources?.primary?.host || 'External PG'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Rows:</span>
                            <span className="font-bold text-indigo-500">{adminSyncStatus?.sources?.primary?.totalRecords ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tier 2: Local PostgreSQL */}
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Server size={14} className="text-emerald-500" /> Local PG Fallback
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            adminSyncStatus?.sources?.localPg?.connected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                          }`}>
                            {adminSyncStatus?.sources?.localPg?.connected ? 'Standby Active' : 'Standby / Offline'}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-muted-foreground font-mono">
                          <div className="flex justify-between">
                            <span>Host:</span>
                            <span className="font-bold text-foreground">{adminSyncStatus?.sources?.localPg?.host || '127.0.0.1:5432'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Rows:</span>
                            <span className="font-bold text-emerald-500">{adminSyncStatus?.sources?.localPg?.totalRecords ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tier 3: Local JSON Resilient Store */}
                      <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <HardDrive size={14} className="text-sky-500" /> JSON Resilient Store
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-sky-500/10 text-sky-600">
                            Always Active
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-muted-foreground font-mono">
                          <div className="flex justify-between">
                            <span>Path:</span>
                            <span className="font-bold text-foreground">.local_db/*.json</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cached Rows:</span>
                            <span className="font-bold text-sky-500">{adminSyncStatus?.sources?.json?.totalRecords ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Table Status Matrix */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-foreground">Database Tables Consistency Status</h4>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="bg-muted/60 text-muted-foreground border-b border-border text-[10px] uppercase">
                              <th className="p-3">Table</th>
                              <th className="p-3 text-center">Primary PG</th>
                              <th className="p-3 text-center">Local PG</th>
                              <th className="p-3 text-center">JSON Store</th>
                              <th className="p-3 text-center">Consistency Status</th>
                              <th className="p-3 text-right">Reconciled</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {adminSyncStatus?.tables && adminSyncStatus.tables.length > 0 ? (
                              adminSyncStatus.tables.map((t: any) => (
                                <tr key={t.tableName} className="hover:bg-muted/20 transition-colors">
                                  <td className="p-3 font-bold text-foreground flex items-center gap-1.5">
                                    <Database size={13} className="text-indigo-500" />
                                    {t.tableName}
                                  </td>
                                  <td className="p-3 text-center font-bold">{t.primaryCount}</td>
                                  <td className="p-3 text-center font-bold">{t.localCount}</td>
                                  <td className="p-3 text-center font-bold">{t.jsonCount}</td>
                                  <td className="p-3 text-center">
                                    {t.inSync ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        Synchronized
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                        Auto-Healed
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right text-emerald-600 font-bold">
                                    {t.recordsReconciled > 0 ? `+${t.recordsReconciled} records` : '-'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-muted-foreground text-xs font-sans">
                                  {adminSyncLoading ? 'Analyzing sync metrics across tiers...' : 'Click "Check Parity" to inspect synchronization status.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Guided Action Call Modules */}
              {backendSubTab === 'action-server' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Paystack STK Push direct Test */}
                <div className="bg-muted/40 p-6 rounded-[2rem] border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">STK Push (M-Pesa Prompt)</h3>
                      <p className="text-[10px] text-muted-foreground">Verify direct Paystack Mobile Money triggers</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1">Phone Number (254...)</label>
                      <input 
                        type="text" 
                        value={stkPhone} 
                        onChange={e => setStkPhone(e.target.value)} 
                        className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold outline-none font-mono font-medium"
                        placeholder="e.g. 2547XXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1">Test Amount (KES)</label>
                      <input 
                        type="number" 
                        value={stkAmount} 
                        onChange={e => setStkAmount(e.target.value)} 
                        className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold outline-none font-mono font-medium"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!stkPhone) {
                          setStkResult('Error: Phone number is required.');
                          return;
                        }
                        try {
                          setStkLoading(true);
                          setStkResult('Initiating STK Push...');
                          const res = await fetch(`${actionServerGatewayUrl}/api/payments/paystack/stk-push`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: user.email,
                              amount: Number(stkAmount),
                              userId: user.id,
                              phoneNumber: stkPhone
                            })
                          });
                          const data = await res.json();
                          setStkResult(JSON.stringify(data, null, 2));
                        } catch (e: any) {
                          setStkResult(`Error: ${e.message}`);
                        } finally {
                          setStkLoading(false);
                        }
                      }}
                      disabled={stkLoading}
                      className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
                    >
                      {stkLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                      Trigger STK Push (KES {stkAmount})
                    </button>
                    
                    {stkResult && (
                      <div className="p-3 bg-card border border-border rounded-xl text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {stkResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Transaction Status / Verification Test */}
                <div className="bg-muted/40 p-6 rounded-[2rem] border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ReceiptText size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">Transaction Sync & Checking</h3>
                      <p className="text-[10px] text-muted-foreground">Poll single transaction status or trigger pending verification loops</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1">Transaction Ref / ID</label>
                      <input 
                        type="text" 
                        value={verifyRef} 
                        onChange={e => setVerifyRef(e.target.value)} 
                        className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold outline-none font-mono font-medium"
                        placeholder="e.g. TX-171700..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={async () => {
                          if (!verifyRef) {
                            setVerifyResult('Error: Transaction ID / Reference is required.');
                            return;
                          }
                          try {
                            setVerifyLoading(true);
                            setVerifyResult(`Querying status for reference ${verifyRef}...`);
                            const res = await fetch(`${actionServerGatewayUrl}/api/payments/status?reference=${verifyRef}`);
                            const data = await res.json();
                            setVerifyResult(JSON.stringify(data, null, 2));
                          } catch (e: any) {
                            setVerifyResult(`Error: ${e.message}`);
                          } finally {
                            setVerifyLoading(false);
                          }
                        }}
                        disabled={verifyLoading}
                        className="py-3.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        {verifyLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                        Find Status
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            setVerifyLoading(true);
                            setVerifyResult('Triggering verify all pending transactions...');
                            const res = await fetch(`${actionServerGatewayUrl}/api/payments/verify/all`);
                            const data = await res.json();
                            setVerifyResult(JSON.stringify(data, null, 2));
                          } catch (e: any) {
                            setVerifyResult(`Error: ${e.message}`);
                          } finally {
                            setVerifyLoading(false);
                          }
                        }}
                        disabled={verifyLoading}
                        className="py-3.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5"
                      >
                        {verifyLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Verify All Pending
                      </button>
                    </div>
                    
                    {verifyResult && (
                      <div className="p-3 bg-card border border-border rounded-xl text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto font-medium">
                        {verifyResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. SMTP & Actions Email Service Proxy Test */}
                <div className="bg-muted/40 p-6 rounded-[2rem] border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Mail size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">Relay SMTP Email Service</h3>
                      <p className="text-[10px] text-muted-foreground">Test action server transactional mailing proxy templates</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground ml-1 font-medium">Recipient Email</label>
                        <input 
                          type="email" 
                          value={emailTo} 
                          onChange={e => setEmailTo(e.target.value)} 
                          className="w-full p-2.5 bg-card border border-border rounded-xl text-[10px] font-bold outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground ml-1 font-medium font-bold">Email Type</label>
                        <select 
                          value={emailType} 
                          onChange={e => setEmailType(e.target.value)} 
                          className="w-full p-2.5 bg-card border border-border rounded-xl text-[10px] font-bold outline-none font-medium text-foreground bg-white"
                        >
                          <option value="verification">verification</option>
                          <option value="runner_approval">runner_approval</option>
                          <option value="runner_application_received">runner_application_received</option>
                          <option value="alert">alert / billing</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1 font-medium font-bold">Email Subject</label>
                      <input 
                        type="text" 
                        value={emailSubject} 
                        onChange={e => setEmailSubject(e.target.value)} 
                        className="w-full p-2.5 bg-card border border-border rounded-xl text-[10px] font-bold outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1 font-medium">Email Body Content / HTML</label>
                      <textarea 
                        value={emailHtml} 
                        onChange={e => setEmailHtml(e.target.value)} 
                        className="w-full p-2.5 bg-card border border-border rounded-xl text-[10px] font-mono outline-none h-16 resize-none font-medium"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!emailTo) {
                          setEmailResult('Error: Recipient email is required.');
                          return;
                        }
                        try {
                          setEmailLoading(true);
                          setEmailResult('Sending email via Action Server...');
                          const res = await fetch(`${actionServerGatewayUrl}/api/notifications/send-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              to: emailTo,
                              recipient: emailTo,
                              subject: emailSubject,
                              html: emailHtml,
                              message: emailHtml,
                              type: emailType,
                              email_type: emailType
                            })
                          });
                          const data = await res.json();
                          setEmailResult(JSON.stringify(data, null, 2));
                        } catch (e: any) {
                          setEmailResult(`Error: ${e.message}`);
                        } finally {
                          setEmailLoading(false);
                        }
                      }}
                      disabled={emailLoading}
                      className="w-full py-3 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100 dark:shadow-none flex items-center justify-center gap-2"
                    >
                      {emailLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                      Send Test Email via Proxy
                    </button>
                    
                    {emailResult && (
                      <div className="p-3 bg-card border border-border rounded-xl text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {emailResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. SMS & OTP Gateway delivery checks */}
                <div className="bg-muted/40 p-6 rounded-[2rem] border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground">SMS & OTP Delivery Testing</h3>
                      <p className="text-[10px] text-muted-foreground">Try sending plain messages or OTP alerts over gateway APIs</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1">Recipient Number (254...)</label>
                      <input 
                        type="text" 
                        value={smsTo} 
                        onChange={e => setSmsTo(e.target.value)} 
                        className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold outline-none font-mono font-medium font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground ml-1">SMS Text Message</label>
                      <textarea 
                        value={smsMessageText} 
                        onChange={e => setSmsMessageText(e.target.value)} 
                        className="w-full p-3 bg-card border border-border rounded-xl text-xs font-bold outline-none h-14 resize-none font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={async () => {
                          if (!smsTo) {
                            setSmsResult('Error: Recipient phone number is required.');
                            return;
                          }
                          try {
                            setSmsLoading(true);
                            setSmsResult('Sending SMS to /api/sms/send on Action Server...');
                            const res = await fetch(`${actionServerGatewayUrl}/api/sms/send`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ recipient: smsTo, message: smsMessageText })
                            });
                            const data = await res.json();
                            setSmsResult(JSON.stringify(data, null, 2));
                          } catch (e: any) {
                            setSmsResult(`Error: ${e.message}`);
                          } finally {
                            setSmsLoading(false);
                          }
                        }}
                        disabled={smsLoading}
                        className="py-3 bg-pink-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-pink-700 transition-colors flex items-center justify-center gap-1"
                      >
                        {smsLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                        via /sms/send
                      </button>
                      <button
                        onClick={async () => {
                          if (!smsTo) {
                            setSmsResult('Error: Recipient phone number is required.');
                            return;
                          }
                          try {
                            setSmsLoading(true);
                            setSmsResult('Sending SMS via notification service on Action Server...');
                            const res = await fetch(`${actionServerGatewayUrl}/api/notifications/send-sms`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ to: smsTo, recipient: smsTo, message: smsMessageText, content: smsMessageText })
                            });
                            const data = await res.json();
                            setSmsResult(JSON.stringify(data, null, 2));
                          } catch (e: any) {
                            setSmsResult(`Error: ${e.message}`);
                          } finally {
                            setSmsLoading(false);
                          }
                        }}
                        disabled={smsLoading}
                        className="py-3 bg-pink-800 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-pink-900 transition-colors flex items-center justify-center gap-1"
                      >
                        {smsLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                        via /notifications
                      </button>
                      <button
                        onClick={async () => {
                          if (!smsTo) {
                            setSmsResult('Error: Recipient phone number is required.');
                            return;
                          }
                          try {
                            setSmsLoading(true);
                            setSmsResult('Sending WhatsApp notification via wasenderapi.com...');
                            const res = await fetch(`${API_BASE_URL || ''}/api/whatsapp/send`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ to: smsTo, message: smsMessageText })
                            });
                            const data = await res.json();
                            setSmsResult(JSON.stringify(data, null, 2));
                          } catch (e: any) {
                            setSmsResult(`Error: ${e.message}`);
                          } finally {
                            setSmsLoading(false);
                          }
                        }}
                        disabled={smsLoading}
                        className="py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
                      >
                        {smsLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                        via WhatsApp
                      </button>
                    </div>
                    
                    {smsResult && (
                      <div className="p-3 bg-card border border-border rounded-xl text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto font-medium">
                        {smsResult}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Sub-tab 2: Backend Developer & Admin Accounts */}
          {backendSubTab === 'accounts' && (
            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-xl font-black text-foreground">Backend & Developer Accounts</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create and manage administrative credentials with the <code className="font-mono bg-muted text-primary px-1 rounded">backend_admin</code> column set to true.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Creation Form */}
                <div className="lg:col-span-5 bg-muted/60 p-8 rounded-[2.5rem] border border-border space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Plus size={18} className="text-primary animate-pulse" />
                    <h3 className="text-sm font-black text-foreground">Compile New Backend Account</h3>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!backendForm.name || !backendForm.email || !backendForm.phone || !backendForm.password) {
                        alert("All fields are required to compile administrative credentials.");
                        return;
                      }
                      try {
                        setLoadingBackend(true);
                        const res = await fetch(`${API_BASE_URL || ''}/api/admin/create-backend-account`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(backendForm)
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || "Failed to create backend account");
                        }
                        alert("Backend administrative database account compiled and registered successfully!");
                        setBackendForm({
                          name: '',
                          email: '',
                          phone: '',
                          password: '',
                          role: 'ADMIN'
                        });
                        fetchBackendAccounts();
                      } catch (err: any) {
                        alert("Account compilation error: " + err.message);
                      } finally {
                        setLoadingBackend(false);
                      }
                    }} 
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground ml-1">ADMINISTRATOR NAME</label>
                      <input
                        type="text"
                        placeholder="e.g. Timothy Kirihara"
                        value={backendForm.name}
                        onChange={e => setBackendForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground ml-1">SYSTEM EMAIL ADDRESS</label>
                      <input
                        type="email"
                        placeholder="e.g. dev-ops@codexict.co.ke"
                        value={backendForm.email}
                        onChange={e => setBackendForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground ml-1">PHONE NUMBER</label>
                      <input
                        type="tel"
                        placeholder="e.g. 0712345678"
                        value={backendForm.phone}
                        onChange={e => setBackendForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black text-muted-foreground">SECRET PASSWORD</label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                            let pass = "";
                            for (let i = 0; i < 14; i++) {
                              pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            setBackendForm(prev => ({ ...prev, password: pass }));
                          }}
                          className="text-[9px] font-black text-primary hover:underline"
                        >
                          GENERATE AUTO
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="At least 6 characters safe"
                        value={backendForm.password}
                        onChange={e => setBackendForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground ml-1">SECURITY ROLE PRIVILEGES</label>
                      <select
                        value={backendForm.role}
                        onChange={e => setBackendForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary transition-all font-medium"
                      >
                        <option value="ADMIN">System Administrator (Full Read-Write)</option>
                        <option value="OPERATOR">System Operator (Partial Access)</option>
                        <option value="IT_ADMIN">IT Admin Integration Controller</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingBackend}
                      className="w-full py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loadingBackend ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>COMPILING CREDENTIALS...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>INSTALL BACKEND ACCOUNT</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Directory list */}
                <div className="lg:col-span-7 bg-card border border-border p-8 rounded-[2.5rem] shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Database size={18} className="text-indigo-500" />
                      <h3 className="text-sm font-black text-foreground">Backend Registered Profiles</h3>
                    </div>
                    <button
                      onClick={fetchBackendAccounts}
                      disabled={loadingBackend}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-all"
                      title="Reload Accounts List"
                    >
                      <RefreshCw size={14} className={loadingBackend ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {loadingBackend && backendAccounts.length === 0 ? (
                    <div className="space-y-4 py-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="w-10 h-10 rounded-xl" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="w-1/3 h-4" />
                            <Skeleton className="w-1/2 h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : backendAccounts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                      <Cpu size={32} className="mx-auto text-indigo-200" />
                      <p className="font-semibold text-foreground">Zero Backend Accounts Detected</p>
                      <p className="text-[10px] max-w-xs mx-auto">Create developer-level portal credentials on the left side form to map custom profiles here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {backendAccounts.map(account => (
                        <div key={account.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                              {account.name ? account.name.charAt(0).toUpperCase() : 'B'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-foreground">{account.name || 'Backend User'}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 uppercase">
                                  {account.role || 'ADMIN'}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{account.email}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{account.phone ? formatPhoneDisplay(account.phone) : 'No phone'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/40 font-bold whitespace-nowrap">
                              backend_admin: true
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
              <div className="border-r border-slate-50 overflow-y-auto bg-muted/30">
                <div className="p-6 border-b border-slate-50 bg-card text-card-foreground sticky top-0 z-10">
                  <h3 className="text-micro text-muted-foreground">Conversations</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {supportChats.length === 0 ? (
                    <div className="p-10 text-center text-micro text-muted-foreground/70">No active chats</div>
                  ) : (
                    supportChats.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedSupportUser(c.userId)}
                        className={`w-full p-6 text-left hover:bg-card text-card-foreground transition-all flex items-center justify-between ${selectedSupportUser === c.userId ? 'bg-card text-card-foreground border-l-4 border-primary' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-muted-foreground font-black text-xs">
                            {c.userName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-foreground">{c.userName || 'User'}</p>
                            <p className="text-sm font-bold text-muted-foreground truncate max-w-[120px]">{c.lastMessage || 'No messages'}</p>
                          </div>
                        </div>
                        {c.unreadByAdmin && <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 ml-2" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="md:col-span-2 bg-card text-card-foreground rounded-[2rem] border border-border shadow-sm overflow-hidden flex flex-col h-[600px]">
                {selectedSupportUser ? (
                  <SupportChatView user={user} targetUserId={selectedSupportUser} isAdmin={true} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70 gap-3">
                    <MessageCircle size={48} strokeWidth={1} />
                    <p className="text-xs font-black tracking-normal font-medium">Select a conversation</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Dynamic Openable Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-in fade-in duration-200">
          <motion.div 
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8"
          >
            {/* Header */}
            <div className="p-6 bg-muted/50 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-foreground">Runner Application Review</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Submitted {selectedApp.createdAt ? new Date(selectedApp.createdAt).toLocaleDateString() : 'recently'}</p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Profile Overview */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground">{selectedApp.fullName}</h4>
                  <p className="text-xs text-muted-foreground">{selectedApp.categoryApplied} • {selectedApp.email}</p>
                </div>
              </div>

              {selectedApp.reviewedByName && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center gap-3">
                  <ShieldCheck size={20} className="text-indigo-600 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Reviewed By</p>
                    <p className="text-xs font-black text-foreground mt-0.5">{selectedApp.reviewedByName}</p>
                  </div>
                </div>
              )}

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/50">
                  <p className="font-black text-muted-foreground uppercase text-[10px] tracking-wider">Phone Number</p>
                  <p className="font-bold text-foreground mt-1 text-sm">{selectedApp.phone ? formatPhoneDisplay(selectedApp.phone) : 'N/A'}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/50">
                  <p className="font-black text-muted-foreground uppercase text-[10px] tracking-wider">National ID / Passport</p>
                  <p className="font-bold text-foreground mt-1 text-sm">{selectedApp.nationalId || 'N/A'}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl border border-border/50 col-span-2">
                  <p className="font-black text-muted-foreground uppercase text-[10px] tracking-wider">Physical Address</p>
                  <p className="font-bold text-foreground mt-1 text-sm">{selectedApp.address || 'N/A'}</p>
                </div>
              </div>

              {/* Document Images */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Verification Documents (Click to view full)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="group relative bg-secondary rounded-2xl overflow-hidden aspect-video border border-border hover:shadow-md transition-all">
                    <img src={selectedApp.idFrontUrl} className="w-full h-full object-cover" alt="ID Front" />
                    <a href={selectedApp.idFrontUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase transition-opacity">Open Image</a>
                    <div className="absolute bottom-1.5 left-2 bg-slate-900/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">ID Front</div>
                  </div>
                  <div className="group relative bg-secondary rounded-2xl overflow-hidden aspect-video border border-border hover:shadow-md transition-all">
                    <img src={selectedApp.idBackUrl} className="w-full h-full object-cover" alt="ID Back" />
                    <a href={selectedApp.idBackUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase transition-opacity">Open Image</a>
                    <div className="absolute bottom-1.5 left-2 bg-slate-900/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">ID Back</div>
                  </div>
                  {selectedApp.selfieUrl && (
                    <div className="group relative bg-secondary rounded-2xl overflow-hidden aspect-video border border-border hover:shadow-md transition-all">
                      <img src={selectedApp.selfieUrl} className="w-full h-full object-cover" alt="Selfie" />
                      <a href={selectedApp.selfieUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase transition-opacity">Open Image</a>
                      <div className="absolute bottom-1.5 left-2 bg-slate-900/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">Passport Photo</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-muted/30 border-t border-border flex items-center justify-between gap-3">
              <button 
                onClick={() => setShowReturnModal(true)} 
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Return for Collection
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleApproveApplication(selectedApp)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all animate-bounce"
                >
                  Approve Application
                </button>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="px-5 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Return application overlay comments modal */}
      {showReturnModal && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-150">
          <motion.div 
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-card text-card-foreground border border-border w-full max-w-md rounded-[2rem] p-6 shadow-2xl space-y-4"
          >
            <div>
              <h3 className="text-lg font-black text-foreground">Return Application Reason</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Applicant: {selectedApp.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Comments & Required Documents / Instructions</label>
              <textarea 
                value={returnReasonText}
                onChange={e => setReturnReasonText(e.target.value)}
                placeholder="E.g., Your ID back image was blurry, please upload a clearer shot. Or physical pickup: 'Collect your card at Central Hub.'"
                className="w-full h-32 px-4 py-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all font-medium resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReasonText('');
                }}
                className="px-4 py-2 text-xs font-black text-muted-foreground hover:bg-secondary rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleReturnApplication(selectedApp, returnReasonText)}
                className="px-5 py-2 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all"
              >
                Confirm Return
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dedicated Force Sync Visual Progress Indicator Modal */}
      <AnimatePresence>
        {showForceSyncModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[10001] animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.94, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
              className="bg-card text-card-foreground border border-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    forceSyncRunning 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : forceSyncError 
                        ? 'bg-rose-500/10 text-rose-500' 
                        : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {forceSyncRunning ? (
                      <Loader2 size={22} className="animate-spin text-emerald-500" />
                    ) : forceSyncError ? (
                      <AlertTriangle size={22} className="text-rose-500" />
                    ) : (
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-foreground tracking-tight">
                        Database Re-Synchronization Routine
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Bi-Directional Auto-Healing
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reconciling data mismatches across Primary PostgreSQL and Local State
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowForceSyncModal(false)}
                  disabled={forceSyncRunning}
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 disabled:opacity-40 flex items-center justify-center text-foreground transition-all"
                  title="Close Sync Dialog"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Visual Progress Bar Card */}
                <div className="p-6 bg-muted/30 rounded-2xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                        Re-Synchronization Progress
                      </span>
                      <h4 className="text-sm font-black text-foreground mt-0.5">{forceSyncStepTitle}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black font-mono text-emerald-500">
                        {forceSyncProgress}%
                      </span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-3 bg-secondary/80 rounded-full overflow-hidden p-0.5 border border-border/40">
                    <motion.div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        forceSyncError 
                          ? 'bg-rose-500' 
                          : forceSyncProgress === 100 
                            ? 'bg-emerald-500' 
                            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 animate-pulse'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${forceSyncProgress}%` }}
                      transition={{ ease: "easeInOut" }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">
                    {forceSyncStepSubtitle}
                  </p>
                </div>

                {/* 4-Step Interactive Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {[
                    { phase: 1, title: 'Tier Handshake', desc: 'Connecting to DB & discovery' },
                    { phase: 2, title: 'Diff Analysis', desc: 'Scanning timestamp drifts' },
                    { phase: 3, title: 'Auto-Healing', desc: 'Syncing mismatched records' },
                    { phase: 4, title: 'Parity Verified', desc: 'Local state & cache locked' }
                  ].map(step => {
                    const isDone = forceSyncCurrentPhase > step.phase || forceSyncProgress === 100;
                    const isCurrent = forceSyncCurrentPhase === step.phase && forceSyncProgress < 100;

                    return (
                      <div 
                        key={step.phase}
                        className={`p-3 rounded-xl border transition-all ${
                          isDone 
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600' 
                            : isCurrent 
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground ring-1 ring-indigo-500/20' 
                              : 'bg-muted/30 border-border/50 text-muted-foreground opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider">Step {step.phase}</span>
                          {isDone ? (
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          ) : isCurrent ? (
                            <Loader2 size={13} className="animate-spin text-indigo-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-border" />
                          )}
                        </div>
                        <p className="text-xs font-black truncate">{step.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Result Highlights */}
                {forceSyncResult && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                        <ShieldCheck size={16} />
                        <span>Parity Confirmed: All Database Tiers are in Sync</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">
                        {forceSyncResult.recordsReconciled || 0} Records Reconciled
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2.5 bg-card rounded-xl border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-sans">Tables Analyzed</span>
                        <span className="font-black text-foreground">{forceSyncResult.tables?.length || 0}</span>
                      </div>
                      <div className="p-2.5 bg-card rounded-xl border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-sans">Mismatches</span>
                        <span className="font-black text-foreground">{forceSyncResult.mismatchesDetected || 0}</span>
                      </div>
                      <div className="p-2.5 bg-card rounded-xl border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-sans">Reconciled</span>
                        <span className="font-black text-emerald-600">{forceSyncResult.recordsReconciled || 0}</span>
                      </div>
                      <div className="p-2.5 bg-card rounded-xl border border-border/50">
                        <span className="text-[10px] text-muted-foreground block font-sans">Status</span>
                        <span className="font-black text-emerald-600">100% Parity</span>
                      </div>
                    </div>

                    {/* Table-by-Table Chips */}
                    {forceSyncResult.tables && forceSyncResult.tables.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Reconciled Tables Matrix</span>
                        <div className="flex flex-wrap gap-1.5">
                          {forceSyncResult.tables.map((tbl: any) => (
                            <span 
                              key={tbl.tableName}
                              className="px-2.5 py-1 bg-card border border-border rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-foreground">{tbl.tableName}</span>
                              <span className="text-muted-foreground">({tbl.primaryCount || tbl.jsonCount} rows)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {forceSyncError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between text-xs text-rose-600">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span className="font-bold">{forceSyncError}</span>
                    </div>
                    <button
                      onClick={executeForceSyncRoutine}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 transition"
                    >
                      Retry Re-Sync
                    </button>
                  </div>
                )}

                {/* Real-time Audit Stream Console */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                      <Terminal size={12} className="text-indigo-500" /> Real-time Audit Stream
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{forceSyncLogs.length} events logged</span>
                  </div>

                  <div className="p-3.5 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 font-mono text-[11px] h-36 overflow-y-auto custom-scrollbar space-y-1.5">
                    {forceSyncLogs.length === 0 ? (
                      <p className="text-slate-500 italic">Awaiting synchronization routine execution...</p>
                    ) : (
                      forceSyncLogs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-slate-500 select-none">[{log.time}]</span>
                          <span className={
                            log.type === 'success' 
                              ? 'text-emerald-400 font-bold' 
                              : log.type === 'warn' 
                                ? 'text-amber-400' 
                                : log.type === 'error' 
                                  ? 'text-rose-400 font-bold' 
                                  : 'text-slate-300'
                          }>
                            {log.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
                <a
                  href="/connectionadmin"
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition"
                >
                  <span>Open Connection Admin</span>
                  <ArrowRight size={12} />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={executeForceSyncRoutine}
                    disabled={forceSyncRunning}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl text-xs font-black uppercase transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCw size={12} className={forceSyncRunning ? 'animate-spin' : ''} />
                    <span>Run Again</span>
                  </button>
                  <button
                    onClick={() => setShowForceSyncModal(false)}
                    disabled={forceSyncRunning}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {forceSyncProgress === 100 ? 'Done' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;

