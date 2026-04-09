'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection } from '@/firebase';
import type { UserProfile, Testimony, Campaign } from '@/lib/types';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { Loader2, Mail, MapPin, ArrowLeft, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import Link from 'next/link';

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
    // Remove orderBy to avoid needing a composite index. We'll sort client-side.
    return query(collection(firestore, 'testimonies'), where('authorId', '==', userId));
  }, [userId, firestore]);
  const { data: userTestimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

  const testimonies = useMemo(() => {
    if (!userTestimonies) return [];
    // Sort client-side
    return [...userTestimonies].sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [userTestimonies]);
  
  const campaignsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    // Query only by organizerId to avoid composite index.
    // Filtering and sorting will be done client-side.
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
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shrink-0">
              <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} />
              <AvatarFallback className="text-4xl sm:text-5xl">
                {firstName?.charAt(0) || email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow">
                <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex-grow">
                        <h1 className="text-2xl sm:text-3xl font-bold font-headline">{displayName}</h1>
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
                {email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {testimonies && testimonies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Testimonies by {firstName}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonies.map(testimony => (
              <TestimonyCard key={testimony.id} testimony={testimony} distance={null} />
            ))}
          </div>
        </div>
      )}
      
      {activeCampaigns && activeCampaigns.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Campaigns Organized by {firstName}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} userId={currentUser?.uid} userProfile={userProfile} distance={null} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
