import React from 'react';
import Link from 'next/link';
import { Music, Twitter, Instagram, Github, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Tagline */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">SonicSphere</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              A decentralized music publishing platform built on the blockchain,
              empowering artists and fans.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="font-medium text-lg mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/marketplace" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link 
                  href="/artists" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Artists
                </Link>
              </li>
              <li>
                <Link 
                  href="/marketplace/publish" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Publish Music
                </Link>
              </li>
            </ul>
          </div>

          {/* Help & Resources */}
          <div className="col-span-1">
            <h3 className="font-medium text-lg mb-4">Help & Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/faq" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/support" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-1">
            <h3 className="font-medium text-lg mb-4">Stay Updated</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Subscribe to our newsletter for the latest updates and releases.
            </p>
            <form className="flex flex-col space-y-2">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="sonic-input"
                required
              />
              <button type="submit" className="sonic-button-primary">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="border-t border-border mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} SonicSphere. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm mt-2 md:mt-0">
            Built on <span className="text-primary">Base</span> blockchain
          </p>
        </div>
      </div>
    </footer>
  );
} 