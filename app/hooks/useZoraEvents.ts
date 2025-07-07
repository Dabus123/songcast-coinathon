import { useState, useEffect } from 'react';
import { Address, createPublicClient, http, AbiEvent, Log, fallback, createClient, custom } from 'viem';
import { base } from 'viem/chains';
import { getIpfsUrl } from '../services/pinataService';
import axios from 'axios';
import { getCoin } from "@zoralabs/coins-sdk";

// Zora factory address on Base mainnet
const ZORA_FACTORY_ADDRESS = '0x777777751622c0d3258f214F9DF38E35BF45baF3' as Address;

// Platform referrer address we're filtering for
const PLATFORM_REFERRER = '0x32C8ACD3118766CBE5c3E45a44BCEDde953EF627' as Address;

// Get custom RPC URL from environment if available
const customRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC;

// ABI for the CoinCreated event
const COIN_CREATED_EVENT: AbiEvent = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'caller', type: 'address' },
    { indexed: true, name: 'payoutRecipient', type: 'address' },
    { indexed: true, name: 'platformReferrer', type: 'address' },
    { indexed: false, name: 'currency', type: 'address' },
    { indexed: false, name: 'uri', type: 'string' },
    { indexed: false, name: 'name', type: 'string' },
    { indexed: false, name: 'symbol', type: 'string' },
    { indexed: false, name: 'coin', type: 'address' },
    { indexed: false, name: 'pool', type: 'address' },
    { indexed: false, name: 'version', type: 'string' }
  ],
  name: 'CoinCreated',
  type: 'event'
};

export interface MusicCoin {
  coinAddress: Address;
  name: string;
  symbol: string;
  description: string;
  artistName: string;
  artistAddress: Address;
  coverArt: string;
  audioUrl?: string;
  metadata?: any;
}

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
      
      // Check if the response contains errors or missing results
      if (response.data.error) {
        console.error('RPC Error:', response.data.error);
        throw new Error(response.data.error.message || 'RPC request failed');
      }
      
      // Make sure result is properly defined
      if (response.data.result === undefined) {
        console.error('Empty RPC result for method:', method);
        // For getLogs specifically, return an empty array instead of undefined
        if (method === 'eth_getLogs') {
          return [];
        }
        // For other methods, return a suitable default or throw
        throw new Error('Empty result from RPC endpoint');
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error with proxy transport:', error);
      
      // Return empty array for getLogs to prevent mapping errors
      if (method === 'eth_getLogs') {
        console.log('Returning empty array for failed getLogs request');
        return [];
      }
      
      throw error;
    }
  },
});

// Create a public client for Base mainnet with our proxy transport
const publicClient = createPublicClient({
  chain: base,
  transport: proxyTransport,
  batch: {
    multicall: true
  }
});

// Pagination constants for getLogs
const BLOCKS_PER_BATCH = 950; // Limited to 1000 blocks per batch as required by RPC provider
const START_BLOCK = BigInt(32074723); // Start from a more recent block to find the latest coins
// Known block where a specific coin may be
const KNOWN_COIN_BLOCKS = [
  BigInt(30258939)
];

// Add these constants at the top with other constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const PARALLEL_BATCHES = 3; // Number of parallel batches to process

// Add this interface before the useZoraEvents function
interface CacheEntry {
  data: any[];
  timestamp: number;
}

// Add this before the useZoraEvents function
const eventCache: Record<string, CacheEntry> = {};

