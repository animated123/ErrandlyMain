// Client-side session rate limit interceptor and toast notifications
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_side';
  let sessionId = sessionStorage.getItem('errand_session_id');
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    sessionStorage.setItem('errand_session_id', sessionId);
  }
  return sessionId;
}

let toastContainer: HTMLDivElement | null = null;

function showRateLimitToast(message: string, retryAfterSec: number) {
  if (typeof document === 'undefined') return;

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'rate-limit-toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-amber-500/30 backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300';
  
  toast.innerHTML = `
    <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-base mt-0.5 border border-amber-500/30">
      ⚡
    </div>
    <div class="flex-1 text-xs">
      <div class="font-bold text-amber-400 flex items-center justify-between">
        <span>Session Rate Limit Active</span>
        <span class="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30 font-bold">${retryAfterSec}s pause</span>
      </div>
      <p class="text-slate-300 mt-1 leading-relaxed">${message || 'You have reached the maximum allowed requests for this session. Please wait a few seconds to protect host and database performance.'}</p>
    </div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, Math.max(retryAfterSec * 1000, 4000));
}

export function initClientRateLimiter() {
  if (typeof window === 'undefined') return;
  if ((window as any).__rateLimiterInitialized) return;
  (window as any).__rateLimiterInitialized = true;

  if (!window.fetch) return;
  const originalFetch = window.fetch.bind(window);

  const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const sessionId = getSessionId();
    const options: RequestInit = init ? { ...init } : {};

    const headers = new Headers(options.headers || {});
    if (!headers.has('x-session-id')) {
      headers.set('x-session-id', sessionId);
    }
    options.headers = headers;

    const response = await originalFetch(input, options);

    if (response.status === 429) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        const retryAfter = data.retryAfterSeconds || parseInt(response.headers.get('Retry-After') || '15', 10);
        showRateLimitToast(data.message, retryAfter);
        
        window.dispatchEvent(new CustomEvent('session-rate-limit-exceeded', {
          detail: { message: data.message, retryAfterSeconds: retryAfter, tier: data.tier }
        }));
      } catch (_) {
        showRateLimitToast('Session call limit reached. Please pause for a moment.', 15);
      }
    }

    return response;
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: interceptedFetch,
      configurable: true,
      writable: true,
    });
  } catch (e1) {
    try {
      (window as any).fetch = interceptedFetch;
    } catch (e2) {
      console.warn('[RateLimiter Client] Unable to attach global fetch interceptor:', e2);
    }
  }

  console.log(`[RateLimiter Client] Initialized with session ID: ${getSessionId()}`);
}
