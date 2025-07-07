'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { Address, parseEther } from 'viem';
import { Music, Upload, Trash2, Info, Clock, Disc, AudioLines, Coins, Play, Pause, FileText, ChevronDown, CheckSquare, LogIn } from 'lucide-react';
import { useZoraCoins, CoinData } from '../hooks/useZoraCoins';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../services/pinataService';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { installIpfsGatewayProxy, cacheMetadata } from '../utils/ipfsGatewayProxy';

// Music genres for the dropdown
const MUSIC_GENRES = [
  "Rock", "Pop", "Hip Hop", "Electronic", "Jazz", "Classical", 
  "R&B", "Country", "Folk", "Metal", "Ambient", "Indie","AI", "Other"
];

// Utility function to safely work with localStorage
const safeLocalStorage = {
  isAvailable: () => {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  getUsage: () => {
    if (!safeLocalStorage.isAvailable()) return { used: 0, remaining: 0, percentage: 0 };
    
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // Most browsers allow 5-10MB, we'll assume 5MB as conservative estimate
    const total = 5 * 1024 * 1024; // 5MB in bytes
    return {
      used,
      remaining: total - used,
      percentage: (used / total) * 100
    };
  }
};

// ClientOnly wrapper to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : <div style={{ visibility: 'hidden' }} aria-hidden="true"></div>;
}

