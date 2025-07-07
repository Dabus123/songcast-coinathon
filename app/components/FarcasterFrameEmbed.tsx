import React from 'react';
import Head from 'next/head';
import { Address } from 'viem';

interface FarcasterFrameEmbedProps {
  coinAddress: Address;
  buttonText?: string;
  appName?: string;
}

/**
 * Component that adds the necessary meta tags for Farcaster frame embedding
 * This allows users to interact with the app directly from their Farcaster feed
 */
export default function FarcasterFrameEmbed({
  coinAddress,
  buttonText = "Trade Coin",
  appName = "SongCast"
}: FarcasterFrameEmbedProps) {
  
  // Generate the base URL for the application
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // Fallback for SSR
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://songcast.app';
  };
  
  const baseUrl = getBaseUrl();
  
  // Use a publicly accessible image for testing
  const imageUrl = "https://placekitten.com/1200/630";
  
  return (
    <Head>
      {/* Core Farcaster Frame meta tags */}
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content={imageUrl} />
      <meta property="fc:frame:button:1" content={buttonText} />
      <meta property="fc:frame:post_url" content={`${baseUrl}/api/farcaster/action?coinAddress=${coinAddress}`} />
      
      {/* OG metadata for platforms that don't support frames */}
      <meta property="og:image" content={imageUrl} />
      <meta property="og:title" content={`${appName} - Music Coin`} />
      <meta property="og:description" content={`Trade ${coinAddress} music coin on ${appName}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
} 