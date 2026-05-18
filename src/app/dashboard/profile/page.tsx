'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Mail, MapPin, Phone, HeartHandshake, XCircle } from "lucide-react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, where, doc, getDocs, documentId } from "firebase/firestore";
import type { Soul, Testimony, UserProfile, JoinedCampaign, Campaign, PrayerRequest } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FilterControls({
  searchTerm,
  setSearchTerm,
  filterDate,
  setFilterDate,
  searchPlaceholder,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterDate: Date | undefined;
  setFilterDate: (date: Date | undefined) => void;
  searchPlaceholder: string;
}) {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      setFilterDate(new Date(year, month - 1, day));
    } else {
      setFilterDate(undefined);
    }
  };

  const dateValue = filterDate ? format(filterDate, "yyyy-MM-dd") : "";

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-grow"
      />
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={dateValue}
          onChange={handleDateChange}
          className="w-full sm:w-[200px]"
        />
        {filterDate && (
          <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}>
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Clear date filter</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user: currentUser, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const [activeJoinedCampaigns, setActiveJoinedCampaigns] = useState<Campaign[]>([]);
  const [campaignsListLoading, setCampaignsListLoading] = useState(true);

  // Filter states
  const [testimonySearchTerm, setTestimonySearchTerm] = useState('');
  const [testimonyFilterDate, setTestimonyFilterDate] = useState<Date>();
  const [prayerSearchTerm, setPrayerSearchTerm] = useState('');
  const [prayerFilterDate, setPrayerFilterDate] = useState<Date>();
  const [createdCampaignSearchTerm, setCreatedCampaignSearchTerm] = useState('');
  const [createdCampaignFilterDate, setCreatedCampaignFilterDate] = useState<Date>();
  const [joinedCampaignSearchTerm, setJoinedCampaignSearchTerm] = useState('');
  const [soulSearchTerm, setSoulSearchTerm] = useState('');
  const [soulFilterDate, setSoulFilterDate] = useState<Date>();

  useEffect(() => {
    setMounted(true);
  }, []);

  const userId = currentUser?.uid;

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
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'prayerRequests'), where('authorId', '==', userId));
  }, [userId, firestore]);
  const { data: prayerRequests, loading: prayerRequestsLoading } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const soulsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, `users/${userId}/souls`));
  }, [userId, firestore]);
  const { data: soulsWon, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const joinedCampaignsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, `users/${userId}/joinedCampaigns`));
  }, [userId, firestore]);
  const { data: joinedCampaigns, loading: campaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  
  const createdCampaignsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', userId));
  }, [userId, firestore]);
  const { data: allCreatedCampaigns, loading: createdCampaignsLoading } = useCollection<Campaign>(createdCampaignsQuery);

  const createdCampaigns = useMemo(() => {
    if (!allCreatedCampaigns) return [];
    return allCreatedCampaigns.filter(c => c.status === 'active');
  }, [allCreatedCampaigns]);

  useEffect(() => {
    if (!firestore || campaignsLoading || !joinedCampaigns) {
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
  }, [joinedCampaigns, campaignsLoading, firestore, userId]);

  const loading = profileLoading || userLoading || testimoniesLoading || soulsLoading || campaignsLoading || createdCampaignsLoading || campaignsListLoading || prayerRequestsLoading;

    const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    return testimonies.filter(t => {
      const search = testimonySearchTerm.toLowerCase();
      const matchSearch = !search || t.content.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
      const matchDate = !testimonyFilterDate || isSameDay(t.createdAt.toDate(), testimonyFilterDate);
      return matchSearch && matchDate;
    });
  }, [testimonies, testimonySearchTerm, testimonyFilterDate]);

  const filteredPrayerRequests = useMemo(() => {
    if (!prayerRequests) return [];
    return prayerRequests.filter(p => {
      const search = prayerSearchTerm.toLowerCase();
      const matchSearch = !search || p.content.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
      const matchDate = !prayerFilterDate || isSameDay(p.createdAt.toDate(), prayerFilterDate);
      return matchSearch && matchDate;
    });
  }, [prayerRequests, prayerSearchTerm, prayerFilterDate]);

  const filteredCreatedCampaigns = useMemo(() => {
    if (!createdCampaigns) return [];
    return createdCampaigns.filter(c => {
      const search = createdCampaignSearchTerm.toLowerCase();
      const matchSearch = !search || c.title.toLowerCase().includes(search) || c.location.toLowerCase().includes(search);
      const matchDate = !createdCampaignFilterDate || isSameDay(c.createdAt.toDate(), createdCampaignFilterDate);
      return matchSearch && matchDate;
    });
  }, [createdCampaigns, createdCampaignSearchTerm, createdCampaignFilterDate]);

  const filteredJoinedCampaigns = useMemo(() => {
    if (!activeJoinedCampaigns) return [];
    return activeJoinedCampaigns.filter(c => {
      const search = joinedCampaignSearchTerm.toLowerCase();
      const matchSearch = !search || c.title.toLowerCase().includes(search) || c.location.toLowerCase().includes(search);
      return matchSearch;
    });
  }, [activeJoinedCampaigns, joinedCampaignSearchTerm]);

  const filteredSoulsWon = useMemo(() => {
    if (!soulsWon) return [];
    return soulsWon.filter(s => {
      const search = soulSearchTerm.toLowerCase();
      const matchSearch = !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search);
      const matchDate = !soulFilterDate || isSameDay(s.wonAt.toDate(), soulFilterDate);
      return matchSearch && matchDate;
    });
  }, [soulsWon, soulSearchTerm, soulFilterDate]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!userProfile) {
    return <p>User profile not found.</p>
  }
  
  const { firstName, lastName, email, photoURL, bio, location, phone } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, state } = location || {};

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
                        <p className="text-muted-foreground mt-2">{bio || "You haven't set a bio yet. You can add one by editing your profile."}</p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-4 shrink-0">
                        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                            <DialogTrigger asChild>
                              <Button>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Edit Profile</DialogTitle>
                                    <DialogDesc>Make changes to your public profile.</DialogDesc>
                                </DialogHeader>
                                <div className="max-h-[70vh] overflow-y-auto pr-2">
                                  <EditProfileModal userProfile={userProfile} onClose={() => { setIsEditModalOpen(false); }} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {(city || state) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {[city, state].filter(Boolean).join(', ')}</div>}
                    {phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {phone}</div>}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

        <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">Your Activity</h2>
            <Card>
                <CardHeader><CardTitle>Testimonies ({testimonies?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                    <FilterControls 
                        searchTerm={testimonySearchTerm}
                        setSearchTerm={setTestimonySearchTerm}
                        filterDate={testimonyFilterDate}
                        setFilterDate={setTestimonyFilterDate}
                        searchPlaceholder="Search testimonies..."
                    />
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {filteredTestimonies.length > 0 ? (
                                filteredTestimonies.map(t => (
                                    <Link key={t.id} href="/dashboard/testimonies" className="block p-2 rounded-md hover:bg-muted">
                                        <p className="font-medium text-sm truncate">{t.category}</p>
                                        <p className="text-xs text-muted-foreground truncate">{t.content}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">{testimonies?.length === 0 ? 'No testimonies shared yet.' : 'No results found.'}</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Prayer Requests ({prayerRequests?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                     <FilterControls 
                        searchTerm={prayerSearchTerm}
                        setSearchTerm={setSearchTerm}
                        filterDate={prayerFilterDate}
                        setFilterDate={setFilterDate}
                        searchPlaceholder="Search prayer requests..."
                    />
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {filteredPrayerRequests.length > 0 ? (
                                filteredPrayerRequests.map(p => (
                                    <Link key={p.id} href="/dashboard/testimonies" className="block p-2 rounded-md hover:bg-muted">
                                        <p className="font-medium text-sm truncate">{p.category}</p>
                                        <p className="text-xs text-muted-foreground truncate">{p.content}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">{prayerRequests?.length === 0 ? 'No prayer requests submitted yet.' : 'No results found.'}</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Campaigns Created ({createdCampaigns?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                     <FilterControls 
                        searchTerm={createdCampaignSearchTerm}
                        setSearchTerm={setCreatedCampaignSearchTerm}
                        filterDate={createdCampaignFilterDate}
                        setFilterDate={setCreatedCampaignFilterDate}
                        searchPlaceholder="Search created campaigns..."
                    />
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {filteredCreatedCampaigns.length > 0 ? (
                                filteredCreatedCampaigns.map(c => (
                                    <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block p-2 rounded-md hover:bg-muted">
                                        <p className="font-medium text-sm truncate">{c.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">Created on {c.createdAt ? format(c.createdAt.toDate(), "PPP") : 'N/A'}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">{createdCampaigns?.length === 0 ? 'No campaigns created yet.' : 'No results found.'}</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Campaigns Joined ({activeJoinedCampaigns.length})</CardTitle></CardHeader>
                <CardContent>
                     <FilterControls 
                        searchTerm={joinedCampaignSearchTerm}
                        setSearchTerm={setJoinedCampaignSearchTerm}
                        filterDate={undefined}
                        setFilterDate={() => {}}
                        searchPlaceholder="Search joined campaigns..."
                    />
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {filteredJoinedCampaigns.length > 0 ? (
                                filteredJoinedCampaigns.map(c => (
                                    <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block p-2 rounded-md hover:bg-muted">
                                        <p className="font-medium text-sm truncate">{c.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">Starts on {c.startDate ? format(c.startDate.toDate(), "PPP") : 'N/A'}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">{activeJoinedCampaigns.length === 0 ? 'No other campaigns joined yet.' : 'No results found.'}</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Souls Won ({soulsWon?.length ?? 0})</CardTitle></CardHeader>
                <CardContent>
                     <FilterControls 
                        searchTerm={soulSearchTerm}
                        setSearchTerm={setSoulSearchTerm}
                        filterDate={soulFilterDate}
                        setFilterDate={setSoulFilterDate}
                        searchPlaceholder="Search souls by name..."
                    />
                    <ScrollArea className="h-48">
                        <div className="p-1 space-y-1">
                            {filteredSoulsWon.length > 0 ? (
                                filteredSoulsWon.map(s => (
                                    <Link key={s.id} href="/dashboard/souls-won" className="block p-2 rounded-md hover:bg-muted">
                                        <p className="font-medium text-sm truncate">{s.firstName} {s.lastName}</p>
                                        <p className="text-xs text-muted-foreground truncate">Won on {s.wonAt ? format(s.wonAt.toDate(), "PPP") : 'N/A'}</p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">{soulsWon?.length === 0 ? 'No souls won yet.' : 'No results found.'}</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
