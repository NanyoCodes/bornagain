'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { Testimony, Campaign, UserProfile } from '@/lib/types';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, Mail, MapPin, ArrowLeft, Edit, Youtube, Globe, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

  const testimonies = useMemo(() => {
    if (!userTestimonies) return [];
    return [...userTestimonies].sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [userTestimonies]);
  
  const campaignsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', userId));
  }, [userId, firestore]);
  const { data: allCampaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const activeCampaigns = useMemo(() => {
    if (!allCampaigns) return [];
    return allCampaigns
      .filter(campaign => campaign.status === 'active')
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [allCampaigns]);


  const loading = profileLoading || testimoniesLoading || campaignsLoading || userLoading;

  const embedUrl = useMemo(() => getYouTubeEmbedUrl(userProfile?.videoTestimonyUrl), [userProfile?.videoTestimonyUrl]);

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-medium animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12 px-4">
        <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold font-headline">User Not Found</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">This profile might have been set to private or no longer exists.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-8">
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
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto px-4 md:px-0">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="w-fit h-9">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back
        </Button>
      
      <Card className="rounded-2xl overflow-hidden shadow-md">
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 md:gap-8">
            <Dialog>
              <DialogTrigger asChild disabled={!photoURL}>
                <div className="relative group">
                    <Avatar className={cn(
                        "h-28 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 border-4 border-background shrink-0 shadow-xl", 
                        photoURL && "cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all"
                    )}>
                    <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} />
                    <AvatarFallback className="text-4xl sm:text-5xl font-bold bg-muted text-muted-foreground">
                        {initials || userProfile.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                    </Avatar>
                </div>
              </DialogTrigger>
              {photoURL && (
                <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile photo of {displayName}</DialogTitle>
                        <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                    </DialogHeader>
                    <Image src={photoURL} alt={displayName} width={600} height={600} className="rounded-2xl object-contain max-h-[80vh]" unoptimized/>
                </DialogContent>
              )}
            </Dialog>
            
            <div className="flex-grow min-w-0 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                    <div className="flex-grow min-w-0">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-headline truncate leading-tight">{displayName}</h1>
                        {(city || state || country) && (
                            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-primary font-bold text-xs sm:text-sm mt-1 uppercase tracking-wider">
                                <MapPin className="h-3.5 w-3.5" /> 
                                {[city, state].filter(Boolean).join(', ') || country}
                            </div>
                        )}
                    </div>
                    {isOwnProfile && (
                         <div className="shrink-0">
                            <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-full font-bold">
                                <Link href="/dashboard/profile">
                                    <Edit className="mr-2 h-3.5 w-3.5" />
                                    Edit Profile
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
                
                <div className="relative">
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                        {bio || "This user is a member of the global harvest and hasn't set a personal bio yet."}
                    </p>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {embedUrl && (
        <Card className="rounded-2xl overflow-hidden shadow-md border-t-4 border-t-red-600">
            <CardHeader className="pb-4 pt-6 sm:px-8">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold font-headline">
                    <Youtube className="h-5 w-5 text-red-600" />
                    Video Testimony
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Sharing God's power and grace through visual testimony.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-8 pb-8">
                <div className="relative w-full aspect-video sm:rounded-2xl overflow-hidden bg-black shadow-2xl group">
                    <iframe
                        src={embedUrl}
                        title={`Video Testimony from ${displayName}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                    />
                </div>
            </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl sm:text-2xl font-black font-headline tracking-tight uppercase">Kingdom Activity</h2>
        </div>
        
        <Accordion type="multiple" defaultValue={['testimonies', 'campaigns']} className="w-full space-y-4">
          <Card className="rounded-2xl overflow-hidden border shadow-sm">
            <AccordionItem value="testimonies" className="border-b-0">
                <AccordionTrigger className="w-full px-6 py-5 hover:no-underline hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="bg-chart-3/10 p-2 rounded-lg">
                            <Activity className="h-4 w-4 text-chart-3" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold">Shared Testimonies ({testimonies.length})</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-6 pt-2">
                    {testimonies.length > 0 ? (
                        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {testimonies.map(testimony => (
                                <div key={testimony.id} className="-mx-2 sm:mx-0">
                                    <TestimonyCard testimony={testimony} onDelete={() => {}} onEdit={() => {}} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-4">No testimonies shared yet.</p>
                    )}
                </AccordionContent>
            </AccordionItem>
          </Card>
          
          <Card className="rounded-2xl overflow-hidden border shadow-sm">
            <AccordionItem value="campaigns" className="border-b-0">
                <AccordionTrigger className="w-full px-6 py-5 hover:no-underline hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Target className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold">Organized Campaigns ({activeCampaigns.length})</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-6 pb-6 pt-2">
                    {activeCampaigns.length > 0 ? (
                        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {activeCampaigns.map(campaign => (
                                <div key={campaign.id} className="-mx-2 sm:mx-0">
                                    <CampaignCard 
                                        campaign={campaign} 
                                        userId={currentUser?.uid} 
                                        userProfile={userProfile} 
                                        distance={null} 
                                        onManage={() => {}} 
                                        onLogSoul={() => {}} 
                                        onShareTestimony={() => {}} 
                                        onDelete={() => {}} 
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-4">No public campaigns active.</p>
                    )}
                </AccordionContent>
            </AccordionItem>
          </Card>
        </Accordion>

        {testimonies.length === 0 && activeCampaigns.length === 0 && (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/10 mx-1">
                <Globe className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="font-bold text-sm sm:text-base px-6">This user is active in the secret place.</p>
                <p className="text-xs mt-1 px-8 opacity-70">No public testimonies or campaigns have been shared yet.</p>
            </div>
        )}
      </div>
      
      <footer className="pt-12 pb-20 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            Glorifying God Through Technology
        </p>
      </footer>
    </div>
  );
}
