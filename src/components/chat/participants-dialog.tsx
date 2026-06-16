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

/**
 * Ensures the profile photo displayed in the directory is always the most recent version.
 */
function LiveParticipantAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = React.useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
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
      <div className="space-y-3 pb-6">
        {participants.map(([id, p]) => (
          <div key={id} className="flex items-center gap-3 rounded-xl border p-3 bg-muted/5">
            <Link 
                href={id === user?.uid ? '/dashboard/profile' : `/dashboard/profile/${id}`} 
                className="flex items-center gap-3 flex-1 min-w-0 group"
                onClick={(e) => e.stopPropagation()}
            >
                <LiveParticipantAvatar 
                    userId={id} 
                    fallbackUrl={p.photoURL} 
                    fallbackInitials={p.firstName?.charAt(0) || 'U'}
                    className="shrink-0 hover:opacity-80 transition-opacity shadow-sm border"
                />
                <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-sm sm:text-base group-hover:underline leading-tight uppercase tracking-tight">{p.firstName} {p.lastName}</p>
                    {p.email && <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">{p.email}</p>}
                </div>
            </Link>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  if (mounted && isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left flex-shrink-0">
              <SheetTitle className="text-2xl font-black font-headline">Directory</SheetTitle>
              <SheetDescription className="text-sm font-medium">{participants.length} believers in {chat.campaignTitle}.</SheetDescription>
            </SheetHeader>
          </div>
          <div className="flex-grow min-h-0 pt-6 px-8">
            {listContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-[2rem] overflow-hidden p-0 max-w-md border-none shadow-2xl">
        <div className="p-8 border-b bg-muted/10">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline">Participants</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                    {participants.length} believers in this conversation.
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="p-8">
            {listContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
