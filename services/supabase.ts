import { createClient } from '@supabase/supabase-js';
import { API_BASE_URL } from './apiConfig';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  'https://ksflmdvqvseiprebgrcp.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZmxtZHZxdnNlaXByZWJncmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODI1MzIsImV4cCI6MjA5MDU1ODUzMn0.kugwrWw_J8qXY9b037qOgvMLTcyTRu4Wo0Ji13YFA8c';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    enabled: false
  }
});

const getHeaders = () => {
  const token = localStorage.getItem('errand_runner_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

function buildClientPostgrestBuilder(tableName: string, chainCalls: any[] = []): any {
  const builder: any = {};

  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'match',
    'single', 'maybeSingle', 'limit', 'order', 'or', 'in'
  ];

  for (const method of methods) {
    builder[method] = function(...args: any[]) {
      chainCalls.push({ method, args });
      return buildClientPostgrestBuilder(tableName, chainCalls);
    };
  }

  builder.then = async function(onfulfilled?: any, onrejected?: any) {
    try {
      // Deconstruct chain calls to query / body / match for /api/db/
      let queryVal = '*';
      let bodyVal: any = null;
      let matchVal: any = {};
      let orVal: string | null = null;
      let inVal: { column: string; values: any[] } | null = null;
      let action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';

      for (const call of chainCalls) {
        const { method, args } = call;
        if (method === 'select') {
          action = 'select';
          if (args[0]) queryVal = args[0];
        } else if (method === 'insert') {
          action = 'insert';
          bodyVal = args[0];
        } else if (method === 'update') {
          action = 'update';
          bodyVal = args[0];
        } else if (method === 'upsert') {
          action = 'upsert';
          bodyVal = args[0];
        } else if (method === 'delete') {
          action = 'delete';
        } else if (method === 'eq') {
          matchVal[args[0]] = args[1];
        } else if (method === 'or') {
          orVal = args[0];
        } else if (method === 'in') {
          inVal = { column: args[0], values: args[1] };
        } else if (method === 'match') {
          if (args[0] && typeof args[0] === 'object') {
            matchVal = { ...matchVal, ...args[0] };
          }
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/db/${tableName}/${action}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          query: queryVal,
          body: bodyVal,
          match: Object.keys(matchVal).length > 0 ? matchVal : undefined,
          or: orVal || undefined,
          in: inVal || undefined,
          chainCalls: chainCalls
        })
      });

      if (!response.ok) {
        throw new Error(`Database action ${action} failed: ${response.statusText}`);
      }

      let resData: any = {};
      try {
        resData = await response.json();
      } catch (e) {
        resData = {};
      }

      let errObj: any = null;
      if (resData && resData.error) {
        if (typeof resData.error === 'string' && resData.error.trim()) {
          errObj = { message: resData.error };
        } else if (typeof resData.error === 'object' && Object.keys(resData.error).length > 0 && resData.error.message) {
          errObj = { message: resData.error.message };
        }
      }

      const dataVal = resData.data !== undefined ? resData.data : null;
      const countVal = Array.isArray(dataVal) ? dataVal.length : (dataVal ? 1 : 0);

      // Emulate Supabase Response returning { data, count, error }
      const supabaseResult = { data: dataVal, count: countVal, error: errObj };
      if (onfulfilled) return onfulfilled(supabaseResult);
      return supabaseResult;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const supabaseResult = { data: null, count: 0, error: { message: errMsg } };
      if (onrejected) return onrejected(supabaseResult);
      if (onfulfilled) return onfulfilled(supabaseResult);
      return supabaseResult;
    }
  };

  return builder;
}

export const supabase: any = new Proxy(supabaseClient, {
  get(target: any, prop: string | symbol) {
    if (prop === 'from') {
      return function(tableName: string) {
        return buildClientPostgrestBuilder(tableName);
      };
    }
    const val = target[prop];
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});

