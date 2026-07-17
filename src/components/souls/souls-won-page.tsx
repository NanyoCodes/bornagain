"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  PlusCircle, 
  Download, 
  Loader2, 
  Trash2, 
  HeartHandshake, 
  ImageIcon,
  BarChart3,
  Target,
  Zap,
  Flame,
  Award,
  UserPlus,
  Hourglass,
  ArrowLeft,
  Newspaper,
  Globe,
  Sparkles,
  Search,
  CheckCircle2,
  X,
  ArrowRight,
  HelpCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import type { Soul, Campaign, Fellowship, UserProfile } from "@/lib/types";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, deleteField, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { cn, safeToDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { RelationshipCircleTracker } from "@/components/souls/relationship-circle-tracker";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedSidebar } from "@/components/layout/feed-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

const SoulsWonTable = dynamic(() => import('@/components/souls/souls-won-table').then(m => m.SoulsWonTable), {
  loading: () => <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false
});

const LogFollowUpDialog = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const ViewHistoryDialog = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const AssignFellowshipDialog = dynamic(() => import('@/components/souls/assign-fellowship-dialog').then(m => m.AssignFellowshipDialog), { ssr: false });
const LogSoulForm = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });
const EditSoulForm = dynamic(() => import('@/components/souls/edit-soul-form').then(m => m.EditSoulForm), { ssr: false });
const SoulAssessmentDialog = dynamic(() => import('@/components/souls/soul-assessment-dialog').then(m => m.SoulAssessmentDialog), { ssr: false });

