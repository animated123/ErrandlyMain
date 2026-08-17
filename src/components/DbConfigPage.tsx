import React, { useState, useEffect } from 'react';
import { Database, Shield, CheckCircle, XCircle, RefreshCw, Server, ArrowLeft } from 'lucide-react';

export default function DbConfigPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('errandly');
  const [actionServerUrl, setActionServerUrl] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dbconfig/status');
      const data = await res.json();
      setStatus(data);
      if (data.config) {
        setHost(data.config.host || '');
        setPort(String(data.config.port || '5432'));
        setUser(data.config.user || '');
        setDatabase(data.config.database || 'errandly');
      }
      if (data.actionServerUrl) {
        setActionServerUrl(data.actionServerUrl);
      }
    } catch (err) {
      console.error('Failed to load DB config status:', err);
      setAlert({ type: 'error', message: 'Failed to contact backend API.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    try {
      const res = await fetch('/api/dbconfig/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: parseInt(port), user, password, database, actionServerUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ type: 'success', message: 'Configuration saved and connection succeeded! Database schema initialized & Action Server bound.' });
        setStatus({
          connected: true,
          config: { host, port, user, database, hasPassword: !!password },
          actionServerUrl: data.actionServerUrl || actionServerUrl,
          error: null
        });
      } else {
        setAlert({ 
          type: 'error', 
          message: `Configuration saved, but connection failed or offline: ${data.error || 'Unknown error'}. Local Standby DB Fallback is active.` 
        });
        setStatus({
          connected: false,
          config: { host, port, user, database, hasPassword: !!password },
          actionServerUrl: data.actionServerUrl || actionServerUrl,
          error: data.error
        });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to submit configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center justify-between">
            <a href="/" className="inline-flex items-center text-sm text-sky-600 hover:text-sky-700 transition">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to App
            </a>
            <div className="flex items-center gap-2">
              <a 
                href="/connectionadmin" 
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Server className="w-3.5 h-3.5" /> /connectionadmin
              </a>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-sky-50 text-sky-600">
                <Database className="h-5 w-5" />
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Database Settings
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Configure local PostgreSQL server for the VPS environment.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
            <span className="text-slate-500 text-sm">Querying database driver status...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Panel */}
            <div className={`p-4 rounded-xl border ${status?.connected ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {status?.connected ? (
                    <CheckCircle className="h-5 h-5 text-emerald-600" />
                  ) : (
                    <Server className="h-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold tracking-wide">
                    {status?.connected ? '✓ Database Connected' : '● Database Standby Fallback'}
                  </h3>
                  <div className="mt-1 text-xs opacity-90 space-y-1">
                    <p>
                      {status?.connected 
                        ? `Live connection is active to schema "${status.config.database}"`
                        : 'Currently running on local Stand-by JSON standalone database. Real-time changes are secure but localized.'}
                    </p>
                    {status?.error && (
                      <p className="font-mono text-[10px] bg-amber-100 p-1.5 rounded text-amber-900 break-words mt-2 max-h-24 overflow-y-auto">
                        {status.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {alert && (
              <div className={`p-4 rounded-xl border text-sm ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {alert.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{alert.message}</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="rounded-md space-y-3">
                <div>
                  <label htmlFor="host" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Database Host
                  </label>
                  <input
                    id="host"
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors"
                    placeholder="localhost or 127.0.0.1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label htmlFor="database" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Database Name
                    </label>
                    <input
                      id="database"
                      type="text"
                      required
                      value={database}
                      onChange={(e) => setDatabase(e.target.value)}
                      className="appearance-none relative block w-full px-3 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors"
                      placeholder="errandly"
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="port" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Port
                    </label>
                    <input
                      id="port"
                      type="text"
                      required
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="appearance-none relative block w-full px-3 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors"
                      placeholder="5432"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="user" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Postgres Username
                  </label>
                  <input
                    id="user"
                    type="text"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors"
                    placeholder="postgres"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Database Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <label htmlFor="actionServerUrl" className="block text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" /> Notification & Action Server URL
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Directs SMS, transactional emails, and external webhooks to your Action Engine.
                  </p>
                  <input
                    id="actionServerUrl"
                    type="text"
                    required
                    value={actionServerUrl}
                    onChange={(e) => setActionServerUrl(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm transition-colors font-mono text-xs"
                    placeholder="http://localhost:5005"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center">
                      <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Saving Configuration...
                    </span>
                  ) : (
                    'Save System Configuration'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="max-w-md w-full mx-auto mt-4 text-center">
        <span className="inline-flex items-center text-[11px] text-slate-400 font-medium">
          <Shield className="w-3.5 h-3.5 mr-1" /> Errandly Self-Hosted Control Center
        </span>
      </div>
    </div>
  );
}
