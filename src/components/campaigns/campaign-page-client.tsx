
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useUser, useAuth, useCollection, useUserProfile, useFirestore } from '@/firebase';
import type { Campaign, UserProfile, CampaignParticipant, Testimony, Fellowship, AccountabilityRequest, Soul, CampaignGalleryItem } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { doc, updateDoc, serverTimestamp, collection, query, where, orderBy, addDoc, deleteDoc, runTransaction, arrayRemove } from 'firebase/firestore';
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
    Globe,
    X,
    ChevronDown,
    Trash2,
    Camera,
    PlusCircle,
    LogOut
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import Link from 'next/link';
import { safeToDate, haversineDistance } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/common/image-upload';
import NextImage from 'next/image';
import dynamic from 'next/dynamic';

const LogSoulFormLazy = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });

function CampaignGallery({ campaignId, isMember, isOrganizer }: { campaignId: string, isMember: boolean, isOrganizer: boolean }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStage, setUploadStage] = useState<'preparatory' | 'ongoing'>('preparatory');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const galleryQuery = useMemo(() => {
        if (!firestore || !campaignId) return null;
        return query(collection(firestore, 'campaigns', campaignId, 'gallery'), orderBy('createdAt', 'desc'));
    }, [firestore, campaignId]);
    const { data: galleryItems, loading } = useCollection<CampaignGalleryItem>(galleryQuery);

    const handleUpload = async () => {
        if (!user || !userProfile || !photoUrl || !firestore) return;
        setIsUploading(true);
        const itemData = {
            url: photoUrl,
            type: uploadStage,
            authorId: user.uid,
            authorName: `${userProfile.firstName} ${userProfile.lastName}`,
            createdAt: serverTimestamp(),
        };
        try {
            await addDoc(collection(firestore, 'campaigns', campaignId, 'gallery'), itemData);
            setPhotoUrl('');
            toast({ title: 'Photo Saved', description: `Added to ${uploadStage} gallery.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Upload Failed' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        setIsDeleting(itemId);
        try {
            await deleteDoc(doc(firestore, 'campaigns', campaignId, 'gallery', itemId));
            toast({ title: 'Photo Removed' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        } finally {
            setIsDeleting(null);
        }
    };

    const groupedItems = useMemo(() => {
        return {
            preparatory: galleryItems?.filter(i => i.type === 'preparatory') || [],
            ongoing: galleryItems?.filter(i => i.type === 'ongoing') || [],
        };
    }, [galleryItems]);

    return (
        <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden text-left">
            <CardHeader className="p-8 border-b bg-muted/5">
                <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                    <Camera className="h-5 w-5 text-primary" /> Mission Gallery
                </CardTitle>
                <CardDescription>Visual record of preparatory work and ongoing mission impact.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                {isMember && (
                    <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-muted/20 border-2 border-dashed flex flex-col items-center">
                        <div className="w-full space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Stage</Label>
                                <Select value={uploadStage} onValueChange={(v: any) => setUploadStage(v)}>
                                    <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-sm font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="preparatory">Preparatory Phase</SelectItem>
                                        <SelectItem value="ongoing">Ongoing Mission</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Photo Evidence</Label>
                                <ImageUpload 
                                    onUploadComplete={setPhotoUrl} 
                                    storagePath="campaign-assets" 
                                    cropAspect={4/3}
                                />
                            </div>
                        </div>
                        <div className="w-full flex justify-center">
                            <Button 
                                onClick={handleUpload} 
                                disabled={!photoUrl || isUploading}
                                className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                            >
                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <PlusCircle className="h-5 w-5 mr-2" />}
                                SAVE PHOTO
                            </Button>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="preparatory" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/30 p-1 rounded-2xl mb-6">
                        <TabsTrigger value="preparatory" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Preparatory ({groupedItems.preparatory.length})</TabsTrigger>
                        <TabsTrigger value="ongoing" className="rounded-xl font-black text-[10px] uppercase tracking-widest">Ongoing ({groupedItems.ongoing.length})</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preparatory">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {groupedItems.preparatory.map(item => (
                                <Dialog key={item.id}>
                                    <DialogTrigger asChild>
                                        <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-sm group cursor-pointer">
                                            <NextImage src={item.url} alt="Prep" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[8px] font-black text-white uppercase truncate">By {item.authorName}</p>
                                                    {(isOrganizer || item.authorId === user?.uid) && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                                            disabled={isDeleting === item.id}
                                                            className="h-6 w-6 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                                                        >
                                                            {isDeleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="p-0 bg-black/95 border-none sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                                        <div className="sr-only">
                                            <DialogHeader>
                                                <DialogTitle>Mission Evidence</DialogTitle>
                                                <DialogDescription>Full screen view of mission photo.</DialogDescription>
                                            </DialogHeader>
                                        </div>
                                        <div className="relative h-full w-full flex items-center justify-center p-4">
                                            <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                                <NextImage src={item.url} alt="Full view" fill className="object-contain" unoptimized />
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))}
                            {groupedItems.preparatory.length === 0 && !loading && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl opacity-40">
                                    <p className="text-xs font-bold uppercase italic text-center">No preparatory records yet</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="ongoing">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {groupedItems.ongoing.map(item => (
                                <Dialog key={item.id}>
                                    <DialogTrigger asChild>
                                        <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-sm group cursor-pointer">
                                            <NextImage src={item.url} alt="Ongoing" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[8px] font-black text-white uppercase truncate">By {item.authorName}</p>
                                                    {(isOrganizer || item.authorId === user?.uid) && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                                            disabled={isDeleting === item.id}
                                                            className="h-6 w-6 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                                                        >
                                                            {isDeleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="p-0 bg-black/95 border-none sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                                        <div className="sr-only">
                                            <DialogHeader>
                                                <DialogTitle>Mission Impact</DialogTitle>
                                                <DialogDescription>Full screen view of impact photo.</DialogDescription>
                                            </DialogHeader>
                                        </div>
                                        <div className="relative h-full w-full flex items-center justify-center p-4">
                                            <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                                <NextImage src={item.url} alt="Full view" fill className="object-contain" unoptimized />
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))}
                            {groupedItems.ongoing.length === 0 && !loading && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl opacity-40">
                                    <p className="text-xs font-bold uppercase italic text-center">No mission impact photos yet</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

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
    const [isLeaving, setIsLeaving] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

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

    const demographics = useMemo(() => {
        if (!campaignSouls) return null;
        const stats = {
            total: campaignSouls.length,
            gender: { male: 0, female: 0 },
            age: { children: 0, teens: 0, youngAdults: 0, adults: 0, seniors: 0, unknown: 0 }
        };

        campaignSouls.forEach(s => {
            if (s.gender === 'Male') stats.gender.male++;
            else if (s.gender === 'Female') stats.gender.female++;

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

    const handleDeleteCampaign = async () => {
        if (!user || !firestore || !campaign) return;
        setIsDeleting(true);
        const campaignRef = doc(firestore, 'campaigns', campaign.id);
        const deleteData = { status: 'deleted', deletedAt: serverTimestamp() };
        try {
            await updateDoc(campaignRef, deleteData);
            toast({ title: 'Mission Deleted' });
            router.push('/campaigns');
        } catch (error: any) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: campaignRef.path, operation: 'update', requestResourceData: deleteData }, user));
        } finally {
            setIsDeleting(false);
            setIsDeleteAlertOpen(false);
        }
    };

    const handleLeave = async () => {
        if (!user || !firestore || isOwner || !isJoined || !campaign) return;
        setIsLeaving(true);

        const campaignRef = doc(firestore, 'campaigns', campaign.id);
        const joinedRef = doc(firestore, `users/${user.uid}/joinedCampaigns/${campaign.id}`);
        const participantRef = doc(firestore, `campaigns/${campaign.id}/participants/${user.uid}`);

        try {
            await runTransaction(firestore, async (transaction) => {
                const snap = await transaction.get(campaignRef);
                if (!snap.exists()) throw new Error("Campaign missing");
                
                transaction.update(campaignRef, { 
                    participants: Math.max(0, (snap.data().participants || 0) - 1),
                    participantIds: arrayRemove(user.uid)
                });
                transaction.delete(joinedRef);
                transaction.delete(participantRef);
            });
            toast({ title: 'Left Mission' });
            router.push('/campaigns');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsLeaving(false);
        }
    };

    if (loading || !mounted) return <div className="flex items-center justify-center h-full py-20 text-left"><Loader2 className="animate-spin text-primary text-left" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') return <div className="text-center p-12 text-left"><h2 className="text-xl font-bold text-center text-left">Campaign Not Found</h2><Button asChild variant="outline" className="mt-4 mx-auto block text-center text-left"><Link href="/campaigns" className="text-center text-left">Return to Campaigns</Link></Button></div>;

    return (
        <div className="space-y-8 pb-32 max-w-6xl mx-auto text-left">
            <div className="flex items-center gap-4 px-4 sm:px-0 pt-4 text-left">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full border bg-background shadow-sm text-left text-left">
                    <ArrowLeft className="h-5 w-5 text-left text-left"/>
                </Button>
                <div className="min-w-0 flex-1 text-left">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-headline tracking-tight leading-tight truncate uppercase text-balance text-left text-left">{campaign.title}</h1>
                    <div className="flex items-center gap-2 mt-1 text-left text-left text-left">
                        <Badge variant={status === 'Ongoing' ? 'default' : 'outline'} className="uppercase font-bold tracking-widest text-[10px] text-left text-left">
                            {status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 truncate text-left text-left">• {campaign.goal}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                <div className="lg:col-span-2 space-y-8 text-left text-left text-left">
                    <Card className="rounded-none sm:rounded-[2rem] border-none shadow-sm bg-muted/20 text-left">
                        <CardHeader className="p-8 text-left text-left">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-muted-foreground text-left text-left">About this Mission</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 text-left text-left">
                            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium text-left text-left">{campaign.description}</p>
                            {campaign.scripture && (
                                <div className="mt-8 p-6 bg-primary/5 rounded-[1.5rem] border-2 border-dashed border-primary/20 relative text-left text-left">
                                    <Quote className="absolute top-2 right-4 h-8 w-8 opacity-5 text-left text-left" />
                                    <p className="italic text-base sm:text-lg text-primary font-serif leading-relaxed text-left text-balance text-left">&ldquo;{campaign.scriptureTestimony || campaign.scripture}&rdquo;</p>
                                    <p className="text-[10px] font-black uppercase text-primary/60 text-right mt-3 tracking-widest text-right text-left">— {campaign.scripture}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-6 px-4 sm:px-0 text-left text-left">
                        <div className="flex items-center gap-3 text-left text-left">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner text-left text-left">
                                <BarChart3 className="h-5 w-5 text-indigo-600 text-left text-left" />
                            </div>
                            <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left text-left">Kingdom Insights</h3>
                        </div>

                        {demographics ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
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
                                            <div key={g.label} className="space-y-1.5 text-left text-left">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-left text-left">
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
                                            <div key={a.label} className="space-y-1.5 text-left text-left">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-left text-left">
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
                            <div className="py-20 text-center bg-muted/10 rounded-[2rem] border-2 border-dashed text-left">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/20 mx-auto mb-3 text-left" />
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center text-left text-left">Crunching Harvest Data...</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 sm:px-0 text-left text-left">
                        <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 text-left text-left text-left">
                            <CardHeader className="pb-3 text-left text-left text-left">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground text-left text-left text-left">
                                    <MapPin className="h-4 w-4 text-primary text-left text-left text-left" /> Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-left text-left text-left">
                                <p className="text-sm font-bold truncate uppercase text-left text-left text-left">{campaign.location}</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 text-left text-left text-left">
                            <CardHeader className="pb-3 text-left text-left text-left">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground text-left text-left text-left">
                                    <CalendarDays className="h-4 w-4 text-primary text-left text-left text-left" /> Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-left text-left text-left">
                                <p className="text-sm font-bold text-left text-left text-left">Starts {format(safeToDate(campaign.startDate)!, 'PPP')}</p>
                                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1 text-left text-left text-left">{campaign.startTime} - {campaign.endTime}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-none sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 overflow-hidden mx-4 sm:mx-0 text-left">
                        <CardHeader className="p-8 border-b bg-muted/5 text-left text-left text-left text-left text-left">
                            <CardTitle className="flex items-center justify-between text-lg font-black uppercase tracking-tight text-left text-left text-left text-left text-left">
                                <span className="flex items-center gap-2 text-left text-left text-left text-left"><Users className="h-5 w-5 text-primary text-left text-left text-left text-left" /> Participants</span>
                                <Badge variant="secondary" className="rounded-full px-3 h-6 font-bold text-left text-left text-left text-left">{(participants?.length || 0)}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 text-left text-left text-left text-left text-left">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-left text-left text-left text-left">
                                {participants?.map(p => (
                                    <Link key={p.id} href={`/profile/${p.userId}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/5 hover:bg-muted/10 transition-all text-left text-left text-left text-left">
                                        <Avatar className="h-9 w-9 border shadow-sm text-left text-left text-left text-left"><AvatarImage src={p.photoURL} className="text-left text-left text-left text-left" /><AvatarFallback className="font-bold text-xs text-left text-left text-left text-left"> {p.firstName?.charAt(0)}</AvatarFallback></Avatar>
                                        <div className="min-w-0 flex-1 text-left text-left text-left text-left"><p className="font-bold text-sm truncate uppercase tracking-tight text-left text-left text-left text-left">{p.firstName} {p.lastName}</p></div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="px-4 sm:px-0 text-left"><CampaignGallery campaignId={campaignId} isMember={isJoined} isOrganizer={isOwner} /></div>

                    <div className="space-y-6 px-4 sm:px-0 text-left text-left text-left">
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left text-left text-left"><Newspaper className="h-5 w-5 text-primary text-left text-left text-left" /> Campaign Testimonies</h3>
                        <div className="flex flex-col gap-4 text-left text-left text-left">
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
                                <div className="text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed text-left text-left text-left">
                                    <Newspaper className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3 text-left text-left text-left" />
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center text-left text-left text-left">No shared victories yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-8 flex flex-col px-4 sm:px-0 text-left text-left text-left text-left">
                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-xl border-none bg-indigo-600 text-white overflow-hidden text-left text-left text-left">
                        <CardHeader className="pb-4 text-left text-left text-left text-left text-left">
                            <div className="flex items-center justify-between mb-2 text-left text-left text-left text-left text-left">
                                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-left text-left text-left text-left">
                                    <Target className="h-5 w-5 text-white text-left text-left text-left text-left" />
                                </div>
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-black text-[9px] uppercase tracking-widest text-left text-left text-left text-left">Live Stats</Badge>
                            </div>
                            <CardTitle className="text-xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">Harvest Impact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-left text-left text-left text-left">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/10 text-left text-left text-left text-left">
                                <div className="space-y-1 text-left text-left text-left text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-left text-left text-left text-left">Souls Won</p>
                                    <p className="text-3xl font-black text-left text-left text-left text-left">{campaign.soulsLogged || 0}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-left text-left text-left text-left">
                                    <UserPlus className="h-5 w-5 text-white text-left text-left text-left text-left" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-xl border-none bg-primary text-primary-foreground text-left text-left text-left text-left">
                        <CardHeader className="pb-4 text-left text-left text-left text-left"><CardTitle className="text-base font-black uppercase tracking-[0.2em] opacity-80 text-left text-left text-left text-left">Mission Hub</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-3 text-left text-left text-left text-left">
                            {isJoined && status === 'Ongoing' && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20 text-left text-left text-left text-left" onClick={() => setIsLogSoulOpen(true)}>
                                    <UserPlus className="mr-2 h-5 w-5 text-left text-left text-left text-left" /> LOG SOUL WON
                                </Button>
                            )}
                            {isJoined && (status === 'Ongoing' || status === 'Past') && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-white/20 text-white hover:bg-white/30 border-white/20 text-left text-left text-left text-left" onClick={() => setIsTestimonyOpen(true)}>
                                    <Newspaper className="mr-2 h-5 w-5 text-left text-left text-left text-left" /> SHARE VICTORY
                                </Button>
                            )}
                            {isOwner ? (
                                <React.Fragment>
                                  <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-black/10 text-white hover:bg-black/20 border-white/10 text-left text-left text-left text-left" onClick={() => setIsManageOpen(true)}>
                                      <Edit className="mr-2 h-4 w-4 text-left text-left text-left text-left" /> MANAGE MISSION
                                  </Button>
                                  <Button variant="destructive" className="w-full h-12 font-black rounded-2xl shadow-lg uppercase tracking-widest text-xs text-center text-left text-left text-left text-left" onClick={() => setIsDeleteAlertOpen(true)}>
                                      <Trash2 className="mr-2 h-4 w-4 text-left text-left text-left text-left" /> DELETE MISSION
                                  </Button>
                                </React.Fragment>
                            ) : isJoined && (
                                <Button variant="secondary" className="w-full h-12 font-black rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 text-left text-left text-left text-left" onClick={handleLeave} disabled={isLeaving}>
                                    {isLeaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-left text-left text-left" /> : <LogOut className="mr-2 h-5 w-5 text-left text-left text-left" />} LEAVE MISSION
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-[1.5rem] sm:rounded-3xl shadow-sm border-none bg-background border border-muted-foreground/10 text-left text-left text-left text-left">
                        <CardHeader className="pb-3 text-left text-left text-left text-left"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-left text-left text-left text-left">Organizer</CardTitle></CardHeader>
                        <CardContent className="text-left text-left text-left text-left">
                            <Link href={isOwner ? '/profile' : `/profile/${campaign.organizerId}`} className="flex items-center gap-4 group p-3 -mx-3 rounded-2xl hover:bg-muted/50 transition-all text-left text-left text-left text-left">
                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xl text-left text-left text-left text-left"><AvatarFallback className="font-black text-left text-left text-left text-left text-left"> {campaign.organizerFirstName?.charAt(0)}</AvatarFallback></Avatar>
                                <div className="min-w-0 flex-1 text-left text-left text-left text-left text-left"><span className="font-black text-base group-hover:text-primary transition-colors block truncate uppercase text-left text-left text-left text-left"> {campaign.organizerFirstName} {campaign.organizerLastName}</span><span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest text-left text-left text-left text-left">Mission Leader</span></div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Managed Dialogs */}
            <Drawer open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left">
                        <DrawerHeader className="text-left flex-shrink-0 p-0 text-left text-left text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left text-left">Log Harvest</DrawerTitle>
                        </DrawerHeader>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar text-left text-left text-left text-left">
                        <div className="p-8 text-left text-left text-left text-left">
                            <LogSoulFormLazy onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={activeFellowships || []} campaigns={[]} defaultCampaign={campaign} />
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            <Drawer open={isTestimonyOpen} onOpenChange={setIsTestimonyOpen}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left">
                        <DrawerHeader className="text-left flex-shrink-0 p-0 text-left text-left text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left text-left text-left text-left">Share Victory</DrawerTitle>
                        </DrawerHeader>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar text-left text-left text-left text-left">
                        <div className="p-8 text-left text-left text-left text-left">
                            {userProfile && <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={() => setIsTestimonyOpen(false)} campaign={campaign} />}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            <Drawer open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DrawerContent className="sm:max-w-2xl h-[95dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left text-left text-left text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left text-left text-left">
                        <DrawerHeader className="text-left flex-shrink-0 p-0 text-left text-left text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Manage Mission</DrawerTitle>
                        </DrawerHeader>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar text-left text-left text-left text-left">
                        <div className="p-8 text-left text-left text-left text-left">
                            {isManageOpen && <ManageCampaignForm campaign={campaign} onCampaignUpdated={() => setIsManageOpen(false)} onDelete={() => { }} />}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left text-left">
                    <AlertDialogHeader className="text-left text-left text-left text-left text-left">
                        <AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left text-left text-left text-left">Delete Mission?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left text-left text-left">
                            This will permanently remove the mission from the global record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left text-left text-left">
                        <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold text-left text-left text-left text-left">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-center text-left text-left text-left text-left">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left" />}
                            Confirm Removal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

