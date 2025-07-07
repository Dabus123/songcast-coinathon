import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { spendPermissionManagerAddress, spendPermissionManagerAbi } from '../../../lib/abi/SpendPermissionManager';

// Create clients
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

function getSpenderWalletClient() {
  const privateKey = process.env.SPENDER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SPENDER_PRIVATE_KEY environment variable is not set');
  }

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

  const account = privateKeyToAccount(formattedPrivateKey as Address);
  
  return createWalletClient({
    account,
    chain: base,
    transport: http()
  });
}

export async function POST(request: NextRequest) {
  try {
    const { spendPermission, userAddress } = await request.json();

    if (!spendPermission || !userAddress) {
      return NextResponse.json(
        { error: 'Missing spendPermission or userAddress' },
        { status: 400 }
      );
    }

    // Convert string values back to BigInt for contract interaction
    const spendPermissionForContract = spendPermission ? {
      ...spendPermission,
      allowance: BigInt(spendPermission.allowance),
      salt: BigInt(spendPermission.salt)
    } : null;

    if (!spendPermissionForContract) {
      return NextResponse.json(
        { error: 'Invalid spend permission' },
        { status: 400 }
      );
    }

    const spenderWalletClient = getSpenderWalletClient();

    // Call revoke on the SpendPermissionManager contract
    const revokeTxHash = await spenderWalletClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'revoke',
      args: [spendPermissionForContract],
    });

    // Wait for transaction confirmation
    const revokeReceipt = await publicClient.waitForTransactionReceipt({
      hash: revokeTxHash,
    });

    if (revokeReceipt.status === 'success') {
      console.log('Spend permission revoked:', {
        userAddress,
        transactionHash: revokeTxHash,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        transactionHash: revokeTxHash,
        message: 'Spend permission revoked successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Revoke transaction failed' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error revoking spend permission:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to revoke spend permission',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 