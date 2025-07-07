import { useState, useCallback } from 'react';
import { 
  createCoin, 
  createCoinCall,
  tradeCoin, 
  tradeCoinCall,
  simulateBuy,
  getTradeFromLogs
} from '@zoralabs/coins-sdk';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import axios from 'axios';

// Currency options based on the new Zora docs
export type CurrencyType = 1 | 2; // 1 = ZORA, 2 = ETH

// Function to check if metadata is accessible via various gateways before creating the coin
async function prefetchMetadata(metadataURI: string): Promise<boolean> {
  // Extract CID from the ipfs:// URI
  const cid = metadataURI.replace('ipfs://', '');
  
  // List of gateways to try (including the one Zora uses)
  const gateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://sapphire-raw-hawk-781.mypinata.cloud/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://ipfs.filebase.io/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ];
  
  console.log('Prefetching metadata from multiple gateways...');
  
  // Try each gateway
  for (const gateway of gateways) {
    try {
      console.log(`Trying gateway: ${gateway}`);
      const response = await axios.get(gateway, { timeout: 5000 });
      
      if (response.status === 200 && response.data) {
        console.log('Successfully fetched metadata from gateway:', gateway);
        console.log('Metadata:', response.data);
        return true;
      }
    } catch (error) {
      console.log(`Gateway ${gateway} failed:`, error);
    }
  }
  
  console.error('Failed to prefetch metadata from any gateway');
  return false;
}

export interface CoinData {
  name: string;             // The name of the coin (e.g., "My Awesome Coin")
  symbol: string;           // The trading symbol for the coin (e.g., "MAC")
  uri: string;              // Metadata URI (an IPFS URI is recommended)
  chainId: number;          // The chain ID (required - defaults to base mainnet)
  owners?: Address[];       // Optional array of owner addresses, defaults to [payoutRecipient]
  payoutRecipient: Address; // Address that receives creator earnings
  platformReferrer?: Address; // Optional platform referrer address, earns referral fees
  currency?: CurrencyType;   // Optional currency for trading (ETH or ZORA)
}

export interface ExclusiveCoinData {
  name: string;             // The name of the coin (e.g., "My Awesome Coin")
  symbol: string;           // The trading symbol for the coin (e.g., "MAC")
  uri: string;              // Metadata URI (an IPFS URI is recommended)
  chainId?: number;         // The chain ID (defaults to base mainnet)
  owners?: Address[];       // Optional array of owner addresses, defaults to [payoutRecipient]
  payoutRecipient: Address; // Address that receives creator earnings
  platformReferrer?: Address; // Optional platform referrer address, earns referral fees
  currency?: CurrencyType;   // Optional currency for trading (ETH or ZORA)
}

export interface TradeParams {
  direction: "sell" | "buy";
  target: Address;
  args: {
    recipient: Address;
    orderSize: bigint;
    minAmountOut?: bigint;
    sqrtPriceLimitX96?: bigint;
    tradeReferrer?: Address;
  };
}

