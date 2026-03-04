
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  return (
    <div className="w-full lg:grid lg:grid-cols-2 min-h-screen">
      <div className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-xs">
            {children}
        </div>
      </div>
      <div className="hidden lg:flex flex-col items-start justify-center p-12 md:p-24 text-white relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black">
        <Link href="/" className="flex items-center gap-4 mb-8 z-10">
            {logo && (
                <Image
                src={logo.imageUrl}
                alt={logo.description}
                width={80}
                height={80}
                className="rounded-lg"
                data-ai-hint={logo.imageHint}
                />
            )}
            <span className="text-2xl font-bold font-headline">Testify</span>
        </Link>
        
        <div className="space-y-4 mb-12 z-10">
            <h1 className="text-4xl font-bold">Welcome to Testify</h1>
            <p className="text-zinc-300 max-w-md">
                A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.
            </p>
             <p className="text-zinc-400">Join thousands of others in this digital revival.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl space-y-4 max-w-md relative z-10 shadow-lg">
            <p className="text-xl font-semibold leading-relaxed">"Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven."</p>
            <p className="text-right text-zinc-400">- Matthew 5:16</p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 h-[20rem] w-[20rem] bg-gradient-to-l from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] bg-gradient-to-r from-primary/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}
