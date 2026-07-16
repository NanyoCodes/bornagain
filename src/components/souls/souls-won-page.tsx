
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Download, 
  Loader2, 
  Trash2, 
  HeartHandshake, 
  Sparkles, 
  Info, 
  Users, 
  ImageIcon,
  BarChart3,
  Target,
  Zap,
  Flame,
  Award,
  ChevronDown,
  X,
  UserPlus,
  Hourglass,
  ArrowLeft,
  ArrowRight,
  Newspaper,
  Globe
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import type { Soul, Campaign, Fellowship, UserProfile, AccountabilityRequest } from "@/lib/types";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, addDoc, deleteField, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeToDate, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { FeedSidebar } from "@/components/layout/feed-sidebar";
import Image from "next/image";
import { format } from "date-fns";
import { SoulAssessmentDialog } from "./soul-assessment-dialog";
import { Progress } from "@/components/ui/progress";
import { RelationshipCircleTracker } from "@/components/souls/relationship-circle-tracker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Performance: Dynamically import heavy components
const SoulsWonTable = dynamic(() => import('@/components/souls/souls-won-table').then(m => m.SoulsWonTable), {
  loading: () => <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false
});

const LogFollowUpDialog = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const ViewHistoryDialog = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const AssignFellowshipDialog = dynamic(() => import('@/components/souls/assign-fellowship-dialog').then(m => m.AssignFellowshipDialog), { ssr: false });
const LogSoulForm = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });
const EditSoulForm = dynamic(() => import('@/components/souls/edit-soul-form').then(m => m.EditSoulForm), { ssr: false });

