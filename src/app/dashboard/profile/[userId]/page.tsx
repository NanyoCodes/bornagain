
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Mail, MapPin, Newspaper, Phone, Target, UserCheck2, HeartHandshake, HandHeart } from "lucide-react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, where, doc, getDocs, documentId } from "firebase/firestore";
import type { Soul, Testimony, UserProfile, JoinedCampaign, Campaign, PrayerRequest } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

function StatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const [activeJoinedCampaigns, setActiveJoinedCampaigns] = useState<Campaign[]>([]);
  const [campaignsListLoading, setCampaignsListLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const { data: testimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

  const prayerRequestsQuery = useMemo(() => {
    if (!userId || !firestore || !isOwnProfile) return null;
    return query(collection(firestore, 'prayerRequests'), where('authorId', '==', userId));
  }, [userId, firestore, isOwnProfile]);
  const { data: prayerRequests, loading: prayerRequestsLoading } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const soulsQuery = useMemo(() => {
    if (!userId || !firestore || !isOwnProfile) return null;
    return query(collection(firestore, `users/${userId}/souls`));
  }, [userId, firestore, isOwnProfile]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const joinedCampaignsQuery = useMemo(() => {
    if (!userId || !firestore || !isOwnProfile) return null;
    return query(collection(firestore, `users/${userId}/joinedCampaigns`));
  }, [userId, firestore, isOwnProfile]);
  const { data: joinedCampaigns, loading: campaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  
  const createdCampaignsQuery = useMemo(() => {
    if (!userId || !firestore || !isOwnProfile) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', userId), where('status', '==', 'active'));
  }, [userId, firestore, isOwnProfile]);
  const { data: createdCampaigns, loading: createdCampaignsLoading } = useCollection<Campaign>(createdCampaignsQuery);

  useEffect(() => {
    if (!firestore || campaignsLoading || !joinedCampaigns || !isOwnProfile) {
        setActiveJoinedCampaigns([]);
        setCampaignsListLoading(false);
        return;
    }

    const joinedCampaignIds = joinedCampaigns.map(jc => jc.id);

    if (joinedCampaignIds.length === 0) {
        setActiveJoinedCampaigns([]);
        setCampaignsListLoading(false);
        return;
    }

    const fetchActiveCampaigns = async () => {
        setCampaignsListLoading(true);
        try {
            // Firestore 'in' query is limited to 30 elements per query.
            const chunks: string[][] = [];
            for (let i = 0; i < joinedCampaignIds.length; i += 30) {
                chunks.push(joinedCampaignIds.slice(i, i + 30));
            }

            const campaignPromises = chunks.map(chunk => {
                const q = query(
                    collection(firestore, 'campaigns'),
                    where(documentId(), 'in', chunk),
                    where('status', '==', 'active')
                );
                return getDocs(q);
            });

            const snapshots = await Promise.all(campaignPromises);
            const campaignsData: Campaign[] = [];
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    campaignsData.push({ id: doc.id, ...doc.data() } as Campaign);
                });
            });

            const joinedOnly = campaignsData.filter(c => c.organizerId !== userId);
            setActiveJoinedCampaigns(joinedOnly);

        } catch (error) {
            console.error("Error fetching active joined campaigns:", error);
            setActiveJoinedCampaigns([]);
        } finally {
            setCampaignsListLoading(false);
        }
    };

    fetchActiveCampaigns();
  }, [joinedCampaigns, campaignsLoading, firestore, userId, isOwnProfile]);


  const loading = profileLoading || testimoniesLoading || (isOwnProfile && (soulsLoading || campaignsLoading || createdCampaignsLoading || campaignsListLoading || prayerRequestsLoading));

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!userProfile) {
    return <p>User profile not found.</p>
  }
  
  const { firstName, lastName, email, photoURL, bio, location, phone } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, country } = location || {};

  const stats = {
    testimonies: testimonies?.length ?? 0,
    soulsWon: soulsWon?.length ?? 0,
    campaignsJoined: activeJoinedCampaigns.length,
    campaignsCreated: createdCampaigns?.length ?? 0,
    prayerRequests: prayerRequests?.length ?? 0,
  };
  
  const triggerButton = (
    <Button>
      <Edit className="mr-2 h-4 w-4" />
      Edit Profile
    </Button>
  );

  const formContent = <EditProfileModal userProfile={userProfile} onClose={() => setIsEditModalOpen(false)} />;

  return (
    <div className="space-y-8">
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
                        {!isOwnProfile && userProfile.accountabilityPartnerId === currentUser?.uid && (
                            <Badge variant="secondary" className="mt-2">
                                <HeartHandshake className="mr-2 h-4 w-4" />
                                Your Accountability Partner
                            </Badge>
                        )}
                        <p className="text-muted-foreground mt-2">{bio || (isOwnProfile ? "You haven't set a bio yet. You can add one by editing your profile." : "This user has not set a bio.")}</p>
                    </div>
                    {isOwnProfile && (
                        <div className="mt-4 sm:mt-0 sm:ml-4 shrink-0">
                            {mounted && isMobile ? (
                                <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <SheetTrigger asChild>{triggerButton}</SheetTrigger>
                                <SheetContent side="bottom">
                                    <SheetHeader>
                                    <SheetTitle>Edit Profile</SheetTitle>
                                    <SheetDescription>
                                        Make changes to your public profile.
                                    </SheetDescription>
                                    </SheetHeader>
                                    <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                                    {formContent}
                                    </div>
                                </SheetContent>
                                </Sheet>
                            ) : (
                                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                                <DialogTrigger asChild>{triggerButton}</DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                    <DialogTitle>Edit Profile</DialogTitle>
                                    <DialogDesc>
                                        Make changes to your public profile.
                                    </DialogDesc>
                                    </DialogHeader>
                                    <div className="max-h-[70vh] overflow-y-auto pr-2">
                                    {formContent}
                                    </div>
                                </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    )}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {(city || country) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {[city, country].filter(Boolean).join(', ')}</div>}
                    {email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {email}</div>}
                    {phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Testimonies Shared" value={stats.testimonies} icon={Newspaper} />
            {isOwnProfile && (
                <>
                  <StatCard title="Souls Won" value={stats.soulsWon} icon={UserCheck2} />
                  <StatCard title="Prayer Requests" value={stats.prayerRequests} icon={HandHeart} />
                  <StatCard title="Campaigns Created" value={stats.campaignsCreated} icon={Target} />
                  <StatCard title="Campaigns Joined" value={stats.campaignsJoined} icon={Target} />
                </>
            )}
        </div>

        <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">Activity Details</h2>
            <Card>
                <CardHeader><CardTitle>Testimonies</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {testimonies && testimonies.length > 0 ? (
                                testimonies.map(t => (
                                    <Link key={t.id} href="/dashboard/testimonies" className="block p-2 rounded-md hover:bg-muted">
                                        <p className="font-medium text-sm truncate">{t.category}</p>
                                        <p className="text-xs text-muted-foreground truncate">{t.content}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">No testimonies shared yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {isOwnProfile && (
                <>
                    <Card>
                        <CardHeader><CardTitle>Prayer Requests</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {prayerRequests && prayerRequests.length > 0 ? (
                                        prayerRequests.map(p => (
                                            <Link key={p.id} href="/dashboard/testimonies" className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{p.category}</p>
                                                <p className="text-xs text-muted-foreground truncate">{p.content}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No prayer requests submitted yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Campaigns Created</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {createdCampaigns && createdCampaigns.length > 0 ? (
                                        createdCampaigns.map(c => (
                                            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{c.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">Created on {c.createdAt ? format(c.createdAt.toDate(), "PPP") : 'N/A'}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No campaigns created yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Campaigns Joined</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {activeJoinedCampaigns && activeJoinedCampaigns.length > 0 ? (
                                        activeJoinedCampaigns.map(c => (
                                            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{c.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">Starts on {c.startDate ? format(c.startDate.toDate(), "PPP") : 'N/A'}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No other campaigns joined yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Souls Won</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {soulsWon && soulsWon.length > 0 ? (
                                        soulsWon.map(s => (
                                            <Link key={s.id} href="/dashboard/souls-won" className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{s.firstName} {s.lastName}</p>
                                                <p className="text-xs text-muted-foreground truncate">Won on {s.wonAt ? format(s.wonAt.toDate(), "PPP") : 'N/A'}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No souls won yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    </div>
  );
}

    