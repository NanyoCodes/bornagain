"use client";

import { useMemo, useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Target, Loader2, PlusCircle } from "lucide-react";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import AdsenseAd from "@/components/common/adsense-ad";

function CampaignSkeletons() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-[250px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </>
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
  const { data: allFellowships, loading: loadingFellowships } = useCollection<Fellowship>(fellowshipsQuery);
  
  const fellowships = useMemo(() => {
    if (!allFellowships) return [];
    return allFellowships.filter(f => f.status !== 'deleted');
  }, [allFellowships]);
  
  const loading = userLoading || profileLoading || campaignsLoading || joinedCampaignsLoading || loadingFellowships;

  const handleCampaignCreated = () => {
    setIsCreateOpen(false);
  };
  
  const handleTestimonyCreated = () => {
    setCampaignForTestimony(null);
    toast({ title: "Testimony Shared!", description: "Thank you for sharing." });
  };
  
  const handleSoulLogged = () => {
    setCampaignForSoul(null);
    toast({ title: "Soul Logged!", description: "The new soul has been added to your personal dashboard." });
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete || !user || !firestore) return;
    setIsDeleting(true);
    const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
    const deleteData = {
        status: 'deleted',
        deletionReason: 'Campaign deleted by organizer.',
        deletedAt: serverTimestamp(),
    };
    
    try {
        await updateDoc(campaignRef, deleteData);
        toast({ title: 'Campaign Deleted', description: 'The campaign has been successfully deleted.' });
        setCampaignToDelete(null);
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: campaignRef.path,
            operation: 'update',
            requestResourceData: deleteData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsDeleting(false);
    }
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
    const activeCampaigns = processedCampaigns.filter(c => c.status !== 'deleted');

    const tabFilteredCampaigns = activeCampaigns.filter(c => {
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
  
  const activeCampaignsList = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter(c => c.status !== 'deleted');
  }, [campaigns]);

  const formContent = userProfile ? <CreateCampaignForm onCampaignCreated={handleCampaignCreated} userProfile={userProfile} /> : <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;

  let noResultsMessage = "No campaigns found.";
    if (filter === 'created') {
        noResultsMessage = "You haven't created any campaigns.";
    } else if (filter === 'joined') {
        noResultsMessage = "You haven't joined any campaigns.";
    }

  return (
    <div className="space-y-8">
      {/* Responsive Single-Row Interaction Box */}
      <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-lg border-x-0 sm:border-x -mx-4 sm:mx-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              className="flex-1 justify-start text-muted-foreground font-normal rounded-full h-10 sm:h-11 px-4 hover:bg-muted/50 transition-colors text-sm min-w-0"
              onClick={() => setIsCreateOpen(true)}
              disabled={!user || profileLoading}
            >
              <span className="truncate">
                {profileLoading ? "Preparing..." : "Launch a mission for the Kingdom?"}
              </span>
            </Button>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-10 sm:h-11 w-10 sm:w-11 rounded-full"
                onClick={() => setIsCreateOpen(true)}
                disabled={!user || profileLoading}
                title="New Campaign"
              >
                {profileLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 items-center">
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Campaigns</TabsTrigger>
                <TabsTrigger value="created">My Campaigns</TabsTrigger>
                <TabsTrigger value="joined">Joined</TabsTrigger>
            </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
            </SelectContent>
        </Select>
      </div>


      {/* Flush cards on mobile stack */}
      <div className="grid gap-0 md:gap-6 md:grid-cols-2 lg:grid-cols-3 -mx-4 sm:mx-0">
        {loading && <CampaignSkeletons />}
        {!loading && sortedAndFilteredCampaigns?.map((campaign, index) => (
          <Fragment key={campaign.id}>
            <CampaignCard 
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
            {(index + 1) % 4 === 0 && (
              <AdsenseAd adSlot={`campaigns-grid-ad-${index}`} className="h-full" />
            )}
          </Fragment>
        ))}
         {!loading && sortedAndFilteredCampaigns?.length === 0 && (
          <div className="col-span-full text-center py-12 flex flex-col items-center">
            <Target className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">{noResultsMessage}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {filter === 'created'
                ? 'Why not start a new one to reach your community?'
                : filter === 'joined' ? 'Explore all campaigns and join one!' : 'Try a different search term or create a new campaign.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Campaign Creation - Restored Width */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create a New Campaign</DialogTitle>
            <DialogDescription>
              Fill in the details below to create your campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {formContent}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Management - Restored Width */}
      <Dialog open={!!campaignToManage} onOpenChange={(open) => !open && setCampaignToManage(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Manage Campaign</DialogTitle><DialogDescription>Update the details or progress of your campaign.</DialogDescription></DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto pr-2">
            {campaignToManage && (
              <ManageCampaignForm 
                campaign={campaignToManage} 
                onCampaignUpdated={() => { setCampaignToManage(null); }} 
                onDelete={() => {
                  setCampaignToDelete(campaignToManage);
                  setCampaignToManage(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This will mark the campaign as deleted and hide it from public view. This action cannot be undone.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Deletion
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Testimony */}
      <Dialog open={!!campaignForTestimony} onOpenChange={(open) => !open && setCampaignForTestimony(null)}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Share Testimony for "{campaignForTestimony?.title}"</DialogTitle>
                  <DialogDescription>
                      Encourage others by sharing what God has done during this campaign.
                  </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {campaignForTestimony && userProfile && (
                    <CreateTestimonyForm
                          userProfile={userProfile}
                          onTestimonyCreated={handleTestimonyCreated}
                          campaign={campaignForTestimony}
                      />
                  )}
              </div>
          </DialogContent>
      </Dialog>

      {/* Log Soul */}
      <Dialog open={!!campaignForSoul} onOpenChange={(open) => !open && setCampaignForSoul(null)}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Log a Soul Won in "{campaignForSoul?.title}"</DialogTitle>
                  <DialogDescription>
                      Record the details of the person you've ministered to during this campaign.
                  </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {campaignForSoul && (
                    <LogSoulForm
                          onSoulLogged={handleSoulLogged}
                          defaultCampaign={campaignForSoul}
                          fellowships={fellowships || []}
                          campaigns={activeCampaignsList || []}
                      />
                  )}
              </div>
          </DialogContent>
      </Dialog>

    </div>
  );
}
