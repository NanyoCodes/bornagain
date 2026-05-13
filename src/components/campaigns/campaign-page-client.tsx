'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { Campaign, UserProfile } from '@/lib/types';
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
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, CalendarDays, Users, Share2, Edit, MessagesSquare, UserCheck2, PlayCircle, Newspaper, Target, Map as MapIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parse } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useJsApiLoader, GoogleMap, MarkerF, CircleF } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const libraries: ('places')[] = ['places'];

const isValidKey = (key: string | undefined) => !!(key && key.startsWith('AIza') && key.length > 20);

function CampaignMapInner({ campaign }: { campaign: Campaign }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    const center = useMemo(() => ({ 
        lat: campaign.latitude || 0, 
        lng: campaign.longitude || 0 
    }), [campaign.latitude, campaign.longitude]);
    
    const radius = campaign.coverageRadius || 1000;

    if (loadError || !isLoaded) return <div className="h-80 w-full bg-muted animate-pulse" />;

    return (
        <GoogleMap
            mapContainerClassName="h-80 w-full rounded-md"
            center={center}
            zoom={12}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: false }}
        >
            <MarkerF position={center} />
            <CircleF
                center={center}
                radius={radius}
                options={{ strokeColor: '#f97416', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#f97416', fillOpacity: 0.2 }}
            />
        </GoogleMap>
    );
}

export default function CampaignPageClient({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const campaignDocRef = useMemo(() => doc(firestore, 'campaigns', campaignId), [firestore, campaignId]);
    const { data: campaign, loading: campaignLoading, error: campaignError } = useDoc<Campaign>(campaignDocRef);

    const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const loading = campaignLoading || profileLoading;
    const isOwner = useMemo(() => user?.uid === campaign?.organizerId, [user, campaign]);

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
        try {
          if (navigator.share) {
            await navigator.share({ title: campaign.title, url: shareUrl });
          } else {
            navigator.clipboard.writeText(shareUrl);
            toast({ title: 'Link Copied' });
          }
        } catch (err) { navigator.clipboard.writeText(shareUrl); toast({ title: 'Link Copied' }); }
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

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') return <div className="text-center p-12"><Target className="mx-auto h-12 w-12 opacity-20" /><h2 className="mt-4 text-xl font-bold">Campaign Not Found</h2></div>;

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold font-headline">{campaign.title}</h1>
                <Badge variant={status === 'Ongoing' ? 'default' : 'outline'}>{status}</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card><CardContent className="p-6"><p className="text-muted-foreground whitespace-pre-wrap">{campaign.description}</p></CardContent></Card>
                    <Card><CardContent className="p-0 overflow-hidden"><CampaignMapInner campaign={campaign} /></CardContent></Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Organizer</CardTitle></CardHeader>
                        <CardContent>
                            <Link href={`/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-3 group">
                                <Avatar><AvatarFallback>{campaign.organizerFirstName?.charAt(0)}</AvatarFallback></Avatar>
                                <span className="font-semibold group-hover:underline">{campaign.organizerFirstName} {campaign.organizerLastName}</span>
                            </Link>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Actions</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {isOwner ? (
                                <>
                                    <Button onClick={() => setIsManageOpen(true)}><Edit className="mr-2 h-4 w-4" /> Manage</Button>
                                    <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                                </>
                            ) : (
                                <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                            )}
                            {status === 'Ongoing' && <Button variant="secondary" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent><DialogHeader><DialogTitle>Log a Soul Won</DialogTitle></DialogHeader><LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} fellowships={[]} campaigns={[]} /></DialogContent>
            </Dialog>

            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Manage Campaign</DialogTitle></DialogHeader><ManageCampaignForm campaign={campaign} onCampaignUpdated={() => setIsManageOpen(false)} onDelete={() => { setCampaignToDelete(campaign); setIsManageOpen(false); }} /></DialogContent>
            </Dialog>

            {campaignToDelete && (
                <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Campaign?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
