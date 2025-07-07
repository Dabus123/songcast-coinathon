// Pool configuration utilities for Zora Coins
// Based on the Zora Factory documentation

export interface PoolConfigOptions {
  version: 'v3' | 'v4';
  currency?: string; // Token address, use '0x0000000000000000000000000000000000000000' for ETH
  fee?: number; // Fee tier (e.g., 3000 for 0.3%)
  tickSpacing?: number; // Tick spacing for the pool
}

/**
 * Generate pool configuration bytes for common setups
 */
export function generatePoolConfig(options: PoolConfigOptions): `0x${string}` {
  const {
    version = 'v4',
    currency = '0x0000000000000000000000000000000000000000', // Default to ETH
    fee = 3000, // Default to 0.3% fee
    tickSpacing = 60 // Default tick spacing
  } = options;
  
  // This is a simplified example - actual pool config encoding depends on the specific requirements
  // You'll need to replace this with your actual pool configuration logic
  
  if (version === 'v3') {
    // V3 pool config example (simplified)
    // Actual implementation would encode: currency, fee, tickSpacing, etc.
    return `0x01${currency.slice(2)}${fee.toString(16).padStart(6, '0')}${tickSpacing.toString(16).padStart(4, '0')}` as `0x${string}`;
  } else {
    // V4 pool config example (simplified)
    // Actual implementation would encode: currency, hooks, fee, tickSpacing, etc.
    return `0x02${currency.slice(2)}${fee.toString(16).padStart(6, '0')}${tickSpacing.toString(16).padStart(4, '0')}` as `0x${string}`;
  }
}

/**
 * Predefined pool configurations for common use cases
 */
export const POOL_CONFIGS = {
  // User's custom pool configuration
  CUSTOM_CONFIG: '0x00000000000000000000000000000000000000000000000000000000000000040000000000000000000000001111111111166b7fe7bd91427724b487980afc6900000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000001fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffde4f00000000000000000000000000000000000000000000000000000000000000001fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec3980000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000b1a2bc2ec50000' as `0x${string}`,
  
  // Standard ETH pool with V4 and 0.3% fee
  STANDARD_ETH_V4: generatePoolConfig({
    version: 'v4',
    currency: '0x0000000000000000000000000000000000000000',
    fee: 3000
  }),
  
  // Standard ETH pool with V3 and 0.3% fee
  STANDARD_ETH_V3: generatePoolConfig({
    version: 'v3',
    currency: '0x4200000000000000000000000000000000000006',
    fee: 3000
  }),
  
  // Low fee ETH pool (0.05%)
  LOW_FEE_ETH: generatePoolConfig({
    version: 'v4',
    currency: '0x0000000000000000000000000000000000000000',
    fee: 500
  }),
  
  // High fee ETH pool (1%)
  HIGH_FEE_ETH: generatePoolConfig({
    version: 'v4',
    currency: '0x0000000000000000000000000000000000000000',
    fee: 10000
  })
} as const;

/**
 * Get a human-readable description of a pool config
 */
export function describePoolConfig(config: string): string {
  // Check for the user's custom configuration
  if (config === POOL_CONFIGS.CUSTOM_CONFIG) {
    return 'SongCast Custom Pool Configuration - Advanced V4 Setup';
  }
  
  // Check for other predefined configs
  if (config === POOL_CONFIGS.STANDARD_ETH_V4) {
    return 'Standard V4 ETH Pool (0.3% fee)';
  }
  
  if (config === POOL_CONFIGS.STANDARD_ETH_V3) {
    return 'Standard V3 ETH Pool (0.3% fee)';
  }
  
  if (config === POOL_CONFIGS.LOW_FEE_ETH) {
    return 'Low Fee V4 ETH Pool (0.05% fee)';
  }
  
  if (config === POOL_CONFIGS.HIGH_FEE_ETH) {
    return 'High Fee V4 ETH Pool (1% fee)';
  }
  
  // Generic descriptions based on prefix
  if (config.startsWith('0x01')) {
    return 'Uniswap V3 Pool Configuration';
  } else if (config.startsWith('0x02')) {
    return 'Uniswap V4 Pool Configuration';
  } else {
    return 'Custom Pool Configuration';
  }
} 