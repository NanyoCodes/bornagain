'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');
  const authBackground = PlaceHolderImages.find((img) => img.id === 'auth-background');

  return (
    <div className="w-full lg:grid lg:grid-cols-2 min-h-screen">
      <div className="flex flex-col items-center justify-center p-8 sm:p-12">
        <div className="mx-auto grid w-full max-w-xs gap-6">
            <div className="grid gap-2 text-left mb-6">
                {logo && (
                    <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage src={logo.imageUrl} alt={logo.description} />
                        <AvatarFallback>T</AvatarFallback>
                    </Avatar>
                )}
            </div>
            {children}
        </div>
         <footer className="text-center text-sm text-muted-foreground mt-8">
            <div className="flex justify-center gap-4">
              <Link href="/terms-of-service" className="hover:underline">
                Terms of Service
              </Link>
              <Link href="/privacy-policy" className="hover:underline">
                Privacy Policy
              </Link>
            </div>
          </footer>
      </div>
      <div className="hidden lg:flex flex-col items-start justify-center p-12 md:p-24 text-white relative overflow-hidden">
        {authBackground && (
            <Image
            src={authBackground.imageUrl}
            alt={authBackground.description}
            fill
            objectFit="cover"
            className="-z-10"
            data-ai-hint={authBackground.imageHint}
            priority
            />
        )}
        <div className="absolute inset-0 bg-black/60 -z-10" />
        
        <div className="space-y-4 mb-12 z-10">
            <h1 className="text-4xl font-bold">Welcome to Testify</h1>
            <p className="text-zinc-300 max-w-md">
                A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.
            </p>
             <p className="text-zinc-400">Join thousands of others in this digital revival.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl space-y-4 max-w-md relative z-10 shadow-lg">
            <p className="text-xl font-semibold leading-relaxed">"And they overcame him by the blood of the Lamb, and by the word of their testimony; and they loved not their lives unto the death."</p>
            <p className="text-right text-zinc-400">- Revelation 12:11</p>
        </div>
      </div>
    </div>
  );
}
