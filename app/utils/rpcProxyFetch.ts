/**
 * Utility to help with RPC access by patching fetch for Base RPC URLs
 * This helps avoid CORS and rate limiting issues
 */

// List of fallback RPC endpoints - NO HARDCODED API KEYS
const FALLBACK_RPC_ENDPOINTS = [
  'https://mainnet.base.org', // Public Base RPC
  'https://base.llamarpc.com', // Public alternative
];

/**
 * Install the RPC proxy to intercept blockchain requests
 */
export function installRpcProxyFetch() {
  if (typeof window === 'undefined') return; // Only run in browser
  
  console.log('Installing RPC proxy for Base blockchain calls');
  
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let method = init?.method || 'GET';
    
    // Only process POST requests (RPC calls)
    if (method === 'POST' && typeof url === 'string') {
      // Check if this is a request to a Base RPC endpoint
      if (FALLBACK_RPC_ENDPOINTS.some(endpoint => url.includes(endpoint.trim()))) {
        console.log('Intercepting request to Base RPC endpoint:', url);
        
        try {
          // Get the request body
          const body = init?.body ? 
            (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : 
            null;
          
          if (body) {
            // Use our proxy endpoint instead
            const proxyUrl = `/api/rpc`;
            console.log(`Redirecting RPC to proxy: ${proxyUrl}`);
            
            // Preserve the body but send to our proxy
            return originalFetch(proxyUrl, {
              ...init,
              body: JSON.stringify(body)
            });
          }
        } catch (error) {
          console.error('Error processing RPC proxy:', error);
          // Fall back to original request if there's an error
          return originalFetch(input, init);
        }
      }
    }
    
    // Otherwise, use the original fetch
    return originalFetch(input, init);
  };
  
  // Also patch XMLHttpRequest for older libraries
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(
    method: string, 
    url: string | URL, 
    async: boolean = true, 
    username?: string | null, 
    password?: string | null
  ) {
    let urlString = url.toString();
    
    // Only process POST requests to RPC endpoints
    if (method.toUpperCase() === 'POST' && FALLBACK_RPC_ENDPOINTS.some(endpoint => urlString.includes(endpoint.trim()))) {
      console.log('Intercepting XHR to Base RPC endpoint:', urlString);
      
      // Use our proxy endpoint instead
      const proxyUrl = `/api/rpc`;
      console.log(`Redirecting XHR to proxy: ${proxyUrl}`);
      
      // We can't modify the body here, but at least change the URL
      return originalXhrOpen.call(this, method, proxyUrl, async, username, password);
    }
    
    // Otherwise, use the original open
    return originalXhrOpen.call(this, method, url, async, username, password);
  };
}

/**
 * Uninstall the RPC proxy
 */
export function uninstallRpcProxyFetch() {
  if (typeof window === 'undefined' || !window._originalFetch) return;
  
  console.log('Uninstalling RPC proxy');
  
  window.fetch = window._originalFetch;
  delete window._originalFetch;
  
  if (window._originalXhrOpen) {
    XMLHttpRequest.prototype.open = window._originalXhrOpen;
    delete window._originalXhrOpen;
  }
}

// Add type declaration for the global window object
declare global {
  interface Window {
    _originalFetch?: typeof fetch;
    _originalXhrOpen?: any;
  }
} 