'use client';

import React, { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { Button } from '../components/ui/button';
import { Coins, Music, Share, Sparkles, User, TrendingUp, Play, Pause } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../services/pinataService';
import { getCoin } from "@zoralabs/coins-sdk";
import { Name } from '@coinbase/onchainkit/identity';
import { useAudio } from '../context/AudioContext';
import axios from 'axios';

// Get the base URL from environment or use a fallback for local development
const BASE_URL = 'https://songcast.xyz/coins';

// Known coin addresses to fetch immediately
const KNOWN_COIN_ADDRESSES = [
  '0xc8054286955448bafd9d438b71ef55b90626ccf2',
  '0x50Ca3d669E893dA18Cc55875e8Ec7a12ce36cdcf',
  '0x65b1409997826fbFff22a93e0959dC77fF0bCEa1',
  '0xafd68ffb2518117e026ad7c05c8327da2b3535e5',
  '0xA77890dcDA6De595BE130D770Ae9DB8Bb1bEA8Cc',
  '0x748E88f0f7AF5A8c6393D0E16e4D441af306c1A0',
  '0xf82a05C6c082f3e06B4792D98b6c825EB55db929',
  '0x3D029BE20dFFfC2cC712c8cB714B9b486693725f',
  '0x7b5F38d621B7d5A0dfCC8249B7ad26a8ed460704',
  '0xf50f05e95320d2181f60648f13c0db1d82dc7913',
  '0xA2D8269ad6463e30eB80bC4AECd22826b6fDb904',
  '0x0a95B5460EdB93b596ab92F46F8823332f0c013F',
  '0x6Ed155D1c6bF2954be1C6C80F853B82d4599C790',
  '0x9df194DA69bF66c285ea91Df593AD92C44FaAED8'
];

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

// Function to fetch a single coin's data
async function fetchCoinData(address: Address) {
  try {
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
      }).catch(() => null)
    ]);
    
    // Fetch metadata from IPFS
    const metadata = await fetchTokenMetadata(tokenUri as string);
    
    if (!metadata) {
      throw new Error('Failed to fetch token metadata');
    }

    // Fetch market cap data
    let marketCap = '0';
    try {
      const response = await getCoin({
        address,
        chain: base.id,
      });
      
      if (response.data?.zora20Token?.marketCap) {
        marketCap = response.data.zora20Token.marketCap;
      }
    } catch (error) {
      console.error('Error fetching market cap:', error);
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
    
    // Create coin object with market cap
    return {
      coinAddress: address,
      name: name as string,
      symbol: symbol as string,
      description,
      artistName,
      artistAddress: artistAddress as Address || '0x0000000000000000000000000000000000000000',
      coverArt,
      audioUrl,
      metadata: {
        ...metadata,
        marketCap
      }
    };
  } catch (error) {
    console.error(`Error fetching coin data for ${address}:`, error);
    return null;
  }
}

// Helper function to format market cap
const formatMarketCap = (marketCapString: string) => {
  if (!marketCapString || marketCapString === '0') return 'New';
  
  const cap = parseFloat(marketCapString);
  if (cap >= 1000000) {
    return `$${(cap / 1000000).toFixed(1)}M`;
  } else if (cap >= 1000) {
    return `$${(cap / 1000).toFixed(1)}K`;
  } else {
    return `$${cap.toFixed(2)}`;
  }
};

