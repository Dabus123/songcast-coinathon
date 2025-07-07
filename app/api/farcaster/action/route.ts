import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Get the coin address from the query parameters
    const url = new URL(request.url);
    const coinAddress = url.searchParams.get('coinAddress');
    
    // Extract user data from the Farcaster frame signature packet
    const { untrustedData, trustedData } = body;
    
    console.log('Frame action received:', { 
      coinAddress,
      buttonIndex: untrustedData?.buttonIndex,
      fid: untrustedData?.fid
    });
    
    // Return the next frame to display
    return NextResponse.json({
      version: 'vNext',
      image: `${url.origin}/api/og/coin/${coinAddress}`,
      buttons: [
        {
          label: 'View Coin Details',
          action: 'link',
          target: `${url.origin}/coins/${coinAddress}`
        }
      ]
    });
  } catch (error) {
    console.error('Error processing frame action:', error);
    return NextResponse.json(
      { error: 'Failed to process frame action' },
      { status: 500 }
    );
  }
} 