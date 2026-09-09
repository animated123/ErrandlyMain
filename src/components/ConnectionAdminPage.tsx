import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Database, Server, Shield, Lock, CheckCircle2, XCircle, 
  RefreshCw, Play, Terminal, Activity, FileText, Download, 
  Trash2, Eye, EyeOff, Save, Globe, Cpu, AlertTriangle, 
  ArrowLeft, Send, Search, Copy, Check, ExternalLink, HardDrive, 
  Layers, Clock, Filter, Radio, Mail, Zap, CheckCheck, Wifi, 
  Gauge, ShieldCheck, HelpCircle, ChevronRight, Sparkles, Key, AlertCircle,
  Cloud, Flame, Table, FileJson, ChevronLeft, UserCheck, ShieldAlert, ArrowRight, User
} from 'lucide-react';
import { FirebaseInfrastructureTable } from './FirebaseInfrastructureTable';

export interface CheckAllSystemsResult {
  success: boolean;
  overallStatus: 'all_systems_operational' | 'partially_degraded' | 'critical_issues';
  timestamp: string;
  totalDurationMs: number;
  database: {
    status: 'operational' | 'offline';
    connected: boolean;
    latencyMs: number | null;
    host: string;
    port: number;
    database: string;
    user: string;
    tableCount: number;
    version: string | null;
    error: string | null;
    primary?: {
      status: 'operational' | 'offline';
      connected: boolean;
      latencyMs: number | null;
      host: string;
      port: number;
      database: string;
      user: string;
      tableCount: number;
      version: string | null;
      error: string | null;
    };
    fallbackLocal?: {
      status: 'operational' | 'offline';
      connected: boolean;
      latencyMs: number | null;
      host: string;
      port: number;
      database: string;
      user: string;
      tableCount: number;
      version: string | null;
      error: string | null;
    };
  };
  actionServer: {
    status: 'operational' | 'degraded' | 'unreachable';
    online: boolean;
    url: string;
    statusCode: number | null;
    latencyMs: number | null;
    responsePreview: any;
    error: string | null;
  };
  emailSmtp: {
    status: 'operational' | 'not_configured' | 'error';
    isConfigured: boolean;
    host: string | null;
    port: number;
    user: string | null;
    from: string;
    secure: boolean;
    verified: boolean;
    latencyMs: number | null;
    error: string | null;
    note?: string;
  };
}

interface ConnectionAdminStatus {
  database: {
    connected: boolean;
    activeSource?: string;
    error: string | null;
    latencyMs: number | null;
    config: {
      host: string;
      port: number;
      user: string;
      database: string;
      hasPassword: boolean;
    };
    fallbackConfig?: {
      host: string;
      port: number;
      user: string;
      database: string;
      connected: boolean;
      error: string | null;
      latencyMs: number | null;
      tables?: string[];
      tableCount?: number;
      version?: string;
      hasPassword?: boolean;
    };
    tables: string[];
    tableCount: number;
    version?: string;
    serverTime?: string;
  };
  actionServer: {
    url: string;
    online: boolean;
    statusCode: number | null;
    latencyMs: number | null;
    error: string | null;
    responsePreview?: any;
    testedAt?: string;
  };
  appConfig: {
    raw: any;
    filePath: string;
    lastUpdated?: string;
  };
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    memoryUsage: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    envStatus: {
      hasConnectionAdminPwd: boolean;
      hasPgHost: boolean;
      hasActionServerUrl: boolean;
      hasGeminiApiKey: boolean;
    };
  };
}

interface LogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
}

export interface SyncTableItem {
  tableName: string;
  primaryCount: number;
  localCount: number;
  jsonCount: number;
  inSync: boolean;
  mismatchesDetected: number;
  recordsReconciled: number;
  status: 'synchronized' | 'reconciled' | 'mismatch_detected' | 'offline';
  discrepancy: string | null;
  lastSyncedAt: string;
}

