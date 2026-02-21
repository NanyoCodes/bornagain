
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  return (
    <div className="min-h-screen w-full bg-background lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-sm space-y-6">
            {children}
        </div>
      </div>
      <div className="hidden bg-slate-900 lg:flex flex-col items-start justify-center p-12 md:p-24 text-white relative overflow-hidden">
        <Link href="/" className="flex items-center gap-4 mb-8 z-10">
            {logo && (
                <Image
                src={logo.imageUrl}
                alt={logo.description}
                width={40}
                height={40}
                className="rounded-lg"
                data-ai-hint={logo.imageHint}
                />
            )}
            <span className="text-2xl font-bold font-headline">Testify</span>
        </Link>
        
        <div className="space-y-4 mb-12 z-10">
            <h1 className="text-4xl font-bold">Welcome to Testify</h1>
            <p className="text-slate-300 max-w-md">
                A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.
            </p>
             <p className="text-slate-400">Join thousands of others in this digital revival.</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl space-y-4 max-w-md relative z-10">
            <p className="text-xl font-semibold leading-relaxed">"And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death."</p>
            <p className="text-right text-slate-400">- Revelation 12:11</p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 h-[20rem] w-[20rem] bg-gradient-to-l from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] bg-gradient-to-r from-primary/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}
