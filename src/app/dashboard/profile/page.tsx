'use client';

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, MapPin, Phone, HeartHandshake, XCircle, Users, Group, Youtube } from "lucide-react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, where, doc, getDocs, documentId } from "firebase/firestore";
import type { Soul, Testimony, UserProfile, JoinedCampaign, Campaign, PrayerRequest, Fellowship, JoinedFellowship } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { cn } from "@/lib/utils";

function getYouTubeEmbedUrl(url: string | undefined) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
}

function FilterControls({
  searchTerm,
  setSearchTerm,
  filterDate,
  setFilterDate,
  searchPlaceholder,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterDate?: Date | undefined;
  setFilterDate?: (date: Date | undefined) => void;
  searchPlaceholder: string;
}) {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && setFilterDate) {
      const [year, month, day] = value.split('-').map(Number);
      setFilterDate(new Date(year, month - 1, day));
    } else if (setFilterDate) {
      setFilterDate(undefined);
    }
  };

  const dateValue = filterDate ? format(filterDate, "yyyy-MM-dd") : "";

  return (
    <div className="flex flex-col gap-2 mb-4 sm:flex-row">
      <Input
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-grow text-sm h-9"
      />
      {setFilterDate && (
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <Input
            type="date"
            value={dateValue}
            onChange={handleDateChange}
            className="flex-1 text-sm h-9 sm:w-[150px]"
          />
          {filterDate && (
            <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)} className="h-9 w-9 shrink-0">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>
      )}
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
  const [activeJoinedGroups, setActiveJoinedGroups] = useState<Fellowship[]>([]);
  const [campaignsListLoading, setCampaignsListLoading] = useState(true);
  const [groupsListLoading, setGroupsListLoading] = useState(true);

  const [testimonySearchTerm, setTestimonySearchTerm] = useState('');
  const [testimonyFilterDate, setTestimonyFilterDate] = useState<Date>();
  const [prayerSearchTerm, setPrayerSearchTerm] = useState('');
  const [prayerFilterDate, setPrayerFilterDate] = useState<Date>();
  const [createdCampaignSearchTerm, setCreatedCampaignSearchTerm] = useState('');
  const [createdCampaignFilterDate, setCreatedCampaignFilterDate] = useState<Date>();
  const [joinedCampaignSearchTerm, setJoinedCampaignSearchTerm] = useState('');
  const [joinedFellowshipSearchTerm, setJoinedFellowshipSearchTerm] = useState('');
  const [joinedAssociationSearchTerm, setJoinedAssociationSearchTerm] = useState('');
  const [soulSearchTerm, setSoulSearchTerm] = useState('');
  const [soulFilterDate, setSoulFilterDate] = useState<Date>();
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');

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
  const { data: joinedCampaignsDocs, loading: campaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  
  const createdCampaignsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', userId));
  }, [userId, firestore]);
  const { data: allCreatedCampaigns, loading: createdCampaignsLoading } = useCollection<Campaign>(createdCampaignsQuery);

  const joinedFellowshipsDocsQuery = useMemo(() => {
    if (!userId || !firestore) return null;
    return query(collection(firestore, `users/${userId}/fellowships`));
  }, [userId, firestore]);
  const { data: joinedFellowshipRefs, loading: joinedGroupsRefsLoading } = useCollection<JoinedFellowship>(joinedFellowshipsDocsQuery);

  const createdCampaigns = useMemo(() => {
    if (!allCreatedCampaigns) return [];
    return allCreatedCampaigns.filter(c => c.status === 'active');
  }, [allCreatedCampaigns]);

  const embedUrl = useMemo(() => getYouTubeEmbedUrl(userProfile?.videoTestimonyUrl), [userProfile?.videoTestimonyUrl]);

  useEffect(() => {
    if (!firestore || campaignsLoading || !joinedCampaignsDocs) {
        setActiveJoinedCampaigns([]);
        setCampaignsListLoading(false);
        return;
    }
    const joinedCampaignIds = joinedCampaignsDocs.map(jc => jc.id);
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
                const q = query(collection(firestore, 'campaigns'), where(documentId(), 'in', chunk), where('status', '==', 'active'));
                return getDocs(q);
            });
            const snapshots = await Promise.all(campaignPromises);
            const campaignsData: Campaign[] = [];
            snapshots.forEach(snapshot => snapshot.forEach(doc => { campaignsData.push({ id: doc.id, ...doc.data() } as Campaign); }));
            setActiveJoinedCampaigns(campaignsData.filter(c => c.organizerId !== userId));
        } catch (error) {
            console.error("Error fetching active joined campaigns:", error);
            setActiveJoinedCampaigns([]);
        } finally {
            setCampaignsListLoading(false);
        }
    };
    fetchActiveCampaigns();
  }, [joinedCampaignsDocs, campaignsLoading, firestore, userId]);

  useEffect(() => {
    if (!firestore || joinedGroupsRefsLoading || !joinedFellowshipRefs) {
        setActiveJoinedGroups([]);
        setGroupsListLoading(false);
        return;
    }
    const joinedGroupIds = joinedFellowshipRefs.map(jf => jf.id);
    if (joinedGroupIds.length === 0) {
        setActiveJoinedGroups([]);
        setGroupsListLoading(false);
        return;
    }
    const fetchGroups = async () => {
        setGroupsListLoading(true);
        try {
            const chunks: string[][] = [];
            for (let i = 0; i < joinedGroupIds.length; i += 30) {
                chunks.push(joinedGroupIds.slice(i, i + 30));
            }
            const groupPromises = chunks.map(chunk => {
                const q = query(collection(firestore, 'fellowships'), where(documentId(), 'in', chunk), where('status', '==', 'active'));
                return getDocs(q);
            });
            const snapshots = await Promise.all(groupPromises);
            const groupsData: Fellowship[] = [];
            snapshots.forEach(snapshot => snapshot.forEach(doc => { groupsData.push({ id: doc.id, ...doc.data() } as Fellowship); }));
            setActiveJoinedGroups(groupsData);
        } catch (error) {
            console.error("Error fetching joined groups:", error);
            setActiveJoinedGroups([]);
        } finally {
            setGroupsListLoading(false);
        }
    };
    fetchGroups();
  }, [joinedFellowshipRefs, joinedGroupsRefsLoading, firestore, userId]);

  const loading = profileLoading || userLoading || testimoniesLoading || soulsLoading || campaignsLoading || createdCampaignsLoading || campaignsListLoading || prayerRequestsLoading || groupsListLoading;

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
      return !search || c.title.toLowerCase().includes(search) || c.location.toLowerCase().includes(search);
    });
  }, [activeJoinedCampaigns, joinedCampaignSearchTerm]);

  const joinedFellowships = useMemo(() => activeJoinedGroups.filter(f => (f.groupType || 'Fellowship') === 'Fellowship'), [activeJoinedGroups]);
  const joinedAssociations = useMemo(() => activeJoinedGroups.filter(f => f.groupType === 'Association'), [activeJoinedGroups]);

  const filteredJoinedFellowships = useMemo(() => {
    return joinedFellowships.filter(f => {
        const search = joinedFellowshipSearchTerm.toLowerCase();
        return !search || f.name.toLowerCase().includes(search) || f.description.toLowerCase().includes(search);
    });
  }, [joinedFellowships, joinedFellowshipSearchTerm]);

  const filteredJoinedAssociations = useMemo(() => {
    return joinedAssociations.filter(f => {
        const search = joinedAssociationSearchTerm.toLowerCase();
        return !search || f.name.toLowerCase().includes(search) || f.description.toLowerCase().includes(search);
    });
  }, [joinedAssociations, joinedAssociationSearchTerm]);

  const filteredSoulsWon = useMemo(() => {
    if (!soulsWon) return [];
    return soulsWon.filter(s => {
      const search = soulSearchTerm.toLowerCase();
      const matchSearch = !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search);
      const matchDate = !soulFilterDate || isSameDay(s.wonAt.toDate(), soulFilterDate);
      return matchSearch && matchDate;
    });
  }, [soulsWon, soulSearchTerm, soulFilterDate]);

  const filteredAccountabilityPartners = useMemo(() => {
    if (!userProfile?.accountabilityPartners) return [];
    return userProfile.accountabilityPartners.filter(p => {
        const search = partnerSearchTerm.toLowerCase();
        return !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search);
    });
  }, [userProfile?.accountabilityPartners, partnerSearchTerm]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!userProfile) return <div className="text-center py-12"><p>User profile not found.</p></div>;
  
  const { firstName, lastName, email, photoURL, bio, location, phone, accountabilityPartners } = userProfile;
  const displayName = [firstName, lastName].filter(Boolean).join(' ');
  const { city, state } = location || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 sm:px-0">
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6">
            <Dialog>
                <DialogTrigger asChild disabled={!photoURL}>
                    <Avatar className={cn("h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shrink-0 shadow-lg", photoURL && "cursor-pointer")}>
                        <AvatarImage src={photoURL ?? undefined} alt={displayName || 'user'} />
                        <AvatarFallback className="text-3xl sm:text-4xl">
                            {firstName?.charAt(0) || email?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                </DialogTrigger>
                {photoURL && (
                    <DialogContent className="p-0 bg-transparent border-0 w-auto max-w-lg">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Profile photo of {displayName}</DialogTitle>
                            <DialogDescription>A larger view of your profile photo.</DialogDescription>
                        </DialogHeader>
                        <Image src={photoURL} alt={displayName} width={600} height={600} className="rounded-lg object-contain" unoptimized />
                    </DialogContent>
                )}
            </Dialog>
            <div className="flex-grow w-full text-center sm:text-left space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
                    <div className="flex-grow min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold truncate leading-tight">{displayName}</h1>
                        <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground font-medium">
                            {(city || state) && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {[city, state].filter(Boolean).join(', ')}</div>}
                            {phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" /> {phone}</div>}
                        </div>
                    </div>
                    <div className="w-full sm:w-auto shrink-0">
                        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full sm:w-auto font-bold h-10 px-6 rounded-full shadow-md transition-transform active:scale-95">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Edit Profile</DialogTitle>
                                    <DialogDescription>Make changes to your public profile.</DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[70vh] overflow-y-auto pr-2">
                                  <EditProfileModal userProfile={userProfile} onClose={() => setIsEditModalOpen(false)} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                    {bio || "You haven't set a bio yet. Share a brief summary of your spiritual journey to encourage others."}
                </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {embedUrl && (
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x shadow-none overflow-hidden border-t-4 border-t-red-600">
            <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                    <Youtube className="h-5 w-5 text-red-600" />
                    My Video Testimony
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="relative w-full aspect-video sm:rounded-xl overflow-hidden bg-black shadow-inner">
                    <iframe
                        src={embedUrl}
                        title="My Video Testimony"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                    />
                </div>
            </CardContent>
        </Card>
      )}

      <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight px-4 sm:px-0 uppercase text-muted-foreground flex items-center gap-2">
                <Activity className="h-5 w-5" /> Your Kingdom Activity
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-0 sm:px-0">
                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base sm:text-lg">Testimonies ({testimonies?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <FilterControls 
                            searchTerm={testimonySearchTerm}
                            setSearchTerm={setTestimonySearchTerm}
                            filterDate={testimonyFilterDate}
                            setFilterDate={setTestimonyFilterDate}
                            searchPlaceholder="Search testimonies..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredTestimonies.length > 0 ? (
                                    filteredTestimonies.map(t => (
                                        <Link key={t.id} href="/dashboard/testimonies" className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate text-primary">{t.category}</p>
                                            <p className="text-[11px] sm:text-xs text-muted-foreground truncate italic mt-0.5">{t.content}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{testimonies?.length === 0 ? 'No testimonies shared yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base sm:text-lg">Prayer Requests ({prayerRequests?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                         <FilterControls 
                            searchTerm={prayerSearchTerm}
                            setSearchTerm={setPrayerSearchTerm}
                            filterDate={prayerFilterDate}
                            setFilterDate={setPrayerFilterDate}
                            searchPlaceholder="Search prayer requests..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredPrayerRequests.length > 0 ? (
                                    filteredPrayerRequests.map(p => (
                                        <Link key={p.id} href="/dashboard/testimonies" className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate text-primary">{p.category}</p>
                                            <p className="text-[11px] sm:text-xs text-muted-foreground truncate italic mt-0.5">{p.content}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{prayerRequests?.length === 0 ? 'No prayer requests submitted yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base sm:text-lg">Campaigns Created ({createdCampaigns?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                         <FilterControls 
                            searchTerm={createdCampaignSearchTerm}
                            setSearchTerm={setCreatedCampaignSearchTerm}
                            filterDate={createdCampaignFilterDate}
                            setFilterDate={setCreatedCampaignFilterDate}
                            searchPlaceholder="Search created campaigns..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredCreatedCampaigns.length > 0 ? (
                                    filteredCreatedCampaigns.map(c => (
                                        <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate">{c.title}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">Created on {c.createdAt ? format(c.createdAt.toDate(), "PPP") : 'N/A'}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{createdCampaigns?.length === 0 ? 'No campaigns created yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base sm:text-lg">Campaigns Joined ({activeJoinedCampaigns.length})</CardTitle></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                         <FilterControls 
                            searchTerm={joinedCampaignSearchTerm}
                            setSearchTerm={setJoinedCampaignSearchTerm}
                            searchPlaceholder="Search joined campaigns..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredJoinedCampaigns.length > 0 ? (
                                    filteredJoinedCampaigns.map(c => (
                                        <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate">{c.title}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">Starts on {c.startDate ? format(c.startDate.toDate(), "PPP") : 'N/A'}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{activeJoinedCampaigns.length === 0 ? 'No other campaigns joined yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Users className="h-5 w-5 text-primary" />
                            Fellowships Joined ({joinedFellowships.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <FilterControls 
                            searchTerm={joinedFellowshipSearchTerm}
                            setSearchTerm={setJoinedFellowshipSearchTerm}
                            searchPlaceholder="Search joined fellowships..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredJoinedFellowships.length > 0 ? (
                                    filteredJoinedFellowships.map(f => (
                                        <Link key={f.id} href={`/dashboard/fellowship/${f.id}`} className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate">{f.name}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">{f.location || 'Global'}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{joinedFellowships.length === 0 ? 'No fellowships joined yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Group className="h-5 w-5 text-primary" />
                            Associations Joined ({joinedAssociations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <FilterControls 
                            searchTerm={joinedAssociationSearchTerm}
                            setSearchTerm={setJoinedAssociationSearchTerm}
                            searchPlaceholder="Search joined associations..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredJoinedAssociations.length > 0 ? (
                                    filteredJoinedAssociations.map(a => (
                                        <Link key={a.id} href={`/dashboard/fellowship/${a.id}`} className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate">{a.name}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">{a.location || 'Global'}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{joinedAssociations.length === 0 ? 'No associations joined yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base sm:text-lg">Souls Won ({soulsWon?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                         <FilterControls 
                            searchTerm={soulSearchTerm}
                            setSearchTerm={setSoulSearchTerm}
                            filterDate={soulFilterDate}
                            setFilterDate={setSoulFilterDate}
                            searchPlaceholder="Search souls by name..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredSoulsWon.length > 0 ? (
                                    filteredSoulsWon.map(s => (
                                        <Link key={s.id} href="/dashboard/souls-won" className="block p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <p className="font-bold text-xs sm:text-sm truncate">{s.firstName} {s.lastName}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">Won on {s.wonAt ? format(s.wonAt.toDate(), "PPP") : 'N/A'}</p>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{soulsWon?.length === 0 ? 'No souls won yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <HeartHandshake className="h-5 w-5 text-primary" />
                            Partners ({accountabilityPartners?.length ?? 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                         <FilterControls 
                            searchTerm={partnerSearchTerm}
                            setSearchTerm={setPartnerSearchTerm}
                            searchPlaceholder="Search partners..."
                        />
                        <ScrollArea className="h-48 border rounded-lg bg-muted/5">
                            <div className="p-1 space-y-1">
                                {filteredAccountabilityPartners.length > 0 ? (
                                    filteredAccountabilityPartners.map(p => (
                                        <Link key={p.userId} href={`/dashboard/profile/${p.userId}`} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0 border-muted/50">
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarImage src={p.photoURL} />
                                                <AvatarFallback className="text-[10px] font-bold">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-xs sm:text-sm truncate leading-tight">{p.firstName} {p.lastName}</p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-center text-muted-foreground py-10 italic">{accountabilityPartners?.length === 0 ? 'No accountability partners yet.' : 'No results found.'}</p>
                                )}
                            </div>
                        </ScrollArea>
                        <div className="pt-4 flex justify-end">
                            <Button asChild variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-full">
                                <Link href="/dashboard/accountability">Find Partners</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        <footer className="pt-12 pb-24 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                Testify Global Platform • {new Date().getFullYear()}
            </p>
        </footer>
    </div>
  );
}