export interface SyncAuditLog {
  id: string;
  timestamp: string;
  table: string;
  action: string;
  recordsCount: number;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export interface SyncStatusResponse {
  success: boolean;
  synced: boolean;
  mismatchesDetected: number;
  recordsReconciled: number;
  tables: SyncTableItem[];
  durationMs: number;
  timestamp: string;
  auditLogs: SyncAuditLog[];
  autoSyncIntervalSeconds: number;
  autoSyncEnabled: boolean;
  sources: {
    primary: {
      connected: boolean;
      host: string;
      port: number;
      database: string;
      totalRecords: number;
    };
    localPg: {
      connected: boolean;
      host: string;
      port: number;
      database: string;
      totalRecords: number;
    };
    json: {
      active: boolean;
      totalRecords: number;
    };
  };
}

export default function ConnectionAdminPage({ onBackToHome }: { onBackToHome?: () => void }) {
  // Auth state (Guarded by CONNECTIONADMIN_PASSWORD in .env)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('connectionadmin_token');
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'db' | 'localdb' | 'actionserver' | 'logs' | 'query' | 'apicall' | 'sync' | 'firebase' | 'explorer'>('sync');

  // Overall status data
  const [status, setStatus] = useState<ConnectionAdminStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Database Synchronization State
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncTriggering, setSyncTriggering] = useState(false);
  const [syncingTable, setSyncingTable] = useState<string | null>(null);
  const [syncFilter, setSyncFilter] = useState<'all' | 'mismatched' | 'synced'>('all');
  const [syncSearch, setSyncSearch] = useState('');
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoRefreshSync, setAutoRefreshSync] = useState(true);

  // Check All Systems Diagnostic State
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState<'idle' | 'db' | 'actionserver' | 'smtp' | 'completed'>('idle');
  const [diagnosticResults, setDiagnosticResults] = useState<CheckAllSystemsResult | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<Date | null>(null);

  // DB Sub-Tab: Primary Supabase vs Local PostgreSQL
  const [dbSubTab, setDbSubTab] = useState<'primary' | 'local'>('primary');

  // DB Config Form (Primary)
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('');
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [dbUpdating, setDbUpdating] = useState(false);
  const [dbUpdateMsg, setDbUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local PostgreSQL DB Config & Test State
  const [localDbHost, setLocalDbHost] = useState('127.0.0.1');
  const [localDbPort, setLocalDbPort] = useState('5432');
  const [localDbUser, setLocalDbUser] = useState('postgres');
  const [localDbPassword, setLocalDbPassword] = useState('');
  const [localDbName, setLocalDbName] = useState('Errandly');
  const [showLocalDbPassword, setShowLocalDbPassword] = useState(false);
  const [localDbUpdating, setLocalDbUpdating] = useState(false);
  const [localDbTesting, setLocalDbTesting] = useState(false);
  const [localDbUpdateMsg, setLocalDbUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [localDbTestResult, setLocalDbTestResult] = useState<{
    connected: boolean;
    latencyMs?: number | null;
    version?: string;
    serverTime?: string;
    tables?: string[];
    tableCount?: number;
    error?: string;
    config?: {
      host: string;
      port: number;
      user: string;
      database: string;
      hasPassword: boolean;
    };
  } | null>(null);

  // Query console target (auto, primary, local)
  const [queryTarget, setQueryTarget] = useState<'auto' | 'primary' | 'local'>('auto');

  // Action Server Config Form
  const [actionServerUrlInput, setActionServerUrlInput] = useState('');
  const [actionServerUpdating, setActionServerUpdating] = useState(false);
  const [actionServerPingMsg, setActionServerPingMsg] = useState<{ type: 'success' | 'error'; text: string; data?: any } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Query Console state
  const [sqlQuery, setSqlQuery] = useState('SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\' ORDER BY table_name;');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    success: boolean;
    rows?: any[];
    rowCount?: number;
    fields?: string[];
    executionTimeMs?: number;
    error?: string;
  } | null>(null);
  const [queryViewMode, setQueryViewMode] = useState<'table' | 'json'>('table');

  // Action Server / API Caller state
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [apiEndpoint, setApiEndpoint] = useState('/api/health');
  const [apiHeaders, setApiHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [apiBody, setApiBody] = useState('{\n  "test": true\n}');
  const [apiCallerLoading, setApiCallerLoading] = useState(false);
  const [apiCallResult, setApiCallResult] = useState<{
    status?: number;
    statusText?: string;
    executionTimeMs?: number;
    headers?: Record<string, string>;
    data?: any;
    error?: string;
  } | null>(null);

  // Copied indicator state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Firebase Auth & User Data Backup State (ONLY User Data)
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [firebaseTestingAuth, setFirebaseTestingAuth] = useState(false);
  const [firebaseAuthTestResult, setFirebaseAuthTestResult] = useState<any>(null);
  const [firebaseTogglingAuth, setFirebaseTogglingAuth] = useState(false);
  const [firebaseBackingUpUsers, setFirebaseBackingUpUsers] = useState(false);
  const [firebaseRestoringUsers, setFirebaseRestoringUsers] = useState(false);
  const [firebaseBackupUsersList, setFirebaseBackupUsersList] = useState<any[]>([]);
  const [firebaseBackupUsersLoading, setFirebaseBackupUsersLoading] = useState(false);
  const [firebaseBackupSearch, setFirebaseBackupSearch] = useState('');
  const [firebaseBackupPage, setFirebaseBackupPage] = useState(1);
  const [firebaseBackupTotalPages, setFirebaseBackupTotalPages] = useState(1);
  const [firebaseBackupTotalCount, setFirebaseBackupTotalCount] = useState(0);
  const [firebaseActionMsg, setFirebaseActionMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedUserDoc, setSelectedUserDoc] = useState<any | null>(null);

  // Firebase Infrastructure & Real-Time Settings Table State
  const [firebaseInfra, setFirebaseInfra] = useState<any>(null);
  const [firebaseInfraFields, setFirebaseInfraFields] = useState<any[]>([]);
  const [firebaseInfraLoading, setFirebaseInfraLoading] = useState(false);
  const [firebaseInfraSaving, setFirebaseInfraSaving] = useState(false);
  const [firebaseInfraQuickFilling, setFirebaseInfraQuickFilling] = useState(false);
  const [firebaseRealtimeConnected, setFirebaseRealtimeConnected] = useState(false);
  const [firebaseRealtimeEvents, setFirebaseRealtimeEvents] = useState<any[]>([]);
  const [firebaseInfraFilterCategory, setFirebaseInfraFilterCategory] = useState<string>('all');
  const [firebaseInfraSearch, setFirebaseInfraSearch] = useState<string>('');
  const [showSecretKeys, setShowSecretKeys] = useState<Record<string, boolean>>({});
  const [infraDirtyFields, setInfraDirtyFields] = useState<Record<string, any>>({});
  const [firebaseSubTab, setFirebaseSubTab] = useState<'infrastructure' | 'backup_vault'>('infrastructure');
  const [singleFieldSavingKey, setSingleFieldSavingKey] = useState<string | null>(null);
  const [liveTestRunning, setLiveTestRunning] = useState(false);
  const [liveTestLatency, setLiveTestLatency] = useState<number | null>(null);

  // Multi-DB Tables & Data Explorer State (Local, Postgres, Supabase, Firebase)
  const [explorerTablesData, setExplorerTablesData] = useState<any>(null);
  const [explorerTablesLoading, setExplorerTablesLoading] = useState(false);
  const [explorerSource, setExplorerSource] = useState<'supabase' | 'local_json' | 'local_pg' | 'firebase'>('supabase');
  const [explorerTable, setExplorerTable] = useState<string>('profiles');
  const [explorerRows, setExplorerRows] = useState<any[]>([]);
  const [explorerFields, setExplorerFields] = useState<string[]>([]);
  const [explorerTotalCount, setExplorerTotalCount] = useState<number>(0);
  const [explorerPage, setExplorerPage] = useState<number>(1);
  const [explorerPageSize, setExplorerPageSize] = useState<number>(25);
  const [explorerTotalPages, setExplorerTotalPages] = useState<number>(1);
  const [explorerSearch, setExplorerSearch] = useState<string>('');
  const [explorerLoadingData, setExplorerLoadingData] = useState<boolean>(false);
  const [explorerExecutionTime, setExplorerExecutionTime] = useState<number | null>(null);
  const [explorerViewMode, setExplorerViewMode] = useState<'table' | 'json'>('table');
  const [selectedRowDoc, setSelectedRowDoc] = useState<any | null>(null);

  // Multi-DB Table Data & Local Strings Purge / Deletion State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteTargetDb, setDeleteTargetDb] = useState<'all' | 'supabase' | 'local_pg' | 'local_json' | 'firestore' | 'local_strings'>('all');
  const [deleteSelectedTables, setDeleteSelectedTables] = useState<string[]>([]);
  const [deleteDryRun, setDeleteDryRun] = useState<boolean>(true);
  const [deleteKeepAdmin, setDeleteKeepAdmin] = useState<boolean>(true);
  const [deleteClearLocalStorage, setDeleteClearLocalStorage] = useState<boolean>(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleteExecuting, setDeleteExecuting] = useState<boolean>(false);
  const [deleteResults, setDeleteResults] = useState<any | null>(null);

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Fallback for non-JSON or HTML responses
        data = { error: text ? (text.length > 300 ? text.substring(0, 300) + '...' : text) : `HTTP ${res.status} ${res.statusText}` };
      }
      return { ok: res.ok, status: res.status, data };
    } catch (netErr: any) {
      return { ok: false, status: 0, data: { error: netErr.message || 'Network error communicating with server' } };
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('connectionadmin_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter the Connection Admin password.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { ok, status: statusCode, data } = await safeFetchJson('/api/connectionadmin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      if (ok && data.success && data.token) {
        sessionStorage.setItem('connectionadmin_token', data.token);
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(data.error || `Authentication failed (HTTP ${statusCode})`);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error during login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('connectionadmin_token');
    setIsAuthenticated(false);
    setStatus(null);
  };

  // Fetch complete status
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const { ok, status: statusCode, data } = await safeFetchJson('/api/connectionadmin/status', {
        headers: getAuthHeaders()
      });
      if (!ok) {
        setStatusError(data.error || `Failed to fetch status (HTTP ${statusCode})`);
        return;
      }
      const statusData = data as ConnectionAdminStatus;
      setStatus(statusData);
      setLastRefreshed(new Date());

      // Pre-fill edit forms
      if (statusData.database?.config) {
        setDbHost(statusData.database.config.host || '');
        setDbPort(String(statusData.database.config.port || '5432'));
        setDbUser(statusData.database.config.user || '');
        setDbName(statusData.database.config.database || '');
      }
      if (statusData.database?.fallbackConfig) {
        setLocalDbHost(statusData.database.fallbackConfig.host || '127.0.0.1');
        setLocalDbPort(String(statusData.database.fallbackConfig.port || '5432'));
        setLocalDbUser(statusData.database.fallbackConfig.user || 'postgres');
        setLocalDbName(statusData.database.fallbackConfig.database || 'Errandly');
      }
      if (statusData.actionServer?.url) {
        setActionServerUrlInput(statusData.actionServer.url);
      }
    } catch (err: any) {
      setStatusError(err.message || 'Failed to fetch status');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // DB Sync Status Fetcher & Auto-Reconcile Handlers
  const fetchSyncStatus = useCallback(async (autoHeal = true) => {
    setSyncLoading(true);
    try {
      const { ok, data } = await safeFetchJson(`/api/connectionadmin/sync/status?autoHeal=${autoHeal}`, {
        headers: getAuthHeaders()
      });
      if (ok && data) {
        setSyncStatus(data as SyncStatusResponse);
      }
    } catch (err: any) {
      console.warn("Failed to fetch sync status:", err);
    } finally {
      setSyncLoading(false);
    }
  }, []);

  const handleTriggerFullSync = async () => {
    setSyncTriggering(true);
    setSyncMsg(null);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/sync/trigger', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      });
      if (ok && data) {
        setSyncStatus(data as SyncStatusResponse);
        setSyncMsg({
          type: 'success',
          text: `Full bi-directional synchronization complete: ${data.recordsReconciled} records reconciled across ${data.tables?.length || 0} tables.`
        });
      } else {
        setSyncMsg({ type: 'error', text: data.error || 'Failed to trigger synchronization.' });
      }
    } catch (err: any) {
      setSyncMsg({ type: 'error', text: err.message || 'Error triggering sync.' });
    } finally {
      setSyncTriggering(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  const handleSyncSingleTable = async (tableName: string) => {
    setSyncingTable(tableName);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/sync/table', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ table: tableName })
      });
      if (ok && data) {
        setSyncStatus(data as SyncStatusResponse);
      }
    } catch (err) {
      console.warn("Failed to sync single table:", err);
    } finally {
      setSyncingTable(null);
    }
  };

  const handleClearSyncAuditLogs = async () => {
    try {
      await safeFetchJson('/api/connectionadmin/sync/logs/clear', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (syncStatus) {
        setSyncStatus({ ...syncStatus, auditLogs: [] });
      }
    } catch (err) {
      console.warn("Failed to clear sync logs:", err);
    }
  };

  // Sequence Diagnostic: Check All Systems (DB, Action Server, SMTP Gateway)
  const handleCheckAllSystems = useCallback(async () => {
    setDiagnosticLoading(true);
    setDiagnosticError(null);
    setDiagnosticStep('db');

    try {
      // Small visual stagger so the sequence animation displays clearly
      await new Promise(r => setTimeout(r, 200));
      setDiagnosticStep('actionserver');
      await new Promise(r => setTimeout(r, 200));
      setDiagnosticStep('smtp');

      const { ok, data } = await safeFetchJson('/api/connectionadmin/check-all', {
        headers: getAuthHeaders()
      });

      if (ok && data.success) {
        setDiagnosticResults(data as CheckAllSystemsResult);
        setLastCheckTimestamp(new Date());
        setDiagnosticStep('completed');
        fetchStatus();
      } else {
        setDiagnosticError(data.error || 'Failed to complete full system diagnostic sequence.');
        setDiagnosticStep('idle');
      }
    } catch (err: any) {
      setDiagnosticError(err.message || 'Network error executing check sequence');
      setDiagnosticStep('idle');
    } finally {
      setDiagnosticLoading(false);
    }
  }, [fetchStatus]);

  // Initial diagnostics load
  useEffect(() => {
    handleCheckAllSystems();
  }, [handleCheckAllSystems]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/logs', {
        headers: getAuthHeaders()
      });
      if (ok && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Save DB Config Live (Primary Supabase)
  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbUpdating(true);
    setDbUpdateMsg(null);

    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/db/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          host: dbHost,
          port: parseInt(dbPort) || 5432,
          user: dbUser,
          password: dbPassword,
          database: dbName
        })
      });
      if (ok && data.success) {
        setDbUpdateMsg({
          type: 'success',
          text: `Configuration saved live to app_config.json & pool re-connected successfully! (${data.latencyMs}ms latency, ${data.tables?.length || 0} tables discovered)`
        });
        setDbPassword('');
        fetchStatus();
      } else {
        setDbUpdateMsg({
          type: 'error',
          text: `Saved to app_config.json, but connection test failed: ${data.error || 'Connection refused'}`
        });
        fetchStatus();
      }
    } catch (err: any) {
      setDbUpdateMsg({ type: 'error', text: err.message || 'Failed to update database config' });
    } finally {
      setDbUpdating(false);
    }
  };

  // Check & Test Local PostgreSQL DB Connection (Dry Run)
  const handleTestLocalDb = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalDbTesting(true);
    setLocalDbUpdateMsg(null);
    setLocalDbTestResult(null);

    try {
      const { ok, status: statusCode, data } = await safeFetchJson('/api/connectionadmin/local-db/check', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          host: localDbHost.trim(),
          port: parseInt(localDbPort) || 5432,
          user: localDbUser.trim(),
          password: localDbPassword,
          database: localDbName.trim()
        })
      });

      if (!ok) {
        setLocalDbTestResult({
          connected: false,
          error: data?.error || `HTTP ${statusCode}`
        });
        setLocalDbUpdateMsg({
          type: 'error',
          text: `Local connection check failed: ${data?.error || `HTTP ${statusCode}`}`
        });
        return;
      }

      setLocalDbTestResult(data);
      if (data.connected) {
        setLocalDbUpdateMsg({
          type: 'success',
          text: `Local PostgreSQL connection succeeded! Latency: ${data.latencyMs}ms. Found ${data.tableCount ?? 0} public tables.`
        });
      } else {
        setLocalDbUpdateMsg({
          type: 'error',
          text: `Local PostgreSQL is unreachable: ${data.error || 'Connection refused'}`
        });
      }
    } catch (err: any) {
      setLocalDbTestResult({
        connected: false,
        error: err.message
      });
      setLocalDbUpdateMsg({
        type: 'error',
        text: `Error initiating connection check: ${err.message}`
      });
    } finally {
      setLocalDbTesting(false);
    }
  };

  // Save Local PostgreSQL DB Configuration
  const handleSaveLocalDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalDbUpdating(true);
    setLocalDbUpdateMsg(null);

    try {
      const { ok, status: statusCode, data } = await safeFetchJson('/api/connectionadmin/local-db/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          host: localDbHost.trim(),
          port: parseInt(localDbPort) || 5432,
          user: localDbUser.trim(),
          password: localDbPassword,
          database: localDbName.trim()
        })
      });

      if (!ok) {
        setLocalDbUpdateMsg({
          type: 'error',
          text: data?.error || `Failed to update local DB config (HTTP ${statusCode})`
        });
        return;
      }

      if (data.connected) {
        setLocalDbUpdateMsg({
          type: 'success',
          text: `Local PostgreSQL connected & saved successfully! Latency: ${data.latencyMs}ms. Table count: ${data.tableCount}. Written to app_config.json.`
        });
      } else {
        setLocalDbUpdateMsg({
          type: 'error',
          text: `Configuration saved to app_config.json, but local PostgreSQL is currently standby/offline: ${data.error || 'Connection refused'}`
        });
      }

      if (localDbPassword) {
        setLocalDbPassword('');
      }

      await fetchStatus();
      await fetchLogs();
    } catch (err: any) {
      setLocalDbUpdateMsg({
        type: 'error',
        text: err.message || 'Failed to update local DB config'
      });
    } finally {
      setLocalDbUpdating(false);
    }
  };

  // Save Action Server Live
  const handleSaveActionServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionServerUpdating(true);
    setActionServerPingMsg(null);

    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/action-server/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actionServerUrl: actionServerUrlInput })
      });
      if (ok && data.success) {
        setActionServerPingMsg({
          type: data.pingResult?.online ? 'success' : 'error',
          text: data.pingResult?.online 
            ? `Action Server URL updated in app_config.json! Ping successful (${data.pingResult.latencyMs}ms latency, HTTP ${data.pingResult.statusCode})`
            : `Action Server URL updated in app_config.json, but target is unreachable: ${data.pingResult?.error || 'HTTP ' + data.pingResult?.statusCode}`,
          data: data.pingResult?.responsePreview
        });
        fetchStatus();
      } else {
        setActionServerPingMsg({ type: 'error', text: data.error || 'Failed to update action server' });
      }
    } catch (err: any) {
      setActionServerPingMsg({ type: 'error', text: err.message || 'Failed to update action server' });
    } finally {
      setActionServerUpdating(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear the captured diagnostic logs?')) return;
    try {
      await safeFetchJson('/api/connectionadmin/logs/clear', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Execute Custom SQL Query
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const { data } = await safeFetchJson('/api/connectionadmin/db/execute-query', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sql: sqlQuery, target: queryTarget })
      });
      setQueryResult(data);
    } catch (err: any) {
      setQueryResult({ success: false, error: err.message || 'Query execution network error' });
    } finally {
      setQueryLoading(false);
    }
  };

  // Execute Action Server / API Call
  const handleExecuteApiCall = async () => {
    if (!apiEndpoint.trim()) return;
    setApiCallerLoading(true);
    setApiCallResult(null);

    let parsedHeaders = {};
    let parsedBody = undefined;

    if (apiHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(apiHeaders);
      } catch (e: any) {
        setApiCallResult({ error: 'Invalid Request Headers JSON: ' + e.message });
        setApiCallerLoading(false);
        return;
      }
    }

    if (apiMethod !== 'GET' && apiBody.trim()) {
      try {
        parsedBody = JSON.parse(apiBody);
      } catch (e: any) {
        setApiCallResult({ error: 'Invalid Request Body JSON: ' + e.message });
        setApiCallerLoading(false);
        return;
      }
    }

    try {
      const { data } = await safeFetchJson('/api/connectionadmin/action-server/execute-call', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          method: apiMethod,
          path: apiEndpoint,
          headers: parsedHeaders,
          body: parsedBody
        })
      });
      setApiCallResult(data);
    } catch (err: any) {
      setApiCallResult({ error: err.message || 'API call execution failed' });
    } finally {
      setApiCallerLoading(false);
    }
  };

  // Firebase Auth & User Data Backup Helpers (STRICT SCOPE: ONLY User Data)
  const fetchFirebaseAdminStatus = useCallback(async () => {
    setFirebaseLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/status', {
        headers: getAuthHeaders()
      });
      if (ok && data.success) {
        setFirebaseStatus(data);
      }
    } catch (e: any) {
      console.warn("Failed to fetch Firebase admin status:", e);
    } finally {
      setFirebaseLoading(false);
    }
  }, []);

  const toggleFirebaseAuth = async (alternateAuthEnabled?: boolean, autoMirrorUsersEnabled?: boolean) => {
    setFirebaseTogglingAuth(true);
    setFirebaseActionMsg(null);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/auth/toggle', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ alternateAuthEnabled, autoMirrorUsersEnabled })
      });
      if (ok && data.success) {
        setFirebaseActionMsg({ type: 'success', text: 'Firebase alternate auth settings successfully updated.' });
        fetchFirebaseAdminStatus();
      } else {
        setFirebaseActionMsg({ type: 'error', text: data.error || 'Failed to update Firebase settings.' });
      }
    } catch (e: any) {
      setFirebaseActionMsg({ type: 'error', text: e.message });
    } finally {
      setFirebaseTogglingAuth(false);
    }
  };

  const testFirebaseAuth = async () => {
    setFirebaseTestingAuth(true);
    setFirebaseAuthTestResult(null);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/auth/test', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      setFirebaseAuthTestResult(data);
    } catch (e: any) {
      setFirebaseAuthTestResult({ success: false, error: e.message });
    } finally {
      setFirebaseTestingAuth(false);
    }
  };

  const backupUsersToFirebase = async () => {
    setFirebaseBackingUpUsers(true);
    setFirebaseActionMsg(null);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/backup-users', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (ok && data.success) {
        setFirebaseActionMsg({ 
          type: 'success', 
          text: `Backed up ${data.backedUpCount} user account(s) to isolated Firebase users storage (${data.executionTimeMs}ms).` 
        });
        fetchFirebaseAdminStatus();
        fetchFirebaseBackupUsers(1, firebaseBackupSearch);
      } else {
        setFirebaseActionMsg({ type: 'error', text: data.error || 'Failed to backup user accounts to Firebase.' });
      }
    } catch (e: any) {
      setFirebaseActionMsg({ type: 'error', text: e.message });
    } finally {
      setFirebaseBackingUpUsers(false);
    }
  };

  const restoreUsersFromFirebase = async () => {
    if (!window.confirm("Restore user profiles from Firebase backup into the primary/local database? Existing user fields will be updated.")) return;
    setFirebaseRestoringUsers(true);
    setFirebaseActionMsg(null);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/restore-users', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (ok && data.success) {
        setFirebaseActionMsg({
          type: 'success',
          text: `Restored ${data.restoredCount} user account(s) from Firebase backup into primary/local storage.`
        });
        fetchFirebaseAdminStatus();
        fetchFirebaseBackupUsers(1, firebaseBackupSearch);
      } else {
        setFirebaseActionMsg({ type: 'error', text: data.error || 'Failed to restore user accounts from Firebase.' });
      }
    } catch (e: any) {
      setFirebaseActionMsg({ type: 'error', text: e.message });
    } finally {
      setFirebaseRestoringUsers(false);
    }
  };

  const fetchFirebaseBackupUsers = useCallback(async (page: number = 1, search: string = '') => {
    setFirebaseBackupUsersLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        search: search.trim()
      });
      const { ok, data } = await safeFetchJson(`/api/connectionadmin/firebase/users-backup?${query.toString()}`, {
        headers: getAuthHeaders()
      });
      if (ok && data.success) {
        setFirebaseBackupUsersList(data.users || []);
        setFirebaseBackupPage(data.page || 1);
        setFirebaseBackupTotalPages(data.totalPages || 1);
        setFirebaseBackupTotalCount(data.totalCount || 0);
      }
    } catch (e: any) {
      console.warn("Failed to fetch Firebase backup users:", e);
    } finally {
      setFirebaseBackupUsersLoading(false);
    }
  }, []);

  // Firebase Infrastructure & Real-Time Settings Handlers
  const fetchFirebaseInfrastructure = useCallback(async () => {
    setFirebaseInfraLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/infrastructure', {
        headers: getAuthHeaders()
      });
      if (ok && data?.success) {
        setFirebaseInfra(data.infrastructure || null);
        setFirebaseInfraFields(data.fieldsMeta || []);
        setInfraDirtyFields({});
      }
    } catch (err: any) {
      console.warn("Failed to fetch Firebase infrastructure:", err);
    } finally {
      setFirebaseInfraLoading(false);
    }
  }, []);

  const updateFirebaseInfrastructure = async (fieldUpdates?: Record<string, any>, specificKey?: string) => {
    const payload = fieldUpdates || infraDirtyFields;
    if (Object.keys(payload).length === 0) {
      setFirebaseActionMsg({ type: 'info', text: "No configuration changes detected to save." });
      return;
    }
    if (specificKey) {
      setSingleFieldSavingKey(specificKey);
    } else {
      setFirebaseInfraSaving(true);
    }
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/infrastructure/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (ok && data?.success) {
        setFirebaseInfra(data.infrastructure);
        if (specificKey) {
          setInfraDirtyFields(prev => {
            const next = { ...prev };
            delete next[specificKey];
            return next;
          });
        } else {
          setInfraDirtyFields({});
        }
        setFirebaseActionMsg({ type: 'success', text: data.message || "Infrastructure settings updated in real time!" });
        fetchFirebaseAdminStatus();
      } else {
        setFirebaseActionMsg({ type: 'error', text: data?.error || "Failed to update infrastructure settings." });
      }
    } catch (err: any) {
      setFirebaseActionMsg({ type: 'error', text: err.message || "Network error updating infrastructure." });
    } finally {
      setFirebaseInfraSaving(false);
      setSingleFieldSavingKey(null);
    }
  };

  const quickFillFirebaseInfrastructure = async () => {
    setFirebaseInfraQuickFilling(true);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/infrastructure/quick-fill', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (ok && data?.success && data.detected) {
        setFirebaseInfra((prev: any) => ({ ...prev, ...data.detected }));
        setInfraDirtyFields(data.detected);
        setFirebaseActionMsg({ type: 'info', text: "Detected cloud infrastructure values loaded into table. Review or click 'Save in Real Time'." });
      }
    } catch (err: any) {
      setFirebaseActionMsg({ type: 'error', text: err.message || "Failed to quick-fill cloud infrastructure." });
    } finally {
      setFirebaseInfraQuickFilling(false);
    }
  };

  const testFirebaseInfrastructureLive = async () => {
    setLiveTestRunning(true);
    setLiveTestLatency(null);
    const t0 = performance.now();
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/firebase/auth/test', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const dur = Math.round(performance.now() - t0);
      setLiveTestLatency(dur);
      if (ok && data?.success) {
        setFirebaseActionMsg({ type: 'success', text: `Firebase ping successful (${dur}ms). ${data.message || ''}` });
      } else {
        setFirebaseActionMsg({ type: 'error', text: `Firebase ping issue (${dur}ms): ${data?.error || 'Unavailable'}` });
      }
    } catch (err: any) {
      setFirebaseActionMsg({ type: 'error', text: `Ping failed: ${err.message}` });
    } finally {
      setLiveTestRunning(false);
    }
  };

  // SSE Stream Listener for Real-Time Firebase Infrastructure Settings
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'firebase') return;
    fetchFirebaseInfrastructure();

    const token = sessionStorage.getItem('connectionadmin_token') || '';
    if (!token) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/connectionadmin/firebase/realtime-stream?token=${encodeURIComponent(token)}`);

      eventSource.addEventListener('INIT', (e: MessageEvent) => {
        setFirebaseRealtimeConnected(true);
        try {
          const payload = JSON.parse(e.data);
          setFirebaseRealtimeEvents(prev => [{
            type: 'CONNECTED',
            timestamp: payload.timestamp || new Date().toISOString(),
            text: `Connected to Real-time Stream (Active DB: ${payload.activeFirestoreDb || '(default)'})`
          }, ...prev.slice(0, 19)]);
        } catch (err) {
          console.debug("Error parsing SSE init payload", err);
        }
      });

      eventSource.addEventListener('HEARTBEAT', () => {
        setFirebaseRealtimeConnected(true);
      });

      eventSource.addEventListener('INFRASTRUCTURE_SETTINGS_UPDATED', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.infrastructure) {
            setFirebaseInfra(payload.infrastructure);
            setInfraDirtyFields({});
          }
          setFirebaseRealtimeEvents(prev => [{
            type: 'UPDATED',
            timestamp: payload.timestamp || new Date().toISOString(),
            text: `Real-time settings synchronized across cluster`
          }, ...prev.slice(0, 19)]);
        } catch (err) {
          console.debug("Error parsing SSE update payload", err);
        }
      });

      eventSource.onerror = () => {
        setFirebaseRealtimeConnected(false);
      };
    } catch (err) {
      console.warn("Real-time SSE connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, activeTab, fetchFirebaseInfrastructure]);

  // Multi-DB Tables & Data Explorer Helpers (Local, Postgres, Supabase, Firebase)
  const fetchExplorerTables = useCallback(async () => {
    setExplorerTablesLoading(true);
    try {
      const { ok, data } = await safeFetchJson('/api/connectionadmin/explorer/tables', {
        headers: getAuthHeaders()
      });
      if (ok && data.success) {
        setExplorerTablesData(data);
      }
    } catch (e: any) {
      console.warn("Failed to fetch explorer tables:", e);
    } finally {
      setExplorerTablesLoading(false);
    }
  }, []);

  const fetchExplorerData = useCallback(async (
    source: string = explorerSource,
    table: string = explorerTable,
    page: number = explorerPage,
    pageSize: number = explorerPageSize,
    search: string = explorerSearch
  ) => {
    setExplorerLoadingData(true);
    try {
      const query = new URLSearchParams({
        source,
        table,
        page: String(page),
        pageSize: String(pageSize),
        search: search.trim()
      });
      const { ok, data } = await safeFetchJson(`/api/connectionadmin/explorer/data?${query.toString()}`, {
        headers: getAuthHeaders()
      });
      if (ok && data.success) {
        setExplorerRows(data.rows || []);
        setExplorerFields(data.fields || []);
        setExplorerTotalCount(data.totalCount || 0);
        setExplorerPage(data.page || 1);
        setExplorerPageSize(data.pageSize || 25);
        setExplorerTotalPages(data.totalPages || 1);
        setExplorerExecutionTime(data.executionTimeMs || null);
      } else {
        setExplorerRows([]);
        setExplorerFields([]);
        setExplorerTotalCount(0);
        setExplorerExecutionTime(data.executionTimeMs || null);
      }
    } catch (e: any) {
      console.warn("Failed to fetch explorer data:", e);
    } finally {
      setExplorerLoadingData(false);
    }
  }, [explorerSource, explorerTable, explorerPage, explorerPageSize, explorerSearch]);

  const handleExecuteDeleteTableData = async () => {
    if (!deleteDryRun && deleteConfirmText !== 'DELETE') {
      alert('Please type "DELETE" into the confirmation box to confirm live data purging.');
      return;
    }

    setDeleteExecuting(true);
    setDeleteResults(null);

    try {
      // 1. If user selected to clear client local storage
      if (deleteClearLocalStorage && (deleteTargetDb === 'all' || deleteTargetDb === 'local_strings')) {
        const keysToClear = ['errand_drafts', 'custom_action_server_url', 'custom_gateway_url'];
        keysToClear.forEach(k => {
          try { 
            localStorage.removeItem(k); 
          } catch (e: any) {
            console.warn(`Could not clear localStorage item ${k}:`, e?.message);
          }
        });
      }

      const { ok, data } = await safeFetchJson('/api/connectionadmin/database/delete-table-data', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          db: deleteTargetDb,
          tables: deleteSelectedTables.length > 0 ? deleteSelectedTables : null,
          dryRun: deleteDryRun,
          keepAdmin: deleteKeepAdmin
        })
      });

      if (ok && data.success) {
        setDeleteResults(data);
        if (!deleteDryRun) {
          fetchExplorerTables();
          fetchExplorerData(explorerSource, explorerTable, 1, explorerPageSize, explorerSearch);
        }
      } else {
        setDeleteResults({
          success: false,
          error: data.error || 'Failed to execute table data deletion'
        });
      }
    } catch (e: any) {
      setDeleteResults({
        success: false,
        error: e.message || 'Execution error'
      });
    } finally {
      setDeleteExecuting(false);
    }
  };

  // Tab switch listener for Firebase and Explorer
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'firebase') {
      fetchFirebaseAdminStatus();
      fetchFirebaseBackupUsers(1, firebaseBackupSearch);
    } else if (activeTab === 'explorer') {
      fetchExplorerTables();
      fetchExplorerData(explorerSource, explorerTable, 1, explorerPageSize, explorerSearch);
    }
  }, [activeTab, isAuthenticated, fetchFirebaseAdminStatus, fetchFirebaseBackupUsers, fetchExplorerTables, fetchExplorerData, explorerSource, explorerTable, explorerPageSize, explorerSearch, firebaseBackupSearch]);

  // Auto-fetch on mount & authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      fetchLogs();
      fetchSyncStatus(true);
    }
  }, [isAuthenticated, fetchStatus, fetchLogs, fetchSyncStatus]);

  // Periodic DB Sync Status Streamer
  useEffect(() => {
    if (!isAuthenticated || !autoRefreshSync) return;
    const interval = setInterval(() => {
      fetchSyncStatus(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefreshSync, fetchSyncStatus]);

  // Periodic log streamer
  useEffect(() => {
    if (!autoRefreshLogs) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefreshLogs, fetchLogs]);

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    if (logLevelFilter !== 'all' && log.level !== logLevelFilter) return false;
    if (logSearch.trim()) {
      const search = logSearch.toLowerCase();
      return log.message.toLowerCase().includes(search) || log.timestamp.includes(search);
    }
    return true;
  });

  // Main Console View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400 mb-2">
              <Key className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">/connectionadmin</h1>
            <p className="text-xs text-slate-400">
              Enter the master Connection Admin password configured in your environment to access infrastructure settings.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="connectionadmin-password-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Admin Password
                </label>
                {passwordInput && (
                  <button
                    type="button"
                    id="connectionadmin-toggle-password-top"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-[11px] text-slate-400 hover:text-indigo-400 transition flex items-center gap-1"
                  >
                    {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showLoginPassword ? 'Hide' : 'View'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="connectionadmin-password-input"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-4 pr-11 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 outline-none focus:border-indigo-500 transition font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  id="connectionadmin-toggle-password-btn"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  title={showLoginPassword ? 'Hide password' : 'View password'}
                  aria-label={showLoginPassword ? 'Hide password' : 'View password'}
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {authLoading ? 'Verifying...' : 'Unlock Control Room'}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 mx-auto transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">/connectionadmin</h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-950 border border-indigo-700/60 text-indigo-300 rounded-full">
                  Live Control Room
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Database, Gateway Action Server & Diagnostics Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Live DB Badge */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              status?.database?.connected 
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300' 
                : 'bg-red-950/60 border-red-800/60 text-red-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${status?.database?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              DB: {status?.database?.connected ? `Online (${status.database.latencyMs ?? 0}ms)` : 'Offline'}
            </div>

            {/* Live Gateway Badge */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              status?.actionServer?.online 
                ? 'bg-sky-950/60 border-sky-800/60 text-sky-300' 
                : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${status?.actionServer?.online ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'}`} />
              Gateway: {status?.actionServer?.online ? `HTTP ${status.actionServer.statusCode} (${status.actionServer.latencyMs ?? 0}ms)` : 'Unreachable'}
            </div>

            {/* Live Sync Status Badge */}
            <div 
              onClick={() => { setActiveTab('sync'); fetchSyncStatus(true); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer hover:opacity-90 transition ${
                syncStatus?.synced 
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300' 
                  : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300'
              }`}
              title="Click to view database sync status and auto-reconciliation matrix"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''} text-emerald-400`} />
              Sync: {syncStatus?.synced ? '100% Synced' : `${syncStatus?.recordsReconciled ?? 0} Reconciled`}
            </div>

            <button
              onClick={() => { fetchStatus(); fetchLogs(); }}
              disabled={loadingStatus}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              title="Lock and Log Out"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock
            </button>

            <button
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to App
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Controls */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setActiveTab('db');
              setDbSubTab('primary');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'db' && dbSubTab === 'primary'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            1. Primary DB (Cloud)
          </button>

          <button
            onClick={() => {
              setActiveTab('localdb');
              setDbSubTab('local');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'localdb' || (activeTab === 'db' && dbSubTab === 'local')
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-amber-400" />
            2. Local PostgreSQL DB
            <span className={`w-2 h-2 rounded-full ${status?.database?.fallbackConfig?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>

          <button
            onClick={() => setActiveTab('actionserver')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'actionserver'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            3. Action Server & DB Test
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            4. Live Detailed Logs ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'query'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            5. Live DB Query Console
          </button>

          <button
            onClick={() => setActiveTab('apicall')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'apicall'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            6. Action Server / API Caller
          </button>

          <button
            onClick={() => {
              setActiveTab('sync');
              fetchSyncStatus(true);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'sync'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${syncLoading ? 'animate-spin' : ''}`} />
            7. DB Sync & Auto-Reconcile
            {syncStatus && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                syncStatus.synced 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' 
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
              }`}>
                {syncStatus.synced ? '100% Synced' : `${syncStatus.recordsReconciled} Reconciled`}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('firebase');
              fetchFirebaseAdminStatus();
              fetchFirebaseBackupUsers(1, firebaseBackupSearch);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'firebase'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            8. Firebase Auth & Backup Users
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950 text-amber-300 border border-amber-800/80">
              User Data Only
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('explorer');
              fetchExplorerTables();
              fetchExplorerData(explorerSource, explorerTable, 1, explorerPageSize, explorerSearch);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'explorer'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            9. Tables & Data Explorer
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/80">
              4 DBs
            </span>
          </button>
        </div>

        {/* TAB 1 & 2: DATABASE & LIVE CONFIG / LOCAL POSTGRESQL DB */}
        {(activeTab === 'db' || activeTab === 'localdb') && (
          <div className="space-y-6">
            {/* Database Switcher Subtabs */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setDbSubTab('primary')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                    dbSubTab === 'primary'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                  Primary Database (Supabase)
                  <span className={`w-2 h-2 rounded-full ${status?.database?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setDbSubTab('local')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                    dbSubTab === 'local'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Server className="w-4 h-4 text-amber-300" />
                  Local PostgreSQL DB (Fallback)
                  <span className={`w-2 h-2 rounded-full ${status?.database?.fallbackConfig?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                </button>
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>Active Tier:</span>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                  status?.database?.activeSource === 'primary_postgres'
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                    : status?.database?.activeSource === 'local_postgres_fallback'
                    ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                    : 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                }`}>
                  {status?.database?.activeSource === 'primary_postgres'
                    ? 'Tier 1: Supabase (Primary)'
                    : status?.database?.activeSource === 'local_postgres_fallback'
                    ? 'Tier 2: Local PostgreSQL'
                    : 'Tier 3: Resilient JSON Store'}
                </span>
              </div>
            </div>

            {/* Sub-tab 1: Primary Database (Supabase) */}
            {dbSubTab === 'primary' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: DB Health & Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    Database Health & Connection
                  </h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                    status?.database?.connected 
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-300' 
                      : 'bg-red-950 border-red-700 text-red-300'
                  }`}>
                    {status?.database?.connected ? 'CONNECTED' : 'OFFLINE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Host</span>
                    <span className="font-mono text-slate-200 break-all font-bold">
                      {status?.database?.config?.host || 'Not configured'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Port</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.database?.config?.port || 5432}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Database</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.database?.config?.database || 'postgres'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">User</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.database?.config?.user || 'postgres'}
                    </span>
                  </div>
                </div>

                {status?.database?.error && (
                  <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-xs text-red-300 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-red-200">
                      <AlertTriangle className="w-4 h-4" /> Connection Error:
                    </span>
                    <p className="font-mono text-[11px] break-all">{status.database.error}</p>
                  </div>
                )}

                {/* Table Schema Count & Badges */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Discovered Tables ({status?.database?.tableCount ?? 0})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">public schema</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {status?.database?.tables && status.database.tables.length > 0 ? (
                      status.database.tables.map(tbl => (
                        <span 
                          key={tbl}
                          onClick={() => {
                            setSqlQuery(`SELECT * FROM ${tbl} LIMIT 10;`);
                            setActiveTab('query');
                          }}
                          title="Click to query table in Console"
                          className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white transition cursor-pointer text-[11px] font-mono text-slate-300 rounded-lg border border-slate-700"
                        >
                          {tbl}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No tables detected yet or connection offline.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Config File (app_config.json) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Live Config on Disk (app_config.json)
                  </h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(status?.appConfig?.raw, null, 2), 'config_json')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    {copiedKey === 'config_json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy JSON
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-[11px] font-mono text-indigo-300 max-h-44 overflow-y-auto">
                  {JSON.stringify(status?.appConfig?.raw || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Right: Update Database Credentials Live Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      <Save className="w-5 h-5 text-indigo-400" />
                      Update DB Connection & Write Live Config
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Instantly updates <code className="text-indigo-300 font-mono">app_config.json</code>, reloads the PostgreSQL pool in-memory, and verifies connection.
                    </p>
                  </div>
                </div>

                {dbUpdateMsg && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    dbUpdateMsg.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-red-950/60 border-red-800 text-red-200'
                  }`}>
                    {dbUpdateMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />}
                    <span>{dbUpdateMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveDbConfig} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Host (IP / Domain)</label>
                      <input
                        type="text"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        placeholder="e.g. db.hvvhdfucejsuileacvjo.supabase.co or 127.0.0.1"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Port</label>
                      <input
                        type="number"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        placeholder="5432"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Database User</label>
                      <input
                        type="text"
                        value={dbUser}
                        onChange={(e) => setDbUser(e.target.value)}
                        placeholder="e.g. postgres"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Database Name</label>
                      <input
                        type="text"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        placeholder="e.g. postgres or errandly"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">
                      Database Password {status?.database?.config?.hasPassword && <span className="text-emerald-400 font-normal">(Password is currently set)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showDbPassword ? 'text' : 'password'}
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        placeholder="Leave blank to preserve existing password or enter new password..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDbPassword(!showDbPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={dbUpdating}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {dbUpdating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Testing Connection & Writing app_config.json...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Live DB Connection to Config File
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Local PostgreSQL DB (Fallback) */}
        {dbSubTab === 'local' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Local DB Health & Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    Local PostgreSQL Health
                  </h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                    status?.database?.fallbackConfig?.connected 
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-300' 
                      : 'bg-amber-950/80 border-amber-700 text-amber-300'
                  }`}>
                    {status?.database?.fallbackConfig?.connected ? 'CONNECTED (READY)' : 'STANDBY / OFFLINE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Local Host</span>
                    <span className="font-mono text-slate-200 break-all font-bold">
                      {status?.database?.fallbackConfig?.host || localDbHost || '127.0.0.1'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Port</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.database?.fallbackConfig?.port || localDbPort || 5432}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Database</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.database?.fallbackConfig?.database || localDbName || 'Errandly'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">User</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.database?.fallbackConfig?.user || localDbUser || 'postgres'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Socket Latency</span>
                    <span className="font-mono text-white font-bold">
                      {status?.database?.fallbackConfig?.latencyMs !== null && status?.database?.fallbackConfig?.latencyMs !== undefined
                        ? `${status.database.fallbackConfig.latencyMs} ms`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Password Status</span>
                    <span className="font-mono text-white font-bold">
                      {status?.database?.fallbackConfig?.hasPassword ? 'Password Set' : 'None / Not Set'}
                    </span>
                  </div>
                </div>

                {status?.database?.fallbackConfig?.version && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-[11px] font-mono text-slate-400">
                    <span className="text-[10px] uppercase text-slate-500 block font-bold mb-0.5">PostgreSQL Engine</span>
                    <p className="truncate text-slate-300" title={status.database.fallbackConfig.version}>
                      {status.database.fallbackConfig.version}
                    </p>
                  </div>
                )}

                {status?.database?.fallbackConfig?.error && (
                  <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs text-amber-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="w-4 h-4" /> Standby Status / Error:
                    </span>
                    <p className="font-mono text-[11px] break-all">{status.database.fallbackConfig.error}</p>
                    <p className="text-[10px] text-amber-400/80 pt-1">
                      If running in a Docker container or local VM, ensure your PostgreSQL service is accepting connections on all IP interfaces (listen_addresses = '*') or use 127.0.0.1 / host.docker.internal.
                    </p>
                  </div>
                )}

                {/* Table Schema Count & Badges for Local DB */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Local Tables ({status?.database?.fallbackConfig?.tableCount ?? (status?.database?.fallbackConfig?.tables?.length || 0)})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">public schema</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {status?.database?.fallbackConfig?.tables && status.database.fallbackConfig.tables.length > 0 ? (
                      status.database.fallbackConfig.tables.map(tbl => (
                        <span 
                          key={tbl}
                          onClick={() => {
                            setQueryTarget('local');
                            setSqlQuery(`SELECT * FROM ${tbl} LIMIT 10;`);
                            setActiveTab('query');
                          }}
                          title="Click to query table in Console"
                          className="px-2 py-1 bg-slate-800 hover:bg-amber-600 hover:text-white transition cursor-pointer text-[11px] font-mono text-slate-300 rounded-lg border border-slate-700"
                        >
                          {tbl}
                        </span>
                      ))
                    ) : (
                      <div className="text-slate-500 text-xs py-2 w-full text-center">
                        No local tables detected yet. Once local PostgreSQL connects, schemas are initialized automatically.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* High-Availability Architecture Notice */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  3-Tier Resilient Persistence Model
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Errandly utilizes an automated multi-tier failover mechanism:
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Tier 1: Cloud Supabase</span>
                    <span className={status?.database?.connected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {status?.database?.connected ? '● Active Primary' : 'Offline'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Tier 2: Local PostgreSQL</span>
                    <span className={status?.database?.fallbackConfig?.connected ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                      {status?.database?.fallbackConfig?.connected ? '● Online Standby' : 'Standby'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Tier 3: Local JSON Store</span>
                    <span className="text-sky-400 font-bold">● Active Fail-Safe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Configure & Check Local PostgreSQL DB */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                      <Server className="w-5 h-5 text-amber-400" />
                      Configure & Check Local PostgreSQL DB
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Test credentials in real-time or save them live to <code className="text-amber-300 font-mono">app_config.json</code> (<code className="text-slate-300 font-mono">localDatabase</code>).
                    </p>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 block">Host Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLocalDbHost('127.0.0.1');
                        setLocalDbPort('5432');
                        setLocalDbUser('postgres');
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-mono border border-slate-800 transition cursor-pointer"
                    >
                      127.0.0.1:5432 (Localhost)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalDbHost('localhost');
                        setLocalDbPort('5432');
                        setLocalDbUser('postgres');
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-mono border border-slate-800 transition cursor-pointer"
                    >
                      localhost:5432
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalDbHost('host.docker.internal');
                        setLocalDbPort('5432');
                        setLocalDbUser('postgres');
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-mono border border-slate-800 transition cursor-pointer"
                    >
                      host.docker.internal:5432 (Docker Host)
                    </button>
                  </div>
                </div>

                {localDbUpdateMsg && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    localDbUpdateMsg.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-amber-950/60 border-amber-800 text-amber-200'
                  }`}>
                    {localDbUpdateMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    )}
                    <span>{localDbUpdateMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveLocalDb} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Local Host (IP / Hostname)</label>
                      <input
                        type="text"
                        value={localDbHost}
                        onChange={(e) => setLocalDbHost(e.target.value)}
                        placeholder="127.0.0.1 or localhost"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Port</label>
                      <input
                        type="number"
                        value={localDbPort}
                        onChange={(e) => setLocalDbPort(e.target.value)}
                        placeholder="5432"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Local Database User</label>
                      <input
                        type="text"
                        value={localDbUser}
                        onChange={(e) => setLocalDbUser(e.target.value)}
                        placeholder="postgres"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 block">Local Database Name</label>
                      <input
                        type="text"
                        value={localDbName}
                        onChange={(e) => setLocalDbName(e.target.value)}
                        placeholder="Errandly or postgres"
                        required
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">
                      Local Database Password {status?.database?.fallbackConfig?.hasPassword && <span className="text-emerald-400 font-normal">(Password is currently set)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showLocalDbPassword ? 'text' : 'password'}
                        value={localDbPassword}
                        onChange={(e) => setLocalDbPassword(e.target.value)}
                        placeholder="Leave blank to preserve existing password or enter password..."
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLocalDbPassword(!showLocalDbPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showLocalDbPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTestLocalDb()}
                      disabled={localDbTesting || localDbUpdating}
                      className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-sky-300 border border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {localDbTesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                          Checking Connection...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4 text-sky-400" />
                          Check Connection (Dry Run)
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      disabled={localDbUpdating || localDbTesting}
                      className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {localDbUpdating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving & Initializing Local Pool...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save & Connect Local DB
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Detailed Test Results Box */}
                {localDbTestResult && (
                  <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
                    localDbTestResult.connected
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        {localDbTestResult.connected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        Connection Diagnostic Check Results
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        localDbTestResult.connected ? 'bg-emerald-900/80 text-emerald-200' : 'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        {localDbTestResult.connected ? 'SUCCESS' : 'UNREACHABLE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 bg-slate-900/80 rounded-lg">
                        <span className="text-slate-500 block text-[9px] uppercase">Latency</span>
                        <span className="text-white font-bold">{localDbTestResult.latencyMs !== null && localDbTestResult.latencyMs !== undefined ? `${localDbTestResult.latencyMs} ms` : 'N/A'}</span>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-lg">
                        <span className="text-slate-500 block text-[9px] uppercase">Tables</span>
                        <span className="text-white font-bold">{localDbTestResult.tableCount ?? 0}</span>
                      </div>
                      <div className="p-2 bg-slate-900/80 rounded-lg sm:col-span-2">
                        <span className="text-slate-500 block text-[9px] uppercase">Host:Port</span>
                        <span className="text-white font-bold truncate block">{localDbHost}:{localDbPort}</span>
                      </div>
                    </div>

                    {localDbTestResult.version && (
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        <span className="text-slate-500">Version: </span>{localDbTestResult.version}
                      </div>
                    )}

                    {localDbTestResult.error && (
                      <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 font-mono text-[11px] break-all">
                        {localDbTestResult.error}
                      </div>
                    )}

                    {localDbTestResult.connected && (
                      <button
                        type="button"
                        onClick={() => {
                          setQueryTarget('local');
                          setSqlQuery('SELECT NOW(), version();');
                          setActiveTab('query');
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        Open in Live DB Query Console (Target: Local DB)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )}

        {/* TAB 2: ACTION SERVER & DB TEST */}
        {activeTab === 'actionserver' && (
          <div className="space-y-6">
            {/* 1. TOP DIAGNOSTIC HERO & "CHECK ALL SYSTEMS" TRIGGER */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Tri-Service Health Diagnostic Matrix
                    </span>
                    {lastCheckTimestamp && (
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Checked {lastCheckTimestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Action Server & DB Diagnostic Console
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Trigger an end-to-end status request sequence across the PostgreSQL Database, Action Server Gateway, and Email SMTP gateway to evaluate health, latency, and schema discovery.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    onClick={handleCheckAllSystems}
                    disabled={diagnosticLoading}
                    className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 active:scale-[0.98] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition disabled:opacity-60 cursor-pointer"
                  >
                    {diagnosticLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-200" />
                        <span>Running Diagnostics...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>Check All Systems</span>
                      </>
                    )}
                  </button>

                  {diagnosticResults && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(diagnosticResults, null, 2), 'diag_json')}
                      className="px-4 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition"
                      title="Copy diagnostic results as JSON"
                    >
                      {copiedKey === 'diag_json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Report</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time sequence indicator */}
              {diagnosticLoading && (
                <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      Sequence Step: {diagnosticStep === 'db' ? '1/3 - Testing PostgreSQL DB Connection & Latency' : diagnosticStep === 'actionserver' ? '2/3 - Pinging Action Server Gateway' : '3/3 - Verifying Email SMTP Gateway Transport'}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">Executing socket checks...</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${diagnosticStep === 'db' || diagnosticStep === 'actionserver' || diagnosticStep === 'smtp' ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${diagnosticStep === 'actionserver' || diagnosticStep === 'smtp' ? 'bg-sky-500' : 'bg-slate-800'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${diagnosticStep === 'smtp' ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                  </div>
                </div>
              )}

              {diagnosticError && (
                <div className="mt-6 p-4 bg-red-950/80 border border-red-800/80 rounded-2xl text-xs text-red-200 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">Diagnostic Check Encountered an Issue</span>
                    <p className="text-red-300 text-[11px] mt-0.5">{diagnosticError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. SYSTEM STATUS DASHBOARD SECTION */}
            {diagnosticResults && (
              <div className="space-y-6">
                {/* Overall Status Banner */}
                <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  diagnosticResults.overallStatus === 'all_systems_operational'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-lg shadow-emerald-950/20'
                    : diagnosticResults.overallStatus === 'partially_degraded'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-lg shadow-amber-950/20'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-lg shadow-rose-950/20'
                }`}>
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      diagnosticResults.overallStatus === 'all_systems_operational'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : diagnosticResults.overallStatus === 'partially_degraded'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {diagnosticResults.overallStatus === 'all_systems_operational' ? (
                        <CheckCheck className="w-5 h-5" />
                      ) : diagnosticResults.overallStatus === 'partially_degraded' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm uppercase tracking-wider">
                          {diagnosticResults.overallStatus === 'all_systems_operational'
                            ? 'All Systems Operational'
                            : diagnosticResults.overallStatus === 'partially_degraded'
                            ? 'Partially Degraded Services'
                            : 'Critical Issues Detected'}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          diagnosticResults.overallStatus === 'all_systems_operational'
                            ? 'bg-emerald-400 animate-pulse'
                            : diagnosticResults.overallStatus === 'partially_degraded'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-rose-500 animate-ping'
                        }`} />
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">
                        Completed tri-system handshake & latency verification in{' '}
                        <strong className="font-mono">{diagnosticResults.totalDurationMs} ms</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center text-xs font-mono">
                    <span className="px-3 py-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                      DB: {diagnosticResults.database.connected ? `${diagnosticResults.database.latencyMs}ms` : 'FAIL'}
                    </span>
                    <span className="px-3 py-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                      Gateway: {diagnosticResults.actionServer.online ? `${diagnosticResults.actionServer.latencyMs}ms` : 'FAIL'}
                    </span>
                    <span className="px-3 py-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                      SMTP: {diagnosticResults.emailSmtp.status === 'operational' ? `${diagnosticResults.emailSmtp.latencyMs ?? 0}ms` : 'Off'}
                    </span>
                  </div>
                </div>

                {/* 3 Detailed Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Database Status */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">1. PostgreSQL DB</h3>
                          <span className="text-[10px] text-slate-500 font-mono">Data Persistence Layer</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                        diagnosticResults.database.connected
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : 'bg-red-950 border-red-700 text-red-300'
                      }`}>
                        {diagnosticResults.database.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Socket Latency</span>
                        <span className="font-mono font-bold text-white">
                          {diagnosticResults.database.latencyMs !== null ? `${diagnosticResults.database.latencyMs} ms` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Discovered Tables</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {diagnosticResults.database.tableCount} Tables
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Host Address</span>
                        <span className="font-mono text-[11px] text-slate-300 truncate max-w-[140px]" title={diagnosticResults.database.host}>
                          {diagnosticResults.database.host || 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-medium">Database Name</span>
                        <span className="font-mono text-slate-300">
                          {diagnosticResults.database.database || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {diagnosticResults.database.error ? (
                      <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-[11px] font-mono text-red-300 break-all">
                        {diagnosticResults.database.error}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Engine Version:</span>
                        <span className="font-mono text-slate-300 truncate max-w-[150px]" title={diagnosticResults.database.version || 'PostgreSQL'}>
                          {diagnosticResults.database.version ? diagnosticResults.database.version.split(' ')[0] + ' ' + diagnosticResults.database.version.split(' ')[1] : 'PostgreSQL'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Action Server Gateway */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">2. Action Server</h3>
                          <span className="text-[10px] text-slate-500 font-mono">Gateway API & Webhooks</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                        diagnosticResults.actionServer.online
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : 'bg-amber-950 border-amber-700 text-amber-300'
                      }`}>
                        {diagnosticResults.actionServer.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Ping Latency</span>
                        <span className="font-mono font-bold text-white">
                          {diagnosticResults.actionServer.latencyMs !== null ? `${diagnosticResults.actionServer.latencyMs} ms` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">HTTP Response</span>
                        <span className={`font-mono font-bold ${diagnosticResults.actionServer.statusCode === 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {diagnosticResults.actionServer.statusCode ? `HTTP ${diagnosticResults.actionServer.statusCode}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Target URL</span>
                        <span className="font-mono text-[11px] text-sky-300 truncate max-w-[140px]" title={diagnosticResults.actionServer.url}>
                          {diagnosticResults.actionServer.url}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-medium">Live State</span>
                        <span className="font-mono text-slate-300">
                          {diagnosticResults.actionServer.online ? 'Online & Responsive' : 'Unreachable'}
                        </span>
                      </div>
                    </div>

                    {diagnosticResults.actionServer.error ? (
                      <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-[11px] font-mono text-amber-300 break-all">
                        {diagnosticResults.actionServer.error}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Payload Preview:</span>
                        <span className="font-mono text-emerald-400 truncate max-w-[150px]">
                          {diagnosticResults.actionServer.responsePreview?.status || 'Valid JSON'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 3: Email SMTP Gateway */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">3. Email SMTP</h3>
                          <span className="text-[10px] text-slate-500 font-mono">Notifications & OTP</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                        diagnosticResults.emailSmtp.status === 'operational'
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : diagnosticResults.emailSmtp.isConfigured
                          ? 'bg-amber-950 border-amber-700 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {diagnosticResults.emailSmtp.status === 'operational' ? 'VERIFIED' : diagnosticResults.emailSmtp.isConfigured ? 'FAILED' : 'NOT CONFIGURED'}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Transport Mode</span>
                        <span className="font-mono font-bold text-white">
                          {diagnosticResults.emailSmtp.isConfigured ? (diagnosticResults.emailSmtp.secure ? 'SSL (465)' : `STARTTLS (${diagnosticResults.emailSmtp.port})`) : 'Not Configured'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">SMTP Host</span>
                        <span className="font-mono text-[11px] text-slate-300 truncate max-w-[140px]" title={diagnosticResults.emailSmtp.host || 'Not set'}>
                          {diagnosticResults.emailSmtp.host || 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 font-medium">Sender From</span>
                        <span className="font-mono text-[11px] text-emerald-300 truncate max-w-[140px]" title={diagnosticResults.emailSmtp.from}>
                          {diagnosticResults.emailSmtp.from}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-medium">Handshake Status</span>
                        <span className="font-mono text-slate-300">
                          {diagnosticResults.emailSmtp.verified ? 'Verified & Ready' : (diagnosticResults.emailSmtp.isConfigured ? 'Connection Failed' : 'Unconfigured')}
                        </span>
                      </div>
                    </div>

                    {diagnosticResults.emailSmtp.error ? (
                      <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-[11px] font-mono text-amber-300 break-all">
                        {diagnosticResults.emailSmtp.error}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Gateway Status:</span>
                        <span className="font-mono text-emerald-400 truncate max-w-[150px]">
                          {diagnosticResults.emailSmtp.verified ? 'Socket Ready' : 'Standby'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACTION SERVER & GATEWAY CONFIGURATION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    Action Server Status
                  </h2>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                    status?.actionServer?.online 
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-300' 
                      : 'bg-amber-950 border-amber-700 text-amber-300'
                  }`}>
                    {status?.actionServer?.online ? 'OPERATIONAL' : 'UNREACHABLE'}
                  </span>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Bound Action Server / Gateway URL</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-sky-300 font-bold break-all">
                      {status?.actionServer?.url || 'https://gateway.errandly.site'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(status?.actionServer?.url || 'https://gateway.errandly.site', 'action_url')}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0"
                    >
                      {copiedKey === 'action_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Ping Latency</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.actionServer?.latencyMs ? `${status.actionServer.latencyMs} ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Health HTTP Code</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {status?.actionServer?.statusCode ? `HTTP ${status.actionServer.statusCode}` : 'N/A'}
                    </span>
                  </div>
                </div>

                {status?.actionServer?.error && (
                  <div className="p-4 bg-amber-950/60 border border-amber-800/80 rounded-2xl text-xs text-amber-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Action Server Diagnostics:
                    </span>
                    <p className="font-mono text-[11px] break-all">{status.actionServer.error}</p>
                  </div>
                )}

                {status?.actionServer?.responsePreview && (
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Health Endpoint Payload</span>
                    <pre className="text-[11px] font-mono text-slate-300 max-h-32 overflow-y-auto">
                      {JSON.stringify(status.actionServer.responsePreview, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-sky-400" />
                    Configure Action Server Gateway URL
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Update the target action server URL live in <code className="text-indigo-300 font-mono">app_config.json</code>.
                  </p>
                </div>

                {actionServerPingMsg && (
                  <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    actionServerPingMsg.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-red-950/60 border-red-800 text-red-200'
                  }`}>
                    {actionServerPingMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />}
                    <div className="space-y-1">
                      <p>{actionServerPingMsg.text}</p>
                      {actionServerPingMsg.data && (
                        <pre className="p-2 bg-slate-950/80 rounded font-mono text-[10px] text-slate-300">
                          {JSON.stringify(actionServerPingMsg.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveActionServer} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 block">
                      Target Action Server / Gateway URL
                    </label>
                    <input
                      type="url"
                      value={actionServerUrlInput}
                      onChange={(e) => setActionServerUrlInput(e.target.value)}
                      placeholder="https://gateway.errandly.site"
                      required
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActionServerUrlInput('https://gateway.errandly.site')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                    >
                      Default: gateway.errandly.site
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionServerUrlInput('http://localhost:3000')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                    >
                      Localhost (3000)
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={actionServerUpdating}
                      className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionServerUpdating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Testing Action Server & Updating Config...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Action Server URL Live to Config
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* TAB 3: LIVE DETAILED LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    Live Diagnostic Event Logs
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time backend logs (database queries, auth operations, notifications, gateway calls).
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                      autoRefreshLogs 
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Radio className={`w-3.5 h-3.5 ${autoRefreshLogs ? 'animate-pulse text-emerald-400' : ''}`} />
                    {autoRefreshLogs ? 'Live Stream Active (3s)' : 'Stream Paused'}
                  </button>

                  <button
                    onClick={fetchLogs}
                    disabled={logsLoading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                    Fetch Logs
                  </button>

                  <button
                    onClick={() => {
                      const logText = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
                      copyToClipboard(logText, 'all_logs');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {copiedKey === 'all_logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy All Logs
                  </button>

                  <button
                    onClick={handleClearLogs}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs by keyword (e.g. [PostgreSQL], /api/, SMS, error)..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {(['all', 'log', 'info', 'warn', 'error'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setLogLevelFilter(lvl)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider transition ${
                        logLevelFilter === lvl
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Stream Box */}
              <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 font-mono text-xs max-h-[500px] overflow-y-auto space-y-1.5 select-text">
                {filteredLogs.length === 0 ? (
                  <p className="text-slate-500 italic py-8 text-center">No log records match the current filter.</p>
                ) : (
                  filteredLogs.map((entry, idx) => {
                    let levelColor = 'text-slate-400 border-slate-700 bg-slate-900';
                    if (entry.level === 'error') levelColor = 'text-red-400 border-red-800/80 bg-red-950/30';
                    if (entry.level === 'warn') levelColor = 'text-amber-400 border-amber-800/80 bg-amber-950/30';
                    if (entry.level === 'info') levelColor = 'text-sky-400 border-sky-800/80 bg-sky-950/30';

                    return (
                      <div 
                        key={idx} 
                        className={`p-2 rounded-lg border ${levelColor} hover:bg-slate-900/90 transition flex flex-col sm:flex-row sm:items-start gap-2 leading-relaxed`}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-950/80 border border-current">
                            {entry.level}
                          </span>
                        </div>
                        <div className="break-all whitespace-pre-wrap flex-1 text-[11px]">
                          {entry.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE DB QUERY CONSOLE */}
        {activeTab === 'query' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    Live PostgreSQL Query Console
                  </h2>
                  <p className="text-xs text-slate-400">
                    Execute live SQL queries directly against the connected PostgreSQL database.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Query Target Selector */}
                  <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Target:</span>
                    <button
                      type="button"
                      onClick={() => setQueryTarget('auto')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        queryTarget === 'auto' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueryTarget('primary')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        queryTarget === 'primary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Cloud className="w-3 h-3" />
                      Primary (Cloud)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueryTarget('local')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        queryTarget === 'local' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Server className="w-3 h-3 text-amber-300" />
                      Local DB
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQueryViewMode('table')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${queryViewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Table View
                    </button>
                    <button
                      onClick={() => setQueryViewMode('json')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${queryViewMode === 'json' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      JSON View
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-slate-500 text-[11px] self-center">Presets:</span>
                {[
                  { label: 'List Tables', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" },
                  { label: 'Select Profiles', sql: "SELECT id, email, role, wallet_balance, created_at FROM profiles LIMIT 10;" },
                  { label: 'Select Errands', sql: "SELECT id, title, status, budget, requester_id, runner_id FROM errands ORDER BY created_at DESC LIMIT 10;" },
                  { label: 'Select Transactions', sql: "SELECT id, user_id, type, amount, status, created_at FROM transactions ORDER BY created_at DESC LIMIT 10;" },
                  { label: 'DB Version & Now()', sql: "SELECT NOW() as current_time, version() as pg_version;" },
                  { label: 'Table Stats', sql: "SELECT relname as table_name, n_live_tup as row_count FROM pg_stat_user_tables ORDER BY n_live_tup DESC;" }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSqlQuery(preset.sql)}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-lg text-slate-300 font-mono text-[11px] transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* SQL Input Area */}
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter custom SQL query (e.g. SELECT * FROM profiles LIMIT 5;)..."
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-indigo-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed resize-y"
                />

                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">
                    Press Run to execute live SQL query against active pool.
                  </span>

                  <button
                    onClick={handleExecuteQuery}
                    disabled={queryLoading || !sqlQuery.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {queryLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Run SQL Query
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Result Area */}
              {queryResult && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        queryResult.success ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                      }`}>
                        {queryResult.success ? 'SUCCESS' : 'ERROR'}
                      </span>
                      {queryResult.executionTimeMs !== undefined && (
                        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {queryResult.executionTimeMs} ms
                        </span>
                      )}
                      {queryResult.rowCount !== undefined && (
                        <span className="text-slate-400 text-[11px]">
                          ({queryResult.rowCount} {queryResult.rowCount === 1 ? 'row' : 'rows'})
                        </span>
                      )}
                      {queryResult.poolUsed && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono border ${
                          queryResult.poolUsed === 'local'
                            ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                            : 'bg-indigo-950/80 border-indigo-800 text-indigo-300'
                        }`}>
                          Pool: {queryResult.poolUsed === 'local' ? 'Local PostgreSQL' : 'Primary (Cloud)'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => copyToClipboard(JSON.stringify(queryResult.rows || queryResult, null, 2), 'query_out')}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      {copiedKey === 'query_out' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy Result
                    </button>
                  </div>

                  {queryResult.error && (
                    <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 font-mono">
                      {queryResult.error}
                    </div>
                  )}

                  {queryResult.rows && (
                    queryViewMode === 'table' && queryResult.fields && queryResult.fields.length > 0 ? (
                      <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-2xl max-h-96">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900 border-b border-slate-800 sticky top-0">
                            <tr>
                              {queryResult.fields.map(col => (
                                <th key={col} className="px-4 py-3 text-[11px] font-bold text-slate-300 whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {queryResult.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-900/50 transition">
                                {queryResult.fields!.map(col => (
                                  <td key={col} className="px-4 py-2.5 text-slate-300 whitespace-nowrap max-w-xs truncate">
                                    {typeof row[col] === 'object' && row[col] !== null 
                                      ? JSON.stringify(row[col]) 
                                      : String(row[col] ?? 'NULL')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-300 max-h-96 overflow-y-auto">
                        {JSON.stringify(queryResult.rows, null, 2)}
                      </pre>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ACTION SERVER / API CALLER */}
        {activeTab === 'apicall' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-sky-400" />
                  Live Action Server & Gateway API Caller
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Dispatch live HTTP requests directly against target routes on <code className="text-sky-300 font-mono">{status?.actionServer?.url || 'https://gateway.errandly.site'}</code>.
                </p>
              </div>

              {/* Endpoint Preset Buttons */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-slate-500 text-[11px] self-center">Endpoint Presets:</span>
                {[
                  { label: 'Health Check', method: 'GET' as const, path: '/api/health', body: '' },
                  { label: 'Admin Status', method: 'GET' as const, path: '/api/admin/config-status', body: '' },
                  { label: 'Env Keys', method: 'GET' as const, path: '/api/admin/env-keys', body: '' },
                  { label: 'Rate Limits', method: 'GET' as const, path: '/api/admin/rate-limit-stats', body: '' },
                  { label: 'Test WhatsApp Alert', method: 'POST' as const, path: '/api/whatsapp/send', body: '{\n  "to": "254722603149",\n  "message": "ConnectionAdmin test alert"\n}' }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setApiMethod(preset.method);
                      setApiEndpoint(preset.path);
                      if (preset.body) setApiBody(preset.body);
                    }}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-sky-500 rounded-lg text-slate-300 font-mono text-[11px] transition"
                  >
                    {preset.method} {preset.label}
                  </button>
                ))}
              </div>

              {/* Request Setup Form */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={apiMethod}
                    onChange={(e: any) => setApiMethod(e.target.value)}
                    className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-sky-400 outline-none focus:border-sky-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>

                  <input
                    type="text"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="/api/health or full URL"
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-sky-500"
                  />

                  <button
                    onClick={handleExecuteApiCall}
                    disabled={apiCallerLoading || !apiEndpoint.trim()}
                    className="px-6 py-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {apiCallerLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Calling...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Execute Call
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Headers (JSON)
                    </label>
                    <textarea
                      rows={4}
                      value={apiHeaders}
                      onChange={(e) => setApiHeaders(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 outline-none focus:border-sky-500"
                    />
                  </div>

                  {apiMethod !== 'GET' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Body (JSON)
                      </label>
                      <textarea
                        rows={4}
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 outline-none focus:border-sky-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Call Result Area */}
              {apiCallResult && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        (apiCallResult.status && apiCallResult.status >= 200 && apiCallResult.status < 400)
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-red-950 text-red-300'
                      }`}>
                        {apiCallResult.status ? `HTTP ${apiCallResult.status} ${apiCallResult.statusText || ''}` : 'CALL FAILED'}
                      </span>
                      {apiCallResult.executionTimeMs !== undefined && (
                        <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-400" />
                          {apiCallResult.executionTimeMs} ms
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => copyToClipboard(JSON.stringify(apiCallResult.data || apiCallResult, null, 2), 'api_res')}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      {copiedKey === 'api_res' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy Response
                    </button>
                  </div>

                  {apiCallResult.error && (
                    <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 font-mono">
                      {apiCallResult.error}
                    </div>
                  )}

                  {apiCallResult.data && (
                    <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-sky-200 max-h-96 overflow-y-auto">
                      {JSON.stringify(apiCallResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* TAB 6: DB SYNC STATUS & AUTO-RECONCILE */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            {/* Sync Alert Messages */}
            {syncMsg && (
              <div className={`p-4 rounded-2xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
                syncMsg.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/70 border-red-800 text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  {syncMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{syncMsg.text}</span>
                </div>
                <button onClick={() => setSyncMsg(null)} className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5">
                  Dismiss
                </button>
              </div>
            )}

            {/* Sync Engine Top Banner Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 bg-emerald-600/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shrink-0">
                    <RefreshCw className={`w-7 h-7 ${syncLoading || syncTriggering ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black tracking-tight text-white">
                        Multi-Tier Database Synchronization & Auto-Reconciliation Engine
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        syncStatus?.synced 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80' 
                          : 'bg-amber-950 text-amber-300 border border-amber-700/80'
                      }`}>
                        {syncStatus?.synced ? 'All Tiers Synchronized' : 'Auto-Healing / Mismatches Reconciled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                      Continuous background auto-healing checks data parity across Primary PostgreSQL, Local Fallback PostgreSQL, and Resilient Local JSON storage every 25 seconds. Any detected drift is automatically healed using latest timestamp reconciliation.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <button
                    onClick={() => fetchSyncStatus(true)}
                    disabled={syncLoading}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 border border-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                    Check Sync Status
                  </button>

                  <button
                    onClick={handleTriggerFullSync}
                    disabled={syncTriggering}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {syncTriggering ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Reconciling All Tiers...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Force Full Auto-Sync
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setAutoRefreshSync(!autoRefreshSync)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                      autoRefreshSync 
                        ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                    title={autoRefreshSync ? 'Live auto-polling active (every 10s)' : 'Auto-polling paused'}
                  >
                    <Radio className={`w-3.5 h-3.5 ${autoRefreshSync ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
                    {autoRefreshSync ? '10s Auto-Poll ON' : 'Auto-Poll OFF'}
                  </button>
                </div>
              </div>

              {/* 3 Active Tiers Health Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                {/* Tier 1: Primary PostgreSQL */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">1. Primary PostgreSQL</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      syncStatus?.sources?.primary?.connected 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {syncStatus?.sources?.primary?.connected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Host:</span>
                      <span className="text-slate-200 truncate max-w-[130px] font-bold" title={syncStatus?.sources?.primary?.host}>
                        {syncStatus?.sources?.primary?.host || 'Not configured'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Active Rows:</span>
                      <span className="text-indigo-300 font-bold">{syncStatus?.sources?.primary?.totalRecords ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Tier 2: Fallback Local PostgreSQL */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">2. Local PG Fallback</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      syncStatus?.sources?.localPg?.connected 
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {syncStatus?.sources?.localPg?.connected ? 'Active' : 'Standby / Offline'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Host:</span>
                      <span className="text-slate-200 font-bold">{syncStatus?.sources?.localPg?.host || '127.0.0.1:5432'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Active Rows:</span>
                      <span className="text-emerald-300 font-bold">{syncStatus?.sources?.localPg?.totalRecords ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Tier 3: Local JSON Resilient File Store */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">3. JSON Resilient Store</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-sky-950 text-sky-300 border border-sky-800">
                      Always Active
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Local Storage Path:</span>
                      <span className="text-slate-200 font-bold">.local_db/*.json</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cached Rows:</span>
                      <span className="text-sky-300 font-bold">{syncStatus?.sources?.json?.totalRecords ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Engine Metrics Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Monitored Tables</span>
                  <span className="text-lg font-black text-white font-mono">{syncStatus?.tables?.length ?? 0}</span>
                </div>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Auto-Healed Mismatches</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{syncStatus?.mismatchesDetected ?? 0}</span>
                </div>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Total Records Reconciled</span>
                  <span className="text-lg font-black text-indigo-300 font-mono">{syncStatus?.recordsReconciled ?? 0}</span>
                </div>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Scan Duration</span>
                  <span className="text-lg font-black text-sky-300 font-mono">{syncStatus?.durationMs ?? 0} ms</span>
                </div>
              </div>
            </div>

            {/* Table-by-Table Synchronization Matrix */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">Database Tables Consistency Matrix</h3>
                    <p className="text-xs text-slate-400">Live count comparison and per-table reconciliation status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setSyncFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        syncFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({syncStatus?.tables?.length ?? 0})
                    </button>
                    <button
                      onClick={() => setSyncFilter('mismatched')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        syncFilter === 'mismatched' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mismatched ({syncStatus?.tables?.filter(t => !t.inSync || t.mismatchesDetected > 0).length ?? 0})
                    </button>
                    <button
                      onClick={() => setSyncFilter('synced')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        syncFilter === 'synced' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      In Sync ({syncStatus?.tables?.filter(t => t.inSync).length ?? 0})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={syncSearch}
                      onChange={(e) => setSyncSearch(e.target.value)}
                      placeholder="Filter table..."
                      className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 w-36 sm:w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Consistency Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="p-3.5">Table Name</th>
                      <th className="p-3.5 text-center">Primary PG</th>
                      <th className="p-3.5 text-center">Local PG</th>
                      <th className="p-3.5 text-center">JSON Store</th>
                      <th className="p-3.5 text-center">Sync Status</th>
                      <th className="p-3.5 text-center">Reconciled</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {syncStatus?.tables && syncStatus.tables.length > 0 ? (
                      syncStatus.tables
                        .filter(t => {
                          if (syncFilter === 'mismatched' && t.inSync && t.mismatchesDetected === 0) return false;
                          if (syncFilter === 'synced' && (!t.inSync || t.mismatchesDetected > 0)) return false;
                          if (syncSearch.trim() && !t.tableName.toLowerCase().includes(syncSearch.toLowerCase())) return false;
                          return true;
                        })
                        .map((tbl) => (
                          <tr key={tbl.tableName} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold text-white flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>{tbl.tableName}</span>
                            </td>
                            <td className="p-3.5 text-center text-slate-300 font-bold">
                              {tbl.primaryCount}
                            </td>
                            <td className="p-3.5 text-center text-slate-300 font-bold">
                              {tbl.localCount}
                            </td>
                            <td className="p-3.5 text-center text-slate-300 font-bold">
                              {tbl.jsonCount}
                            </td>
                            <td className="p-3.5 text-center">
                              {tbl.inSync ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <CheckCheck className="w-3 h-3" />
                                  Synchronized
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-800" title={tbl.discrepancy || 'Mismatch detected'}>
                                  <AlertTriangle className="w-3 h-3" />
                                  Auto-Healed
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center text-slate-400 font-mono">
                              {tbl.recordsReconciled > 0 ? (
                                <span className="text-emerald-400 font-bold">+{tbl.recordsReconciled} records</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleSyncSingleTable(tbl.tableName)}
                                disabled={syncingTable === tbl.tableName}
                                className="px-3 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ml-auto disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 ${syncingTable === tbl.tableName ? 'animate-spin' : ''}`} />
                                Sync Table
                              </button>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-sans text-xs">
                          {syncLoading ? 'Analyzing database tables across all tiers...' : 'No synchronized tables discovered or status pending.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sync Audit Trail & Reconciliation Logs */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">Live Sync Audit Trail & Reconciliation Events</h3>
                    <p className="text-xs text-slate-400">Timestamped record of background write mirroring and auto-healing events</p>
                  </div>
                </div>

                <button
                  onClick={handleClearSyncAuditLogs}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/50 hover:text-red-300 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Logs
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 font-mono text-xs">
                {syncStatus?.auditLogs && syncStatus.auditLogs.length > 0 ? (
                  syncStatus.auditLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.status === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          log.status === 'warning' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-red-950 text-red-300 border border-red-800'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-indigo-300 font-bold">{log.table}</span>
                        <span className="text-slate-400 text-[11px]">{log.details}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
                        {log.recordsCount > 0 && (
                          <span className="text-emerald-400 font-bold">{log.recordsCount} record(s)</span>
                        )}
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 font-sans text-xs">
                    No sync audit events recorded yet. Background synchronization daemon is actively monitoring all tiers.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: FIREBASE ALTERNATE AUTH & BACKUP USERS DATA STORAGE (ONLY USER DATA) */}
        {activeTab === 'firebase' && (
          <div className="space-y-6">
            {/* Action Message Banner */}
            {firebaseActionMsg && (
              <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
                firebaseActionMsg.type === 'success' 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                  : firebaseActionMsg.type === 'info'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800'
              }`}>
                <div className="flex items-center gap-2">
                  {firebaseActionMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{firebaseActionMsg.text}</span>
                </div>
                <button
                  onClick={() => setFirebaseActionMsg(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header & Strict Isolation Scope Banner */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-black text-white tracking-tight">Firebase Alternate Auth & Backup Users Storage</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-700/80">
                        Strict Scope: User Data Only
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Secondary authentication authority & dedicated off-site backup vault exclusively for user account records (<code className="text-amber-300 font-mono">profiles ↔ users</code>).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                <button
                  onClick={() => {
                    fetchFirebaseAdminStatus();
                    fetchFirebaseBackupUsers(firebaseBackupPage, firebaseBackupSearch);
                  }}
                  disabled={firebaseLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${firebaseLoading ? 'animate-spin text-amber-400' : ''}`} />
                  Refresh Status
                </button>

                <button
                  onClick={backupUsersToFirebase}
                  disabled={firebaseBackingUpUsers}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
                >
                  <HardDrive className={`w-3.5 h-3.5 ${firebaseBackingUpUsers ? 'animate-spin' : ''}`} />
                  {firebaseBackingUpUsers ? 'Backing Up Users...' : 'Backup Users to Firebase'}
                </button>

                <button
                  onClick={restoreUsersFromFirebase}
                  disabled={firebaseRestoringUsers}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-amber-800/80 transition disabled:opacity-50"
                >
                  <Download className={`w-3.5 h-3.5 ${firebaseRestoringUsers ? 'animate-spin' : ''}`} />
                  {firebaseRestoringUsers ? 'Restoring Users...' : 'Restore Users'}
                </button>
              </div>
            </div>

            {/* Strict Isolation Notice Box */}
            <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-amber-300 block">Security & Isolation Protocol (User Data Exclusivity):</span>
                <p className="text-slate-300 leading-relaxed">
                  In compliance with privacy boundaries, this backup storage is strictly restricted to user credentials and profiles in the <code className="text-amber-300 font-mono">users</code> collection. 
                  Errands, bidding negotiations, wallet transactions, and private chats are preserved exclusively in the primary relational and local datastores.
                </p>
              </div>
            </div>

            {/* Sub-Navigation: Firebase Infrastructure Table & Real-Time Settings vs. User Accounts Backup Storage */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFirebaseSubTab('infrastructure')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    firebaseSubTab === 'infrastructure'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  Firebase Infrastructure & Real-Time Settings
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                    firebaseRealtimeConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {firebaseRealtimeConnected ? 'Live Real-Time' : `${firebaseInfraFields?.length || 17} Fields`}
                  </span>
                </button>

                <button
                  onClick={() => setFirebaseSubTab('backup_vault')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    firebaseSubTab === 'backup_vault'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  User Account Backup Vault
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                    {firebaseStatus?.counts?.firestoreUsersCount ?? 0} Users
                  </span>
                </button>
              </div>

              {/* Real-Time SSE Indicator */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${firebaseRealtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${firebaseRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <span className="text-slate-400 font-medium">Real-Time Sync:</span>
                <span className={`font-bold ${firebaseRealtimeConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {firebaseRealtimeConnected ? 'Active & Streaming' : 'Polling Sync'}
                </span>
                {liveTestLatency !== null && (
                  <span className="text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-2">
                    Ping: <span className="text-emerald-400">{liveTestLatency}ms</span>
                  </span>
                )}
              </div>
            </div>

            {/* SUB-TAB 1: FIREBASE INFRASTRUCTURE TABLE & REAL-TIME SETTINGS */}
            {firebaseSubTab === 'infrastructure' && (
              <FirebaseInfrastructureTable
                infrastructure={firebaseInfra}
                fieldsMeta={firebaseInfraFields}
                dirtyFields={infraDirtyFields}
                onFieldChange={(key, val) => {
                  setInfraDirtyFields(prev => ({ ...prev, [key]: val }));
                }}
                onSaveAll={() => updateFirebaseInfrastructure()}
                onSaveSingle={(key, val) => updateFirebaseInfrastructure({ [key]: val }, key)}
                onQuickFill={quickFillFirebaseInfrastructure}
                onRefresh={fetchFirebaseInfrastructure}
                onTestLive={testFirebaseInfrastructureLive}
                isSaving={firebaseInfraSaving}
                isQuickFilling={firebaseInfraQuickFilling}
                isLoading={firebaseInfraLoading}
                isTestingLive={liveTestRunning}
                singleSavingKey={singleFieldSavingKey}
                liveLatency={liveTestLatency}
                realtimeConnected={firebaseRealtimeConnected}
                realtimeEvents={firebaseRealtimeEvents}
                copyToClipboard={copyToClipboard}
                copiedKey={copiedKey}
              />
            )}

            {/* SUB-TAB 2: USER ACCOUNT BACKUP VAULT & ALTERNATE AUTH */}
            {firebaseSubTab === 'backup_vault' && (
              <div className="space-y-6">
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Firebase Service & Project */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-amber-400" /> Firebase Infrastructure
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    firebaseStatus?.configured
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {firebaseStatus?.configured ? 'Connected' : 'Not Configured'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Project ID:</span>
                    <span className="font-mono text-slate-200 font-semibold">{firebaseStatus?.projectId || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Auth Domain:</span>
                    <span className="font-mono text-slate-300">{firebaseStatus?.authDomain || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Firestore DB:</span>
                    <span className="font-mono text-amber-300 truncate max-w-[170px]" title={firebaseStatus?.firestoreDatabaseId}>
                      {firebaseStatus?.firestoreDatabaseId || '(default)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">API Key:</span>
                    <span className="text-emerald-400 font-semibold">{firebaseStatus?.apiKeyPresent ? 'Valid & Injected' : 'Missing'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Alternate Authentication Mode */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Alternate Auth Authority
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    firebaseStatus?.alternateAuthEnabled
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {firebaseStatus?.alternateAuthEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Authentication Mode:</span>
                    <span className="text-emerald-300 font-bold">Fastest Race + Fallback</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Providers:</span>
                    <span className="text-slate-200">Google OAuth, Password</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Auto-Mirror Users:</span>
                    <span className="text-slate-300">{firebaseStatus?.autoMirrorUsersEnabled ? 'Active' : 'Manual'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Service Status:</span>
                    <span className="text-emerald-400 font-semibold">Ready for Login</span>
                  </div>
                </div>
              </div>

              {/* Card 3: User Storage Backup Status */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-cyan-400" /> Users Backup Parity
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    firebaseStatus?.inSync
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {firebaseStatus?.inSync ? '100% In Sync' : `${firebaseStatus?.mismatchesCount || 0} Out of Sync`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Primary Users</span>
                    <span className="text-lg font-black text-white">{firebaseStatus?.counts?.primaryUsersCount ?? 0}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Firebase Backup</span>
                    <span className="text-lg font-black text-amber-400">{firebaseStatus?.counts?.firestoreUsersCount ?? 0}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Last User Backup:</span>
                  <span className="text-slate-300 font-mono">
                    {firebaseStatus?.lastUserBackupAt 
                      ? new Date(firebaseStatus.lastUserBackupAt).toLocaleTimeString() + ' ' + new Date(firebaseStatus.lastUserBackupAt).toLocaleDateString()
                      : 'Not yet recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Control Panels: Alternate Auth Service & User Data Backup */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel A: Alternate Authentication Service Configuration */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Alternate Authentication Service</h3>
                    <p className="text-xs text-slate-400">Manage Firebase Auth as a high-availability fallback authentication provider.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">Enable Firebase Alternate Authentication</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm">
                      When enabled, the client auth race and backend resolvers will use Firebase Auth tokens and Google Sign-In as an alternate authority.
                    </p>
                  </div>

                  <button
                    onClick={() => toggleFirebaseAuth(!firebaseStatus?.alternateAuthEnabled)}
                    disabled={firebaseTogglingAuth}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      firebaseStatus?.alternateAuthEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {firebaseStatus?.alternateAuthEnabled ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                {/* Test Auth Button & Result */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Test Auth Service Connectivity</span>
                    <button
                      onClick={testFirebaseAuth}
                      disabled={firebaseTestingAuth}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${firebaseTestingAuth ? 'animate-spin' : ''}`} />
                      {firebaseTestingAuth ? 'Testing Auth...' : 'Run Auth Test'}
                    </button>
                  </div>

                  {firebaseAuthTestResult && (
                    <div className={`p-4 rounded-2xl text-xs font-mono border ${
                      firebaseAuthTestResult.success 
                        ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' 
                        : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold flex items-center gap-1.5">
                          {firebaseAuthTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                          {firebaseAuthTestResult.message}
                        </span>
                        {firebaseAuthTestResult.latencyMs && (
                          <span className="text-[10px] text-slate-400">{firebaseAuthTestResult.latencyMs}ms latency</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1 font-sans">
                        <div>Project: <code className="text-slate-200">{firebaseAuthTestResult.projectId}</code></div>
                        <div>Auth Domain: <code className="text-slate-200">{firebaseAuthTestResult.authDomain}</code></div>
                        <div>Supported Providers: Google OAuth, Email/Password, Phone Credentials</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel B: Backup Users Data Storage Actions */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Users Backup Vault Operations</h3>
                    <p className="text-xs text-slate-400">Synchronize and safeguard user profiles in the off-site Firestore vault.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">User Accounts Synchronization</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      firebaseStatus?.inSync ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {firebaseStatus?.inSync ? 'Parity Confirmed' : 'Reconciliation Needed'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Executing a backup reads all registered accounts and profiles from the primary database and writes them into the isolated Firebase <code className="text-amber-300 font-mono">users</code> collection.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={backupUsersToFirebase}
                      disabled={firebaseBackingUpUsers}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
                    >
                      <HardDrive className={`w-3.5 h-3.5 ${firebaseBackingUpUsers ? 'animate-spin' : ''}`} />
                      {firebaseBackingUpUsers ? 'Writing to Firebase Vault...' : 'Execute Full Users Backup'}
                    </button>

                    <button
                      onClick={restoreUsersFromFirebase}
                      disabled={firebaseRestoringUsers}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 ${firebaseRestoringUsers ? 'animate-spin' : ''}`} />
                      {firebaseRestoringUsers ? 'Restoring...' : 'Restore Users'}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                  <span>Scope Constraint:</span>
                  <span className="text-amber-300 font-semibold">User records exclusively (No errands or transactions)</span>
                </div>
              </div>
            </div>

            {/* Backed-up User Records Explorer */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Backed-up User Documents in Firebase ({firebaseBackupTotalCount})</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    Collection: users
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search users by email, name, phone..."
                      value={firebaseBackupSearch}
                      onChange={(e) => {
                        setFirebaseBackupSearch(e.target.value);
                        fetchFirebaseBackupUsers(1, e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => fetchFirebaseBackupUsers(firebaseBackupPage, firebaseBackupSearch)}
                    disabled={firebaseBackupUsersLoading}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${firebaseBackupUsersLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">User / Identity</th>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Wallet</th>
                      <th className="p-3">Backup Source</th>
                      <th className="p-3">Integrity</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {firebaseBackupUsersList.length > 0 ? (
                      firebaseBackupUsersList.map((user: any) => (
                        <tr key={user.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-amber-600/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                                {(user.username || user.name || user.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-white block">{user.username || user.name || 'Unnamed User'}</span>
                                <span className="text-[11px] text-slate-400">{user.email || 'No email registered'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-300">
                            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate block max-w-[120px]" title={user.id}>
                              {user.id}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'ADMIN' || user.is_admin || user.it_admin
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : user.role === 'RUNNER' || user.is_runner
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            }`}>
                              {user.role || (user.is_runner ? 'RUNNER' : 'REQUESTER')}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 font-mono text-[11px]">
                            {user.phone || '-'}
                          </td>
                          <td className="p-3 font-semibold text-emerald-400 font-mono">
                            KES {Number(user.wallet_balance || user.walletBalance || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                              {user.backup_source || 'firebase'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${
                              user.inSync
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              {user.inSync ? 'Verified Synced' : 'Discrepancy'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedUserDoc(user)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
                            >
                              Inspect Doc
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          {firebaseBackupUsersLoading ? 'Querying Firebase user backup documents...' : 'No backed-up user records found in Firebase users collection.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {firebaseBackupTotalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <span>Page {firebaseBackupPage} of {firebaseBackupTotalPages} ({firebaseBackupTotalCount} users)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchFirebaseBackupUsers(Math.max(1, firebaseBackupPage - 1), firebaseBackupSearch)}
                      disabled={firebaseBackupPage <= 1 || firebaseBackupUsersLoading}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchFirebaseBackupUsers(Math.min(firebaseBackupTotalPages, firebaseBackupPage + 1), firebaseBackupSearch)}
                      disabled={firebaseBackupPage >= firebaseBackupTotalPages || firebaseBackupUsersLoading}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
            )}
          </div>
        )}

        {/* TAB 9: MULTI-DB TABLES & DATA EXPLORER (LOCAL, POSTGRES, SUPABASE, FIREBASE) */}
        {activeTab === 'explorer' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-black text-white tracking-tight">Multi-DB Tables & Data Explorer</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                        4 Systems Linked
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Check table schemas, counts, and live records across Local JSON, Local PostgreSQL, Supabase Cloud PG, and Firebase Firestore.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                <button
                  onClick={() => {
                    fetchExplorerTables();
                    fetchExplorerData(explorerSource, explorerTable, 1, explorerPageSize, explorerSearch);
                  }}
                  disabled={explorerLoadingData}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${explorerLoadingData ? 'animate-spin' : ''}`} />
                  Refresh Table Data
                </button>

                <button
                  onClick={() => {
                    setDeleteResults(null);
                    setDeleteConfirmText('');
                    setDeleteModalOpen(true);
                  }}
                  className="px-4 py-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition"
                  title="Purge or delete table data across databases and local strings"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Table Data / Purge
                </button>
              </div>
            </div>

            {/* 4 Data Source Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Source 1: Local JSON */}
              <button
                onClick={() => {
                  setExplorerSource('local_json');
                  fetchExplorerData('local_json', explorerTable, 1, explorerPageSize, explorerSearch);
                }}
                className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
                  explorerSource === 'local_json'
                    ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-emerald-400" /> Local JSON Store
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">local_db.json (Instant)</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Records:</span>
                  <span className="font-bold text-white font-mono">
                    {explorerTablesData?.sources?.local_json?.totalRecords?.toLocaleString() ?? 0}
                  </span>
                </div>
              </button>

              {/* Source 2: Local PostgreSQL */}
              <button
                onClick={() => {
                  setExplorerSource('local_pg');
                  fetchExplorerData('local_pg', explorerTable, 1, explorerPageSize, explorerSearch);
                }}
                className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
                  explorerSource === 'local_pg'
                    ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-amber-400" /> Local PostgreSQL
                  </span>
                  <span className={`w-2 h-2 rounded-full ${explorerTablesData?.sources?.local_pg?.available ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">Fallback_Errandly (127.0.0.1)</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Records:</span>
                  <span className="font-bold text-white font-mono">
                    {explorerTablesData?.sources?.local_pg?.available 
                      ? (explorerTablesData?.sources?.local_pg?.totalRecords?.toLocaleString() ?? 0)
                      : 'Standby / Offline'}
                  </span>
                </div>
              </button>

              {/* Source 3: Supabase Cloud PG */}
              <button
                onClick={() => {
                  setExplorerSource('supabase');
                  fetchExplorerData('supabase', explorerTable, 1, explorerPageSize, explorerSearch);
                }}
                className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
                  explorerSource === 'supabase'
                    ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" /> Supabase Cloud PG
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">Primary Cloud Postgres</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Records:</span>
                  <span className="font-bold text-white font-mono">
                    {explorerTablesData?.sources?.supabase?.totalRecords?.toLocaleString() ?? 0}
                  </span>
                </div>
              </button>

              {/* Source 4: Firebase Firestore */}
              <button
                onClick={() => {
                  setExplorerSource('firebase');
                  fetchExplorerData('firebase', explorerTable, 1, explorerPageSize, explorerSearch);
                }}
                className={`p-4 rounded-2xl border text-left transition relative overflow-hidden ${
                  explorerSource === 'firebase'
                    ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" /> Firebase Firestore
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">Firestore Cloud DB</div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Records:</span>
                  <span className="font-bold text-white font-mono">
                    {explorerTablesData?.sources?.firebase?.totalRecords?.toLocaleString() ?? 0}
                  </span>
                </div>
              </button>
            </div>

            {/* Table Selection Pills */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-cyan-400" /> Select Database Table / Collection
                </span>
                <span className="text-[11px] text-slate-400">
                  Active Source: <strong className="text-white capitalize">{explorerSource.replace('_', ' ')}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(explorerTablesData?.tableList || ['profiles', 'errands', 'runner_applications', 'bids', 'notifications', 'reviews', 'errand_chats', 'support_messages', 'transactions', 'wallets', 'settings', 'categories', 'saved_places', 'featured_services', 'service_listings', 'otp_codes']).map((tbl: string) => {
                  const countInSource = explorerTablesData?.sources?.[explorerSource]?.counts?.[tbl] ?? 0;
                  return (
                    <button
                      key={tbl}
                      onClick={() => {
                        setExplorerTable(tbl);
                        fetchExplorerData(explorerSource, tbl, 1, explorerPageSize, explorerSearch);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                        explorerTable === tbl
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{tbl}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        explorerTable === tbl ? 'bg-cyan-900 text-cyan-100' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {countInSource}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cross-Source Count Comparison Bar for Active Table */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Table <code className="text-cyan-300 font-mono text-xs">{explorerTable}</code> Parity Check:</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-400">Local JSON:</span>
                  <span className="font-bold font-mono text-emerald-400">{explorerTablesData?.sources?.local_json?.counts?.[explorerTable] ?? 0}</span>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-400">Local PG:</span>
                  <span className="font-bold font-mono text-amber-400">{explorerTablesData?.sources?.local_pg?.counts?.[explorerTable] ?? 0}</span>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-400">Supabase Cloud:</span>
                  <span className="font-bold font-mono text-cyan-400">{explorerTablesData?.sources?.supabase?.counts?.[explorerTable] ?? 0}</span>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-400">Firebase Firestore:</span>
                  <span className="font-bold font-mono text-amber-300">{explorerTablesData?.sources?.firebase?.counts?.[explorerTable] ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Search, Filter & Actions Toolbar */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder={`Search within table '${explorerTable}'...`}
                    value={explorerSearch}
                    onChange={(e) => {
                      setExplorerSearch(e.target.value);
                      fetchExplorerData(explorerSource, explorerTable, 1, explorerPageSize, e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setExplorerViewMode('table')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      explorerViewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Table Grid
                  </button>
                  <button
                    onClick={() => setExplorerViewMode('json')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      explorerViewMode === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 w-full md:w-auto justify-between md:justify-end">
                {explorerExecutionTime !== null && (
                  <span className="font-mono text-[11px] text-slate-500">Queried in {explorerExecutionTime}ms</span>
                )}

                <div className="flex items-center gap-2">
                  <span>Rows:</span>
                  <select
                    value={explorerPageSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setExplorerPageSize(newSize);
                      fetchExplorerData(explorerSource, explorerTable, 1, newSize, explorerSearch);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(explorerRows, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `${explorerSource}_${explorerTable}_data.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 border border-slate-700 transition"
                  title="Download current table records as JSON"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Data Content: Table Grid or Raw JSON */}
            {explorerViewMode === 'table' ? (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
                <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        {explorerFields.slice(0, 10).map((f) => (
                          <th key={f} className="p-3 font-semibold text-slate-300">
                            {f}
                          </th>
                        ))}
                        <th className="p-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {explorerRows.length > 0 ? (
                        explorerRows.map((row: any, idx: number) => (
                          <tr key={row.id || idx} className="hover:bg-slate-800/40 transition">
                            <td className="p-3 text-center text-slate-500 font-mono text-[10px]">
                              {(explorerPage - 1) * explorerPageSize + idx + 1}
                            </td>
                            {explorerFields.slice(0, 10).map((f) => {
                              const val = row[f];
                              let displayVal: any = '-';
                              if (val === true) {
                                displayVal = <span className="text-emerald-400 font-bold">true</span>;
                              } else if (val === false) {
                                displayVal = <span className="text-rose-400 font-bold">false</span>;
                              } else if (val === null || val === undefined) {
                                displayVal = <span className="text-slate-600 italic">null</span>;
                              } else if (typeof val === 'object') {
                                displayVal = (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-cyan-300 border border-slate-800">
                                    {Array.isArray(val) ? `[Array: ${val.length}]` : '{Object}'}
                                  </span>
                                );
                              } else {
                                displayVal = String(val);
                              }

                              return (
                                <td key={f} className="p-3 text-slate-300 font-mono text-[11px] max-w-[200px] truncate" title={String(val)}>
                                  {displayVal}
                                </td>
                              );
                            })}
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setSelectedRowDoc(row)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
                              >
                                View Row
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={explorerFields.slice(0, 10).length + 2} className="p-8 text-center text-slate-500">
                            {explorerLoadingData ? 'Loading records from data source...' : `No records found in table '${explorerTable}' for source '${explorerSource}'.`}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 pt-2">
                  <span>
                    Showing {explorerRows.length > 0 ? (explorerPage - 1) * explorerPageSize + 1 : 0} to{' '}
                    {Math.min(explorerPage * explorerPageSize, explorerTotalCount)} of {explorerTotalCount} records
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchExplorerData(explorerSource, explorerTable, Math.max(1, explorerPage - 1), explorerPageSize, explorerSearch)}
                      disabled={explorerPage <= 1 || explorerLoadingData}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl disabled:opacity-40 font-bold transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 text-white font-bold">
                      {explorerPage} / {explorerTotalPages}
                    </span>
                    <button
                      onClick={() => fetchExplorerData(explorerSource, explorerTable, Math.min(explorerTotalPages, explorerPage + 1), explorerPageSize, explorerSearch)}
                      disabled={explorerPage >= explorerTotalPages || explorerLoadingData}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl disabled:opacity-40 font-bold transition flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Raw JSON Representation ({explorerRows.length} rows)</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(explorerRows, null, 2), 'explorer_raw_json')}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedKey === 'explorer_raw_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'explorer_raw_json' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[550px] leading-relaxed">
                  {JSON.stringify(explorerRows, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* MODAL: User Document JSON Inspector */}
        {selectedUserDoc && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Firebase Vault Document: users/{selectedUserDoc.id}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{selectedUserDoc.email || 'No email registered'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserDoc(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
                <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedUserDoc, null, 2)}
                </pre>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs text-amber-300">Isolated to users collection only</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedUserDoc, null, 2), 'modal_user_doc')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                    {copiedKey === 'modal_user_doc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === 'modal_user_doc' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <button
                    onClick={() => setSelectedUserDoc(null)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Data Table Row JSON Inspector */}
        {selectedRowDoc && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Table className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Record Details ({explorerSource}/{explorerTable})</h3>
                    <span className="text-[11px] text-slate-400 font-mono">Row ID: {selectedRowDoc.id || 'N/A'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRowDoc(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
                <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedRowDoc, null, 2)}
                </pre>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs text-slate-400">Queried from {explorerSource}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedRowDoc, null, 2), 'modal_row_doc')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                    {copiedKey === 'modal_row_doc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedKey === 'modal_row_doc' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <button
                    onClick={() => setSelectedRowDoc(null)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Table Data & Local Strings Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Delete Table Data & Local Strings
                    </h3>
                    <p className="text-xs text-slate-400">
                      Purge specific or all tables across databases and wipe local strings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
                {/* Database Selection */}
                <div>
                  <label className="block text-slate-300 font-bold mb-2">Target Storage System</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All Databases & Strings', desc: 'Supabase, PG, JSON, Firestore & Strings' },
                      { id: 'supabase', label: 'Supabase Cloud PG', desc: 'PostgreSQL public schema' },
                      { id: 'local_pg', label: 'Local PostgreSQL', desc: 'Local fallback database' },
                      { id: 'local_json', label: 'Local JSON DB', desc: 'local_db.json file' },
                      { id: 'firestore', label: 'Firebase Firestore', desc: 'Cloud Firestore collections' },
                      { id: 'local_strings', label: 'Local Strings', desc: 'OTP strings & config strings' }
                    ].map(db => (
                      <button
                        key={db.id}
                        type="button"
                        onClick={() => setDeleteTargetDb(db.id as any)}
                        className={`p-3 text-left rounded-xl border transition flex flex-col justify-between ${
                          deleteTargetDb === db.id
                            ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold text-xs">{db.label}</span>
                        <span className="text-[10px] text-slate-500 mt-1">{db.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Selection */}
                {deleteTargetDb !== 'local_strings' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 font-bold">Target Tables (Leave empty for All Tables)</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (deleteSelectedTables.length > 0) {
                            setDeleteSelectedTables([]);
                          } else {
                            setDeleteSelectedTables([
                              'profiles', 'errands', 'transactions', 'otp_codes',
                              'runner_applications', 'notifications', 'errand_chats',
                              'support_messages', 'featured_services', 'service_listings', 'settings'
                            ]);
                          }
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {deleteSelectedTables.length > 0 ? 'Clear Selection (Select All)' : 'Select Specific Tables'}
                      </button>
                    </div>

                    {deleteSelectedTables.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
                        {[
                          'profiles', 'errands', 'transactions', 'otp_codes',
                          'runner_applications', 'notifications', 'errand_chats',
                          'support_messages', 'featured_services', 'service_listings',
                          'settings', 'firebase_infrastructure'
                        ].map(tbl => {
                          const checked = deleteSelectedTables.includes(tbl);
                          return (
                            <label
                              key={tbl}
                              className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition ${
                                checked ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:bg-slate-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDeleteSelectedTables([...deleteSelectedTables, tbl]);
                                  } else {
                                    setDeleteSelectedTables(deleteSelectedTables.filter(t => t !== tbl));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-rose-600 focus:ring-rose-500"
                              />
                              <span className="font-mono text-[11px]">{tbl}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Safeguards & Options */}
                <div className="space-y-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-bold block mb-1">Execution Safeguards</span>

                  {/* Dry Run */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteDryRun}
                      onChange={(e) => setDeleteDryRun(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-slate-200 font-bold text-xs">Dry Run (Preview Only - Recommended)</span>
                      <p className="text-[10px] text-slate-400">Scans all target tables and calculates record counts without deleting anything.</p>
                    </div>
                  </label>

                  {/* Keep Admin Accounts */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteKeepAdmin}
                      onChange={(e) => setDeleteKeepAdmin(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-slate-200 font-bold text-xs">Preserve Admin Accounts</span>
                      <p className="text-[10px] text-slate-400">Prevents admin users in profiles/users collections from being wiped so you stay logged in.</p>
                    </div>
                  </label>

                  {/* Clear Local Storage */}
                  {(deleteTargetDb === 'all' || deleteTargetDb === 'local_strings') && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteClearLocalStorage}
                        onChange={(e) => setDeleteClearLocalStorage(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-slate-200 font-bold text-xs">Purge Browser LocalStorage Strings</span>
                        <p className="text-[10px] text-slate-400">Clears errand drafts, cached custom server URLs, and string tokens stored in browser localStorage.</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Confirmation Box if NOT dry run */}
                {!deleteDryRun && (
                  <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Permanent Data Deletion Warning</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      You are about to execute a live purge on <strong className="text-rose-400">{deleteTargetDb.toUpperCase()}</strong>.
                      To confirm this action, please type <code className="bg-slate-950 px-1 py-0.5 rounded text-white font-mono">DELETE</code> below:
                    </p>
                    <input
                      type="text"
                      placeholder='Type "DELETE" to confirm'
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-rose-500/50 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                {/* Quick Client LocalStorage Clean Button */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <span className="font-bold text-slate-300">Quick Browser LocalStorage Cleanup</span>
                    <p className="text-[10px] text-slate-400">Wipe errand_drafts and client tokens in this browser immediately</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      ['errand_drafts', 'custom_action_server_url', 'custom_gateway_url'].forEach(k => {
                        try { 
                          localStorage.removeItem(k); 
                        } catch (e: any) {
                          console.warn(`Could not remove ${k}:`, e?.message);
                        }
                      });
                      alert('Cleared browser localStorage strings successfully!');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
                  >
                    Clear LocalStorage
                  </button>
                </div>

                {/* Results Section */}
                {deleteResults && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        {deleteResults.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        {deleteResults.dryRun ? 'Dry-Run Simulation Report' : 'Live Purge Report'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        Target: {deleteResults.targetDb}
                      </span>
                    </div>

                    {deleteResults.error && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-[11px]">
                        {deleteResults.error}
                      </div>
                    )}

                    {deleteResults.results && (
                      <div className="space-y-2 font-mono text-[11px]">
                        {Object.entries(deleteResults.results).map(([k, v]: [string, any]) => (
                          <div key={k} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <div className="flex items-center justify-between font-bold text-slate-300 mb-1">
                              <span className="uppercase text-xs">{k}</span>
                              <span className={v?.success ? 'text-emerald-400' : 'text-rose-400'}>
                                {v?.success ? (deleteResults.dryRun ? 'SIMULATED' : 'SUCCESS') : (v?.error ? 'OFFLINE / ERROR' : 'SKIPPED')}
                              </span>
                            </div>
                            {v?.totalDeleted !== undefined && (
                              <p className="text-slate-400">
                                {deleteResults.dryRun ? 'Would delete:' : 'Deleted:'} <strong>{v.totalDeleted}</strong> records
                              </p>
                            )}
                            {v?.totalActions !== undefined && (
                              <p className="text-slate-400">
                                String cleanup actions: <strong>{v.totalActions}</strong>
                              </p>
                            )}
                            {v?.error && (
                              <p className="text-rose-400 text-[10px]">{v.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-slate-400 text-xs">
                  CLI Script: <code className="text-cyan-400 font-mono">npm run db:delete</code>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeleteTableData}
                    disabled={deleteExecuting || (!deleteDryRun && deleteConfirmText !== 'DELETE')}
                    className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg ${
                      deleteDryRun
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    } disabled:opacity-40`}
                  >
                    {deleteExecuting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : deleteDryRun ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Run Dry-Run Preview
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Execute Live Purge
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