export default function CreateMusicCoin() {
  const { address, isConnected } = useAccount();
  const { 
    createMusicCoin, 
    isCreatingCoin, 
    createCoinSuccess, 
    createCoinError,
    createdCoinAddress
  } = useZoraCoins();
  
  const audioFileRef = useRef<HTMLInputElement>(null);
  const coverArtRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<string>('0:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioCID, setAudioCID] = useState<string | null>(null);
  const [imageCID, setImageCID] = useState<string | null>(null);
  const [metadataCID, setMetadataCID] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading_audio' | 'uploading_cover' | 'uploading_metadata' | 'creating_coin'>('idle');
  
  const [formState, setFormState] = useState({
    name: '',
    symbol: '',
    description: '',
    genre: '',
    artist: address || '',
    additionalOwners: '', // Comma-separated addresses for multi-owner support (still supported)
    currency: 1 as 1 | 2, // 1 = ZORA (default on Base), 2 = ETH
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  const { connect, connectors } = useConnect();
  
  // Install our IPFS gateway proxy when the component mounts
  useEffect(() => {
    installIpfsGatewayProxy();
  }, []);

  // Close the dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target as Node)) {
        setShowGenreDropdown(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setShowCurrencyDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update artist field when address changes
  useEffect(() => {
    if (address && !formState.artist) {
      setFormState(prev => ({
        ...prev,
        artist: address
      }));
    }
  }, [address, formState.artist]);

  // Track transaction status
  useEffect(() => {
    setTxPending(formSubmitted && isCreatingCoin);
    setTxSuccess(createCoinSuccess);
    
    if (createCoinError) {
      setTxError(createCoinError.message);
      setFormSubmitted(false);
    }
    
    if (createCoinSuccess && createdCoinAddress) {
      setFormSubmitted(false);
      
      // Store the newly created coin data in localStorage for immediate display
      // Only store essential data to avoid localStorage quota issues
      const newCoinData = {
        coinAddress: createdCoinAddress,
        createdAt: Date.now()
      };
      
      try {
        // Check if localStorage is available
        if (!safeLocalStorage.isAvailable()) {
          console.warn('localStorage is not available, coin will not be cached for immediate display');
          return;
        }
        
        // Get existing newly created coins from localStorage
        const existingCoins = JSON.parse(localStorage.getItem('newlyCreatedCoins') || '[]');
        
        // Check if this coin address already exists to prevent duplicates
        const coinExists = existingCoins.some((coin: any) => coin.coinAddress === createdCoinAddress);
        if (coinExists) {
          console.log('Coin already exists in localStorage, skipping');
          return;
        }
        
        // Add the new coin and keep only the last 10 coins to prevent localStorage bloat
        const updatedCoins = [newCoinData, ...existingCoins].slice(0, 10);
        
        localStorage.setItem('newlyCreatedCoins', JSON.stringify(updatedCoins));
        console.log('Stored newly created coin address in localStorage:', newCoinData);
      } catch (error) {
        console.error('Failed to store newly created coin in localStorage:', error);
        
        // If localStorage is full, try to clear old entries and retry
        try {
          localStorage.removeItem('newlyCreatedCoins');
          localStorage.setItem('newlyCreatedCoins', JSON.stringify([newCoinData]));
          console.log('Cleared localStorage and stored new coin address');
        } catch (retryError) {
          console.error('Failed to store coin even after clearing localStorage:', retryError);
          // Continue without localStorage - the coin will still be created successfully
        }
      }
    }
  }, [isCreatingCoin, createCoinSuccess, createCoinError, formSubmitted, createdCoinAddress]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleSelectGenre = (genre: string) => {
    setFormState(prev => ({
      ...prev,
      genre
    }));
    setShowGenreDropdown(false);
    
    // Clear error when field is edited
    if (errors.genre) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.genre;
        return newErrors;
      });
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`Selected audio file size: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB > 50) {
        setErrors(prev => ({
          ...prev,
          audio: `File is too large (${fileSizeMB.toFixed(2)}MB). Maximum recommended size is 50MB.`
        }));
        return;
      }
      
      // Create a preview URL
      const audioUrl = URL.createObjectURL(file);
      setPreviewAudio(audioUrl);
      
      // Load audio to get duration
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        setAudioDuration(`${minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
      });
      
      // Clear any previous error
      if (errors.audio) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.audio;
          return newErrors;
        });
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      console.log(`Selected image file size: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB > 10) {
        setErrors(prev => ({
          ...prev,
          image: `Image is too large (${fileSizeMB.toFixed(2)}MB). Maximum recommended size is 10MB.`
        }));
        return;
      }
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous error
      if (errors.image) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const triggerAudioInput = () => {
    audioFileRef.current?.click();
  };

  const triggerImageInput = () => {
    coverArtRef.current?.click();
  };

  const togglePlayPause = () => {
    if (!previewAudio) return;
    
    if (isPlaying) {
      audioElement?.pause();
      setIsPlaying(false);
    } else {
      if (!audioElement) {
        const audio = new Audio(previewAudio);
        audio.play();
        setAudioElement(audio);
        setIsPlaying(true);
        
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.name.trim()) newErrors.name = 'Name is required';
    if (!formState.symbol.trim()) newErrors.symbol = 'Symbol is required';
    if (!formState.description.trim()) newErrors.description = 'Description is required';
    if (!audioFileRef.current?.files?.length) newErrors.audio = 'Audio file is required';
    if (!coverArtRef.current?.files?.length) newErrors.image = 'Cover art is required';
    
    // Symbol validation - up to 11 characters, no spaces
    if (formState.symbol && !/^[A-Za-z0-9_-]{1,11}$/.test(formState.symbol)) {
      newErrors.symbol = 'Symbol must be 1-11 characters (letters, numbers, _ or -)';
    }
    
    // Name validation - at least 3 characters
    if (formState.name && formState.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    // Description validation - at least 20 characters
    if (formState.description && formState.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }
    
    // Genre validation
    if (!formState.genre) {
      newErrors.genre = 'Please select a genre';
    }
    
    // Additional owners validation
    if (formState.additionalOwners.trim()) {
      const addresses = formState.additionalOwners.split(',').map(addr => addr.trim());
      for (const addr of addresses) {
        if (addr && !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          newErrors.additionalOwners = 'Invalid Ethereum address format in additional owners';
          break;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      // Set form as submitted
      setFormSubmitted(true);
      
      // Start showing upload progress
      setIsUploading(true);
      setUploadProgress(0);
      setTxError(null);
      
      // Get the files
      const audioFile = audioFileRef.current?.files?.[0];
      const imageFile = coverArtRef.current?.files?.[0];
      
      if (!audioFile || !imageFile) {
        setTxError('Audio file and cover art are required');
        setIsUploading(false);
        setFormSubmitted(false);
        return;
      }
      
      // Upload audio file to IPFS
      setUploadStage('uploading_audio');
      let uploadedAudioCID: string;
      try {
        uploadedAudioCID = await uploadFileToIPFS(audioFile, (progress) => {
          setUploadProgress(progress * 0.3); // Audio upload is 30% of total progress
        });
        setAudioCID(uploadedAudioCID);
        console.log('Audio uploaded with CID:', uploadedAudioCID);
      } catch (error: any) {
        if (error.response?.status === 401) {
          setTxError('Pinata API authentication failed. Please ensure NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY environment variables are set correctly.');
          setIsUploading(false);
          setFormSubmitted(false);
          return;
        }
        throw error;
      }
      
      // Upload image file to IPFS
      setUploadStage('uploading_cover');
      let uploadedImageCID: string;
      try {
        uploadedImageCID = await uploadFileToIPFS(imageFile, (progress) => {
          setUploadProgress(30 + progress * 0.3); // Image upload is another 30%
        });
        setImageCID(uploadedImageCID);
        console.log('Image uploaded with CID:', uploadedImageCID);
      } catch (error: any) {
        if (error.response?.status === 401) {
          setTxError('Pinata API authentication failed. Please ensure NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY environment variables are set correctly.');
          setIsUploading(false);
          setFormSubmitted(false);
          return;
        }
        throw error;
      }
      
      // Create metadata - strictly follow Zora's requirements
      setUploadStage('uploading_metadata');
      
      // Clean CIDs - remove ipfs:// prefix if present
      const cleanAudioCID = uploadedAudioCID ? uploadedAudioCID.replace('ipfs://', '') : '';
      const cleanImageCID = uploadedImageCID ? uploadedImageCID.replace('ipfs://', '') : '';
      
      // Validate CIDs before proceeding
      if (!cleanAudioCID || !cleanImageCID) {
        throw new Error('Failed to get valid IPFS CIDs for audio or image');
      }

      // Validate CID format (basic check)
      if (!/^Qm[a-zA-Z0-9]{44}$/.test(cleanAudioCID) || !/^Qm[a-zA-Z0-9]{44}$/.test(cleanImageCID)) {
        throw new Error('Invalid IPFS CID format received');
      }
      
      // Convert artist address to string if not already
      const artistAddress = typeof formState.artist === 'string' 
        ? formState.artist 
        : address || '';
        
      // Create metadata object following Zora's expected format
      const metadata = {
        name: formState.name,
        description: formState.description || `Music coin for ${artistAddress}`,
        image: `ipfs://${cleanImageCID}`,
        external_url: `https://songcast.vercel.app/coins/${formState.name.replace(/\s+/g, '-').toLowerCase()}`,
        animation_url: `ipfs://${cleanAudioCID}`,
        properties: {},
        attributes: [
          {
            trait_type: "Artist",
            value: formState.artist
          },
          {
            trait_type: "Genre",
            value: formState.genre
          },
          {
            trait_type: "Type",
            value: "Music"
          }
        ]
      };
      
      console.log('Uploading metadata:', JSON.stringify(metadata, null, 2));
      
      // Upload metadata to IPFS
      const metadataURI = await uploadJSONToIPFS(metadata);
      
      // Validate the returned metadata URI
      if (!metadataURI || !metadataURI.startsWith('ipfs://')) {
        throw new Error('Failed to get valid metadata URI from IPFS');
      }
      
      setMetadataCID(metadataURI);
      console.log('Metadata uploaded with URI:', metadataURI);
      
      // Store metadata in our cache for the proxy to use
      const metadataCid = metadataURI.replace('ipfs://', '');
      cacheMetadata(metadataCid, metadata);
      
      setUploadProgress(70);
      
      // Pause briefly to ensure IPFS propagation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setUploadProgress(75);
      
      // Create the coin data
      setUploadStage('creating_coin');
      
      // Parse additional owners
      let owners = [formState.artist as Address];
      if (formState.additionalOwners.trim()) {
        const additionalAddresses = formState.additionalOwners
          .split(',')
          .map(addr => addr.trim() as Address)
          .filter(addr => addr && /^0x[a-fA-F0-9]{40}$/.test(addr));
        owners = [formState.artist as Address, ...additionalAddresses];
      }
      
      const coinData: CoinData = {
        name: formState.name,
        symbol: formState.symbol,
        uri: metadataURI,
        chainId: 8453, // Base mainnet
        payoutRecipient: formState.artist as Address,
        platformReferrer: "0x32C8ACD3118766CBE5c3E45a44BCEDde953EF627" as Address,
        owners: owners, // Include owners array
        currency: formState.currency,
      };
      
      // Create the coin
      await createMusicCoin(coinData);
      
      setUploadProgress(100);
      
    } catch (error: any) {
      let errorMessage = `Failed to create coin: ${error.message}`;
      
      // Provide more helpful error messages
      if (error.message.includes('Metadata fetch failed')) {
        errorMessage = 'Failed to validate metadata. Please try again with a different audio or image file.';
      } else if (error.message.includes('rejected')) {
        errorMessage = 'Transaction was rejected by your wallet.';
      } else if (error.message.includes('user denied') || error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by the user.';
      } else if (error.message.includes('cannot estimate gas')) {
        errorMessage = 'Failed to estimate gas. The blockchain network may be congested.';
      }
      
      setTxError(errorMessage);
      setIsUploading(false);
      setFormSubmitted(false);
    }
  };

  // Wrap everything in ClientOnly to prevent hydration errors
  return (
    <ClientOnly>
      {/* Connection warning */}
      {!isConnected ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 py-16"
        >
          <div className="sonic-glass-card max-w-2xl mx-auto">
            <div className="p-8 text-center">
              <div className="text-primary/70 text-5xl mb-6">
                <Coins size={64} className="mx-auto" />
              </div>
              <h2 className="text-2xl mb-4 font-bold">Wallet Connection Required</h2>
              <p className="text-muted-foreground mb-6">
                Please connect your wallet to create a music coin on SongCast.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => {
                    // Find the MetaMask connector and connect with it
                    const metaMaskConnector = connectors.find(c => c.name === 'MetaMask');
                    if (metaMaskConnector) {
                      connect({ connector: metaMaskConnector });
                    }
                  }} 
                  className="sonic-button-primary"
                >
                  <LogIn size={18} className="mr-1" />
                  <span>Connect Wallet</span>
                </button>
                <Link href="/coins" className="sonic-button-outline">
                  <span>Back to Coins</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-10 text-center">
              <h1 className="gradient-text text-4xl mb-3 font-bold">Create Your Music Coin</h1>
              <p className="text-muted-foreground">
                Create a social token for your music that fans can trade and support your journey
              </p>
            </div>

            {txSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="sonic-glass-card max-w-2xl mx-auto text-center"
              >
                <div className="p-8">
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <CheckSquare size={32} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 gradient-text">Coin Created Successfully!</h2>
                    <p className="text-muted-foreground mb-4">
                      Your music coin "{formState.name}" has been created and is now available for trading. 
                      It will appear immediately in the coins list with a "NEW" badge.
                    </p>
                  </div>
                  
                  <div className="sonic-card p-5 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Coin Name</span>
                        <span className="font-medium">{formState.name}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Symbol</span>
                        <span className="font-medium">{formState.symbol}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Genre</span>
                        <span className="font-medium">{formState.genre}</span>
                      </div>
                    </div>
                    
                    {createdCoinAddress && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Coin Address</span>
                          <a 
                            href={`https://basescan.org/address/${createdCoinAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm break-all hover:underline font-mono"
                          >
                            {createdCoinAddress}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/coins" className="sonic-button-primary">
                      <Music size={20} />
                      <span>Go to Coins</span>
                    </Link>
                    <button
                      onClick={() => {
                        // Reset form
                        setFormState({
                          name: '',
                          symbol: '',
                          description: '',
                          genre: '',
                          artist: address || '',
                          additionalOwners: '',
                          currency: 1 as 1 | 2,
                        });
                        setPreviewAudio(null);
                        setPreviewImage(null);
                        setAudioDuration('0:00');
                        setIsPlaying(false);
                        setAudioElement(null);
                        setTxSuccess(false);
                        setAudioCID(null);
                        setImageCID(null);
                        setMetadataCID(null);
                      }}
                      className="sonic-button-outline"
                    >
                      <Coins size={20} />
                      <span>Create Another Coin</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  {/* Left column: File uploads and preview */}
                  <div className="md:col-span-2">
                    <div className="sonic-glass-card mb-6">
                      <div className="p-5">
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                          <AudioLines size={20} className="text-primary" />
                          <span>Audio File</span>
                        </h3>
                        
                        {previewAudio ? (
                          <div className="mb-4">
                            <div className="sonic-waveform relative mb-4">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={togglePlayPause}
                                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-all duration-300"
                                >
                                  {isPlaying ? (
                                    <Pause size={24} className="text-white" />
                                  ) : (
                                    <Play size={24} className="text-white ml-1" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{audioDuration}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewAudio(null);
                                  setAudioElement(null);
                                  setIsPlaying(false);
                                  if (audioFileRef.current) {
                                    audioFileRef.current.value = '';
                                  }
                                }}
                                className="text-red-500 hover:text-red-600 flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <div
                              onClick={triggerAudioInput}
                              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors duration-300"
                            >
                              <Music size={40} className="mx-auto mb-3 text-muted-foreground" />
                              <p className="text-muted-foreground mb-1">Click to upload audio file</p>
                              <p className="text-xs text-muted-foreground/70">MP3, WAV, FLAC (max 50MB)</p>
                            </div>
                            {errors.audio && (
                              <p className="text-red-500 text-sm mt-2">{errors.audio}</p>
                            )}
                          </div>
                        )}
                        
                        <input
                          type="file"
                          ref={audioFileRef}
                          onChange={handleAudioChange}
                          accept="audio/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    <div className="sonic-glass-card">
                      <div className="p-5">
                        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                          <Disc size={20} className="text-primary" />
                          <span>Cover Art</span>
                        </h3>
                        
                        {previewImage ? (
                          <div className="mb-4 relative">
                            <div className="aspect-square rounded-xl overflow-hidden">
                              <Image
                                src={previewImage}
                                alt="Cover Preview"
                                width={500}
                                height={500}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewImage(null);
                                if (coverArtRef.current) {
                                  coverArtRef.current.value = '';
                                }
                              }}
                              className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black/90 transition-colors duration-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <div
                              onClick={triggerImageInput}
                              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors duration-300 aspect-square flex flex-col items-center justify-center"
                            >
                              <Upload size={40} className="mx-auto mb-3 text-muted-foreground" />
                              <p className="text-muted-foreground mb-1">Click to upload cover art</p>
                              <p className="text-xs text-muted-foreground/70">JPG, PNG, GIF (max 10MB)</p>
                            </div>
                            {errors.image && (
                              <p className="text-red-500 text-sm mt-2">{errors.image}</p>
                            )}
                          </div>
                        )}
                        
                        <input
                          type="file"
                          ref={coverArtRef}
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column: Form fields */}
                  <div className="md:col-span-3">
                    <div className="sonic-glass-card">
                      <div className="p-6">
                        <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                          <Coins size={20} className="text-primary" />
                          <span>Coin Information</span>
                        </h3>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium mb-1">Coin Name</label>
                            <input
                              type="text"
                              name="name"
                              value={formState.name}
                              onChange={handleChange}
                              className="sonic-input"
                              placeholder="My Music Coin"
                            />
                            {errors.name && (
                              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              The name of your coin (e.g., "Artist Name Coin")
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Coin Symbol</label>
                            <input
                              type="text"
                              name="symbol"
                              value={formState.symbol}
                              onChange={handleChange}
                              className="sonic-input uppercase"
                              placeholder="MUSIC"
                              maxLength={11}
                            />
                            {errors.symbol && (
                              <p className="text-red-500 text-sm mt-1">{errors.symbol}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Trading symbol for your coin (1-11 characters, e.g., "ARTIST")
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                              name="description"
                              value={formState.description}
                              onChange={handleChange}
                              className="sonic-input min-h-24"
                              placeholder="Tell fans what your music coin represents..."
                            />
                            {errors.description && (
                              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Genre</label>
                            <div className="relative" ref={genreDropdownRef}>
                              <div 
                                className="sonic-input flex items-center justify-between cursor-pointer"
                                onClick={() => setShowGenreDropdown(prev => !prev)}
                              >
                                <span className={formState.genre ? "" : "text-muted-foreground/50"}>
                                  {formState.genre || "Select a genre"}
                                </span>
                                <ChevronDown size={18} className={`transition-transform duration-200 ${showGenreDropdown ? 'rotate-180' : ''}`} />
                              </div>
                              
                              {errors.genre && (
                                <p className="text-red-500 text-sm mt-1">{errors.genre}</p>
                              )}
                              
                              <AnimatePresence>
                                {showGenreDropdown && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute mt-1 w-full z-10 max-h-56 overflow-auto sonic-glass-card border border-white/10 rounded-xl"
                                  >
                                    <div className="p-1">
                                      {MUSIC_GENRES.map(genre => (
                                        <div
                                          key={genre}
                                          className={`px-3 py-2 cursor-pointer rounded-lg hover:bg-primary/20 transition-colors ${
                                            formState.genre === genre ? 'bg-primary/10 text-primary' : ''
                                          }`}
                                          onClick={() => handleSelectGenre(genre)}
                                        >
                                          {genre}
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Currency</label>
                            <div className="relative" ref={currencyDropdownRef}>
                              <div 
                                className="sonic-input flex items-center justify-between cursor-pointer"
                                onClick={() => setShowCurrencyDropdown(prev => !prev)}
                              >
                                <span>
                                  {formState.currency === 1 ? "ZORA" : "ETH"}
                                </span>
                                <ChevronDown size={18} className={`transition-transform duration-200 ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                              </div>
                              
                              <AnimatePresence>
                                {showCurrencyDropdown && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute mt-1 w-full z-10 max-h-56 overflow-auto sonic-glass-card border border-white/10 rounded-xl"
                                  >
                                    <div className="p-1">
                                      <div
                                        className={`px-3 py-2 cursor-pointer rounded-lg hover:bg-primary/20 transition-colors ${
                                          formState.currency === 1 ? 'bg-primary/10 text-primary' : ''
                                        }`}
                                        onClick={() => {
                                          setFormState(prev => ({ ...prev, currency: 1 as 1 | 2 }));
                                          setShowCurrencyDropdown(false);
                                        }}
                                      >
                                        ZORA
                                      </div>
                                      <div
                                        className={`px-3 py-2 cursor-pointer rounded-lg hover:bg-primary/20 transition-colors ${
                                          formState.currency === 2 ? 'bg-primary/10 text-primary' : ''
                                        }`}
                                        onClick={() => {
                                          setFormState(prev => ({ ...prev, currency: 2 as 1 | 2 }));
                                          setShowCurrencyDropdown(false);
                                        }}
                                      >
                                        ETH
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Trading currency for your coin. ZORA is default on Base mainnet.
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Additional Owners (optional)</label>
                            <input
                              type="text"
                              name="additionalOwners"
                              value={formState.additionalOwners}
                              onChange={handleChange}
                              className="sonic-input"
                              placeholder="0x123..., 0x456... (comma-separated)"
                            />
                            {errors.additionalOwners && (
                              <p className="text-red-500 text-sm mt-1">{errors.additionalOwners}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Additional addresses that can manage this coin's metadata and payouts
                            </p>
                          </div>
                          
                          <div className="pt-2">
                            <div className="sonic-card p-4 mb-6 flex items-start gap-3">
                              <Info size={18} className="text-primary mt-0.5" />
                              <div>
                                <p className="text-sm mb-1 font-medium">About Music Coins</p>
                                <p className="text-sm text-muted-foreground">
                                  Creating a coin will deploy a new ERC20 token contract with your music metadata. 
                                  This lets fans trade your music coin and support your journey. Choose between ZORA 
                                  and ETH as the trading currency, and optionally add additional owners for shared management.
                                </p>
                              </div>
                            </div>
                            
                            <button
                              type="submit"
                              className="sonic-button-primary w-full py-3"
                              disabled={isUploading || txPending}
                            >
                              {isUploading || txPending ? (
                                <div className="flex items-center justify-center">
                                  <div className="spinner-sm mr-3"></div>
                                  {isUploading ? (
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">
                                        {uploadStage === 'uploading_audio' && 'Uploading audio...'}
                                        {uploadStage === 'uploading_cover' && 'Uploading cover art...'}
                                        {uploadStage === 'uploading_metadata' && 'Storing metadata...'}
                                        {uploadStage === 'creating_coin' && 'Creating coin...'}
                                      </span>
                                      <span className="text-xs opacity-80">{Math.round(uploadProgress)}%</span>
                                    </div>
                                  ) : (
                                    <span>Creating Coin...</span>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <Coins size={20} />
                                  <span>Create Music Coin</span>
                                </>
                              )}
                            </button>
                            
                            {txError && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="text-red-500 mt-0.5">
                                    <FileText size={16} />
                                  </div>
                                  <div>
                                    <p className="font-medium mb-1">Error creating coin</p>
                                    <p>{txError}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </ClientOnly>
  );
} 