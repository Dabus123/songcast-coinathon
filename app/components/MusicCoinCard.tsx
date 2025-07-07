'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Address } from 'viem';
import { Coins, ExternalLink, ChevronDown, ChevronUp, Info, Share2, User2, User, Play, Pause } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import TradeMusicCoin from './TradeMusicCoin';
import FarcasterFrameEmbed from './FarcasterFrameEmbed';
import { useRouter } from 'next/navigation';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { getCoin } from "@zoralabs/coins-sdk";
import { useAudio } from '../context/AudioContext';

export interface MusicCoinCardProps {
  coinAddress: Address;
  name: string;
  symbol: string;
  description: string;
  artistName: string;
  artistAddress: Address;
  coverArt: string;
  audioUrl?: string;
  marketCap?: string;
  isSharedPage?: boolean;
}

export default function MusicCoinCard({
  coinAddress,
  name,
  symbol,
  description,
  artistName,
  artistAddress,
  coverArt,
  audioUrl,
  marketCap: initialMarketCap,
  isSharedPage = false
}: MusicCoinCardProps) {
  const [showTrade, setShowTrade] = useState(false);
  const [marketCap, setMarketCap] = useState<string>(initialMarketCap || '');
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const { currentTrack, isPlaying, play, pause, setShowMiniPlayer } = useAudio();

  // Create track object for this coin
  const track = {
    id: coinAddress,
    title: name,
    artist: artistName,
    src: audioUrl || '',
    coverArt,
    coinAddress
  };

  // Check if this is the currently playing track
  const isCurrentTrack = currentTrack?.id === track.id;
  const showPlayButton = audioUrl && audioUrl.length > 0;

  useEffect(() => {
    // Only fetch market cap if not provided via props
    if (initialMarketCap) return;
    
    const fetchMarketCap = async () => {
      try {
        const response = await getCoin({
          address: coinAddress,
          chain: base.id,
        });
        
        if (response.data?.zora20Token?.marketCap) {
          // Format market cap to be more readable
          const cap = parseFloat(response.data.zora20Token.marketCap);
          const formattedCap = cap >= 1000000 
            ? `$${(cap / 1000000).toFixed(1)}M`
            : cap >= 1000 
              ? `$${(cap / 1000).toFixed(1)}K`
              : `$${cap.toFixed(2)}`;
          setMarketCap(formattedCap);
        }
      } catch (error) {
        console.error('Error fetching market cap:', error);
      }
    };

    fetchMarketCap();
  }, [coinAddress, initialMarketCap]);

  const toggleTrade = () => {
    setShowTrade(prev => !prev);
    
    // Scroll to the card if trading panel is opened
    if (!showTrade && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!audioUrl) return;
    
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

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Generate absolute URL for Farcaster sharing
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/coins/share/${coinAddress}`;
  };

  // Add Farcaster frame embed if this is a shared page
  const renderFarcasterEmbed = () => {
    if (!isSharedPage) return null;
    
    return (
      <FarcasterFrameEmbed
        coinAddress={coinAddress}
        buttonText="Trade Coin"
        appName="SongCast"
      />
    );
  };
  
  // Copy share URL to clipboard
  const copyShareUrl = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert('Share URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <motion.div 
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="border-[1px] border-woodcut-card relative transition-all duration-300 hover:translate-y-[-4px] group w-full max-w-sm mx-auto"
      style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 2px, transparent 2px, transparent 8px)' }}
    >
      {renderFarcasterEmbed()}
      
      {/* Right vertical red border */}
      <div className="absolute top-0 right-0 bottom-0 w-2 bg-woodcut-red"></div>
      
      <div className="woodcut-card border-0 shadow-none">
        <Link href={`/coins/${coinAddress}`} className="block">
          <div className="aspect-square relative group/cover">
            {/* Cover art container with fixed dimensions */}
            <div className="relative h-full w-full">
              {coverArt ? (
                <Image 
                  src={coverArt} 
                  alt={name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover" 
                  priority
                  unoptimized={true}
                />
              ) : (
                <div className="w-full h-full bg-woodcut-card flex items-center justify-center">
                  <Coins size={64} className="text-woodcut-card stroke-[3px]" />
                </div>
              )}
              
              {/* Play button overlay */}
              {showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 bg-black/30">
                  <button
                    onClick={handlePlayClick}
                    className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                  >
                    {isCurrentTrack && isPlaying ? (
                      <Pause size={24} className="text-black ml-0" />
                    ) : (
                      <Play size={24} className="text-black ml-1" />
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {/* Header badge */}
            <div style={{zIndex:0}}  className="absolute top-0 right-0 bg-white p-2 text-black font-bold uppercase tracking-wide z-20">
              <span>{symbol || ""}</span>
            </div>
          </div>
        </Link>
        
        {/* Title band */}
        <div className="bg-[#2a2215] py-2 px-4 border-y-2 border-woodcut-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">{name || ""}</span>
            {marketCap && (
              <span className="text-xs font-mono text-white bg-black px-2 py-1 rounded">
                {marketCap}
              </span>
            )}
          </div>
        </div>
        
        {/* Wallet address strip */}
        <div className="border-b-2 border-woodcut-card bg-woodcut-card flex items-center px-4 py-2">
          <div className="w-6 h-6 flex items-center justify-center bg-woodcut-card border border-woodcut-card mr-2">
            <span className="text-woodcut-card text-xs">⬦</span>
          </div>
          <div className="text-xs font-mono text-woodcut-card truncate">
            {coinAddress || ""}
          </div>
        </div>
        <div className="border-b-2 border-woodcut-card bg-woodcut-card flex items-center px-4 py-2">
          <div className="w-6 h-6 flex items-center justify-center bg-woodcut-card border border-woodcut-card mr-2">
            <span className="text-woodcut-card text-xs"><User width={11} height={11}/></span>
          </div>
          <div className="text-xs font-mono text-woodcut-card truncate">
 
     
      <div className="text-sm font-medium">
      <button
                onClick={() => router.push(`/artists/${artistAddress}`)}
                className="bg-woodcut-card border-2 border-woodcut-card text-woodcut-card font-bold uppercase tracking-wide py-0.5 px-2 text-sm flex items-center gap-1"
                title="View Artist Profile"
              >
      <Name address={artistAddress as `0x${string}`} chain={base}/></button>
      </div>
    </div>
        </div>
        <div className="p-4 bg-woodcut-card">
          <p className="text-sm text-woodcut-card mb-8 line-clamp-2">
            {description || ""}
          </p>
          
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              <button
                onClick={toggleTrade}
                className="bg-woodcut-card border-2 border-woodcut-card text-woodcut-card font-bold uppercase tracking-wide py-2 px-4 text-sm flex items-center gap-2"
              >
                <span>Trade Coin</span>
                <ChevronDown size={16} className="stroke-[3px]" />
              </button>
              
              <button
                onClick={copyShareUrl}
                className="bg-woodcut-card border-2 border-woodcut-card text-woodcut-card font-bold uppercase tracking-wide py-2 px-3 text-sm flex items-center gap-1"
                title="Share to Farcaster"
              >
                <Share2 size={16} className="stroke-[3px]" />
              </button>
              <button
                onClick={() => router.push(`/artists/${artistAddress}`)}
                className="bg-woodcut-card border-2 border-woodcut-card text-woodcut-card font-bold uppercase tracking-wide py-2 px-3 text-sm flex items-center gap-1"
                title="View Artist Profile"
              >
                <User2 size={16} className="stroke-[3px]" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href={`/coins/${coinAddress}`}
                aria-label="View details"
                className="text-woodcut-card  hover:text-woodcut-orange transition-colors flex items-center text-sm gap-1 uppercase font-bold"
              >
                Details
              </Link>
              
              <a
                href={`https://basescan.org/address/${coinAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on blockchain"
                className="text-white-woodcut-card hover:text-woodcut-orange transition-colors flex items-center text-sm gap-1 uppercase font-bold"
              >
                <ExternalLink size={18} className="stroke-[3px] flex-shrink-0" />
              </a>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {showTrade && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="px-5 pb-5 overflow-hidden bg-woodcut-card"
            >
              <div className="border-t-2 border-woodcut-card pt-4">
                <TradeMusicCoin
                  coinAddress={coinAddress}
                  coinName={name}
                  coinSymbol={symbol}
                  artistName={artistAddress}
                  coverArt={coverArt}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 