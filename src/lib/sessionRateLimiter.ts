
// Client-side session rate limit interceptor and sync queue
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_side';
  let sessionId = sessionStorage.getItem('errand_session_id');
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    sessionStorage.setItem('errand_session_id', sessionId);
  }
  return sessionId;
}

// In-memory queue for requests that failed due to rate limiting
// We use in-memory to support non-serializable bodies like FormData/Blob
interface QueuedRequest {
  input: RequestInfo | URL;
  init?: RequestInit;
  retryAfter: number;
  attempts: number;
}

const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  console.log(`[RateLimiter] Syncing ${requestQueue.length} queued requests...`);

  while (requestQueue.length > 0) {
    const request = requestQueue[0];
    
    // Wait for the requested duration
    await new Promise(resolve => setTimeout(resolve, request.retryAfter * 1000));

    try {
      const response = await fetch(request.input, request.init);
      if (response.status === 429) {
        // Still rate limited, increase backoff and keep in queue
        request.attempts++;
        request.retryAfter = Math.min(request.retryAfter * 1.5, 60);
        console.warn(`[RateLimiter] Still rate limited. Attempt ${request.attempts}. Retrying in ${request.retryAfter}s`);
        break; // Stop processing and wait for next interval
      } else {
        // Success! Remove from queue
        requestQueue.shift();
        console.log(`[RateLimiter] Successfully synced request to ${request.input}`);
      }
    } catch (err) {
      console.error('[RateLimiter] Failed to sync request:', err);
      // Remove if too many failures, or keep retrying?
      if (request.attempts > 5) {
        requestQueue.shift();
      } else {
        request.attempts++;
        break;
      }
    }
  }

  isProcessingQueue = false;
  if (requestQueue.length > 0) {
    setTimeout(processQueue, 5000); // Check again in 5s
  }
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

    const urlStr = input.toString();
    const isLocalApi = urlStr.startsWith('/') || urlStr.startsWith(window.location.origin) || urlStr.includes('/api/');

    if (isLocalApi) {
      const headers = new Headers(options.headers || {});
      if (!headers.has('x-session-id')) {
        headers.set('x-session-id', sessionId);
      }
      options.headers = headers;
    }

    try {
      const response = await originalFetch(input, options);

      if (isLocalApi && response.status === 429) {
        const data = await response.clone().json().catch(() => ({}));
        const retryAfter = data.retryAfterSeconds || parseInt(response.headers.get('Retry-After') || '15', 10);
        
        const isSelect = urlStr.includes('/select') || (options.method && options.method.toUpperCase() === 'GET');

        if (!isSelect) {
          console.warn(`[RateLimiter] Rate limit exceeded. Queueing mutative request for ${input}`);
          // Queue the request for background sync
          requestQueue.push({
            input,
            init: options,
            retryAfter,
            attempts: 1
          });

          // Start background processing
          if (!isProcessingQueue) {
            setTimeout(processQueue, 100);
          }

          // Return a "fake" successful response to the UI to avoid errors, 
          // since we've queued it for eventual success.
          return new Response(JSON.stringify({ 
            status: 'queued', 
            message: 'Request rate limited, queued for background sync',
            retryAfter 
          }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          console.warn(`[RateLimiter] Rate limit exceeded for read request ${input}. Returning safe empty state.`);
          // For reads, return a safe empty array to prevent UI crashes on .map()
          return new Response(JSON.stringify({ 
            data: [], 
            count: 0,
            error: null,
            retryAfter 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      return response;
    } catch (err) {
      // If it's a network error, we could also queue it
      if (isLocalApi && err instanceof TypeError && err.message === 'Failed to fetch') {
        const isSelect = urlStr.includes('/select') || (options.method && options.method.toUpperCase() === 'GET');

        if (!isSelect) {
          console.warn(`[RateLimiter] Connection lost. Queueing mutative request for ${input}`);
          requestQueue.push({
            input,
            init: options,
            retryAfter: 5,
            attempts: 1
          });
          if (!isProcessingQueue) {
            setTimeout(processQueue, 5000);
          }
          return new Response(JSON.stringify({ status: 'queued', message: 'Offline, queued for sync' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          console.warn(`[RateLimiter] Connection lost for read request ${input}. Returning safe empty state.`);
          return new Response(JSON.stringify({ 
            data: [], 
            count: 0,
            error: { message: `You appear to be offline.` }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      throw err;
    }
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

  console.log(`[RateLimiter Client] Initialized with session ID: ${getSessionId()}. Background sync active.`);
}
