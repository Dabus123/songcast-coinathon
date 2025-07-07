import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { spendPermissionManagerAddress, spendPermissionManagerAbi } from '../../../lib/abi/SpendPermissionManager';

// Create clients with improved RPC configuration
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org', {
    batch: true,
    retryCount: 3,
    retryDelay: 1000, // 1 second delay between retries
  }),
});

function getSpenderWalletClient() {
  const privateKey = process.env.SPENDER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ SPENDER_PRIVATE_KEY environment variable is not set');
    throw new Error('SPENDER_PRIVATE_KEY environment variable is not set');
  }

  console.log('🔑 Creating spender wallet client with address:', process.env.NEXT_PUBLIC_SPENDER_ADDRESS);
  console.log('🔍 Private key format check:', {
    length: privateKey.length,
    startsWithOx: privateKey.startsWith('0x'),
    isHex: /^0x[0-9a-fA-F]+$/.test(privateKey)
  });

  // Ensure private key has proper format
  let formattedPrivateKey = privateKey;
  if (!privateKey.startsWith('0x')) {
    formattedPrivateKey = `0x${privateKey}`;
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
    throw new Error('Invalid private key format. Must be 0x followed by 64 hex characters');
  }

  const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
  
  return createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000, // 1 second delay between retries
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting spend permission approval...');
    
    const { spendPermission, signature } = await request.json();

    console.log('📝 Received approval request:', {
      hasSpendPermission: !!spendPermission,
      hasSignature: !!signature,
      spendPermissionKeys: spendPermission ? Object.keys(spendPermission) : [],
      signatureLength: signature ? signature.length : 0
    });

    if (!spendPermission || !signature) {
      console.log('❌ Missing required parameters');
      return NextResponse.json(
        { error: 'Missing spendPermission or signature' },
        { status: 400 }
      );
    }

    // Convert string values back to BigInt for contract interaction
    const spendPermissionForContract = {
      ...spendPermission,
      allowance: BigInt(spendPermission.allowance),
      salt: BigInt(spendPermission.salt)
    };

    console.log('📋 Spend permission for contract:', {
      account: spendPermissionForContract.account,
      spender: spendPermissionForContract.spender,
      token: spendPermissionForContract.token,
      allowance: spendPermissionForContract.allowance.toString(),
      period: spendPermissionForContract.period,
      start: spendPermissionForContract.start,
      end: spendPermissionForContract.end,
      salt: spendPermissionForContract.salt.toString()
    });

    console.log('🏗️ Contract details:', {
      contractAddress: spendPermissionManagerAddress,
      chainId: base.id,
      hasAbi: !!spendPermissionManagerAbi
    });

    const spenderWalletClient = getSpenderWalletClient();
    console.log('✅ Spender wallet client created');

    // Call approveWithSignature on the SpendPermissionManager contract
    console.log('📤 Calling approveWithSignature on contract...');
    const approvalTxHash = await spenderWalletClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'approveWithSignature',
      args: [spendPermissionForContract, signature],
    });

    console.log('📋 Approval transaction hash:', approvalTxHash);

    // Wait for transaction confirmation
    console.log('⏳ Waiting for transaction confirmation...');
    const approvalReceipt = await publicClient.waitForTransactionReceipt({
      hash: approvalTxHash,
    });

    console.log('📄 Transaction receipt:', {
      status: approvalReceipt.status,
      blockNumber: approvalReceipt.blockNumber,
      gasUsed: approvalReceipt.gasUsed.toString(),
      transactionHash: approvalReceipt.transactionHash
    });

    if (approvalReceipt.status === 'success') {
      console.log('✅ Spend permission approved successfully!');
      console.log('🔗 View on BaseScan:', `https://basescan.org/tx/${approvalTxHash}`);
      
      return NextResponse.json({
        success: true,
        transactionHash: approvalTxHash,
        message: 'Spend permission approved successfully',
        baseScanUrl: `https://basescan.org/tx/${approvalTxHash}`
      });
    } else {
      console.log('❌ Transaction failed with status:', approvalReceipt.status);
      return NextResponse.json(
        { error: 'Transaction failed', status: approvalReceipt.status },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('💥 Error approving spend limit:', error);
    
    // More detailed error analysis
    let errorMessage = 'Failed to approve spend limit';
    let errorDetails = error.message;
    
    if (error.message.includes('SPENDER_PRIVATE_KEY')) {
      errorMessage = 'Backend wallet not configured - missing SPENDER_PRIVATE_KEY';
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = 'Backend wallet has insufficient ETH for gas fees';
    } else if (error.message.includes('nonce')) {
      errorMessage = 'Transaction nonce error - try again';
    } else if (error.message.includes('revert')) {
      errorMessage = 'Contract call reverted - check spend permission parameters';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network connection error';
    }
    
    console.log('🔍 Error analysis:', {
      originalError: error.message,
      categorizedError: errorMessage,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 