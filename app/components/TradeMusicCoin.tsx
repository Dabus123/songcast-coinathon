'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Address, parseEther, formatEther } from 'viem';
import { ArrowUpDown, Coins, RefreshCw, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useZoraCoins, TradeParams } from '../hooks/useZoraCoins';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import NetworkSwitch from './NetworkSwitch';
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

// ClientOnly wrapper to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : <div style={{ visibility: 'hidden' }} aria-hidden="true"></div>;
}

export interface TradeMusicCoinProps {
  coinAddress: Address;
  coinName: string;
  coinSymbol: string;
  artistName?: string;
  coverArt?: string;
}

export default function TradeMusicCoin({
  coinAddress,
  coinName,
  coinSymbol,
  artistName,
  coverArt
}: TradeMusicCoinProps) {
  const { address, isConnected } = useAccount();
  const { 
    tradeMusicCoin, 
    isTrading, 
    tradeSuccess, 
    tradeError,
    simulateBuyCoin,
    lastTxHash
  } = useZoraCoins();
  
  const [tradeAmount, setTradeAmount] = useState('0.01');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [txPending, setTxPending] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [simulatedOutput, setSimulatedOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(2); // Default 2%
  
  // Track transaction status
  useEffect(() => {
    setTxPending(formSubmitted && isTrading);
    setTxSuccess(tradeSuccess);
    
    if (tradeError) {
      setTxError(tradeError.message);
      setFormSubmitted(false);
    }
    
    if (tradeSuccess) {
      setFormSubmitted(false);
    }
  }, [isTrading, tradeSuccess, tradeError, formSubmitted]);
  
  // Reset success after showing message
  useEffect(() => {
    if (txSuccess) {
      const timer = setTimeout(() => {
        setTxSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [txSuccess]);

  // Simulate buy when amount changes (for buy only)
  useEffect(() => {
    let isActive = true;
    
    if (tradeType === 'buy' && Number(tradeAmount) > 0) {
      const simulateBuy = async () => {
        try {
          setIsSimulating(true);
          const simulation = await simulateBuyCoin(coinAddress, tradeAmount);
          
          if (isActive) {
            setSimulatedOutput(simulation.formattedAmountOut);
          }
        } catch (error) {
          console.error('Error simulating buy:', error);
          if (isActive) {
            setSimulatedOutput(null);
          }
        } finally {
          if (isActive) {
            setIsSimulating(false);
          }
        }
      };
      
      // Debounce simulation
      const timer = setTimeout(() => {
        simulateBuy();
      }, 500);
      
      return () => {
        isActive = false;
        clearTimeout(timer);
      };
    } else {
      setSimulatedOutput(null);
    }
  }, [tradeAmount, tradeType, coinAddress, simulateBuyCoin]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(Number(value)) && Number(value) >= 0) {
      setTradeAmount(value);
    }
  };

  const toggleTradeType = () => {
    setTradeType(prev => prev === 'buy' ? 'sell' : 'buy');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setTxError('Please connect your wallet');
      return;
    }

    if (Number(tradeAmount) <= 0) {
      setTxError('Please enter a valid amount');
      return;
    }

    try {
      setFormSubmitted(true);
      setTxError(null);
      
      // Create trade parameters following the latest SDK patterns
      const tradeParams: TradeParams = {
        direction: tradeType,
        target: coinAddress,
        args: {
          recipient: address,
          orderSize: parseEther(tradeAmount),
          tradeReferrer: "0x32C8ACD3118766CBE5c3E45a44BCEDde953EF627" as Address
        }
      };
      
      // For buy orders, calculate slippage protection based on simulation
      if (tradeType === 'buy' && simulatedOutput) {
        // Parse the simulated output and apply slippage tolerance
        const expectedTokens = parseEther(simulatedOutput);
        const slippageMultiplier = BigInt(Math.floor(10000 - (slippageTolerance * 100))); // e.g., 9800 for 2% slippage
        const minTokensOut = (expectedTokens * slippageMultiplier) / 10000n;
        tradeParams.args.minAmountOut = minTokensOut;
        
        console.log('Buy order slippage calculation:', {
          expectedTokens: formatEther(expectedTokens),
          slippageTolerance: `${slippageTolerance}%`,
          minTokensOut: formatEther(minTokensOut)
        });
      }
      
      // For sell orders, calculate minimum ETH out based on current simulation
      if (tradeType === 'sell') {
        // You might want to simulate sell orders too for slippage protection
        // For now, we'll use a minimal amount to prevent zero-value trades
        tradeParams.args.minAmountOut = 1n; // Minimal protection
      }
      
      console.log('Executing trade with parameters:', tradeParams);
      
      // Execute the trade using the SDK
      await tradeMusicCoin(tradeParams);
      
    } catch (error: any) {
      console.error('Trade execution failed:', error);
      let errorMessage = 'Trade failed';
      
      // Better error handling based on common failure patterns
      if (error.message) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for this trade';
        } else if (error.message.includes('slippage')) {
          errorMessage = 'Trade failed due to price movement. Try increasing slippage tolerance.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was cancelled';
        } else {
          errorMessage = `Trade failed: ${error.message}`;
        }
      }
      
      setTxError(errorMessage);
      setFormSubmitted(false);
    }
  };

  return (
    <ClientOnly>
      <div className="relative backdrop-blur-sm rounded-xl overflow-hidden">
        {/* Artist info panel */}
        {artistName && (
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-full bg-primary/20 flex items-center justify-center text-xs p-2">
          <a>Trade {coinSymbol}</a>
            </div>
         
          </div>
        )}

        {txSuccess && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 rounded-xl overflow-hidden"
            >
              <div className="bg-green-500/10 p-4 border border-green-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-500 mb-1">
                      Transaction Successful
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tradeType === 'buy' 
                        ? `You purchased ${coinSymbol} tokens successfully!` 
                        : `You sold ${coinSymbol} tokens successfully!`}
                    </p>
                    {lastTxHash && (
                      <a 
                        href={`https://basescan.org/tx/${lastTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary mt-2 flex items-center gap-1 hover:underline"
                      >
                        <span>View transaction</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {!isConnected ? (
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-5">
            <h4 className="text-lg font-medium mb-3 text-center">Connect Wallet to Trade</h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You need to connect your wallet to trade {coinSymbol} tokens.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="sonic-button-primary"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <>
            <NetworkSwitch className="mb-4" />
            <form onSubmit={handleSubmit}>
              <div className="sonic-glass-card p-5 rounded-xl mb-4 border border-white/5">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium">
                      {tradeType === 'buy' ? 'You Pay' : 'You Sell'}
                    </label>
                    <button
                      type="button"
                      onClick={toggleTradeType}
                      className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 py-1 px-2 rounded-full"
                    >
                      <ArrowUpDown size={12} />
                      <span>Switch to {tradeType === 'buy' ? 'Sell' : 'Buy'}</span>
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={tradeAmount}
                      onChange={handleAmountChange}
                      className="sonic-input text-2xl font-medium py-3 bg-black/30"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 px-3 py-1 rounded-lg text-sm font-medium">
                      {tradeType === 'buy' ? 'ETH' : coinSymbol}
                    </div>
                  </div>
                </div>
              </div>

              {tradeType === 'buy' && (
                <div className="mb-4">
                  <div className="sonic-glass-card p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm">Estimated Receive</div>
                      <div className="flex items-center gap-1 font-medium">
                        {isSimulating ? (
                          <RefreshCw size={14} className="animate-spin text-primary" />
                        ) : simulatedOutput ? (
                          <TrendingUp size={14} className="text-green-500" />
                        ) : null}
                        <span className={isSimulating ? 'text-muted-foreground' : ''}>
                          {isSimulating 
                            ? 'Calculating...' 
                            : simulatedOutput 
                              ? `${Number(simulatedOutput).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${coinSymbol}`
                              : '-'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-2">Slippage Tolerance</div>
                      <div className="flex gap-2">
                        {[0.5, 1, 2, 5].map((tolerance) => (
                          <button
                            key={tolerance}
                            type="button"
                            onClick={() => setSlippageTolerance(tolerance)}
                            className={`px-2 py-1 rounded-md text-xs ${
                              slippageTolerance === tolerance 
                                ? 'bg-primary text-white' 
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
                            {tolerance}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`sonic-button-primary w-full py-3 ${
                  tradeType === 'buy' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={txPending || Number(tradeAmount) <= 0 || (tradeType === 'buy' && isSimulating)}
              >
                {txPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="spinner-sm"></div>
                    <span>Processing Transaction...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {tradeType === 'buy' ? (
                      <>
                        <TrendingUp size={18} />
                        <span>Buy {coinSymbol}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown size={18} />
                        <span>Sell {coinSymbol}</span>
                      </>
                    )}
                  </div>
                )}
              </button>

              {txError && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 sonic-glass-card p-3 border border-red-500/20 rounded-xl overflow-hidden"
                >
                  <div className="flex items-start gap-2 text-red-500">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div className="text-sm">{txError}</div>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/20 p-2 rounded-lg">
                    <div className="text-muted-foreground/80 mb-1">Protocol</div>
                    <div className="font-medium">Zora</div>
                  </div>
                  <div className="bg-muted/20 p-2 rounded-lg">
                    <div className="text-muted-foreground/80 mb-1">Slippage</div>
                    <div className="font-medium">{slippageTolerance}%</div>
                  </div>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </ClientOnly>
  );
} 