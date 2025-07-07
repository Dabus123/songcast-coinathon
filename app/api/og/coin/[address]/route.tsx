import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = params.address;
  
  // This would typically fetch coin data from your API
  // For simplicity, we're using mock data
  const coinData = {
    name: "MASKED BASSLINE",
    symbol: "MASKBASS",
    artist: "SoundWave",
    address: address,
  };

  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
            position: 'relative',
          }}
        >
          {/* Background pattern */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 2px, transparent 2px, transparent 10px)',
              zIndex: 1,
            }}
          />
          
          {/* Red vertical border */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 10,
              height: '100%',
              background: '#ff3300',
              zIndex: 2,
            }}
          />
          
          {/* Content container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '90%',
              height: '90%',
              border: '4px solid white',
              zIndex: 3,
              background: 'black',
              position: 'relative',
            }}
          >
            {/* Label at top */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'white',
                color: 'black',
                padding: '10px 20px',
                fontWeight: 'bold',
                fontSize: 32,
              }}
            >
              {coinData.symbol}
            </div>
            
            {/* Title band */}
            <div 
              style={{
                background: '#2a2215',
                borderBottom: '2px solid white',
                borderTop: '2px solid white',
                padding: '12px 20px',
                position: 'absolute',
                top: '60%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: 32 }}>
                🎵 {coinData.name}
              </div>
            </div>
            
            {/* Bottom band for address */}
            <div 
              style={{
                background: 'black',
                borderBottom: '2px solid white',
                borderTop: '2px solid white',
                padding: '12px 20px',
                position: 'absolute',
                top: '72%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div 
                style={{ 
                  width: 24, 
                  height: 24, 
                  border: '1px solid white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 10,
                  color: 'white',
                }}
              >
                ⬦
              </div>
              <div style={{ color: 'white', fontFamily: 'monospace', fontSize: 20 }}>
                {address.substring(0, 26)}...
              </div>
            </div>
            
            {/* App banner at bottom */}
            <div 
              style={{
                position: 'absolute',
                bottom: 20,
                width: '100%',
                textAlign: 'center',
                padding: '0 20px',
              }}
            >
              <div 
                style={{
                  background: '#ff3300',
                  border: '2px solid white',
                  padding: '12px 20px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 24,
                  display: 'inline-block',
                }}
              >
                TRADE COIN ON SONGCAST
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, immutable, no-transform, max-age=300',
        },
      }
    );
  } catch (e) {
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
} 