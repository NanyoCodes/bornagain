'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { Campaign, UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, CalendarDays, Users, Share2, Edit, MessagesSquare, UserCheck2, PlayCircle, Newspaper, Target } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, differenceInDays, formatDistanceToNow, parse } from 'date-fns';
import { ManageCampaignForm } from '@/components/campaigns/manage-campaign-form';
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


const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const libraries: ('places')[] = ['places'];


function CampaignMap({ campaign }: { campaign: Campaign }) {
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        return (
            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Map</CardTitle></CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTitle>Google Maps Not Configured</AlertTitle>
                        <AlertDescription>
                            The Google Maps API key is missing. Please open <code className="font-code p-1 bg-destructive/20 rounded">docs/google-maps-setup-guide.md</code> for the setup guide to enable map features.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    
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

    if (loadError) {
        let errorMessage = "The map could not be loaded. This is likely an API key or network issue.";
        if (loadError.message.includes("InvalidKeyMapError")) {
            errorMessage = "The Google Maps API key provided is invalid. Please get a new key from the Google Cloud Console.";
        } else if (loadError.message.includes("ApiNotActivatedMapError")) {
            errorMessage = "The Maps JavaScript API is not enabled for your key. Please enable it in the Google Cloud Console.";
        }
        return (
            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Map</CardTitle></CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTitle>Google Maps Error</AlertTitle>
                        <AlertDescription>
                            {errorMessage} Please open <code className="font-code p-1 bg-destructive/20 rounded">docs/google-maps-setup-guide.md</code> for detailed instructions.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (!isLoaded) {
        return (
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5"/> Map</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80 w-full rounded-md bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">Loading map...</p>
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
    // Only check for truncation if the content is not expanded.
    if (scriptureText && !isExpanded) {
        // Use a timeout to allow the DOM to render before checking height.
        const timeoutId = setTimeout(checkTruncation, 100);
        window.addEventListener('resize', checkTruncation);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkTruncation);
        };
    } else if (isExpanded) {
        // When expanded, we know it's not truncated anymore.
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

  // Fallback to old display if fetch fails or reference is bad
  if (error || !scriptureText) {
    return (
         <blockquote className="mt-6 border-l-2 pl-6 italic">
            &ldquo;{caption || "An inspirational scripture for this campaign."}&rdquo;
            <footer className="text-right text-sm not-italic mt-2">- {reference}</footer>
        </blockquote>
    );
  }

  // Success display
  return (
    <blockquote className="mt-6 border-l-2 pl-6 italic">
        <p ref={scriptureRef} className={cn("whitespace-pre-wrap", !isExpanded && "line-clamp-5")}>
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
        <footer className="text-right text-sm not-italic mt-2">
            - {reference}
            {caption && <div className="mt-1 opacity-80">&ldquo;{caption}&rdquo;</div>}
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

    const campaignDocRef = useMemo(() => doc(firestore, 'campaigns', campaignId as string), [firestore, campaignId]);
    const { data: campaign, loading: campaignLoading, error: campaignError } = useDoc<Campaign>(campaignDocRef);

    const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);
    
    const loading = campaignLoading || profileLoading;
    
    const isOwner = useMemo(() => user?.uid === campaign?.organizerId, [user, campaign]);

    const handleFormClose = () => {
      setIsManageOpen(false);
      router.refresh();
    };

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
                                <div className="flex items-center gap-3 group">
                                     <Avatar>
                                        <AvatarFallback>{campaign.organizerFirstName?.charAt(0)}{campaign.organizerLastName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold">{campaign.organizerFirstName} {campaign.organizerLastName}</span>
                                </div>
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
                            <CardContent className="flex flex-wrap gap-2">
                                {status === 'Ongoing' && campaign.streamUrl && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button asChild variant="outline" size="icon">
                                                    <Link href={campaign.streamUrl} target="_blank" rel="noopener noreferrer">
                                                        <PlayCircle className="h-4 w-4" />
                                                        <span className="sr-only">Watch Live</span>
                                                    </Link>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Watch Live</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                {isOwner ? (
                                    <>
                                        <Button onClick={() => setIsManageOpen(true)}><Edit className="mr-2 h-4 w-4" /> Manage</Button>
                                        <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                                        {status === 'Ongoing' && (
                                            <Button variant="secondary" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>
                                        )}
                                        {(status === 'Ongoing' || status === 'Past') && (
                                            <Button variant="secondary" onClick={() => setIsTestimonyDialogOpen(true)}><Newspaper className="mr-2 h-4 w-4" /> Share Testimony</Button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {status === 'Ongoing' && <Button variant="secondary" onClick={() => setIsLogSoulOpen(true)}><UserCheck2 className="mr-2 h-4 w-4" /> Log Soul</Button>}
                                        {(status === 'Ongoing' || status === 'Past') && <Button variant="secondary" onClick={() => setIsTestimonyDialogOpen(true)}><Newspaper className="mr-2 h-4 w-4" /> Share Testimony</Button>}
                                         <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>

            </div>

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
            
            {mounted && isMobile ? (
              <Sheet open={isManageOpen} onOpenChange={setIsManageOpen}>
                <SheetContent side="bottom">
                  <SheetHeader>
                    <SheetTitle>Manage Campaign</SheetTitle>
                    <SheetDescription>Update the details of your campaign.</SheetDescription>
                  </SheetHeader>
                  <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                    <ManageCampaignForm
                      key={(campaign.lastUpdatedAt?.seconds ?? campaign.createdAt.seconds).toString()}
                      campaign={campaign}
                      onCampaignUpdated={handleFormClose}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Campaign</DialogTitle>
                        <DialogDescription>Update the details of your campaign.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                        <ManageCampaignForm
                          key={(campaign.lastUpdatedAt?.seconds ?? campaign.createdAt.seconds).toString()}
                          campaign={campaign}
                          onCampaignUpdated={handleFormClose}
                        />
                    </div>
                </DialogContent>
              </Dialog>
            )}
        </>
    );
}
