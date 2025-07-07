'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import MusicCoinCard from '@/app/components/MusicCoinCard';
import Script from 'next/script';
import FarcasterFrameEmbed from '@/app/components/FarcasterFrameEmbed';
import Head from 'next/head';
import axios from 'axios';
import { getIpfsUrl } from '@/app/services/pinataService';

// ABI of ERC721 functions we need
const ERC721_ABI = [
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenURI',
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'payoutRecipient',
    outputs: [{ type: 'address', name: '' }],
    stateMutability: 'view',
    type: 'function',
  }
];

// Custom transport that uses our API proxy
const proxyTransport = custom({
  async request({ method, params }) {
    try {
      const response = await axios.post('/api/rpc', {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      });
      
      if (response.data.error) {
        console.error('RPC Error:', response.data.error);
        throw new Error(response.data.error.message || 'RPC request failed');
      }
      
      if (response.data.result === undefined) {
        console.error('Empty RPC result for method:', method);
        throw new Error('Empty result from RPC endpoint');
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error with proxy transport:', error);
      throw error;
    }
  },
});

// Create a public client for Base mainnet with our proxy transport
const publicClient = createPublicClient({
  chain: base,
  transport: proxyTransport,
});

// Fetch token metadata from IPFS
async function fetchTokenMetadata(uri: string) {
  try {
    // Convert IPFS URI to HTTP URL if needed
    let fetchUri = uri;
    if (uri.startsWith('ipfs://')) {
      fetchUri = getIpfsUrl(uri);
    }
    
    console.log(`Fetching metadata from: ${fetchUri}`);
    const response = await axios.get(fetchUri, { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

// Extend Window interface to include the Farcaster SDK
declare global {
  interface Window {
    farcasterSdk?: {
      actions: {
        ready: () => void;
      };
    };
  }
}

/**
 * Hook for fetching and managing music coin data
 */
function useCoinsData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Fetches details for a specific coin by address
   */
  const getCoinDetails = useCallback(async (address: Address) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching data for coin: ${address}`);
      
      // Read token data from contract
      const [name, symbol, tokenUri, artistAddress] = await Promise.all([
        publicClient.readContract({
          address,
          abi: ERC721_ABI,
          functionName: 'name',
        }),
        publicClient.readContract({
          address,
          abi: ERC721_ABI,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address,
          abi: ERC721_ABI,
          functionName: 'tokenURI',
        }),
        publicClient.readContract({
          address,
          abi: ERC721_ABI,
          functionName: 'payoutRecipient',
        }).catch(() => null) // This might not exist on all contracts
      ]);
      
      console.log(`Token URI: ${tokenUri}`);
      
      // Fetch metadata from IPFS
      const metadata = await fetchTokenMetadata(tokenUri as string);
      
      if (!metadata) {
        throw new Error('Failed to fetch token metadata');
      }
      
      // Extract data from metadata
      const description = metadata.description || '';
      const artistName = metadata.artist || 'Unknown Artist';
      
      // Extract image and audio URLs
      let coverArt = '/examples/default-cover.jpg';
      let audioUrl = '';
      
      if (metadata.image) {
        coverArt = metadata.image.startsWith('ipfs://') 
          ? getIpfsUrl(metadata.image) 
          : metadata.image;
      }
      
      if (metadata.animation_url) {
        audioUrl = metadata.animation_url.startsWith('ipfs://') 
          ? getIpfsUrl(metadata.animation_url) 
          : metadata.animation_url;
      }
      
      // Create coin object
      const coinData = {
        coinAddress: address,
        name: name as string,
        symbol: symbol as string,
        description,
        artistName,
        artistAddress: artistAddress as Address || '0x0000000000000000000000000000000000000000',
        coverArt,
        audioUrl,
        metadata
      };
      
      return coinData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch coin data'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    loading,
    error,
    getCoinDetails
  };
}

export default function SharePage() {
  const params = useParams();
  const address = params.address as Address;
  const { getCoinDetails } = useCoinsData();
  const [coinData, setCoinData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        setLoading(true);
        const data = await getCoinDetails(address);
        setCoinData(data);
        
        // Call Farcaster SDK ready once data is loaded
        if (typeof window !== 'undefined' && window.farcasterSdk) {
          try {
            window.farcasterSdk.actions.ready();
            console.log('Farcaster SDK ready called');
          } catch (err) {
            console.error('Error calling SDK ready:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching coin data:', err);
        setError('Failed to load coin data');
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchCoinData();
    }
  }, [address, getCoinDetails]);

  if (loading) {
    return (
      <>
        <FarcasterFrameEmbed coinAddress={address} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-woodcut-red"></div>
          </div>
        </div>
      </>
    );
  }

  if (error || !coinData) {
    return (
      <>
        <FarcasterFrameEmbed coinAddress={address} />
        <div className="container mx-auto px-4 py-8">
          <div className="sonic-card p-6 text-center">
            <h2 className="text-2xl font-black mb-4 uppercase">Error Loading Coin</h2>
            <p className="text-white mb-4">{error || 'Coin not found'}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Always include frame metadata regardless of state */}
      <FarcasterFrameEmbed coinAddress={address} />
      
      {/* Load the Farcaster SDK */}
      <Script
        id="farcaster-sdk"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (typeof window !== 'undefined') {
                window.farcasterSdk = window.farcasterSdk || {};
                window.farcasterSdk.actions = window.farcasterSdk.actions || {};
                window.farcasterSdk.actions.ready = function() {
                  if (window.parent && window.parent.postMessage) {
                    window.parent.postMessage({ type: 'fc:ready' }, '*');
                  }
                };
              }
            })();
          `,
        }}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-black mb-8 text-center uppercase tracking-tight">
            <span className="gradient-text">SongCast</span> Music Coin
          </h1>

          <MusicCoinCard
            coinAddress={address}
            name={coinData.name}
            symbol={coinData.symbol}
            description={coinData.description}
            artistName={coinData.artistName}
            artistAddress={coinData.artistAddress}
            coverArt={coinData.coverArt}
            audioUrl={coinData.audioUrl}
            isSharedPage={true}
          />

          <div className="mt-8 text-center">
            <p className="text-white text-sm mb-4 uppercase font-bold">
              SongCast is a platform for artists to create and trade their own music coins
            </p>
            <a 
              href="/"
              className="sonic-button-primary inline-flex"
            >
              Explore More Music Coins
            </a>
          </div>
        </div>
      </div>
    </>
  );
} 