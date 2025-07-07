import { NextResponse } from 'next/server';
import { createPublicClient, http, Address, AbiEvent } from 'viem';
import { base } from 'viem/chains';

// Zora factory address on Base mainnet
const ZORA_FACTORY_ADDRESS = '0x777777751622c0d3258f214F9DF38E35BF45baF3' as Address;

// Platform referrer address we're filtering for
const PLATFORM_REFERRER = '0x32C8ACD3118766CBE5c3E45a44BCEDde953EF627' as Address;

// ABI for the CoinCreated event
const COIN_CREATED_EVENT = {
  name: 'CoinCreated',
  type: 'event' as const,
  inputs: [
    {
      indexed: true,
      name: 'platformReferrer',
      type: 'address'
    },
    {
      indexed: true,
      name: 'payoutRecipient',
      type: 'address'
    },
    {
      indexed: false,
      name: 'name',
      type: 'string'
    },
    {
      indexed: false,
      name: 'symbol',
      type: 'string'
    },
    {
      indexed: false,
      name: 'uri',
      type: 'string'
    }
  ],
  anonymous: false
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Create a public client
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });

    // Get logs for the artist's coins
    const logs = await publicClient.getLogs({
      address: ZORA_FACTORY_ADDRESS,
      event: COIN_CREATED_EVENT,
      args: {
        platformReferrer: PLATFORM_REFERRER,
        payoutRecipient: address as Address
      },
      fromBlock: BigInt(29713800), // Start from a known block
      toBlock: 'latest'
    });

    return NextResponse.json({ count: logs.length });
  } catch (error) {
    console.error('Error fetching artist coins:', error);
    return NextResponse.json({ error: 'Failed to fetch artist coins' }, { status: 500 });
  }
} 