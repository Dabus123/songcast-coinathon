import { useNetworkSwitch } from '../hooks/useNetworkSwitch';

interface NetworkSwitchProps {
  targetChainId?: 'base';
  className?: string;
}

export default function NetworkSwitch({ targetChainId = 'base', className = '' }: NetworkSwitchProps) {
  const { isCorrectNetwork, isSwitching, handleNetworkSwitch } = useNetworkSwitch(targetChainId);

  if (isCorrectNetwork) {
    return null;
  }

  return (
    <div className={`bg-black border-2 border-white shadow-woodcut p-4 ${className}`}>
      <h3 className="text-lg font-bold text-white uppercase mb-2">
        Switch Network
      </h3>
      <p className="text-white mb-4">
        Please switch to {targetChainId === 'base' ? 'Base Mainnet' : 'Base Goerli'} to continue.
      </p>
      <button
        onClick={handleNetworkSwitch}
        disabled={isSwitching}
        className="w-full bg-woodcut-red border-2 border-white text-white font-bold uppercase tracking-wide px-5 py-2.5 shadow-woodcut hover:bg-woodcut-orange transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSwitching ? 'Switching...' : 'Switch Network'}
      </button>
    </div>
  );
} 