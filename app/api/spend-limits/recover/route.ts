import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther, formatEther, Address } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Initialize clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

function getSpenderWalletClient() {
  if (!process.env.SPENDER_PRIVATE_KEY) {
    throw new Error('SPENDER_PRIVATE_KEY not found');
  }

  const account = privateKeyToAccount(process.env.SPENDER_PRIVATE_KEY as `0x${string}`);
  
  return createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress, amount } = await request.json();
    
    if (!userAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    console.log('🔄 ETH Recovery Request:', {
      userAddress,
      amount,
      spenderWallet: process.env.NEXT_PUBLIC_SPENDER_ADDRESS
    });

    const spenderWalletClient = getSpenderWalletClient();
    const recoveryAmount = parseEther(amount);
    
    // Check spender wallet balance
    const spenderBalance = await publicClient.getBalance({
      address: process.env.NEXT_PUBLIC_SPENDER_ADDRESS as Address
    });
    
    console.log('💰 Spender wallet balance:', formatEther(spenderBalance));
    
    if (spenderBalance < recoveryAmount) {
      console.log('❌ Insufficient balance in spender wallet for recovery');
      return NextResponse.json(
        { 
          error: 'Insufficient balance in spender wallet',
          spenderBalance: formatEther(spenderBalance),
          requestedAmount: amount
        },
        { status: 400 }
      );
    }

    // Send ETH back to user
    console.log('💸 Sending ETH back to user...');
    const recoveryTxHash = await spenderWalletClient.sendTransaction({
      to: userAddress as Address,
      value: recoveryAmount,
    });

    console.log('📋 Recovery transaction hash:', recoveryTxHash);

    // Wait for confirmation
    const recoveryReceipt = await publicClient.waitForTransactionReceipt({
      hash: recoveryTxHash,
    });

    console.log('✅ ETH recovery completed:', {
      userAddress,
      amount,
      transactionHash: recoveryTxHash,
      status: recoveryReceipt.status
    });

    return NextResponse.json({
      success: true,
      recovery: {
        userAddress,
        amount,
        transactionHash: recoveryTxHash,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('💥 Error recovering ETH:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to recover ETH',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 