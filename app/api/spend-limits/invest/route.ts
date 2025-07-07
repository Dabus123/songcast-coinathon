import { NextRequest, NextResponse } from 'next/server';
import { Address, parseEther, createPublicClient, http, createWalletClient } from 'viem';
import { base } from 'viem/chains';
import { spendPermissionManagerAddress, spendPermissionManagerAbi } from '../../../lib/abi/SpendPermissionManager';
import { tradeCoin } from '@zoralabs/coins-sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Create a more robust RPC client with retry logic and multiple endpoints
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
    throw new Error('SPENDER_PRIVATE_KEY not configured');
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

// Remove the offchain daily spending tracking - use onchain accounting instead
// const dailySpending = new Map<string, { amount: bigint, date: string }>();

// function getDailySpending(userAddress: Address): bigint {
//   const today = new Date().toDateString();
//   const key = `${userAddress}-${today}`;
//   const record = dailySpending.get(key);
//   
//   if (!record || record.date !== today) {
//     // Reset for new day
//     dailySpending.set(key, { amount: 0n, date: today });
//     return 0n;
//   }
//   
//   return record.amount;
// }

// function updateDailySpending(userAddress: Address, amount: bigint): void {
//   const today = new Date().toDateString();
//   const key = `${userAddress}-${today}`;
//   const current = getDailySpending(userAddress);
//   
//   dailySpending.set(key, { 
//     amount: current + amount, 
//     date: today 
//   });
// }

// Use onchain period management functions instead
async function getCurrentPeriodInfo(spendPermissionForContract: any): Promise<{start: number, end: number, spend: bigint} | null> {
  try {
    const currentPeriod = await publicClient.readContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'getCurrentPeriod',
      args: [spendPermissionForContract],
    });
    return {
      start: Number(currentPeriod.start),
      end: Number(currentPeriod.end),
      spend: currentPeriod.spend
    };
  } catch (error) {
    console.error('Error getting current period:', error);
    return null;
  }
}

async function checkSpendPermissionStatus(spendPermissionForContract: any): Promise<{isValid: boolean, isApproved: boolean, isRevoked: boolean, rateLimited?: boolean}> {
  try {
    const [isValid, isApproved, isRevoked] = await Promise.all([
      publicClient.readContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'isValid',
        args: [spendPermissionForContract],
      }),
      publicClient.readContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'isApproved',
        args: [spendPermissionForContract],
      }),
      publicClient.readContract({
        address: spendPermissionManagerAddress,
        abi: spendPermissionManagerAbi,
        functionName: 'isRevoked',
        args: [spendPermissionForContract],
      })
    ]);
    
    return { isValid, isApproved, isRevoked };
  } catch (error: any) {
    console.error('Error checking spend permission status:', error);
    
    // Check if this is a rate limiting error
    if (error?.cause?.status === 429 || error?.message?.includes('over rate limit')) {
      console.log('🚨 Rate limiting detected - spend permission may be valid but unverifiable');
      return { 
        isValid: false, 
        isApproved: false, 
        isRevoked: true, 
        rateLimited: true 
      };
    }
    
    return { isValid: false, isApproved: false, isRevoked: true };
  }
}

