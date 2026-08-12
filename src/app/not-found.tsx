'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-left">
      <Card className="w-full max-w-md text-center shadow-lg border-2 text-left">
        <CardHeader className="flex flex-col items-center gap-4 text-left">
            {logo && (
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 shadow-xl ring-4 ring-primary/10 border-4 border-background">
                    <AvatarImage src={logo.imageUrl} alt={logo.description} />
                    <AvatarFallback>T</AvatarFallback>
                </Avatar>
            )}
          <CardTitle className="text-4xl font-black font-headline uppercase tracking-tight">404</CardTitle>
          <p className="text-xl font-bold text-muted-foreground uppercase tracking-widest">Page Not Found</p>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed italic">
            The page you are looking for doesn't exist or has been moved to a new Kingdom station.
          </p>
          <div className="mt-6 p-6 bg-primary/5 rounded-[1.5rem] border-2 border-dashed border-primary/20 text-sm italic">
            "For the Son of Man came to seek and to save the lost." <br/>
            <span className="font-black uppercase tracking-widest text-[10px] text-primary mt-2 block">- Luke 19:10</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8">
          <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              RETURN HOME
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
