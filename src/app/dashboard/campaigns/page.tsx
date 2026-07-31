"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Target, Loader2 } from "lucide-react";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import type { Campaign, UserProfile, JoinedCampaign, Fellowship } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeToDate, haversineDistance } from "@/lib/utils";
import { ManageCampaignForm } from "@/components/campaigns/manage-campaign-form";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { FeedSidebar } from "@/components/layout/feed-sidebar";

function CampaignSkeletons() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="rounded-2xl border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const getStatus = (campaign: { _startDate: Date | null, _endDate: Date | null, startTime?: string, endTime?: string }, now: Date): number => {
    const { _startDate, _endDate } = campaign;
    if (!_startDate || !_endDate) return 3; // Past
    
    const endDateTime = new Date(_endDate);
    if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 59, 999);
    } else {
        endDateTime.setHours(23, 59, 59, 999);
    }

    if (endDateTime < now) return 3; // Past

    const startDateTime = new Date(_startDate);
    if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
    } else {
        startDateTime.setHours(0, 0, 0, 0);
    }

    if (startDateTime > now) return 2; // Upcoming
    return 1; // Ongoing
  };

const getFullStartDate = (campaign: { _startDate: Date | null, startTime?: string}) => {
    if (!campaign._startDate) return null;
    const d = new Date(campaign._startDate);
    if (campaign.startTime && /^\d{2}:\d{2}$/.test(campaign.startTime)) {
        const [hours, minutes] = campaign.startTime.split(':').map(Number);
        d.setHours(hours, minutes, 0, 0);
    } else {
        d.setHours(0, 0, 0, 0);
    }
    return d;
};
const getFullEndDate = (campaign: { _endDate: Date | null, endTime?: string}) => {
    if (!campaign._endDate) return null;
    const d = new Date(campaign._endDate);
    if (campaign.endTime && /^\d{2}:\d{2}$/.test(campaign.endTime)) {
        const [hours, minutes] = campaign.endTime.split(':').map(Number);
        d.setHours(hours, minutes, 59, 999);
    } else {
        d.setHours(23, 59, 59, 999);
    }
    return d;
};


