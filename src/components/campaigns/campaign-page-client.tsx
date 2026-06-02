'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Campaign, UserProfile, CampaignParticipant, Testimony } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { doc, updateDoc, serverTimestamp, collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, CalendarDays, Share2, Edit, UserCheck, PlayCircle, Users, Heart, Newspaper, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parse } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { JoinCampaignDialog } from './join-campaign-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

export default function CampaignPageClient({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isTestimonyOpen, setIsTestimonyOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const campaignDocRef = useMemo(() => (firestore ? doc(firestore, 'campaigns', campaignId) : null), [firestore, campaignId]);
    const { data: campaign, loading: campaignLoading, error: campaignError } = useDoc<Campaign>(campaignDocRef);

    const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const joinedCampaignQuery = useMemo(() => {
        if (!user?.uid || !firestore || !campaignId) return null;
        return doc(firestore, 'users', user.uid, 'joinedCampaigns', campaignId);
    }, [user?.uid, firestore, campaignId]);
    const { data: joinedInfo } = useDoc(joinedCampaignQuery);

    const isOwner = useMemo(() => user?.uid === campaign?.organizerId, [user, campaign]);
    const isJoined = !!joinedInfo || isOwner;

    const participantsQuery = useMemo(() => {
        if (!firestore || !campaignId || !isJoined) return null;
        return query(collection(firestore, 'campaigns', campaignId, 'participants'));
    }, [firestore, campaignId, isJoined]);
    const { data: rawParticipants, loading: participantsLoading } = useCollection<CampaignParticipant>(participantsQuery);

    const participants = useMemo(() => {
        if (!rawParticipants) return [];
        return [...rawParticipants].sort((a, b) => {
            const timeA = safeToDate(a.joinedAt)?.getTime() ?? 0;
            const timeB = safeToDate(b.joinedAt)?.getTime() ?? 0;
            return timeB - timeA;
        });
    }, [rawParticipants]);

    const testimoniesQuery = useMemo(() => {
        if (!firestore || !campaignId) return null;
        return query(collection(firestore, 'testimonies'), where('campaignId', '==', campaignId));
    }, [firestore, campaignId]);
    const { data: rawTestimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

    const testimonies = useMemo(() => {
        if (!rawTestimonies) return [];
        return [...rawTestimonies].sort((a, b) => {
            const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
            const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
            return timeB - timeA;
        });
    }, [rawTestimonies]);

    const loading = campaignLoading || profileLoading || participantsLoading || testimoniesLoading;

    const dateString = useMemo(() => {
        const start = safeToDate(campaign?.startDate);
        const end = safeToDate(campaign?.endDate);
        if (start && end) {
            if (isSameDay(start, end)) return format(start, "PPP");
            return `${format(start, "PPP")} - ${format(end, "PPP")}`;
        }
        return "Date not set";
    }, [campaign]);

    const timeString = useMemo(() => {
        if (campaign?.startTime && campaign?.endTime) {
            try {
              const start = parse(campaign.startTime, 'HH:mm', new Date());
              const end = parse(campaign.endTime, 'HH:mm', new Date());
              return `${format(start, 'p')} - ${format(end, 'p')}`;
            } catch (e) {
              return `${campaign.startTime} - ${campaign.endTime}`;
            }
        }
        return "Time not set";
    }, [campaign]);

    const handleDeleteCampaign = async () => {
      if (!campaignToDelete || !user || !firestore) return;
      setIsDeleting(true);
      const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
      const deleteData = { status: 'deleted', deletedAt: serverTimestamp() };
      try {
          await updateDoc(campaignRef, deleteData);
          toast({ title: 'Campaign Deleted' });
          router.push('/dashboard/campaigns');
      } catch (error) {
          const permissionError = new FirestorePermissionError({ path: campaignRef.path, operation: 'update' }, user);
          errorEmitter.emit('permission-error', permissionError);
      } finally { setIsDeleting(false); }
    };

    const handleShare = async () => {
        if (!campaign) return;
        const shareUrl = `${window.location.origin}/dashboard/campaigns/${campaign.id}`;
        const titleText = `Join the '${campaign.title}' campaign on Testify!`;
        const text = `Join me in the '${campaign.title}' evangelism campaign. Let's make an impact together!`;

        const shareData = {
          title: titleText,
          text,
          url: shareUrl,
        };

        try {
          if (navigator && navigator.share) {
            await navigator.share(shareData);
          } else {
            throw new Error('Native share not supported');
          }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            
            try {
              await navigator.clipboard.writeText(`${titleText} ${shareUrl}`);
              toast({ title: 'Link Copied!', description: 'Campaign link has been copied to your clipboard.' });
            } catch (clipErr) {
              console.error("Clipboard fallback failed", clipErr);
            }
        }
    };
    
    const status = useMemo(() => {
        const now = new Date();
        const startDate = safeToDate(campaign?.startDate);
        const endDate = safeToDate(campaign?.endDate);
        if (!startDate || !endDate) return "Past";
        const endDateTime = new Date(endDate);
        if (campaign?.endTime) {
            const [h, m] = campaign.endTime.split(':').map(Number);
            endDateTime.setHours(h, m, 59);
        }
        if (endDateTime < now) return "Past";
        const startDateTime = new Date(startDate);
        if (campaign?.startTime) {
            const [h, m] = campaign.startTime.split(':').map(Number);
            startDateTime.setHours(h, m, 0);
        }
        return startDateTime > now ? "Upcoming" : "Ongoing";
    }, [campaign]);

    if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin text-primary" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') return <div className="text-center p-12"><Loader2 className="mx-auto h-12 w-12 opacity-20" /><h2 className="mt-4 text-xl font-bold">Campaign Not Found</h2><Button asChild variant="outline" className="mt-4"><Link href="/dashboard/campaigns">Return to Campaigns</Link></Button></div>;

    return (
        <div className="space-y-8 pb-32">
            <div className="flex items-center gap-4 px-4 sm:px-0">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="h-5 w-5"/>
                    <span className="sr-only">Back</span>
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight truncate leading-tight">{campaign.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'} className="uppercase font-bold tracking-widest text-[10px]">
                            {status}
                        </Badge>
                        {campaign.goal && <span className="text-xs text-muted-foreground font-medium">• {campaign.goal}</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-muted/20">
                        <CardHeader className="p-6 sm:p-8">
                            <CardTitle className="text-lg font-bold uppercase tracking-widest text-muted-foreground">About this Mission</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 sm:px-8 pb-8">
                            <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                {campaign.description}
                            </p>
                            {campaign.scripture && (
                                <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 relative">
                                    <span className="absolute -top-3 left-6 bg-background px-3 text-[10px] font-black text-primary uppercase tracking-[0.2em]">Inspiration</span>
                                    <p className="italic text-base sm:text-lg text-primary font-serif leading-relaxed">&ldquo;{campaign.scriptureTestimony || campaign.scripture}&rdquo;</p>
                                    <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest">— {campaign.scripture}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-0">
                        <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-bold text-foreground">{campaign.location}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-tighter">Physical Meeting Point</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <p className="text-sm font-bold text-foreground">{dateString}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase">{timeString}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden">
                        <CardHeader className="p-6">
                            <CardTitle className="flex items-center justify-between text-lg font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    Participants Directory
                                </span>
                                <Badge variant="secondary" className="rounded-full px-3 h-6 font-bold">{participants?.length || 0}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            {!isJoined ? (
                                <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed">
                                    <p className="text-sm text-muted-foreground px-8 leading-relaxed italic">Join this campaign to connect with fellow laborers in the field.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {participantsLoading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 opacity-20" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {participants?.map(p => (
                                                <Link key={p.id} href={`/dashboard/profile/${p.userId}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5 hover:bg-muted/10 transition-colors">
                                                    <Avatar className="h-8 w-8 border shadow-sm">
                                                        <AvatarImage src={p.photoURL} />
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{p.firstName?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate leading-tight">{p.firstName} {p.lastName}</p>
                                                        {p.userId === campaign.organizerId && <span className="text-[8px] font-black uppercase text-primary tracking-widest">Organizer</span>}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-4 sm:px-0">
                             <h3 className="text-xl font-black font-headline uppercase tracking-tight flex items-center gap-2">
                                <Newspaper className="h-5 w-5 text-primary" />
                                Campaign Testimonies
                             </h3>
                        </div>
                        {testimoniesLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 opacity-20" /></div>
                        ) : (
                            <div className="flex flex-col gap-0 w-full max-w-2xl mx-auto -mx-4 sm:mx-auto">
                                {testimonies && testimonies.length > 0 ? (
                                    testimonies.map(t => (
                                        <TestimonyCard 
                                            key={t.id} 
                                            testimony={t} 
                                            onDelete={() => {}} 
                                            onEdit={() => {}} 
                                            currentUserProfile={userProfile}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed mx-4 sm:mx-0">
                                        <Newspaper className="h-12 w-12 text-muted-foreground/10 mx-auto mb-4" />
                                        <p className="text-sm text-muted-foreground font-medium px-8 italic">No testimonies shared yet. Be the first to record God's work here!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8 flex flex-col px-4 sm:px-0">
                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-xl border-none bg-primary text-primary-foreground order-first sm:order-none">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-black uppercase tracking-[0.2em] opacity-80">Campaign Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {!isJoined && status !== 'Past' && (
                                <Button className="w-full h-12 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-lg" onClick={() => setIsJoinDialogOpen(true)}>
                                    JOIN MISSION
                                </Button>
                            )}

                            {isJoined && status === 'Ongoing' && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20" onClick={() => setIsLogSoulOpen(true)}>
                                    <UserCheck className="mr-2 h-5 w-5" />
                                    LOG SOUL WON
                                </Button>
                            )}
                            
                            {isJoined && (status === 'Ongoing' || status === 'Past') && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20" onClick={() => setIsTestimonyOpen(true)}>
                                    <Newspaper className="mr-2 h-5 w-5" />
                                    SHARE VICTORY
                                </Button>
                            )}
                            
                            {isOwner && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-black/10 text-white hover:bg-black/20 border-white/10" onClick={() => setIsManageOpen(true)}>
                                    <Edit className="mr-2 h-5 w-5" />
                                    MANAGE MISSION
                                </Button>
                            )}

                            <Button variant="ghost" className="w-full h-11 text-white hover:bg-white/10 font-bold" onClick={handleShare}>
                                <Share2 className="mr-2 h-4 w-4" />
                                SHARE MISSION
                            </Button>

                            {status === 'Ongoing' && campaign.streamUrl && (
                                <Button asChild variant="secondary" className="w-full h-12 rounded-2xl bg-zinc-950 text-white hover:bg-black font-black">
                                    <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                                        <PlayCircle className="mr-2 h-5 w-5 text-primary" />
                                        WATCH LIVE
                                    </Link>
                                </Button>
                            )}
                            
                            {status === 'Past' && (
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Mission Concluded</p>
                                    <p className="text-xs mt-1 font-medium italic">&ldquo;Well done, good and faithful servant.&rdquo;</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Organizer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={isOwner ? '/dashboard/profile' : `/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-4 group p-3 -mx-3 rounded-2xl hover:bg-muted/50 transition-colors">
                                <Avatar className="h-12 w-12 border-2 border-primary/20">
                                    <AvatarFallback className="font-black text-lg">{campaign.organizerFirstName?.charAt(0)}{campaign.organizerLastName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <span className="font-black text-base group-hover:text-primary transition-colors block leading-tight">
                                        {campaign.organizerFirstName} {campaign.organizerLastName}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mission Leader</span>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Heart className="h-4 w-4 text-primary" />
                                Harvest Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-baseline justify-between">
                                <span className="text-4xl font-black text-primary">{campaign.soulsLogged || 0}</span>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Souls Won</span>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-xl border border-dashed flex items-start gap-3">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-[10px] leading-relaxed text-muted-foreground font-medium uppercase tracking-tighter">Every soul logged contributes to the global harvest map and city impact stats.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
                    <div className="p-6 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold font-headline">Log Harvest</DialogTitle>
                            <DialogDescription className="text-sm">Record a soul won during "{campaign.title}".</DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="p-6">
                            <LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={[]} campaigns={[]} defaultCampaign={campaign} />
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isTestimonyOpen} onOpenChange={setIsTestimonyOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
                    <div className="p-6 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold font-headline">Share Victory</DialogTitle>
                            <DialogDescription className="text-sm">What miracles occurred during "{campaign.title}"?</DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="p-6">
                            {userProfile && <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={() => setIsTestimonyOpen(false)} campaign={campaign} />}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden">
                    <div className="p-6 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold font-headline">Manage Mission</DialogTitle>
                            <DialogDescription className="text-sm">Update the details of your active campaign.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[75vh]">
                        <div className="p-6">
                            <ManageCampaignForm 
                                campaign={campaign} 
                                onCampaignUpdated={() => setIsManageOpen(false)} 
                                onDelete={() => { setCampaignToDelete(campaign); setIsManageOpen(false); }} 
                            />
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {userProfile && (
                <JoinCampaignDialog
                  campaign={campaign}
                  userProfile={userProfile}
                  isOpen={isJoinDialogOpen}
                  onOpenChange={setIsJoinDialogOpen}
                  onCampaignJoined={() => {}}
                />
            )}

            {campaignToDelete && (
                <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
                    <AlertDialogContent className="rounded-3xl p-8">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-bold font-headline">Delete Campaign?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                                This will permanently remove "{campaignToDelete.title}" from the platform. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-3">
                            <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-11 font-bold">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-11 font-bold">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Deletion
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
