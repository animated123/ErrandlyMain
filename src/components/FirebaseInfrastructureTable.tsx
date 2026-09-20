import React, { useState, useMemo } from 'react';
import { 
  Cloud, Database, Key, ShieldCheck, RefreshCw, Sparkles, 
  Save, Eye, EyeOff, Copy, Check, Radio, HardDrive, 
  Layers, Search, CheckCircle2, AlertTriangle, ExternalLink,
  Activity, Sliders, ChevronDown, ChevronUp, Zap, Clock
} from 'lucide-react';

export interface InfrastructureFieldMeta {
  key: string;
  label: string;
  description: string;
  type: string;
  secret: boolean;
  category: string;
  source: string;
  options?: string[];
}

export interface FirebaseInfrastructureTableProps {
  infrastructure: any;
  fieldsMeta: InfrastructureFieldMeta[];
  dirtyFields: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  onSaveAll: () => Promise<void>;
  onSaveSingle: (key: string, value: any) => Promise<void>;
  onQuickFill: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onTestLive: () => Promise<void>;
  isSaving: boolean;
  isQuickFilling: boolean;
  isLoading: boolean;
  isTestingLive: boolean;
  singleSavingKey: string | null;
  liveLatency: number | null;
  realtimeConnected: boolean;
  realtimeEvents: Array<{ type: string; timestamp: string; text: string }>;
  copyToClipboard: (text: string, key: string) => void;
  copiedKey: string | null;
}

