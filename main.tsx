import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './src/components/ErrorBoundary'
import './src/index.css'
import { initClientRateLimiter } from './src/lib/sessionRateLimiter'

// Initialize Client Session Rate Limiter Interceptor
initClientRateLimiter();

if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    console.error("Google Maps Authentication/Target Blocked error detected!");
    const event = new CustomEvent('google-maps-auth-failure');
    window.dispatchEvent(event);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
