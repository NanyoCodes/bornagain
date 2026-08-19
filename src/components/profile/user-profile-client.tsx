'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection, useUserProfile } from '@/firebase';
import type { Testimony, Campaign, UserProfile, AccountabilityRequest, Soul } from '@/lib/types';
import { doc, collection, query, where, orderBy, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { 
    Loader2, 
    MapPin, 
    ArrowLeft, 
    Edit, 
    Youtube, 
    Globe, 
    Activity, 
    Target, 
    Newspaper,
    Award,
    HeartHandshake,
    Sparkles,
    CalendarDays,
    Video,
    MessageSquare,
    UserPlus,
    Hourglass,
    Briefcase,
    Heart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { cn, safeToDate, haversineDistance } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

function getYouTubeEmbedUrl(url: string | undefined) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

export default function UserProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user: currentUser, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isRequestingPartner, setIsRequestingPartner] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isOwnProfile = currentUser?.uid === userId;

  const userDocRef = useMemo(() => {
    if (!userId || !firestore) return null;
    return doc(firestore, 'users', userId);
  }, [userId, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const currentUserRef = useMemo(() => {
    if (!currentUser?.uid || !firestore) return null;
    return doc(firestore, 'users', currentUser.uid);
  }, [currentUser?.uid, firestore]);
  const { data: currentUserProfile } = useDoc<UserProfile>(currentUserRef);

  const testimoniesQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'testimonies'), where('authorId', '==', userId));
  }, [userId, firestore]);
  const { data: userTestimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

  const campaignsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', userId));
  }, [userId, firestore]);
  const { data: allCampaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const requestsQuery = useMemo(() => {
    if (!currentUser || !firestore) return null;
    return query(
      collection(firestore, 'accountabilityRequests'),
      where('participantIds', 'array-contains', currentUser.uid),
      where('status', '==', 'pending')
    );
  }, [currentUser, firestore]);
  const { data: accountabilityRequests } = useCollection<AccountabilityRequest>(requestsQuery);

  const pendingRequestIds = useMemo(() => {
    if (!accountabilityRequests) return new Set<string>();
    return new Set(
        accountabilityRequests
            .flatMap(r => r.participantIds)
            .filter(id => id !== currentUser?.uid)
    );
  }, [accountabilityRequests, currentUser?.uid]);

  const partnerIds = useMemo(() => new Set(currentUserProfile?.partnerIds || []), [currentUserProfile?.partnerIds]);
  const isPartner = partnerIds.has(userId);
  const hasPendingRequest = pendingRequestIds.has(userId);

  const testimonies = useMemo(() => {
    if (!userTestimonies) return [];
    return [...userTestimonies].sort((a, b) => {
        const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
      });
  }, [userTestimonies]);

  const processedCampaigns = useMemo(() => {
    if (!allCampaigns) return [];
    return allCampaigns
      .filter(campaign => campaign.status === 'active')
      .map(c => {
        const distance = (currentUserProfile?.location?.latitude && currentUserProfile?.location?.longitude && c.latitude && c.longitude)
          ? haversineDistance(
              { lat: currentUserProfile.location.latitude, lng: currentUserProfile.location.longitude },
              { lat: c.latitude, lng: c.longitude }
            )
          : null;
        return { ...c, distance };
      })
      .sort((a, b) => {
        const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
      });
  }, [allCampaigns, currentUserProfile]);

  const handleSendPartnerRequest = async () => {
    if (!currentUser || !firestore || !currentUserProfile || isOwnProfile || isPartner || hasPendingRequest) return;
    setIsRequestingPartner(true);
    const participantIds = [currentUser.uid, userId].sort();
    const requestId = participantIds.join('_');
    const requestRef = doc(firestore, 'accountabilityRequests', requestId);
    
    const newRequestData = {
      fromUserId: currentUser.uid,
      fromUserFirstName: currentUserProfile.firstName || '',
      fromUserLastName: currentUserProfile.lastName || '',
      fromUserPhotoURL: currentUserProfile.photoURL || '',
      toUserId: userId,
      toUserFirstName: userProfile?.firstName || '',
      toUserLastName: userProfile?.lastName || '',
      toUserPhotoURL: userProfile?.photoURL || '',
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      participantIds
    };

    const notificationData = {
      userId: userId,
      type: 'accountability_request' as const,
      title: 'New Accountability Request',
      message: `${currentUserProfile.firstName} wants to be your partner!`,
      link: '/accountability',
      isRead: false,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(requestRef, newRequestData);
      await addDoc(collection(firestore, 'users', userId, 'notifications'), notificationData);
      toast({ title: 'Request Sent!' });
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: requestRef.path,
        operation: 'create',
        requestResourceData: newRequestData
      }, currentUser));
    } finally {
      setIsRequestingPartner(false);
    }
  };

  const loading = profileLoading || testimoniesLoading || campaignsLoading || userLoading;
  
  const videoTestimonies = useMemo(() => {
    const list = [...(userProfile?.videoTestimonies || [])];
    return list.map(v => ({ ...v, embedUrl: getYouTubeEmbedUrl(v.url) })).filter(v => !!v.embedUrl);
  }, [userProfile]);

  if (loading || !mounted) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-8 mx-auto">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
        </div>
        <p className="text-xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-8">Connecting...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-24 px-4 space-y-6">
        <div className="bg-muted/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-left text-left">
            <Globe className="h-10 w-10 text-muted-foreground/30 text-left text-left" />
        </div>
        <div className="space-y-2 text-left">
            <h3 className="text-2xl font-bold font-headline text-center">Profile Not Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto text-center">This profile might have been set to private or the believer has moved to a new station.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="h-11 px-8 rounded-full text-left">
            <ArrowLeft className="mr-2 h-4 w-4 text-left" /> Go Back
        </Button>
      </div>
    );
  }

  const { 
    firstName, 
    lastName, 
    photoURL, 
    bio, 
    personalMessage, 
    location,
    maritalStatus,
    workStatus,
    organizationName,
    roleInOrganization
  } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, state, country } = location || {};
  const initials = (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-0 sm:px-4 pb-20 text-left">
        <div className="flex items-center justify-between px-4 sm:px-0 text-left">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-9 pr-4 text-muted-foreground hover:text-foreground text-left">
                <ArrowLeft className="mr-2 h-4 w-4 text-left"/>
                Back
            </Button>
            {isOwnProfile && (
                <Button asChild variant="outline" size="sm" className="h-9 px-6 rounded-full font-bold shadow-sm text-left">
                    <Link href="/settings" className="text-left">
                        <Edit className="mr-2 h-3.5 w-3.5 text-left" />
                        Settings
                    </Link>
                </Button>
            )}
        </div>
      
      <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 text-left">
        <CardContent className="p-6 sm:p-10 lg:p-12 relative z-20 text-left">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="relative text-left">
              <Dialog>
                <DialogTrigger asChild disabled={!photoURL}>
                  <div className="relative group shrink-0">
                      <Avatar className={cn(
                          "h-36 w-36 sm:h-48 sm:w-48 lg:h-64 lg:w-64 border-[6px] border-background shrink-0 shadow-2xl transition-all duration-500 text-left", 
                          photoURL && "cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-primary/10"
                      )}>
                      <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} className="object-cover text-left" />
                      <AvatarFallback className="text-4xl lg:text-5xl font-black bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full text-left">
                          {initials || userProfile.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                      </Avatar>
                  </div>
                </DialogTrigger>
                {photoURL && (
                  <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                      <DialogHeader className="sr-only text-center"><DialogTitle>Profile Photo</DialogTitle></DialogHeader>
                      <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                          <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
                              <Image 
                                  src={photoURL} 
                                  alt={displayName} 
                                  fill 
                                  className="object-contain shadow-2xl ring-4 ring-white/10" 
                                  unoptimized 
                              />
                          </div>
                      </div>
                  </DialogContent>
                )}
              </Dialog>
              
              {isOwnProfile && userProfile && (!firstName || !lastName || !photoURL) && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-background"></span>
                </div>
              )}
            </div>
            
            <div className="flex-grow min-w-0 space-y-4 pb-2 w-full text-center text-left">
                <div className="flex flex-col justify-between items-center gap-4 text-left">
                    <div className="min-w-0 w-full text-center text-left">
                        <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight truncate leading-tight capitalize text-center w-full break-words [overflow-wrap:anywhere]">{displayName}</h1>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground font-medium text-left">
                            {(city || state || country) && (
                                <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider text-left">
                                    <MapPin className="h-4 w-4 text-left" /> 
                                    {[city, state].filter(Boolean).join(', ') || country}
                                </div>
                            )}
                            {maritalStatus && (
                                <div className="flex items-center gap-1.5 text-left">
                                    <Heart className="h-3.5 w-3.5 text-primary text-left" />
                                    {maritalStatus}
                                </div>
                            )}
                            {workStatus && (
                                <div className="flex items-center gap-1.5 text-left">
                                    <Briefcase className="h-3.5 w-3.5 text-primary text-left" />
                                    <span>
                                        {roleInOrganization && `${roleInOrganization}${organizationName ? ' @ ' : ''}`}
                                        {organizationName || workStatus}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isOwnProfile && currentUserProfile && (
                        <div className="shrink-0 flex gap-2 text-left">
                            {isPartner ? (
                                <Badge variant="secondary" className="h-10 px-6 rounded-full font-bold bg-primary/10 text-primary border-primary/20 flex items-center gap-2 text-left">
                                    <HeartHandshake className="h-4 w-4 text-left" />
                                    PARTNER
                                </Badge>
                            ) : hasPendingRequest ? (
                                <Button variant="outline" className="h-10 px-6 rounded-full font-bold opacity-70 text-left" disabled>
                                    <Hourglass className="mr-2 h-4 w-4 text-left" />
                                    PENDING
                                </Button>
                            ) : (
                                <Button 
                                    className="h-10 px-6 rounded-full font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left"
                                    onClick={handleSendPartnerRequest}
                                    disabled={isRequestingPartner}
                                >
                                    {isRequestingPartner ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <UserPlus className="mr-2 h-4 w-4 text-left" />}
                                    ADD PARTNER
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {personalMessage && (
                    <div className="bg-primary/10 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 border-primary/20 inline-flex items-center gap-3 sm:gap-4 text-center max-w-2xl group transition-all hover:bg-primary/15 shadow-xl shadow-primary/5 mx-auto">
                        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0 transition-transform group-hover:scale-110 text-left" />
                        <p className="text-base sm:text-lg lg:text-xl font-black text-foreground leading-tight italic tracking-tight text-left">
                            &ldquo;{personalMessage}&rdquo;
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 text-left">
                     <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border text-left">
                        <Newspaper className="h-3.5 w-3.5 text-primary text-left" />
                        <span className="text-base font-black text-left">{testimonies.length}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-left">Testimonies</span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border text-left">
                        <Target className="h-3.5 w-3.5 text-primary text-left" />
                        <span className="text-base font-black text-left">{processedCampaigns.length}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-left">Campaigns</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 max-w-3xl mx-auto text-left text-left">
            <div className="relative pl-5 sm:pl-6 border-l-4 border-primary/20 text-center md:text-left text-left">
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed italic font-medium text-left">
                    {bio ? `"${bio}"` : "This believer is a member of the global harvest workforce, dedicated to sharing the goodness of Jesus Christ with the world."}
                </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {videoTestimonies.length > 0 && (
        <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-t-8 border-t-red-600 bg-zinc-950 text-left text-left">
            <CardHeader className="pb-6 pt-10 px-6 sm:px-12 text-center md:text-left text-left">
                <CardTitle className="flex items-center justify-center md:justify-start gap-3 text-2xl sm:text-3xl font-black font-headline text-white tracking-tight text-left">
                    <Youtube className="h-8 w-8 text-red-600 text-left" />
                    Living Testimonies
                </CardTitle>
                <CardDescription className="text-zinc-400 text-sm sm:text-base font-medium text-left">
                    Experience the power of God through these captured moments of glory.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-12 pb-12 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {videoTestimonies.map((video, idx) => (
                        <div key={idx} className="space-y-3 text-left">
                            {video.title && (
                                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 truncate ml-2 text-center md:text-left text-left">
                                    {video.title}
                                </h4>
                            )}
                            <div className="relative w-full aspect-video rounded-xl sm:rounded-[1.5rem] overflow-hidden bg-black shadow-2xl border border-white/5 transition-transform duration-300 hover:scale-[1.02] text-left">
                                <iframe
                                    src={video.embedUrl!}
                                    title={video.title || `Video Testimony from ${displayName}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full border-0 text-left"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}

      <div className="space-y-10 text-left">
        <div className="flex items-center justify-center md:justify-start gap-3 px-4 sm:px-0 text-left text-left">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 text-left">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground text-left" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase text-left">Kingdom Activity</h2>
        </div>
        
        <div className="space-y-12 text-left">
            <div className="space-y-6 text-left">
                <div className="flex items-center justify-between px-4 sm:px-0 text-left">
                    <div className="flex items-center gap-2 text-left">
                        <Sparkles className="h-4 w-4 text-primary text-left text-left" />
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-left">Shared Testimonies ({testimonies.length})</h3>
                    </div>
                </div>
                
                {testimonies.length > 0 ? (
                    <div className="flex flex-col gap-0 w-full max-w-2xl mx-auto -mx-4 sm:mx-auto text-left">
                        {testimonies.map(testimony => (
                            <TestimonyCard 
                                key={testimony.id} 
                                testimony={testimony} 
                                onDelete={() => {}} 
                                onEdit={() => {}} 
                                isPartner={isPartner}
                                hasPendingRequest={hasPendingRequest}
                                currentUserProfile={currentUserProfile}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-muted/20 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-muted mx-4 sm:mx-0 text-left text-left">
                        <Newspaper className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3 text-left" />
                        <p className="text-xs sm:text-sm text-muted-foreground italic font-medium text-balance px-8 text-center text-left">No shared testimonies found in this folder.</p>
                    </div>
                )}
            </div>

            <div className="space-y-6 text-left">
                <div className="flex items-center gap-2 px-4 sm:px-0 text-left">
                    <CalendarDays className="h-4 w-4 text-primary text-left" />
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-left">Organized Campaigns ({processedCampaigns.length})</h3>
                </div>
                {processedCampaigns.length > 0 ? (
                    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto -mx-4 sm:mx-auto text-left">
                        {processedCampaigns.map(campaign => (
                            <CampaignCard 
                                key={campaign.id} 
                                campaign={campaign} 
                                userId={currentUser?.uid} 
                                userProfile={currentUserProfile} 
                                distance={campaign.distance} 
                                onManage={() => {}} 
                                onLogSoul={() => {}} 
                                onShareTestimony={() => {}} 
                                onDelete={() => {}} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-muted/20 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-muted mx-4 sm:mx-0 text-left text-left">
                        <Target className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3 text-left" />
                        <p className="text-xs sm:text-sm text-muted-foreground italic font-medium text-balance px-8 text-center text-left">No public mission campaigns organized.</p>
                    </div>
                )}
            </div>
        </div>

        {testimonies.length === 0 && processedCampaigns.length === 0 && (
            <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[2rem] sm:rounded-[3.5rem] bg-muted/5 mx-4 sm:mx-0 text-left">
                <Globe className="h-16 w-16 text-muted-foreground/5 mx-auto mb-6 text-left" />
                <p className="font-black text-xl sm:text-2xl px-8 leading-tight uppercase tracking-widest text-muted-foreground/30 text-center text-left">
                    Faith in the Secret Place
                </p>
                <p className="text-xs sm:text-sm mt-3 px-12 opacity-50 font-medium max-w-md mx-auto text-center text-left">
                    This believer is actively serving the Kingdom through prayer and local fellowship.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}

