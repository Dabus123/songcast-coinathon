import { Chain } from 'viem';
import { base} from 'viem/chains';

export const SUPPORTED_CHAINS = {
  base,
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

export async function switchNetwork(chainId: SupportedChainId) {
  try {
    const chain = SUPPORTED_CHAINS[chainId];
    
    // Request network switch
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chain.id.toString(16)}` }],
    });
    
    return true;
  } catch (error: any) {
    // If the chain is not added to the wallet, add it
    if (error.code === 4902) {
      try {
        const chain = SUPPORTED_CHAINS[chainId];
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${chain.id.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: chain.blockExplorers?.default.url ? [chain.blockExplorers.default.url] : undefined,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Error adding network:', addError);
        return false;
      }
    }
    console.error('Error switching network:', error);
    return false;
  }
}

export function getCurrentChainId(): SupportedChainId | null {
  if (!window.ethereum) return null;
  
  const chainId = window.ethereum.chainId;
  const decimalChainId = parseInt(chainId, 16);
  
  for (const [key, chain] of Object.entries(SUPPORTED_CHAINS)) {
    if (chain.id === decimalChainId) {
      return key as SupportedChainId;
    }
  }
  
  return null;
} 