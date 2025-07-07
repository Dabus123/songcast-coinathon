/**
 * Generates standard metadata for a music track to be stored on IPFS
 * and referenced by the NFT contract
 */
export function generateTrackMetadata(data: {
  title: string;
  artist: string;
  description: string;
  price: string;
  genre: string;
  duration: string;
  audioCID: string;
  imageCID: string;
  seller: string;
  featured: boolean;
  gateway: string;
}) {
  const {
    title,
    artist,
    description,
    price,
    genre,
    duration,
    audioCID,
    imageCID,
    seller,
    featured,
    gateway
  } = data;

  // Format the audio URL and image URL (follow Zora's spec)
  const audioUrl = `ipfs://${audioCID}`;
  const imageUrl = `ipfs://${imageCID}`;
  
  // Create the metadata object following Zora's schema requirements
  return {
    name: title,
    description: description || `Track by ${artist}`,
    external_url: `https://songcast.vercel.app/coins/${title}`,
    image: imageUrl,
    animation_url: audioUrl,
    artist: artist,
    attributes: [
      {
        trait_type: "Artist",
        value: artist
      },
      {
        trait_type: "Genre",
        value: genre
      },
      {
        trait_type: "Duration",
        value: duration
      },
      {
        trait_type: "Featured",
        value: featured ? "Yes" : "No"
      }
    ],
    properties: {
      artist,
      genre,
      duration,
      created_at: new Date().toISOString()
    }
  };
} 