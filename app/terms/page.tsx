'use client';

import React from 'react';
import PageLayout from '../components/layout/PageLayout';

export default function TermsOfService() {
  return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="border-b-2 border-white mb-10 pb-2">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Terms of Service</h1>
            <p className="text-lg mt-4 uppercase font-bold text-white">Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using SongCast, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
                If you do not agree with any of these terms, you are prohibited from using or accessing this platform.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">2. Description of Services</h2>
              <p>
                SongCast provides a platform for artists to create and manage social tokens, and for users to purchase, trade, and collect 
                these tokens. All transactions are conducted on the Base blockchain network.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">3. User Registration</h2>
              <p>
                To use certain features of SongCast, you must connect a compatible cryptocurrency wallet. You are responsible for 
                maintaining the security of your wallet and for all activities that occur under your account.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">4. Music Coins and Transactions</h2>
              <p>
                Music Coins are digital assets on the blockchain. When purchasing Music Coins, you understand that:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Digital assets are subject to high market volatility and risk.</li>
                <li>SongCast will receive platform referral rewards from trades in form of Zora protocol market rewards.</li>
                <li>Blockchain transactions are irreversible once confirmed.</li>
                <li>You are responsible for any taxes related to your transactions.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">5. Artist Rights and Obligations</h2>
              <p>
                Artists who create Music Coins on SongCast retain all rights to their original content. By creating 
                tokens, artists agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Provide accurate information about themselves and their work.</li>
                <li>Only tokenize content they have rights to.</li>
                <li>Fulfill any promises made to token holders.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">6. Prohibited Activities</h2>
              <p>
                Users may not engage in any of the following activities:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Violating any laws or regulations.</li>
                <li>Infringing on intellectual property rights.</li>
                <li>Manipulating the market for Music Coins.</li>
                <li>Using the platform for money laundering or illegal activities.</li>
                <li>Attempting to interfere with the proper functioning of the platform.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">7. Limitation of Liability</h2>
              <p>
                SongCast and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
                resulting from your use of or inability to use the service.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">8. Changes to Terms</h2>
              <p>
                SongCast reserves the right to modify these terms at any time. We will provide notice of significant changes by 
                updating the date at the top of these terms and by maintaining a changelog.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-black uppercase mb-4">9. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="font-bold mt-2">support@songcast.io</p>
            </section>
          </div>
        </div>
      </div>
  );
} 