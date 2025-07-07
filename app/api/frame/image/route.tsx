import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Font data for styling - use fetch directly without URL constructor
const interBold = fetch(
  'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap'
).then(res => res.arrayBuffer());

// Available frame images
const FRAME_IMAGES = {
  welcome: {
    title: 'Welcome to SongCast',
    subtitle: 'Create, trade, and collect social tokens for music artists',
    emoji: '🎵',
  },
  'explore-coins': {
    title: 'Explore Music Coins',
    subtitle: 'Find and invest in your favorite artists',
    emoji: '🪙',
  },
  signin: {
    title: 'Sign in to SongCast',
    subtitle: 'Connect your Farcaster account to get started',
    emoji: '🔐',
  },
  'learn-more': {
    title: 'About SongCast',
    subtitle: 'A music platform powered by social tokens on Base',
    emoji: 'ℹ️',
  },
};

// Export config for Edge runtime
export const runtime = 'edge';

// Image route handler
export async function GET(request: NextRequest) {
  // Get the action from query params
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'welcome';
  
  // Select frame content
  const frameContent = FRAME_IMAGES[action as keyof typeof FRAME_IMAGES] || FRAME_IMAGES.welcome;
  
  // Load the font
  const fontData = await interBold;
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #0c0116 0%, #160629 100%)',
          padding: 50,
          color: 'white',
          fontFamily: '"Inter", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Elements */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(0,0,0,0) 70%)',
            top: -100,
            left: -100,
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, rgba(0,0,0,0) 70%)',
            bottom: -100,
            right: -100,
            filter: 'blur(70px)',
          }}
        />
        
        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            fontSize: 72,
          }}
        >
          {frameContent.emoji}
        </div>
        
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 20,
            background: 'linear-gradient(90deg, #9D50BB 0%, #6E48AA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            padding: '0 20px',
          }}
        >
          {frameContent.title}
        </div>
        
        <div
          style={{
            fontSize: 24,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: 500,
            lineHeight: 1.4,
          }}
        >
          {frameContent.subtitle}
        </div>
        
        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            display: 'flex',
            alignItems: 'center',
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          SongCast • Music Social Tokens
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  );
} 