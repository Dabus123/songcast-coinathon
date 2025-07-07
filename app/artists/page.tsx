'use client';

import React, { useState, useEffect } from 'react';
import { useZoraEvents } from '../hooks/useZoraEvents';
import { motion } from 'framer-motion';
import { Search, User, Music, Coins } from 'lucide-react';
import MusicCoinCard from '../components/MusicCoinCard';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../services/pinataService';
import axios from 'axios';
import { Avatar, Name, useName } from '@coinbase/onchainkit/identity';
import SimpleMusicCoinCard from '../components/SimpleMusicCoinCard';
import Link from 'next/link';

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

type Props = {
  address: string;
};


const ShortAddressLink: React.FC<Props> = ({ address }) => {
  if (!address) return null;

  const shortAddress = `${address.slice(0, 2)}...${address.slice(-3)}`;

  return (
    <a
      href={`https://basescan.org/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      title={address}
    >
      {shortAddress}
    </a>
  );
};

// Helper component to resolve names and update the resolved names state
const NameResolver: React.FC<{ 
  address: Address; 
  onNameResolved: (address: string, name: string) => void;
}> = ({ address, onNameResolved }) => {
  const { data: name } = useName({
    address: address as `0x${string}`,
    chain: base,
  });

  useEffect(() => {
    if (name && name !== address) {
      onNameResolved(address.toLowerCase(), name);
    }
  }, [name, address, onNameResolved]);

  return null; // This component doesn't render anything
};

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
async function fetchCoinData(address: Address) {
  try {
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
      artistName: artistName as string,
      artistAddress: artistAddress as Address || '0x0000000000000000000000000000000000000000',
      coverArt,
      audioUrl,
      metadata
    };
  } catch (error) {
    console.error(`Error fetching coin data for ${address}:`, error);
    return null;
  }
}

interface ArtistCoins {
  artistAddress: Address;
  artistName: string;
  resolvedName?: string;
  coins: any[];
}

interface Coin {
  coinAddress: string;
  name: string;
  symbol: string;
  description: string;
  artistName: string;
  artistAddress: Address;
  coverArt: string;
  audioUrl: string;
  metadata: any;
}

export default function ArtistsPage() {
  const { coins, loading, error, progressMessage } = useZoraEvents();
  const [searchTerm, setSearchTerm] = useState('');
  const [artistCoins, setArtistCoins] = useState<ArtistCoins[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [knownCoins, setKnownCoins] = useState<any[]>([]);
  const [knownCoinsLoading, setKnownCoinsLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  // Callback to handle resolved names
  const handleNameResolved = React.useCallback((address: string, name: string) => {
    setResolvedNames(prev => ({
      ...prev,
      [address]: name
    }));
  }, []);

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

        // Group known coins by artist immediately
        const grouped = validCoins.reduce((acc: Record<string, ArtistCoins>, coin: any) => {
          if (!coin) return acc;
          const key = coin.artistAddress.toLowerCase();
          if (!acc[key]) {
            acc[key] = {
              artistAddress: coin.artistAddress,
              artistName: coin.artistName,
              coins: []
            };
          }
          acc[key].coins.push(coin);
          return acc;
        }, {});

        setArtistCoins(Object.values(grouped));
      } catch (error) {
        console.error('Error fetching known coins:', error);
      } finally {
        setKnownCoinsLoading(false);
      }
    };
    
    fetchKnownCoins();
  }, []);

  // Update artist coins when new coins are fetched in the background
  useEffect(() => {
    if (!coins) return;
    setBackgroundLoading(false);

    const allCoins = [...knownCoins];
    coins.forEach(coin => {
      if (!allCoins.some(knownCoin => knownCoin.coinAddress === coin.coinAddress)) {
        allCoins.push(coin);
      }
    });

    const grouped = allCoins.reduce((acc: Record<string, ArtistCoins>, coin: any) => {
      if (!coin) return acc;
      const key = coin.artistAddress.toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          artistAddress: coin.artistAddress,
          artistName: coin.artistName,
          coins: []
        };
      }
      acc[key].coins.push(coin);
      return acc;
    }, {});

    setArtistCoins(Object.values(grouped));
  }, [coins, knownCoins]);

  // Filter artists based on search term
  const filteredArtists = artistCoins.filter(artist => {
    const searchLower = searchTerm.toLowerCase();
    const resolvedName = resolvedNames[artist.artistAddress.toLowerCase()];
    
    return (
      artist.artistName.toLowerCase().includes(searchLower) ||
      artist.artistAddress.toLowerCase().includes(searchLower) ||
      (resolvedName && resolvedName.toLowerCase().includes(searchLower))
    );
  });

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="gradient-text text-4xl font-bold mb-2 flex items-center gap-3">
            <User size={32} className="text-primary" />
            <span>Music Artists</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover artists and their music coins
          </p>

          {/* Search Bar */}
          <div className="relative mt-6">
           
            <input
              type="text"
              placeholder="Search artists by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sonic-input pl-12 py-3 w-full"
            />
          </div>
        </motion.div>

        {/* Content */}
        {knownCoinsLoading ? (
          <div className="sonic-card p-12 text-center">
            <div className="spinner-md mx-auto mb-4"></div>
            <h3 className="text-xl font-medium mb-2">Loading Known Artists</h3>
            <p className="text-muted-foreground">
              Loading our curated list of artists...
            </p>
          </div>
        ) : error && knownCoins.length === 0 ? (
          <div className="sonic-card p-12 text-center">
            <div className="text-5xl mb-4 text-red-500">⚠️</div>
            <h3 className="text-xl font-medium mb-2">Error Loading Artists</h3>
            <p className="text-muted-foreground">
              {error.message || "There was an error fetching artists data."}
            </p>
          </div>
        ) : filteredArtists.length > 0 ? (
          <>
            {/* Name resolvers - hidden components that resolve names for search */}
            {artistCoins.map((artist) => (
              <NameResolver
                key={`resolver-${artist.artistAddress}`}
                address={artist.artistAddress}
                onNameResolved={handleNameResolved}
              />
            ))}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtists.map((artist) => (
                <motion.div
                  key={artist.artistAddress}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="sonic-card p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                    <Link 
                      href={`/artists/${artist.artistAddress}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="rounded-full bg-primary/20 flex items-center justify-center text-xs">
                          <Avatar address={artist.artistAddress as `0x${string}`} chain={base}/>
                        </div>
                        <div className="text-sm font-medium">
                          <Name address={artist.artistAddress as `0x${string}`} chain={base}/>
                        </div>
                      </div></Link>
                      <p className="text-sm text-muted-foreground">
                        {artist.coins.length} {artist.coins.length === 1 ? 'coin' : 'coins'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {artist.coins
                      .sort((a, b) => {
                        // Sort by market cap (if available)
                        const aCap = parseFloat(a.metadata?.marketCap || '0');
                        const bCap = parseFloat(b.metadata?.marketCap || '0');
                        return bCap - aCap;
                      })
                      .map((coin) => (
                        <SimpleMusicCoinCard
                          key={coin.coinAddress}
                          coinAddress={coin.coinAddress}
                          symbol={coin.symbol}
                          coverArt={coin.coverArt}
                          audioUrl={coin.audioUrl}
                        />
                      ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Background Loading Indicator */}
            {backgroundLoading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <div className="spinner-sm"></div>
                  <span>{progressMessage || "Searching for more artists..."}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="sonic-card p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-medium mb-2">No artists found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "We couldn't find any artists matching your search criteria."
                : "No artists have created music coins yet."
              }
            </p>
          </div>
        )}
      </div>
    </main>
  );
} 