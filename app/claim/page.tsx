'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { base } from 'viem/chains';

// Contract address for withdrawFor function
const CREATOR_EARNINGS_CONTRACT = '0x7777777F279eba3d3Ad8F4E708545291A6fDBA8B' as Address;

// ABI for the withdrawFor function
const WITHDRAW_ABI = [{"inputs":[],"stateMutability":"payable","type":"constructor"},{"inputs":[],"name":"ADDRESS_ZERO","type":"error"},{"inputs":[],"name":"ARRAY_LENGTH_MISMATCH","type":"error"},{"inputs":[],"name":"INVALID_DEPOSIT","type":"error"},{"inputs":[],"name":"INVALID_SIGNATURE","type":"error"},{"inputs":[],"name":"INVALID_WITHDRAW","type":"error"},{"inputs":[],"name":"InvalidShortString","type":"error"},{"inputs":[],"name":"SIGNATURE_DEADLINE_EXPIRED","type":"error"},{"inputs":[{"internalType":"string","name":"str","type":"string"}],"name":"StringTooLong","type":"error"},{"inputs":[],"name":"TRANSFER_FAILED","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"bytes4","name":"reason","type":"bytes4"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"string","name":"comment","type":"string"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[],"name":"EIP712DomainChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"creator","type":"address"},{"indexed":true,"internalType":"address","name":"createReferral","type":"address"},{"indexed":true,"internalType":"address","name":"mintReferral","type":"address"},{"indexed":false,"internalType":"address","name":"firstMinter","type":"address"},{"indexed":false,"internalType":"address","name":"zora","type":"address"},{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"creatorReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"createReferralReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mintReferralReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"firstMinterReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"zoraReward","type":"uint256"}],"name":"RewardsDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"WITHDRAW_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes4","name":"reason","type":"bytes4"},{"internalType":"string","name":"comment","type":"string"}],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address[]","name":"recipients","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"bytes4[]","name":"reasons","type":"bytes4[]"},{"internalType":"string","name":"comment","type":"string"}],"name":"depositBatch","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint256","name":"creatorReward","type":"uint256"},{"internalType":"address","name":"createReferral","type":"address"},{"internalType":"uint256","name":"createReferralReward","type":"uint256"},{"internalType":"address","name":"mintReferral","type":"address"},{"internalType":"uint256","name":"mintReferralReward","type":"uint256"},{"internalType":"address","name":"firstMinter","type":"address"},{"internalType":"uint256","name":"firstMinterReward","type":"uint256"},{"internalType":"address","name":"zora","type":"address"},{"internalType":"uint256","name":"zoraReward","type":"uint256"}],"name":"depositRewards","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"eip712Domain","outputs":[{"internalType":"bytes1","name":"fields","type":"bytes1"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"version","type":"string"},{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"verifyingContract","type":"address"},{"internalType":"bytes32","name":"salt","type":"bytes32"},{"internalType":"uint256[]","name":"extensions","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawFor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"withdrawWithSig","outputs":[],"stateMutability":"nonpayable","type":"function"}] as const;

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Get ETH balance
  const { data: balance } = useBalance({
    address: address,
    chainId: base.id,
  });

  // Contract write hook
  const { 
    writeContract, 
    data: hash, 
    error: writeError, 
    isPending: isWritePending 
  } = useWriteContract();

  // Wait for transaction confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle claim button click
  const handleClaim = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Call withdrawFor with connected address and amount 0
      writeContract({
        address: CREATOR_EARNINGS_CONTRACT,
        abi: WITHDRAW_ABI,
        functionName: 'withdrawFor',
        args: [address, BigInt(0)],
      });

    } catch (error) {
      console.error('Error initiating withdrawal:', error);
      setErrorMessage('Failed to initiate withdrawal. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle transaction status changes
  useEffect(() => {
    if (writeError) {
      setErrorMessage(writeError.message || 'Transaction failed');
      setIsSubmitting(false);
    }
  }, [writeError]);

  useEffect(() => {
    if (confirmError) {
      setErrorMessage(confirmError.message || 'Transaction confirmation failed');
      setIsSubmitting(false);
    }
  }, [confirmError]);

  useEffect(() => {
    if (isConfirmed) {
      setSuccessMessage('Earnings claimed successfully!');
      setIsSubmitting(false);
    }
  }, [isConfirmed]);

  // Reset status when write is pending
  useEffect(() => {
    if (isWritePending) {
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isWritePending]);

  return (
    <div className="min-h-screen py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center bg-woodcut-card border-2 border-woodcut-card shadow-woodcut-card px-4 py-2 mb-6">
            <Download size={20} className="text-woodcut-card mr-2 stroke-[3px]" />
            <span className="text-sm uppercase font-bold tracking-wide">Creator Earnings</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-woodcut-card uppercase mb-6 leading-tight tracking-tight gradient-text">
            Claim Your Earnings
          </h1>
          
          <p className="text-xl mb-8 max-w-2xl mx-auto uppercase font-bold">
            Withdraw your creator earnings from SongCast. All available earnings will be sent to your connected wallet.
          </p>
        </motion.div>

        {/* Main Claim Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="woodcut-card p-8 md:p-12 mb-8"
        >
          {/* Wallet Status */}
          {isConnected && address ? (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 border-2 border-foreground flex items-center justify-center">
                  <Wallet size={24} className="text-white stroke-[3px]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase">Wallet Connected</h3>
                  <p className="text-sm text-muted-foreground font-mono">{address}</p>
                </div>
              </div>
              
              {balance && (
                <div className="bg-woodcut-paper p-4 border-2 border-foreground">
                  <div className="flex items-center justify-between">
                    <span className="uppercase font-bold">Current Balance:</span>
                    <span className="font-mono text-lg font-bold">
                      {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500 border-2 border-foreground flex items-center justify-center">
                  <AlertCircle size={24} className="text-white stroke-[3px]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase text-red-500">Wallet Not Connected</h3>
                  <p className="text-sm">Please connect your wallet to claim earnings</p>
                </div>
              </div>
            </div>
          )}

          {/* Claim Information */}
          <div className="bg-woodcut-paper p-6 mb-8 border-2 border-foreground">
            <div className="flex items-start gap-3">
              <Info size={24} className="text-blue-500 stroke-[3px] mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-bold uppercase mb-2">How Claiming Works</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>This will withdraw all available earnings to your connected wallet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>Earnings come from trading fees on your music coins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>Transaction costs will be paid from your wallet balance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold">•</span>
                    <span>Claims are processed on the Base network</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500 border-2 border-foreground p-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-white stroke-[3px]" />
                <span className="text-white font-bold">{errorMessage}</span>
              </div>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500 border-2 border-foreground p-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-white stroke-[3px]" />
                <span className="text-white font-bold">{successMessage}</span>
              </div>
            </motion.div>
          )}

          {/* Transaction Hash */}
          {hash && (
            <div className="bg-woodcut-paper p-4 mb-6 border-2 border-foreground">
              <h4 className="font-bold uppercase mb-2">Transaction Hash:</h4>
              <a 
                href={`https://basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-blue-500 hover:underline break-all"
              >
                {hash}
              </a>
            </div>
          )}

          {/* Claim Button */}
          <div className="text-center">
            <button
              onClick={handleClaim}
              disabled={!isConnected || isSubmitting || isWritePending || isConfirming}
              className="sonic-button-primary py-4 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWritePending || isConfirming ? (
                <>
                  <Loader2 size={24} className="animate-spin stroke-[3px]" />
                  <span>
                    {isWritePending ? 'Confirming...' : 'Processing...'}
                  </span>
                </>
              ) : (
                <>
                  <Download size={24} className="stroke-[3px]" />
                  <span>Claim All Earnings</span>
                </>
              )}
            </button>
            
            {!isConnected && (
              <p className="text-sm text-muted-foreground mt-4 uppercase font-bold">
                Connect your wallet to claim earnings
              </p>
            )}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="woodcut-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={24} className="text-green-500 stroke-[3px]" />
              <h3 className="font-bold uppercase">Earning Potential</h3>
            </div>
            <p className="text-sm">
              As your music coins gain popularity and trade more frequently, 
              your earnings from trading fees will increase. Promote your coins 
              to maximize your earning potential.
            </p>
          </div>
          
          <div className="woodcut-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Coins size={24} className="text-orange-500 stroke-[3px]" />
              <h3 className="font-bold uppercase">Create More Coins</h3>
            </div>
            <p className="text-sm">
              Each music coin you create generates independent earnings. 
              Consider creating coins for different songs, albums, or 
              collaborations to diversify your income streams.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 