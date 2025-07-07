'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { 
  Coins, 
  TrendingUp, 
  Shield, 
  Headphones, 
  ArrowLeft,
  PlayCircle,
  PauseCircle,
  Volume2
} from 'lucide-react';
import Link from 'next/link';
import PassiveInvestmentManager from '../components/PassiveInvestmentManager';
import { useZoraEvents } from '../hooks/useZoraEvents';
import { useAudio } from '../context/AudioContext';
import { usePassiveInvestmentAudio } from '../hooks/usePassiveInvestmentAudio';
import { useSpendLimits } from '../hooks/useSpendLimits';

// ClientOnly wrapper to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : null;
}

export default function PassiveInvestmentPage() {
  const { isConnected } = useAccount();
  const { coins, loading } = useZoraEvents();
  const { 
    currentTrack, 
    isPlaying, 
    playlist, 
    play, 
    pause,
    setShowMiniPlayer 
  } = useAudio();
  const { 
    hasInvestedInCurrentTrack, 
    isPassiveInvestmentEnabled 
  } = usePassiveInvestmentAudio();
  const { settings, verifySpendPermissionOnChain, hasSpendPermission } = useSpendLimits();

  // Get available coins for the manager component
  const availableCoins = React.useMemo(() => {
    return coins.map(coin => ({
      coinAddress: coin.coinAddress,
      name: coin.name,
      symbol: coin.symbol,
      coverArt: coin.coverArt
    }));
  }, [coins]);

  const handlePlayDemoTrack = async () => {
    if (playlist.length > 0) {
      const firstTrack = playlist[0];
      await play(firstTrack);
      setShowMiniPlayer(true);
    }
  };

  const handleManualVerification = async () => {
    console.log('🔍 Manual verification triggered...');
    const result = await verifySpendPermissionOnChain();
    console.log('🔍 Manual verification result:', result);
    alert(`On-chain verification result: ${result ? 'ACTIVE' : 'INACTIVE'}`);
  };

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="sonic-button-outline p-2">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Coins size={36} className="text-primary" />
                Passive Music Investment
              </h1>
              <p className="text-muted-foreground text-lg">
                Automatically invest in music coins while you listen to your favorite tracks
              </p>
            </div>
          </div>

          {/* Current Status Banner */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sonic-glass-card p-6 mb-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${hasSpendPermission ? 'bg-green-500/20' : 'bg-muted/20'}`}>
                    <TrendingUp size={24} className={hasSpendPermission ? 'text-green-500' : 'text-muted-foreground'} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      {hasSpendPermission ? 'Passive Investment Active' : 'Passive Investment Inactive'}
                    </h3>
                    <p className="text-muted-foreground">
                      {hasSpendPermission 
                        ? `Investing ${settings.amountPerListen} ETH per listen`
                        : 'Set up spend limits to start investing automatically'
                      }
                    </p>
                  </div>
                </div>
                
                {currentTrack && (
                  <div className="flex items-center gap-3 bg-muted/10 rounded-lg p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center">
                      {currentTrack.coverArt ? (
                        <img 
                          src={currentTrack.coverArt} 
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Headphones size={20} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{currentTrack.title}</div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        {isPlaying ? (
                          <>
                            <Volume2 size={12} className="text-green-500" />
                            <span>Playing</span>
                          </>
                        ) : (
                          <span>Paused</span>
                        )}
                        {hasInvestedInCurrentTrack && (
                          <span className="ml-2 text-green-500">• Invested</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Debug Section - Remove this after fixing */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                  className="sonic-glass-card p-6 mb-8"
            >
              <h3 className="text-lg font-semibold mb-4 text-yellow-600">Passive Investment Status</h3>
              <div className="grid grid-cols-1 md:grid-rows-2 gap-4 text-sm">
                <div>
                  <strong>Settings Configured:</strong> {settings.enabled ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>Passive Investment Active:</strong> {hasSpendPermission ? '✅ Yes' : '❌ No'}
                </div>
              </div>
            </motion.div>
          )}

          {/* Demo Section */}
          {isConnected && !currentTrack && playlist.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sonic-glass-card p-6 mb-8"
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-3">Try It Now</h3>
                <p className="text-muted-foreground mb-4">
                Hit play and let songcast do the work. The tracks you listen to the most become your biggest bags automatically
                </p>
                <button
                  onClick={handlePlayDemoTrack}
                  className="sonic-button-primary"
                >
                  <PlayCircle size={18} />
                  <span>Play The First Track</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Main Management Component */}
          <PassiveInvestmentManager availableCoins={availableCoins} />

          {/* How It Benefits Artists */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="sonic-glass-card p-6 mt-8"
          >
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Headphones size={24} />
             MUSIC FLYWHEEL
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={24} className="text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Direct Investment</h4>
                <p className="text-sm text-muted-foreground">
                Listeners auto-invest in artist coins just by pressing play — real-time financial support tied directly to fan engagement.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Coins size={24} className="text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Organic Market Growth</h4>
                <p className="text-sm text-muted-foreground">
                Every stream fuels consistent buy pressure, helping drive price stability and long-term growth of the artist’s token.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield size={24} className="text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Sustainable Revenue</h4>
                <p className="text-sm text-muted-foreground">
                Artists earn ongoing revenue and gain more holders with every stream. Allowing everybody to be a part of the music flywheel.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Statistics Section */}
          {isConnected && coins.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="sonic-glass-card p-6 mt-8"
            >
              <h3 className="text-2xl font-semibold mb-6">Platform Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {coins.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available Music Coins
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {playlist.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tracks in Playlist
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {settings.amountPerListen}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ETH per Listen
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {settings.dailyLimit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Daily Limit (ETH)
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Getting Started Guide */}
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sonic-glass-card p-8 text-center"
            >
              <Shield size={64} className="mx-auto mb-6 text-muted-foreground" />
              <h3 className="text-2xl font-semibold mb-4">Get Started with Passive Investment</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Connect your Base Smart Wallet to set up automatic music coin investments. 
                Your funds remain secure with Base's spend limit technology, giving you full control over your investment amounts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/" className="sonic-button-primary">
                  Connect Wallet & Start
                </Link>
                <Link href="/coins" className="sonic-button-outline">
                  Browse Music Coins
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </ClientOnly>
  );
} 