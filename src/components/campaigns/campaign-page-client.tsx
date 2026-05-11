'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Loader2, ArrowLeft, MapPin, CalendarDays, Users, Share2, Edit, MessagesSquare, UserCheck2, PlayCircle, Newspaper, Target, Map as MapIcon, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, differenceInDays, formatDistanceToNow, parse } from 'date-fns';
import { ManageCampaignForm } from './manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useJsApiLoader, GoogleMap, MarkerF, CircleF } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { safeToDate } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

    const onMapUnmount = useCallback(() => {}, []);

    const center = useMemo(() => ({ 
        lat: campaign.latitude || 0, 
        lng: campaign.longitude || 0 
    }), [campaign.latitude, campaign.longitude]);
    
    const radius = campaign.coverageRadius || 1000;

    if (loadError) {
        return (
            <div className="h-80 w-full rounded-md bg-muted/50 border-2 border-dashed flex flex-col items-center justify-center text-center p-6 space-y-4">
                <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-80 w-full rounded-md bg-muted animate-pulse flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerClassName="h-80 w-full rounded-md"
            center={center}
            zoom={12}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: false }}
            onUnmount={onMapUnmount}
        >
            <MarkerF position={center} />
            <CircleF
                center={center}
                radius={radius}
                options={{ strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
        </GoogleMap>
    );
}

function CampaignMap({ campaign }: { campaign: Campaign }) {
    const MapPlaceholder = () => (
        <div className="h-80 w-full rounded-md bg-muted/50 border-2 border-dashed flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MapIcon className="h-8 w-8 text-primary opacity-50" />
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Location</CardTitle>
            </CardHeader>
            <CardContent>
                {!isValidKey(GOOGLE_MAPS_API_KEY) ? (
                    <MapPlaceholder />
                ) : (!campaign.latitude || !campaign.longitude) ? (
                    <MapPlaceholder />
                ) : (
                    <CampaignMapInner campaign={campaign} />
                )}
            </CardContent>
        </Card>
    );
}

function ScriptureDisplay({ reference, caption }: { reference: string; caption?: string; }) {
  const [scriptureText, setScriptureText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const scriptureRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (!reference) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    setScriptureText(null);
    setError(null);
    setIsExpanded(false);
    setIsTruncated(false);

    const fetchScripture = async () => {
      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch scripture. Status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        setScriptureText(data.text.trim());
      } catch (e: any) {
        console.warn(`Could not fetch scripture for "${reference}"`, e.message);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScripture();
  }, [reference]);
  
  useEffect(() => {
    const checkTruncation = () => {
        if (scriptureRef.current) {
            setIsTruncated(scriptureRef.current.scrollHeight > scriptureRef.current.clientHeight);
        }
    }
    if (scriptureText && !isExpanded) {
        const timeoutId = setTimeout(checkTruncation, 100);
        window.addEventListener('resize', checkTruncation);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkTruncation);
        };
    } else if (isExpanded) {
        setIsTruncated(false);
    }
  }, [scriptureText, isExpanded]);


  if (isLoading) {
    return (
        <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    );
  }

  if (error || !scriptureText) {
    return (
         <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
            &ldquo;{caption || "An inspirational scripture for this campaign."}&rdquo;
            <footer className="text-right text-sm not-italic mt-2 text-foreground">- {reference}</footer>
        </blockquote>
    );
  }

  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
        <p ref={scriptureRef} className={cn("whitespace-pre-wrap leading-relaxed", !isExpanded && "line-clamp-5")}>
            &ldquo;{scriptureText}&rdquo;
        </p>
        {isTruncated && !isExpanded && (
            <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => setIsExpanded(true)}
            >
                Read More
            </Button>
        )}
        <footer className="text-right text-sm not-italic mt-2 text-foreground font-semibold">
            - {reference}
            {caption && <div className="mt-1 font-normal opacity-80">&ldquo;{caption}&rdquo;</div>}
        </footer>
    </blockquote>
  );
}

