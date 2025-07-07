'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Music, Lock, Coins, Play, Pause } from 'lucide-react';
import { createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../../../services/pinataService';
import axios from 'axios';

// Create a public client
const publicClient = createPublicClient({
  chain: base,
  transport: custom({
    async request({ method, params }) {
      try {
        const response = await axios.post('/api/rpc', {
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        });
        
        if (response.data.error) {
          throw new Error(response.data.error.message || 'RPC request failed');
        }
        
        return response.data.result;
      } catch (error) {
        console.error('Error with proxy transport:', error);
        throw error;
      }
    },
  }),
});

// Known exclusive coin addresses to fetch immediately
const KNOWN_EXCLUSIVE_ADDRESSES = [
  '0x989760E2102bEd06C08FE6Fa4872237023D98aE7',
  '0x65b1409997826fbFff22a93e0959dC77fF0bCEa1'
];

// ABI for ERC20 balance check
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
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

// Function to fetch token metadata from IPFS
async function fetchTokenMetadata(uri: string) {
  try {
    let fetchUri = uri;
    if (uri.startsWith('ipfs://')) {
      fetchUri = getIpfsUrl(uri);
    }
    
    const response = await axios.get(fetchUri, { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

// Function to fetch a single coin's data
async function fetchCoinData(address: string) {
  try {
    const [name, symbol, tokenUri, artistAddress] = await Promise.all([
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'name',
      }),
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'tokenURI',
      }),
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'payoutRecipient',
      }).catch(() => null)
    ]);
    
    const metadata = await fetchTokenMetadata(tokenUri as string);
    
    if (!metadata) {
      throw new Error('Failed to fetch token metadata');
    }
    
    const description = metadata.description || '';
    const artistName = metadata.artist || 'Unknown Artist';
    
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
    
    return {
      coinAddress: address,
      name: name as string,
      symbol: symbol as string,
      description,
      artistName,
      artistAddress: artistAddress as `0x${string}` || '0x0000000000000000000000000000000000000000',
      coverArt,
      audioUrl,
      metadata
    };
  } catch (error) {
    console.error(`Error fetching coin data for ${address}:`, error);
    return null;
  }
}

interface ExclusiveCoin {
  coinAddress: string;
  name: string;
  symbol: string;
  description: string;
  artistName: string;
  artistAddress: `0x${string}`;
  coverArt: string;
  audioUrl: string;
  metadata: any;
}

export default function ArtistExclusivePage() {
  const { address } = useParams();
  const { address: userAddress, isConnected } = useAccount();
  const [exclusiveCoins, setExclusiveCoins] = useState<ExclusiveCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Check if user has access to exclusive content
  useEffect(() => {
    const checkAccess = async () => {
      if (!userAddress || !address) return;

      try {
        // Fetch all known coins first
        const knownCoins = [
          '0xc8054286955448bafd9d438b71ef55b90626ccf2',
          '0x50Ca3d669E893dA18Cc55875e8Ec7a12ce36cdcf',
          '0x989760E2102bEd06C08FE6Fa4872237023D98aE7',
          '0x65b1409997826fbFff22a93e0959dC77fF0bCEa1',
          '0xafd68ffb2518117e026ad7c05c8327da2b3535e5'
        ];

        const coinPromises = knownCoins.map(coinAddress => fetchCoinData(coinAddress));
        const results = await Promise.all(coinPromises);
        const validCoins = results.filter((coin): coin is NonNullable<typeof coin> => coin !== null);

        // Filter coins for this artist
        const artistCoins = validCoins.filter(coin => 
          coin.artistAddress.toLowerCase() === address.toString().toLowerCase()
        );

        // Check if user owns at least 3 of the artist's coins
        let ownedCoins = 0;
        for (const coin of artistCoins) {
          const balance = await publicClient.readContract({
            address: coin.coinAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress as `0x${string}`]
          });

          if (Number(balance) > 0) {
            ownedCoins++;
            if (ownedCoins >= 3) break;
          }
        }

        setHasAccess(ownedCoins >= 3);
      } catch (error) {
        console.error('Error checking access:', error);
        setError('Failed to check access to exclusive content');
      }
    };

    checkAccess();
  }, [userAddress, address]);

  // Fetch exclusive coins
  useEffect(() => {
    const fetchExclusiveCoins = async () => {
      if (!address) return;

      try {
        setLoading(true);
        const coinPromises = KNOWN_EXCLUSIVE_ADDRESSES.map(coinAddress => fetchCoinData(coinAddress));
        const results = await Promise.all(coinPromises);
        const validCoins = results.filter((coin): coin is NonNullable<typeof coin> => coin !== null);

        // Filter coins for this artist
        const artistExclusiveCoins = validCoins.filter(coin => 
          coin.artistAddress.toLowerCase() === address.toString().toLowerCase()
        );

        setExclusiveCoins(artistExclusiveCoins);
      } catch (error) {
        console.error('Error fetching exclusive coins:', error);
        setError('Failed to fetch exclusive tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchExclusiveCoins();
  }, [address]);

  const togglePlayPause = (coinAddress: string, audioUrl: string) => {
    if (isPlaying === coinAddress) {
      audioElement?.pause();
      setIsPlaying(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(audioUrl);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(coinAddress);

      audio.addEventListener('ended', () => {
        setIsPlaying(null);
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="sonic-card p-12 text-center">
          <div className="spinner-md mx-auto mb-4"></div>
          <h3 className="text-xl font-medium mb-2">Loading Exclusive Tracks</h3>
          <p className="text-muted-foreground">Please wait while we fetch the exclusive content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="sonic-card p-12 text-center">
          <div className="text-5xl mb-4 text-red-500">⚠️</div>
          <h3 className="text-xl font-medium mb-2">Error</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="sonic-card p-12 text-center">
          <div className="text-5xl mb-4">
            <Lock size={64} className="mx-auto text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">Exclusive Content</h3>
          <p className="text-muted-foreground mb-6">
            You need to own at least 3 of this artist's regular coins to access their exclusive tracks. (coming soon)
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Coins size={16} />
            <span>Collect more coins to unlock exclusive content</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="gradient-text text-4xl font-bold mb-2">Exclusive Tracks</h1>
          <p className="text-muted-foreground">
            Special content only available to collectors who own at least 3 of the artist's coins
          </p>
        </div>

        {exclusiveCoins.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exclusiveCoins.map((coin) => (
              <motion.div
                key={coin.coinAddress}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="sonic-card p-6"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-4 relative">
                  <img
                    src={coin.coverArt}
                    alt={coin.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => togglePlayPause(coin.coinAddress, coin.audioUrl)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    {isPlaying === coin.coinAddress ? (
                      <Pause size={32} className="text-white" />
                    ) : (
                      <Play size={32} className="text-white" />
                    )}
                  </button>
                </div>

                <h3 className="font-bold text-lg mb-1">{coin.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{coin.symbol}</p>
                <p className="text-sm line-clamp-2">{coin.description}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="sonic-card p-12 text-center">
            <div className="text-5xl mb-4">🎵</div>
            <h3 className="text-xl font-medium mb-2">No Exclusive Tracks Yet</h3>
            <p className="text-muted-foreground">
              This artist hasn't released any exclusive tracks yet.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
} 