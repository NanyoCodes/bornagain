'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Fellowship, UserProfile, FellowshipMember, Soul } from '@/lib/types';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { Loader2, ArrowLeft, Users, Calendar, PlayCircle, MapPin, UserCheck2, Heart, Phone, Mail, Church, History, PlusCircle, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

function SoulWinnerInfo({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const winnerRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: winnerProfile, loading } = useDoc<UserProfile>(winnerRef);

    if (loading) return <Skeleton className="h-4 w-24" />;
    if (!winnerProfile) return <span className="text-muted-foreground">Original winner unknown</span>;

    return (
        <Link href={`/dashboard/profile/${userId}`} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            <Award className="h-3 w-3" />
            {winnerProfile.firstName} {winnerProfile.lastName}
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
    const { data: members, loading: membersLoading } = useCollection<FellowshipMember>(membersQuery);

    const soulsQuery = useMemo(() => {
        if (!firestore || !fellowshipId || !(isMember || isOrganizer)) return null;
        return query(collection(firestore, 'souls'), where('fellowshipId', '==', fellowshipId));
    }, [firestore, fellowshipId, isMember, isOrganizer]);
    const { data: assignedSouls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

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
                <p className="mt-2 text-sm text-muted-foreground">
                   This group may have been removed or the link is incorrect.
                </p>
                <Button asChild variant="outline" className="mt-6">
                    <Link href="/dashboard/fellowship"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
                </Button>
            </div>
        );
    }

    const soulDetailsContent = selectedSoul ? (
      <div className="space-y-6 pt-4 pb-12 sm:pb-6">
          <div className="flex items-center gap-4 border rounded-lg p-4 bg-muted/20">
              <Avatar className="h-14 w-14 border-2">
                  <AvatarFallback className="text-lg">{selectedSoul.firstName?.charAt(0)}{selectedSoul.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold font-headline truncate">{selectedSoul.firstName} {selectedSoul.lastName}</h3>
                  <Badge className="mt-1" variant="secondary">{selectedSoul.status}</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => setIsLogFollowUpOpen(true)} size="icon" variant="outline" className="shrink-0">
                            <PlusCircle className="h-4 w-4" />
                            <span className="sr-only">Log Follow-up</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Log Follow-up</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </div>

          <div className="grid gap-6">
              <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Context & Accountability</h4>
                  <div className="space-y-2">
                      <div className="text-sm flex items-center gap-2">
                          <span className="font-medium text-muted-foreground shrink-0">Won By:</span>
                          <SoulWinnerInfo userId={selectedSoul.userId} />
                      </div>
                      {selectedSoul.email && (
                          <div className="flex items-center gap-3 text-sm">
                              <Mail className="h-4 w-4 text-primary" />
                              <a href={`mailto:${selectedSoul.email}`} className="hover:underline truncate">{selectedSoul.email}</a>
                          </div>
                      )}
                      {selectedSoul.phone && (
                          <div className="flex items-center gap-3 text-sm">
                              <Phone className="h-4 w-4 text-primary" />
                              <a href={`tel:${selectedSoul.phone}`} className="hover:underline">{selectedSoul.phone}</a>
                          </div>
                      )}
                      {selectedSoul.church && (
                          <div className="flex items-start gap-3 text-sm">
                              <Church className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="leading-tight">Attends: {selectedSoul.church}</span>
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <History className="h-4 w-4" /> Collective Follow-up History
                  </h4>
                  <div className="border rounded-lg bg-muted/10 overflow-hidden">
                      {selectedSoul.followUpLog && selectedSoul.followUpLog.length > 0 ? (
                          <div className="divide-y max-h-60 overflow-y-auto">
                              {[...selectedSoul.followUpLog].reverse().map((log, i) => {
                                  const date = safeToDate(log.date);
                                  return (
                                      <div key={i} className="p-3 text-xs space-y-1 bg-background/50">
                                          <div className="flex justify-between items-center text-muted-foreground">
                                              <span className="font-semibold">{date ? format(date, 'PPP') : 'N/A'}</span>
                                              {log.memberName && (
                                                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full border">By {log.memberName}</span>
                                              )}
                                          </div>
                                          {log.actions && log.actions.length > 0 && (
                                              <div className="flex flex-wrap gap-1 py-1">
                                                  {log.actions.map(id => {
                                                      const action = actionItems.find(a => a.id === id);
                                                      return action ? <Badge key={id} variant="outline" className="text-[9px] px-1 h-4 font-normal">{action.label}</Badge> : null;
                                                  })}
                                              </div>
                                          )}
                                          {log.note && <p className="italic text-muted-foreground leading-relaxed">&ldquo;{log.note}&rdquo;</p>}
                                      </div>
                                  );
                              })}
                          </div>
                      ) : (
                          <p className="text-center py-8 text-sm text-muted-foreground italic">No shared interactions yet.</p>
                      )}
                  </div>
              </div>
          </div>
      </div>
    ) : null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Button variant="outline" onClick={() => router.back()} className="w-fit">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back
            </Button>

            <header className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold font-headline">{fellowship.name}</h1>
                <p className="text-lg text-muted-foreground">{fellowship.description}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" /> Member Directory
                            </CardTitle>
                             <CardDescription>
                                {isMember || isOrganizer 
                                    ? "Collaborative view of members and converts." 
                                    : "Join to access the directory and help with follow-up."}
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           {(isMember || isOrganizer) ? (
                               <Tabs defaultValue="believers">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="believers">Believers ({members?.length || 0})</TabsTrigger>
                                        <TabsTrigger value="souls">Converts ({assignedSouls?.length || 0})</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="believers">
                                        {membersLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : members && members.length > 0 ? (
                                            <div className="space-y-4">
                                                {members.map(member => (
                                                    <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                                                        <Avatar>
                                                            <AvatarImage src={member.photoURL} />
                                                            <AvatarFallback>{member.firstName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate">{member.firstName} {member.lastName}</p>
                                                        </div>
                                                        <Button asChild variant="ghost" size="sm">
                                                            <Link href={`/dashboard/profile/${member.userId}`}>Profile</Link>
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">No other believers joined yet.</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="souls">
                                        {soulsLoading ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : assignedSouls && assignedSouls.length > 0 ? (
                                            <div className="space-y-4">
                                                {assignedSouls.map(soul => (
                                                    <div key={soul.id} className="flex items-center gap-4 p-3 rounded-lg border bg-primary/5 border-primary/10">
                                                        <Avatar>
                                                            <AvatarFallback><Heart className="h-4 w-4 text-primary" /></AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate">{soul.firstName} {soul.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">Status: <span className="font-medium text-primary">{soul.status}</span></p>
                                                        </div>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
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
                                            <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                                <p className="text-sm text-muted-foreground italic">No converts assigned to this group yet.</p>
                                            </div>
                                        )}
                                    </TabsContent>
                               </Tabs>
                           ) : (
                               <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                                   <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                                   <p className="text-sm text-muted-foreground italic">Join this fellowship to collaborate on follow-up and view the member directory.</p>
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5"/> Gathering Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {fellowship.schedule && (
                                <div>
                                    <p className="font-semibold">Schedule</p>
                                    <p className="text-muted-foreground">{fellowship.schedule}</p>
                                </div>
                            )}
                            {fellowship.location && (
                                <div>
                                    <p className="font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> Area</p>
                                    <p className="text-muted-foreground">{fellowship.location}</p>
                                </div>
                            )}
                            {(isMember || isOrganizer) && fellowship.streamUrl && (
                                <Button asChild className="w-full mt-2">
                                    <Link href={fellowship.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Gather Online
                                    </Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {isMobile ? (
              <Sheet open={isSoulDetailsOpen} onOpenChange={setIsSoulDetailsOpen}>
                  <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
                      <div className="p-6 border-b flex-shrink-0">
                        <SheetHeader className="text-left">
                            <SheetTitle>Convert Journey Details</SheetTitle>
                            <SheetDescription>Track growth and record collaborative follow-up.</SheetDescription>
                        </SheetHeader>
                      </div>
                      <ScrollArea className="flex-grow min-h-0 px-6">
                        {soulDetailsContent}
                      </ScrollArea>
                  </SheetContent>
              </Sheet>
            ) : (
              <Dialog open={isSoulDetailsOpen} onOpenChange={setIsSoulDetailsOpen}>
                  <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
                      <div className="p-6 border-b flex-shrink-0">
                        <DialogHeader>
                            <DialogTitle>Convert Journey Details</DialogTitle>
                            <DialogDescription>Track growth and record collaborative follow-up.</DialogDescription>
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
