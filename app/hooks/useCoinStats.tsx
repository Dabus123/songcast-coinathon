// app/hooks/useCoinsStats.tsx
import { useState, useEffect } from 'react';
import { getOnchainCoinDetails } from '@zoralabs/coins-sdk';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

// Set up viem public client
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org'), // Use only public endpoints as fallback
});

// First, you might want to add proper type definitions
interface PricingResult {
  value: bigint;
  currency?: string;
  // Possibly other properties depending on the SDK
}

export function useCoinsStats(coinAddresses: string[]) {
  const [stats, setStats] = useState({
    totalMarketCap: '',
    totalLiquidity: '',
    uniqueOwners: 0,
    isLoading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    async function fetchCoinsStats() {
      try {
        // Create an array of promises to fetch data for each coin
        const detailsPromises = coinAddresses.map(address => 
          getOnchainCoinDetails({ 
            coin: address as `0x${string}`, 
            publicClient 
          })
        );
        
        // Fetch all coin details in parallel
        const allCoinDetails = await Promise.all(detailsPromises);
        
        // Calculate total market cap
        const totalMarketCapWei = allCoinDetails.reduce(
          (sum, details) => {
            // Check if marketCap exists and has a value property
            if (details.marketCap && typeof details.marketCap === 'object' && 'value' in details.marketCap) {
              return sum + (details.marketCap as PricingResult).value;
            }
            // Fallback if marketCap is a bigint (for backward compatibility)
            if (typeof details.marketCap === 'bigint') {
              return sum + details.marketCap;
            }
            return sum;
          }, 
          0n
        );
        
        // Calculate total liquidity
        const totalLiquidityWei = allCoinDetails.reduce(
          (sum, details) => {
            if (details.liquidity && typeof details.liquidity === 'object' && 'value' in details.liquidity) {
              return sum + (details.liquidity as PricingResult).value;
            }
            if (typeof details.liquidity === 'bigint') {
              return sum + details.liquidity;
            }
            return sum;
          }, 
          0n
        );
        
        // Calculate unique owners
        const uniqueOwnersSet = new Set<string>();
        allCoinDetails.forEach(details => {
          details.owners.forEach(owner => uniqueOwnersSet.add(owner));
        });
        
        // Format values for display
        const totalMarketCapEth = formatEther(totalMarketCapWei);
        const totalLiquidityEth = formatEther(totalLiquidityWei);
        
        // Update state with formatted values
        setStats({
          totalMarketCap: `$${parseFloat(totalMarketCapEth).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`,
          totalLiquidity: `$${parseFloat(totalLiquidityEth).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`,
          uniqueOwners: uniqueOwnersSet.size,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching coins stats:', error);
        setStats(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error as Error 
        }));
      }
    }

    if (coinAddresses.length > 0) {
      fetchCoinsStats();
    } else {
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, [coinAddresses]);

  return stats;
}