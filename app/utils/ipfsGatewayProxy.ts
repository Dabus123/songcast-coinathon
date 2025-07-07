/**
 * Utility to help with IPFS gateway access
 * This patches the fetch API to intercept requests to problematic gateways
 */

// The problematic gateway URL pattern
const PROBLEMATIC_GATEWAY = 'magic.decentralized-content.com/ipfs/';

/**
 * Extract CID from an IPFS gateway URL
 */
function extractCidFromUrl(url: string): string | null {
  // Check if this is an IPFS gateway URL
  if (url.includes('/ipfs/')) {
    // Extract the CID
    const parts = url.split('/ipfs/');
    if (parts.length > 1) {
      // Handle any query parameters or path segments after the CID
      return parts[1].split(/[?#\/]/)[0];
    }
  }
  return null;
}

/**
 * Install the IPFS gateway proxy to intercept problematic gateway requests
 */
export function installIpfsGatewayProxy() {
  if (typeof window === 'undefined') return; // Only run in browser
  
  console.log('Installing IPFS gateway proxy');
  
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // If this is a request to the problematic gateway
    if (url.includes(PROBLEMATIC_GATEWAY)) {
      console.log('Intercepting request to problematic gateway:', url);
      
      // Extract the CID
      const cid = extractCidFromUrl(url);
      
      if (cid) {
        // Redirect to our proxy API
        const proxyUrl = `/api/metadata?cid=${cid}`;
        console.log(`Redirecting to proxy: ${proxyUrl}`);
        
        // Use original fetch with our proxy URL
        return originalFetch(proxyUrl, init);
      }
    }
    
    // Otherwise, use the original fetch
    return originalFetch(input, init);
  };
  
  // Also patch XMLHttpRequest to handle cases where fetch isn't used
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(
    method: string, 
    url: string | URL, 
    async: boolean = true, 
    username?: string | null, 
    password?: string | null
  ) {
    let urlString = url.toString();
    
    // If this is a request to the problematic gateway
    if (urlString.includes(PROBLEMATIC_GATEWAY)) {
      console.log('Intercepting XHR to problematic gateway:', urlString);
      
      // Extract the CID
      const cid = extractCidFromUrl(urlString);
      
      if (cid) {
        // Redirect to our proxy API
        const proxyUrl = `/api/metadata?cid=${cid}`;
        console.log(`Redirecting XHR to proxy: ${proxyUrl}`);
        
        // Use modified URL
        return originalXhrOpen.call(this, method, proxyUrl, async, username, password);
      }
    }
    
    // Otherwise, use the original open
    return originalXhrOpen.call(this, method, url, async, username, password);
  };
}

/**
 * Store metadata in the cache for a specific CID
 */
export function cacheMetadata(cid: string, metadata: any) {
  if (typeof window === 'undefined') return; // Only run in browser
  
  if (!window.ipfsMetadataCache) {
    window.ipfsMetadataCache = new Map();
  }
  
  window.ipfsMetadataCache.set(cid, metadata);
  console.log(`Cached metadata for CID: ${cid}`);
}

// Add type declaration for the global window object
declare global {
  interface Window {
    ipfsMetadataCache: Map<string, any>;
  }
} 