'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection, useUserProfile } from '@/firebase';
import type { Campaign, UserProfile, CampaignParticipant, Testimony, Fellowship, AccountabilityRequest, Soul } from '@/lib/types';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    ArrowLeft, 
    MapPin, 
    CalendarDays, 
    Edit, 
    UserCheck, 
    PlayCircle, 
    Users, 
    Newspaper, 
    Quote, 
    Target, 
    UserPlus, 
    Sparkles, 
    BarChart3,
    Activity,
    Heart,
    ChevronRight,
    Search,
    Globe
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import Link from 'next/link';
import { safeToDate, haversineDistance } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';

export default function CampaignPageClient({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isTestimonyOpen, setIsTestimonyOpen] = useState(false);
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
        return query(
            collection(firestore, 'testimonies'), 
            where('campaignId', '==', campaignId)
        );
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

    const campaignSoulsQuery = useMemo(() => {
        if (!firestore || !campaignId) return null;
        return query(collection(firestore, 'souls'), where('campaignId', '==', campaignId));
    }, [firestore, campaignId]);
    const { data: rawCampaignSouls, loading: soulsLoading } = useCollection<Soul>(campaignSoulsQuery);

    const campaignSouls = useMemo(() => {
        if (!rawCampaignSouls) return [];
        return [...rawCampaignSouls].sort((a, b) => {
            const timeA = safeToDate(a.wonAt)?.getTime() ?? 0;
            const timeB = safeToDate(b.wonAt)?.getTime() ?? 0;
            return timeB - timeA;
        });
    }, [rawCampaignSouls]);

    // Insights Analysis
    const demographics = useMemo(() => {
        if (!campaignSouls) return null;
        const stats = {
            total: campaignSouls.length,
            gender: { male: 0, female: 0 },
            age: { children: 0, teens: 0, youngAdults: 0, adults: 0, seniors: 0, unknown: 0 }
        };

        campaignSouls.forEach(s => {
            // Gender
            if (s.gender === 'Male') stats.gender.male++;
            else if (s.gender === 'Female') stats.gender.female++;

            // Age
            const age = s.age;
            if (age === null || age === undefined) stats.age.unknown++;
            else if (age <= 12) stats.age.children++;
            else if (age <= 19) stats.age.teens++;
            else if (age <= 33) stats.age.youngAdults++;
            else if (age <= 55) stats.age.adults++;
            else stats.age.seniors++;
        });

        return stats;
    }, [campaignSouls]);

    const partnerIds = useMemo(() => new Set(userProfile?.partnerIds || []), [userProfile?.partnerIds]);

    const requestsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return query(
        collection(firestore, 'accountabilityRequests'),
        where('participantIds', 'array-contains', user.uid),
        where('status', '==', 'pending')
      );
    }, [user, firestore]);
    const { data: accountabilityRequests } = useCollection<AccountabilityRequest>(requestsQuery);

    const pendingRequestIds = useMemo(() => {
      if (!accountabilityRequests) return new Set<string>();
      return new Set(
          accountabilityRequests
              .flatMap(r => r.participantIds)
              .filter(id => id !== user?.uid)
      );
    }, [accountabilityRequests, user?.uid]);

    const loading = campaignLoading || profileLoading || participantsLoading || testimoniesLoading || soulsLoading;

    const status = useMemo(() => {
        const now = new Date();
        const start = safeToDate(campaign?.startDate);
        const end = safeToDate(campaign?.endDate);
        if (!start || !end) return "Past";
        if (end < now) return "Past";
        return start > now ? "Upcoming" : "Ongoing";
    }, [campaign]);

    if (loading || !mounted) return <div className="flex items-center justify-center h-full py-20 text-left"><Loader2 className="animate-spin text-primary text-left" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') return <div className="text-center p-12 text-left"><h2 className="text-xl font-bold text-left">Campaign Not Found</h2><Button asChild variant="outline" className="mt-4 text-left"><Link href="/campaigns" className="text-left">Return to Campaigns</Link></Button></div>;

    return (
        <div className="space-y-8 pb-32 max-w-6xl mx-auto text-left">
            <div className="flex items-center gap-4 px-4 sm:px-0 pt-4 text-left">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full border bg-background shadow-sm text-left">
                    <ArrowLeft className="h-5 w-5 text-left"/>
                </Button>
                <div className="min-w-0 flex-1 text-left">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline tracking-tight leading-tight truncate uppercase text-balance text-left">{campaign.title}</h1>
                    <div className="flex items-center gap-2 mt-1 text-left">
                        <Badge variant={status === 'Ongoing' ? 'default' : 'outline'} className="uppercase font-bold tracking-widest text-[10px] text-left">
                            {status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 truncate text-left">• {campaign.goal}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                <div className="lg:col-span-2 space-y-8 text-left">
                    <Card className="rounded-none sm:rounded-[2rem] border-none shadow-sm bg-muted/20 text-left">
                        <CardHeader className="p-8 text-left text-left">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground text-left text-left">About this Mission</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 text-left text-left">
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium text-left text-left">{campaign.description}</p>
                            {campaign.scripture && (
                                <div className="mt-8 p-6 bg-primary/5 rounded-[1.5rem] border-2 border-dashed border-primary/20 relative text-left">
                                    <Quote className="absolute top-2 right-4 h-8 w-8 opacity-5 text-left text-left" />
                                    <p className="italic text-base sm:text-lg text-primary font-serif leading-relaxed text-left text-balance text-left text-left">&ldquo;{campaign.scriptureTestimony || campaign.scripture}&rdquo;</p>
                                    <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest text-left text-left">— {campaign.scripture}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-6 px-4 sm:px-0 text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner text-left text-left text-left">
                                <BarChart3 className="h-5 w-5 text-indigo-600 text-left text-left" />
                            </div>
                            <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Kingdom Insights</h3>
                        </div>

                        {demographics ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left text-left">
                                <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-indigo-500/10 text-left text-left">
                                    <CardHeader className="p-6 pb-3 text-left text-left">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left text-left">
                                            <Users className="h-3.5 w-3.5 text-left text-left" /> Gender Distribution
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-4 text-left text-left">
                                        {[
                                            { label: 'Male', count: demographics.gender.male, color: 'bg-blue-500' },
                                            { label: 'Female', count: demographics.gender.female, color: 'bg-rose-500' }
                                        ].map(g => (
                                            <div key={g.label} className="space-y-1.5 text-left text-left text-left">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-left text-left text-left">
                                                    <span className="text-left text-left">{g.label}</span>
                                                    <span className="text-foreground text-left text-left">{g.count}</span>
                                                </div>
                                                <Progress value={(g.count / (demographics.total || 1)) * 100} className="h-1.5 text-left text-left" indicatorClassName={g.color} />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="rounded-3xl border shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-b-8 border-b-indigo-500/10 text-left text-left">
                                    <CardHeader className="p-6 pb-3 text-left text-left">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left text-left">
                                            <Activity className="h-3.5 w-3.5 text-left text-left" /> Age Groups
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-4 text-left text-left">
                                        {[
                                            { label: 'Young Adults', count: demographics.age.youngAdults, color: 'bg-primary' },
                                            { label: 'Adults', count: demographics.age.adults, color: 'bg-indigo-600' },
                                            { label: 'Others', count: demographics.total - demographics.age.youngAdults - demographics.age.adults, color: 'bg-muted' }
                                        ].map(a => (
                                            <div key={a.label} className="space-y-1.5 text-left text-left text-left">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-left text-left text-left">
                                                    <span className="text-left text-left">{a.label}</span>
                                                    <span className="text-foreground text-left text-left">{a.count}</span>
                                                </div>
                                                <Progress value={(a.count / (demographics.total || 1)) * 100} className="h-1.5 text-left text-left" indicatorClassName={a.color} />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-muted/10 rounded-[2rem] border-2 border-dashed text-left text-left">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/20 mx-auto mb-3 text-left text-left" />
                                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest text-center text-left text-left">Crunching Harvest Data...</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 sm:px-0 text-left text-left">
                        <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 text-left text-left text-left">
                            <CardHeader className="pb-3 text-left text-left text-left text-left text-left">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground text-left text-left text-left">
                                    <MapPin className="h-4 w-4 text-primary text-left text-left text-left" /> Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-left text-left">
                                <p className="text-sm font-bold truncate uppercase text-left text-left">{campaign.location}</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 text-left text-left text-left">
                            <CardHeader className="pb-3 text-left text-left text-left text-left text-left">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground text-left text-left text-left">
                                    <CalendarDays className="h-4 w-4 text-primary text-left text-left text-left" /> Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-left text-left">
                                <p className="text-sm font-bold text-left text-left">Starts {format(safeToDate(campaign.startDate)!, 'PPP')}</p>
                                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1 text-left text-left">{campaign.startTime} - {campaign.endTime}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden mx-4 sm:mx-0 text-left text-left">
                        <CardHeader className="p-8 border-b bg-muted/5 text-left text-left">
                            <CardTitle className="flex items-center justify-between text-lg font-black uppercase tracking-tight text-left text-left text-left">
                                <span className="flex items-center gap-2 text-left text-left text-left"><Users className="h-5 w-5 text-primary text-left text-left text-left" /> Participants</span>
                                <Badge variant="secondary" className="rounded-full px-3 h-6 font-bold text-left text-left">{(participants?.length || 0)}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 text-left text-left">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-left">
                                {participants?.map(p => (
                                    <Link key={p.id} href={`/dashboard/profile/${p.userId}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5 hover:bg-muted/10 transition-all text-left text-left">
                                        <Avatar className="h-9 w-9 border shadow-sm text-left text-left"><AvatarImage src={p.photoURL} className="text-left text-left" /><AvatarFallback className="font-bold text-xs text-left text-left"> {p.firstName?.charAt(0)}</AvatarFallback></Avatar>
                                        <div className="min-w-0 flex-1 text-left text-left text-left text-left text-left text-left"><p className="font-bold text-sm truncate uppercase tracking-tight text-left text-left text-left">{p.firstName} {p.lastName}</p></div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 px-4 sm:px-0 text-left text-left">
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left text-left text-left"><Newspaper className="h-5 w-5 text-primary text-left text-left text-left" /> Campaign Testimonies</h3>
                        <div className="flex flex-col gap-4 text-left text-left">
                            {testimonies.map(t => (
                                <TestimonyCard 
                                    key={t.id} 
                                    testimony={t} 
                                    onDelete={() => {}} 
                                    onEdit={() => {}} 
                                    isPartner={partnerIds.has(t.authorId)}
                                    hasPendingRequest={pendingRequestIds.has(t.authorId)}
                                    currentUserProfile={userProfile} 
                                />
                            ))}
                            {testimonies.length === 0 && (
                                <div className="text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed text-left text-left">
                                    <Newspaper className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3 text-left text-left" />
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center text-left text-left">No shared victories yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8 flex flex-col px-4 sm:px-0 text-left text-left text-left">
                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-xl border-none bg-indigo-600 text-white overflow-hidden text-left text-left">
                        <CardHeader className="pb-4 text-left text-left">
                            <div className="flex items-center justify-between mb-2 text-left text-left">
                                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-left text-left">
                                    <Target className="h-5 w-5 text-white text-left text-left" />
                                </div>
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[9px] uppercase tracking-widest text-left text-left">Live Stats</Badge>
                            </div>
                            <CardTitle className="text-xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Harvest Impact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-left text-left">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/10 text-left text-left">
                                <div className="space-y-1 text-left text-left text-left text-left text-left text-left text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-left text-left">Souls Won</p>
                                    <p className="text-3xl font-black text-left text-left">{campaign.soulsLogged || 0}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-left text-left text-left">
                                    <UserPlus className="h-5 w-5 text-white text-left text-left text-left" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-xl border-none bg-primary text-primary-foreground text-left text-left">
                        <CardHeader className="pb-4 text-left text-left text-left text-left"><CardTitle className="text-base font-black uppercase tracking-[0.2em] opacity-80 text-left text-left text-left text-left">Mission Hub</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-3 text-left text-left">
                            {isJoined && status === 'Ongoing' && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20 text-left text-left" onClick={() => setIsLogSoulOpen(true)}>
                                    <UserCheck className="mr-2 h-5 w-5 text-left text-left" /> LOG SOUL WON
                                </Button>
                            )}
                            {isJoined && (status === 'Ongoing' || status === 'Past') && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20 text-left text-left" onClick={() => setIsTestimonyOpen(true)}>
                                    <Newspaper className="mr-2 h-5 w-5 text-left text-left" /> SHARE VICTORY
                                </Button>
                            )}
                            {isOwner && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-black/10 text-white hover:bg-black/20 border-white/10 text-left text-left" onClick={() => setIsManageOpen(true)}>
                                    <Edit className="mr-2 h-5 w-5 text-left text-left" /> MANAGE MISSION
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 text-left text-left text-left">
                        <CardHeader className="pb-3 text-left text-left text-left text-left text-left text-left text-left"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left">Organizer</CardTitle></CardHeader>
                        <CardContent className="text-left text-left">
                            <Link href={isOwner ? '/dashboard/profile' : `/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-4 group p-3 -mx-3 rounded-2xl hover:bg-muted/50 transition-all text-left text-left text-left">
                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xl text-left text-left text-left"><AvatarFallback className="font-black text-left text-left text-left"> {campaign.organizerFirstName?.charAt(0)}</AvatarFallback></Avatar>
                                <div className="min-w-0 flex-1 text-left text-left text-left text-left text-left text-left text-left"><span className="font-black text-base group-hover:text-primary transition-colors block truncate uppercase text-left text-left text-left">{campaign.organizerFirstName} {campaign.organizerLastName}</span><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest text-left text-left text-left">Mission Leader</span></div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
                    <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-left text-left">Log Harvest</DialogTitle></DialogHeader></div>
                    <ScrollArea className="max-h-[70vh] p-8 text-left text-left text-left text-left text-left text-left"><LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={activeFellowships || []} campaigns={[]} defaultCampaign={campaign} /></ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isTestimonyOpen} onOpenChange={setIsTestimonyOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
                    <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-left text-left">Share Victory</DialogTitle></DialogHeader></div>
                    <ScrollArea className="max-h-[70vh] p-8 text-left text-left text-left text-left text-left text-left text-left">{userProfile && <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={() => setIsTestimonyOpen(false)} campaign={campaign} />}</ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left">
                    <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left"><DialogHeader className="text-left text-left text-left"><DialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-left text-left text-left">Manage Mission</DialogTitle></DialogHeader></div>
                    <ScrollArea className="max-h-[80vh] p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left"><ManageCampaignForm campaign={campaign} onCampaignUpdated={() => setIsManageOpen(false)} onDelete={() => { }} /></ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