export const FirebaseInfrastructureTable: React.FC<FirebaseInfrastructureTableProps> = ({
  infrastructure,
  fieldsMeta,
  dirtyFields,
  onFieldChange,
  onSaveAll,
  onSaveSingle,
  onQuickFill,
  onRefresh,
  onTestLive,
  isSaving,
  isQuickFilling,
  isLoading,
  isTestingLive,
  singleSavingKey,
  liveLatency,
  realtimeConnected,
  realtimeEvents,
  copyToClipboard,
  copiedKey
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [showEventLog, setShowEventLog] = useState<boolean>(true);

  // Toggle secret visibility for a specific row
  const toggleSecret = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Distinct categories available in metadata
  const categories = useMemo(() => {
    const set = new Set<string>();
    fieldsMeta.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [fieldsMeta]);

  // Filter fields based on category and search
  const filteredFields = useMemo(() => {
    return fieldsMeta.filter(field => {
      const matchesCategory = categoryFilter === 'all' || field.category.toLowerCase() === categoryFilter.toLowerCase();
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        field.label.toLowerCase().includes(term) ||
        field.key.toLowerCase().includes(term) ||
        field.description.toLowerCase().includes(term) ||
        field.category.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [fieldsMeta, categoryFilter, searchTerm]);

  // Total dirty count
  const dirtyCount = Object.keys(dirtyFields).length;

  const getCategoryBadgeClass = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cloud core':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/70';
      case 'database':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/70';
      case 'credentials':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/70';
      case 'authentication':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70';
      case 'sync engine':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/70';
      case 'storage':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/70';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Infrastructure Action Bar & Real-Time SSE Monitor */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-black text-white tracking-tight">Firebase Infrastructure Table</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800">
                    Real-Time Synchronization
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Fill infrastructure values, manage Firestore credentials, and broadcast configuration settings in real time across the server and database cluster.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            {/* Quick Fill Button */}
            <button
              onClick={onQuickFill}
              disabled={isQuickFilling}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
              title="Automatically detect cloud environment parameters and fill the table"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isQuickFilling ? 'animate-spin' : 'text-amber-200'}`} />
              {isQuickFilling ? 'Detecting...' : 'Quick Fill Infrastructure'}
            </button>

            {/* Test Ping Live */}
            <button
              onClick={onTestLive}
              disabled={isTestingLive}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
              title="Test real-time connectivity and latency to Firebase"
            >
              <Activity className={`w-3.5 h-3.5 ${isTestingLive ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              {isTestingLive ? 'Pinging...' : 'Ping Live'}
              {liveLatency !== null && (
                <span className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-emerald-400">
                  {liveLatency}ms
                </span>
              )}
            </button>

            {/* Refresh from Server */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
              title="Reload current configuration from database and config file"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              Reload
            </button>

            {/* Save All in Real Time */}
            <button
              onClick={onSaveAll}
              disabled={isSaving || dirtyCount === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition ${
                dirtyCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              {isSaving ? 'Broadcasting...' : dirtyCount > 0 ? `Save ${dirtyCount} in Real Time` : 'Saved in Real Time'}
            </button>
          </div>
        </div>

        {/* Real-Time Status Tiers Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className={`p-2 rounded-xl ${realtimeConnected ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'}`}>
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Real-Time Stream (SSE)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className={`font-bold ${realtimeConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {realtimeConnected ? 'Streaming Live' : 'Connecting Stream...'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Firestore Database ID</span>
              <span className="font-mono font-bold text-blue-300 truncate block max-w-[180px]" title={infrastructure?.firestore_database_id}>
                {infrastructure?.firestore_database_id || '(default)'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Google Cloud Project</span>
              <span className="font-mono font-bold text-amber-300 truncate block max-w-[180px]" title={infrastructure?.project_id}>
                {infrastructure?.project_id || 'Not configured'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Target Persistence</span>
              <span className="font-bold text-purple-300 block">
                Config JSON + PG + Firestore
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
              categoryFilter === 'all'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Fields ({fieldsMeta.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition capitalize ${
                categoryFilter === cat
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parameter, key, or category..."
            className="w-full pl-9.5 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
        </div>
      </div>

      {/* The Infrastructure Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Component & Key</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4 min-w-[320px]">Live Real-Time Value</th>
                <th className="py-4 px-4">Destinations</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredFields.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No infrastructure properties matched the selected category or search filter.
                  </td>
                </tr>
              ) : (
                filteredFields.map((field) => {
                  const currentValue = dirtyFields[field.key] !== undefined 
                    ? dirtyFields[field.key] 
                    : (infrastructure ? infrastructure[field.key] : '');
                  const isDirty = dirtyFields[field.key] !== undefined;
                  const isSavingThis = singleSavingKey === field.key;
                  const isSecret = field.secret;
                  const showSecret = visibleSecrets[field.key] || false;

                  return (
                    <tr key={field.key} className={`hover:bg-slate-800/40 transition ${isDirty ? 'bg-amber-950/10' : ''}`}>
                      {/* Component & Key */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{field.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800">
                              {field.key}
                            </code>
                            <button
                              onClick={() => copyToClipboard(field.key, `key-${field.key}`)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Copy property key"
                            >
                              {copiedKey === `key-${field.key}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-tight max-w-sm">
                            {field.description}
                          </p>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(field.category)}`}>
                          {field.category}
                        </span>
                      </td>

                      {/* Interactive Configuration Input */}
                      <td className="py-4 px-4">
                        {field.type === 'boolean' ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => onFieldChange(field.key, !currentValue)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                currentValue ? 'bg-emerald-600' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  currentValue ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-semibold ${currentValue ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {currentValue ? 'Enabled (Active)' : 'Disabled'}
                            </span>
                          </div>
                        ) : field.type === 'select' && field.options ? (
                          <select
                            value={String(currentValue || '')}
                            onChange={(e) => onFieldChange(field.key, e.target.value)}
                            className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-white font-mono focus:outline-none ${
                              isDirty ? 'border-amber-500 shadow-sm shadow-amber-500/20' : 'border-slate-800 focus:border-amber-500/60'
                            }`}
                          >
                            {field.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => onFieldChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                              className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-white font-mono focus:outline-none ${
                                isDirty ? 'border-amber-500 shadow-sm shadow-amber-500/20' : 'border-slate-800 focus:border-amber-500/60'
                              }`}
                            />
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {field.key.includes('seconds') ? 'sec' : field.key.includes('days') ? 'days' : 'unit'}
                            </span>
                          </div>
                        ) : (
                          <div className="relative flex items-center">
                            <input
                              type={isSecret && !showSecret ? 'password' : 'text'}
                              value={String(currentValue ?? '')}
                              onChange={(e) => onFieldChange(field.key, e.target.value)}
                              placeholder={`Enter ${field.label}...`}
                              className={`w-full pl-3 pr-16 py-2 bg-slate-950 border rounded-xl text-xs text-white font-mono focus:outline-none ${
                                isDirty ? 'border-amber-500 shadow-sm shadow-amber-500/20' : 'border-slate-800 focus:border-amber-500/60'
                              }`}
                            />
                            <div className="absolute right-2 flex items-center gap-1">
                              {isSecret && (
                                <button
                                  type="button"
                                  onClick={() => toggleSecret(field.key)}
                                  className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                  title={showSecret ? 'Hide secret' : 'Reveal secret'}
                                >
                                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(String(currentValue || ''), `val-${field.key}`)}
                                className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                title="Copy value to clipboard"
                              >
                                {copiedKey === `val-${field.key}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Target Destinations */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-300 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {field.source}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            PostgreSQL & Local DB
                          </span>
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isDirty ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            Modified (Unsaved)
                          </span>
                        ) : currentValue ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 justify-center w-fit mx-auto">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Active & Live
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Empty
                          </span>
                        )}
                      </td>

                      {/* Real-Time Row Action */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSaveSingle(field.key, currentValue)}
                          disabled={isSavingThis}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                            isDirty
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                          title="Save this specific setting and broadcast across SSE cluster"
                        >
                          {isSavingThis ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                          ) : (
                            <Zap className="w-3 h-3 text-amber-300" />
                          )}
                          {isSavingThis ? 'Syncing...' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live SSE Real-Time Event Stream Log */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-600/20 text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Real-Time SSE Event Stream Activity
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Live Feed
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Incoming broadcast pulses, cluster synchronization signals, and infrastructure update notices.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowEventLog(!showEventLog)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
          >
            {showEventLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showEventLog && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-800/40">
            {realtimeEvents.length === 0 ? (
              <div className="text-slate-500 py-3 text-center">
                Listening for real-time SSE broadcasts... Any configuration changes will appear here instantly.
              </div>
            ) : (
              realtimeEvents.map((ev, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      ev.type === 'UPDATED' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {ev.type}
                    </span>
                    <span className="text-slate-300">{ev.text}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
