import { NextRequest, NextResponse } from 'next/server';

// Define response types for clarity
type FrameResponse = {
  image: string;
  buttons: {
    label: string;
    action?: string;
  }[];
  postUrl?: string;
};

const BASE_URL = "https://songcast.vercel.app";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse the incoming request body
    const body = await req.json();
    console.log('Frame request:', JSON.stringify(body));

    // Extract data from Farcaster request
    const { untrustedData } = body;
    const { buttonIndex } = untrustedData;

    // Define the frame response based on the button clicked
    let frameResponse: FrameResponse;

    // Handle different button actions
    switch (buttonIndex) {
      case 1:
        // Default action or initial entry
        frameResponse = {
          image: `${BASE_URL}/api/frame/image?action=welcome`,
          buttons: [
            { label: "Explore Coins" },
            { label: "Sign In" },
            { label: "Learn More" }
          ],
          postUrl: `${BASE_URL}/api/frame`
        };
        break;
      case 2:
        // Explore Coins
        frameResponse = {
          image: `${BASE_URL}/api/frame/image?action=explore-coins`,
          buttons: [
            { label: "Sign In" },
            { label: "Trade Tokens" },
            { label: "Back" }
          ],
          postUrl: `${BASE_URL}/api/frame`
        };
        break;
      case 3:
        // Sign In
        frameResponse = {
          image: `${BASE_URL}/api/frame/image?action=signin`,
          buttons: [
            { 
              label: "Continue in App",
              action: "link" // Direct users to the full app
            }
          ],
          postUrl: `${BASE_URL}/api/frame`
        };
        break;
      case 4:
        // Learn More / Back
        frameResponse = {
          image: `${BASE_URL}/api/frame/image?action=learn-more`,
          buttons: [
            { label: "Back to Home" }
          ],
          postUrl: `${BASE_URL}/api/frame`
        };
        break;
      default:
        // Default fallback
        frameResponse = {
          image: `${BASE_URL}/api/frame/image?action=welcome`,
          buttons: [
            { label: "Explore Coins" },
            { label: "Sign In" },
            { label: "Learn More" }
          ],
          postUrl: `${BASE_URL}/api/frame`
        };
    }

    // Construct the Frame response according to Farcaster spec
    const response = {
      version: "next",
      frame: {
        image: frameResponse.image,
        buttons: frameResponse.buttons.map(button => ({
          label: button.label,
          ...(button.action === "link" ? { action: "post_redirect" } : {})
        })),
        ...(frameResponse.postUrl ? { postUrl: frameResponse.postUrl } : {})
      },
      ...(buttonIndex === 3 ? {
        // For sign in, redirect users to the app
        redirect: `${BASE_URL}/miniapp`
      } : {})
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Frame API error:', error);
    return NextResponse.json(
      { error: "Failed to process frame request" },
      { status: 500 }
    );
  }
} 