'use client';

import React, { useMemo, useState } from 'react';
import { usePassiveInvestmentAudio } from '../hooks/usePassiveInvestmentAudio';
import { useSpendLimits } from '../hooks/useSpendLimits';
import { useAudio } from '../context/AudioContext';

/**
 * This component should be included in the main layout to enable passive investment tracking.
 * It doesn't render anything visible but handles the background logic for automatic investments.
 */
export default function PassiveInvestmentTracker() {
  // This hook automatically tracks audio playback and triggers investments
  const { 
    hasInvestedInCurrentTrack, 
    isPassiveInvestmentEnabled 
  } = usePassiveInvestmentAudio();
  
  const { settings, hasSpendPermission } = useSpendLimits();
  const { currentTrack } = useAudio();
  
  // Track if we've shown the spend permission error
  const [hasShownSpendPermissionError, setHasShownSpendPermissionError] = useState(false);

  // Add debugging to show the passive investment status
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 PassiveInvestmentTracker Status:', {
        enabled: settings.enabled,
        spendPermissionActive: settings.spendPermissionActive,
        hasSpendPermission,
        isPassiveInvestmentEnabled,
        currentTrack: currentTrack?.title,
        hasInvestedInCurrentTrack
      });
    }
  }, [settings.enabled, settings.spendPermissionActive, hasSpendPermission, isPassiveInvestmentEnabled, currentTrack, hasInvestedInCurrentTrack]);

  // Show user notification when spend permission becomes invalid
  React.useEffect(() => {
    if (settings.enabled && !settings.spendPermissionActive && !hasShownSpendPermissionError) {
      setHasShownSpendPermissionError(true);
      
      // Show a user-friendly notification (you can customize this)
      if (process.env.NODE_ENV === 'development') {
        console.log('🚨 USER NOTIFICATION: Passive investment is enabled but spend permission is inactive. Please recreate your spend permission in the Auto Invest settings.');
      }
      
      // In production, you might want to show a toast notification here
      // For example: toast.warning('Your auto-invest permission needs to be renewed. Please visit Auto Invest settings.');
    }
    
    // Reset the flag when spend permission becomes active again
    if (settings.spendPermissionActive && hasShownSpendPermissionError) {
      setHasShownSpendPermissionError(false);
    }
  }, [settings.enabled, settings.spendPermissionActive, hasShownSpendPermissionError]);

  // Memoize the debug logging to prevent excessive re-renders
  const debugInfo = useMemo(() => {
    if (process.env.NODE_ENV === 'development' && isPassiveInvestmentEnabled && currentTrack && hasInvestedInCurrentTrack) {
      return `✅ Passive investment executed for: ${currentTrack.title}`;
    }
    return null;
  }, [isPassiveInvestmentEnabled, currentTrack, hasInvestedInCurrentTrack]);

  // Log investment activity for debugging (only in development)
  React.useEffect(() => {
    if (debugInfo) {
      console.log(debugInfo);
    }
  }, [debugInfo]);

  // This component doesn't render anything visible
  return null;
} 