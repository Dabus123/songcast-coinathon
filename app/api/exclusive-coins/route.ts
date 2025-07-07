import { NextResponse } from 'next/server';
import { createPublicClient, http, Address, AbiEvent, decodeEventLog } from 'viem';
import { base } from 'viem/chains';

// Platform referrer for exclusive tracks
const EXCLUSIVE_PLATFORM_REFERRER = '0x41f35485Dea9e5e7C683d1C6CA650e8179c606ba' as Address;

// ABI for CoinCreated event
const COIN_CREATED_EVENT = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'artist', type: 'address' },
    { indexed: true, name: 'coin', type: 'address' },
    { indexed: false, name: 'name', type: 'string' },
    { indexed: false, name: 'symbol', type: 'string' },
    { indexed: false, name: 'platformReferrer', type: 'address' }
  ],
  name: 'CoinCreated',
  type: 'event' as const
} as const;

// Create a public client
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');

  if (!artist) {
    return NextResponse.json({ error: 'Artist address is required' }, { status: 400 });
  }

  try {
    // Get all CoinCreated events for the artist with the exclusive platform referrer
    const logs = await publicClient.getLogs({
      event: COIN_CREATED_EVENT,
      args: {
        artist: artist as Address
      },
      fromBlock: 0n
    });

    // Transform logs into coin data
    const coins = await Promise.all(
      logs.map(async (log) => {
        const decodedLog = decodeEventLog({
          abi: [COIN_CREATED_EVENT],
          data: log.data,
          topics: log.topics
        });

        // Only include coins with the exclusive platform referrer
        if (decodedLog.args.platformReferrer.toLowerCase() !== EXCLUSIVE_PLATFORM_REFERRER.toLowerCase()) {
          return null;
        }

        return {
          coinAddress: decodedLog.args.coin,
          name: decodedLog.args.name,
          symbol: decodedLog.args.symbol,
          artistAddress: decodedLog.args.artist,
          platformReferrer: decodedLog.args.platformReferrer,
          // You would need to fetch additional metadata from IPFS or your backend
          coverArt: '', // Add cover art URL
          audioUrl: '', // Add audio URL
          description: '' // Add description
        };
      })
    );

    // Filter out null values
    const filteredCoins = coins.filter((coin): coin is NonNullable<typeof coin> => coin !== null);

    return NextResponse.json({ coins: filteredCoins });
  } catch (error) {
    console.error('Error fetching exclusive coins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exclusive coins' },
      { status: 500 }
    );
  }
} 