import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Database, Server, Shield, Lock, CheckCircle2, XCircle, 
  RefreshCw, Play, Terminal, Activity, FileText, Download, 
  Trash2, Eye, EyeOff, Save, Globe, Cpu, AlertTriangle, 
  ArrowLeft, Send, Search, Copy, Check, ExternalLink, HardDrive, 
  Layers, Clock, Filter, Radio
} from 'lucide-react';

interface ConnectionAdminStatus {
  database: {
    connected: boolean;
    error: string | null;
    latencyMs: number | null;
    config: {
      host: string;
      port: number;
      user: string;
      database: string;
      hasPassword: boolean;
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

export default function ConnectionAdminPage({ onBackToHome }: { onBackToHome?: () => void }) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!sessionStorage.getItem('connectionadmin_token');
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'db' | 'actionserver' | 'logs' | 'query' | 'apicall'>('db');

  // Overall status data
  const [status, setStatus] = useState<ConnectionAdminStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // DB Config Form
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbName, setDbName] = useState('');
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [dbUpdating, setDbUpdating] = useState(false);
  const [dbUpdateMsg, setDbUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('connectionadmin_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Auth Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/connectionadmin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem('connectionadmin_token', data.token);
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(data.error || 'Authentication failed. Please verify password in .env (Connectionadmin).');
      }
    } catch (err: any) {
      setAuthError('Connection error: ' + (err.message || 'Unable to contact backend server.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('connectionadmin_token');
    setIsAuthenticated(false);
    setStatus(null);
  }, []);

  // Fetch complete status
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/connectionadmin/status', {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data: ConnectionAdminStatus = await res.json();
      setStatus(data);
      setLastRefreshed(new Date());

      // Pre-fill edit forms
      if (data.database?.config) {
        setDbHost(data.database.config.host || '');
        setDbPort(String(data.database.config.port || '5432'));
        setDbUser(data.database.config.user || '');
        setDbName(data.database.config.database || '');
      }
      if (data.actionServer?.url) {
        setActionServerUrlInput(data.actionServer.url);
      }
    } catch (err: any) {
      setStatusError(err.message || 'Failed to fetch status');
    } finally {
      setLoadingStatus(false);
    }
  }, [handleLogout]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!sessionStorage.getItem('connectionadmin_token')) return;
    setLogsLoading(true);
    try {
      const res = await fetch('/api/connectionadmin/logs', {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [handleLogout]);

  // Save DB Config Live
  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbUpdating(true);
    setDbUpdateMsg(null);

    try {
      const res = await fetch('/api/connectionadmin/db/update', {
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
      const data = await res.json();
      if (res.ok && data.success) {
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

  // Save Action Server Live
  const handleSaveActionServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionServerUpdating(true);
    setActionServerPingMsg(null);

    try {
      const res = await fetch('/api/connectionadmin/action-server/update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actionServerUrl: actionServerUrlInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
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
      await fetch('/api/connectionadmin/logs/clear', {
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
      const res = await fetch('/api/connectionadmin/db/execute-query', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
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
      const res = await fetch('/api/connectionadmin/action-server/execute-call', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          method: apiMethod,
          path: apiEndpoint,
          headers: parsedHeaders,
          body: parsedBody
        })
      });
      const data = await res.json();
      setApiCallResult(data);
    } catch (err: any) {
      setApiCallResult({ error: err.message || 'API call execution failed' });
    } finally {
      setApiCallerLoading(false);
    }
  };

  // Auto-fetch on mount & authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      fetchLogs();
    }
  }, [isAuthenticated, fetchStatus, fetchLogs]);

  // Periodic log streamer
  useEffect(() => {
    if (!isAuthenticated || !autoRefreshLogs) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefreshLogs, fetchLogs]);

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    if (logLevelFilter !== 'all' && log.level !== logLevelFilter) return false;
    if (logSearch.trim()) {
      const search = logSearch.toLowerCase();
      return log.message.toLowerCase().includes(search) || log.timestamp.includes(search);
    }
    return true;
  });

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-indigo-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-900/90 border border-indigo-900/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex p-3.5 bg-indigo-950/80 border border-indigo-700/50 rounded-2xl text-indigo-400 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Connection Admin</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authenticate with your administrative password configured in <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-indigo-300">Connectionadmin</code> to access live database controls and action server pipelines.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Connectionadmin password..."
                  required
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Access Admin Console
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Main Application
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

            <button
              onClick={() => { fetchStatus(); fetchLogs(); }}
              disabled={loadingStatus}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              App
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-xl text-xs font-bold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Controls */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('db')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'db'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            1. Database & Live Config
          </button>

          <button
            onClick={() => setActiveTab('actionserver')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
              activeTab === 'actionserver'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            2. Action Server & Gateway
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
            3. Live Detailed Logs ({logs.length})
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
            4. Live DB Query Console
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
            5. Action Server / API Caller
          </button>
        </div>

        {/* TAB 1: DATABASE & LIVE CONFIG */}
        {activeTab === 'db' && (
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

        {/* TAB 2: ACTION SERVER & GATEWAY */}
        {activeTab === 'actionserver' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQueryViewMode('table')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${queryViewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setQueryViewMode('json')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${queryViewMode === 'json' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    JSON View
                  </button>
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
      </main>
    </div>
  );
}