export async function fetchTrackMetadata(metadataURI: string): Promise<any> {
  try {
    if (!metadataURI) {
      console.error('Empty URI provided to fetchTrackMetadata');
      return null;
    }
    
    // Try up to 3 times to fetch metadata with exponential backoff
    const MAX_RETRIES = 5;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < MAX_RETRIES) {
      try {
        // Convert IPFS URI to HTTP URL if needed
        let uri = metadataURI;
        if (uri.startsWith('ipfs://')) {
          uri = getIpfsUrl(uri);
        }
        
        console.log(`Fetching metadata attempt ${attempt + 1} from: ${uri}`);
        const response = await axios.get(uri, { timeout: 15000 });
        return response.data;
      } catch (error) {
        console.error(`Metadata fetch attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
    
    // If we get here, all retries failed
    console.error(`Failed to fetch metadata after ${MAX_RETRIES} attempts:`, lastError);
    return null;
  } catch (error) {
    console.error('Error in fetchTrackMetadata:', error);
    return null;
  }
}

export function useZoraEvents() {
  const [coins, setCoins] = useState<MusicCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  // Function to get logs in paginated batches
  const getPaginatedLogs = async () => {
    try {
      setProgressMessage('Getting latest block number...');
      
      // Get the current latest block number dynamically instead of using a hardcoded value
      let latestBlock;
      try {
        const blockNumber = await publicClient.getBlockNumber();
        latestBlock = blockNumber;
        console.log('Latest block fetched dynamically:', latestBlock.toString());
      } catch (blockError) {
        console.error('Error fetching latest block, using fallback:', blockError);
        const blockNumber = await publicClient.getBlockNumber();
        latestBlock = blockNumber;
      }
      
      // Calculate number of batches needed
      let currentBlock = START_BLOCK;
      const allLogs: any[] = [];
      
      // Process in batches until we reach the latest block
      // This approach is more efficient now with our proxy and caching layer
      let batchCount = 0;
      let consecutiveEmptyBatches = 0;
      
      // First prioritize scanning known blocks where coins may exist
      for (const knownBlock of KNOWN_COIN_BLOCKS) {
        if (knownBlock >= START_BLOCK && knownBlock <= latestBlock) {
          const startKnownBlock = knownBlock;
          const endKnownBlock = knownBlock + BigInt(BLOCKS_PER_BATCH) < latestBlock 
                              ? knownBlock + BigInt(BLOCKS_PER_BATCH) 
                              : latestBlock;
                              
          setProgressMessage(`Checking known block range ${startKnownBlock}-${endKnownBlock}...`);
          
          try {
            const logs = await publicClient.getLogs({
              address: ZORA_FACTORY_ADDRESS,
              event: COIN_CREATED_EVENT,
              args: {
                platformReferrer: PLATFORM_REFERRER
              },
              fromBlock: startKnownBlock,
              toBlock: endKnownBlock
            });
            
            if (logs && Array.isArray(logs) && logs.length > 0) {
              allLogs.push(...logs);
              console.log(`Found ${logs.length} logs in known block range ${startKnownBlock}-${endKnownBlock}`);
            }
          } catch (err) {
            console.error(`Error checking known block range ${startKnownBlock}-${endKnownBlock}:`, err);
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Now scan all blocks systematically
      const batchPromises: Promise<any>[] = [];
      
      while (currentBlock < latestBlock) {
        batchCount++;
        
        // Calculate how many blocks remain to scan
        const blocksRemaining = latestBlock - currentBlock;
        console.log(`Scanning blocks: ${batchCount}, Current: ${currentBlock}, Latest: ${latestBlock}, Remaining: ${blocksRemaining}`);
        
        const nextBlock = currentBlock + BigInt(BLOCKS_PER_BATCH);
        const toBlock = nextBlock > latestBlock ? latestBlock : nextBlock;
        
        // Create a batch promise
        const batchPromise = (async () => {
          try {
            const cacheKey = `${currentBlock}-${toBlock}`;
            const cachedData = eventCache[cacheKey];
            
            if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
              console.log(`Using cached data for blocks ${currentBlock}-${toBlock}`);
              return cachedData.data;
            }
            
            setProgressMessage(`Fetching events (block ${currentBlock} to ${toBlock})... Batch ${batchCount}`);
            
            const logs = await publicClient.getLogs({
              address: ZORA_FACTORY_ADDRESS,
              event: COIN_CREATED_EVENT,
              args: {
                platformReferrer: PLATFORM_REFERRER
              },
              fromBlock: currentBlock,
              toBlock: toBlock
            });
            
            // Cache the results
            if (logs && Array.isArray(logs)) {
              eventCache[cacheKey] = {
                data: logs,
                timestamp: Date.now()
              };
            }
            
            return logs;
          } catch (err) {
            console.error(`Error fetching logs from blocks ${currentBlock} to ${toBlock}:`, err);
            return [];
          }
        })();
        
        batchPromises.push(batchPromise);
        
        // Process batches in parallel with a limit
        if (batchPromises.length >= PARALLEL_BATCHES) {
          const results = await Promise.all(batchPromises);
          results.forEach(logs => {
            if (logs && Array.isArray(logs) && logs.length > 0) {
              allLogs.push(...logs);
              consecutiveEmptyBatches = 0;
            } else {
              consecutiveEmptyBatches++;
            }
          });
          batchPromises.length = 0;
        }
        
        // Move to next batch
        currentBlock = toBlock + BigInt(1);
        
        // Add delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Process any remaining batches
      if (batchPromises.length > 0) {
        const results = await Promise.all(batchPromises);
        results.forEach(logs => {
          if (logs && Array.isArray(logs) && logs.length > 0) {
            allLogs.push(...logs);
          }
        });
      }
      
      setProgressMessage(`Found a total of ${allLogs.length} events. Processing metadata...`);
      console.log(`Total logs found: ${allLogs.length}`, allLogs);
      return allLogs;
      
    } catch (error) {
      console.error('Error in getPaginatedLogs:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get logs in paginated batches
        const logs = await getPaginatedLogs();
        
        // Ensure logs is a valid array
        if (!logs || !Array.isArray(logs)) {
          console.error('Invalid logs data returned:', logs);
          setError(new Error('Failed to fetch coin data. The RPC endpoint returned an invalid response.'));
          return;
        }
        
        console.log(`Found ${logs.length} coins with our platform referrer`, logs);

        // Process the logs to get coin data
        setProgressMessage(`Processing metadata for ${logs.length} coins...`);
        const coinPromises = logs.map(async (log) => {
          try {
            // Extract data from the log
            const { args } = log as unknown as { args: { 
              coin: Address,
              name: string,
              symbol: string, 
              uri: string,
              payoutRecipient: Address
            }};
            
            console.log(`Processing coin: ${args.coin} with URI: ${args.uri}`);
            
            // Fetch metadata for the coin with retry logic
            let metadata = null;
            let description = '';
            let artistName = '';
            let coverArt = '';
            let audioUrl = '';
            
            try {
              metadata = await fetchTrackMetadata(args.uri);
              
              if (metadata) {
                description = metadata.description || `Token created by ${args.payoutRecipient}`;
                artistName = metadata.artist || 'Unknown Artist';
                
                // Get attributes from metadata if available
                if (metadata.attributes && Array.isArray(metadata.attributes)) {
                  const artistAttr = metadata.attributes.find((attr: any) => 
                    attr.trait_type === 'Artist' || attr.trait_type === 'artist'
                  );
                  
                  if (artistAttr && artistAttr.value) {
                    artistName = artistAttr.value;
                  }
                }
                
                // Extract image and audio URLs from metadata
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
              }
            } catch (metadataError) {
              console.error(`Failed to fetch metadata for ${args.coin}:`, metadataError);
            }
            
            // Fetch market cap data for proper sorting
            let marketCap = '0';
            try {
              const response = await getCoin({
                address: args.coin,
                chain: base.id,
              });
              
              if (response.data?.zora20Token?.marketCap) {
                marketCap = response.data.zora20Token.marketCap;
              }
            } catch (error) {
              console.error(`Error fetching market cap for ${args.coin}:`, error);
            }
            
            // Create MusicCoin object
            return {
              coinAddress: args.coin,
              name: args.name,
              symbol: args.symbol,
              description,
              artistName,
              artistAddress: args.payoutRecipient,
              coverArt: coverArt || '/examples/default-cover.jpg', // Fallback image
              audioUrl,
              metadata: {
                ...metadata,
                marketCap
              }
            };
          } catch (coinError) {
            console.error('Error processing coin:', coinError);
            return null;
          }
        });
        
        const processedCoins = (await Promise.all(coinPromises)).filter(Boolean) as MusicCoin[];
        console.log('Processed coins:', processedCoins); // Add this line for debugging
        setCoins(processedCoins);
        setRetryCount(0); // Reset retry count on success
        setProgressMessage(null);
        
      } catch (err) {
        console.error('Error fetching Zora coins:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch coins from Base blockchain. The RPC endpoint may be experiencing issues.'));
        
        // Retry logic with exponential backoff if RPC endpoint fails
        if (retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying after ${backoffTime}ms (attempt ${retryCount + 1}/3)`);
          setProgressMessage(`Error occurred. Retrying in ${backoffTime/1000} seconds...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, backoffTime);
        } else {
          setProgressMessage(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, [retryCount]);

  // Additional function to refresh the coin data
  const refreshCoins = async () => {
    setRetryCount(prev => prev + 1);
  };

  return { coins, loading, error, refreshCoins, progressMessage };
} 