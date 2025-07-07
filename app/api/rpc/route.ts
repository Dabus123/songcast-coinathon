import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache RPC responses by request content hash
const rpcCache = new Map<string, { data: any, timestamp: number }>();

// Track request counts for rate limiting
const requestCounts = {
  count: 0,
  lastReset: Date.now()
};

// Rate limits
const RATE_LIMIT = 100000; // requests per minute
const CACHE_TTL = 30 * 1000; // 30 seconds cache lifetime

// Note: No hardcoded fallback endpoints to prevent API key leaks
// All RPC endpoints must be configured via environment variables
const FALLBACK_RPC_ENDPOINTS: string[] = [];

/**
 * Simple hash function for requests
 */
function hashRequest(data: any): string {
  return JSON.stringify(data);
}

/**
 * API route to proxy RPC requests to avoid CORS and handle rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    // Reset rate limit counter every minute
    if (Date.now() - requestCounts.lastReset > 60 * 1000) {
      requestCounts.count = 0;
      requestCounts.lastReset = Date.now();
    }
    
    // Check rate limit
    if (requestCounts.count >= RATE_LIMIT) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: 'Rate limit exceeded. Please try again later.'
          }
        },
        { status: 429 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const reqHash = hashRequest(body);
    
    // Check cache
    if (rpcCache.has(reqHash)) {
      const cached = rpcCache.get(reqHash)!;
      
      // If cache is still valid
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('Serving RPC response from cache');
        return NextResponse.json(cached.data);
      }
    }
    
    // Get RPC URL from environment variable only (no hardcoded fallback with API keys)
    const primaryRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;
    
    // If no RPC URL is configured, return an error instead of using hardcoded keys
    if (!primaryRpcUrl) {
      return NextResponse.json(
        { 
          jsonrpc: "2.0",
          id: body.id || null,
          error: {
            code: -32000,
            message: 'RPC endpoint not configured. Please set NEXT_PUBLIC_BASE_RPC environment variable.'
          }
        },
        { status: 500 }
      );
    }
    
    // Use only the configured RPC endpoint
    const rpcEndpoints = [primaryRpcUrl];
    
    // Increment request counter
    requestCounts.count++;
    
    // Special handling for getLogs requests - these often timeout or have errors
    let isGetLogsRequest = false;
    if (body.method === 'eth_getLogs') {
      isGetLogsRequest = true;
      console.log('Processing eth_getLogs request:', body.params);
    }
    
    // Try each endpoint
    let lastError = null;
    
    for (const endpoint of rpcEndpoints) {
      try {
        // Make the actual RPC request
        const response = await axios.post(endpoint.trim(), body, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: isGetLogsRequest ? 15000 : 10000 // Longer timeout for getLogs
        });
        
        // Cache the response
        rpcCache.set(reqHash, {
          data: response.data,
          timestamp: Date.now()
        });
        
        // Return the response
        return NextResponse.json(response.data);
      } catch (error: any) {
        console.log(`RPC endpoint ${endpoint} failed:`, error.message);
        lastError = error;
        // Continue to next endpoint
      }
    }
    
    // If we reach here, all endpoints failed
    console.error('All RPC endpoints failed');
    
    // Return appropriate error in JSON-RPC format
    return NextResponse.json(
      { 
        jsonrpc: "2.0",
        id: body.id || null,
        error: {
          code: -32603,
          message: lastError?.message || 'Internal RPC error',
          data: {
            details: 'All RPC endpoints failed to respond'
          }
        }
      }, 
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error in RPC proxy:', error);
    
    // Return appropriate error in JSON-RPC format
    return NextResponse.json(
      { 
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: 'Internal JSON-RPC error',
          data: {
            details: error.message
          }
        }
      }, 
      { status: 500 }
    );
  }
} 