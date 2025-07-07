import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { fetchTrackMetadata } from '../../services/pinataService';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Music Coin Details';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Create a viem public client for the Base network
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

// Helper to check if a URL is valid (for displaying cover art)
function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to fetch coin metadata from IPFS URI
async function getCoinMetadata(coinAddress: string) {
  try {
    // Fallback coin data if nothing is available
    const defaultCoin = {
      name: 'Music Coin',
      symbol: 'MUSIC',
      artistName: 'Unknown Artist',
      description: 'A social token for music artists',
      coverArt: null,
    };

    // For production we would fetch on-chain data
    // This is simplified for this example - would normally query our API
    return defaultCoin;
  } catch (error) {
    console.error('Error fetching coin metadata:', error);
    return null;
  }
}

// Dynamic OG image generator
export default async function Image({ params }: { params: { address: string } }) {
  const address = params.address;
  let coinData = await getCoinMetadata(address);
  
  if (!coinData) {
    coinData = {
      name: 'Music Coin',
      symbol: 'MUSIC',
      artistName: 'Unknown Artist',
      description: 'A social token for music artists',
      coverArt: null
    };
  }

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
          padding: '40px 60px',
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
            width: '100%',
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '50px',
          }}
        >
          {/* Left side - Coin Image */}
          <div
            style={{
              width: '40%',
              height: '70%',
              background: coinData.coverArt && isValidUrl(coinData.coverArt) 
                ? `url(${coinData.coverArt})` 
                : 'linear-gradient(135deg, #8a3bff 0%, #4b00e0 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '20px',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Symbol badge */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: 20,
                fontWeight: 'bold',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {coinData.symbol}
            </div>
          </div>
          
          {/* Right side - Coin Details */}
          <div
            style={{
              width: '60%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '24px',
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #9D50BB 0%, #6E48AA 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {coinData.name}
            </div>
            
            <div
              style={{
                fontSize: 28,
                color: 'rgba(255,255,255,0.8)',
                marginBottom: 16,
              }}
            >
              {coinData.artistName}
            </div>
            
            <div
              style={{
                fontSize: 24,
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.4,
                maxHeight: '4.2em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {coinData.description}
            </div>
            
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(90deg, #9D50BB 0%, #6E48AA 100%)',
                  padding: '12px 32px',
                  borderRadius: '12px',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                Listen & Trade
              </div>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '12px 32px',
                  borderRadius: '12px',
                  fontSize: 24,
                }}
              >
                Social Token
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 60,
            display: 'flex',
            alignItems: 'center',
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          songcast.vercel.app/coins/{address}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
} 