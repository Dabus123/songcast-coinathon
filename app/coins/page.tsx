'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Coins, Plus, GridIcon, Sparkles, ArrowRight, TrendingUp, Search, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicCoinCard from '../components/MusicCoinCard';
import CreateMusicCoin from '../components/CreateMusicCoin';
import { useZoraEvents } from '../hooks/useZoraEvents';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../services/pinataService';
import axios from 'axios';
import { getCoin } from "@zoralabs/coins-sdk";

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

const MotionCoins = motion(Coins);

export default function MusicCoinsPage() {
  const { isConnected } = useAccount();
  const { coins, loading, error, refreshCoins, progressMessage } = useZoraEvents();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('marketCapDesc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [knownCoins, setKnownCoins] = useState<any[]>([]);
  const [knownCoinsLoading, setKnownCoinsLoading] = useState(true);
  const [newlyCreatedCoins, setNewlyCreatedCoins] = useState<any[]>([]);
  const [newlyCreatedAddresses, setNewlyCreatedAddresses] = useState<Address[]>([]);
  
  // Load newly created coin addresses from localStorage
  useEffect(() => {
    const loadNewlyCreatedCoins = () => {
      try {
        const storedCoins = JSON.parse(localStorage.getItem('newlyCreatedCoins') || '[]');
        
        // Filter out coins older than 24 hours to prevent stale data
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentCoins = storedCoins.filter((coin: any) => 
          coin.createdAt && coin.createdAt > twentyFourHoursAgo
        );
        
        // Extract just the addresses
        const addresses = recentCoins.map((coin: any) => coin.coinAddress as Address);
        setNewlyCreatedAddresses(addresses);
        
        // Update localStorage with filtered coins
        if (recentCoins.length !== storedCoins.length) {
          try {
            localStorage.setItem('newlyCreatedCoins', JSON.stringify(recentCoins));
          } catch (storageError) {
            console.error('Failed to update localStorage:', storageError);
            // Continue with the coins we have
          }
        }
        
        console.log('Loaded newly created coin addresses from localStorage:', addresses);
      } catch (error) {
        console.error('Error loading newly created coins:', error);
        setNewlyCreatedAddresses([]);
        
        // If there's a parsing error, clear the corrupted data
        try {
          localStorage.removeItem('newlyCreatedCoins');
        } catch (clearError) {
          console.error('Failed to clear corrupted localStorage:', clearError);
        }
      }
    };
    
    loadNewlyCreatedCoins();
    
    // Set up storage event listener to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'newlyCreatedCoins') {
        loadNewlyCreatedCoins();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Fetch coin data for newly created addresses
  useEffect(() => {
    const fetchNewlyCreatedCoins = async () => {
      if (newlyCreatedAddresses.length === 0) {
        setNewlyCreatedCoins([]);
        return;
      }
      
      try {
        const coinPromises = newlyCreatedAddresses.map(address => 
          fetchCoinData(address)
        );
        
        const results = await Promise.all(coinPromises);
        const validCoins = results.filter(Boolean);
        setNewlyCreatedCoins(validCoins);
        console.log('Fetched newly created coins:', validCoins);
      } catch (error) {
        console.error('Error fetching newly created coins:', error);
        setNewlyCreatedCoins([]);
      }
    };
    
    fetchNewlyCreatedCoins();
  }, [newlyCreatedAddresses]);
  
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
  
  // Filter coins based on search term
  const filteredCoins = coins.filter(coin => 
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coin.artistName && coin.artistName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Filter newly created coins based on search term
  const filteredNewlyCreatedCoins = newlyCreatedCoins.filter(coin => 
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coin.artistName && coin.artistName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Filter known coins based on search term
  const filteredKnownCoins = knownCoins.filter(coin => 
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coin.artistName && coin.artistName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Combine all coins with proper duplicate detection
  const allCoinsMap = new Map<string, any>();
  
  // Add newly created coins first (highest priority)
  filteredNewlyCreatedCoins.forEach(coin => {
    allCoinsMap.set(coin.coinAddress.toLowerCase(), coin);
  });
  
  // Add filtered known coins if not already present
  filteredKnownCoins.forEach(coin => {
    const key = coin.coinAddress.toLowerCase();
    if (!allCoinsMap.has(key)) {
      allCoinsMap.set(key, coin);
    }
  });
  
  // Add filtered coins from blockchain events if not already present
  filteredCoins.forEach(coin => {
    const key = coin.coinAddress.toLowerCase();
    if (!allCoinsMap.has(key)) {
      allCoinsMap.set(key, coin);
    }
  });
  
  // Convert map back to array
  const allCoins = Array.from(allCoinsMap.values());
  
  const toggleCreateForm = () => {
    setShowCreateForm(prev => !prev);
    
    // Reset search and tabs when toggling
    if (showCreateForm) {
      setSearchTerm('');
      setSortOption('marketCapDesc');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Refresh blockchain data
    await refreshCoins();
    
    // Check if any newly created coins are now indexed and can be removed from localStorage
    try {
      const storedCoins = JSON.parse(localStorage.getItem('newlyCreatedCoins') || '[]');
      const updatedStoredCoins = [];
      
      for (const storedCoin of storedCoins) {
        // Check if this coin is now in the fetched coins (indexed)
        const isIndexed = coins.some(coin => coin.coinAddress === storedCoin.coinAddress) ||
                         knownCoins.some(coin => coin.coinAddress === storedCoin.coinAddress);
        
        if (!isIndexed) {
          updatedStoredCoins.push(storedCoin);
        } else {
          console.log(`Coin ${storedCoin.coinAddress} is now indexed, removing from localStorage`);
        }
      }
      
      // Update localStorage and state if any coins were removed
      if (updatedStoredCoins.length !== storedCoins.length) {
        try {
          localStorage.setItem('newlyCreatedCoins', JSON.stringify(updatedStoredCoins));
          // Update the addresses state to trigger re-fetch of coin data
          const updatedAddresses = updatedStoredCoins.map((coin: any) => coin.coinAddress as Address);
          setNewlyCreatedAddresses(updatedAddresses);
        } catch (storageError) {
          console.error('Failed to update localStorage during cleanup:', storageError);
          // Continue without updating localStorage
        }
      }
    } catch (error) {
      console.error('Error cleaning up newly created coins:', error);
      
      // If localStorage is corrupted, clear it
      try {
        localStorage.removeItem('newlyCreatedCoins');
        setNewlyCreatedAddresses([]);
      } catch (clearError) {
        console.error('Failed to clear corrupted localStorage:', clearError);
      }
    }
    
    setIsRefreshing(false);
  };
  
  // Sort coins based on selected option
  const sortedCoins = [...allCoins].sort((a, b) => {
    switch (sortOption) {
      case 'marketCapDesc':
        // Convert market cap to numbers, defaulting to 0 if not available
        const aCapDesc = parseFloat(a.metadata?.marketCap || '0');
        const bCapDesc = parseFloat(b.metadata?.marketCap || '0');
        return bCapDesc - aCapDesc;
      
      case 'marketCapAsc':
        // Convert market cap to numbers, defaulting to 0 if not available
        const aCapAsc = parseFloat(a.metadata?.marketCap || '0');
        const bCapAsc = parseFloat(b.metadata?.marketCap || '0');
        return aCapAsc - bCapAsc;
      
      default:
        return 0;
    }
  });

  // Helper function to format market cap
  const formatMarketCap = (marketCapString: string) => {
    if (!marketCapString || marketCapString === '0') return '';
    
    const cap = parseFloat(marketCapString);
    if (cap >= 1000000) {
      return `$${(cap / 1000000).toFixed(1)}M`;
    } else if (cap >= 1000) {
      return `$${(cap / 1000).toFixed(1)}K`;
    } else {
      return `$${cap.toFixed(2)}`;
    }
  };

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="gradient-text text-4xl font-bold mb-2 flex items-center gap-3">
                <MotionCoins 
                  size={32} 
                  className="text-primary"
                  animate={{ 
                    rotateY: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.6, 1],
                    repeat: Infinity,
                    repeatDelay: 5
                  }}
                />
                <span>Music Coins</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Create, trade, and collect coins for your favorite music artists
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleRefresh}
                className="sonic-button-outline py-2 px-4"
                disabled={isRefreshing}
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
              
              <button 
                onClick={toggleCreateForm}
                className="sonic-button-primary py-3 px-6"
              >
                {showCreateForm ? (
                  <>
                    <GridIcon size={18} />
                    <span>Browse Coins</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Create Coin</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {!showCreateForm && (
            <div className="relative">
             
              <input
                type="text"
                placeholder="Search coins by name, symbol, or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sonic-input pl-12 py-3 mb-6 md:mb-0"
              />
            </div>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {showCreateForm ? (
            <motion.div
              key="create-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <CreateMusicCoin />
            </motion.div>
          ) : (
            <motion.div
              key="coin-listing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Information Cards */}
              <div className="sonic-glass-card p-8 mb-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles size={24} className="text-primary" />
                  <span>What are Music Coins?</span>
                </h2>
                
                <p className="text-muted-foreground mb-8 max-w-3xl">
                  Music Coins are social tokens that represent artists and their music. 
                  Create a coin for your music, build a community around your brand, and let fans 
                  invest in your success. All powered by Zora's token protocol on the blockchain.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="sonic-card p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Coins size={20} className="text-primary" />
                      </div>
                      <h3 className="font-bold">For Artists</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create a coin for your music and build a community around your brand.
                      Fans who hold your coin are invested in your success.
                    </p>
                    <div className="mt-4">
                      <button 
                        onClick={toggleCreateForm}
                        className="text-primary flex items-center text-sm hover:underline"
                      >
                        <span>Create your coin</span>
                        <ArrowRight size={14} className="ml-1" />
                      </button>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="sonic-card p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <TrendingUp size={20} className="text-primary" />
                      </div>
                      <h3 className="font-bold">For Fans</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Support your favorite artists by buying their coins early.
                      As they grow more popular, so might the value of their coins.
                    </p>
                    <div className="mt-4">
                      <a href="#featured" className="text-primary flex items-center text-sm hover:underline">
                        <span>Discover artists</span>
                        <ArrowRight size={14} className="ml-1" />
                      </a>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="sonic-card p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles size={20} className="text-primary" />
                      </div>
                      <h3 className="font-bold">For Traders</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Discover emerging artists and trade their coins.
                      Spot the next big thing before everyone else.
                    </p>
                    <div className="mt-4">
                      <a href="#featured" className="text-primary flex items-center text-sm hover:underline">
                        <span>Start trading</span>
                        <ArrowRight size={14} className="ml-1" />
                      </a>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Replace Tab Navigation with Dropdown */}
              <div className="flex justify-end mb-8">
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="sonic-input pl-4 pr-8 py-2 appearance-none cursor-pointer"
                  >
                    <option value="marketCapDesc">$mcap: High to Low</option>
                    <option value="marketCapAsc">$mcap: Low to High</option>
                  </select>
                 
                </div>
              </div>
              
              {/* Coins Grid */}
              <div id="featured" className="mb-12">
                {loading && knownCoinsLoading ? (
                  <div className="sonic-card p-12 text-center">
                    <div className="spinner-md mx-auto mb-4"></div>
                    <h3 className="text-xl font-medium mb-2">Loading Music Coins</h3>
                    <p className="text-muted-foreground">
                      {progressMessage || "Fetching coins from the Zora protocol..."}
                    </p>
                  </div>
                ) : error && knownCoins.length === 0 ? (
                  <div className="sonic-card p-12 text-center">
                    <div className="text-5xl mb-4 text-red-500">
                      <AlertCircle size={64} className="mx-auto" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Error Loading Coins</h3>
                    <p className="text-muted-foreground mb-6">
                      {error.message || "There was an error fetching coins from the blockchain."}
                    </p>
                    <button
                      onClick={handleRefresh}
                      className="sonic-button-outline mx-auto"
                    >
                      <RefreshCw size={16} />
                      <span>Try Again</span>
                    </button>
                  </div>
                ) : sortedCoins.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedCoins.map((coin) => {
                      // Check if this is a newly created coin
                      const isNewlyCreated = newlyCreatedAddresses.some(
                        address => address.toLowerCase() === coin.coinAddress.toLowerCase()
                      );
                      
                      return (
                        <div key={coin.coinAddress} className="relative">
                          {isNewlyCreated && (
                            <div style={{zIndex:10}} className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                              NEW
                            </div>
                          )}
                          <div style={{zIndex:0}} >
                          <MusicCoinCard
                            coinAddress={coin.coinAddress}
                            name={coin.name}
                            symbol={coin.symbol}
                            description={coin.description}
                            artistName={coin.artistName}
                            artistAddress={coin.artistAddress}
                            coverArt={coin.coverArt}
                            audioUrl={coin.audioUrl}
                            marketCap={formatMarketCap(coin.metadata?.marketCap || '0')}
                          /></div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sonic-card p-12 text-center">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="text-xl font-medium mb-2">No coins found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm 
                        ? "We couldn't find any coins matching your search criteria."
                        : "No music coins have been created yet with our platform referrer."
                      }
                    </p>
                    {searchTerm ? (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="sonic-button-outline mx-auto"
                      >
                        Clear Search
                      </button>
                    ) : (
                      <button
                        onClick={toggleCreateForm}
                        className="sonic-button-primary mx-auto"
                      >
                        <Plus size={16} />
                        <span>Create First Coin</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* CTA Section */}
              <div className="text-center py-10">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-3">Ready to launch your music coin?</h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Create your own token, build a community around your music, and let your fans 
                    support your journey directly.
                  </p>
                </div>
                <button 
                  onClick={toggleCreateForm}
                  className="sonic-button-primary py-3 px-8 mx-auto"
                >
                  <Plus size={18} />
                  <span>Create Your Coin</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
} 