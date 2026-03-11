
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { Campaign, UserProfile, JoinedCampaign } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, CalendarDays, Users, Share2, Edit, MessagesSquare, UserCheck2, PlayCircle, Newspaper, Target, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, differenceInDays, formatDistanceToNow, parse } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { JoinCampaignDialog } from '@/components/campaigns/join-campaign-dialog';
import { ManageCampaignForm } from '@/components/campaigns/manage-campaign-form';
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useJsApiLoader, GoogleMap, MarkerF, CircleF } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const libraries: ('places')[] = ['places'];


function CampaignMap({ campaign }: { campaign: Campaign }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });
    
    if (!campaign.latitude || !campaign.longitude) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Map</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-10">
                        No precise location set for this campaign.
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const center = { lat: campaign.latitude, lng: campaign.longitude };
    const radius = campaign.coverageRadius || 1000;

    if (!isLoaded || loadError) {
        return (
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Map</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80 w-full rounded-md bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">{loadError ? 'Error loading map' : 'Loading map...'}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
             <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Map</CardTitle>
            </CardHeader>
            <CardContent>
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
                        options={{ strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }}
                    />
                </GoogleMap>
            </CardContent>
        </Card>
    );
}

function ScriptureDisplay({ reference, caption }: { reference: string; caption?: string; }) {
  const [scriptureText, setScriptureText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    setScriptureText(null);
    setError(null);

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
        console.warn(`Could not fetch scripture for "${reference}":`, e.message);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScripture();
  }, [reference]);

  if (isLoading) {
    return (
        <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    );
  }

  // Fallback to old display if fetch fails or reference is bad
  if (error || !scriptureText) {
    return (
         <blockquote className="mt-6 border-l-2 pl-6 italic">
            &ldquo;{caption || "An inspirational scripture for this campaign."}&rdquo;
            <footer className="text-right text-sm not-italic mt-2">- {reference}</footer>
        </blockquote>
    );
  }

  const isLongText = scriptureText.length > 500;

  // Success display
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic">
        {isLongText ? (
            <ScrollArea className="max-h-48 pr-4">
                <p className="whitespace-pre-wrap">&ldquo;{scriptureText}&rdquo;</p>
            </ScrollArea>
        ) : (
             <p className="whitespace-pre-wrap">&ldquo;{scriptureText}&rdquo;</p>
        )}
        <footer className="text-right text-sm not-italic mt-2">
            - {reference}
            {caption && <div className="mt-1 opacity-80">&ldquo;{caption}&rdquo;</div>}
        </footer>
    </blockquote>
  );
}


