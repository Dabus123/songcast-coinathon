import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export async function GET() {
  try {
    console.log('🧪 Testing passive investment setup...');
    
    // Check environment variables
    const spenderPrivateKey = process.env.SPENDER_PRIVATE_KEY;
    const spenderAddress = process.env.NEXT_PUBLIC_SPENDER_ADDRESS;
    
    console.log('🔑 Environment check:', {
      hasSpenderPrivateKey: !!spenderPrivateKey,
      spenderAddress,
      spenderPrivateKeyLength: spenderPrivateKey?.length
    });
    
    if (!spenderPrivateKey) {
      return NextResponse.json({
        error: 'SPENDER_PRIVATE_KEY not set',
        setup: false
      });
    }
    
    if (!spenderAddress) {
      return NextResponse.json({
        error: 'NEXT_PUBLIC_SPENDER_ADDRESS not set',
        setup: false
      });
    }
    
    // Test wallet client creation
    try {
      console.log('🔍 Private key format check:', {
        length: spenderPrivateKey.length,
        startsWithOx: spenderPrivateKey.startsWith('0x'),
        isHex: /^0x[0-9a-fA-F]+$/.test(spenderPrivateKey)
      });

      // Ensure private key has proper format
      let formattedPrivateKey = spenderPrivateKey;
      if (!spenderPrivateKey.startsWith('0x')) {
        formattedPrivateKey = `0x${spenderPrivateKey}`;
        console.log('🔧 Added 0x prefix to private key');
      }

      // Validate private key format
      if (!/^0x[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
        console.error('❌ Invalid private key format. Expected: 0x + 64 hex characters');
        console.error('   Current format:', {
          length: formattedPrivateKey.length,
          expected: 66, // 0x + 64 chars
          startsWithOx: formattedPrivateKey.startsWith('0x'),
          isValidHex: /^0x[0-9a-fA-F]+$/.test(formattedPrivateKey)
        });
        
        return NextResponse.json({
          error: 'Invalid private key format',
          details: 'Private key must be 0x followed by 64 hex characters (32 bytes)',
          currentFormat: {
            length: formattedPrivateKey.length,
            expected: 66,
            startsWithOx: formattedPrivateKey.startsWith('0x'),
            isValidHex: /^0x[0-9a-fA-F]+$/.test(formattedPrivateKey)
          },
          setup: false
        });
      }

      const account = privateKeyToAccount(formattedPrivateKey as Address);
      console.log('👛 Wallet account created:', account.address);
      
      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http()
      });
      
      console.log('✅ Wallet client created successfully');
      
      // Test public client
      const publicClient = createPublicClient({
        chain: base,
        transport: http()
      });
      
      // Get balance of spender wallet
      const balance = await publicClient.getBalance({
        address: account.address
      });
      
      console.log('💰 Spender wallet balance:', balance.toString());
      
      return NextResponse.json({
        setup: true,
        spenderAddress: account.address,
        spenderBalance: balance.toString(),
        chainId: base.id,
        message: 'Setup looks good!'
      });
      
    } catch (walletError: any) {
      console.error('❌ Wallet setup error:', walletError);
      return NextResponse.json({
        error: 'Failed to create wallet client',
        details: walletError.message,
        setup: false
      });
    }
    
  } catch (error: any) {
    console.error('💥 Test endpoint error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message,
      setup: false
    });
  }
} 