import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { switchNetwork, getCurrentChainId, SupportedChainId } from '../utils/network';

export function useNetworkSwitch(targetChainId: SupportedChainId = 'base') {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setIsCorrectNetwork(false);
      return;
    }

    const currentChainId = getCurrentChainId();
    setIsCorrectNetwork(currentChainId === targetChainId);
  }, [isConnected, chainId, targetChainId]);

  const handleNetworkSwitch = async () => {
    if (!isConnected) return;
    
    setIsSwitching(true);
    try {
      const success = await switchNetwork(targetChainId);
      if (success) {
        setIsCorrectNetwork(true);
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  return {
    isCorrectNetwork,
    isSwitching,
    handleNetworkSwitch,
  };
} 