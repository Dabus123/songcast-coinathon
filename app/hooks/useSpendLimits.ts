import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSignTypedData } from 'wagmi';
import { Address, parseEther, formatEther, Hex, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { spendPermissionManagerAddress, spendPermissionManagerAbi } from '../lib/abi/SpendPermissionManager';

export interface SpendPermission {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: Hex;
}

export interface PassiveInvestmentSettings {
  enabled: boolean;
  amountPerListen: string; // ETH amount as string
  dailyLimit: string; // ETH amount as string
  excludedCoins: Address[];
  spendPermissionActive: boolean;
}

export function useSpendLimits() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signTypedDataAsync } = useSignTypedData();
  
  const [settings, setSettings] = useState<PassiveInvestmentSettings>({
    enabled: false,
    amountPerListen: '0.001', // Default 0.001 ETH per listen
    dailyLimit: '0.1', // Default 0.1 ETH daily limit
    excludedCoins: [],
    spendPermissionActive: false
  });
  
  const [isCreatingSpendLimit, setIsCreatingSpendLimit] = useState(false);
  const [spendLimitError, setSpendLimitError] = useState<string | null>(null);
  const [spendPermissionSignature, setSpendPermissionSignature] = useState<Hex | null>(null);
  const [currentSpendPermission, setCurrentSpendPermission] = useState<SpendPermission | null>(null);
  
  // App spender address - this would be your backend wallet that executes purchases
  const SPENDER_ADDRESS = process.env.NEXT_PUBLIC_SPENDER_ADDRESS as Address || '0xA2A505caE49fC1cd579cE9719830FbE5506453bF' as Address;
  
  // Add caching and throttling for API calls
  const lastVerificationTime = useRef<number>(0);
  const lastFetchTime = useRef<number>(0);
  const VERIFICATION_THROTTLE = 60000; // 1 minute
  const FETCH_THROTTLE = 30000; // 30 seconds
  
  // Control console logging
  const shouldLog = process.env.NODE_ENV === 'development';
  
  // Memoize hasSpendPermission to prevent unnecessary re-calculations
  const hasSpendPermission = useMemo(() => {
    const result = !!(currentSpendPermission && spendPermissionSignature);
    if (shouldLog) {
      console.log('🔍 hasSpendPermission calculation:', {
        hasCurrentSpendPermission: !!currentSpendPermission,
        hasSpendPermissionSignature: !!spendPermissionSignature,
        result
      });
    }
    return result;
  }, [currentSpendPermission, spendPermissionSignature, shouldLog]);
  
  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: PassiveInvestmentSettings) => {
    if (address) {
      try {
        localStorage.setItem(`passive-investment-${address}`, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        if (shouldLog) {
          console.error('Error saving settings to localStorage:', error);
        }
      }
    }
  }, [address, shouldLog]);
  
  // Update settings
  const updateSettings = useCallback((newSettings: Partial<PassiveInvestmentSettings>) => {
    const updated = { ...settings, ...newSettings };
    saveSettings(updated);
  }, [settings, saveSettings]);
  
  // Verify spend permission status using Coinbase's official API - with throttling
  const verifySpendPermissionOnChain = useCallback(async () => {
    if (!address || !currentSpendPermission) {
      return false;
    }

    const now = Date.now();
    if ((now - lastVerificationTime.current) < VERIFICATION_THROTTLE) {
      if (shouldLog) {
        console.log('🔍 Verification throttled, using cached result');
      }
      return settings.spendPermissionActive;
    }

    try {
      lastVerificationTime.current = now;
      
      if (shouldLog) {
        console.log('🔍 Verifying spend permission using Coinbase API...');
      }
      
      // Use Coinbase's official fetchpermissions RPC method
      const response = await fetch('https://rpc.wallet.coinbase.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'coinbase_fetchPermissions',
          params: [
            {
              account: address,
              chainId: `0x${base.id.toString(16)}`, // Convert to hex format
              spender: SPENDER_ADDRESS
            }
          ],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        if (shouldLog) {
          console.error('❌ Coinbase API error:', result.error);
        }
        return false;
      }

      const permissions = result.result?.permissions || [];
      if (shouldLog) {
        console.log('📋 Found permissions from Coinbase API:', permissions.length);
      }

      // Check if we have an active permission that matches our current one
      const hasActivePermission = permissions.some((perm: any) => {
        const spendPerm = perm.spendPermission;
        const now = Math.floor(Date.now() / 1000);
        
        // Check if this permission matches our current spend permission parameters
        const matches = 
          spendPerm.account.toLowerCase() === address.toLowerCase() &&
          spendPerm.spender.toLowerCase() === SPENDER_ADDRESS.toLowerCase() &&
          spendPerm.token.toLowerCase() === currentSpendPermission.token.toLowerCase() &&
          spendPerm.start <= now && 
          spendPerm.end > now; // Permission is currently active
        
        if (matches && shouldLog) {
          console.log('✅ Found matching active permission:', {
            allowance: spendPerm.allowance,
            period: spendPerm.period,
            start: spendPerm.start,
            end: spendPerm.end,
            currentTime: now
          });
        }
        
        return matches;
      });

      if (shouldLog) {
        console.log('✅ Coinbase API spend permission status:', hasActivePermission);
      }
      return hasActivePermission;
    } catch (error) {
      if (shouldLog) {
        console.error('❌ Error verifying spend permission with Coinbase API:', error);
      }
      return false;
    }
  }, [address, currentSpendPermission, SPENDER_ADDRESS, settings.spendPermissionActive, shouldLog]);

  // Fetch existing spend permissions from Coinbase API - with throttling
  const fetchExistingPermissions = useCallback(async () => {
    if (!address) {
      return null;
    }

    const now = Date.now();
    if ((now - lastFetchTime.current) < FETCH_THROTTLE) {
      if (shouldLog) {
        console.log('🔍 Fetch throttled, skipping');
      }
      return null;
    }

    try {
      lastFetchTime.current = now;
      
      if (shouldLog) {
        console.log('🔍 Fetching existing permissions from Coinbase API...');
      }
      
      const response = await fetch('https://rpc.wallet.coinbase.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'coinbase_fetchPermissions',
          params: [
            {
              account: address,
              chainId: `0x${base.id.toString(16)}`,
              spender: SPENDER_ADDRESS
            }
          ],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        if (shouldLog) {
          console.error('❌ Coinbase API error:', result.error);
        }
        return null;
      }

      const permissions = result.result?.permissions || [];
      if (shouldLog) {
        console.log('📋 Found existing permissions:', permissions.length);
      }

      // Find the most recent active permission for ETH
      const currentTime = Math.floor(Date.now() / 1000);
      const activePermission = permissions.find((perm: any) => {
        const spendPerm = perm.spendPermission;
        return (
          spendPerm.account.toLowerCase() === address.toLowerCase() &&
          spendPerm.spender.toLowerCase() === SPENDER_ADDRESS.toLowerCase() &&
          spendPerm.token.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase() &&
          spendPerm.start <= currentTime && 
          spendPerm.end > currentTime
        );
      });

      if (activePermission) {
        const spendPerm = activePermission.spendPermission;
        if (shouldLog) {
          console.log('✅ Found active permission, restoring to state...');
        }
        
        // Convert to our SpendPermission format
        const restoredPermission: SpendPermission = {
          account: spendPerm.account as Address,
          spender: spendPerm.spender as Address,
          token: spendPerm.token as Address,
          allowance: BigInt(spendPerm.allowance),
          period: spendPerm.period,
          start: spendPerm.start,
          end: spendPerm.end,
          salt: BigInt(spendPerm.salt),
          extraData: spendPerm.extraData as Hex
        };

        setCurrentSpendPermission(restoredPermission);
        
        // For existing permissions, we need to set a placeholder signature
        // since we can't recover the original signature from the API
        // This will allow hasSpendPermission to be true
        setSpendPermissionSignature('0x' as Hex);
        
        // Save to localStorage for faster loading next time
        const spendPermissionForStorage = {
          ...restoredPermission,
          allowance: restoredPermission.allowance.toString(),
          salt: restoredPermission.salt.toString()
        };
        localStorage.setItem(`spend-permission-${address}`, JSON.stringify(spendPermissionForStorage));
        
        // Don't automatically set spendPermissionActive to true here
        // Let the on-chain verification handle the status update
        if (shouldLog) {
          console.log('✅ Found and restored permission, letting on-chain verification handle status');
        }
        
        return restoredPermission;
      }

      return null;
    } catch (error) {
      if (shouldLog) {
        console.error('❌ Error fetching existing permissions:', error);
      }
      return null;
    }
  }, [address, SPENDER_ADDRESS, shouldLog]);

  // Check on-chain status when component mounts or spend permission changes - throttled
  useEffect(() => {
    let isCancelled = false;
    
    const checkOnChainStatus = async () => {
      if (currentSpendPermission && address && !isCancelled) {
        // Add a small delay to prevent rapid successive calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isCancelled) return;
        
        try {
          const isActive = await verifySpendPermissionOnChain();
          
          if (isCancelled) return;
          
          // Get current settings to avoid stale closure
          const currentSettings = JSON.parse(localStorage.getItem(`passive-investment-${address}`) || '{}');
          const currentSpendPermissionActive = currentSettings.spendPermissionActive || false;
          
          if (shouldLog) {
            console.log(`🔍 On-chain verification result: ${isActive}, current setting: ${currentSpendPermissionActive}`);
          }
          
          if (isActive !== currentSpendPermissionActive) {
            if (shouldLog) {
              console.log(`🔄 Updating spend permission status to match on-chain: ${isActive}`);
            }
            updateSettings({ spendPermissionActive: isActive });
          }
        } catch (error) {
          if (shouldLog && !isCancelled) {
            console.error('❌ Error checking on-chain status:', error);
          }
        }
      }
    };

    checkOnChainStatus();
    
    return () => {
      isCancelled = true;
    };
  }, [currentSpendPermission, address, verifySpendPermissionOnChain, updateSettings, shouldLog]);

  // Load settings from localStorage - only once when address changes
  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem(`passive-investment-${address}`);
      if (saved) {
        try {
          const parsedSettings = JSON.parse(saved);
          setSettings(parsedSettings);
        } catch (error) {
          if (shouldLog) {
            console.error('Error loading saved settings:', error);
          }
        }
      }

      // Try to restore spend permission from localStorage first
      const savedPermission = localStorage.getItem(`spend-permission-${address}`);
      if (savedPermission) {
        try {
          const parsedPermission = JSON.parse(savedPermission);
          // Convert string values back to BigInt
          const restoredPermission: SpendPermission = {
            ...parsedPermission,
            allowance: BigInt(parsedPermission.allowance),
            salt: BigInt(parsedPermission.salt)
          };
          setCurrentSpendPermission(restoredPermission);
          // Set a placeholder signature since we have a valid permission
          setSpendPermissionSignature('0x' as Hex);
          if (shouldLog) {
            console.log('🔄 Restored spend permission from localStorage');
          }
        } catch (error) {
          if (shouldLog) {
            console.error('Error restoring spend permission:', error);
          }
        }
      } else {
        // If no local permission found, try fetching from Coinbase API - but only once
        if (shouldLog) {
          console.log('🔍 No local permission found, checking Coinbase API...');
        }
        // Use a timeout to prevent blocking the UI
        setTimeout(() => {
          fetchExistingPermissions();
        }, 2000);
      }
    }
  }, [address, shouldLog]); // Removed fetchExistingPermissions to prevent infinite loops
  
  // Create a spend permission for passive investment
  const createSpendPermission = useCallback(async () => {
    if (!isConnected || !address || !walletClient) {
      throw new Error('Wallet not connected');
    }
    
    setIsCreatingSpendLimit(true);
    setSpendLimitError(null);
    
    try {
      // Calculate proper start time aligned to period boundaries
      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      
      // For daily periods (86400 seconds), align to UTC midnight
      const periodDuration = 86400; // 24 hours in seconds
      const dayStart = Math.floor(now / periodDuration) * periodDuration; // Start of current day (midnight UTC)
      
      // Create spend permission object with proper period boundaries
      const spendPermission: SpendPermission = {
        account: address,
        spender: SPENDER_ADDRESS,
        token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, // ETH token (EIP-7528)
        allowance: parseEther(settings.dailyLimit),
        period: periodDuration, // 24 hours in seconds
        start: dayStart, // Start at beginning of current day for clean boundaries
        end: dayStart + (365 * periodDuration), // End after 1 year
        salt: BigInt(Math.floor(Date.now() / 1000)), // Use current timestamp as salt for uniqueness
        extraData: '0x' as Hex
      };

      if (shouldLog) {
        console.log('📋 Creating spend permission with period configuration:', {
          currentTime: now,
          periodStart: dayStart,
          periodEnd: spendPermission.end,
          periodDuration: spendPermission.period,
          allowancePerPeriod: formatEther(spendPermission.allowance),
          periodsTotal: Math.floor((spendPermission.end - spendPermission.start) / spendPermission.period)
        });
      }
      
      // Sign the spend permission with correct EIP-712 domain
      const signature = await signTypedDataAsync({
        domain: {
          name: 'Spend Permission Manager', // Corrected: Base docs show this with spaces
          version: '1',
          chainId: base.id,
          verifyingContract: spendPermissionManagerAddress,
        },
        types: {
          SpendPermission: [
            { name: 'account', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'allowance', type: 'uint160' },
            { name: 'period', type: 'uint48' },
            { name: 'start', type: 'uint48' },
            { name: 'end', type: 'uint48' },
            { name: 'salt', type: 'uint256' },
            { name: 'extraData', type: 'bytes' },
          ],
        },
        primaryType: 'SpendPermission',
        message: spendPermission,
      });
      
      // Store the signed permission
      setSpendPermissionSignature(signature);
      setCurrentSpendPermission(spendPermission);
      
      // Save spend permission to localStorage for persistence
      const spendPermissionForStorage = {
        ...spendPermission,
        allowance: spendPermission.allowance.toString(),
        salt: spendPermission.salt.toString()
      };
      localStorage.setItem(`spend-permission-${address}`, JSON.stringify(spendPermissionForStorage));
      
      // Convert BigInt values to strings for JSON serialization
      const spendPermissionForAPI = {
        ...spendPermission,
        allowance: spendPermission.allowance.toString(),
        salt: spendPermission.salt.toString()
      };

      // Send to backend to approve the spend limit
      if (shouldLog) {
        console.log('📤 Sending spend permission to backend for approval...');
      }
      const response = await fetch('/api/spend-limits/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spendPermission: spendPermissionForAPI,
          signature,
        }),
      });
      
      if (shouldLog) {
        console.log('📥 Backend response status:', response.status);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        if (shouldLog) {
          console.error('❌ Backend approval failed:', errorData);
        }
        
        // Don't set spendPermissionActive to true if backend fails
        setSpendPermissionSignature(null);
        setCurrentSpendPermission(null);
        
        throw new Error(`Backend approval failed: ${errorData.error || 'Unknown error'}\nDetails: ${errorData.details || 'No details'}`);
      }
      
      const result = await response.json();
      if (shouldLog) {
        console.log('✅ Spend limit approved successfully:', result);
      }
      
      // Only update settings to reflect active spend permission if backend succeeded
      const newSettings = {
        ...settings,
        spendPermissionActive: true
      };
      saveSettings(newSettings);
      
      if (shouldLog) {
        console.log('✅ Spend permission is now active!');
      }
      return result;
      
    } catch (error: any) {
      if (shouldLog) {
        console.error('Error creating spend permission:', error);      
      }
      setSpendLimitError(error.message || 'Failed to create spend limit');
      throw error;
    } finally {
      setIsCreatingSpendLimit(false);
    }
  }, [isConnected, address, walletClient, signTypedDataAsync, settings, saveSettings, SPENDER_ADDRESS]);
  
  // Execute a passive investment purchase
  const executePassiveInvestment = useCallback(async (coinAddress: Address) => {
    if (shouldLog) {
      console.log('🎯 executePassiveInvestment called with:', coinAddress);
    }
    
    if (!settings.enabled || !settings.spendPermissionActive || !currentSpendPermission) {
      if (shouldLog) {
        console.log('❌ Passive investment not enabled or no active spend permission:', {
          enabled: settings.enabled,
          spendPermissionActive: settings.spendPermissionActive,
          hasCurrentSpendPermission: !!currentSpendPermission
        });
      }
      return null; // Return null to indicate failure
    }
    
    if (settings.excludedCoins.includes(coinAddress)) {
      if (shouldLog) {
        console.log(`❌ Coin ${coinAddress} is excluded from passive investment`);
      }
      return null; // Return null to indicate failure
    }
    
    try {
      // Convert BigInt values to strings for JSON serialization
      const spendPermissionForAPI = {
        ...currentSpendPermission,
        allowance: currentSpendPermission.allowance.toString(),
        salt: currentSpendPermission.salt.toString()
      };

      if (shouldLog) {
        console.log('📤 Sending investment request to API:', {
          coinAddress,
          amount: settings.amountPerListen,
          userAddress: address,
          spendPermissionExists: !!spendPermissionForAPI
        });
      }

      const response = await fetch('/api/spend-limits/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spendPermission: spendPermissionForAPI,
          coinAddress,
          amount: settings.amountPerListen,
          userAddress: address,
        }),
      });
      
      if (shouldLog) {
        console.log('📥 API response status:', response.status);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        if (shouldLog) {
          console.log('❌ API error response:', errorData);
        }
        
        // Handle stranded ETH - attempt automatic recovery
        if (errorData.strandedETH) {
          if (shouldLog) {
            console.error('🚨 STRANDED ETH DETECTED:', errorData.strandedETH);
            console.log('🔄 Attempting automatic ETH recovery...');
          }
          
          try {
            const recoveryResponse = await fetch('/api/spend-limits/recover', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userAddress: address,
                amount: errorData.strandedETH.amount,
              }),
            });

            const recoveryData = await recoveryResponse.json();
            
            if (recoveryResponse.ok) {
              if (shouldLog) {
                console.log('✅ ETH recovery successful:', recoveryData);
                console.log('🔗 Recovery TX:', `https://basescan.org/tx/${recoveryData.recovery.transactionHash}`);
              }
            } else {
              if (shouldLog) {
                console.error('❌ ETH recovery failed:', recoveryData);
              }
            }
          } catch (recoveryError) {
            if (shouldLog) {
              console.error('❌ ETH recovery attempt failed:', recoveryError);
            }
          }
        }
        
        // Handle rate limiting errors differently
        if (errorData.rateLimited || response.status === 429) {
          if (shouldLog) {
            console.log('🚨 Rate limiting detected - retrying passive investment in 60 seconds...');
          }
          // Don't clear the spend permission for rate limiting - it might be valid
          throw new Error('RPC rate limiting - please try again in a few minutes');
        }
        
        // If the spend permission is invalid/revoked, update local state
        if (errorData.error && errorData.error.includes('Spend permission is not valid or has been revoked')) {
          if (shouldLog) {
            console.log('🔄 Spend permission detected as invalid, updating local state...');
          }
          
          // Clear the local spend permission state
          setSpendPermissionSignature(null);
          setCurrentSpendPermission(null);
          
          // Clear localStorage
          if (address) {
            localStorage.removeItem(`spend-permission-${address}`);
          }
          
          // Update settings to reflect inactive status
          updateSettings({ spendPermissionActive: false });
          
          if (shouldLog) {
            console.log('✅ Local state updated to reflect invalid spend permission');
          }
        }
        
        throw new Error(`Failed to execute passive investment: ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      if (shouldLog) {
        console.log('✅ API success response:', result);
        
        // Log transaction hashes for easy Etherscan lookup
        if (result.investment) {
          console.log('🔗 Transaction hashes for Etherscan:');
          console.log('   Spend TX:', `https://basescan.org/tx/${result.investment.spendTransactionHash}`);
          console.log('   Trade TX:', `https://basescan.org/tx/${result.investment.tradeTransactionHash}`);
        }
      }
      
      return result;
      
    } catch (error) {
      if (shouldLog) {
        console.error('💥 Error executing passive investment:', error);
      }
      // Don't throw here to avoid interrupting music playback
      return null; // Return null to indicate failure
    }
  }, [settings, currentSpendPermission, address, shouldLog, updateSettings]);
  
  // Add coin to exclusion list
  const excludeCoin = useCallback((coinAddress: Address) => {
    const excludedCoins = [...settings.excludedCoins];
    if (!excludedCoins.includes(coinAddress)) {
      excludedCoins.push(coinAddress);
      updateSettings({ excludedCoins });
    }
  }, [settings.excludedCoins, updateSettings]);
  
  // Remove coin from exclusion list
  const includeCoin = useCallback((coinAddress: Address) => {
    const excludedCoins = settings.excludedCoins.filter(addr => addr !== coinAddress);
    updateSettings({ excludedCoins });
  }, [settings.excludedCoins, updateSettings]);
  
  // Revoke spend permission
  const revokeSpendPermission = useCallback(async () => {
    try {
      // Convert BigInt values to strings for JSON serialization
      const spendPermissionForAPI = currentSpendPermission ? {
        ...currentSpendPermission,
        allowance: currentSpendPermission.allowance.toString(),
        salt: currentSpendPermission.salt.toString()
      } : null;

      const response = await fetch('/api/spend-limits/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          spendPermission: spendPermissionForAPI,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke spend permission');
      }
      
      // Reset local state and localStorage
      setSpendPermissionSignature(null);
      setCurrentSpendPermission(null);
      if (address) {
        localStorage.removeItem(`spend-permission-${address}`);
      }
      updateSettings({ spendPermissionActive: false });
      
    } catch (error) {
      console.error('Error revoking spend permission:', error);
      throw error;
    }
  }, [address, currentSpendPermission, updateSettings]);
  
  return {
    settings,
    updateSettings,
    createSpendPermission,
    executePassiveInvestment,
    excludeCoin,
    includeCoin,
    revokeSpendPermission,
    verifySpendPermissionOnChain,
    isCreatingSpendLimit,
    spendLimitError,
    spendPermissionActive: settings.spendPermissionActive,
    hasSpendPermission,
    fetchExistingPermissions,
  };
}