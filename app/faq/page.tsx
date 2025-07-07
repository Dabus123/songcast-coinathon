'use client';

import React from 'react';
import PageLayout from '../components/layout/PageLayout';

export default function FAQ() {
  const faqItems = [
    {
      question: "What is SongCast?",
      answer: "SongCast is a platform that enables musicians to create and manage social tokens for their music, allowing fans to support artists directly while gaining ownership in their success."
    },
    {
      question: "How do Music Coins work?",
      answer: "Music Coins are social tokens tied to specific artists or songs. When you buy Music Coins, you're investing in the success of that artist. As the artist grows in popularity, the value of their coins may increase."
    },
    {
      question: "How do I connect my wallet?",
      answer: "Click the 'Connect Wallet' button in the top right corner and select MetaMask. Make sure you have the Base network configured in your wallet."
    },
    {
      question: "What blockchain does SongCast use?",
      answer: "SongCast operates on the Base network, an Ethereum Layer 2 scaling solution that provides fast and low-cost transactions."
    },
    {
      question: "How do artists get paid?",
      answer: "Artists receive a percentage of every Music Coin transaction related to their content, as well as royalties from secondary sales."
    },
    {
      question: "Can I sell my Music Coins?",
      answer: "Yes, you can sell your Music Coins to other users on the platform or through the integrated DEX."
    },
    {
      question: "What fees does SongCast charge?",
      answer: "SongCast serves as a platform referrer to Zora and will receive fee's on every trade with a coin that has the plaform referrer set to our address to maintain the service. The exact fee structure is based on the Zora protocol market rewards"
    }
  ];
  
  return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="border-b-2 border-white mb-10 pb-2">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Frequently Asked Questions</h1>
            <p className="text-lg mt-4 uppercase font-bold text-white">Everything you need to know about SongCast</p>
          </div>
          
          <div className="space-y-10">
            {faqItems.map((item, index) => (
              <div key={index} className="border-2 border-white shadow-woodcut bg-black p-6">
                <h3 className="text-xl font-black uppercase mb-3">{item.question}</h3>
                <p className="text-white">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
} 