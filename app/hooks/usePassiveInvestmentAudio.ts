import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Address } from 'viem';
import { useSpendLimits } from './useSpendLimits';
import { useAudio } from '../context/AudioContext';

// Track when each song was last invested in to prevent rapid repeat investments
const investmentTracker = new Map<string, number>();
// Track successful investments per song per session to ensure only one purchase per play
const sessionInvestmentTracker = new Map<string, boolean>();
// Track in-flight investment calls to prevent concurrent requests
const inflightInvestmentTracker = new Map<string, boolean>();

export function usePassiveInvestmentAudio() {
  const { settings, executePassiveInvestment, hasSpendPermission, verifySpendPermissionOnChain } = useSpendLimits();
  const { currentTrack, isPlaying, currentTime } = useAudio();
  
  const lastInvestmentRef = useRef<string | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const hasInvestedInCurrentTrackRef = useRef<boolean>(false);

  // Memoize the passive investment enabled state to prevent unnecessary re-calculations
  const isPassiveInvestmentEnabled = useMemo(() => 
    settings.enabled && settings.spendPermissionActive && hasSpendPermission, 
    [settings.enabled, settings.spendPermissionActive, hasSpendPermission]
  );

  // Reduce console logging - only log when enabled and in development
  const shouldLog = process.env.NODE_ENV === 'development';

  // Enhanced debug logging with more details - always show in development to help diagnose issues
  useEffect(() => {
    if (!shouldLog) return;
    
    console.log('🎵 Passive Investment Debug Status:', {
      enabled: settings.enabled,
      spendPermissionActive: settings.spendPermissionActive,
      hasSpendPermission,
      isPassiveInvestmentEnabled,
      currentTrack: currentTrack?.title,
      coinAddress: currentTrack?.coinAddress,
      isPlaying,
      currentTime,
      hasInvestedInCurrentTrack: hasInvestedInCurrentTrackRef.current,
      amountPerListen: settings.amountPerListen,
      dailyLimit: settings.dailyLimit,
      excludedCoins: settings.excludedCoins.length,
    });
  }, [settings, currentTrack, isPlaying, currentTime, hasSpendPermission, isPassiveInvestmentEnabled, shouldLog]);

  // Throttle the manual verification to prevent excessive API calls
  const [lastVerificationTime, setLastVerificationTime] = useState(0);
  const VERIFICATION_THROTTLE = 30000; // 30 seconds

  // Add a manual verification trigger when settings change - throttled
  useEffect(() => {
    const checkStatus = async () => {
      const now = Date.now();
      if (hasSpendPermission && !settings.spendPermissionActive && (now - lastVerificationTime) > VERIFICATION_THROTTLE) {
        if (shouldLog) {
          console.log('🔍 Detected spend permission but inactive status - running manual verification...');
        }
        setLastVerificationTime(now);
        
        try {
          const isActive = await verifySpendPermissionOnChain();
          if (shouldLog) {
            console.log('🔍 Manual verification result:', isActive);
          }
        } catch (error) {
          if (shouldLog) {
            console.error('❌ Manual verification failed:', error);
          }
        }
      }
    };
    
    checkStatus();
  }, [settings.spendPermissionActive, hasSpendPermission, verifySpendPermissionOnChain, lastVerificationTime, shouldLog]);

  // Debug effect to track when isPassiveInvestmentEnabled changes - development only
  const [lastPassiveState, setLastPassiveState] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!shouldLog) return;
    
    if (lastPassiveState !== null && lastPassiveState !== isPassiveInvestmentEnabled) {
      console.log('🔄 PASSIVE INVESTMENT STATE CHANGED:', {
        from: lastPassiveState,
        to: isPassiveInvestmentEnabled,
        enabled: settings.enabled,
        spendPermissionActive: settings.spendPermissionActive,
        timestamp: new Date().toISOString()
      });
    }
    setLastPassiveState(isPassiveInvestmentEnabled);
  }, [isPassiveInvestmentEnabled, lastPassiveState, settings.enabled, settings.spendPermissionActive, shouldLog]);

  // Reset investment tracking when track changes
  useEffect(() => {
    if (currentTrack && currentTrack.id !== lastInvestmentRef.current) {
      if (shouldLog) {
        console.log('🎵 Track changed to:', {
          title: currentTrack.title,
          id: currentTrack.id,
          coinAddress: currentTrack.coinAddress
        });
      }
      lastInvestmentRef.current = currentTrack.id;
      hasInvestedInCurrentTrackRef.current = false;
      playStartTimeRef.current = Date.now();
      
      // Clear session investment tracking for this new track
      sessionInvestmentTracker.delete(currentTrack.id);
      // Also clear any in-flight tracking for this new track (shouldn't exist but safety first)
      inflightInvestmentTracker.delete(currentTrack.id);
    }
  }, [currentTrack, shouldLog]);

  // Reset when track restarts
  useEffect(() => {
    if (currentTime < 5) { // If we're at the beginning of the track
      hasInvestedInCurrentTrackRef.current = false;
    }
  }, [currentTime]);

  const executeInvestment = useCallback(async () => {
    if (!currentTrack) return;

    // IMMEDIATE PROTECTION: Check session investment tracker first
    if (sessionInvestmentTracker.get(currentTrack.id)) {
      if (shouldLog) {
        console.log('❌ Already successfully invested in this track during current session');
      }
      return;
    }

    // IMMEDIATE PROTECTION: Check if investment is already in-flight for this track
    if (inflightInvestmentTracker.get(currentTrack.id)) {
      if (shouldLog) {
        console.log('❌ Investment already in progress for this track - preventing duplicate');
      }
      return;
    }

    if (!shouldLog) {
      // Minimal logging in production
      if (!currentTrack?.coinAddress || !isPassiveInvestmentEnabled || hasInvestedInCurrentTrackRef.current) {
        return;
      }
    } else {
      console.log('🎯 INVESTMENT CHECK - Evaluating conditions...');
      
      if (!currentTrack) {
        console.log('❌ No current track');
        return;
      }
      
      if (!currentTrack.coinAddress) {
        console.log('❌ Track has no coin address:', currentTrack.title);
        return;
      }
      
      if (!settings.enabled) {
        console.log('❌ Passive investment not enabled in settings');
        return;
      }
      
      if (!settings.spendPermissionActive) {
        console.log('❌ Spend permission not active - user needs to approve spend limits first');
        return;
      }

      if (hasInvestedInCurrentTrackRef.current) {
        console.log('❌ Already invested in this track during current play session');
        return;
      }
    }

    const trackKey = `${currentTrack.id}-${Math.floor(playStartTimeRef.current / 1000)}`;
    const lastInvestmentTime = investmentTracker.get(trackKey);
    const now = Date.now();
    
    // Prevent investments within 30 seconds of the last one for the same track
    if (lastInvestmentTime && (now - lastInvestmentTime) < 30000) {
      if (shouldLog) {
        console.log('❌ Too soon since last investment (30s cooldown)');
      }
      return;
    }

    // IMMEDIATE LOCK: Mark investment as in-flight to prevent duplicates
    inflightInvestmentTracker.set(currentTrack.id, true);
    
    try {
      if (shouldLog) {
        console.log('🚀 EXECUTING PASSIVE INVESTMENT (LOCKED):', {
          track: currentTrack.title,
          coinAddress: currentTrack.coinAddress,
          amount: settings.amountPerListen,
          trackId: currentTrack.id
        });
      }
      
      const result = await executePassiveInvestment(currentTrack.coinAddress as Address);
      
      // Only mark as invested if the investment actually succeeded
      if (result) {
        hasInvestedInCurrentTrackRef.current = true;
        investmentTracker.set(trackKey, now);
        
        // Mark this track as successfully invested in for this session
        sessionInvestmentTracker.set(currentTrack.id, true);
        
        if (shouldLog) {
          console.log('✅ PASSIVE INVESTMENT COMPLETED for:', currentTrack.title);
          console.log('🔒 Track marked as invested for this session - no more purchases');
        }
      } else {
        if (shouldLog) {
          console.log('❌ PASSIVE INVESTMENT RETURNED NO RESULT for:', currentTrack.title);
          console.log('⚠️  This may indicate ETH was transferred but coin purchase failed');
          console.log('⚠️  Check spender wallet for stranded ETH');
        }
      }
      
    } catch (error) {
      if (shouldLog) {
        console.error('❌ PASSIVE INVESTMENT FAILED:', error);
        console.log('⚠️  This may indicate ETH was transferred but coin purchase failed');
        console.log('⚠️  Check spender wallet for stranded ETH');
      }
      // Don't mark as invested on error
    } finally {
      // ALWAYS clear the in-flight flag when done (success or failure)
      inflightInvestmentTracker.delete(currentTrack.id);
      
      if (shouldLog) {
        console.log('🔓 Investment lock released for:', currentTrack.title);
      }
    }
  }, [currentTrack, settings, executePassiveInvestment, isPassiveInvestmentEnabled, shouldLog]);

  // Optimize trigger evaluation by memoizing conditions
  const triggerConditions = useMemo(() => {
    if (!isPlaying || !currentTrack || !isPassiveInvestmentEnabled) {
      return { shouldTrigger: false, reason: 'preconditions not met' };
    }

    const listenDuration = Date.now() - playStartTimeRef.current;
    const thirtySeconds = 30 * 1000;
    
    const condition1Met = listenDuration >= thirtySeconds && currentTime >= 30;
    const condition2Met = currentTime >= 60;
    
    return {
      shouldTrigger: condition1Met || condition2Met,
      reason: condition1Met ? '30s+30s rule' : condition2Met ? '60s rule' : 'no conditions met',
      listenDurationSeconds: Math.floor(listenDuration / 1000),
      currentTimeSeconds: Math.floor(currentTime)
    };
  }, [isPlaying, currentTrack, isPassiveInvestmentEnabled, currentTime]);

  // Trigger investment based on listening conditions - optimized
  useEffect(() => {
    if (!triggerConditions.shouldTrigger) {
      return;
    }

    if (shouldLog) {
      console.log('🎵 Investment trigger evaluation:', triggerConditions);
      console.log('🎯 TRIGGERING INVESTMENT (' + triggerConditions.reason + ')');
    }
    
    executeInvestment();
  }, [triggerConditions, executeInvestment, shouldLog]);

  return {
    // Expose some stats for debugging/UI
    hasInvestedInCurrentTrack: hasInvestedInCurrentTrackRef.current,
    playStartTime: playStartTimeRef.current,
    isPassiveInvestmentEnabled
  };
} 