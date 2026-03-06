"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Mail, MapPin, Newspaper, Phone, Target, UserCheck2, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, where, doc, getDocs, documentId } from "firebase/firestore";
import type { Soul, Testimony, UserProfile, JoinedCampaign, Campaign } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { useParams } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { format } from "date-fns";

export default function UserProfilePage() {
  const { userId: userIdFromParams } = useParams();
  const userId = userIdFromParams as string;

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
    if (!userId || !firestore || !currentUser) return null;
    return query(collection(firestore, 'testimonies'), where('authorId', '==', userId));
  }, [userId, firestore, currentUser]);
  const { data: testimonies, loading: testimoniesLoading } = useCollection<Testimony>(testimoniesQuery);

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


  const loading = profileLoading || testimoniesLoading || (isOwnProfile && (soulsLoading || campaignsLoading || createdCampaignsLoading || campaignsListLoading));

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!userProfile) {
    return <p>User profile not found.</p>
  }
  
  const { displayName, email, photoURL, bio, location, phone } = userProfile;
  const { city, country } = location || {};

  const stats = {
    testimonies: testimonies?.length ?? 0,
    soulsWon: soulsWon?.length ?? 0,
    campaignsJoined: activeJoinedCampaigns.length,
    campaignsCreated: createdCampaigns?.length ?? 0,
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
                    {displayName?.charAt(0) || email?.charAt(0) || 'U'}
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
                                    <DialogDescription>
                                        Make changes to your public profile.
                                    </DialogDescription>
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
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
                <AccordionItem value="testimonies" className="border rounded-lg">
                    <AccordionTrigger className="p-3 hover:no-underline data-[state=open]:border-b">
                        <div className="flex justify-between items-center w-full">
                            <span className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-muted-foreground" />Testimonies Shared</span>
                            <Badge variant="secondary">{stats.testimonies}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-3 pt-0">
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
                    </AccordionContent>
                </AccordionItem>

                {isOwnProfile && (
                  <>
                    <AccordionItem value="campaigns-created" className="border rounded-lg">
                        <AccordionTrigger className="p-3 hover:no-underline data-[state=open]:border-b">
                            <div className="flex justify-between items-center w-full">
                                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />Campaigns Created</span>
                                <Badge variant="secondary">{stats.campaignsCreated}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 pt-0">
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {createdCampaigns && createdCampaigns.length > 0 ? (
                                        createdCampaigns.map(c => (
                                            <Link key={c.id} href={`/dashboard/campaigns#${c.id}`} className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{c.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">Created on {c.createdAt ? format(c.createdAt.toDate(), "PPP") : 'N/A'}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No campaigns created yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="campaigns-joined" className="border rounded-lg">
                        <AccordionTrigger className="p-3 hover:no-underline data-[state=open]:border-b">
                            <div className="flex justify-between items-center w-full">
                                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />Campaigns Joined</span>
                                <Badge variant="secondary">{stats.campaignsJoined}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 pt-0">
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {activeJoinedCampaigns && activeJoinedCampaigns.length > 0 ? (
                                        activeJoinedCampaigns.map(c => (
                                            <Link key={c.id} href={`/dashboard/campaigns#${c.id}`} className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{c.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">Starts on {c.startDate ? format(c.startDate.toDate(), "PPP") : 'N/A'}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No other campaigns joined yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="souls-won" className="border rounded-lg">
                        <AccordionTrigger className="p-3 hover:no-underline data-[state=open]:border-b">
                            <div className="flex justify-between items-center w-full">
                                <span className="flex items-center gap-2"><UserCheck2 className="h-4 w-4 text-muted-foreground" />Souls Won</span>
                                <Badge variant="secondary">{stats.soulsWon}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 pt-0">
                            <ScrollArea className="h-48">
                                <div className="p-1 space-y-1">
                                    {soulsWon && soulsWon.length > 0 ? (
                                        soulsWon.map(s => (
                                            <Link key={s.id} href="/dashboard/souls-won" className="block p-2 rounded-md hover:bg-muted">
                                                <p className="font-medium text-sm truncate">{s.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">Won on {s.wonAt ? format(s.wonAt.toDate(), "PPP") : 'N/A'}</p>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-center text-muted-foreground py-4">No souls won yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                  </>
                )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
