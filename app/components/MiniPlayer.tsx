'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, X, Maximize2 } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { usePathname } from 'next/navigation';
import '../globals.css';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    error,
    playlist,
    currentTrackIndex,
    toggle,
    nextTrack,
    previousTrack,
    seek,
    clearTrack,
    showMiniPlayer,
    setShowMiniPlayer
  } = useAudio();

  const pathname = usePathname();

  // Show mini player when:
  // 1. There's a current track
  // 2. showMiniPlayer is true (set when navigating away from coin detail)
  // 3. Not currently on the coin detail page of the playing track
  const shouldShowMiniPlayer = currentTrack && 
    showMiniPlayer && 
    pathname !== `/coins/${currentTrack.coinAddress}`;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoaded) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercentage = clickX / rect.width;
    const newTime = clickPercentage * duration;
    seek(newTime);
  };

  const handleMaximize = () => {
    if (currentTrack?.coinAddress) {
      setShowMiniPlayer(false);
      // Navigation will be handled by the Link component
    }
  };

  const handleClose = () => {
    clearTrack();
  };

  const handlePreviousTrack = async () => {
    await previousTrack();
  };

  const handleNextTrack = async () => {
    await nextTrack();
  };

  // Check if we can go to previous/next tracks
  const canGoPrevious = playlist.length > 1;
  const canGoNext = playlist.length > 1;

  // Get current track info for display
  const trackPosition = currentTrackIndex >= 0 ? currentTrackIndex + 1 : 0;
  const totalTracks = playlist.length;

  return (
    <AnimatePresence>
      {shouldShowMiniPlayer && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-woodcut-card/95 backdrop-blur-lg border-2 border-woodcut-card rounded-lg p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              {/* Album Art */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                {currentTrack.coverArt ? (
                  <Image
                    src={currentTrack.coverArt}
                    alt={currentTrack.title}
                    fill
                    className="object-cover"
                    unoptimized={true}
                  />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold">{currentTrack.title.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Track Info & Controls */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0 flex-1 text-woodcut-hard">
                    <h4 className="text-sm font-semibold font-woodcut-card truncate">
                      {currentTrack.title}
                    </h4>
                    {totalTracks > 0 && (
                      <p className="text-xs text-woodcut-card/70">
                        Track {trackPosition} of {totalTracks}
                      </p>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 ml-2">
                    {currentTrack.coinAddress && (
                      <Link href={`/coins/${currentTrack.coinAddress}`}>
                        <button
                          onClick={handleMaximize}
                          className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                        >
                          <Maximize2 size={14} className="text-white" />
                        </button>
                      </Link>
                    )}
                    <button
                      onClick={handleClose}
                      className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={handlePreviousTrack}
                    disabled={error || !canGoPrevious}
                    className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous track"
                  >
                    <SkipBack size={14} className="text-white" />
                  </button>

                  <button
                    onClick={toggle}
                    disabled={error}
                    className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-50"
                  >
                    {isPlaying ? (
                      <Pause size={16} className="text-woodcut-card" />
                    ) : (
                      <Play size={16} className="text-woodcut-card ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    disabled={error || !canGoNext}
                    className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next track"
                  >
                    <SkipForward size={14} className="text-white" />
                  </button>

                  <div className="flex-1 text-xs text-woodcut-card text-right">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  className="w-full h-1 bg-white/20 rounded-full cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-xs mt-1">
                    Playback error
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 