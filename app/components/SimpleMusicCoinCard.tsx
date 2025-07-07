import React, { useState, useEffect } from 'react';
import { Address } from 'viem';
import { Coins, Play, Pause } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { base } from 'viem/chains';
import { getCoin } from "@zoralabs/coins-sdk";
import { useAudio } from '../context/AudioContext';

export interface SimpleMusicCoinCardProps {
  coinAddress: Address;
  symbol: string;
  coverArt: string;
  name?: string;
  artistName?: string;
  audioUrl?: string;
}

export default function SimpleMusicCoinCard({
  coinAddress,
  symbol,
  coverArt,
  name,
  artistName,
  audioUrl,
}: SimpleMusicCoinCardProps) {
  const [marketCap, setMarketCap] = useState<string>('');
  
  const { currentTrack, isPlaying, play, pause, setShowMiniPlayer } = useAudio();

  // Create track object for this coin
  const track = {
    id: coinAddress,
    title: name || symbol,
    artist: artistName || 'Unknown Artist',
    src: audioUrl || '',
    coverArt,
    coinAddress
  };

  // Check if this is the currently playing track
  const isCurrentTrack = currentTrack?.id === track.id;
  const showPlayButton = audioUrl && audioUrl.length > 0;

  useEffect(() => {
    const fetchMarketCap = async () => {
      try {
        const response = await getCoin({
          address: coinAddress,
          chain: base.id,
        });
        
        if (response.data?.zora20Token?.marketCap) {
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
  }, [coinAddress]);

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

  return (
    <Link href={`/coins/${coinAddress}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sonic-card p-4 hover:bg-primary/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-4">
          {/* Cover art */}
          <div className="relative w-16 h-16 flex-shrink-0 group/cover">
            {coverArt ? (
              <Image 
                src={coverArt} 
                alt={symbol}
                fill
                className="object-cover rounded-md" 
                unoptimized={true}
              />
            ) : (
              <div className="w-full h-full bg-black rounded-md flex items-center justify-center">
                <Coins size={24} className="text-white" />
              </div>
            )}
            
            {/* Play button overlay */}
            {showPlayButton && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 bg-black/30 rounded-md">
                <button
                  onClick={handlePlayClick}
                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                >
                  {isCurrentTrack && isPlaying ? (
                    <Pause size={14} className="text-black ml-0" />
                  ) : (
                    <Play size={14} className="text-black ml-0.5" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{symbol}</span>
                {isCurrentTrack && isPlaying && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-3 bg-primary animate-pulse"></div>
                    <div className="w-1 h-2 bg-primary animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-4 bg-primary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </div>
              {marketCap && (
                <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded">
                  {marketCap}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
} 