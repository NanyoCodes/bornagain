'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Chat } from '@/lib/types';
import Link from 'next/link';

export function ChatParticipantsDialog({ chat, children }: { chat: Chat; children: React.ReactNode; }) {
  if (!chat.isGroupChat) {
    return <>{children}</>;
  }
  
  const participants = Object.entries(chat.participantInfo || {});
  
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
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {participants.map(([id, p]) => (
              <div key={id} className="flex items-center gap-3 rounded-lg border p-3">
                 <Link href={`/dashboard/profile/${id}`}>
                    <Avatar>
                    <AvatarImage src={p.photoURL} />
                    <AvatarFallback>{p.firstName?.charAt(0)}{p.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Link>
                <div>
                  <Link href={`/dashboard/profile/${id}`}>
                    <p className="font-semibold hover:underline">{p.firstName} {p.lastName}</p>
                  </Link>
                  <p className="text-sm text-muted-foreground">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
