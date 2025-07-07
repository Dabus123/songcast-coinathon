'use client';

import React, { useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

interface IPFSAudioProps {
  src: string;
  title: string;
  artist: string;
  coverArt?: string;
  coinAddress?: string;
  className?: string;
  onPlayError?: () => void;
}

export function IPFSAudio({ 
  src, 
  title, 
  artist, 
  coverArt, 
  coinAddress, 
  className = '', 
  onPlayError 
}: IPFSAudioProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    error,
    playlist,
    play,
    pause,
    nextTrack,
    previousTrack,
    seek,
    setShowMiniPlayer
  } = useAudio();

  // Create track object
  const track = {
    id: coinAddress || src, // Use coinAddress as unique ID, fallback to src
    title,
    artist,
    src,
    coverArt,
    coinAddress
  };

  // Check if this is the currently playing track
  const isCurrentTrack = currentTrack?.id === track.id;

  // Handle play/pause
  const handlePlay = async () => {
    try {
      if (isCurrentTrack && isPlaying) {
        pause();
      } else {
        await play(track);
        // Show mini player when starting to play a track
        setShowMiniPlayer(true);
      }
    } catch (err) {
      console.error("Playback failed:", err);
      if (onPlayError) onPlayError();
    }
  };

  const handleNextTrack = async () => {
    if (playlist.length > 1) {
      await nextTrack();
    }
  };

  const handlePreviousTrack = async () => {
    if (playlist.length > 1) {
      await previousTrack();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCurrentTrack || !isLoaded) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercentage = clickX / rect.width;
    const newTime = clickPercentage * duration;
    seek(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = isCurrentTrack && duration > 0 ? (currentTime / duration) * 100 : 0;
  const showError = isCurrentTrack && error;
  const trackIsLoaded = isCurrentTrack && isLoaded;
  const trackIsPlaying = isCurrentTrack && isPlaying;

  // Check if we can navigate tracks
  const canNavigateTracks = playlist.length > 1;

  return (
    <div className={`bg-woodcut-card rounded-lg p-4 ${className}`}>
      {/* Control buttons */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button 
          onClick={handlePreviousTrack}
          disabled={showError || !canNavigateTracks}
          className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous track"
        >
          <SkipBack size={20} className="text-white" />
        </button>
        
        <button 
          onClick={handlePlay}
          disabled={showError}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-transform duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {trackIsPlaying ? (
            <Pause size={24} className="text-woodcut-card" />
          ) : (
            <Play size={24} className="text-woodcut-card ml-1" />
          )}
        </button>
        
        <button 
          onClick={handleNextTrack}
          disabled={showError || !canNavigateTracks}
          className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next track"
        >
          <SkipForward size={20} className="text-white" />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="mb-2">
        <div 
          className="w-full h-2 bg-woodcut-card rounded-full cursor-pointer border-2 border-woodcut-card"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Time display */}
      <div className="flex justify-between text-xs text-woodcut-card">
        <span>{formatTime(isCurrentTrack ? currentTime : 0)}</span>
        <span>{formatTime(isCurrentTrack ? duration : 0)}</span>
      </div>
      
      {showError && (
        <div className="text-red-400 text-xs mt-2 text-center">
          Failed to load audio
        </div>
      )}
    </div>
  );
}

export default IPFSAudio; 