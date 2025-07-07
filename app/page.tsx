'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Headphones, 
  TrendingUp, 
  Upload, 
  Coins, 
  Sparkles,
  Play,
  Pause,
  ArrowRight,
  ChevronRight,
  Globe,
  Users
} from 'lucide-react';
import { useZoraEvents } from './hooks/useZoraEvents';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from './services/pinataService';
import axios from 'axios';
import { getCoin } from "@zoralabs/coins-sdk";
import { Name } from '@coinbase/onchainkit/identity';
import { useAudio } from './context/AudioContext';

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
      }).catch(() => null) // This might not exist on all contracts
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

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : null;
}

export default function Home() {
  const { coins, loading, error } = useZoraEvents();
  const [knownCoins, setKnownCoins] = useState<any[]>([]);
  const [knownCoinsLoading, setKnownCoinsLoading] = useState(true);
  const [topCoin, setTopCoin] = useState<any>(null);
  
  const { currentTrack, isPlaying, play, pause, setShowMiniPlayer } = useAudio();

  // Fetch known coins immediately
  useEffect(() => {
    const fetchKnownCoins = async () => {
      setKnownCoinsLoading(true);
      try {
        const coinPromises = KNOWN_COIN_ADDRESSES.map(address => 
          fetchCoinData(address as Address)
        );
        
        const results = await Promise.all(coinPromises);
        const validCoins = results.filter(Boolean);
        setKnownCoins(validCoins);
      } catch (error) {
        console.error('Error fetching known coins:', error);
      } finally {
        setKnownCoinsLoading(false);
      }
    };
    
    fetchKnownCoins();
  }, []);

  // Get the highest market cap coin
  useEffect(() => {
    const allCoins = [...knownCoins];
    coins.forEach(coin => {
      if (!allCoins.some(knownCoin => knownCoin.coinAddress === coin.coinAddress)) {
        allCoins.push(coin);
      }
    });

    // Sort by market cap and get the top one
    const sortedCoins = allCoins.sort((a, b) => {
      const aCap = parseFloat(a.metadata?.marketCap || '0');
      const bCap = parseFloat(b.metadata?.marketCap || '0');
      return bCap - aCap;
    });

    if (sortedCoins.length > 0) {
      setTopCoin(sortedCoins[0]);
    }
  }, [knownCoins, coins]);
  
  // Get the three most recent coins for the featured section
  const allCoins = [...knownCoins];
  coins.forEach(coin => {
    if (!allCoins.some(knownCoin => knownCoin.coinAddress === coin.coinAddress)) {
      allCoins.push(coin);
    }
  });
  const featuredCoins = allCoins.slice(0, 3);

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 diagonal-pattern"></div>
      
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="lg:w-1/2 text-center lg:text-left"
            >
              <div className="inline-flex items-center bg-woodcut-card border-2 border-woodcut-card shadow-woodcut-card px-4 py-2 mb-6">
                <Sparkles size={20} className="text-woodcut-card mr-2 stroke-[3px]" />
                <span className="text-sm uppercase font-bold tracking-wide">Introducing Music Coins</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-woodcut-card uppercase mb-6 leading-tight tracking-tight ">
                Social Tokens for 
                <span className="text-orange-500 block mt-2 text-shadow-woodcut-card">Music Artists</span>
              </h1>
              
              <p className="text-xl mb-8 max-w-xl mx-auto lg:mx-0 uppercase font-bold">
              SongCast empowers artists to launch coins, grow tribes, and let fans invest in their rise.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/coins" className="sonic-button-primary py-3 px-6">
                  <Coins size={24} className="stroke-[3px]" />
                  <span>Explore Coins</span>
                </Link>
              </div>
              
              <div className="mt-10 flex items-center justify-center lg:justify-start gap-2 text-sm uppercase font-bold">
                <Globe size={20} className="stroke-[3px]" />
                <span>Powered by Zora Protocol on Base</span>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="lg:w-1/2 flex justify-center"
            >
              <div className="relative">
                {/* Top Coin Display */}
                {knownCoinsLoading ? (
                  <div className="woodcut-card p-8 text-center">
                    <div className="spinner-md mx-auto mb-4"></div>
                    <p className="text-sm uppercase font-bold">Loading top coin...</p>
                  </div>
                ) : topCoin ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="woodcut-card p-6 max-w-sm"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={20} className="text-woodcut-red stroke-[3px]" />
                      <span className="text-sm uppercase font-bold tracking-wide text-woodcut-red">Top Coin</span>
                     
                    </div>
                    
                    <div className="relative mb-4 group/cover">
                      <Image
                        src={topCoin.coverArt}
                        alt={topCoin.name}
                        width={300}
                        height={300}
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
                      <h3 className="text-xl font-black uppercase mb-1">TICKER: ${topCoin.symbol}</h3>
                      
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-2xl font-black text-woodcut-red">
                      MARKET CAP:
                        </span>
                        
                        <span className="text-lg font-bold">
                          {formatMarketCap(topCoin.metadata?.marketCap || '0')}
                        </span>
                      </div>
                      
                      <Link 
                        href={`/coins/${topCoin.coinAddress}`}
                        className="sonic-button-outline py-2 px-4 text-sm"
                      >
                        <Play size={16} className="stroke-[3px]" />
                        <span>View Coin</span>
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <div className="woodcut-card p-8 text-center">
                    <Coins size={64} className="text-woodcut-card mx-auto mb-4 stroke-[3px]" />
                    <p className="text-sm uppercase font-bold">No coins available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          
          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="mt-20 woodcut-card p-6 grid grid-cols-1 md:grid-cols-1 gap-4"
          >
            <div className="text-center p-3">
              <div className="text-2xl md:text-3xl font-black mb-1 gradient-text">{allCoins.length || '0'}</div>
              <div className="uppercase font-bold tracking-wide text-sm">Music Coins Created</div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-20 relative woodcut-paper">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="gradient-text text-4xl font-black mb-4 uppercase tracking-tight">How SongCast Works</h2>
            <p className="text-xl max-w-2xl mx-auto uppercase font-bold">
              SongCast creates a new way for artists to engage with fans through tradable social tokens.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="woodcut-card p-6 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 flex items-center justify-center bg-woodcut-card border-2 border-woodcut-card mb-4 group-hover:translate-y-[-5px] transition-transform duration-300">
                  <Coins size={32} className="text-woodcut-card stroke-[3px]" />
                </div>
                <div className="bg-woodcut-red text-sm text-woodcut-card font-bold uppercase tracking-wide inline-block px-3 py-1 mb-2 border border-woodcut-card">Step 1</div>
                <h3 className="text-xl font-black mb-3 uppercase tracking-tight">Create Coin</h3>
                <p className="mb-4 uppercase font-bold">
                  Artists can create their own ERC20 token with custom name, symbol, and metadata.
                </p>
                <Link href="/coins" className="text-woodcut-red flex items-center text-sm font-bold uppercase tracking-wide group-hover:underline">
                  <span>Create a coin</span>
                  <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform stroke-[3px]" />
                </Link>
              </div>
            </motion.div>
            
            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="woodcut-card p-6 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 flex items-center justify-center bg-woodcut-card border-2 border-woodcut-card mb-4 group-hover:translate-y-[-5px] transition-transform duration-300">
                  <Music size={32} className="text-woodcut-card stroke-[3px]" />
                </div>
                <div className="bg-woodcut-card text-sm text-woodcut-card font-bold uppercase tracking-wide inline-block px-3 py-1 mb-2 border border-woodcut-card">Step 2</div>
                <h3 className="text-xl font-black mb-3 uppercase tracking-tight">Enrich Profile</h3>
                <p className="mb-4 uppercase font-bold">
                  Upload music, images, and set benefits for token holders to grow your community.
                </p>
                <Link href="/artists" className="text-woodcut-red flex items-center text-sm font-bold uppercase tracking-wide group-hover:underline">
                  <span>View artists</span>
                  <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform stroke-[3px]" />
                </Link>
              </div>
            </motion.div>
            
            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="woodcut-card p-6 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 flex items-center justify-center bg-woodcut-red border-2 border-woodcut-card mb-4 group-hover:translate-y-[-5px] transition-transform duration-300">
                  <TrendingUp size={32} className="text-woodcut-card stroke-[3px]" />
                </div>
                <div className="bg-woodcut-red text-sm text-woodcut-card font-bold uppercase tracking-wide inline-block px-3 py-1 mb-2 border border-woodcut-card">Step 3</div>
                <h3 className="text-xl font-black mb-3 uppercase tracking-tight">Trade & Earn</h3>
                <p className="mb-4 uppercase font-bold">
                  Fans can trade tokens on the open market, with artists earning royalties on trades.
                </p>
                <Link href="/coins" className="text-woodcut-red flex items-center text-sm font-bold uppercase tracking-wide group-hover:underline">
                  <span>Explore market</span>
                  <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform stroke-[3px]" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Featured Artists Section */}
  
      
      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="sonic-glass-card p-8 md:p-12 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto text-center">
              <Sparkles className="text-primary h-10 w-10 mb-6 mx-auto" />
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to join the <span className="gradient-text">music revolution</span>?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Connect your wallet, explore the marketplace, and start creating or collecting music coins in a truly decentralized platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/coins" className="sonic-button-primary py-3 px-8">
                  <Coins size={20} />
                  <span>Create Your Coin</span>
                </Link>
                <Link href="/coins" className="sonic-button-outline py-3 px-8">
                  <Music size={20} />
                  <span>Explore Coins</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 