export default function SoulsWonPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
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

  const isAnyModalOpen = !!(followUpSoulId || historySoulId || assignSoulId || editSoulId || deleteSoulId || isLogDialogOpen || assessmentSoulId || selectedAgeGroup);

  useEffect(() => {
    if (!isAnyModalOpen && typeof document !== 'undefined') {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.removeAttribute('aria-hidden');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnyModalOpen]);

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
      children: 0,
      teens: 0,
      youngAdults: 0,
      adults: 0,
      seniors: 0,
      unknown: 0
    };

    if (!souls) return stats;

    souls.forEach(soul => {
      const age = soul.age;
      if (age === null || age === undefined) {
        stats.unknown++;
      } else if (age <= 12) {
        stats.children++;
      } else if (age <= 19) {
        stats.teens++;
      } else if (age <= 35) {
        stats.youngAdults++;
      } else if (age <= 55) {
        stats.adults++;
      } else {
        stats.seniors++;
      }
    });

    return stats;
  }, [souls]);

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
    if (!souls || souls.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const headers = [
      "First Name", 
      "Last Name", 
      "Photo URL",
      "Gender", 
      "Age", 
      "Email", 
      "Phone", 
      "Home Church", 
      "Relationship",
      "Source", 
      "Source Details",
      "Fellowship", 
      "Association", 
      "Status", 
      "Date Won", 
      "Location Won", 
      "Spiritual State", 
      "Follow-up Strategy", 
      "Emotional Needs", 
      "Physical Needs", 
      "Financial Needs", 
      "Social Needs"
    ];

    const body = souls.map(soul => {
      const wonAtDate = safeToDate(soul.wonAt);
      const locWon = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : '';
      const assessment = soul.needsAssessment || {};
      
      return [
        soul.firstName, 
        soul.lastName, 
        soul.photoURL || '',
        soul.gender || '',
        soul.age?.toString() || '',
        soul.email || '', 
        soul.phone || '', 
        soul.church || '', 
        soul.relationship || '',
        soul.source, 
        soul.sourceDetails || '',
        soul.fellowshipName || '',
        soul.associationName || '',
        soul.status,
        wonAtDate ? format(wonAtDate, 'yyyy-MM-dd') : '',
        locWon,
        assessment.generalImpression || '',
        assessment.followUpPlan || '',
        assessment.emotionalNeeds || '',
        assessment.physicalNeeds || '',
        assessment.financialNeeds || '',
        assessment.socialNeeds || ''
      ];
    });

    if (formatType === 'pdf') {
        const docObj = new jsPDF({ orientation: 'landscape' });
        docObj.text("Souls Won Report", 14, 15);
        autoTable(docObj, { 
          head: [headers], 
          body: body, 
          startY: 20,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [249, 116, 22] }
        });
        docObj.save(`souls-won-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csvRows = [headers.join(",")];
        body.forEach(row => {
          csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `souls-won-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
    toast({ title: "Export Started" });
  };

  const handleExportSingleSoul = useCallback(async (soul: Soul, formatType: 'csv' | 'pdf') => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const wonAtDate = safeToDate(soul.wonAt);
    const dateStr = wonAtDate ? format(wonAtDate, 'PPP') : 'N/A';
    const assessment = soul.needsAssessment || {};
    const locWon = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : 'N/A';
    
    const rows = [
      ["First Name", soul.firstName],
      ["Last Name", soul.lastName],
      ["Gender", soul.gender || 'N/A'],
      ["Age", soul.age?.toString() || 'N/A'],
      ["Email", soul.email || 'N/A'],
      ["Phone", soul.phone || 'N/A'],
      ["Home Church", soul.church || 'N/A'],
      ["Relationship", soul.relationship || 'N/A'],
      ["Source", soul.source],
      ["Source Details", soul.sourceDetails || 'N/A'],
      ["Fellowship", soul.fellowshipName || 'N/A'],
      ["Association", soul.associationName || 'N/A'],
      ["Status", soul.status],
      ["Won At", dateStr],
      ["Location Won", locWon],
      ["Spiritual State", assessment.generalImpression || 'N/A'],
      ["Follow-up Strategy", assessment.followUpPlan || 'N/A'],
      ["Emotional Needs", assessment.emotionalNeeds || 'N/A'],
      ["Physical Needs", assessment.physicalNeeds || 'N/A'],
      ["Financial Needs", assessment.financialNeeds || 'N/A'],
      ["Social Needs", assessment.socialNeeds || 'N/A'],
      ["Other Needs", assessment.otherNeeds || 'N/A'],
    ];

    if (formatType === 'pdf') {
      const doc = new jsPDF();
      let startY = 20;

      // Add Photo if available
      if (soul.photoURL) {
          try {
              const imgData = await fetch(soul.photoURL).then(res => res.blob()).then(blob => new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              }));
              doc.addImage(imgData as string, 'JPEG', 14, 15, 30, 30);
              startY = 50;
          } catch (e) {
              console.warn("Failed to load photo for PDF export", e);
          }
      }

      doc.setFontSize(18);
      doc.text(`Soul Record: ${soul.firstName} ${soul.lastName}`, soul.photoURL ? 50 : 14, 25);
      
      autoTable(doc, {
        body: rows,
        startY: Math.max(startY, 35),
        theme: 'striped',
        headStyles: { fillColor: [249, 116, 22] }
      });
      doc.save(`soul-${soul.firstName}-${soul.lastName}.pdf`);
    } else {
      const headers = ["Field", "Value"];
      const rowsWithPhoto = [["Photo URL", soul.photoURL || 'N/A'], ...rows];
      const csvContent = headers.join(",") + "\n" + rowsWithPhoto.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `soul-${soul.firstName}-${soul.lastName}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const handleDeleteSoul = () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulToDelete.id);
    const globalSoulRef = doc(firestore, 'souls', soulToDelete.id);

    const batch = writeBatch(firestore);
    batch.delete(soulRef);
    batch.delete(globalSoulRef);
    
    batch.commit().catch(async (serverError) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_DELETE: ${soulRef.path} & ${globalSoulRef.path}`,
                operation: 'delete',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: "Delete Failed", description: serverError.message });
        }
    });

    toast({ title: "Record Removed" });
    setIsDeleting(false);
    setDeleteSoulId(null);
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

    updateDoc(soulRef, updateData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: soulRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    });

    updateDoc(globalSoulRef, updateData).catch(() => {});
    setAssignSoulId(null);
  };

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    
    const term = searchTerm.toLowerCase();
    return souls.filter(soul => 
      `${soul.firstName} ${soul.lastName}`.toLowerCase().includes(term) ||
      (soul.phone && soul.phone.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  return (
    <>
      <div 
        className="w-full max-w-7xl mx-auto" 
        inert={isAnyModalOpen ? true : undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            <div className="lg:col-span-8 space-y-8 pb-32">
                {/* Interaction Box */}
                <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-xl border-x-0 sm:border-x -mx-4 sm:mx-0">
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-row items-center gap-2 sm:gap-3">
                            <Button 
                                variant="outline" 
                                className="flex-1 justify-start text-left text-muted-foreground font-normal rounded-full h-10 sm:h-11 px-4 hover:bg-muted/50 transition-colors text-sm min-w-0 border-dashed"
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

                {/* Soul Slideshow */}
                {soulsWithPhotos.length > 0 && (
                    <div className="px-4 sm:px-0 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <ImageIcon className="h-4 w-4 text-primary" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">GALLERY OF MY SOULS</h3>
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
                                                    <div className="absolute bottom-3 left-3 right-3 text-white">
                                                        <p className="font-black text-[10px] sm:text-xs uppercase truncate tracking-tight">{s.firstName}</p>
                                                        <Badge className="bg-primary text-white h-3.5 px-1 text-[7px] font-black uppercase border-none mt-1">{s.status}</Badge>
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

                {/* Harvest Statistics Dashboard */}
                <div className="px-4 sm:px-0 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">SOULS- AGE ANALYSIS</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Demographic Discovery</p>
                        </div>
                    </div>
                    <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                        <CardContent className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { label: 'Children (0-12)', count: ageGroups.children, color: 'bg-blue-500', icon: Sparkles },
                                    { label: 'Teens (13-19)', count: ageGroups.teens, color: 'bg-green-500', icon: Zap },
                                    { label: 'Young Adults (20-35)', count: ageGroups.youngAdults, color: 'bg-primary', icon: Flame },
                                    { label: 'Adults (36-55)', count: ageGroups.adults, color: 'bg-indigo-500', icon: Target },
                                    { label: 'Seniors (56+)', count: ageGroups.seniors, color: 'bg-purple-500', icon: Award },
                                ].map(group => {
                                    const percent = totalSoulsCount > 0 ? (group.count / totalSoulsCount) * 100 : 0;
                                    const Icon = group.icon;

                                    return (
                                        <div 
                                            key={group.label} 
                                            className={cn(
                                                "space-y-3 p-4 rounded-2xl bg-background shadow-sm border group transition-all cursor-pointer relative overflow-hidden",
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
                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-background/90 px-3 py-1.5 rounded-full shadow-lg border text-center">
                                                    OPEN POP-UP PAGE WHEN CLICKED
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {ageGroups.unknown > 0 && (
                                <div className="flex justify-end pt-2">
                                    <Badge 
                                        variant="outline" 
                                        className="text-[8px] font-black uppercase tracking-widest bg-background/50 border-dashed cursor-pointer transition-all hover:bg-primary/5 active:scale-95"
                                        onClick={() => setSelectedAgeGroup('unknown')}
                                    >
                                        {ageGroups.unknown} Records Pending Demographics
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Relationship Circle Tracker */}
                <RelationshipCircleTracker 
                    souls={souls || []}
                    campaigns={campaigns}
                    fellowships={activeFellowships}
                    className="-mx-4 sm:mx-0 rounded-none sm:rounded-3xl"
                />

                {/* Table Content */}
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

            {/* Desktop Sidebar Column */}
            <div className="lg:col-span-4">
                <FeedSidebar mode="harvest" />
            </div>
        </div>
      </div>

      <LogFollowUpDialog 
          soul={soulForFollowUp} 
          isOpen={!!followUpSoulId} 
          onOpenChange={(isOpen) => {
              if (!isOpen) setFollowUpSoulId(null);
          }} 
          onFollowUpLogged={() => {
            setFollowUpSoulId(null);
          }} 
      />
      
      <ViewHistoryDialog 
          soul={soulForHistory} 
          isOpen={!!historySoulId} 
          onOpenChange={(isOpen) => {
              if (!isOpen) setHistorySoulId(null);
          }} 
      />
      
      <AssignFellowshipDialog 
          soul={soulToAssign} 
          fellowships={activeFellowships || []} 
          isOpen={!!assignSoulId} 
          onOpenChange={(isOpen) => {
              if (!isOpen) setAssignSoulId(null);
          }} 
          onAssignGroup={handleAssignGroup} 
      />

      <SoulAssessmentDialog
          soul={soulToAssess}
          isOpen={!!assessmentSoulId}
          onOpenChange={(isOpen) => {
              if (!isOpen) setAssessmentSoulId(null);
          }}
      />
      
      {/* Demographic Discovery Sheet */}
      <Sheet open={!!selectedAgeGroup} onOpenChange={(open) => !open && setSelectedAgeGroup(null)}>
          <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
              <div className="p-8 border-b bg-muted/10 shrink-0">
                  <SheetHeader className="text-left flex-shrink-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Demographic Discovery</span>
                      </div>
                      <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">
                        {selectedAgeGroup === 'unknown' ? 'Uncategorized Records' : `${selectedAgeGroup} Group`}
                      </SheetTitle>
                      <SheetDescription className="text-sm font-medium mt-1">
                        Viewing harvest results for this specific age segment.
                      </SheetDescription>
                  </SheetHeader>
              </div>
              <ScrollArea className="flex-grow min-h-0">
                  <div className="p-6 space-y-3">
                      {souls?.filter(soul => {
                          const age = soul.age;
                          if (selectedAgeGroup === 'unknown') return age === null || age === undefined;
                          if (selectedAgeGroup === 'Children (0-12)') return age !== null && age !== undefined && age <= 12;
                          if (selectedAgeGroup === 'Teens (13-19)') return age !== null && age !== undefined && age >= 13 && age <= 19;
                          if (selectedAgeGroup === 'Young Adults (20-35)') return age !== null && age !== undefined && age >= 20 && age <= 35;
                          if (selectedAgeGroup === 'Adults (36-55)') return age !== null && age !== undefined && age >= 36 && age <= 55;
                          if (selectedAgeGroup === 'Seniors (56+)') return age !== null && age !== undefined && age >= 56;
                          return false;
                      }).map(soul => (
                          <div key={soul.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-muted/5 group hover:bg-muted/10 transition-all">
                              <Avatar className="h-10 w-10 border shadow-sm shrink-0">
                                  <AvatarFallback className="font-bold bg-primary/10 text-primary uppercase">{soul.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                  <p className="font-black text-sm uppercase tracking-tight truncate">{soul.firstName} {soul.lastName}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="h-4 px-1 text-[7px] font-black uppercase tracking-widest">{soul.status}</Badge>
                                    {soul.age && <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Age: {soul.age}</span>}
                                  </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-xl h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 shadow-sm shrink-0" 
                                onClick={() => { setSelectedAgeGroup(null); setFollowUpSoulId(soul.id); }}
                              >
                                Follow-up
                              </Button>
                          </div>
                      ))}
                      {souls?.filter(soul => {
                          const age = soul.age;
                          if (selectedAgeGroup === 'unknown') return age === null || age === undefined;
                          if (selectedAgeGroup === 'Children (0-12)') return age !== null && age !== undefined && age <= 12;
                          if (selectedAgeGroup === 'Teens (13-19)') return age !== null && age !== undefined && age >= 13 && age <= 19;
                          if (selectedAgeGroup === 'Young Adults (20-35)') return age !== null && age !== undefined && age >= 20 && age <= 35;
                          if (selectedAgeGroup === 'Adults (36-55)') return age !== null && age !== undefined && age >= 36 && age <= 55;
                          if (selectedAgeGroup === 'Seniors (56+)') return age !== null && age !== undefined && age >= 56;
                          return false;
                      }).length === 0 && (
                          <div className="py-12 text-center">
                              <p className="text-xs text-muted-foreground italic">No souls found in this bracket.</p>
                          </div>
                      )}
                  </div>
              </ScrollArea>
              <div className="p-8 border-t bg-muted/5 flex justify-end shrink-0">
                <Button variant="outline" onClick={() => setSelectedAgeGroup(null)} className="rounded-xl font-bold h-12 px-10">Close Discovery</Button>
              </div>
          </SheetContent>
      </Sheet>
      
      {mounted && (
        <>
            {isMobile ? (
                <>
                <Sheet open={!!editSoulId} onOpenChange={(open) => { if(!open) setEditSoulId(null); }}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                    <SheetHeader className="text-left">
                        <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Soul Record</SheetTitle>
                        <SheetDescription className="text-sm font-medium mt-1">Update information for {soulToEdit?.firstName}.</SheetDescription>
                    </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow">
                    <div className="p-8">
                        {soulToEdit && (
                        <EditSoulForm 
                            soul={soulToEdit} 
                            onSoulUpdated={() => { setEditSoulId(null); }} 
                            fellowships={activeFellowships || []}
                            campaigns={campaigns || []}
                        />
                        )}
                    </div>
                    </ScrollArea>
                </SheetContent>
                </Sheet>

                <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left">
                            <SheetTitle className="font-black font-headline text-2xl uppercase tracking-tight">Log a New Soul</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Record the details of the person you've ministered to.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <div className="flex-grow overflow-y-auto p-8">
                        <LogSoulForm onSoulLogged={() => {
                        setIsLogDialogOpen(false);
                        }} fellowships={activeFellowships || []} campaigns={campaigns || []} />
                    </div>
                </SheetContent>
                </Sheet>
                </>
            ) : (
                <>
                <Dialog open={!!editSoulId} onOpenChange={(open) => { if(!open) setEditSoulId(null); }}>
                    <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                        <div className="p-8 border-b bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight">Edit Soul Details</DialogTitle>
                                <DialogDescription className="text-sm font-medium mt-1">Update information for {soulToEdit?.firstName}.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[70vh]">
                            <div className="p-8">
                                {soulToEdit && (
                                <EditSoulForm 
                                    soul={soulToEdit} 
                                    onSoulUpdated={() => { setEditSoulId(null); }} 
                                    fellowships={activeFellowships || []}
                                    campaigns={campaigns || []}
                                />
                                )}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="p-8 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold uppercase tracking-tight">Log a New Soul</DialogTitle>
                            <DialogDescription className="text-sm font-medium mt-1">
                                Record the details of the person you've ministered to.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="p-8">
                            <LogSoulForm onSoulLogged={() => {
                                setIsLogDialogOpen(false);
                            }} fellowships={activeFellowships || []} campaigns={campaigns || []} />
                        </div>
                    </ScrollArea>
                </DialogContent>
                </Dialog>
                </>
            )}
        </>
      )}

      <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => { if(!open) setDeleteSoulId(null); }}>
        <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black font-headline uppercase leading-tight">Delete Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              Are you sure you want to permanently remove {soulToDelete?.firstName} {soulToDelete?.lastName} from your records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
