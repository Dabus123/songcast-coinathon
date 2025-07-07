import { NextRequest, NextResponse } from 'next/server';

// API route to verify Farcaster sign-in messages
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await req.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Missing message or signature' },
        { status: 400 }
      );
    }

    // In a real implementation, you would verify the signature here
    // For now, we'll just extract the FID from the message
    // This is NOT secure and should be replaced with actual verification
    
    // Parse the message to extract user information
    try {
      // This is just for demo purposes - in production, use proper verification
      const messageObj = JSON.parse(message);
      
      // Extract FID if available
      const fid = messageObj.fid || 9999; // Default test FID
      
      return NextResponse.json({
        success: true,
        user: {
          fid,
          username: `user_${fid}`, // In real app, get this from verified data
        },
        // You would include a proper JWT or session token here
        token: `demo-token-${fid}-${Date.now()}`,
      });
    } catch (parseError) {
      console.error('Error parsing message:', parseError);
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing sign-in request:', error);
    return NextResponse.json(
      { error: 'Failed to process sign-in request' },
      { status: 500 }
    );
  }
} 