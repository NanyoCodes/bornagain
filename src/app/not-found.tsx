
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg border-2">
        <CardHeader className="flex flex-col items-center gap-4">
            {logo && (
                <Avatar className="h-16 w-16">
                    <AvatarImage src={logo.imageUrl} alt={logo.description} />
                    <AvatarFallback>T</AvatarFallback>
                </Avatar>
            )}
          <CardTitle className="text-4xl font-bold font-headline">404</CardTitle>
          <p className="text-xl font-semibold text-muted-foreground">Page Not Found</p>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm italic">
            "For the Son of Man came to seek and to save the lost." <br/>
            <span className="font-semibold">- Luke 19:10</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Sign In
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
