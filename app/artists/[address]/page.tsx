'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Music } from 'lucide-react';
import { createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../../../services/pinataService';
import axios from 'axios';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import MusicCoinCard from '@/app/components/MusicCoinCard';

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

export default function ArtistPage() {
  const { address } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistName, setArtistName] = useState<string>('');
  const [artistCoins, setArtistCoins] = useState<any[]>([]);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!address) return;

      try {
        setLoading(true);
        // Fetch all known coins first
        const knownCoins = [
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

        const coinPromises = knownCoins.map(coinAddress => fetchCoinData(coinAddress));
        const results = await Promise.all(coinPromises);
        const validCoins = results.filter((coin): coin is NonNullable<typeof coin> => coin !== null);

        // Filter coins for this artist
        const artistCoins = validCoins.filter(coin => 
          coin.artistAddress.toLowerCase() === address.toString().toLowerCase()
        );

        setArtistCoins(artistCoins);

        // Set artist name from the first coin (if available)
        if (artistCoins.length > 0 && artistCoins[0]?.artistName) {
          setArtistName(artistCoins[0].artistName);
        }
      } catch (error) {
        console.error('Error fetching artist data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch artist data');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [address]);
  type Props = {
    artist: string;
  };
  
  const ShortAddressLink: React.FC<Props> = ({ artist }) => {
    if (!artist) return null;
  
    const shortAddress = `${artist.slice(0, 2)}...${artist.slice(-3)}`;
  
    return (
      <a
        href={`https://basescan.org/address/${artist}`}
        target="_blank"
        rel="noopener noreferrer"
        title={artist}
      >
        {shortAddress}
      </a>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
            <div className="rounded-full bg-primary/20 flex items-center justify-center text-xs">
           <Avatar address={address as `0x${string}`} chain={base}/>
            </div>
            <div className="text-sm font-medium">
            <Name address={address as `0x${string}`} chain={base}/>
            </div>
          </div>
          <a
        href={`https://basescan.org/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className=" text-xl font-bold mb-2 pr-6"
        >
        View on BaseScan
      </a>
          <Link
            href={`/artists/${address}/exclusive`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Lock size={16} />
            <span>VIP(coming soon)</span>
          </Link>
        </div>

        {loading ? (
          <div className="sonic-card p-12 text-center">
            <div className="spinner-md mx-auto mb-4"></div>
            <h3 className="text-xl font-medium mb-2">Loading Artist's Coins</h3>
            <p className="text-muted-foreground">Please wait while we fetch the coins...</p>
          </div>
        ) : error ? (
          <div className="sonic-card p-12 text-center">
            <div className="text-5xl mb-4 text-red-500">⚠️</div>
            <h3 className="text-xl font-medium mb-2">Error</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : artistCoins.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artistCoins.map((coin) => (
              <MusicCoinCard
              key={coin.coinAddress}
              coinAddress={coin.coinAddress}
              name={coin.name}
              symbol={coin.symbol}
              description={coin.description}
              artistName={coin.artistName}
              artistAddress={coin.artistAddress}
              coverArt={coin.coverArt}
              audioUrl={coin.audioUrl}
            />
            ))}
          </div>
        ) : (
          <div className="sonic-card p-12 text-center">
            <div className="text-5xl mb-4">🎵</div>
            <h3 className="text-xl font-medium mb-2">No Coins Found</h3>
            <p className="text-muted-foreground">
              This artist hasn't created any music coins yet.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
} 