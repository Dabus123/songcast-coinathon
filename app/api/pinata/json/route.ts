import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Use the new configuration format for Next.js App Router
export const maxDuration = 60; // Extend the timeout to 60 seconds

export async function POST(request: NextRequest) {
  try {
    // Get the JSON data from the request
    const jsonData = await request.json();
    
    if (!jsonData) {
      return NextResponse.json(
        { error: 'No JSON data provided' },
        { status: 400 }
      );
    }
    
    // Get Pinata API keys from environment variables - try both private and public variables
    // Server should use PINATA_API_KEY but falls back to NEXT_PUBLIC_PINATA_API_KEY
    const API_KEY = process.env.PINATA_API_KEY || process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const SECRET_KEY = process.env.PINATA_SECRET_KEY || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
    
    // Debug info - mask keys for security
    const apiKeyMasked = API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 'undefined';
    const secretKeyMasked = SECRET_KEY ? `${SECRET_KEY.substring(0, 4)}...${SECRET_KEY.substring(SECRET_KEY.length - 4)}` : 'undefined';
    
    console.log(`Server API Key for JSON: ${apiKeyMasked}`);
    console.log(`Server Secret Key for JSON: ${secretKeyMasked}`);
    
    if (!API_KEY || !SECRET_KEY) {
      return NextResponse.json(
        { 
          error: 'Pinata API keys not configured on the server',
          apiKeyPresent: !!API_KEY,
          secretKeyPresent: !!SECRET_KEY
        },
        { status: 500 }
      );
    }
    
    // Set pinning options
    const pinataOptions = {
      pinataMetadata: {
        name: jsonData.name ? `SongCast - ${jsonData.name} Metadata` : 'SongCast Metadata',
      },
      pinataOptions: {
        cidVersion: 0,
        wrapWithDirectory: false
      }
    };
    
    // Send the request to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': API_KEY,
          'pinata_secret_api_key': SECRET_KEY
        },
        maxBodyLength: Infinity,
      }
    );
    
    // Return the IPFS hash
    return NextResponse.json({
      IpfsHash: response.data.IpfsHash,
      uri: `ipfs://${response.data.IpfsHash}`
    });
    
  } catch (error: any) {
    console.error('Error uploading JSON to Pinata:', error);
    
    // If authentication error, provide more detailed message
    if (error.response?.status === 401) {
      return NextResponse.json(
        { 
          error: 'Authentication failed with Pinata. Please check your API keys in the server environment variables.',
          details: error.message,
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to upload metadata to IPFS',
        details: error.message,
        response: error.response?.data
      },
      { status: error.response?.status || 500 }
    );
  }
} 