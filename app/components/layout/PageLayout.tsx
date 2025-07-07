'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Music, Coins, Home, ChevronDown, User, LogIn, LogOut, Menu, X, Sun, Moon, Download, TrendingUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect, useConnect, type Connector } from 'wagmi';
import { Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains'; 
import { useTheme } from '../../context/ThemeContext';
import { MiniPlayer } from '../MiniPlayer';
import PassiveInvestmentTracker from '../PassiveInvestmentTracker';
import ErrorBoundary from '../ErrorBoundary';

// Memoized Name component to prevent unnecessary re-renders
const MemoizedName = React.memo(({ address }: { address: `0x${string}` }) => (
  <Name address={address} chain={base} />
));

// Client-only wrapper to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

// Memoized profile menu to prevent unnecessary re-renders
const ProfileMenu = React.memo(({ 
  address, 
  isProfileMenuOpen, 
  setIsProfileMenuOpen, 
  disconnect 
}: {
  address: `0x${string}`;
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (open: boolean) => void;
  disconnect: () => void;
}) => {
  const handleDisconnect = useCallback(() => {
    disconnect();
    setIsProfileMenuOpen(false);
  }, [disconnect, setIsProfileMenuOpen]);

  const handleCloseMenu = useCallback(() => {
    setIsProfileMenuOpen(false);
  }, [setIsProfileMenuOpen]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        className="flex items-center gap-2 py-1.5 px-3 border-2 border-foreground bg-background hover:bg-red-600 transition-colors uppercase font-bold"
        style={{ boxShadow: '4px 4px 0 0 #000, 5px 5px 0 0 #fff' }}
      >
        <div className="w-6 h-6 flex items-center justify-center">
          <User size={18} className="text-foreground stroke-[3px]" />
        </div>
        <span className="hidden sm:inline text-foreground">
          <MemoizedName address={address} />
        </span>
        <ChevronDown size={16} className={`stroke-[3px] transition-transform text-foreground ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isProfileMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 py-2 bg-background border-2 border-foreground z-40" style={{ boxShadow: '6px 6px 0 0 rgba(255, 51, 0, 0.8)' }}>
          <div className="border-b-2 border-foreground pb-2 mb-2 px-4">
            <div className="text-sm font-bold uppercase text-foreground">Wallet</div>
            <div className="text-xs text-foreground">
              <MemoizedName address={address} />
            </div>
          </div>
          <Link 
            href="/claim"
            onClick={handleCloseMenu}
            className="flex items-center gap-2 px-4 py-2 text-sm uppercase font-bold hover:bg-red-600 transition-colors text-foreground"
          >
            <Download size={16} className="stroke-[3px]" />
            <span>Claim Earnings</span>
          </Link>
          <a 
            href={`https://basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm uppercase font-bold hover:bg-red-600 transition-colors text-foreground"
          >
            <span>View on Explorer</span>
          </a>
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground uppercase font-bold hover:bg-red-600 transition-colors w-full text-left"
          >
            <LogOut size={16} className="stroke-[3px]" />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
});

// Memoized connect wallet menu
const ConnectWalletMenu = React.memo(({ 
  isProfileMenuOpen, 
  setIsProfileMenuOpen, 
  connectors, 
  connect 
}: {
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: (open: boolean) => void;
  connectors: readonly Connector[];
  connect: (options: { connector: Connector }) => void;
}) => {
  const handleConnect = useCallback((connector: Connector) => {
    connect({ connector });
    setIsProfileMenuOpen(false);
  }, [connect, setIsProfileMenuOpen]);

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        className="sonic-button-primary py-1.5 px-3 text-xs"
      >
        <LogIn size={18} className="stroke-[3px]" />
        <span>Connect Wallet</span>
      </button>
      
      {isProfileMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-background border-2 border-foreground z-40" style={{ boxShadow: '6px 6px 0 0 rgba(255, 51, 0, 0.8)' }}>
          <div className="border-b-2 border-foreground p-3">
            <h3 className="text-foreground font-bold uppercase text-sm text-center">Select Wallet</h3>
          </div>
          <div className="p-4 space-y-3">
            <button 
              type="button"
              onClick={() => handleConnect(connectors[0])}
              className="flex items-center gap-3 p-2 w-full border-2 border-foreground hover:bg-red-600 transition-colors text-foreground"
            >
              <LogIn size={18} className="stroke-[3px]" />
              <span className="font-bold">Warpcast</span>
            </button>
            
            <button 
              type="button"
              onClick={() => handleConnect(connectors[1])}
              className="flex items-center gap-3 p-2 w-full border-2 border-foreground hover:bg-red-600 transition-colors text-foreground"
            >
              <LogIn size={18} className="stroke-[3px]" />
              <span className="font-bold">Coinbase Wallet</span>
            </button>
            
            <button 
              type="button"
              onClick={() => handleConnect(connectors[2])}
              className="flex items-center gap-3 p-2 w-full border-2 border-foreground hover:bg-red-600 transition-colors text-foreground"
            >
              <LogIn size={18} className="stroke-[3px]" />
              <span className="font-bold">Injected</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), []);

  // Memoize navigation items to prevent recreation on every render
  const navItems = useMemo(() => [
    { label: 'Home', href: '/', icon: <Home size={24} className="stroke-[3px]" /> },
    { label: 'Music Coins', href: '/coins', icon: <Coins size={24} className="stroke-[3px]" /> },
    { label: 'Auto Invest', href: '/passive-investment', icon: <TrendingUp size={24} className="stroke-[3px]" /> },
    { label: 'Artists', href: '/artists', icon: <User size={24} className="stroke-[3px]" /> },
    { label: 'Claim Earnings', href: '/claim', icon: <Download size={24} className="stroke-[3px]" /> },
  ], []);

  // Close menus when navigating to prevent them staying open
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Memoize the PassiveInvestmentTracker to prevent unnecessary re-renders
  const memoizedPassiveTracker = useMemo(() => (
    isConnected ? (
      <ErrorBoundary fallback={null}>
        <PassiveInvestmentTracker />
      </ErrorBoundary>
    ) : null
  ), [isConnected]);

  return (
    <div className="flex flex-col min-h-screen bg-background diagonal-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-600 border-2 border-foreground flex items-center justify-center">
                <span className="text-white font-black text-lg">SC</span>
              </div>
              <span className="font-black text-xl uppercase tracking-tight pr-2 text-foreground">SONGCAST</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-1.5 py-1 px-2 uppercase font-bold tracking-wide transition-colors ${
                    pathname === item.href 
                      ? 'text-red-600' 
                      : 'text-foreground hover:text-orange-500'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Right Side - Auth */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun size={20} className="text-foreground stroke-[3px]" />
                ) : (
                  <Moon size={20} className="text-foreground stroke-[3px]" />
                )}
              </button>
              
              <ClientOnly>
                {isConnected && address ? (
                  <ProfileMenu 
                    address={address}
                    isProfileMenuOpen={isProfileMenuOpen}
                    setIsProfileMenuOpen={setIsProfileMenuOpen}
                    disconnect={disconnect}
                  />
                ) : (
                  <ConnectWalletMenu 
                    isProfileMenuOpen={isProfileMenuOpen}
                    setIsProfileMenuOpen={setIsProfileMenuOpen}
                    connectors={connectors}
                    connect={connect}
                  />
                )}
              </ClientOnly>
              
              {/* Mobile Menu Button */}
              <button 
                onClick={toggleMenu}
                className="inline-flex md:hidden items-center justify-center p-2 text-foreground"
              >
                {isMenuOpen ? 
                  <X size={28} className="stroke-[3px]" /> : 
                  <Menu size={28} className="stroke-[3px]" />
                }
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-background m-2 border-2 border-foreground" style={{ boxShadow: '4px 4px 0 0 rgba(255, 51, 0, 0.8)' }}>
            <nav className="flex flex-col py-2">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 py-3 px-4 uppercase font-bold ${
                    pathname === item.href 
                      ? 'text-red-600' 
                      : 'text-foreground hover:text-orange-500'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>
      
      {/* Mini Player */}
      <MiniPlayer />
      
      {/* Passive Investment Tracker - only render when connected */}
      {memoizedPassiveTracker}
      
      {/* Footer */}
      <footer className="border-t-2 border-foreground bg-background">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-red-600 border-2 border-foreground flex items-center justify-center">
                  <span className="text-white font-black text-sm">SC</span>
                </div>
                <span className="font-black text-xl uppercase tracking-tight text-foreground">SONGCAST</span>
              </div>
              <p className="text-sm mb-4 uppercase font-bold text-foreground">
                Bold music ownership through social tokens.
              </p>
            </div>
            
            <div>
              <h3 className="font-black uppercase mb-4 text-xl tracking-tight text-foreground">Navigation</h3>
              <ul className="space-y-3">
                {navItems.map(item => (
                  <li key={item.href}>
                    <Link 
                      href={item.href}
                      className="uppercase font-bold tracking-wide hover:text-red-600 transition-colors flex items-center gap-2 text-foreground"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-black uppercase mb-4 text-xl tracking-tight text-foreground">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/faq" 
                    className="uppercase font-bold tracking-wide hover:text-red-600 transition-colors text-foreground"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/terms" 
                    className="uppercase font-bold tracking-wide hover:text-red-600 transition-colors text-foreground"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a 
                    href="https://docs.zora.co/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="uppercase font-bold tracking-wide hover:text-red-600 transition-colors text-foreground"
                  >
                    Zora Docs
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-black uppercase mb-4 text-xl tracking-tight text-foreground">Connect</h3>
              <div className="flex gap-3">
                <a 
                  href="https://twitter.com/dabusthebuilder" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 border-2 border-foreground bg-background hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 fill-current text-foreground" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.4 5.6c-.8.3-1.6.6-2.5.7.9-.5 1.6-1.4 1.9-2.4-.8.5-1.8.9-2.7 1.1-.8-.8-1.9-1.3-3.1-1.3-2.3 0-4.2 1.9-4.2 4.2 0 .3 0 .6.1.9-3.5-.1-6.6-1.8-8.7-4.3-.4.6-.6 1.4-.6 2.1 0 1.5.7 2.7 1.9 3.5-.7 0-1.4-.2-2-.5v.1c0 2 1.4 3.7 3.4 4.1-.4.1-.7.1-1.1.1-.3 0-.5 0-.8-.1.5 1.7 2.1 2.9 3.9 2.9-1.4 1.1-3.2 1.8-5.2 1.8-.3 0-.7 0-1-.1 1.8 1.2 4 1.8 6.3 1.8 7.6 0 11.8-6.3 11.8-11.8v-.5c.8-.6 1.5-1.3 2.1-2.2z" />
                  </svg>
                </a>
                <a 
                  href="https://warpcast.com/dabus.eth" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 border-2 border-foreground bg-background hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  <Image src="/fc.png" alt='Farcaster' width={24} height={24}></Image>
                </a>
                
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                © {new Date().getFullYear()} SongCast. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 