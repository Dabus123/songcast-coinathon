'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, 
  ArrowLeft, 
  ExternalLink, 
  Share, 
  Music,
  User,
  AudioLines
} from 'lucide-react';
import IPFSAudio from '../../components/IPFSAudio';
import TradeMusicCoin from '../../components/TradeMusicCoin';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../../services/pinataService';
import axios from 'axios';
import { sdk } from '@farcaster/frame-sdk';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { useAudio } from '../../context/AudioContext';

// Known coin addresses that form our playlist - should match AudioContext
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
  '0x9df194DA69bF66c285ea91Df593AD92C44FaAED8',
  '0xf93ddDb80ee3f384723aA400de0D90F256D33980',
  '0x892035ff295Fc3845067c0b174A077a674CBc860',
  '0xe8CA2eC91d461cd953d2c0F8932Ab6065D1Aa0D7',
    '0x67D02f181359C92DBFd0357d856F065f5e0d3CdD',
  '0x426B5a60AEAceEbE1768938e5A3A9e1bA96A33C5'
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

interface CoinDetailProps {
  params: {
    address: string;
  }
}

export default function CoinDetail() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as Address;
  const [coin, setCoin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentTrack, setShowMiniPlayer, isAutoNavigation } = useAudio();

  // Listen for track changes and navigate to new coin page
  // Only auto-navigate when using next/previous buttons, not when manually selecting coins
  useEffect(() => {
    if (currentTrack && 
        currentTrack.coinAddress && 
        currentTrack.coinAddress !== address && 
        isAutoNavigation) {
      // Only navigate if the new track is in our known addresses (playlist)
      if (KNOWN_COIN_ADDRESSES.includes(currentTrack.coinAddress)) {
        console.log(`Auto-navigating to new track: ${currentTrack.coinAddress}`);
        router.push(`/coins/${currentTrack.coinAddress}`);
      }
    }
  }, [currentTrack, address, router, isAutoNavigation]);

  // Show mini player when navigating away from this page while audio is playing
  useEffect(() => {
    const handleRouteChange = () => {
      if (currentTrack && currentTrack.coinAddress === address) {
        setShowMiniPlayer(true);
      }
    };

    // Listen for navigation events
    window.addEventListener('beforeunload', handleRouteChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleRouteChange);
      // Show mini player when component unmounts and audio is playing
      if (currentTrack && currentTrack.coinAddress === address) {
        setShowMiniPlayer(true);
      }
    };
  }, [currentTrack, address, setShowMiniPlayer]);

  // Hide mini player when on this page with the same track
  useEffect(() => {
    if (currentTrack && currentTrack.coinAddress === address) {
      setShowMiniPlayer(false);
    }
  }, [currentTrack, address, setShowMiniPlayer]);

  // Fetch the coin data directly from the contract
  useEffect(() => {
    const fetchCoinData = async () => {
      if (!address) return;
      
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
        
        setCoin(coinData);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching coin data:', err);
        setError(err.message || 'Failed to fetch coin data');
        setLoading(false);
      }
    };
    
    fetchCoinData();
  }, [address]);

  // Function to handle audio playback errors
  const handlePlayError = () => {
    console.error('Failed to play audio file');
    setError('Failed to play the audio file. The music file might be unavailable or in an unsupported format.');
  };

  type Props = {
    address: string;
  };
  
  const ShortAddressLink: React.FC<Props> = ({ address }) => {
    if (!address) return null;
  
    const shortAddress = `${address.slice(0, 2)}...${address.slice(-3)}`;
  
    return (
      <div className="flex items-center gap-2 mb-4">
      <div className="rounded-full bg-primary/20 flex items-center justify-center text-xs p-2">
    <a>Artist:</a>
      </div>
      <div className="rounded-full bg-primary/20 flex items-center justify-center text-xs">
     <Avatar address={address as `0x${string}`} chain={base}/>
      </div>
      <div className="text-sm font-medium">
      <Name address={address as `0x${string}`} chain={base}/>
      </div>
    </div>
    );
  };

  // Function to share the coin on Farcaster
  const shareCoinOnFarcaster = async () => {
    if (!coin) return;
    
    try {
      // Check if in a Farcaster mini app environment
      if (typeof sdk !== 'undefined' && sdk.actions && sdk.actions.openUrl) {
        // Get the base URL from environment or default to the vercel deployment
        const baseUrl = 'https://songcast.xyz';
        
        // Create share text
        const shareText = `Check out ${coin.name} (${coin.symbol}) by ${coin.artistName} on SongCast! 🎵 ${baseUrl}/coins/${address}`;
        
        // Open in Warpcast compose
        await sdk.actions.openUrl('https://warpcast.com/~/compose?text=' + 
          encodeURIComponent(shareText));
      } else {
        // Fallback for non-Farcaster environments
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${coin.name} (${coin.symbol}) by ${coin.artistName}`,
              text: `Check out ${coin.name} by ${coin.artistName} on SongCast!`,
              url: window.location.href
            });
          } catch (e) {
            console.error('Error sharing:', e);
          }
        } else {
          // Copy to clipboard if sharing isn't available
          navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
        }
      }
    } catch (error) {
      console.error('Error sharing on Farcaster:', error);
    }
  };

  // Function to refresh the coin data
  const refreshCoin = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      setError(null);
      setCoin(null);
      
      const fetchCoinData = async () => {
        // ... Existing fetch logic
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
        
        // Process metadata
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
        
        setCoin(coinData);
        setLoading(false);
      };
      
      await fetchCoinData();
    } catch (err: any) {
      console.error('Error refreshing coin data:', err);
      setError(err.message || 'Failed to refresh coin data');
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-screen flex flex-col justify-center items-center">
        <div className="sonic-glass-card p-8 rounded-2xl w-full max-w-md text-center">
          <Coins className="text-primary h-16 w-16 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold mb-4">Loading Coin Details</h2>
          <p className="text-muted-foreground">Please wait while we fetch the coin information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !coin) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-screen flex flex-col justify-center items-center">
        <div className="sonic-glass-card p-8 rounded-2xl w-full max-w-md text-center">
          <Coins className="text-red-500 h-16 w-16 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Coin Not Found</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={refreshCoin} 
              className="sonic-button-primary py-2 px-4"
            >
              Try Again
            </button>
            <Link href="/coins" className="sonic-button-outline py-2 px-4">
              <ArrowLeft size={16} className="mr-2" />
              Back to All Coins
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default state when no coin is found yet
  if (!coin) {
    return null;
  }

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Back button */}
        <Link 
          href="/coins" 
          className="inline-flex items-center gap-2 mb-8 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to All Coins</span>
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Cover Art and Audio Player */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="sonic-glass-card p-4 rounded-2xl overflow-hidden"
            >
              {/* Cover Art */}
              <div className="relative aspect-square rounded-xl overflow-hidden mb-6">
                {coin.coverArt ? (
                  <Image 
                    src={coin.coverArt} 
                    alt={coin.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover" 
                    priority
                    unoptimized={true}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <Coins size={64} className="text-primary/50" />
                  </div>
                )}
                
                {/* Symbol badge */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold z-20 border border-white/10">
                  {coin.symbol}
                </div>
              </div>
              
              {/* Audio Player */}
              {coin.audioUrl && (
                <div className="relative">
                  <div className="flex items-center justify-center mb-4">
                    <IPFSAudio 
                      src={coin.audioUrl}
                      title={coin.name}
                      artist={coin.artistName}
                      coverArt={coin.coverArt}
                      coinAddress={coin.coinAddress}
                      onPlayError={handlePlayError}
                      className="mx-auto"
                    />
                  </div>
                  
                  {/* Audio waveform visualization - static for now */}
                  <div className="h-16 flex items-center justify-center gap-1 mb-4">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div 
                        key={i}
                        className="w-1 h-6 bg-primary/30 rounded-full"
                        style={{
                          height: `${Math.sin(i / 3) * 16 + 12}px`,
                          opacity: 0.3 + Math.sin(i / 5) * 0.7
                        }}
                      />
                    ))}
                  </div>
                  
                  {error && (
                    <div className="text-xs text-red-400 text-center mb-4">
                      {error}
                    </div>
                  )}
                  
                  <div className="text-center text-sm text-muted-foreground mb-2">
                    <AudioLines size={16} className="inline-block mr-2" />
                    <span>Listen to this music coin</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Right Column - Coin Details and Trading */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Coin Details */}
              <div className="sonic-glass-card p-8 rounded-2xl mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins size={24} className="text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold gradient-text">
                      {coin.name}
                    </h1>
                    <div className="text-muted-foreground flex items-center gap-2">
                    <Link 
                      href={`/artists/${coin.artistAddress}`}>
                      <ShortAddressLink address={coin.artistAddress} /></Link>
                    </div>
                  </div>
                </div>
                
                <p className="text-lg text-muted-foreground mb-8">
                  {coin.description}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="sonic-card p-4">
                    <div className="text-sm text-muted-foreground mb-1">Token Address</div>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs truncate max-w-[200px]">
                        {coin.coinAddress}
                      </div>
                      <a
                        href={`https://basescan.org/token/${coin.coinAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                  
                  <div className="sonic-card p-4">
                    <div className="text-sm text-muted-foreground mb-1">Artist Address</div>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs truncate max-w-[200px]">
                        {coin.artistAddress}
                      </div>
                      <a
                        href={`https://basescan.org/address/${coin.artistAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={shareCoinOnFarcaster}
                    className="sonic-button-outline py-2 px-4"
                  >
                    <Share size={16} className="mr-2" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
              
              {/* Trading Section */}
              <div className="sonic-glass-card p-8 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Coins size={20} className="text-primary" />
                  </div>
                  <span>Trade Coin</span>
                </h2>
                
                <TradeMusicCoin
                  coinAddress={coin.coinAddress}
                  coinName={coin.name}
                  coinSymbol={coin.symbol}
                  artistName={coin.artistAddress}
                  coverArt={coin.coverArt}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
} 