export default function CampaignsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
  const [now, setNow] = useState<Date | null>(null);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // State for managed dialogs
  const [campaignToManage, setCampaignToManage] = useState<Campaign | null>(null);
  const [campaignForTestimony, setCampaignForTestimony] = useState<Campaign | null>(null);
  const [campaignForSoul, setCampaignForSoul] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsSearchVisible(true);
    setSearchPlaceholder("Search campaigns by title, goal, location...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const userDocRef = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const campaignsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);
  const { data: campaigns, loading: campaignsLoading } = useCollection<Campaign>(campaignsQuery);

  const joinedCampaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/joinedCampaigns`));
  }, [user?.uid, firestore]);
  const { data: joinedCampaigns, loading: joinedCampaignsLoading } = useCollection<JoinedCampaign>(joinedCampaignsQuery);
  const joinedCampaignIds = useMemo(() => new Set(joinedCampaigns?.map(c => c.id)), [joinedCampaigns]);

  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: allFellowshipsData } = useCollection<Fellowship>(fellowshipsQuery);
  
  const fellowships = useMemo(() => {
    if (!allFellowshipsData) return [];
    return allFellowshipsData.filter(f => f.status !== 'deleted');
  }, [allFellowshipsData]);
  
  const loading = userLoading || profileLoading || campaignsLoading || joinedCampaignsLoading;

  const handleCampaignCreated = () => {
    setIsCreateOpen(false);
    router.refresh();
  };
  
  const handleTestimonyCreated = () => {
    setCampaignForTestimony(null);
    toast({ title: "Testimony Shared!", description: "Thank you for sharing." });
    router.refresh();
  };
  
  const handleSoulLogged = () => {
    setCampaignForSoul(null);
    toast({ title: "Soul Logged!", description: "The new soul has been added to your personal dashboard." });
    router.refresh();
  };

  const handleDeleteCampaign = () => {
    if (!campaignToDelete || !user || !firestore) return;
    
    const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
    const deleteData = {
        status: 'deleted',
        deletionReason: 'Campaign deleted by organizer.',
        deletedAt: serverTimestamp(),
    };

    // Reset state immediately to prevent Radix UI unmount hang
    setCampaignToDelete(null);
    setIsDeleting(true);

    const performDeletion = async () => {
        try {
            await updateDoc(campaignRef, deleteData);
            toast({ title: 'Campaign Deleted', description: 'The campaign has been successfully deleted.' });
            router.refresh();
        } catch (error: any) {
            console.error("Delete Campaign Error:", error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: campaignRef.path,
                    operation: 'update',
                    requestResourceData: deleteData,
                }, user));
            }
        } finally {
            setIsDeleting(false);
        }
    };

    performDeletion();
    return true; // Signal async intent
  };

  const processedCampaigns = useMemo(() => {
    if (!campaigns || !now) return [];
    return campaigns.map(c => {
      const _startDate = safeToDate(c.startDate);
      const _endDate = safeToDate(c.endDate);
      const tempCampaign = { ...c, _startDate, _endDate };
      const distance =
            userProfile?.location?.latitude &&
            userProfile.location?.longitude &&
            c.latitude &&
            c.longitude
              ? haversineDistance(
                  { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
                  { lat: c.latitude, lng: c.longitude }
                )
              : null;
      return {
        ...tempCampaign,
        _status: getStatus(tempCampaign, now),
        _fullStartDate: getFullStartDate(tempCampaign),
        _fullEndDate: getFullEndDate(tempCampaign),
        _distance: distance,
      }
    });
  }, [campaigns, now, userProfile]);

  const sortedAndFilteredCampaigns = useMemo(() => {
    const activeCampaignsList = processedCampaigns.filter(c => c.status !== 'deleted');

    const tabFilteredCampaigns = activeCampaignsList.filter(c => {
        if (!user?.uid) return true;
        if (filter === 'created') return c.organizerId === user.uid;
        if (filter === 'joined') return joinedCampaignIds.has(c.id) && c.organizerId !== user.uid;
        return true; // 'all'
    });

    const statusFilteredCampaigns = tabFilteredCampaigns.filter(c => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'ongoing') return c._status === 1;
        if (statusFilter === 'upcoming') return c._status === 2;
        if (statusFilter === 'past') return c._status === 3;
        return true;
    });

    const filtered = statusFilteredCampaigns.filter((campaign) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();

      const searchableFields = [
        campaign.title,
        campaign.description,
        campaign.goal,
        campaign.location,
        campaign.organizerFirstName,
        campaign.organizerLastName,
        campaign.scripture
      ];

      return searchableFields.some(field => field && field.toLowerCase().includes(term));
    });

    if (!filtered || !mounted) return filtered;

    return [...filtered].sort((a, b) => {
        const isAOwner = a.organizerId === user?.uid;
        const isBOwner = b.organizerId === user?.uid;

        if (isAOwner && !isBOwner) return -1;
        if (!isAOwner && isBOwner) return 1;

        if (a._status !== b._status) {
            return a._status - b._status;
        }
        
        if (a._status === 1 || a._status === 2) {
            if (a._distance != null && b._distance != null) {
                if (a._distance !== b._distance) return a._distance - b._distance;
            } else if (a._distance != null) {
                return -1;
            } else if (b._distance != null) {
                return 1;
            }

            const fullStartDateA = a._fullStartDate;
            const fullStartDateB = b._fullStartDate;

            if (fullStartDateA && fullStartDateB) {
                const timeDiff = fullStartDateA.getTime() - fullStartDateB.getTime();
                if (timeDiff !== 0) return timeDiff;
            }
            if (fullStartDateA) return -1;
            if (fullStartDateB) return 1;
        }

        if (a._status === 3) {
            const fullEndDateA = a._fullEndDate;
            const fullEndDateB = b._fullEndDate;

            if (fullEndDateA && fullEndDateB) {
                const timeDiff = fullEndDateB.getTime() - fullEndDateA.getTime();
                if (timeDiff !== 0) return timeDiff;
            }
            if (fullEndDateA) return -1;
            if (fullEndDateB) return 1;
        }

        const createdAtA = safeToDate(a.createdAt)?.getTime() ?? 0;
        const createdAtB = safeToDate(b.createdAt)?.getTime() ?? 0;
        return createdAtB - createdAtA;
    });

  }, [processedCampaigns, searchTerm, mounted, filter, user?.uid, statusFilter, joinedCampaignIds]);
  
  const activeCampaignsListOnly = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter(c => c.status !== 'deleted');
  }, [campaigns]);

  const formContent = userProfile ? <CreateCampaignForm onCampaignCreated={handleCampaignCreated} userProfile={userProfile} /> : <div className="flex justify-center p-8 text-left"><Loader2 className="h-8 w-8 animate-spin text-left" /></div>;

  let noResultsMessage = "No campaigns found.";
    if (filter === 'created') {
        noResultsMessage = "You haven't created any campaigns.";
    } else if (filter === 'joined') {
        noResultsMessage = "You haven't joined any campaigns.";
    }

  return (
    <div 
        className="w-full max-w-7xl mx-auto text-left"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
        <div className="lg:col-span-8 space-y-8 pb-32 text-left">
            {/* Interaction Box */}
            <Card className="border shadow-sm sm:shadow-md rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden text-left">
            <CardContent className="p-3 sm:p-6 text-left">
                <div className="flex flex-row items-center gap-2 sm:gap-4 w-full text-left text-left">
                <Button 
                    variant="outline" 
                    className="flex-1 justify-start text-left text-muted-foreground font-normal rounded-full h-10 sm:h-12 px-6 hover:bg-muted/50 transition-colors text-sm sm:text-base min-w-0 border-dashed text-left"
                    onClick={() => setIsCreateOpen(true)}
                    disabled={!user || profileLoading}
                >
                    <span className="truncate text-left">
                    {profileLoading ? "Preparing mission field..." : "Launch a mission for the Kingdom?"}
                    </span>
                </Button>
                <div className="flex items-center gap-2 shrink-0 text-left">
                    <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-10 sm:h-12 w-10 sm:w-12 rounded-full shadow-lg text-left"
                    onClick={() => setIsCreateOpen(true)}
                    disabled={!user || profileLoading}
                    title="New Campaign"
                    >
                    {profileLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-left" />
                    ) : (
                        <Target className="h-4 w-4 text-left" />
                    )}
                    </Button>
                </div>
                </div>
            </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between px-0 text-left text-left text-left">
                <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto text-left">
                    <TabsList className="grid w-full grid-cols-3 h-12 sm:h-14 bg-muted/40 p-1 rounded-2xl text-left text-left text-left">
                        <TabsTrigger value="all" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-left">All</TabsTrigger>
                        <TabsTrigger value="created" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-left text-left">Mine</TabsTrigger>
                        <TabsTrigger value="joined" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-left text-left">Joined</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-12 sm:h-14 rounded-2xl border-2 font-bold uppercase tracking-widest text-[10px] text-left text-left">
                        <SelectValue placeholder="Status" className="text-left" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-xl text-left">
                        <SelectItem value="all" className="text-left">All Status</SelectItem>
                        <SelectItem value="ongoing" className="text-left">Ongoing</SelectItem>
                        <SelectItem value="upcoming" className="text-left">Upcoming</SelectItem>
                        <SelectItem value="past" className="text-left">Past</SelectItem>
                    </SelectContent>
                </Select>
            </div>


            {/* Campaign List */}
            <div className="flex flex-col gap-6 w-full text-left">
            {loading && <CampaignSkeletons />}
            {!loading && sortedAndFilteredCampaigns?.map((campaign) => (
                <CampaignCard 
                key={campaign.id}
                campaign={campaign} 
                userId={user?.uid}
                userProfile={userProfile}
                isJoined={joinedCampaignIds.has(campaign.id)}
                distance={campaign._distance}
                onManage={() => setCampaignToManage(campaign)}
                onShareTestimony={() => setCampaignForTestimony(campaign)}
                onDelete={() => setCampaignToDelete(campaign)}
                onLogSoul={() => setCampaignForSoul(campaign)}
                />
            ))}
            {!loading && sortedAndFilteredCampaigns?.length === 0 && (
                <div className="col-span-full text-center py-32 px-8 flex flex-col items-center text-left text-left text-left">
                <Target className="h-16 w-16 text-muted-foreground opacity-10 mb-6 text-left" />
                <h3 className="text-xl font-bold font-headline uppercase tracking-tight text-left">{noResultsMessage}</h3>
                <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm text-left text-left text-left text-left">
                    {filter === 'created'
                    ? 'Why not start a new one to reach your community?'
                    : filter === 'joined' ? 'Explore all campaigns and join one!' : 'Try a different search term or create a new campaign.'}
                </p>
                </div>
            )}
            </div>
        </div>

        {/* Desktop Sidebar Column */}
        <div className="lg:col-span-4 text-left">
            <FeedSidebar mode="campaigns" />
        </div>
      </div>
      
      {/* Creation Modal */}
      {mounted && isMobile ? (
        <Sheet open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) router.refresh(); }}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
              <SheetHeader className="text-left text-left">
                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Launch New Mission</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1 text-left">Mobilize for the harvest by setting clear mission goals.</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow text-left">
              <div className="p-8 text-left">
                {formContent}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) router.refresh(); }}>
          <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left">
            <div className="p-8 border-b bg-muted/10 text-left">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left">Create a New Mission</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left text-left">
                        Fill in the details below to organize your soul-winning efforts.
                    </DialogDescription>
                </DialogHeader>
            </div>
            <ScrollArea className="max-h-[70vh] text-left">
                <div className="p-8 text-left text-left">
                    {formContent}
                </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Management Modal */}
      {mounted && isMobile ? (
        <Sheet open={!!campaignToManage} onOpenChange={(open) => { if (!open) setCampaignToManage(null); router.refresh(); }}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
              <SheetHeader className="text-left text-left text-left">
                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Manage Mission</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1 text-left">Update mission progress and logistical details.</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow text-left">
              <div className="p-8 text-left">
                {campaignToManage && (
                  <ManageCampaignForm 
                    campaign={campaignToManage} 
                    onCampaignUpdated={() => { setCampaignToManage(null); router.refresh(); }} 
                    onDelete={() => {
                      const campaign = campaignToManage;
                      setCampaignToManage(null);
                      setTimeout(() => setCampaignToDelete(campaign), 150);
                    }}
                  />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!campaignToManage} onOpenChange={(open) => { if (!open) setCampaignToManage(null); router.refresh(); }}>
          <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left">
             <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
                <DialogHeader className="text-left text-left text-left">
                    <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left text-left">Manage Mission</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-left text-left text-left">Update the details or status of your campaign.</DialogDescription>
                </DialogHeader>
            </div>
            <ScrollArea className="max-h-[80vh] text-left text-left">
                <div className="p-8 text-left text-left text-left">
                    {campaignToManage && (
                        <ManageCampaignForm 
                        campaign={campaignToManage} 
                        onCampaignUpdated={() => { setCampaignToManage(null); router.refresh(); }} 
                        onDelete={() => {
                            const campaign = campaignToManage;
                            setCampaignToManage(null);
                            setTimeout(() => setCampaignToDelete(campaign), 150);
                        }}
                        />
                    )}
                </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Dialogs */}
      <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => { if (!open) setCampaignToDelete(null); router.refresh(); }}>
        <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl text-left">
          <AlertDialogHeader className="text-left">
              <AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left text-left">Delete Mission?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left text-left">
                  This will permanently remove the campaign and all associated data. This action cannot be undone.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6 text-left">
              <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-11 text-left">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left text-left">
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                  Confirm Deletion
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logging & Testimony Sheets */}
      {mounted && isMobile ? (
        <Sheet open={!!campaignForTestimony} onOpenChange={(open) => { if (!open) setCampaignForTestimony(null); router.refresh(); }}>
          <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
              <SheetHeader className="text-left text-left">
                <SheetTitle className="text-2xl font-black font-headline text-left">Share Victory</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1 text-left text-left">What has God done during "{campaignForTestimony?.title}"?</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow text-left">
              <div className="p-8 text-left">
                 {campaignForTestimony && userProfile && (
                    <CreateTestimonyForm
                          userProfile={userProfile}
                          onTestimonyCreated={handleTestimonyCreated}
                          campaign={campaignForTestimony}
                      />
                  )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!campaignForTestimony} onOpenChange={(open) => { if (!open) setCampaignForTestimony(null); router.refresh(); }}>
            <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left">
                 <div className="p-8 border-b bg-muted/10 text-left text-left text-left">
                    <DialogHeader className="text-left text-left">
                        <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left text-left">Share Victory</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left">
                            Encourage others by sharing what God has done during this mission.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="max-h-[70vh] text-left text-left">
                    <div className="p-8 text-left text-left">
                        {campaignForTestimony && userProfile && (
                        <CreateTestimonyForm
                                userProfile={userProfile}
                                onTestimonyCreated={handleTestimonyCreated}
                                campaign={campaignForTestimony}
                            />
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}

      {mounted && isMobile ? (
        <Sheet open={!!campaignForSoul} onOpenChange={(open) => { if (!open) setCampaignForSoul(null); router.refresh(); }}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
              <SheetHeader className="text-left text-left">
                <SheetTitle className="text-2xl font-black font-headline text-left">Log Harvest</SheetTitle>
                <SheetDescription className="text-sm font-medium mt-1 text-left text-left">Record a soul won in "{campaignForSoul?.title}".</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow text-left">
              <div className="p-8 text-left">
                {campaignForSoul && (
                  <LogSoulForm
                        onSoulLogged={handleSoulLogged}
                        defaultCampaign={campaignForSoul}
                        fellowships={[]}
                        campaigns={activeCampaignsListOnly || []}
                    />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!campaignForSoul} onOpenChange={(open) => { if (!open) setCampaignForSoul(null); router.refresh(); }}>
            <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left">
                <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left">
                    <DialogHeader className="text-left text-left">
                        <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left text-left">Log Harvest</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left">
                            Record the details of the person won during this mission.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="max-h-[70vh] text-left text-left">
                    <div className="p-8 text-left text-left">
                        {campaignForSoul && (
                        <LogSoulForm
                                onSoulLogged={handleSoulLogged}
                                defaultCampaign={campaignForSoul}
                                fellowships={[]}
                                campaigns={activeCampaignsListOnly || []}
                            />
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
