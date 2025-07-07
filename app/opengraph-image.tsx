import { ImageResponse } from 'next/og';
import localFont from 'next/font/local'

const helvetica = localFont({
  src: [
    {
      path: '../public/HelveticaNeue Bold.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-helvetica',
  display: 'swap',
})
// Route segment config
export const runtime = 'edge';
 
// Image metadata
export const alt = 'SongCast | Music Social Tokens';
export const size = {
  width: 1200,
  height: 630,
};
 
export const contentType = 'image/png';
 
// Image generation
export default async function Image() {
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
          background: 'radial-gradient(ellipse at top left, #0F0F23 0%, #1A0B2E 25%, #16213E 50%, #0F3460 75%, #533A7B 100%)',
          padding: 0,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Helvetica, Arial, sans-serif'
        }}
      >
        {/* Animated Background Elements */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, #FF6B35 0%, #F7931E 20%, #FFD23F 40%, #06FFA5 60%, #4ECDC4 80%, transparent 100%)',
            borderRadius: '50%',
            opacity: 0.15,
            filter: 'blur(40px)',
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            bottom: -300,
            right: -300,
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, #45B7D1 0%, #96CEB4 30%, #FFEAA7 60%, #FF6B35 90%, transparent 100%)',
            borderRadius: '50%',
            opacity: 0.12,
            filter: 'blur(50px)',
          }}
        />
        
        {/* Additional gradient overlays for movement effect */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            background: 'linear-gradient(45deg, rgba(255, 107, 53, 0.2) 0%, rgba(6, 255, 165, 0.2) 100%)',
            borderRadius: '50%',
            filter: 'blur(30px)',
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 500,
            height: 500,
            background: 'linear-gradient(135deg, rgba(247, 147, 30, 0.15) 0%, rgba(69, 183, 209, 0.15) 100%)',
            borderRadius: '50%',
            filter: 'blur(35px)',
          }}
        />
        
        {/* Floating Orbs with pulsing effect */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            right: 150,
            width: 120,
            height: 120,
            background: 'radial-gradient(circle, rgba(255, 107, 53, 0.9) 0%, rgba(255, 107, 53, 0.4) 50%, rgba(255, 107, 53, 0) 70%)',
            borderRadius: '50%',
            filter: 'blur(2px)',
          }}
        />
        
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 100,
            width: 80,
            height: 80,
            background: 'radial-gradient(circle, rgba(6, 255, 165, 0.8) 0%, rgba(6, 255, 165, 0.3) 50%, rgba(6, 255, 165, 0) 70%)',
            borderRadius: '50%',
            filter: 'blur(1px)',
          }}
        />
        
        {/* Additional floating elements */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 200,
            width: 60,
            height: 60,
            background: 'radial-gradient(circle, rgba(255, 210, 63, 0.7) 0%, rgba(255, 210, 63, 0) 70%)',
            borderRadius: '50%',
            filter: 'blur(1px)',
          }}
        />
        
        {/* Main Logo Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 25,
            position: 'relative',
            padding: '-30px',
            background: 'rgba(255, 255, 255, 0.76)',
            borderRadius: '70px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Glow effect behind logo */}
          <div
            style={{
              position: 'absolute',
              width: 260,
              height: 250,
              padding:0,
              background: 'radial-gradient(circle, rgba(53, 188, 255, 0.3) 0%, rgba(30, 247, 88, 0.43) 40%, transparent 70%)',
              borderRadius: '11px',
              filter: 'blur(5px)',
              zIndex: '0',
            }}
          />
          
          <img 
            src="https://songcast.xyz/icon copy.png" 
            alt="SongCast" 
            width={230} 
            height={230}
            style={{
              position: 'relative',
              zIndex: '1',
              filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5))',
            }}
          />
        </div>
        
        {/* Main Title */}
        <div
          style={{
            fontSize: 84,
            textAlign: 'center',
            fontFamily:'Helvetica',
            marginBottom: 20,
            background: 'linear-gradient(135deg,rgb(190, 255, 180) 0%, #FF6B35 25%, #F7931E 50%, #FFD23F 75%, #06FFA5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-6px',
            textShadow: '0 0 60px rgba(255, 107, 53, 0.5)',
            position: 'relative',
            padding: '3px 20px',
            paddingBottom:'11px',
            borderRadius:'19px',
            color:'black',
          }}
        >
          songcast
        </div>
        
        {/* Subtitle with glassmorphism */}
        <div
          style={{
            fontSize: 19,
            fontWeight: 600,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: 700,
            lineHeight: 1.3,
            marginBottom: 50,
            padding: '24px 48px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '19px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            letterSpacing: '4px',
          }}
        >
          magic • music • money
        </div>
        
        {/* Decorative Elements */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 50,
            display: 'flex',
            gap: 15,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              background: '#FF6B35',
              borderRadius: '50%',
              opacity: 0.9,
              boxShadow: '0 0 10px rgba(255, 107, 53, 0.8)',
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              background: '#06FFA5',
              borderRadius: '50%',
              opacity: 0.9,
              boxShadow: '0 0 10px rgba(6, 255, 165, 0.8)',
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              background: '#FFD23F',
              borderRadius: '50%',
              opacity: 0.9,
              boxShadow: '0 0 10px rgba(255, 210, 63, 0.8)',
            }}
          />
        </div>
        
        {/* Footer URL */}
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 34,
            fontSize: 24,
            fontStyle:'italic',
            color: 'rgb(255, 255, 255)',
            padding: '16px 32px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '19px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            letterSpacing: '-1px',
          }}
        >
          songcast.xyz
        </div>
        
        {/* Musical Note Icons */}
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 80,
            fontSize: 40,
            opacity: 0.3,
          }}
        >
          ♪
        </div>
        
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            right: 100,
            fontSize: 35,
            opacity: 0.25,
          }}
        >
          ♫
        </div>
        
        <div
          style={{
            position: 'absolute',
            top: 300,
            right: 200,
            fontSize: 30,
            opacity: 0.2,
          }}
        >
          ♬
        </div>
        

      </div>
    ),
    {
      ...size,
    },
  );
}