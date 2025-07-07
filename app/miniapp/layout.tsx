import type { Metadata } from "next";

// Get the base URL from environment or fallback to the vercel deployment URL
const BASE_URL = "https://songcast.vercel.app";

// Define all the necessary metadata for the Farcaster Mini App
export const metadata: Metadata = {
  title: "SongCast | Music Social Tokens",
  description: "Create, trade, and collect social tokens for music artists",
  openGraph: {
    title: "SongCast | Music Social Tokens",
    description: "Create, trade, and collect social tokens for music artists",
    images: [
      {
        url: `${BASE_URL}/image.png`,
        width: 1200,
        height: 630,
        alt: "SongCast Social Music Tokens",
      },
    ],
  },
  // Farcaster frame metadata
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${BASE_URL}/image.png`,
      button: {
        title: "Explore Music Coins",
        action: {
          type: "launch_frame",
          name: "SongCast",
          url: `${BASE_URL}/miniapp`,
          splashImageUrl: `${BASE_URL}/logo.png`,
          splashBackgroundColor: "#0c0116"
        }
      }
    }),
    "fc:frame:image": `${BASE_URL}/image.png`,
    "fc:frame:post_url": `${BASE_URL}/api/frame`,
    "fc:frame:button:1": "🎵 Start",
  },
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 