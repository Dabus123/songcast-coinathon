import type { Metadata } from "next";

interface CoinLayoutProps {
  children: React.ReactNode;
  params: {
    address: string;
  };
}

// Get the base URL from environment or fallback to the vercel deployment URL
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://songcast.vercel.app";

export async function generateMetadata({ params }: CoinLayoutProps): Promise<Metadata> {
  const address = params.address;

  // Define Farcaster frame content for this specific coin
  const frameContent = JSON.stringify({
    version: "next",
    imageUrl: `${BASE_URL}/coins/${address}/opengraph-image`,
    button: {
      title: "🎵 Listen & Trade",
      action: {
        type: "launch_frame",
        name: "SongCast",
        url: `${BASE_URL}/coins/${address}`,
        splashImageUrl: `${BASE_URL}/logo.png`,
        splashBackgroundColor: "#0c0116"
      }
    }
  });

  return {
    title: "Music Coin - SongCast",
    description: "View and trade music social tokens on SongCast",
    openGraph: {
      title: "Music Coin - SongCast",
      description: "View and trade music social tokens on SongCast",
      images: [
        {
          url: `${BASE_URL}/coins/${address}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Music Coin Details",
        },
      ],
    },
    // Farcaster frame metadata
    other: {
      "fc:frame": frameContent,
      "fc:frame:image": `${BASE_URL}/coins/${address}/opengraph-image`,
      "fc:frame:post_url": `${BASE_URL}/api/frame`,
      "fc:frame:button:1": "🎵 Listen & Trade",
    },
  };
}

export default function CoinLayout({ children }: CoinLayoutProps) {
  return <>{children}</>;
} 