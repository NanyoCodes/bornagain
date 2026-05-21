'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { UserProfile, Testimony, Campaign } from '@/lib/types';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, Mail, MapPin, ArrowLeft, Edit } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import Link from 'next/link';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-4 text-xl font-semibold">User Not Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">This user profile could not be found.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const { firstName, lastName, email, photoURL, bio, location } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, state, country } = location || {};

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => router.back()} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back
        </Button>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Dialog>
              <DialogTrigger asChild disabled={!photoURL}>
                <Avatar className={cn("h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shrink-0", photoURL && "cursor-pointer")}>
                  <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} />
                  <AvatarFallback className="text-4xl sm:text-5xl">
                    {firstName?.charAt(0) || email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DialogTrigger>
              {photoURL && (
                <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Profile photo of {displayName || 'user'}</DialogTitle>
                        <DialogDescription>A larger view of the user's profile photo.</DialogDescription>
                    </DialogHeader>
                    <Image src={photoURL} alt={displayName || 'user'} width={600} height={600} className="rounded-lg object-contain" unoptimized/>
                </DialogContent>
              )}
            </Dialog>
            <div className="flex-grow">
                <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex-grow">
                        <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
                        <p className="text-muted-foreground mt-2">{bio || "This user hasn't set a bio yet."}</p>
                    </div>
                    {isOwnProfile && (
                         <div className="mt-4 sm:mt-0 sm:ml-4 shrink-0">
                            <Button asChild>
                                <Link href="/dashboard/profile">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profile
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {(city || state || country) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {[city, state, country].filter(Boolean).join(', ')}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">User Activity</h2>
        <Accordion type="multiple" defaultValue={['testimonies', 'campaigns']} className="w-full space-y-4">
          {testimonies && testimonies.length > 0 && (
            <Card>
              <AccordionItem value="testimonies" className="border-b-0">
                  <AccordionTrigger className="w-full p-6 hover:no-underline">
                      <h3 className="text-lg font-semibold">Testimonies ({testimonies.length})</h3>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-0">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {testimonies.map(testimony => (
                          <TestimonyCard key={testimony.id} testimony={testimony} onDelete={() => {}} onEdit={() => {}} />
                          ))}
                      </div>
                  </AccordionContent>
              </AccordionItem>
            </Card>
          )}
          
          {activeCampaigns && activeCampaigns.length > 0 && (
            <Card>
              <AccordionItem value="campaigns" className="border-b-0">
                  <AccordionTrigger className="w-full p-6 hover:no-underline">
                      <h3 className="text-lg font-semibold">Campaigns Organized ({activeCampaigns.length})</h3>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-0">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {activeCampaigns.map(campaign => (
                          <CampaignCard key={campaign.id} campaign={campaign} userId={currentUser?.uid} userProfile={userProfile} distance={null} onManage={() => {}} onLogSoul={() => {}} onShareTestimony={() => {}} onDelete={() => {}} />
                          ))}
                      </div>
                  </AccordionContent>
              </AccordionItem>
            </Card>
          )}
        </Accordion>
        {(!testimonies || testimonies.length === 0) && (!activeCampaigns || activeCampaigns.length === 0) && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                This user has no public activity yet.
            </div>
        )}
      </div>
    </div>
  );
}