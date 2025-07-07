'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getIpfsUrl } from '../services/pinataService';

interface IPFSImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function IPFSImage({ src, alt, width = 500, height = 500, className = '' }: IPFSImageProps) {
  const [error, setError] = useState(false);
  const ipfsUrl = getIpfsUrl(src);
  const defaultImage = '/images/placeholder-cover.jpg';
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img 
        src={error ? defaultImage : ipfsUrl}
        alt={alt}
        className="object-cover w-full h-full"
        onError={() => {
          console.error(`Failed to load IPFS image from: ${ipfsUrl} (original: ${src})`);
          setError(true);
        }}
      />
    </div>
  );
}

export default IPFSImage; 