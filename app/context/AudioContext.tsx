import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { getIpfsUrl } from '../services/pinataService';
import { Address, createPublicClient, custom } from 'viem';
import { base } from 'viem/chains';
import axios from 'axios';

// Known coin addresses that form our playlist
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

// ABI for reading contract data
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
    name: 'tokenURI',
    outputs: [{ type: 'string', name: '' }],
    stateMutability: 'view',
    type: 'function',
  }
];

// Custom transport for RPC calls
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
        throw new Error(response.data.error.message || 'RPC request failed');
      }
      
      return response.data.result;
    } catch (error) {
      throw error;
    }
  },
});

const publicClient = createPublicClient({
  chain: base,
  transport: proxyTransport,
});

interface Track {
  id: string;
  title: string;
  src: string;
  coverArt?: string;
  coinAddress?: string;
}

interface AudioContextType {
  // Current track state
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  error: boolean;
  
  // Playlist state
  playlist: Track[];
  currentTrackIndex: number;
  isLoadingPlaylist: boolean;
  isAutoNavigation: boolean;
  
  // Audio controls
  play: (track?: Track) => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (time: number) => void;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  
  // Track management
  setTrack: (track: Track) => void;
  clearTrack: () => void;
  
  // Mini player state
  showMiniPlayer: boolean;
  setShowMiniPlayer: (show: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(true);
  const [isAutoNavigation, setIsAutoNavigation] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch track metadata from IPFS
  const fetchTokenMetadata = async (uri: string) => {
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
  };

  // Fetch track data from contract
  const fetchTrackFromContract = async (address: Address): Promise<Track | null> => {
    try {
      const [name, tokenUri] = await Promise.all([
        publicClient.readContract({
          address,
          abi: ERC721_ABI,
          functionName: 'name',
        }),
        publicClient.readContract({
          address,
          abi: ERC721_ABI,
          functionName: 'tokenURI',
        })
      ]);

      const metadata = await fetchTokenMetadata(tokenUri as string);
      if (!metadata) return null;

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
        id: address,
        title: name as string,
        src: audioUrl,
        coverArt,
        coinAddress: address
      };
    } catch (error) {
      console.error(`Error fetching track for ${address}:`, error);
      return null;
    }
  };

  // Load playlist from known coin addresses
  useEffect(() => {
    const loadPlaylist = async () => {
      setIsLoadingPlaylist(true);
      try {
        const trackPromises = KNOWN_COIN_ADDRESSES.map(address => 
          fetchTrackFromContract(address as Address)
        );
        
        const results = await Promise.all(trackPromises);
        const validTracks = results.filter(Boolean) as Track[];
        setPlaylist(validTracks);
      } catch (error) {
        console.error('Error loading playlist:', error);
      } finally {
        setIsLoadingPlaylist(false);
      }
    };

    loadPlaylist();
  }, []);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Create audio element for the current track
  const createAudioElement = (track: Track) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const ipfsUrl = getIpfsUrl(track.src);
    console.log("Creating new audio element for:", ipfsUrl);
    
    audioRef.current = new Audio(ipfsUrl);
    
    audioRef.current.addEventListener('error', (e) => {
      console.error(`Audio playback error for: ${ipfsUrl} (original: ${track.src})`, e);
      setError(true);
      setIsPlaying(false);
    });
    
    audioRef.current.addEventListener('ended', async () => {
      setIsPlaying(false);
      // Auto-play next track when current track ends
      await nextTrack();
    });
    
    audioRef.current.addEventListener('loadedmetadata', () => {
      setDuration(audioRef.current?.duration || 0);
      setIsLoaded(true);
    });
    
    audioRef.current.addEventListener('timeupdate', () => {
      setCurrentTime(audioRef.current?.currentTime || 0);
    });

    // Reset states for new track
    setError(false);
    setIsLoaded(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const setTrack = (track: Track) => {
    setCurrentTrack(track);
    createAudioElement(track);
    
    // Update current track index in playlist
    const index = playlist.findIndex(t => t.id === track.id);
    setCurrentTrackIndex(index);
    
    // This is a manual track selection, not auto-navigation
    setIsAutoNavigation(false);
  };

  const play = async (track?: Track) => {
    if (track && (!currentTrack || track.id !== currentTrack.id)) {
      setTrack(track);
    }

    if (!audioRef.current && currentTrack) {
      createAudioElement(currentTrack);
    }

    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        setError(false);
      } catch (err) {
        console.error("Playback failed:", err);
        setError(true);
        setIsPlaying(false);
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggle = async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  };

  const seek = (time: number) => {
    if (audioRef.current && isLoaded) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const nextTrack = async () => {
    if (playlist.length === 0) return;
    
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= playlist.length) {
      nextIndex = 0; // Loop back to first track
    }
    
    const nextTrack = playlist[nextIndex];
    if (nextTrack) {
      setIsAutoNavigation(true); // This is auto-navigation
      setCurrentTrackIndex(nextIndex);
      setCurrentTrack(nextTrack);
      createAudioElement(nextTrack);
      
      // Auto-play the next track if currently playing
      if (isPlaying) {
        try {
          await audioRef.current?.play();
        } catch (err) {
          console.error("Next track playback failed:", err);
          setError(true);
          setIsPlaying(false);
        }
      }
      
      // Reset auto-navigation flag after a brief delay
      setTimeout(() => setIsAutoNavigation(false), 100);
    }
  };

  const previousTrack = async () => {
    if (playlist.length === 0) return;
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1; // Loop to last track
    }
    
    const prevTrack = playlist[prevIndex];
    if (prevTrack) {
      setIsAutoNavigation(true); // This is auto-navigation
      setCurrentTrackIndex(prevIndex);
      setCurrentTrack(prevTrack);
      createAudioElement(prevTrack);
      
      // Auto-play the previous track if currently playing
      if (isPlaying) {
        try {
          await audioRef.current?.play();
        } catch (err) {
          console.error("Previous track playback failed:", err);
          setError(true);
          setIsPlaying(false);
        }
      }
      
      // Reset auto-navigation flag after a brief delay
      setTimeout(() => setIsAutoNavigation(false), 100);
    }
  };

  const clearTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoaded(false);
    setError(false);
    setShowMiniPlayer(false);
    setCurrentTrackIndex(-1);
    setIsAutoNavigation(false);
  };

  const value: AudioContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    error,
    playlist,
    currentTrackIndex,
    isLoadingPlaylist,
    isAutoNavigation,
    play,
    pause,
    toggle,
    seek,
    nextTrack,
    previousTrack,
    setTrack,
    clearTrack,
    showMiniPlayer,
    setShowMiniPlayer,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
} 