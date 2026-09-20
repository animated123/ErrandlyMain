const isCapacitor = typeof window !== 'undefined' && (
  (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:') ||
  ((window as any).Capacitor !== undefined && window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
);

export const DEFAULT_GATEWAY_URL = 'https://gateway.errandly.site';
export const DEFAULT_SITE_URL = 'https://errandly.site';

let envMainServerUrl = '';
let envActionServerUrl = '';
let envGatewayUrl = '';
let envSiteUrl = '';
let envAuthRedirectUrl = '';

try {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    envMainServerUrl = (import.meta as any).env.VITE_MAIN_SERVER_URL || '';
    envActionServerUrl = (import.meta as any).env.VITE_ACTION_SERVER_URL || '';
    envGatewayUrl = (import.meta as any).env.VITE_GATEWAY_URL || '';
    envSiteUrl = (import.meta as any).env.VITE_SITE_URL || '';
    envAuthRedirectUrl = (import.meta as any).env.VITE_AUTH_REDIRECT_URL || '';
  }
} catch (e) {
  // Silent fallback if import.meta is unavailable
}

// GATEWAY_URL points to the primary Errandly API Gateway
export const getGatewayUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('custom_gateway_url') || localStorage.getItem('custom_action_server_url');
    if (saved && saved.trim()) {
      let clean = saved.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      return clean;
    }
  }
  return (envGatewayUrl || envActionServerUrl || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');
};

export const GATEWAY_URL = getGatewayUrl();

// AUTH_REDIRECT_URL: Destination after OAuth authentication (Google, Supabase)
// Redirects to https://errandly.site instead of localhost:3000
export const getAuthRedirectUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('custom_site_url') || localStorage.getItem('custom_auth_redirect_url');
    if (saved && saved.trim()) {
      let clean = saved.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      return clean;
    }

    const origin = window.location.origin;
    // When running locally on localhost:3000, 127.0.0.1, or mobile Capacitor/file: schemes,
    // explicitly route OAuth callbacks to errandly.site
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('file:') || origin.startsWith('capacitor:')) {
      return (envAuthRedirectUrl || envSiteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
    }

    return (envAuthRedirectUrl || envSiteUrl || origin || DEFAULT_SITE_URL).replace(/\/+$/, '');
  }
  return (envAuthRedirectUrl || envSiteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
};

export const AUTH_REDIRECT_URL = getAuthRedirectUrl();

// API_BASE_URL:
// On web, relative path "" routes through the local Express backend (server.ts) on the same origin.
// On Capacitor / native mobile, use the main server URL or gateway URL.
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const customBackend = localStorage.getItem('custom_main_server_url');
    if (customBackend && customBackend.trim()) {
      let clean = customBackend.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      return clean;
    }
  }

  if (isCapacitor) {
    return (envMainServerUrl || envGatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/+$/, '');
  }

  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// ACTION_SERVER_URL points to the action server / API gateway (gateway.errandly.site)
export const getActionServerUrl = (): string => {
  return getGatewayUrl();
};

export const ACTION_SERVER_URL = getActionServerUrl();