export default function CampaignPage() {
    const params = useParams();
    const campaignId = params.campaignId as string;
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [isLogSoulOpen, setIsLogSoulOpen] = useState(false);
    const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

    const campaignDocRef = useMemo(() => doc(firestore, 'campaigns', campaignId as string), [firestore, campaignId]);
    const { data: campaign, loading: campaignLoading, error: campaignError } = useDoc<Campaign>(campaignDocRef);

    const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
    
    const joinedCampaignDocRef = useMemo(() => (user && campaignId) ? doc(firestore, `users/${user.uid}/joinedCampaigns`, campaignId as string) : null, [user, firestore, campaignId]);
    const { data: joinedCampaign, loading: joinedLoading } = useDoc<JoinedCampaign>(joinedCampaignDocRef);
    
    const loading = campaignLoading || profileLoading || joinedLoading;
    
    const isOwner = useMemo(() => user?.uid === campaign?.organizerId, [user, campaign]);
    const isJoined = useMemo(() => !!joinedCampaign, [joinedCampaign]);

    const handleShare = async () => {
        if (!campaign) return;
        const shareData = {
          title: `Join the '${campaign.title}' campaign on Testify!`,
          text: `Join me in the '${campaign.title}' evangelism campaign. Let's make an impact together!`,
          url: window.location.href,
        };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            navigator.clipboard.writeText(shareData.url);
            toast({
              title: 'Link Copied!',
              description: 'Campaign link has been copied to your clipboard.',
            });
          }
        } catch (err) {
          console.error('Share failed:', err);
          navigator.clipboard.writeText(shareData.url);
          toast({
            title: 'Link Copied!',
            description: 'Campaign link has been copied to your clipboard.',
          });
        }
    };
    
    const safeToDate = (value: any): Date | null => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value.toDate === 'function') return value.toDate();
        try { if (typeof value === 'object' && value.seconds) { const d = new Date(value.seconds * 1000); if(!isNaN(d.getTime())) return d; } } catch(e) {}
        return null;
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
        } else {
            startDateTime.setHours(0,0,0,0);
        }

        if (startDateTime > now) return "Upcoming";
        return "Ongoing";
    }, [campaign]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (campaignError || !campaign || campaign.status === 'deleted') {
         return (
            <div className="text-center py-12 flex flex-col items-center">
                <Target className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Campaign Not Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                   This campaign may have been removed or the link is incorrect.
                </p>
                <Button asChild variant="outline" className="mt-6">
                    <a href="/dashboard/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns</a>
                </Button>
            </div>
        );
    }

    const startDate = safeToDate(campaign.startDate);
    const endDate = safeToDate(campaign.endDate);
    const startTimeFormatted = campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime) ? format(parse(campaign.startTime, 'HH:mm', new Date()), 'p') : campaign.startTime;
    const endTimeFormatted = campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime) ? format(parse(campaign.endTime, 'HH:mm', new Date()), 'p') : campaign.endTime;

    let dateString;
    if (startDate && endDate) {
        const startFormatted = format(startDate, "PPP");
        if (isSameDay(startDate, endDate)) {
            dateString = startFormatted;
        } else {
            const endFormatted = format(endDate, "PPP");
            dateString = `${startFormatted} to ${endFormatted}`;
        }
    } else {
        dateString = "Date not set";
    }

    const isFull = campaign.maxParticipants && campaign.participants >= campaign.maxParticipants;
    const joinButtonDisabled = !user || status === 'Past' || isFull;

    return (
        <>
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.back()} className="w-fit">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Campaigns
                </Button>

                <header className="space-y-2">
                     <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline">{campaign.title}</h1>
                        <Badge variant={status === 'Ongoing' ? 'default' : status === 'Upcoming' ? 'secondary' : 'outline'} className="text-base py-1 px-3">
                            {status}
                        </Badge>
                    </div>
                    <p className="text-lg text-muted-foreground">{campaign.goal}</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>
                                {campaign.scripture && (
                                     <ScriptureDisplay reference={campaign.scripture} caption={campaign.scriptureTestimony} />
                                )}
                            </CardContent>
                        </Card>
                        <CampaignMap campaign={campaign} />
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5"/> Schedule & Location</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="font-semibold">Date</p>
                                    <p className="text-muted-foreground">{dateString}</p>
                                </div>
                                 <div>
                                    <p className="font-semibold">Time</p>
                                    <p className="text-muted-foreground">{startTimeFormatted} - {endTimeFormatted}</p>
                                </div>
                                 <div>
                                    <p className="font-semibold">Location</p>
                                    <p className="text-muted-foreground">{campaign.location}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Organizer</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <a href={`/dashboard/profile/${campaign.organizerId}`} className="flex items-center gap-3 group">
                                     <Avatar>
                                        <AvatarFallback>{campaign.organizerFirstName?.charAt(0)}{campaign.organizerLastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold group-hover:underline">{campaign.organizerFirstName} {campaign.organizerLastName}</span>
                                </a>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5"/> Participants</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{campaign.participants || 0} / {campaign.maxParticipants || '∞'}</p>
                                <p className="text-sm text-muted-foreground">joined</p>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {status === 'Ongoing' && campaign.streamUrl && (
                                    <Button asChild className="w-full">
                                        <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                                            <PlayCircle className="mr-2 h-4 w-4" /> Watch Live
                                        </Link>
                                    </Button>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {isOwner ? (
                                        <>
                                            <Button onClick={() => setIsManageOpen(true)}><Edit className="mr-2 h-4 w-4" /> Manage</Button>
                                            <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                                            {status === 'Ongoing' && (
                                                <Button variant="secondary" className="sm:col-span-2" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>
                                            )}
                                            {isJoined && (status === 'Ongoing' || status === 'Past') && (
                                                <Button variant="secondary" className="sm:col-span-2" onClick={() => setIsTestimonyDialogOpen(true)}><Newspaper className="mr-2 h-4 w-4" /> Share Testimony</Button>
                                            )}
                                        </>
                                    ) : isJoined ? (
                                        <>
                                            {status === 'Ongoing' && <Button variant="secondary" className="sm:col-span-2" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>}
                                            {(status === 'Ongoing' || status === 'Past') && <Button variant="secondary" className="sm:col-span-2" onClick={() => setIsTestimonyDialogOpen(true)}><Newspaper className="mr-2 h-4 w-4" /> Share Testimony</Button>}
                                            <Button disabled><CheckCircle2 className="mr-2 h-4 w-4"/> Joined</Button>
                                            <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button onClick={() => setIsJoinDialogOpen(true)} disabled={joinButtonDisabled}>
                                                {isFull ? 'Full' : 'Join'}
                                            </Button>
                                             <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>

            </div>

            {userProfile && (
                <JoinCampaignDialog
                campaign={campaign}
                userProfile={userProfile}
                isOpen={isJoinDialogOpen}
                onOpenChange={setIsJoinDialogOpen}
                onCampaignJoined={() => {}}
                />
            )}
             <Dialog open={isLogSoulOpen} onOpenChange={setIsLogSoulOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                    <DialogTitle>Log a Soul Won in "{campaign.title}"</DialogTitle>
                    </DialogHeader>
                    <LogSoulForm onSoulLogged={() => setIsLogSoulOpen(false)} defaultCampaign={campaign} />
                </DialogContent>
            </Dialog>
            <Dialog open={isTestimonyDialogOpen} onOpenChange={setIsTestimonyDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                    <DialogTitle>Share Testimony for "{campaign.title}"</DialogTitle>
                    </DialogHeader>
                    <CreateTestimonyForm onTestimonyCreated={() => setIsTestimonyDialogOpen(false)} campaign={campaign} />
                </DialogContent>
            </Dialog>
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                        <ManageCampaignForm campaign={campaign} onCampaignUpdated={() => setIsManageOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