export function useZoraCoins() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [isCreatingCoin, setIsCreatingCoin] = useState(false);
  const [createCoinSuccess, setCreateCoinSuccess] = useState(false);
  const [createCoinError, setCreateCoinError] = useState<Error | null>(null);
  const [createdCoinAddress, setCreatedCoinAddress] = useState<Address | null>(null);
  
  const [isTrading, setIsTrading] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [tradeError, setTradeError] = useState<Error | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
  
  /**
   * Create a new coin
   */
  const createMusicCoin = useCallback(async (coinData: CoinData) => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected');
    }

    setIsCreatingCoin(true);
    setCreateCoinError(null);
    setCreateCoinSuccess(false);

    try {
      console.log('Creating coin with data:', coinData);
      
      // Prefetch metadata to ensure it's accessible
      const metadataAccessible = await prefetchMetadata(coinData.uri);
      if (!metadataAccessible) {
        console.warn('Metadata prefetch failed, but proceeding with coin creation');
      }

      // Try with minimal parameters first to match the new SDK API
      const createCoinParams = {
        name: coinData.name,
        symbol: coinData.symbol,
        uri: coinData.uri,
        payoutRecipient: coinData.payoutRecipient,
        platformReferrer: coinData.platformReferrer,
        owners: coinData.owners,
        currency: coinData.currency,
        chainId: coinData.chainId || 8453, // Default to Base mainnet
      };

      console.log('Calling createCoin with params:', createCoinParams);

      const result = await createCoin(createCoinParams, walletClient, publicClient);

      console.log('Coin created successfully:', result);
      if (result.address) {
        setCreatedCoinAddress(result.address);
      }
      setCreateCoinSuccess(true);
    } catch (error: any) {
      console.error('Error creating coin:', error);
      setCreateCoinError(error);
    } finally {
      setIsCreatingCoin(false);
    }
  }, [walletClient, publicClient]);
  
  /**
   * Get create coin call params for use with wagmi hooks
   */
  const getCreateCoinCallParams = useCallback((coinData: CoinData) => {
    return createCoinCall(coinData);
  }, []);
  
  /**
   * Trade (buy/sell) a coin
   */
  const tradeMusicCoin = useCallback(async (tradeParams: TradeParams) => {
    if (!walletClient || !publicClient || !isConnected) {
      setTradeError(new Error('Wallet not connected'));
      return;
    }

    setIsTrading(true);
    setTradeSuccess(false);
    setTradeError(null);

    try {
      console.log('Executing trade with params:', tradeParams);
      
      // Execute the trade using the SDK - following the latest documentation patterns
      const result = await tradeCoin(tradeParams, walletClient, publicClient);
      
      console.log('Trade executed successfully:', result);
      
      // Extract trade event details from transaction logs (following latest docs)
      if (result.receipt) {
        try {
          const tradeEvent = getTradeFromLogs(result.receipt, tradeParams.direction);
          if (tradeEvent) {
            console.log('Trade event details:', tradeEvent);
          }
        } catch (error) {
          console.warn('Could not extract trade event from logs:', error);
        }
      }
      
      setTradeSuccess(true);
      
      // Store transaction hash for user reference
      if (result.hash) {
        setLastTxHash(result.hash);
      }
      
      return result;
    } catch (error: any) {
      console.error('Trade execution error:', error);
      
      // Enhanced error handling based on common SDK error patterns
      let enhancedError = error;
      
      if (error.message) {
        // Handle specific error cases that users commonly encounter
        if (error.message.includes('insufficient')) {
          enhancedError = new Error('Insufficient balance for this trade');
        } else if (error.message.includes('slippage') || error.message.includes('min amount')) {
          enhancedError = new Error('Trade failed due to price movement. Try adjusting slippage tolerance.');
        } else if (error.message.includes('user rejected') || error.message.includes('denied')) {
          enhancedError = new Error('Transaction was cancelled by user');
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          enhancedError = new Error('Network error. Please check your connection and try again.');
        }
      }
      
      setTradeError(enhancedError);
      throw enhancedError;
    } finally {
      setIsTrading(false);
    }
  }, [walletClient, publicClient, isConnected]);
  
  /**
   * Get trade coin call params for use with wagmi hooks
   */
  const getTradeCallParams = useCallback((tradeParams: TradeParams) => {
    return tradeCoinCall(tradeParams);
  }, []);
  
  /**
   * Simulate buying a coin to get expected output
   */
  const simulateBuyCoin = useCallback(async (
    target: Address, 
    orderSizeEth: string
  ) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    try {
      console.log('Simulating buy:', { target, orderSizeEth });
      
      // Follow the exact pattern from the documentation
      const simulation = await simulateBuy({
        target,
        requestedOrderSize: parseEther(orderSizeEth),
        publicClient,
      });
      
      console.log('Simulation result:', {
        orderSize: formatEther(simulation.orderSize),
        amountOut: formatEther(simulation.amountOut)
      });
      
      return {
        ...simulation,
        formattedAmountOut: formatEther(simulation.amountOut)
      };
    } catch (error: any) {
      console.error('Error simulating buy:', error);
      
      // Provide more specific error messages for simulation failures
      if (error.message?.includes('insufficient')) {
        throw new Error('Insufficient liquidity for this trade size');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error during simulation. Please try again.');
      } else {
        throw new Error('Unable to simulate trade. Please try again.');
      }
    }
  }, [publicClient]);

  /**
   * Simulate selling coins to get expected ETH output
   * Note: The SDK may not have a dedicated simulateSell function yet,
   * but we can estimate based on current market conditions
   */
  const simulateSellCoin = useCallback(async (
    target: Address, 
    coinAmount: string
  ) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    try {
      console.log('Simulating sell:', { target, coinAmount });
      
      // For sell simulation, we would need to call the appropriate SDK function
      // This is a placeholder implementation - adjust based on actual SDK capabilities
      
      // Note: As of the current documentation, there might not be a simulateSell function
      // You may need to implement this using direct contract calls or wait for SDK updates
      
      return {
        orderSize: parseEther(coinAmount),
        amountOut: parseEther('0'), // Placeholder
        formattedAmountOut: '0'
      };
    } catch (error: any) {
      console.error('Error simulating sell:', error);
      throw new Error('Unable to simulate sell. Please try again.');
    }
  }, [publicClient]);

  return {
    // State
    isCreatingCoin,
    createCoinSuccess,
    createCoinError,
    createdCoinAddress,
    isTrading,
    tradeSuccess,
    tradeError,
    lastTxHash,
    
    // Functions
    createMusicCoin,
    getCreateCoinCallParams,
    tradeMusicCoin,
    getTradeCallParams,
    simulateBuyCoin,
    simulateSellCoin
  };
} 