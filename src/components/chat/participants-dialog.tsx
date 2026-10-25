'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Chat, UserProfile } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

/**
 * Ensures the profile photo displayed in the directory is always the most recent version.
 */
function LiveParticipantAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Dialog>
            <DialogTrigger asChild disabled={!currentPhotoUrl}>
                <Avatar className={cn(className, currentPhotoUrl && "cursor-pointer active:scale-95 transition-transform hover:scale-105")}>
                    <AvatarImage src={currentPhotoUrl} className="object-cover" />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
                </Avatar>
            </DialogTrigger>
            {currentPhotoUrl && (
                <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                    <DialogHeader className="sr-only text-center">
                        <DialogTitle>Profile Photo</DialogTitle>
                        <DialogDescription>Full screen view of participant's photo.</DialogDescription>
                    </DialogHeader>
                    <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                        <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                            <Image 
                                src={currentPhotoUrl} 
                                alt="Participant" 
                                fill 
                                className="object-contain shadow-2xl ring-4 ring-white/10" 
                                unoptimized 
                            />
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}

export function ChatParticipantsDialog({ chat, children }: { chat: Chat; children: React.ReactNode; }) {
  const isMobile = useIsMobile();
  const { user } = useUser();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!chat.isGroupChat) {
    return <>{children}</>;
  }
  
  const participants = Object.entries(chat.participantInfo || {});

  const listContent = (
    <ScrollArea className={cn("pr-4", isMobile ? "h-full" : "max-h-[60vh]")}>
      <div className="space-y-3 pb-6 text-left">
        {participants.map(([id, p]) => (
          <div key={id} className="flex items-center gap-3 rounded-xl border p-3 bg-muted/5 text-left">
            <div className="flex items-center gap-3 flex-1 min-w-0 group relative text-left">
                <LiveParticipantAvatar 
                    userId={id} 
                    fallbackUrl={p.photoURL} 
                    fallbackInitials={p.firstName?.charAt(0) || 'U'}
                    className="shrink-0 shadow-sm border text-left"
                />
                <div className="min-w-0 flex-1 text-left">
                    <Link 
                        href={id === user?.uid ? '/profile' : `/profile/${id}`} 
                        className="font-bold text-sm sm:text-base hover:underline leading-tight uppercase tracking-tight block text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {p.firstName} {p.lastName}
                    </Link>
                    {p.email && <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium text-left">{p.email}</p>}
                </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
            <SheetHeader className="text-left flex-shrink-0 text-left">
              <SheetTitle className="text-2xl font-black font-headline text-left">Directory</SheetTitle>
              <SheetDescription className="text-sm font-medium text-left">{participants.length} believers in {chat.campaignTitle}.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow min-h-0 pt-6 px-8 text-left">
            {listContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-[2rem] overflow-hidden p-0 max-w-md border-none shadow-2xl text-left">
        <div className="p-8 border-b bg-muted/10 text-left">
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline text-left">Participants</DialogTitle>
                <DialogDescription className="text-sm font-medium text-left">
                    {participants.length} believers in this conversation.
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="p-8 text-left">
            {listContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}