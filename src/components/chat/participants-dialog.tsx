'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Chat } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function ChatParticipantsDialog({ chat, children }: { chat: Chat; children: React.ReactNode; }) {
  const isMobile = useIsMobile();
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
          <div key={id} className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar>
              <AvatarImage src={p.photoURL} />
              <AvatarFallback>{p.firstName?.charAt(0)}{p.lastName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{p.firstName} {p.lastName}</p>
              {p.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
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
        <SheetContent side="bottom" className="h-[80dvh] flex flex-col p-0 rounded-t-[2.5rem]">
          <div className="p-8 border-b flex-shrink-0 bg-muted/10">
            <SheetHeader className="text-left flex-shrink-0">
              <SheetTitle className="text-2xl font-black font-headline">Participants</SheetTitle>
              <SheetDescription className="text-sm font-medium">{participants.length} people in {chat.campaignTitle}.</SheetDescription>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Participants for "{chat.campaignTitle}"</DialogTitle>
          <DialogDescription>
            {participants.length} people in this chat.
          </DialogDescription>
        </DialogHeader>
        {listContent}
      </DialogContent>
    </Dialog>
  );
}