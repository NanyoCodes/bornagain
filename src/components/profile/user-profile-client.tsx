
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
    Video,
    MessageSquare
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

  const { firstName, lastName, photoURL, bio, personalMessage, location } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, state, country } = location || {};
  const initials = (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-0 sm:px-4 pb-20">
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
      <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-gradient-to-br from-background via-background to-primary/5">
        <div className="h-40 sm:h-64 w-full bg-zinc-900 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-zinc-900/80 z-10" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-30" />
        </div>
        <CardContent className="p-6 sm:p-12 lg:p-16 -mt-20 sm:-mt-32 relative z-20">
          <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-8 md:gap-12">
            <Dialog>
              <DialogTrigger asChild disabled={!photoURL}>
                <div className="relative group shrink-0">
                    <Avatar className={cn(
                        "h-40 w-40 sm:h-52 sm:w-52 lg:h-64 lg:w-64 border-[8px] border-background shrink-0 shadow-2xl transition-all duration-500", 
                        photoURL && "cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-primary/10"
                    )}>
                    <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} className="object-cover" />
                    <AvatarFallback className="text-6xl lg:text-7xl font-black bg-primary/10 text-primary">
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
            
            <div className="flex-grow min-w-0 space-y-6 pb-4">
                <div className="space-y-2">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-headline truncate leading-none tracking-tight">{displayName}</h1>
                    {(city || state || country) && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-black text-sm sm:text-base uppercase tracking-[0.3em]">
                            <MapPin className="h-5 w-5" /> 
                            {[city, state].filter(Boolean).join(', ') || country}
                        </div>
                    )}
                </div>

                {personalMessage && (
                    <div className="bg-primary/10 p-6 rounded-[2rem] border-2 border-primary/20 inline-flex items-center gap-4 text-left max-w-2xl group transition-all hover:bg-primary/15 shadow-xl shadow-primary/5">
                        <MessageSquare className="h-6 w-6 text-primary shrink-0 transition-transform group-hover:scale-110" />
                        <p className="text-lg sm:text-xl font-black text-foreground leading-tight italic tracking-tight">
                            &ldquo;{personalMessage}&rdquo;
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                     <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-2xl border">
                        <Newspaper className="h-4 w-4 text-primary" />
                        <span className="text-lg font-black">{testimonies.length}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Testimonies</span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-2xl border">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-lg font-black">{activeCampaigns.length}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Campaigns</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="mt-12 max-w-3xl">
            <div className="relative pl-6 sm:pl-8 border-l-4 border-primary/20">
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed italic font-medium">
                    {bio ? `"${bio}"` : "This believer is a member of the global harvest workforce, dedicated to sharing the goodness of Jesus Christ with the world."}
                </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Video Testimony Showcase */}
      {videoTestimonies.length > 0 && (
        <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-t-8 border-t-red-600 bg-zinc-950">
            <CardHeader className="pb-8 pt-12 px-8 sm:px-16">
                <CardTitle className="flex items-center gap-4 text-3xl sm:text-4xl font-black font-headline text-white tracking-tight">
                    <Youtube className="h-10 w-10 text-red-600" />
                    Living Testimonies
                </CardTitle>
                <CardDescription className="text-zinc-400 text-base sm:text-lg font-medium">
                    Experience the power of God through these captured moments of glory.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-16 pb-16">
                <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex gap-8 p-8 sm:p-0 flex-nowrap">
                        {videoTestimonies.map((video, idx) => (
                            <div key={idx} className="flex-shrink-0 w-[320px] sm:w-[500px] space-y-4">
                                {video.title && (
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 truncate ml-2">
                                        {video.title}
                                    </h4>
                                )}
                                <div className="relative w-full aspect-video sm:rounded-[2rem] overflow-hidden bg-black shadow-2xl border border-white/5 transition-transform duration-300 hover:scale-[1.02]">
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
                </div>
            </CardContent>
        </Card>
      )}

      {/* Activity Feed Section */}
      <div className="space-y-10 px-4 sm:px-0">
        <div className="flex items-center gap-4 px-2">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase">Kingdom Activity</h2>
        </div>
        
        <div className="grid gap-12 lg:grid-cols-12">
            {/* Testimonies Section */}
            <div className="lg:col-span-12 space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-black uppercase tracking-tight">Shared Testimonies ({testimonies.length})</h3>
                    </div>
                </div>
                
                {testimonies.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted">
                        <Newspaper className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground italic font-medium">No shared testimonies found in this folder.</p>
                    </div>
                )}
            </div>

            <div className="lg:col-span-12">
                <Separator className="opacity-50" />
            </div>

            {/* Campaigns Section */}
            <div className="lg:col-span-12 space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tight">Organized Campaigns ({activeCampaigns.length})</h3>
                </div>
                {activeCampaigns.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted">
                        <Target className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground italic font-medium">No public mission campaigns organized.</p>
                    </div>
                )}
            </div>
        </div>

        {testimonies.length === 0 && activeCampaigns.length === 0 && (
            <div className="text-center py-32 text-muted-foreground border-2 border-dashed rounded-[3.5rem] bg-muted/5 mx-1">
                <Globe className="h-20 w-20 text-muted-foreground/5 mx-auto mb-8" />
                <p className="font-black text-2xl px-12 leading-tight uppercase tracking-widest text-muted-foreground/30">
                    Faith in the Secret Place
                </p>
                <p className="text-sm mt-4 px-16 opacity-50 font-medium max-w-md mx-auto">
                    This believer is actively serving the Kingdom through prayer and local fellowship.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
