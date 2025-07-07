'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Address, formatEther } from 'viem';
import { 
  Coins, 
  Settings, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  X,
  Plus,
  Minus,
  Play,
  Pause,
  ExternalLink
} from 'lucide-react';
import { useSpendLimits } from '../hooks/useSpendLimits';
import { useAudio } from '../context/AudioContext';

// ClientOnly wrapper to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : null;
}

interface PassiveInvestmentManagerProps {
  availableCoins?: Array<{
    coinAddress: Address;
    name: string;
    symbol: string;
    coverArt?: string;
  }>;
}

export default function PassiveInvestmentManager({ availableCoins = [] }: PassiveInvestmentManagerProps) {
  const { address, isConnected } = useAccount();
  const { playlist } = useAudio();
  const {
    settings,
    updateSettings,
    createSpendPermission,
    excludeCoin,
    includeCoin,
    revokeSpendPermission,
    isCreatingSpendLimit,
    spendLimitError,
    spendPermissionActive,
    hasSpendPermission
  } = useSpendLimits();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempAmountPerListen, setTempAmountPerListen] = useState(settings.amountPerListen);
  const [tempDailyLimit, setTempDailyLimit] = useState(settings.dailyLimit);

  // Update temp values when settings change
  useEffect(() => {
    setTempAmountPerListen(settings.amountPerListen);
    setTempDailyLimit(settings.dailyLimit);
  }, [settings]);

  // Combine available coins from props and playlist
  const allCoins = React.useMemo(() => {
    const coinMap = new Map();
    
    // Add coins from playlist
    playlist.forEach(track => {
      if (track.coinAddress) {
        coinMap.set(track.coinAddress, {
          coinAddress: track.coinAddress as Address,
          name: track.title,
          symbol: track.title.substring(0, 6).toUpperCase(),
          coverArt: track.coverArt
        });
      }
    });
    
    // Add coins from props (might be more comprehensive data)
    availableCoins.forEach(coin => {
      coinMap.set(coin.coinAddress, coin);
    });
    
    return Array.from(coinMap.values());
  }, [playlist, availableCoins]);

  const handleEnablePassiveInvestment = async () => {
    try {
      if (!hasSpendPermission) {
        // First create the spend permission
        await createSpendPermission();
      }
      
      // Enable the feature
      updateSettings({ enabled: true });
    } catch (error) {
      console.error('Error enabling passive investment:', error);
    }
  };

  const handleDisablePassiveInvestment = async () => {
    try {
      if (hasSpendPermission) {
        await revokeSpendPermission();
      }
      updateSettings({ enabled: false });
    } catch (error) {
      console.error('Error disabling passive investment:', error);
    }
  };

  const handleUpdateAmounts = () => {
    updateSettings({
      amountPerListen: tempAmountPerListen,
      dailyLimit: tempDailyLimit
    });
  };

  const handleRecoverETH = async () => {
    if (!address) return;
    
    try {
      const recoveryResponse = await fetch('/api/spend-limits/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          amount: tempAmountPerListen, // Recover one investment amount
        }),
      });

      const recoveryData = await recoveryResponse.json();
      
      if (recoveryResponse.ok) {
        console.log('✅ ETH recovery successful:', recoveryData);
        alert(`ETH recovery successful! Transaction: ${recoveryData.recovery.transactionHash}`);
      } else {
        console.error('❌ ETH recovery failed:', recoveryData);
        alert(`ETH recovery failed: ${recoveryData.error}`);
      }
    } catch (error) {
      console.error('❌ ETH recovery attempt failed:', error);
      alert('ETH recovery attempt failed');
    }
  };

  const calculateDailyPotential = () => {
    // Rough estimate: if user listens to 20 songs per day
    const songsPerDay = 20;
    const dailySpend = parseFloat(tempAmountPerListen) * songsPerDay;
    const dailyLimit = parseFloat(tempDailyLimit);
    return Math.min(dailySpend, dailyLimit);
  };

  if (!isConnected) {
    return (
      <ClientOnly>
        <div className="sonic-glass-card p-6 text-center">
          <Shield size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
          <p className="text-muted-foreground">
            Connect your Smart Wallet to set up passive music investment.
          </p>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <div className="space-y-6">
        {/* Main Status Card */}
        <div className="sonic-glass-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-full ${settings.enabled ? 'bg-green-500/20' : 'bg-muted/20'}`}>
              <Coins size={24} className={settings.enabled ? 'text-green-500' : 'text-muted-foreground'} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Passive Music Investment</h2>
              <p className="text-muted-foreground">
                Automatically invest in music coins while you listen
              </p>
            </div>
            <a 
              href="/PASSIVE_INVESTMENT_FLOW.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 transition-colors"
              title="Learn how transactions work"
            >
              <ExternalLink size={16} />
              How it works
            </a>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-4">
            {settings.enabled ? (
              <>
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-green-500 font-medium">Active</span>
                <span className="text-muted-foreground">
                  • {settings.amountPerListen} ETH per listen
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-muted-foreground" />
                <span className="text-muted-foreground">Inactive</span>
              </>
            )}
          </div>

          {/* Error Display */}
          {spendLimitError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-500">Error</div>
                  <div className="text-sm text-red-400">{spendLimitError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Main Action Button */}
          <div className="flex gap-3">
            {!settings.enabled ? (
              <button
                onClick={handleEnablePassiveInvestment}
                disabled={isCreatingSpendLimit}
                className="sonic-button-primary flex-1"
              >
                {isCreatingSpendLimit ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Setting up spend limits...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} />
                    <span>Enable Passive Investment</span>
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisablePassiveInvestment}
                className="sonic-button-outline flex-1"
              >
                <div className="flex items-center gap-2">
                  <X size={18} />
                  <span>Disable</span>
                </div>
              </button>
            )}
            
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="sonic-button-outline px-4"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Advanced Settings */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sonic-glass-card p-6"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings size={20} />
                Investment Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount Per Listen */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount Per Listen (ETH)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.001"
                      value={tempAmountPerListen}
                      onChange={(e) => setTempAmountPerListen(e.target.value)}
                      className="sonic-input"
                      placeholder="0.001"
                    />
                    <div className="flex gap-2">
                      {['0.0005', '0.001', '0.005', '0.01'].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setTempAmountPerListen(amount)}
                          className={`px-2 py-1 text-xs rounded-md ${
                            tempAmountPerListen === amount
                              ? 'bg-primary text-white'
                              : 'bg-muted/20 hover:bg-muted/30'
                          }`}
                        >
                          {amount} ETH
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daily Limit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Daily Spending Limit (ETH)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={tempDailyLimit}
                      onChange={(e) => setTempDailyLimit(e.target.value)}
                      className="sonic-input"
                      placeholder="0.1"
                    />
                    <div className="flex gap-2">
                      {['0.05', '0.1', '0.5', '1.0'].map((limit) => (
                        <button
                          key={limit}
                          onClick={() => setTempDailyLimit(limit)}
                          className={`px-2 py-1 text-xs rounded-md ${
                            tempDailyLimit === limit
                              ? 'bg-primary text-white'
                              : 'bg-muted/20 hover:bg-muted/30'
                          }`}
                        >
                          {limit} ETH
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Projection */}
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Daily Investment Projection
                </h4>
                <div className="text-sm text-muted-foreground">
                  <p>
                    At {tempAmountPerListen} ETH per listen, you could invest up to{' '}
                    <span className="font-medium text-foreground">
                      {calculateDailyPotential().toFixed(4)} ETH per day
                    </span>
                    {' '}(assuming ~20 listens)
                  </p>
                  <p className="mt-1">
                    Daily limit: {tempDailyLimit} ETH
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={handleRecoverETH}
                  className="sonic-button-outline flex items-center gap-2"
                  title="Recover any ETH that may be stranded in the spender wallet"
                >
                  <RefreshCw size={16} />
                  Recover ETH
                </button>
                <button
                  onClick={handleUpdateAmounts}
                  className="sonic-button-primary"
                  disabled={
                    tempAmountPerListen === settings.amountPerListen &&
                    tempDailyLimit === settings.dailyLimit
                  }
                >
                  Update Settings
                </button>
              </div>
              
              {/* Recovery Info */}
              <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-500 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-600 dark:text-yellow-400">ETH Recovery</div>
                    <div className="text-yellow-600/80 dark:text-yellow-400/80">
                      If you notice ETH transfers to the spender wallet without corresponding coin purchases, 
                      use "Recover ETH" to get your funds back. This can happen if coin purchases fail due to network issues.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coin Exclusion List */}
        {settings.enabled && allCoins.length > 0 && (
          <div className="sonic-glass-card p-6">
            <h3 className="text-xl font-semibold mb-4">Investment Preferences</h3>
            <p className="text-muted-foreground mb-4">
              Choose which music coins to include or exclude from passive investment.
            </p>
            
            <div className="space-y-3">
              {allCoins.map((coin) => {
                const isExcluded = settings.excludedCoins.includes(coin.coinAddress);
                
                return (
                  <div
                    key={coin.coinAddress}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      {coin.coverArt && (
                        <img
                          src={coin.coverArt}
                          alt={coin.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{coin.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {coin.symbol}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() =>
                        isExcluded
                          ? includeCoin(coin.coinAddress)
                          : excludeCoin(coin.coinAddress)
                      }
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isExcluded
                          ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                      }`}
                    >
                      {isExcluded ? (
                        <div className="flex items-center gap-1">
                          <X size={12} />
                          <span>Excluded</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Included</span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="sonic-glass-card p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} />
            How Passive Investment Works
          </h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <div className="font-medium">Set Your Spend Limit</div>
                <div className="text-muted-foreground">
                  Authorize our app to spend a specific amount of ETH on your behalf using Base Smart Wallet's secure spend limits.
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <div className="font-medium">Listen to Music</div>
                <div className="text-muted-foreground">
                  Every time you play a song, we automatically purchase that music coin using your preset amount.
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <div className="font-medium">Build Your Portfolio</div>
                <div className="text-muted-foreground">
                  The more you listen, the more coins you collect. Your daily spending is capped by your limit for safety.
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Shield size={16} className="text-blue-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-blue-500">Secure & Controlled</div>
                <div className="text-blue-400">
                  You maintain full control. Revoke permissions anytime, and spending is limited to your daily allowance.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
} 