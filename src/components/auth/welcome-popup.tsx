
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

type WelcomePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  userName?: string | null;
};

export function WelcomePopup({ isOpen, onClose, userName }: WelcomePopupProps) {
  const logo = PlaceHolderImages.find((img) => img.id === 'logo');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          {logo && (
            <Image
              src={logo.imageUrl}
              alt={logo.description}
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-full"
              data-ai-hint={logo.imageHint}
            />
          )}
          <DialogTitle className="text-2xl font-bold font-headline">Welcome, {userName || 'User'}!</DialogTitle>
          <DialogDescription className="text-balance pt-2 text-base">
            We're so glad you've joined Testify. You're now part of a global community of believers sharing what God is doing.
          </DialogDescription>
        </DialogHeader>
        <div className="text-center text-sm text-muted-foreground px-4 py-2">
            <p>You can start by sharing your testimony, joining a soul-winning campaign, or exploring your new dashboard.</p>
        </div>
        <DialogFooter className="sm:justify-center pt-4">
          <Button type="button" onClick={onClose} size="lg">
            Let's Go!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
