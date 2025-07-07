import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    // Get Pinata API keys from environment variables
    const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
    
    // Mask keys for security in logs
    const apiKeyMasked = PINATA_API_KEY ? `${PINATA_API_KEY.substring(0, 4)}...${PINATA_API_KEY.substring(PINATA_API_KEY.length - 4)}` : 'undefined';
    const secretKeyMasked = PINATA_SECRET_KEY ? `${PINATA_SECRET_KEY.substring(0, 4)}...${PINATA_SECRET_KEY.substring(PINATA_SECRET_KEY.length - 4)}` : 'undefined';
    
    // Check if keys are defined
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        message: 'API keys are not properly configured',
        apiKeyPresent: !!PINATA_API_KEY,
        secretKeyPresent: !!PINATA_SECRET_KEY,
        apiKeyMasked,
        secretKeyMasked
      }, { status: 500 });
    }
    
    // Test Pinata connection
    try {
      // Using a lightweight endpoint to check authentication
      const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Pinata connection successful',
        pinataResponse: response.data,
        apiKeyMasked,
        secretKeyMasked
      });
    } catch (pinataError: any) {
      return NextResponse.json({
        success: false,
        message: 'Pinata authentication failed',
        error: pinataError.message,
        apiKeyMasked,
        secretKeyMasked,
        status: pinataError.response?.status,
        data: pinataError.response?.data
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error testing Pinata connection:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Server error while testing Pinata connection',
      error: error.message
    }, { status: 500 });
  }
} 