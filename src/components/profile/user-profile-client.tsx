'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useUser, useAuth, useCollection, useUserProfile, useFirestore } from '@/firebase';
import type { Testimony, Campaign, UserProfile, AccountabilityRequest } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { doc, updateDoc, serverTimestamp, collection, query, where, setDoc, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Loader2, 
    ArrowLeft, 
    MapPin, 
    Edit, 
    Youtube, 
    Globe, 
    Activity, 
    Target, 
    Newspaper,
    HeartHandshake,
    Sparkles,
    CalendarDays,
    MessageSquare,
    UserPlus,
    Hourglass,
    Briefcase,
    Heart,
    ChevronRight,
    Quote,
    X,
    TrendingUp
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { cn, safeToDate, haversineDistance } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import { EditProfileModal } from './edit-profile-modal';

function getYouTubeEmbedUrl(url: string | undefined | null) {
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
  const isPartnerMember = partnerIds.has(userId);
  const isPendingPartner = pendingRequestIds.has(userId);

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
    if (!currentUser || !firestore || !currentUserProfile || isOwnProfile || isPartnerMember || isPendingPartner) return;
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
  
  const videoTestimoniesList = useMemo(() => {
    const list = [...(userProfile?.videoTestimonies || [])];
    return list.map(v => ({ ...v, embedUrl: getYouTubeEmbedUrl(v.url) })).filter(v => !!v.embedUrl);
  }, [userProfile]);

  if (loading || !mounted) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-24 text-center text-left">
        <div className="relative mb-8 mx-auto text-left">
            <Loader2 className="h-12 w-12 animate-spin text-primary text-left" />
            <div className="absolute inset-0 flex items-center justify-center text-left">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse text-left" />
            </div>
        </div>
        <p className="text-xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-8 text-left">Connecting Identity...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-24 px-4 space-y-6 text-left">
        <div className="bg-muted/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner text-left">
            <Globe className="h-10 w-10 text-muted-foreground/30 text-left" />
        </div>
        <div className="space-y-2 text-left">
            <h3 className="text-2xl font-bold font-headline text-center text-balance text-left">Profile Not Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto text-center text-balance text-left">This profile might have been set to private or the believer has moved to a new station.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="h-11 px-8 rounded-full mx-auto block font-bold text-left">
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
    <div className="space-y-6 sm:space-y-10 max-w-6xl mx-auto px-4 pb-20 text-left">
        <div className="flex items-center justify-between text-left">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-9 px-0 text-muted-foreground hover:text-foreground text-left">
                <ArrowLeft className="mr-2 h-4 w-4 text-left"/>
                Back
            </Button>
            {isOwnProfile && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-6 rounded-full font-bold shadow-sm text-left"
                    onClick={() => setIsEditModalOpen(true)}
                >
                    <Edit className="mr-2 h-3.5 w-3.5 text-left" />
                    Edit Identity
                </Button>
            )}
        </div>
      
      <Card className="rounded-none sm:rounded-[3rem] overflow-hidden border-none shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 text-left text-left">
        <CardContent className="p-5 sm:p-12 lg:p-16 relative z-20 text-left text-left">
          <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-8 lg:gap-16 text-left">
            <div className="relative shrink-0 flex justify-center w-full lg:w-auto text-left text-left">
              <Dialog>
                <DialogTrigger asChild disabled={!photoURL}>
                  <div className="relative group shrink-0 text-left text-left">
                      <Avatar className={cn(
                          "h-32 w-32 sm:h-48 sm:w-48 lg:h-64 lg:w-64 border-[6px] border-background shrink-0 shadow-2xl transition-all duration-500 text-left", 
                          photoURL && "cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-primary/10"
                      )}>
                      <AvatarImage src={photoURL ?? undefined} alt={displayName || 'believer'} className="object-cover text-left" />
                      <AvatarFallback className="text-4xl lg:text-6xl font-black bg-primary/10 text-primary text-center flex items-center justify-center h-full w-full text-left">
                          {initials || userProfile.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                      </Avatar>
                  </div>
                </DialogTrigger>
                {photoURL && (
                  <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center text-left text-left">
                      <div className="sr-only text-left text-left text-left text-left"><DialogHeader className="text-left text-left text-left text-left text-left text-left"><DialogTitle className="text-left text-left text-left text-left text-left text-left text-left">Identity Preview</DialogTitle></DialogHeader></div>
                      <div className="relative h-full w-full flex items-center justify-center p-4 text-center text-left text-left">
                          <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left text-left">
                              <Image 
                                  src={photoURL} 
                                  alt={displayName} 
                                  fill 
                                  className="object-contain shadow-2xl ring-4 ring-white/10 text-left text-left" 
                                  unoptimized 
                              />
                          </div>
                      </div>
                  </DialogContent>
                )}
              </Dialog>
            </div>
            
            <div className="flex-1 min-w-0 space-y-6 w-full text-center lg:text-left text-left text-left">
                <div className="space-y-4 text-center lg:text-left text-left text-left">
                    <div className="flex flex-col items-center lg:items-start justify-between gap-6 text-center lg:text-left text-left text-left">
                        <div className="min-w-0 space-y-3 text-center lg:text-left text-left w-full text-left">
                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-headline tracking-tight leading-tight uppercase text-balance break-words text-center lg:text-left text-left text-left">{displayName}</h1>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground font-medium text-left text-left">
                                {(city || state || country) && (
                                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-wider text-left text-left">
                                        <MapPin className="h-4 w-4 text-left text-left" /> 
                                        {[city, state].filter(Boolean).join(', ') || country}
                                    </div>
                                )}
                                {maritalStatus && (
                                    <div className="flex items-center gap-1.5 text-left text-left">
                                        <Heart className="h-3.5 w-3.5 text-primary text-left text-left" />
                                        {maritalStatus}
                                    </div>
                                )}
                                {workStatus && (
                                    <div className="flex items-center gap-1.5 text-left text-left">
                                        <Briefcase className="h-3.5 w-3.5 text-primary text-left text-left" />
                                        <span className="font-bold uppercase tracking-tight text-balance text-left text-left">
                                            {roleInOrganization && `${roleInOrganization}${organizationName ? ' @ ' : ''}`}
                                            {organizationName || workStatus}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isOwnProfile && currentUserProfile && (
                            <div className="shrink-0 flex justify-center lg:justify-end gap-2 w-full lg:w-auto text-left text-left">
                                {isPartnerMember ? (
                                    <Badge variant="secondary" className="h-11 px-8 rounded-full font-black tracking-widest bg-primary/10 text-primary border-primary/20 flex items-center gap-2 text-[10px] text-left text-left">
                                        <HeartHandshake className="h-4 w-4 text-left text-left" />
                                        ALLIANCE ACTIVE
                                    </Badge>
                                ) : isPendingPartner ? (
                                    <Button variant="outline" className="h-11 px-8 rounded-full font-black tracking-widest opacity-70 text-[10px] text-left text-left" disabled>
                                        <Hourglass className="mr-2 h-4 w-4 animate-pulse text-left text-left" />
                                        PENDING
                                    </Button>
                                ) : (
                                    <Button 
                                        className="h-11 px-8 rounded-full font-black shadow-xl shadow-primary/20 uppercase tracking-widest text-[10px] text-center text-left text-left"
                                        onClick={handleSendPartnerRequest}
                                        disabled={isRequestingPartner}
                                    >
                                        {isRequestingPartner ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" /> : <UserPlus className="mr-2 h-4 w-4 text-left text-left" />}
                                        CONNECT PARTNER
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {personalMessage && (
                        <div className="bg-primary/10 p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-primary/20 inline-flex items-start lg:items-center gap-4 group transition-all hover:bg-primary/15 shadow-xl shadow-primary/5 w-full text-left text-left">
                            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0 mt-1 lg:mt-0 transition-transform group-hover:scale-110 text-left text-left" />
                            <p className="text-base sm:text-xl lg:text-2xl font-black text-foreground leading-tight italic tracking-tight text-balance break-words text-left text-left">
                                &ldquo;{personalMessage}&rdquo;
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-3 text-left text-left">
                     <div className="flex items-center gap-2.5 bg-muted/40 px-4 py-2 rounded-2xl border shadow-inner text-left text-left">
                        <Newspaper className="h-4 w-4 text-primary text-left text-left" />
                        <span className="text-lg font-black text-left text-left">{testimonies.length}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left text-left">Testimonies</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-muted/40 px-4 py-2 rounded-2xl border shadow-inner text-left text-left">
                        <Target className="h-4 w-4 text-primary text-left text-left" />
                        <span className="text-lg font-black text-left text-left">{processedCampaigns.length}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left text-left">Missions</span>
                    </div>
                </div>

                <div className="pt-4 lg:max-w-2xl text-left text-left">
                    <div className="relative pl-6 border-l-4 border-primary/20 text-left text-left">
                        <Quote className="absolute -top-1 -left-2 h-6 w-6 text-primary/10 text-left text-left" />
                        <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed italic font-medium text-balance break-words text-left text-left">
                            {bio ? bio : "This believer is a dedicated member of the global Kingdom workforce, committed to sharing the goodness of Jesus Christ with the nations."}
                        </p>
                    </div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {videoTestimoniesList.length > 0 && (
        <Card className="rounded-none sm:rounded-[3rem] overflow-hidden shadow-2xl border-t-8 border-t-red-600 bg-zinc-950 text-left text-left">
            <CardHeader className="pb-6 pt-10 px-5 sm:px-12 text-center md:text-left text-left text-left text-left text-left">
                <CardTitle className="flex items-center justify-center md:justify-start gap-3 sm:gap-4 text-2xl sm:text-4xl font-black font-headline text-white tracking-tight uppercase text-left text-left text-left text-left text-left">
                    <Youtube className="h-8 w-8 sm:h-10 sm:w-10 text-red-600 text-left text-left text-left text-left text-left" />
                    Living Testimonies
                </CardTitle>
                <CardDescription className="text-zinc-400 text-sm sm:text-lg font-medium text-center md:text-left max-w-2xl mx-auto md:mx-0 text-left text-left text-left text-left">
                    Witness the manifest power of God through these captured moments of miracle and glory.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-12 pb-12 sm:pb-16 text-left text-left">
                <div className="flex flex-col gap-8 sm:gap-12 text-left text-left">
                    {videoTestimoniesList.map((video, idx) => (
                        <div key={idx} className="space-y-4 text-left text-left">
                            <div className="relative w-full aspect-video rounded-2xl sm:rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border-2 border-white/5 group/vid text-left text-left">
                                <iframe
                                    src={`${video.embedUrl!}?rel=0&modestbranding=1`}
                                    title={video.title || `Kingdom Testimony`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 w-full h-full border-0 text-left text-left"
                                />
                                <div className="absolute top-4 left-6 z-10 opacity-0 group-hover/vid:opacity-100 transition-opacity text-left text-left">
                                    <Badge className="bg-red-600 text-white font-black text-[10px] tracking-widest uppercase border-none text-left text-left">YOUTUBE</Badge>
                                </div>
                            </div>
                            {video.title && (
                                <h4 className="text-xs sm:text-lg font-black uppercase tracking-widest text-zinc-500 ml-2 text-left text-left">
                                    {video.title}
                                </h4>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}

      <div className="space-y-12 text-left text-left text-left text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-0 text-left text-left text-left">
            <div className="flex items-center gap-3 text-left text-left text-left">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 shrink-0 text-left text-left text-left">
                    <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground text-left text-left text-left" />
                </div>
                <h2 className="text-2xl font-black font-headline tracking-tight uppercase text-left text-left">Kingdom Activity</h2>
            </div>
            <div className="h-px bg-muted flex-grow hidden sm:block mx-8 text-left text-left" />
            <Badge variant="outline" className="h-8 px-4 font-black uppercase tracking-[0.2em] border-primary/20 text-primary bg-primary/5 text-[10px] text-left text-left">Mobilizer Dashboard</Badge>
        </div>
        
        <div className="space-y-16 text-left text-left">
            <div className="space-y-8 text-left text-left text-left">
                <div className="flex items-center justify-between px-4 sm:px-0 text-left text-left text-left">
                    <div className="flex items-center gap-2 text-left text-left text-left">
                        <Sparkles className="h-5 w-5 text-primary text-left text-left text-left" />
                        <h3 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Shared Testimonies</h3>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-4 h-7 font-black text-xs text-left text-left">{testimonies.length}</Badge>
                </div>
                
                {testimonies.length > 0 ? (
                    <div className="flex flex-col gap-0 w-full max-w-3xl mx-auto -mx-4 sm:mx-auto text-left text-left">
                        {testimonies.map(testimony => (
                            <TestimonyCard 
                                key={testimony.id} 
                                testimony={testimony} 
                                onDelete={() => {}} 
                                onEdit={() => {}} 
                                isPartner={isPartnerMember}
                                hasPendingRequest={isPendingPartner}
                                currentUserProfile={currentUserProfile}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-muted mx-4 sm:mx-0 text-left text-left">
                        <Newspaper className="h-12 w-12 text-muted-foreground/10 mx-auto mb-4 text-left text-left" />
                        <p className="text-sm sm:text-base text-muted-foreground italic font-medium text-balance px-8 text-center text-left text-left text-left">This folder is currently empty. No shared testimonies recorded.</p>
                    </div>
                )}
            </div>

            <div className="space-y-8 text-left text-left text-left text-left">
                <div className="flex items-center justify-between px-4 sm:px-0 text-left text-left text-left text-left">
                    <div className="flex items-center gap-2 text-left text-left text-left text-left">
                        <CalendarDays className="h-5 w-5 text-primary text-left text-left text-left text-left" />
                        <h3 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">Organized Campaigns</h3>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-4 h-7 font-black text-xs text-left text-left text-left">{processedCampaigns.length}</Badge>
                </div>
                {processedCampaigns.length > 0 ? (
                    <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto -mx-4 sm:mx-auto text-left text-left text-left text-left">
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
                    <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-muted mx-4 sm:mx-0 text-left text-left text-left text-left">
                        <Target className="h-12 w-12 text-muted-foreground/10 mx-auto mb-4 text-left text-left text-left text-left" />
                        <p className="text-sm sm:text-base text-muted-foreground italic font-medium text-balance px-8 text-center text-left text-left text-left text-left">No public mission campaigns have been organized by this believer.</p>
                    </div>
                )}
            </div>
        </div>

        {testimonies.length === 0 && processedCampaigns.length === 0 && (
            <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[3rem] sm:rounded-[4rem] bg-muted/5 mx-4 sm:mx-0 text-left text-left text-left text-left">
                <Globe className="h-20 w-20 text-muted-foreground/5 mx-auto mb-6 text-left text-left text-left text-left" />
                <p className="font-black text-2xl sm:text-3xl px-8 leading-tight uppercase tracking-widest text-muted-foreground/20 text-center text-left text-left text-left text-left">
                    Mission in Secret
                </p>
                <p className="text-sm sm:text-lg mt-4 px-12 opacity-50 font-medium max-w-lg mx-auto text-center text-left text-left text-left text-left">
                    This believer is serving the Kingdom through prayer and local fellowship. Their impact is registered in the Book of Life.
                </p>
            </div>
        )}
      </div>

      {isOwnProfile && userProfile && (
          <Drawer open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DrawerContent className="h-[95dvh] flex flex-col p-0 overflow-hidden rounded-t-[2.5rem] border-none shadow-2xl text-left text-left text-left text-left">
                  <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left">
                      <div className="p-0 text-left text-left text-left text-left text-left text-left">
                          <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left text-left text-left">
                              <Sparkles className="h-4 w-4 text-primary text-left text-left text-left text-left text-left text-left" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left text-left text-left">Identity settings</span>
                          </div>
                          <DrawerTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left">Edit Kingdom Profile</DrawerTitle>
                          <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left text-left text-left">Keep your identity current for the harvest workforce.</DrawerDescription>
                      </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 text-left text-left text-left text-left text-left">
                      <div className="p-5 sm:p-10 text-left text-left text-left text-left text-left">
                        <EditProfileModal userProfile={userProfile} onClose={() => setIsEditModalOpen(false)} />
                      </div>
                  </ScrollArea>
              </DrawerContent>
          </Drawer>
      )}
    </div>
  );
}