// Note: SpendPermissionManager handles period accounting automatically through getCurrentPeriod

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting passive investment API call...');
    
    const { spendPermission, coinAddress, amount, userAddress } = await request.json();

    console.log('📝 Investment request:', {
      coinAddress,
      amount,
      userAddress,
      hasSpendPermission: !!spendPermission
    });

    if (!spendPermission || !coinAddress || !amount || !userAddress) {
      console.log('❌ Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Convert string values back to BigInt for processing
    const spendPermissionForContract = {
      ...spendPermission,
      allowance: BigInt(spendPermission.allowance),
      salt: BigInt(spendPermission.salt)
    };

    const investmentAmount = parseEther(amount);
    const spenderAddress = process.env.NEXT_PUBLIC_SPENDER_ADDRESS as Address;
    
    console.log('💰 Investment amounts:', {
      investmentAmount: investmentAmount.toString(),
      dailyLimit: spendPermissionForContract.allowance.toString()
    });

    // Check spend permission status
    const permissionStatus = await checkSpendPermissionStatus(spendPermissionForContract);
    console.log('🔍 Permission status:', permissionStatus);

    if (!permissionStatus.isValid || !permissionStatus.isApproved || permissionStatus.isRevoked) {
      // Special handling for rate limiting errors
      if (permissionStatus.rateLimited) {
        console.log('❌ Rate limiting prevented spend permission verification');
        return NextResponse.json(
          { 
            error: 'RPC rate limiting is preventing spend permission verification. Please try again in a few minutes.',
            permissionStatus,
            rateLimited: true
          },
          { status: 429 } // Use 429 status for rate limiting
        );
      }
      
      console.log('❌ Spend permission is not valid/approved or has been revoked');
      return NextResponse.json(
        { 
          error: 'Spend permission is not valid or has been revoked',
          permissionStatus
        },
        { status: 400 }
      );
    }

    // Get current period information to check spending limits
    const currentPeriod = await getCurrentPeriodInfo(spendPermissionForContract);
    if (!currentPeriod) {
      console.log('❌ Could not retrieve current period information');
      return NextResponse.json(
        { error: 'Could not retrieve spending period information' },
        { status: 500 }
      );
    }

    console.log('📊 Current period info:', {
      start: new Date(currentPeriod.start * 1000).toISOString(),
      end: new Date(currentPeriod.end * 1000).toISOString(),
      alreadySpent: currentPeriod.spend.toString(),
      dailyLimit: spendPermissionForContract.allowance.toString(),
      requestedAmount: investmentAmount.toString()
    });
    
    // Check if we have enough remaining allowance for this period
    const remainingAllowance = spendPermissionForContract.allowance - currentPeriod.spend;
    if (investmentAmount > remainingAllowance) {
      console.log('❌ Insufficient remaining allowance for current period');
      return NextResponse.json(
        { 
          error: 'Insufficient remaining allowance for current period',
          currentAllowance: spendPermissionForContract.allowance.toString(),
          alreadySpent: currentPeriod.spend.toString(),
          remainingAllowance: remainingAllowance.toString(),
          requestedAmount: investmentAmount.toString()
        },
        { status: 400 }
      );
    }

    console.log('✅ Allowance check passed');
    
    const spenderWalletClient = getSpenderWalletClient();
    console.log('🔑 Spender wallet client created');

    // Step 1: Use spend permission to transfer ETH from user's wallet to spender wallet
    // This is required because the music coin purchase needs to be made by the spender wallet
    // The user has pre-authorized this exact amount via the spend permission
    console.log('💸 Step 1: Executing authorized ETH transfer (spend transaction)...');
    console.log('🔍 ETH Transfer Details:', {
      from: userAddress,
      to: spenderAddress,
      amount: investmentAmount.toString(),
      purpose: 'Authorized transfer to purchase music coin',
      preApproved: true
    });
    
    const spendTxHash = await spenderWalletClient.writeContract({
      address: spendPermissionManagerAddress,
      abi: spendPermissionManagerAbi,
      functionName: 'spend',
      args: [spendPermissionForContract, investmentAmount],
    });

    console.log('📋 Spend transaction hash:', spendTxHash);

    // Wait for spend transaction
    console.log('⏳ Waiting for spend transaction confirmation...');
    const spendReceipt = await publicClient.waitForTransactionReceipt({
      hash: spendTxHash,
    });

    console.log('📄 Spend transaction receipt:', {
      status: spendReceipt.status,
      blockNumber: spendReceipt.blockNumber,
      gasUsed: spendReceipt.gasUsed.toString()
    });

    if (spendReceipt.status !== 'success') {
      console.log('❌ Spend transaction failed');
      return NextResponse.json(
        { error: 'Failed to spend from user wallet' },
        { status: 500 }
      );
    }

    console.log('✅ Step 1 Complete: ETH transfer successful');

    // Step 2: Use the transferred ETH to buy the music coin via Zora and send it to user
    console.log('🎵 Step 2: Purchasing music coin with transferred ETH...');
    const tradeParams = {
      direction: 'buy' as const,
      target: coinAddress as Address,
      args: {
        recipient: userAddress as Address, // Coins go directly to user, not spender
        orderSize: investmentAmount,
        tradeReferrer: process.env.NEXT_PUBLIC_SPENDER_ADDRESS as Address
      }
    };

    console.log('🔍 Coin Purchase Details:', {
      coinAddress,
      buyer: spenderAddress,
      recipient: userAddress, // User gets the coins
      amount: investmentAmount.toString(),
      purpose: 'Purchase music coin with pre-authorized ETH'
    });
    console.log('🎵 Executing coin trade with params:', tradeParams);

    // Execute the coin purchase
    const tradeResult = await tradeCoin(tradeParams, spenderWalletClient, publicClient);

    console.log('🎯 Trade result:', {
      hash: tradeResult?.hash,
      success: !!tradeResult?.hash
    });

    if (!tradeResult || !tradeResult.hash) {
      console.log('❌ Trade failed - no hash returned');
      console.log('🚨 CRITICAL: ETH was transferred but coin purchase failed!');
      console.log('🚨 Stranded ETH in spender wallet:', {
        amount: investmentAmount.toString(),
        spenderWallet: spenderAddress,
        userWallet: userAddress,
        spendTxHash
      });
      
      // TODO: Implement ETH recovery mechanism
      // For now, log the stranded ETH for manual recovery
      
      return NextResponse.json(
        { 
          error: 'Failed to purchase music coin - ETH was transferred but coin purchase failed',
          strandedETH: {
            amount: investmentAmount.toString(),
            spenderWallet: spenderAddress,
            spendTransactionHash: spendTxHash
          }
        },
        { status: 500 }
      );
    }

    console.log('✅ Step 2 Complete: Music coin purchase successful:', tradeResult.hash);

    // Get updated period information after the spend
    const updatedPeriod = await getCurrentPeriodInfo(spendPermissionForContract);

    // Log the complete passive investment flow
    console.log('🎉 PASSIVE INVESTMENT COMPLETED - Two-Step Process Summary:');
    console.log('   Step 1: Authorized ETH transfer from user to spender wallet');
    console.log('   Step 2: Spender wallet purchased music coin and sent to user');
    console.log('📊 Investment Details:', {
      userAddress,
      coinAddress,
      ethAmount: amount,
      ethTransferTx: spendTxHash,
      coinPurchaseTx: tradeResult.hash,
      finalResult: 'User received music coins for pre-authorized ETH',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      investment: {
        userAddress,
        coinAddress,
        amount,
        spendTransactionHash: spendTxHash,
        tradeTransactionHash: tradeResult.hash,
        timestamp: new Date().toISOString()
      },
      allowanceStatus: {
        currentAllowance: spendPermissionForContract.allowance.toString(),
        remainingAllowance: updatedPeriod ? (spendPermissionForContract.allowance - updatedPeriod.spend).toString() : '0',
        periodLimit: spendPermissionForContract.allowance.toString(),
        periodSpent: updatedPeriod?.spend?.toString() || '0'
      }
    });

  } catch (error: any) {
    console.error('💥 Error executing passive investment:', error);
    
    // More specific error handling
    let errorMessage = 'Failed to execute passive investment';
    
    if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds in spend allowance';
    } else if (error.message.includes('allowance')) {
      errorMessage = 'Spend allowance limit reached';
    } else if (error.message.includes('slippage')) {
      errorMessage = 'Trade failed due to price movement';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message 
      },
      { status: 500 }
    );
  }
} 