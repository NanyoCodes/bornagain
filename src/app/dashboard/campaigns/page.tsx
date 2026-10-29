"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Target, Loader2, ChevronDown } from "lucide-react";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import type { Campaign, UserProfile, JoinedCampaign } from "@/lib/types";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
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
import { AppShell } from "@/components/layout/app-shell";

function CampaignSkeletons() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="rounded-2xl border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4 text-left">
            <div className="space-y-2 text-left">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
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

function CampaignsDashboardContent() {
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
  
  const [campaignToManage, setCampaignToManage] = useState<Campaign | null>(null);
  const [campaignForSoul, setCampaignForSoul] = useState<Campaign | null>(null);
  const [campaignForTestimony, setCampaignForTestimony] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsSearchVisible(true);
    setSearchPlaceholder("Search campaigns...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const userDocRef = useMemo(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user?.uid, firestore]);
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

  const loading = userLoading || profileLoading || campaignsLoading || joinedCampaignsLoading;

  const handleCampaignCreated = () => {
    setIsCreateOpen(false);
    router.refresh();
  };
  
  const handleTestimonyCreated = () => {
    setCampaignForTestimony(null);
    toast({ title: "Testimony Shared!" });
  };
  
  const handleSoulLogged = () => {
    setCampaignForSoul(null);
    toast({ title: "Soul Logged!" });
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete || !user || !firestore) return;
    setIsDeleting(true);
    const campaignRef = doc(firestore, 'campaigns', campaignToDelete.id);
    const deleteData = { status: 'deleted', deletedAt: serverTimestamp() };
    try {
        await updateDoc(campaignRef, deleteData);
        toast({ title: 'Campaign Deleted' });
        setCampaignToDelete(null);
    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: campaignRef.path, operation: 'update', requestResourceData: deleteData }, user));
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
      const distance = (userProfile?.location?.latitude && userProfile.location?.longitude && c.latitude && c.longitude)
              ? haversineDistance({ lat: userProfile.location.latitude, lng: userProfile.location.longitude }, { lat: c.latitude, lng: c.longitude })
              : null;
      return { ...tempCampaign, _status: getStatus(tempCampaign, now), _distance: distance };
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
    return statusFilteredCampaigns.filter((c) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term) || c.goal.toLowerCase().includes(term);
    });
  }, [processedCampaigns, searchTerm, filter, user?.uid, statusFilter, joinedCampaignIds]);
  
  const formContent = userProfile ? <CreateCampaignForm onCampaignCreated={handleCampaignCreated} userProfile={userProfile} /> : <div className="flex justify-center p-8 text-left"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="w-full max-w-7xl mx-auto text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left">
        <div className="lg:col-span-8 space-y-8 pb-32 text-left">
            <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-3xl border-x-0 sm:border-x bg-card/50 backdrop-blur-sm overflow-hidden text-left">
                <CardContent className="p-3 sm:p-6 text-left">
                <div className="flex flex-row items-center gap-2 sm:gap-4 w-full text-left">
                <Button variant="outline" className="flex-1 justify-start text-muted-foreground font-normal rounded-full h-10 sm:h-12 px-6 hover:bg-muted/50 transition-colors text-sm sm:text-base border-dashed text-left" onClick={() => setIsCreateOpen(true)} disabled={!user || profileLoading}>
                    <span className="truncate text-left">{profileLoading ? "Preparing..." : "Launch a mission?"}</span>
                </Button>
                <Button variant="secondary" size="icon" className="h-10 sm:h-12 w-10 sm:w-12 rounded-full shadow-lg text-left" onClick={() => setIsCreateOpen(true)} disabled={!user || profileLoading}><Target className="h-4 w-4 text-left" /></Button>
                </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between text-left">
                <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto text-left">
                    <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/40 p-1 rounded-2xl text-left">
                        <TabsTrigger value="all" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-left">All</TabsTrigger>
                        <TabsTrigger value="created" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-left">Mine</TabsTrigger>
                        <TabsTrigger value="joined" className="font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl text-left">Joined</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-12 sm:h-14 rounded-2xl border-2 font-bold uppercase tracking-widest text-[10px] text-left">
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

            <div className="flex flex-col gap-6 w-full text-left">
            {loading ? <CampaignSkeletons /> : sortedAndFilteredCampaigns?.map((c) => (
                <CampaignCard key={c.id} campaign={c} userId={user?.uid} userProfile={userProfile} isJoined={joinedCampaignIds.has(c.id)} distance={c._distance} onManage={() => setCampaignToManage(c)} onShareTestimony={() => setCampaignForTestimony(c)} onDelete={() => setCampaignToDelete(c)} onLogSoul={() => setCampaignForSoul(c)} />
            ))}
            </div>
        </div>
        <div className="lg:col-span-4 text-left"><FeedSidebar mode="campaigns" /></div>
      </div>
      
      {mounted && (
        <Suspense>
            {isMobile ? (
                <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                    <DrawerHeader className="text-left p-0 text-left text-left">
                        <div className="flex items-center gap-2 mb-4 text-left text-left">
                            <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce text-left text-left" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-left text-left">SWIPE DOWN TO CLOSE</span>
                        </div>
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Launch Mission</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Mobilize for the harvest.</DrawerDescription>
                    </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-1 text-left">
                        <div className="p-8 text-left text-left">{formContent}</div>
                    </ScrollArea>
                </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl text-left text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left">
                        <DialogHeader className="text-left p-0 text-left text-left">
                            <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left">Create a New Mission</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-left text-left">Fill in the details below.</DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="flex-1 min-h-0 text-left text-left">
                        <div className="p-8 text-left text-left">{formContent}</div>
                    </ScrollArea>
                </DialogContent>
                </Dialog>
            )}

            <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
            <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl text-left text-left">
                <AlertDialogHeader className="text-left text-left"><AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left text-left">Delete Mission?</AlertDialogTitle><AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left">This will permanently remove the campaign.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-11 text-left text-left">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCampaign} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left text-left">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}Confirm Deletion</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>

            <Drawer open={!!campaignForTestimony} onOpenChange={(open) => { if (!open) setCampaignForTestimony(null); }}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                        <DrawerHeader className="text-left p-0 text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left text-left">Share Victory</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">What has God done during "{campaignForTestimony?.title}"?</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-1 min-h-0 text-left text-left">
                        <div className="p-8 text-left text-left">
                            {campaignForTestimony && userProfile && <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={handleTestimonyCreated} campaign={campaignForTestimony} />}
                        </div>
                    </ScrollArea>
                </DrawerContent>
            </Drawer>

            <Drawer open={!!campaignForSoul} onOpenChange={(open) => { if (!open) setCampaignForSoul(null); }}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                        <DrawerHeader className="text-left p-0 text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left text-left">Log Harvest</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Record a soul won in "{campaignForSoul?.title}".</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-1 min-h-0 text-left text-left">
                        <div className="p-8 text-left text-left">
                            {campaignForSoul && <LogSoulForm onSoulLogged={handleSoulLogged} defaultCampaign={campaignForSoul} fellowships={[]} campaigns={[]} />}
                        </div>
                    </ScrollArea>
                </DrawerContent>
            </Drawer>

            <Drawer open={!!campaignToManage} onOpenChange={(open) => { if (!open) setCampaignToManage(null); }}>
                <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left">
                        <DrawerHeader className="text-left p-0 text-left text-left">
                            <DrawerTitle className="text-2xl font-black font-headline text-left text-left">Manage Mission</DrawerTitle>
                            <DrawerDescription className="text-sm font-medium mt-1 text-left text-left">Update mission progress and details.</DrawerDescription>
                        </DrawerHeader>
                    </div>
                    <ScrollArea className="flex-1 min-h-0 text-left text-left">
                        <div className="p-8 text-left text-left">
                            {campaignToManage && <ManageCampaignForm campaign={campaignToManage} onCampaignUpdated={() => setCampaignToManage(null)} onDelete={() => { const c = campaignToManage; setCampaignToManage(null); setTimeout(() => setCampaignToDelete(c), 150); }} />}
                        </div>
                    </ScrollArea>
                </DrawerContent>
            </Drawer>
        </Suspense>
      )}
    </div>
  );
}

export default function CampaignsDashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex justify-center p-20 text-left text-left"><Loader2 className="h-10 w-10 animate-spin text-primary text-left text-left" /></div>}>
        <CampaignsDashboardContent />
      </Suspense>
    </AppShell>
  );
}
