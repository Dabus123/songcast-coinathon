'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';
import { Music, Search, Menu, X, User, LogOut, Disc, Headphones } from 'lucide-react';

// ClientOnly component to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? <>{children}</> : null;
}

export default function Header() {
  const { address, isConnected } = useAccount();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [truncatedAddress, setTruncatedAddress] = useState<string>('');

  // Truncate wallet address for display
  useEffect(() => {
    if (address) {
      setTruncatedAddress(
        `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
      );
    }
  }, [address]);

  // Update header style on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-black border-b-2 border-white py-3 shadow-woodcut'
          : 'bg-black py-5'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-12 h-12 bg-woodcut-red border-2 border-white flex items-center justify-center">
              <Music className="w-7 h-7 text-white stroke-[3px]" />
            </div>
            <span className="text-2xl font-black uppercase tracking-tight text-white">SONGCAST</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/coins"
              className="text-white uppercase font-bold tracking-wide hover:text-woodcut-red transition-colors"
            >
              Music Coins
            </Link>
            <Link 
              href="/passive-investment"
              className="text-white uppercase font-bold tracking-wide hover:text-woodcut-red transition-colors"
            >
              Passive Investment
            </Link>
            <Link 
              href="/marketplace/publish"
              className="text-white uppercase font-bold tracking-wide hover:text-woodcut-red transition-colors"
            >
              Create
            </Link>
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <ClientOnly>
              <div className="wallet-container">
                <Wallet className="wallet-container">
                  <ConnectWallet className="bg-woodcut-red border-2 border-white text-white font-bold uppercase tracking-wide px-5 py-2.5 text-white shadow-woodcut hover:bg-woodcut-orange transition-colors duration-300 flex items-center justify-center gap-2">
                    <Name address={address}/>
                  </ConnectWallet>
                  <WalletDropdown>
                    <div className="bg-black border-2 border-white shadow-woodcut p-4">
                      <div className="mb-2 text-lg font-bold text-white uppercase border-b-2 border-white pb-2">
                        <span>Wallet Details</span>
                      </div>
                      <div>
                        <Identity className="px-2 py-2" hasCopyAddressOnClick>
                          <Avatar />
                          <Name address={address}/>
                          <Address />
                          <EthBalance />
                        </Identity>
                        <WalletDropdownLink
                          icon="wallet"
                          href="https://keys.coinbase.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full mt-2 text-center bg-woodcut-red border border-white text-white py-2 px-4 uppercase font-bold transition-colors shadow-woodcut"
                        >
                          Wallet
                        </WalletDropdownLink>
                        <WalletDropdownDisconnect className="w-full mt-2 text-center bg-black border-2 border-white text-white py-2 px-4 uppercase font-bold transition-colors shadow-woodcut hover:bg-woodcut-red" />
                      </div>
                    </div>
                  </WalletDropdown>
                </Wallet>
              </div>
            </ClientOnly>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? 
              <X size={28} className="stroke-[3px]" /> : 
              <Menu size={28} className="stroke-[3px]" />
            }
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black z-40 pt-20 border-2 border-white shadow-woodcut-lg">
          <div className="container mx-auto px-4">
            <nav className="flex flex-col gap-6 py-8">
              <Link
                href="/"
                className="flex items-center gap-3 py-2 text-xl text-white font-bold uppercase"
                onClick={closeMenu}
              >
                <Music size={28} className="text-woodcut-red stroke-[3px]" />
                <span>Home</span>
              </Link>

              <Link
                href="/coins"
                className="flex items-center gap-3 py-2 text-xl text-white font-bold uppercase"
                onClick={closeMenu}
              >
                <Disc size={28} className="text-woodcut-red stroke-[3px]" />
                <span>Music Coins</span>
              </Link>

              <Link
                href="/passive-investment"
                className="flex items-center gap-3 py-2 text-xl text-white font-bold uppercase"
                onClick={closeMenu}
              >
                <User size={28} className="text-woodcut-red stroke-[3px]" />
                <span>Passive Investment</span>
              </Link>

              <Link
                href="/marketplace/publish"
                className="flex items-center gap-3 py-2 text-xl text-white font-bold uppercase"
                onClick={closeMenu}
              >
                <Headphones size={28} className="text-woodcut-red stroke-[3px]" />
                <span>Publish Music</span>
              </Link>

              <div className="mt-4 pt-4 border-t-2 border-white">
                <ClientOnly>
                  <div className="wallet-container">
                    <Wallet className="wallet-container">
                      <ConnectWallet className="w-full bg-woodcut-red border-2 border-white px-5 py-3 text-white font-bold uppercase tracking-wide shadow-woodcut transition-colors duration-300 flex items-center justify-center gap-2">
                        <Name address={address}/>
                      </ConnectWallet>
                    </Wallet>
                  </div>
                </ClientOnly>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
} 