export default function FarcasterMiniApp() {
  const [isReady, setIsReady] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [topCoin, setTopCoin] = useState<any>(null);
  const [coinsLoading, setCoinsLoading] = useState(true);
  
  const { currentTrack, isPlaying, play, pause, setShowMiniPlayer } = useAudio();

  useEffect(() => {
    // Hide splash screen when component is mounted
    const setupApp = async () => {
      try {
        // Signal the app is ready to display
        await sdk.actions.ready();
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing mini app:', error);
      }
    };

    setupApp();
  }, []);

  // Fetch top coin
  useEffect(() => {
    const fetchTopCoin = async () => {
      setCoinsLoading(true);
      try {
        const coinPromises = KNOWN_COIN_ADDRESSES.map(address => 
          fetchCoinData(address as Address)
        );
        
        const results = await Promise.all(coinPromises);
        const validCoins = results.filter(Boolean);
        
        // Sort by market cap and get the top one
        const sortedCoins = validCoins.sort((a, b) => {
          if (!a || !b) return 0;
          const aCap = parseFloat(a.metadata?.marketCap || '0');
          const bCap = parseFloat(b.metadata?.marketCap || '0');
          return bCap - aCap;
        });

        if (sortedCoins.length > 0) {
          setTopCoin(sortedCoins[0]);
        }
      } catch (error) {
        console.error('Error fetching top coin:', error);
      } finally {
        setCoinsLoading(false);
      }
    };
    
    fetchTopCoin();
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await sdk.actions.signIn({
        nonce: 'sonic-' + Math.random().toString(36).substring(2, 10), // Generate a random nonce
      });
      
      if (result) {
        setUserInfo(result);
        console.log('Signed in successfully:', result);
        
        // You could make a request to your backend to verify the signature
        // and establish a session for the user
        try {
          const response = await fetch(`${BASE_URL}/api/auth/verify-siwf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: result.message,
              signature: result.signature,
            }),
          });
          
          const data = await response.json();
          if (data.success) {
            // Store user data or token as needed
            console.log('Authentication successful:', data);
          }
        } catch (authError) {
          console.error('Error verifying authentication:', authError);
        }
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleShareOnFarcaster = async () => {
    try {
      // Open a URL to share content instead of using composeCast
      await sdk.actions.openUrl('https://warpcast.com/~/compose?text=' + 
        encodeURIComponent(`Coin your music directly on Farcaster! 🎵 songcast.xyz/miniapp`));
    } catch (error) {
      console.error('Error sharing on Farcaster:', error);
    }
  };

  const handleViewProfile = async () => {
    try {
      // Replace with a real FID when you have one
      await sdk.actions.viewProfile({ fid: 1 }); 
    } catch (error) {
      console.error('Error viewing profile:', error);
    }
  };

  const handleExploreCoins = () => {
    // Navigate to the coins page
    window.location.href = `https://songcast.xyz/coins`;
  };

  const handleDiscoverMusic = () => {
    // Navigate to the music discovery page
    window.location.href = `https://songcast.xyz/artists`;
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!topCoin?.audioUrl) return;
    
    // Create track object for this coin
    const track = {
      id: topCoin.coinAddress,
      title: topCoin.name,
      artist: topCoin.artistName,
      src: topCoin.audioUrl,
      coverArt: topCoin.coverArt,
      coinAddress: topCoin.coinAddress
    };

    // Check if this is the currently playing track
    const isCurrentTrack = currentTrack?.id === track.id;
    
    try {
      if (isCurrentTrack && isPlaying) {
        pause();
      } else {
        await play(track);
        setShowMiniPlayer(true);
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-woodcut-card to-purple-950">
      <div className="sonic-glass-card p-2 rounded-2xl w-full max-w-md">

        {/* Top Coin Display */}
        {coinsLoading ? (
          <div className="text-center mb-6">
            <div className="spinner-md mx-auto mb-4"></div>
            <p className="text-sm text-white font-bold">Loading top coin...</p>
          </div>
        ) : topCoin ? (
          <div className="mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-woodcut-card stroke-[3px]" />
              <span className="text-sm uppercase font-bold tracking-wide text-woodcut-card">Top Coin</span>
          
            </div>
            
            <div className="relative mb-4 group/cover">
              <Image
                src={topCoin.coverArt}
                alt={topCoin.name}
                width={200}
                height={200}
                className="w-full aspect-square object-cover rounded-lg border-2 border-woodcut-card"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/examples/default-cover.jpg';
                }}
              />
               
              {/* Play button overlay */}
              {topCoin.audioUrl && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 bg-black/30 rounded-lg">
                  <button
                    onClick={handlePlayClick}
                    className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                  >
                    {currentTrack?.id === topCoin.coinAddress && isPlaying ? (
                      <Pause size={24} className="text-black ml-0" />
                    ) : (
                      <Play size={24} className="text-black ml-1" />
                    )}
                  </button>
                </div>
              )}
            </div>
          
            <div className="text-center">
              <h3 className="text-lg font-black uppercase mb-1 text-woodcut-card">TICKER: ${topCoin.symbol}</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-lg font-black text-woodcut-red">
                  MARKET CAP:
                </span>
                <span className="text-lg font-bold text-woodcut-card">
                  {formatMarketCap(topCoin.metadata?.marketCap || '0')}
                </span>
              </div>
            
     
          
          
           
            </div>
          </div>
        ) : (
          <div className="text-center mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
            <Coins size={48} className="text-white mx-auto mb-4 stroke-[3px]" />
            <p className="text-sm text-white font-bold">No coins available</p>
          </div>
        )}
     
        <div className="flex flex-col gap-4">
          <Button 
            className="sonic-button-outline py-3 px-6"
            onClick={handleShareOnFarcaster}
          >
            <Share size={20} className="mr-2 text-woodcut-card" />
            <span style={{color:'white'}}>Share on Farcaster</span>
          </Button>
          
          
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExploreCoins}
            >
              <Coins size={16} className="mr-2" />
              Explore Coins
            </Button>
            <span className="text-center text-woodcut-card text-xs">ARTIST: <Name className="text-center" address={topCoin?.artistAddress} chain={base}/> </span>
          </div>
        </div>
      </div>
    </div>
  );
} 