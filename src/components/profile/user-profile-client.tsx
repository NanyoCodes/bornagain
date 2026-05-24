
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Testimony, Campaign, UserProfile } from '@/lib/types';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { 
    Loader2, 
    Mail, 
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
    Video
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { cn, safeToDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '../ui/scroll-area';

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
  const firestore = useFirestore();
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isOwnProfile = currentUser?.uid === userId;

  const userDocRef = useMemo(() => {
    if (!userId || !firestore) return null;
    return doc(firestore, 'users', userId);
  }, [userId, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

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

  const testimonies = useMemo(() => {
    if (!userTestimonies) return [];
    return [...userTestimonies].sort((a, b) => {
        const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
      });
  }, [userTestimonies]);

  const activeCampaigns = useMemo(() => {
    if (!allCampaigns) return [];
    return allCampaigns
      .filter(campaign => campaign.status === 'active')
      .sort((a, b) => {
        const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return timeB - timeA;
      });
  }, [allCampaigns]);

  const loading = profileLoading || testimoniesLoading || campaignsLoading || userLoading;
  
  const videoTestimonies = useMemo(() => {
    const list = [...(userProfile?.videoTestimonies || [])];
    if (userProfile?.videoTestimonyUrl && !list.some(v => v.url === userProfile.videoTestimonyUrl)) {
        list.unshift({ url: userProfile.videoTestimonyUrl, title: "My Testimony" });
    }
    return list.map(v => ({ ...v, embedUrl: getYouTubeEmbedUrl(v.url) })).filter(v => !!v.embedUrl);
  }, [userProfile]);

  if (loading || !mounted) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-medium animate-pulse">Connecting to the harvest...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-24 px-4 space-y-6">
        <div className="bg-muted/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Globe className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
            <h3 className="text-2xl font-bold font-headline">Profile Not Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">This profile might have been set to private or the believer has moved to a new station.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="h-11 px-8 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const { firstName, lastName, photoURL, bio, location } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, state, country } = location || {};
  const initials = (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between px-4 sm:px-0">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-9 pr-4 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back
            </Button>
            {isOwnProfile && (
                <Button asChild variant="outline" size="sm" className="h-9 px-6 rounded-full font-bold shadow-sm">
                    <Link href="/dashboard/profile">
                        <Edit className="mr-2 h-3.5 w-3.5" />
                        Edit Profile
                    </Link>
                </Button>
            )}
        </div>
      
      {/* Cinematic Header Card */}
      <Card className="rounded-3xl overflow-hidden border-none shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
        <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        </div>
        <CardContent className="p-6 sm:p-10 lg:p-12 -mt-16 sm:-mt-24">
          <div className="flex flex-col sm:flex-row items-center sm:items-end text-center sm:text-left gap-6 md:gap-8">
            <Dialog>
              <DialogTrigger asChild disabled={!photoURL}>
                <div className="relative group">
                    <Avatar className={cn(
                        "h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 border-[6px] border-background shrink-0 shadow-2xl transition-all duration-300", 
                        photoURL && "cursor-pointer hover:scale-105 active:scale-95 ring-1 ring-primary/20"
                    )}>
                    <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} className="object-cover" />
                    <AvatarFallback className="text-5xl lg:text-6xl font-black bg-primary/10 text-primary">
                        {initials || userProfile.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                    </Avatar>
                </div>
              </DialogTrigger>
              {photoURL && (
                <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg overflow-hidden rounded-3xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile photo of {displayName}</DialogTitle>
                        <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                    </DialogHeader>
                    <Image src={photoURL} alt={displayName} width={800} height={800} className="rounded-3xl object-contain max-h-[85vh] shadow-2xl" unoptimized/>
                </DialogContent>
              )}
            </Dialog>
            
            <div className="flex-grow min-w-0 space-y-4 pb-2">
                <div className="space-y-1.5">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-headline truncate leading-tight tracking-tight">{displayName}</h1>
                    {(city || state || country) && (
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-primary font-black text-xs sm:text-sm uppercase tracking-[0.2em]">
                            <MapPin className="h-4 w-4" /> 
                            {[city, state].filter(Boolean).join(', ') || country}
                        </div>
                    )}
                </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Bio Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full hidden sm:block" />
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed italic">
                        {bio ? `"${bio}"` : "This believer is a member of the global harvest workforce, dedicated to sharing the goodness of Jesus Christ with the world."}
                    </p>
                </div>
              </div>

              {/* Kingdom Stats Grid */}
              <div className="grid grid-cols-2 gap-4 h-fit">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center space-y-1">
                      <Newspaper className="h-5 w-5 text-primary mb-1" />
                      <span className="text-2xl font-black">{testimonies.length}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Testimonies</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center space-y-1">
                      <Target className="h-5 w-5 text-primary mb-1" />
                      <span className="text-2xl font-black">{activeCampaigns.length}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Campaigns</span>
                  </div>
              </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Video Testimony Showcase */}
      {videoTestimonies.length > 0 && (
        <Card className="rounded-[2.5rem] overflow-hidden shadow-xl border-t-8 border-t-red-600 bg-zinc-950">
            <CardHeader className="pb-6 pt-10 px-8 sm:px-12">
                <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black font-headline text-white tracking-tight">
                    <Youtube className="h-8 w-8 text-red-600" />
                    Watch Glory
                </CardTitle>
                <CardDescription className="text-zinc-400 text-sm sm:text-base font-medium">
                    Experience the living testimony of God's power through these personal stories.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-12 pb-12">
                <ScrollArea className="w-full">
                    <div className="flex gap-6 p-6 sm:p-0">
                        {videoTestimonies.map((video, idx) => (
                            <div key={idx} className="flex-shrink-0 w-[300px] sm:w-[450px] space-y-3">
                                {video.title && (
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 truncate">
                                        {video.title}
                                    </h4>
                                )}
                                <div className="relative w-full aspect-video sm:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/5 group">
                                    <iframe
                                        src={video.embedUrl!}
                                        title={video.title || `Video Testimony from ${displayName}`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full border-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      )}

      {/* Activity Feed Section */}
      <div className="space-y-8 px-2 sm:px-0">
        <div className="flex items-center gap-3 px-1">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase">Kingdom Activity</h2>
        </div>
        
        <div className="grid gap-8">
            {/* Testimonies Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold tracking-tight">Shared Testimonies ({testimonies.length})</h3>
                </div>
                {testimonies.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {testimonies.map(testimony => (
                            <TestimonyCard 
                                key={testimony.id} 
                                testimony={testimony} 
                                onDelete={() => {}} 
                                onEdit={() => {}} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
                        <Newspaper className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground italic">No testimonies shared yet.</p>
                    </div>
                )}
            </div>

            <Separator className="opacity-50" />

            {/* Campaigns Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold tracking-tight">Organized Campaigns ({activeCampaigns.length})</h3>
                </div>
                {activeCampaigns.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {activeCampaigns.map(campaign => (
                            <CampaignCard 
                                key={campaign.id} 
                                campaign={campaign} 
                                userId={currentUser?.uid} 
                                userProfile={null} 
                                distance={null} 
                                onManage={() => {}} 
                                onLogSoul={() => {}} 
                                onShareTestimony={() => {}} 
                                onDelete={() => {}} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
                        <Target className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground italic">No public campaigns active.</p>
                    </div>
                )}
            </div>
        </div>

        {testimonies.length === 0 && activeCampaigns.length === 0 && (
            <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[3rem] bg-muted/10 mx-1">
                <Globe className="h-16 w-16 text-muted-foreground/10 mx-auto mb-6" />
                <p className="font-black text-lg sm:text-xl px-10 leading-tight uppercase tracking-tight text-muted-foreground/50">
                    Active in the secret place.
                </p>
                <p className="text-xs mt-3 px-12 opacity-60 font-medium">
                    This believer is dedicated to the harvest behind the scenes.
                </p>
            </div>
        )}
      </div>
      
      <footer className="pt-4 pb-16 text-center border-t border-dashed">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
            Kingdom Workforce • Testify Global Platform
        </p>
      </footer>
    </div>
  );
}
