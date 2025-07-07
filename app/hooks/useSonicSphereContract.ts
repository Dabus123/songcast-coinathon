import { useState, useEffect, useCallback } from 'react';
import { 
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
  useTransaction
} from 'wagmi';
import { parseEther } from 'viem';
import { contractABI } from '../constants/contractABI';
import { fetchTrackMetadata, getIpfsUrl } from '../services/pinataService';
import { baseSepolia } from 'viem/chains';

// Contract address will be different per network
const CONTRACT_ADDRESSES: { [chainId: number]: `0x${string}` } = {
  // Base Sepolia Testnet
  84532: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE as `0x${string}`,
  // Base Mainnet for future use
  8453: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_MAINNET as `0x${string}`,
};

// Debug log for environment variable
console.log("Contract address from env:", process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE);

export interface TrackData {
  id: string;
  title: string;
  artist: string;
  description: string;
  price: string;
  genre: string;
  audioUrl: string;
  coverArt: string;
  seller: string;
  featured: boolean;
  duration: string;
  metadataCID: string;
}

export function useSonicSphereContract() {
  const { address, isConnected } = useAccount();
  const chainId = 84532;
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<TrackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [contractNotDeployed, setContractNotDeployed] = useState(false);
  const [createTrackSuccess, setCreateTrackSuccess] = useState(false);
  const [createTrackError, setCreateTrackError] = useState<Error | null>(null);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);

  // Set contract address based on current network
  useEffect(() => {
    // Check if we're in the client-side environment
    if (typeof window === 'undefined') {
      return;
    }

    console.log("Current chain ID:", chainId);
    console.log("Contract addresses config:", CONTRACT_ADDRESSES);

    // Check if we're on a supported network
    const supportedNetworks = Object.keys(CONTRACT_ADDRESSES).map(id => Number(id));
    if (!supportedNetworks.includes(chainId)) {
      setContractNotDeployed(true);
      setError(`This app only works on Base Sepolia Testnet (84532) or Base Mainnet (8453). Current network: ${chainId || 'not connected'}`);
      return;
    }

    // Get address from configuration based on the current chain
    const address = CONTRACT_ADDRESSES[chainId];
    console.log("Contract address to be used:", address);
    
    if (!address) {
      setContractNotDeployed(true);
      setError('Contract address is not configured properly for this network');
    } else {
      setContractAddress(address);
      setContractNotDeployed(false);
      setError(null);
    }
  }, [chainId]);

  /**
   * Get total supply of tracks from the contract
   */
  const { data: totalSupply, isError: isTotalSupplyError } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!contractAddress && !contractNotDeployed,
    }
  });

  useEffect(() => {
    if (isTotalSupplyError) {
      setError('Failed to fetch total track supply. The contract might not be deployed correctly.');
    }
    console.log("Total supply of tracks:", totalSupply);
  }, [isTotalSupplyError, totalSupply]);

  /**
   * Get featured tracks from the contract
   */
  const { data: featuredTrackIds } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getFeaturedTracks',
    query: {
      enabled: !!contractAddress && !contractNotDeployed,
    }
  });

  /**
   * Get track data by ID
   */
  const getTrackById = useCallback(async (tokenId: string): Promise<TrackData | null> => {
    if (!contractAddress || !publicClient || contractNotDeployed) {
      throw new Error('Smart contract not available or not deployed.');
    }

    try {
      console.log(`Fetching track ${tokenId} from contract...`);
      
      // Get track details from contract using the tracks mapping
      const trackData = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'tracks',
        args: [BigInt(tokenId)],
      });

      console.log(`Track ${tokenId} data:`, trackData);
      
      if (!trackData) return null;

      // The tracks struct in the contract has specific field order:
      // title, description, price, genre, audioURI, imageURI, metadataURI, seller, featured, duration, createdAt
      const [
        title, 
        description, 
        price, 
        genre, 
        audioURI, 
        imageURI, 
        metadataURI, 
        seller, 
        featured, 
        duration, 
        createdAt
      ] = trackData as any[];

      // Format track data
      const formattedTrack: TrackData = {
        id: tokenId,
        title,
        artist: "Unknown Artist", // We'll update this from metadata if needed
        description,
        price: (Number(price) / 1e18).toString(), // Convert from wei to ETH
        genre,
        audioUrl: getIpfsUrl(audioURI),
        coverArt: getIpfsUrl(imageURI),
        seller,
        featured,
        duration: formatDuration(duration ? Number(duration) : 0),
        metadataCID: metadataURI,
      };

      console.log(`Formatted track ${tokenId}:`, formattedTrack);
      return formattedTrack;
    } catch (error) {
      console.error(`Error fetching track ${tokenId}:`, error);
      throw new Error('Failed to fetch track data from the blockchain.');
    }
  }, [contractAddress, publicClient, contractNotDeployed]);

  // Format duration in seconds to mm:ss
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  /**
   * Load tracks from contract using totalSupply
   */
  const loadTracks = useCallback(async () => {
    if (!totalSupply || !contractAddress || contractNotDeployed) return;
    
    setLoading(true);
    setError(null);
    console.log("Loading tracks from contract with total supply:", totalSupply);
    
    try {
      const trackPromises = [];
      const supply = Number(totalSupply);
      
      // Iterate from 0 to totalSupply-1
      for (let i = 0; i < supply; i++) {
        trackPromises.push(getTrackById(i.toString()));
      }
      
      const tracksData = await Promise.all(trackPromises);
      console.log("Tracks loaded:", tracksData);
      setTracks(tracksData.filter(p => p !== null) as TrackData[]);
    } catch (error: any) {
      console.error('Error loading tracks:', error);
      setError(error.message || 'Failed to load tracks from blockchain');
    } finally {
      setLoading(false);
    }
  }, [totalSupply, contractAddress, getTrackById, contractNotDeployed]);

  /**
   * Load featured tracks
   */
  const loadFeaturedTracks = useCallback(async () => {
    if (!featuredTrackIds || !contractAddress || contractNotDeployed) return;
    
    try {
      const trackPromises = (featuredTrackIds as bigint[]).map(id => 
        getTrackById(id.toString())
      );
      
      const tracksData = await Promise.all(trackPromises);
      setFeaturedTracks(tracksData.filter(p => p !== null) as TrackData[]);
    } catch (error) {
      console.error('Error loading featured tracks:', error);
    }
  }, [featuredTrackIds, contractAddress, getTrackById, contractNotDeployed]);

  // Reload tracks when contract data changes
  useEffect(() => {
    if (contractAddress && !contractNotDeployed) {
      loadTracks();
    }
  }, [loadTracks, contractAddress, contractNotDeployed]);

  // Reload featured tracks when contract data changes
  useEffect(() => {
    if (contractAddress && !contractNotDeployed) {
      loadFeaturedTracks();
    }
  }, [loadFeaturedTracks, contractAddress, contractNotDeployed]);

  /**
   * Handle contract writes
   */
  const { 
    writeContract: writeContractFn,
    data: writeData,
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract();

  // Set the transaction hash when we get it from a write
  useEffect(() => {
    if (writeData) {
      setLastTxHash(writeData);
    }
  }, [writeData]);

  /**
   * Monitor transaction status
   */
  const { 
    data: txData,
    isPending: isTxPending,
    isSuccess: isTxSuccess
  } = useTransaction({
    hash: lastTxHash,
  });

  /**
   * Watch for TrackCreated events
   */
  useWatchContractEvent({
    address: contractAddress,
    abi: contractABI,
    eventName: 'TrackCreated',
    onLogs: () => {
      // Reload tracks when a new track is created
      loadTracks();
      loadFeaturedTracks();
    },
  });

  /**
   * Watch for TrackPurchased events
   */
  useWatchContractEvent({
    address: contractAddress,
    abi: contractABI,
    eventName: 'TrackPurchased',
    onLogs: () => {
      // Reload tracks when a track is purchased
      loadTracks();
      loadFeaturedTracks();
    },
  });

  /**
   * Create a new track
   */
  const createTrack = useCallback(async (data: {
    title: string;
    artist: string;
    description: string;
    price: number;
    genre: string;
    audioCID: string;
    imageCID: string;
    metadataCID: string;
    featured: boolean;
    duration?: number;
  }) => {
    if (!contractAddress || !isConnected || contractNotDeployed) {
      setCreateTrackError(new Error('Not connected to a supported network or contract not deployed'));
      return;
    }

    setIsCreatingTrack(true);
    setCreateTrackSuccess(false);
    setCreateTrackError(null);

    try {
      console.log('Creating track:', data);
      
      // Calculate featured fee - 0.01 ETH if track is to be featured
      const featureValue = data.featured ? parseEther('0.01') : 0n;
      
      // Convert duration to seconds if provided, or use a default
      const durationSeconds = data.duration || 180; // Default 3 mins
      
      // Call the contract to create a track
      writeContractFn({
        address: contractAddress,
        abi: contractABI,
        functionName: 'createTrack',
        args: [
          data.title,
          data.description || '',
          parseEther(data.price.toString()),
          data.genre,
          data.audioCID,  // IPFS URI for audio
          data.imageCID,  // IPFS URI for cover image
          data.metadataCID, // IPFS URI for additional metadata
          data.featured,
          BigInt(durationSeconds)
        ],
        value: featureValue
      });
      
      // Note: The actual success will be handled by the transaction monitoring
      // and the event watcher will trigger a reload of the tracks
    } catch (error: any) {
      console.error('Error creating track:', error);
      setCreateTrackError(error);
      setIsCreatingTrack(false);
    }
  }, [contractAddress, isConnected, contractNotDeployed, writeContractFn]);

  // Handle transaction completion for track creation
  useEffect(() => {
    if (isTxSuccess && lastTxHash) {
      setIsCreatingTrack(false);
      setCreateTrackSuccess(true);
    } else if (writeError) {
      setIsCreatingTrack(false);
      setCreateTrackError(writeError);
    }
  }, [isTxSuccess, lastTxHash, writeError]);

  /**
   * Purchase a track
   */
  const purchaseTrack = useCallback(async (trackId: string, price: string) => {
    if (!contractAddress || !isConnected || contractNotDeployed) {
      throw new Error('Not connected to a supported network or contract not deployed');
    }

    try {
      writeContractFn({
        address: contractAddress,
        abi: contractABI,
        functionName: 'purchaseTrack',
        args: [BigInt(trackId)],
        value: parseEther(price),
      });
    } catch (error) {
      console.error('Error purchasing track:', error);
      throw error;
    }
  }, [contractAddress, isConnected, contractNotDeployed, writeContractFn]);

  return {
    tracks,
    featuredTracks,
    loading,
    error,
    contractAddress,
    contractNotDeployed,
    createTrack,
    isCreatingTrack,
    createTrackSuccess,
    createTrackError,
    purchaseTrack,
    getTrackById,
    isPending: isWritePending || isTxPending,
    txHash: lastTxHash,
    isSuccess: isTxSuccess,
    refreshTracks: () => {
      // Force reload tracks
      loadTracks();
      loadFeaturedTracks();
    }
  };
} 