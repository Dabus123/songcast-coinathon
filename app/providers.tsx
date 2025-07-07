'use client';

import { WagmiConfig, createConfig, http, fallback } from 'wagmi';
import { cookieStorage, createStorage } from "wagmi";
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { setApiKey } from '@zoralabs/coins-sdk';
import { installRpcProxyFetch } from './utils/rpcProxyFetch';
import { installIpfsGatewayProxy } from './utils/ipfsGatewayProxy';
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector'
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WagmiProvider } from 'wagmi'
import { ThemeProvider } from './context/ThemeContext';
import { AudioProvider } from './context/AudioContext';
import { parseEther, toHex } from "viem";
// Create query client
const queryClient = new QueryClient();

// Get custom RPC URL from environment
const customRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;

// Only use custom RPC if provided - no hardcoded fallback with API keys
const rpcUrl = customRpcUrl || 'https://mainnet.base.org'; // Public endpoint only

// Note: No hardcoded RPC endpoints to prevent API key leaks
// All RPC configuration must be done via environment variables

const cbWalletConnector = coinbaseWallet({
  appName: "songcast",
  preference: {
    keysUrl: "https://keys-dev.coinbase.com/connect",
    options: "smartWalletOnly",
  },
});

// Configure Wagmi client with our own proxy
const config = createConfig({
  chains: [base],
  connectors: [
    miniAppConnector(),
    cbWalletConnector,
    injected(),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [base.id]: http('/api/rpc'), // Use our own proxy API for all RPC calls
  },
});

// Create a client-side only wrapper component
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Return null on server-side rendering
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  // Install proxies for RPC and IPFS requests
  useEffect(() => {
    // Set up proxies to avoid CORS and rate limiting issues
    installRpcProxyFetch();
    installIpfsGatewayProxy();
    
    // Set up Zora API key if available
    const zoraApiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
    if (zoraApiKey) {
      setApiKey(zoraApiKey);
      console.log('Zora API key set up successfully');
    } else {
      console.warn('No Zora API key found. API rate limits may apply.');
    }

    // Log configuration
    console.log('SongCast initialized with proxy middleware');
    
    // Cleanup function
    return () => {
      // If we had uninstall functions, we'd call them here
    };
  }, []);

  return (
    <ClientOnly>
      <ThemeProvider>
        <AudioProvider>
          <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} 
          chain={base} // add baseSepolia for testing 
        >
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
            </WagmiProvider>
       </OnchainKitProvider>
        </AudioProvider>
      </ThemeProvider>
    </ClientOnly>
  );
} 