export default function CampaignPageClient({ campaignId }: { campaignId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      setMounted(true);
    }, []);

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const campaignDocRef = useMemo(() => doc(firestore, 'campaigns', campaignId as string), [firestore, campaignId]);
    const { data: campaign, loading: campaignLoading, error: campaignError } = useDoc<Campaign>(campaignDocRef);

    const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

    const organizerDocRef = useMemo(() => {
      if (!campaign?.organizerId || !firestore) return null;
      return doc(firestore, 'users', campaign.organizerId);
    }, [campaign, firestore]);
    const { data: organizerProfile, loading: organizerProfileLoading } = useDoc<UserProfile>(organizerDocRef);
    
    const loading = campaignLoading || profileLoading || organizerProfileLoading;
    
    const isOwner = useMemo(() => user?.uid === campaign?.organizerId, [user, campaign]);

    const handleFormClose = () => {
      setIsManageOpen(false);
    };

    const handleDeleteCampaign = async () => {
      if (!campaignToDelete || !user || !firestore) return;
      setIsDeleting(true);
      const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
      const deleteData = {
          status: 'deleted',
          deletionReason: 'Campaign deleted by organizer.',
          deletedAt: serverTimestamp(),
      };
  
      try {
          await updateDoc(campaignRef, deleteData);
          toast({ title: 'Campaign Deleted' });
          setCampaignToDelete(null);
          router.push('/dashboard/campaigns');
      } catch (error) {
          const permissionError = new FirestorePermissionError({
              path: campaignRef.path,
              operation: 'update',
              requestResourceData: deleteData,
          }, user);
          errorEmitter.emit('permission-error', permissionError);
      } finally {
          setIsDeleting(false);
      }
    };

    const handleShare = async () => {
        if (!campaign) return;
        const baseUrl = "https://testifyglobal.com";
        const shareUrl = `${baseUrl}/dashboard/campaigns/${campaign.id}`;
        const shareData = {
          title: `Join '${campaign.title}' on Testify!`,
          text: `Join the '${campaign.title}' campaign.`,
          url: shareUrl,
        };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            navigator.clipboard.writeText(shareData.url);
            toast({ title: 'Link Copied!' });
          }
        } catch (err) {
          navigator.clipboard.writeText(shareData.url);
          toast({ title: 'Link Copied!' });
        }
    };
    
    const status = useMemo(() => {
        const now = new Date();
        const startDate = safeToDate(campaign?.startDate);
        const endDate = safeToDate(campaign?.endDate);
        if (!startDate || !endDate) return "Past";
        const endDateTime = new Date(endDate);
        if (campaign?.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
            const [hours, minutes] = campaign.endTime.split(':').map(Number);
            endDateTime.setHours(hours, minutes, 59, 999);
        } else {
            endDateTime.setHours(23, 59, 59, 999);
        }
        if (endDateTime < now) return "Past";
        const startDateTime = new Date(startDate);
        if (campaign?.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
            const [hours, minutes] = campaign.startTime.split(':').map(Number);
            startDateTime.setHours(hours, minutes, 0, 0);
        }
        if (startDateTime > now) return "Upcoming";
        return "Ongoing";
    }, [campaign]);

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (campaignError || !campaign || campaign.status === 'deleted') {
         return (
            <div className="text-center py-12 flex flex-col items-center">
                <Target className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Campaign Not Found</h3>
                <Button asChild variant="outline" className="mt-6"><Link href="/dashboard/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
            </div>
        );
    }

    const startDate = safeToDate(campaign.startDate);
    const endDate = safeToDate(campaign.endDate);
    const startTimeFormatted = campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime) ? format(parse(campaign.startTime, 'HH:mm', new Date()), 'p') : campaign.startTime;
    const endTimeFormatted = campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime) ? format(parse(campaign.endTime, 'HH:mm', new Date()), 'p') : campaign.endTime;

    const dateString = startDate && endDate ? (isSameDay(startDate, endDate) ? format(startDate, "PPP") : `${format(startDate, "PPP")} to ${format(endDate, "PPP")}`) : "Date not set";

    return (
        <>
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
                <header className="space-y-2">
                     <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline">{campaign.title}</h1>
                        <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'} className="text-base py-1 px-3">{status}</Badge>
                    </div>
                    <p className="text-lg text-muted-foreground">{campaign.goal}</p>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card><CardContent className="p-6"><p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{campaign.description}</p>{campaign.scripture && <ScriptureDisplay reference={campaign.scripture} caption={campaign.scriptureTestimony} />}</CardContent></Card>
                        <CampaignMap campaign={campaign} />
                    </div>
                    <div className="space-y-6">
                        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5"/> Schedule</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="font-semibold">Date</p><p className="text-muted-foreground">{dateString}</p></div><div><p className="font-semibold">Time</p><p className="text-muted-foreground">{startTimeFormatted} - {endTimeFormatted}</p></div><div><p className="font-semibold">Location</p><p className="text-muted-foreground">{campaign.location}</p></div></CardContent></Card>
                        <Card><CardHeader><CardTitle className="text-lg">Organizer</CardTitle></CardHeader><CardContent><Link href={`/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-3 group"><Avatar><AvatarFallback>{campaign.organizerFirstName?.charAt(0)}{campaign.organizerLastName?.charAt(0)}</AvatarFallback></Avatar><span className="font-semibold group-hover:underline">{campaign.organizerFirstName} {campaign.organizerLastName}</span></Link></CardContent></Card>
                        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5"/> Participants</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{campaign.participants || 0} / {campaign.maxParticipants || '∞'}</p></CardContent></Card>
                        <Card><CardHeader><CardTitle className="text-lg">Actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{status === 'Ongoing' && campaign.streamUrl && (<Button asChild variant="outline" size="icon"><Link href={campaign.streamUrl} target="_blank"><PlayCircle className="h-4 w-4" /></Link></Button>)}{isOwner ? (<><Button onClick={() => setIsManageOpen(true)}><Edit className="mr-2 h-4 w-4" /> Manage</Button><Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>{status === 'Ongoing' && <Button variant="secondary" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>}</>) : (<>{status === 'Ongoing' && <Button variant="secondary" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>}<Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button></>)}</CardContent></Card>
                    </div>
                </div>
            </div>
             <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Log a Soul Won</DialogTitle></DialogHeader><LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} defaultCampaign={campaign} fellowships={[]} campaigns={[]} /></DialogContent></Dialog>
            <Dialog open={isTestimonyDialogOpen} onOpenChange={setIsTestimonyDialogOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Share Testimony</DialogTitle></DialogHeader>{userProfile && <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={() => setIsTestimonyDialogOpen(false)} campaign={campaign} />}</DialogContent></Dialog>
            {mounted && isMobile ? (
              <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}><SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0"><div className="p-6 border-b flex-shrink-0"><SheetHeader className="text-left"><SheetTitle>Manage Campaign</SheetTitle></SheetHeader></div><div className="flex-grow overflow-y-auto p-6 pt-2"><ManageCampaignForm campaign={campaign} onCampaignUpdated={handleFormClose} onDelete={() => { setCampaignToDelete(campaign); setIsManageOpen(false); }} /></div></SheetContent></Sheet>
            ) : (
              <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Manage Campaign</DialogTitle></DialogHeader><div className="max-h-[70vh] overflow-y-auto pr-2"><ManageCampaignForm campaign={campaign} onCampaignUpdated={handleFormClose} onDelete={() => { setCampaignToDelete(campaign); setIsManageOpen(false); }} /></div></DialogContent></Dialog>
            )}
            {campaignToDelete && (<AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Campaign?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
        </>
    );
}