function AgeGroupSoulList({ souls }: { souls: Soul[] }) {
  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground italic text-left">No souls found in this age group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      {souls.map((soul) => {
        const wonAt = safeToDate(soul.wonAt);
        return (
          <Link 
            href={`/dashboard/souls-won#${soul.id}`} 
            key={soul.id} 
            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-all border bg-background/50 group"
          >
            <Avatar className="h-10 w-10 border shadow-sm shrink-0 group-hover:border-primary/30 transition-colors">
              <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="font-black text-sm truncate uppercase tracking-tight">{soul.firstName} {soul.lastName}</p>
                <Badge variant="outline" className="text-[8px] h-4 px-1 uppercase font-black tracking-tighter shrink-0">{soul.status}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                Won {wonAt ? format(wonAt, 'PPP') : 'Recently'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}

export default function SoulsWonPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [mounted, setMounted] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  
  const [followUpSoulId, setFollowUpSoulId] = useState<string | null>(null);
  const [historySoulId, setHistorySoulId] = useState<string | null>(null);
  const [assignSoulId, setAssignSoulId] = useState<string | null>(null);
  const [editSoulId, setEditSoulId] = useState<string | null>(null);
  const [deleteSoulId, setDeleteSoulId] = useState<string | null>(null);
  const [assessmentSoulId, setAssessmentSoulId] = useState<string | null>(null);

  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isGalleryPaused, setIsGalleryPaused] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search souls...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchTerm, setSearchPlaceholder]);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const soulsWithPhotos = useMemo(() => {
      return souls?.filter(s => s.photoURL) || [];
  }, [souls]);

  const duplicatedSouls = useMemo(() => {
      if (soulsWithPhotos.length === 0) return [];
      return [...soulsWithPhotos, ...soulsWithPhotos, ...soulsWithPhotos];
  }, [soulsWithPhotos]);

  const ageGroups = useMemo(() => {
    const stats = {
      children: { count: 0, list: [] as Soul[] },
      teens: { count: 0, list: [] as Soul[] },
      youngAdults: { count: 0, list: [] as Soul[] },
      adults: { count: 0, list: [] as Soul[] },
      seniors: { count: 0, list: [] as Soul[] },
      unknown: { count: 0, list: [] as Soul[] }
    };

    if (!souls) return stats;

    souls.forEach(soul => {
      const age = soul.age;
      if (age === null || age === undefined) {
        stats.unknown.count++;
        stats.unknown.list.push(soul);
      } else if (age <= 12) {
        stats.children.count++;
        stats.children.list.push(soul);
      } else if (age <= 19) {
        stats.teens.count++;
        stats.teens.list.push(soul);
      } else if (age <= 33) {
        stats.youngAdults.count++;
        stats.youngAdults.list.push(soul);
      } else if (age <= 55) {
        stats.adults.count++;
        stats.adults.list.push(soul);
      } else {
        stats.seniors.count++;
        stats.seniors.list.push(soul);
      }
    });

    return stats;
  }, [souls]);

  const activeAgeGroupSouls = useMemo(() => {
    if (!selectedAgeGroup) return [];
    const groupKey = selectedAgeGroup.toLowerCase().split(' ')[0];
    if (groupKey.startsWith('children')) return ageGroups.children.list;
    if (groupKey.startsWith('teens')) return ageGroups.teens.list;
    if (groupKey.startsWith('young')) return ageGroups.youngAdults.list;
    if (groupKey.startsWith('adults')) return ageGroups.adults.list;
    if (groupKey.startsWith('seniors')) return ageGroups.seniors.list;
    if (groupKey.startsWith('age')) return ageGroups.unknown.list;
    return [];
  }, [selectedAgeGroup, ageGroups]);

  const totalSoulsCount = useMemo(() => souls?.length || 0, [souls]);

  const soulForFollowUp = useMemo(() => souls?.find(s => s.id === followUpSoulId) || null, [souls, followUpSoulId]);
  const soulForHistory = useMemo(() => souls?.find(s => s.id === historySoulId) || null, [souls, historySoulId]);
  const soulToAssign = useMemo(() => souls?.find(s => s.id === assignSoulId) || null, [souls, assignSoulId]);
  const soulToEdit = useMemo(() => souls?.find(s => s.id === editSoulId) || null, [souls, editSoulId]);
  const soulToDelete = useMemo(() => souls?.find(s => s.id === deleteSoulId) || null, [souls, deleteSoulId]);
  const soulToAssess = useMemo(() => souls?.find(s => s.id === assessmentSoulId) || null, [souls, assessmentSoulId]);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: allCampaignsData } = useCollection<Campaign>(campaignsQuery);

  const campaigns = useMemo(() => {
    if (!allCampaignsData) return [];
    return allCampaignsData.filter(c => c.status === 'active');
  }, [allCampaignsData]);
  
  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: activeFellowships } = useCollection<Fellowship>(fellowshipsQuery);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const loading = userLoading || soulsLoading || profileLoading;

  const handleOpenFollowUp = useCallback((soul: Soul) => setFollowUpSoulId(soul.id), []);
  const handleOpenHistory = useCallback((soul: Soul) => setHistorySoulId(soul.id), []);
  const handleOpenAssign = useCallback((soul: Soul) => setAssignSoulId(soul.id), []);
  const handleOpenEdit = useCallback((soul: Soul) => setEditSoulId(soul.id), []);
  const handleOpenDelete = useCallback((soul: Soul) => setDeleteSoulId(soul.id), []);
  const handleOpenAssessment = useCallback((soul: Soul) => setAssessmentSoulId(soul.id), []);

  const handleExportHarvest = async (formatType: 'csv' | 'pdf') => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Status", "Date Won"];
    const body = souls?.map(s => [s.firstName, s.lastName, s.email || '', s.phone || '', s.status, s.wonAt ? format(safeToDate(s.wonAt)!, 'yyyy-MM-dd') : '']) || [];
    const csvContent = [headers.join(","), ...body.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `harvest-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    toast({ title: "Exported", description: "Harvest list exported." });
  };

  const handleExportSingleSoul = useCallback(async (soul: Soul, formatType: 'csv' | 'pdf') => {
      toast({ title: "Exported", description: `Record for ${soul.firstName} exported.` });
  }, [toast]);

  const handleDeleteSoul = () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulToDelete.id);
    const globalSoulRef = doc(firestore, 'souls', soulToDelete.id);

    const batch = writeBatch(firestore);
    batch.delete(soulRef);
    batch.delete(globalSoulRef);
    
    batch.commit().then(() => {
        toast({ title: "Record Removed" });
        setIsDeleting(false);
        setDeleteSoulId(null);
    }).catch(() => {
        toast({ variant: 'destructive', title: "Delete Failed" });
        setIsDeleting(false);
    });
  };

  const handleAssignGroup = (soul: Soul, groupId: string, groupType: 'Fellowship' | 'Association') => {
    if (!user || !firestore) return;

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    const selectedGroup = activeFellowships?.find(f => f.id === groupId);
    
    const updateData: { [key: string]: any } = {
        updatedAt: serverTimestamp(),
    };

    if (groupId === 'none') {
        if (groupType === 'Association') {
            updateData.associationId = deleteField();
            updateData.associationName = deleteField();
        } else {
            updateData.fellowshipId = deleteField();
            updateData.fellowshipName = deleteField();
        }
    } else if (selectedGroup) {
        if (groupType === 'Association') {
            updateData.associationId = selectedGroup.id;
            updateData.associationName = selectedGroup.name;
        } else {
            updateData.fellowshipId = selectedGroup.id;
            updateData.fellowshipName = selectedGroup.name;
        }
    }

    updateDoc(soulRef, updateData).then(() => {
        updateDoc(globalSoulRef, updateData);
        toast({ title: "Community Assignment Updated" });
        setAssignSoulId(null);
    });
  };

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    
    const term = searchTerm.toLowerCase();
    return souls.filter(soul => 
      `${soul.firstName} ${soul.lastName}`.toLowerCase().includes(term) ||
      (soul.nickname && soul.nickname.toLowerCase().includes(term)) ||
      (soul.phone && soul.phone.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            <div className="lg:col-span-8 space-y-8 pb-32">
                <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-xl border-x-0 sm:border-x -mx-4 sm:mx-0">
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-row items-center gap-2 sm:gap-3">
                            <Button 
                                variant="outline" 
                                className="flex-1 justify-start text-left text-muted-foreground font-normal rounded-full h-10 sm:h-11 px-4 hover:bg-muted/50 transition-colors text-sm sm:text-base min-w-0 border-dashed"
                                onClick={() => setIsLogDialogOpen(true)}
                                disabled={loading}
                            >
                                <span className="truncate">
                                    {loading ? "Preparing harvest list..." : "Who did you minister to today?"}
                                </span>
                            </Button>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button 
                                    variant="secondary" 
                                    size="icon" 
                                    className="h-10 sm:h-11 w-10 sm:w-11 rounded-full shadow-lg"
                                    onClick={() => setIsLogDialogOpen(true)}
                                    disabled={loading}
                                    title="Log Soul"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-10 sm:h-11 w-10 sm:w-11 rounded-full shadow-md bg-background"
                                            disabled={loading}
                                            title="Export Harvest"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem onSelect={() => handleExportHarvest('csv')}>CSV (Excel)</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleExportHarvest('pdf')}>PDF Document</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {soulsWithPhotos.length > 0 && (
                    <div className="px-4 sm:px-0 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-primary" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">GALLERY OF MY SOULS</h3>
                            </div>
                        </div>
                        <div 
                            className="overflow-hidden relative w-full"
                            onMouseEnter={() => setIsGalleryPaused(true)}
                            onMouseLeave={() => setIsGalleryPaused(false)}
                        >
                            <motion.div 
                                className="flex gap-4 w-max"
                                animate={{ x: isGalleryPaused ? undefined : ["0%", "-33.3333333%"] }}
                                transition={{
                                    x: {
                                        duration: 30, 
                                        repeat: Infinity,
                                        ease: "linear",
                                        repeatType: "loop"
                                    }
                                }}
                            >
                                {duplicatedSouls.map((s, idx) => (
                                    <div key={`${s.id}-${idx}`} className="basis-[140px] sm:basis-[180px] shrink-0">
                                        <Dialog>
                                            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-background shadow-xl cursor-pointer group active:scale-95 transition-all">
                                                    <Image 
                                                        src={s.photoURL!} 
                                                        alt={s.firstName} 
                                                        fill 
                                                        className="object-cover transition-transform group-hover:scale-110 duration-500" 
                                                        unoptimized 
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                                    <div className="absolute bottom-3 left-3 right-3 text-white text-left">
                                                        <p className="font-black text-[10px] sm:text-xs uppercase truncate tracking-tight">
                                                            {s.nickname || s.firstName}
                                                        </p>
                                                        <Badge className={cn(
                                                            "text-white h-3.5 px-1 text-[7px] font-black uppercase border-none mt-1 shadow-sm",
                                                            s.status === 'New' ? "bg-amber-500" : 
                                                            s.status === 'Contacted' ? "bg-blue-500" : 
                                                            "bg-green-500"
                                                        )}>{s.status}</Badge>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center">
                                                <DialogHeader className="sr-only"><DialogTitle>Soul Photo</DialogTitle></DialogHeader>
                                                <div className="relative h-full w-full flex items-center justify-center p-4">
                                                    <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center">
                                                        <Image 
                                                            src={s.photoURL!} 
                                                            alt={s.firstName} 
                                                            fill 
                                                            className="object-contain shadow-2xl ring-4 ring-white/10" 
                                                            unoptimized 
                                                        />
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                )}

                <div className="px-4 sm:px-0 space-y-4 text-left">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 text-left">
                            <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">DEMOGRAPHICS</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Age Analysis</p>
                        </div>
                    </div>
                    <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { label: 'Children (0-12)', count: ageGroups.children.count, color: 'bg-blue-500', icon: Sparkles },
                                    { label: 'Teens (13-19)', count: ageGroups.teens.count, color: 'bg-green-500', icon: Zap },
                                    { label: 'Young Adults (20-33)', count: ageGroups.youngAdults.count, color: 'bg-primary', icon: Flame },
                                    { label: 'Adults (34-55)', count: ageGroups.adults.count, color: 'bg-indigo-500', icon: Target },
                                    { label: 'Seniors (56+)', count: ageGroups.seniors.count, color: 'bg-purple-500', icon: Award },
                                    { label: 'Age Not Set', count: ageGroups.unknown.count, color: 'bg-slate-400', icon: HelpCircle },
                                ].map(group => {
                                    const percent = totalSoulsCount > 0 ? (group.count / totalSoulsCount) * 100 : 0;
                                    const Icon = group.icon;

                                    return (
                                        <div 
                                            key={group.label} 
                                            className={cn(
                                                "space-y-3 p-4 rounded-2xl bg-background shadow-sm border group transition-all cursor-pointer relative overflow-hidden text-left",
                                                "hover:border-primary/20"
                                            )}
                                            onClick={() => setSelectedAgeGroup(group.label)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center transition-colors group-hover:bg-primary/10">
                                                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                                </div>
                                                <span className="font-black text-lg text-primary tracking-tighter">{group.count}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                    <span>{group.label}</span>
                                                    <span>{Math.round(percent)}%</span>
                                                </div>
                                                <Progress value={percent} className="h-1.5 bg-muted" indicatorClassName={group.color} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="px-4 sm:px-0">
                    <RelationshipCircleTracker 
                        souls={souls || []}
                        campaigns={campaigns}
                        fellowships={activeFellowships || []}
                        className="rounded-3xl"
                    />
                </div>

                <div className="-mx-4 sm:mx-0">
                    <SoulsWonTable 
                        souls={filteredSouls || []} 
                        loading={loading}
                        onFollowUp={handleOpenFollowUp}
                        onViewHistory={handleOpenHistory}
                        onExportSingle={handleExportSingleSoul}
                        onOpenAssignDialog={handleOpenAssign}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                        onAssess={handleOpenAssessment}
                    />
                </div>
            </div>

            <div className="lg:col-span-4">
                <FeedSidebar mode="harvest" />
            </div>
        </div>

        {mounted && (
            isMobile ? (
                <Sheet open={!!selectedAgeGroup} onOpenChange={(open) => !open && setSelectedAgeGroup(null)}>
                    <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Harvest Demographic</span>
                            </div>
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight">{selectedAgeGroup} Directory</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Converts within the {selectedAgeGroup?.toLowerCase()} demographic.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8">
                                <AgeGroupSoulList souls={activeAgeGroupSouls} />
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={!!selectedAgeGroup} onOpenChange={(open) => !open && setSelectedAgeGroup(null)}>
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                        <div className="p-8 border-b bg-muted/10">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Demographic View</span>
                            </div>
                            <DialogHeader className="text-left">
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{selectedAgeGroup} Directory</DialogTitle>
                                <DialogDescription className="text-sm font-medium">Viewing all souls within this age group.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[60vh]">
                            <div className="p-8">
                                <AgeGroupSoulList souls={activeAgeGroupSouls} />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        <LogFollowUpDialog 
            soul={soulForFollowUp} 
            isOpen={!!followUpSoulId} 
            onOpenChange={(isOpen) => !isOpen && setFollowUpSoulId(null)} 
            onFollowUpLogged={() => setFollowUpSoulId(null)} 
        />
        <ViewHistoryDialog soul={soulForHistory} isOpen={!!historySoulId} onOpenChange={(isOpen) => !isOpen && setHistorySoulId(null)} />
        <AssignFellowshipDialog soul={soulToAssign} fellowships={activeFellowships || []} isOpen={!!assignSoulId} onOpenChange={(isOpen) => !isOpen && setAssignSoulId(null)} onAssignGroup={handleAssignGroup} />
        <SoulAssessmentDialog soul={soulToAssess} isOpen={!!assessmentSoulId} onOpenChange={(isOpen) => !isOpen && setAssessmentSoulId(null)} />

        <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => !open && setDeleteSoulId(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black font-headline leading-tight">Delete Record?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                        This will permanently remove the record from your Kingdom journal. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-11 font-bold">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Removal
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {mounted && (
            isMobile ? (
                <>
                    <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <SheetHeader className="text-left"><SheetTitle className="text-2xl font-black font-headline">Log New Soul</SheetTitle><SheetDescription className="text-sm">Record a new life won for Christ.</SheetDescription></SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8">
                                <LogSoulForm onSoulLogged={() => setIsLogDialogOpen(false)} fellowships={activeFellowships || []} campaigns={campaigns || []} />
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <Sheet open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <SheetHeader className="text-left"><SheetTitle className="text-2xl font-black font-headline">Edit Record</SheetTitle><SheetDescription className="text-sm">Update soul identity and mission details.</SheetDescription></SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={activeFellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </>
            ) : (
                <>
                    <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader className="text-left"><DialogTitle className="text-2xl font-black font-headline">Log New Soul</DialogTitle><DialogDescription>Record a new life won for Christ.</DialogDescription></DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8">
                                <LogSoulForm onSoulLogged={() => setIsLogDialogOpen(false)} fellowships={activeFellowships || []} campaigns={campaigns || []} />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <DialogHeader className="text-left"><DialogTitle className="text-2xl font-black font-headline">Edit Record</DialogTitle><DialogDescription>Update soul identity and mission details.</DialogDescription></DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={activeFellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </>
            )
        )}
    </div>
  );
}
