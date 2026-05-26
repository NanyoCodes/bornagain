'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember, Soul } from '@/lib/types';
import { doc, collection, query, orderBy, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, Calendar, PlayCircle, MapPin, Heart, Phone, Mail, Church, History, PlusCircle, Award, MessagesSquare, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { LogFollowUpDialog } from '@/components/souls/log-follow-up-dialog';
import { actionItems } from '@/lib/follow-up-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function SoulWinnerInfo({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const winnerRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: winnerProfile, loading } = useDoc<UserProfile>(winnerRef);

    if (loading) return <Skeleton className="h-4 w-24" />;
    if (!winnerProfile) return <span className="text-muted-foreground italic text-xs">Original winner unknown</span>;

    return (
        <Link href={`/dashboard/profile/${userId}`} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <Award className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{winnerProfile.firstName} {winnerProfile.lastName}</span>
        </Link>
    );
}

export default function FellowshipPageClient() {
    const router = useRouter();
    const params = useParams();
    const fellowshipId = params.fellowshipId as string;
    const firestore = useFirestore();
    const { user } = useUser();
    const isMobile = useIsMobile();

    const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null);
    const [isSoulDetailsOpen, setIsSoulDetailsOpen] = useState(false);
    const [isLogFollowUpOpen, setIsLogFollowUpOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const fellowshipDocRef = useMemo(() => {
        if (!firestore || !fellowshipId) return null;
        return doc(firestore, 'fellowships', fellowshipId);
    }, [firestore, fellowshipId]);
    const { data: fellowship, loading: fellowshipLoading, error: fellowshipError } = useDoc<Fellowship>(fellowshipDocRef);

    const organizerDocRef = useMemo(() => {
        if (!fellowship?.organizerId || !firestore) return null;
        return doc(firestore, 'users', fellowship.organizerId);
    }, [fellowship?.organizerId, firestore]);
    const { data: organizer, loading: organizerLoading } = useDoc<UserProfile>(organizerDocRef);

    const currentUserRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(currentUserRef);
    
    const isMember = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.memberIds.includes(user.uid);
    }, [user, fellowship]);

    const isOrganizer = useMemo(() => {
        if (!user || !fellowship) return false;
        return fellowship.organizerId === user.uid;
    }, [user, fellowship]);

    const membersQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'fellowships', fellowshipId, 'members'), orderBy('joinedAt', 'desc'));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: members, loading: loadingMembers } = useCollection<FellowshipMember>(membersQuery);

    const soulsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'souls'), where('fellowshipId', '==', fellowshipId));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: assignedSouls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

    const handleStartGroupChat = async () => {
        if (!user || !firestore || !fellowship || !members) return;
        setIsChatLoading(true);
        
        const participantIds = fellowship.memberIds;
        const participantInfo: { [key: string]: any } = {};
        members.forEach(m => {
            participantInfo[m.userId] = {
                firstName: m.firstName,
                lastName: m.lastName,
                photoURL: m.photoURL || '',
            };
        });

        const batch = writeBatch(firestore);
        const chatDocRef = doc(firestore, 'chats', fellowshipId);
        
        batch.set(chatDocRef, {
            participantIds,
            participantInfo,
            fellowshipId: fellowshipId,
            campaignTitle: fellowship.name,
            lastUpdatedAt: serverTimestamp(),
            isGroupChat: true,
            hasMessages: false,
        }, { merge: true });

        const fellowshipRef = doc(firestore, 'fellowships', fellowshipId);
        batch.update(fellowshipRef, { hasGroupChat: true });

        try {
            await batch.commit();
            router.push(`/dashboard/chats/${fellowshipId}`);
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `chats/${fellowshipId}`, operation: 'create' }, user));
        } finally {
            setIsChatLoading(false);
        }
    };

    const loading = fellowshipLoading || organizerLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (fellowshipError || !fellowship || fellowship.status === 'deleted') {
        return (
            <div className="text-center py-12 flex flex-col items-center">
                <Users className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Fellowship Not Found</h3>
                <p className="mt-2 text-sm text-muted-foreground px-6">
                   This group may have been removed or the link is incorrect.
                </p>
                <Button asChild variant="outline" className="mt-6">
                    <Link href="/dashboard/fellowship"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
                </Button>
            </div>
        );
    }

    const soulDetailsContent = selectedSoul ? (
      <div className="space-y-8 pt-4 pb-20 sm:pb-6">
          <div className="flex items-center gap-4 border-2 rounded-[2rem] p-6 bg-muted/20 border-dashed">
              <div className="h-14 w-14 border-2 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Heart className="h-7 w-7 text-primary fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black font-headline truncate leading-tight">{selectedSoul.firstName} {selectedSoul.lastName}</h3>
                  <Badge className={cn("mt-1.5 h-5 text-[10px] uppercase font-bold tracking-widest")} variant="secondary">{selectedSoul.status}</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => setIsLogFollowUpOpen(true)} size="icon" className="shrink-0 h-11 w-11 rounded-2xl shadow-lg">
                            <PlusCircle className="h-5 w-5" />
                            <span className="sr-only">Log Follow-up</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Log Follow-up</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </div>

          <div className="grid gap-8">
              <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Context & Accountability</h4>
                  <div className="space-y-3">
                      <div className="text-sm flex items-center gap-3 p-3 rounded-2xl bg-background border shadow-sm">
                          <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest shrink-0 ml-1">Won By:</span>
                          <SoulWinnerInfo userId={selectedSoul.userId} />
                      </div>
                      {selectedSoul.email && (
                          <div className="flex items-center gap-3 text-sm p-3 rounded-2xl bg-background border shadow-sm">
                              <Mail className="h-4 w-4 text-primary shrink-0" />
                              <a href={`mailto:${selectedSoul.email}`} className="hover:underline truncate text-sm font-medium">{selectedSoul.email}</a>
                          </div>
                      )}
                      {selectedSoul.phone && (
                          <div className="flex items-center gap-3 text-sm p-3 rounded-2xl bg-background border shadow-sm">
                              <Phone className="h-4 w-4 text-primary shrink-0" />
                              <a href={`tel:${selectedSoul.phone}`} className="hover:underline text-sm font-medium">{selectedSoul.phone}</a>
                          </div>
                      )}
                      {selectedSoul.church && (
                          <div className="flex items-start gap-3 text-sm p-3 rounded-2xl bg-background border shadow-sm">
                              <Church className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="leading-snug text-sm font-medium">Attends: {selectedSoul.church}</span>
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                      <History className="h-3.5 w-3.5" /> Interaction History
                  </h4>
                  <div className="border rounded-[2rem] bg-muted/10 overflow-hidden">
                      {selectedSoul.followUpLog && selectedSoul.followUpLog.length > 0 ? (
                          <div className="divide-y max-h-80 overflow-y-auto">
                              {[...selectedSoul.followUpLog].reverse().map((log, i) => {
                                  const date = safeToDate(log.date);
                                  return (
                                      <div key={i} className="p-4 text-xs space-y-2 bg-background/50">
                                          <div className="flex justify-between items-center text-muted-foreground mb-1">
                                              <span className="font-black text-[10px] uppercase tracking-widest">{date ? format(date, 'MMM d, yyyy') : 'N/A'}</span>
                                              {log.memberName && (
                                                <span className="text-[9px] font-bold bg-muted px-2 py-0.5 rounded-full border truncate max-w-[100px] uppercase">By {log.memberName}</span>
                                              )}
                                          </div>
                                          {log.actions && log.actions.length > 0 && (
                                              <div className="flex flex-wrap gap-1.5 py-1">
                                                  {log.actions.map(id => {
                                                      const action = actionItems.find(a => a.id === id);
                                                      return action ? <Badge key={id} variant="outline" className="text-[9px] px-2 h-4 uppercase font-bold tracking-tight leading-none bg-background/80">{action.label}</Badge> : null;
                                                  })}
                                              </div>
                                          )}
                                          {log.note && <p className="italic text-muted-foreground leading-relaxed text-sm">&ldquo;{log.note}&rdquo;</p>}
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <p className="text-center py-16 text-xs text-muted-foreground italic px-10">No shared interactions yet. Help this convert grow by reaching out!</p>
                      )}
                  </div>
              </div>
          </div>
      </div>
    ) : null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-1 sm:px-0">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9">
                    <ArrowLeft className="h-4 w-4"/>
                    <span className="sr-only">Back</span>
                </Button>
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold truncate leading-tight">{fellowship.name}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {fellowship.description}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <Users className="h-5 w-5" /> Member Directory
                            </CardTitle>
                             <CardDescription className="text-xs sm:text-sm">
                                {isMember || isOrganizer 
                                    ? "Collaborative view of believers and converts." 
                                    : "Join to access the directory and help with follow-up."}
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {(isMember || isOrganizer) ? (
                               <Tabs defaultValue="believers">
                                    <TabsList className="grid w-full grid-cols-2 mb-4 h-10">
                                        <TabsTrigger value="believers" className="text-xs sm:text-sm">Believers ({loadingMembers ? '...' : members?.length || 0})</TabsTrigger>
                                        <TabsTrigger value="souls" className="text-xs sm:text-sm">Converts ({soulsLoading ? '...' : assignedSouls?.length || 0})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="believers">
                                        {loadingMembers ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : members && members.length > 0 ? (
                                            <div className="space-y-3">
                                                {members.map(member => (
                                                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-[10px]">{member.firstName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate text-sm">{member.firstName} {member.lastName}</p>
                                                        </div>
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="View Profile">
                                                            <Link href={`/dashboard/profile/${member.userId}`}><User className="h-4 w-4" /></Link>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-10 italic">No other believers joined yet.</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="souls">
                                        {soulsLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : assignedSouls && assignedSouls.length > 0 ? (
                                            <div className="space-y-3">
                                                {assignedSouls.map(soul => (
                                                    <div key={soul.id} className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/10">
                                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                            <Heart className="h-5 w-5 text-primary fill-current" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate text-sm">{soul.firstName} {soul.lastName}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">{soul.status}</p>
                                                        </div>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            className="h-8 text-xs font-bold"
                                                            onClick={() => {
                                                                setSelectedSoul(soul);
                                                                setIsSoulDetailsOpen(true);
                                                            }}
                                                        >
                                                            Details
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                                <p className="text-sm text-muted-foreground italic px-4">No converts assigned to this group yet.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                               </Tabs>
                           ) : (
                               <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                   <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                                   <p className="text-sm text-muted-foreground italic px-6">Join this fellowship to collaborate on follow-up and view the member directory.</p>
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6 pb-12 lg:pb-0">
                    {(isMember || isOrganizer) && (
                        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                    <MessagesSquare className="h-5 w-5 text-primary" /> Group Chat
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {fellowship.hasGroupChat ? (
                                    <Button onClick={() => router.push(`/dashboard/chats/${fellowshipId}`)} className="w-full h-11 font-bold">
                                        Open Conversation
                                    </Button>
                                ) : isOrganizer ? (
                                    <Button 
                                        onClick={handleStartGroupChat} 
                                        disabled={isChatLoading || !members || members.length < 2} 
                                        className="w-full h-11 font-bold"
                                    >
                                        {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Initialize Chat
                                    </Button>
                                ) : (
                                    <p className="text-xs sm:text-sm text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg px-4 leading-relaxed">
                                        The organizer has not started the group chat yet.
                                    </p>
                                )}
                                {isOrganizer && !fellowship.hasGroupChat && (!members || members.length < 2) && (
                                    <p className="text-[10px] text-muted-foreground mt-3 text-center leading-tight">
                                        At least 2 members are required to start a group chat.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Calendar className="h-5 w-5"/> Gathering Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 text-sm">
                            {fellowship.schedule && (
                                <div className="p-3 rounded-lg bg-muted/30 border">
                                    <p className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Schedule</p>
                                    <p className="text-foreground font-medium">{fellowship.schedule}</p>
                                </div>
                            )}
                            {fellowship.location && (
                                <div className="p-3 rounded-lg bg-muted/30 border">
                                    <p className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Area</p>
                                    <p className="text-foreground font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {fellowship.location}</p>
                                </div>
                            )}
                            
                            {(isMember || isOrganizer) && fellowship.streamUrl && (
                                <Button asChild className="w-full h-11 font-bold">
                                    <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                        Gather Online
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base sm:text-lg">Organizer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={isOrganizer ? '/dashboard/profile' : `/dashboard/profile/${fellowship.organizerId}`} className="flex items-center gap-3 group bg-muted/20 p-3 rounded-lg border transition-colors hover:bg-muted/40">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarFallback className="text-xs">{fellowship.organizerName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <span className="font-bold text-sm group-hover:underline truncate block">
                                        {fellowship.organizerName}
                                    </span>
                                    {isOrganizer && <span className="text-[10px] font-bold text-primary uppercase">You</span>}
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isMobile ? (
              <Sheet open={isSoulDetailsOpen} onOpenChange={setIsSoulDetailsOpen}>
                  <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                      <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-2xl font-black font-headline">Journey Details</SheetTitle>
                            <SheetDescription className="text-sm font-medium">Tracking the spiritual growth of this convert.</SheetDescription>
                        </SheetHeader>
                      </div>
                      <ScrollArea className="flex-grow min-h-0 px-8">
                        {soulDetailsContent}
                      </ScrollArea>
                  </SheetContent>
              </Sheet>
            ) : (
              <Dialog open={isSoulDetailsOpen} onOpenChange={setIsSoulDetailsOpen}>
                  <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
                      <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold font-headline">Journey Details</DialogTitle>
                            <DialogDescription className="text-sm">Track growth and record collaborative follow-up.</DialogDescription>
                        </DialogHeader>
                      </div>
                      <ScrollArea className="flex-grow min-h-0 px-6">
                        {soulDetailsContent}
                      </ScrollArea>
                  </DialogContent>
              </Dialog>
            )}

            <LogFollowUpDialog 
                soul={selectedSoul}
                isOpen={isLogFollowUpOpen}
                onOpenChange={setIsLogFollowUpOpen}
                onFollowUpLogged={() => {
                    setIsLogFollowUpOpen(false);
                }}
                userProfile={userProfile}
            />
        </div>
    );
}
