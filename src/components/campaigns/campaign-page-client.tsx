'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Campaign, UserProfile, CampaignParticipant, Testimony, Fellowship } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, CalendarDays, Edit, UserCheck, PlayCircle, Users, Newspaper, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import Link from 'next/link';
import { safeToDate } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { ScrollArea } from '../ui/scroll-area';

export default function CampaignPageClient({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isTestimonyOpen, setIsTestimonyOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const campaignDocRef = useMemo(() => (firestore && campaignId) ? doc(firestore, 'campaigns', campaignId) : null, [firestore, campaignId]);
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
    const { data: participants, loading: participantsLoading } = useCollection<CampaignParticipant>(participantsQuery);

    const activeFellowshipsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
    }, [firestore]);
    const { data: activeFellowships } = useCollection<Fellowship>(activeFellowshipsQuery);

    const testimoniesQuery = useMemo(() => {
        if (!firestore || !campaignId) return null;
        return query(collection(firestore, 'testimonies'), where('campaignId', '==', campaignId));
    }, [firestore, campaignId]);
    const { data: testimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

    const loading = campaignLoading || profileLoading || participantsLoading || testimoniesLoading;

    const status = useMemo(() => {
        const now = new Date();
        const start = safeToDate(campaign?.startDate);
        const end = safeToDate(campaign?.endDate);
        if (!start || !end) return "Past";
        if (end < now) return "Past";
        return start > now ? "Upcoming" : "Ongoing";
    }, [campaign]);

    const handleDeleteCampaign = async () => {
        if (!campaignToDelete || !user || !firestore) return;
        setIsDeleting(true);
        const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
        const deleteData = { status: 'deleted', deletedAt: serverTimestamp() };
        try {
            await updateDoc(campaignRef, deleteData);
            toast({ title: 'Campaign Deleted' });
            setCampaignToDelete(null);
            router.push('/dashboard/campaigns');
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: campaignRef.path, operation: 'update' }, user));
        } finally { setIsDeleting(false); }
    };

    if (loading || !mounted) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin text-primary" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') return <div className="text-center p-12"><h2 className="text-xl font-bold text-left">Campaign Not Found</h2><Button asChild variant="outline" className="mt-4"><Link href="/dashboard/campaigns">Return to Campaigns</Link></Button></div>;

    return (
        <div className="space-y-8 pb-32">
            <div className="flex items-center gap-4 px-4 sm:px-0">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full border bg-background shadow-sm">
                    <ArrowLeft className="h-5 w-5"/>
                </Button>
                <div className="min-w-0 flex-1 text-left">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline tracking-tight leading-tight truncate uppercase">{campaign.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={status === 'Ongoing' ? 'default' : 'outline'} className="uppercase font-bold tracking-widest text-[10px]">
                            {status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 truncate">• {campaign.goal}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-none sm:rounded-[2rem] border-none shadow-sm bg-muted/20">
                        <CardHeader className="p-8 text-left">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground">About this Mission</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium text-left">{campaign.description}</p>
                            {campaign.scripture && (
                                <div className="mt-8 p-6 bg-primary/5 rounded-[1.5rem] border-2 border-dashed border-primary/20 relative">
                                    <Quote className="absolute top-2 right-4 h-8 w-8 opacity-5" />
                                    <p className="italic text-base sm:text-lg text-primary font-serif leading-relaxed text-left text-balance">&ldquo;{campaign.scriptureTestimony || campaign.scripture}&rdquo;</p>
                                    <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest">— {campaign.scripture}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 sm:px-0">
                        <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                            <CardHeader className="pb-3 text-left">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                    <MapPin className="h-4 w-4 text-primary" /> Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-left">
                                <p className="text-sm font-bold truncate uppercase">{campaign.location}</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                            <CardHeader className="pb-3 text-left">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                                    <CalendarDays className="h-4 w-4 text-primary" /> Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-left">
                                <p className="text-sm font-bold">Starts {format(safeToDate(campaign.startDate)!, 'PPP')}</p>
                                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">{campaign.startTime} - {campaign.endTime}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden mx-4 sm:mx-0">
                        <CardHeader className="p-8 border-b bg-muted/5 text-left">
                            <CardTitle className="flex items-center justify-between text-lg font-black uppercase tracking-tight">
                                <span className="flex items-center gap-2 text-left"><Users className="h-5 w-5 text-primary" /> Participants</span>
                                <Badge variant="secondary" className="rounded-full px-3 h-6 font-bold">{participants?.length || 0}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {participants?.map(p => (
                                    <Link key={p.id} href={`/dashboard/profile/${p.userId}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5 hover:bg-muted/10 transition-all">
                                        <Avatar className="h-9 w-9 border shadow-sm"><AvatarImage src={p.photoURL} /><AvatarFallback className="font-bold text-xs">{p.firstName?.charAt(0)}</AvatarFallback></Avatar>
                                        <div className="min-w-0 flex-1 text-left"><p className="font-bold text-sm truncate uppercase tracking-tight">{p.firstName} {p.lastName}</p></div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 px-4 sm:px-0 text-left">
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left"><Newspaper className="h-5 w-5 text-primary" /> Campaign Testimonies</h3>
                        <div className="flex flex-col gap-4 text-left">
                            {testimonies?.map(t => <TestimonyCard key={t.id} testimony={t} onDelete={() => {}} onEdit={() => {}} currentUserProfile={userProfile} />)}
                        </div>
                    </div>
                </div>

                <div className="space-y-8 flex flex-col px-4 sm:px-0 text-left">
                    <Card className="rounded-[2rem] sm:rounded-3xl shadow-xl border-none bg-primary text-primary-foreground">
                        <CardHeader className="pb-4"><CardTitle className="text-base font-black uppercase tracking-[0.2em] opacity-80 text-left">Mission Hub</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {isJoined && status === 'Ongoing' && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20" onClick={() => setIsLogSoulOpen(true)}>
                                    <UserCheck className="mr-2 h-5 w-5" /> LOG SOUL WON
                                </Button>
                            )}
                            {isJoined && (status === 'Ongoing' || status === 'Past') && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20" onClick={() => setIsTestimonyOpen(true)}>
                                    <Newspaper className="mr-2 h-5 w-5" /> SHARE VICTORY
                                </Button>
                            )}
                            {isOwner && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-black/10 text-white hover:bg-black/20 border-white/10" onClick={() => setIsManageOpen(true)}>
                                    <Edit className="mr-2 h-5 w-5" /> MANAGE MISSION
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10">
                        <CardHeader className="pb-3 text-left"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-left">Organizer</CardTitle></CardHeader>
                        <CardContent>
                            <Link href={isOwner ? '/dashboard/profile' : `/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-4 group p-3 -mx-3 rounded-2xl hover:bg-muted/50 transition-all text-left">
                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xl"><AvatarFallback className="font-black">{campaign.organizerFirstName?.charAt(0)}</AvatarFallback></Avatar>
                                <div className="min-w-0 flex-1 text-left"><span className="font-black text-base group-hover:text-primary transition-colors block truncate uppercase">{campaign.organizerFirstName} {campaign.organizerLastName}</span><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Mission Leader</span></div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left">
                    <div className="p-8 border-b bg-muted/10 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black uppercase tracking-tight text-left">Log Harvest</DialogTitle></DialogHeader></div>
                    <ScrollArea className="max-h-[70vh] p-8 text-left"><LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={activeFellowships || []} campaigns={[]} defaultCampaign={campaign} /></ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isTestimonyOpen} onOpenChange={setIsTestimonyOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left">
                    <div className="p-8 border-b bg-muted/10 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black uppercase tracking-tight text-left">Share Victory</DialogTitle></DialogHeader></div>
                    <ScrollArea className="max-h-[70vh] p-8 text-left">{userProfile && <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={() => setIsTestimonyOpen(false)} campaign={campaign} />}</ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left">
                    <div className="p-8 border-b bg-muted/10 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black uppercase tracking-tight text-left">Manage Mission</DialogTitle></DialogHeader></div>
                    <ScrollArea className="max-h-[80vh] p-8 text-left"><ManageCampaignForm campaign={campaign} onCampaignUpdated={() => setIsManageOpen(false)} onDelete={() => { setCampaignToDelete(campaign); setIsManageOpen(false); }} /></ScrollArea>
                </DialogContent>
            </Dialog>

            {campaignToDelete && (
                <AlertDialog open={!!campaignToDelete} onOpenChange={open => !open && setCampaignToDelete(null)}>
                    <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left"><AlertDialogHeader className="text-left"><AlertDialogTitle className="text-2xl font-black uppercase text-left">Delete Campaign?</AlertDialogTitle><AlertDialogDescription className="text-left">This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-3 mt-6 text-left"><AlertDialogCancel className="rounded-xl h-12 font-bold text-left">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold text-left">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
