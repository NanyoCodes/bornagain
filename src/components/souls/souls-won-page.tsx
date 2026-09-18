"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from "next/navigation";
import { 
  PlusCircle, 
  Download, 
  Loader2, 
  Trash2, 
  ImageIcon,
  BarChart3,
  Target, 
  Zap,
  Flame,
  Award,
  UserPlus,
  Hourglass,
  ArrowLeft,
  ArrowRight,
  Globe,
  Sparkles,
  HelpCircle,
  ClipboardList,
  Users,
  Heart,
  User,
  Send
} from "lucide-react";
import { 
  Dialog, 
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { Soul, Campaign, Fellowship, UserProfile, AccountabilityRequest, SoulRelationship } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, deleteField, where, getDocs, increment, arrayUnion } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { format } from "date-fns";
import { safeToDate, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedSidebar } from "@/components/layout/feed-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RelationshipCircleTracker } from "@/components/souls/relationship-circle-tracker";
import { SoulsImportTemplateCard } from "@/components/settings/souls-import-template-card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Papa from 'papaparse';
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";

const SoulsWonTable = dynamic(() => import('@/components/souls/souls-won-table').then(m => m.SoulsWonTable), {
  loading: () => <div className="flex justify-center p-12 text-left"><Loader2 className="h-8 w-8 animate-spin text-left" /></div>,
  ssr: false
});

const LogFollowUpDialog = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const ViewHistoryDialog = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const AssignFellowshipDialog = dynamic(() => import('@/components/souls/assign-fellowship-dialog').then(m => m.AssignFellowshipDialog), { ssr: false });
const LogSoulForm = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });
const EditSoulForm = dynamic(() => import('@/components/souls/edit-soul-form').then(m => m.EditSoulForm), { ssr: false });
const SoulAssessmentDialog = dynamic(() => import('@/components/souls/soul-assessment-dialog').then(m => m.SoulAssessmentDialog), { ssr: false });

function FilteredSoulList({ souls, allSouls, onSelectSoul, onAddChild }: { souls: Soul[], allSouls: Soul[], onSelectSoul: (soul: Soul) => void, onAddChild: (p1: Soul, p2?: Soul | null) => void }) {
  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10 text-left">
        <p className="text-sm text-muted-foreground italic text-left">No souls found matching this criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6 text-left">
      {souls.map((s) => {
        const isFamilyMember = s.maritalStatus === 'Married';
        const wonAt = safeToDate(s.wonAt);
        
        const spouseObj = isFamilyMember ? allSouls.find(other => {
            if (other.id === s.id || other.maritalStatus !== 'Married') return false;
            const otherFull = `${other.firstName} ${other.lastName}`.toLowerCase();
            const sFull = `${s.firstName} ${s.lastName}`.toLowerCase();
            const sSpouse = (s.spouseName || "").toLowerCase();
            const otherSpouse = (other.spouseName || "").toLowerCase();
            return (sSpouse === otherFull || sSpouse === other.firstName.toLowerCase()) &&
                   (otherSpouse === sFull || otherSpouse === s.firstName.toLowerCase());
        }) : null;

        const householdChildren = allSouls.filter(child => s.childrenIds?.includes(child.id));
        
        return (
          <div key={s.id} className="relative text-left text-left">
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border bg-background/50 group w-full relative gap-2 text-left text-left">
                <button 
                    onClick={() => onSelectSoul(s)}
                    className="flex flex-row items-center gap-2 sm:gap-3 min-w-0 flex-1 active:scale-[0.98] transition-all text-left"
                >
                    <div className="flex -space-x-3 sm:-space-x-4 shrink-0 text-left">
                        <Avatar className={cn("h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-md shrink-0 text-left")}>
                            <AvatarImage src={s.photoURL || undefined} className="object-cover text-left" />
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] sm:text-xs flex items-center justify-center h-full w-full text-left text-left text-left">{s.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {spouseObj && (
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-md ring-2 ring-primary/5 shrink-0 text-left text-left">
                                <AvatarImage src={spouseObj.photoURL || undefined} className="object-cover text-left text-left" />
                                <AvatarFallback className="font-black bg-primary/5 text-primary/60 text-[10px] sm:text-xs flex items-center justify-center h-full w-full text-left text-left text-left">{spouseObj.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 pr-1 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap text-left text-left text-left">
                            <p className="font-black text-[13px] sm:text-base uppercase tracking-tight max-w-[150px] sm:max-w-full truncate text-left">
                                {s.firstName} {s.lastName}
                                {s.age && (
                                    <span className="text-muted-foreground/60 ml-1 font-bold text-left">
                                        ({s.age})
                                    </span>
                                )}
                            </p>
                            <Badge variant="outline" className={cn("h-4 px-1 text-[7px] sm:text-[9px] uppercase font-black tracking-tighter shrink-0 bg-background/50 text-left", s.status === 'New' ? 'text-amber-600 border-amber-200' : s.status === 'Contacted' ? 'text-blue-600 border-blue-200' : 'text-green-600 border-green-200')}>{s.status}</Badge>
                        </div>
                        {spouseObj && (
                            <span className="text-primary/60 text-[9px] sm:text-[10px] block font-bold leading-tight truncate text-left text-left">
                                & {spouseObj.firstName}
                            </span>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-left">
                            <p className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap text-left">
                                Won {wonAt ? format(wonAt, 'MMM d, yy') : 'Recently'}
                            </p>
                            {isFamilyMember && (
                                <Badge variant="secondary" className="h-3.5 px-1 text-[7px] font-black uppercase bg-primary/10 text-primary border-none leading-none text-left">Family</Badge>
                            )}
                        </div>
                    </div>
                </button>
                <div className="flex items-center gap-1 shrink-0 ml-1 text-left">
                    {isFamilyMember && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/5 text-primary hover:bg-primary/10 text-left">
                                    <Users className="h-3.5 w-3.5 sm:h-4 w-4 text-left" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-xl text-left text-left">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left text-left">Members</DropdownMenuLabel>
                                <DropdownMenuSeparator className="text-left" />
                                <DropdownMenuItem onSelect={() => onSelectSoul(s)} className="rounded-lg py-2.5 text-left text-left">
                                    <User className="mr-2 h-4 w-4 text-left text-left" /> View {s.firstName}
                                </DropdownMenuItem>
                                {spouseObj && (
                                    <DropdownMenuItem onSelect={() => onSelectSoul(spouseObj)} className="rounded-lg py-2.5 text-left text-left text-left">
                                        <div className="flex items-center gap-2 text-left text-left text-left">
                                            <Avatar className="h-6 w-6 border text-left text-left text-left"><AvatarImage src={spouseObj.photoURL || undefined} className="text-left text-left text-left" /><AvatarFallback className="text-[8px] text-left text-left text-left">S</AvatarFallback></Avatar>
                                            <span className="text-xs font-bold uppercase truncate text-left text-left">{spouseObj.firstName} (Spouse)</span>
                                        </div>
                                    </DropdownMenuItem>
                                )}
                                {householdChildren.map(child => (
                                    <DropdownMenuItem key={child.id} onSelect={() => onSelectSoul(child)} className="rounded-lg py-2.5 text-left text-left text-left">
                                        <div className="flex items-center gap-2 text-left text-left text-left"><Avatar className="h-6 w-6 border text-left text-left text-left"><AvatarImage src={child.photoURL || undefined} className="text-left text-left text-left" /><AvatarFallback className="text-[8px] text-left text-left text-left">C</AvatarFallback></Avatar><span className="text-xs font-bold uppercase truncate text-left text-left">{child.firstName} (Child)</span></div>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="text-left" />
                                <DropdownMenuItem onSelect={() => onAddChild(s, spouseObj)} className="rounded-lg py-2.5 text-primary font-bold text-left text-left">
                                    <PlusCircle className="mr-2 h-4 w-4 text-left text-left" /> Add Child to Household
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onSelectSoul(s)} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary transition-colors text-left text-left">
                        <ArrowRight className="h-4 w-4 text-left text-left" />
                    </Button>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SoulsWonPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [mounted, setMounted] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followUpSoulId, setFollowUpSoulId] = useState<string | null>(null);
  const [historySoulId, setHistorySoulId] = useState<string | null>(null);
  const [assignSoulId, setAssignSoulId] = useState<string | null>(null);
  const [editSoulId, setEditSoulId] = useState<string | null>(null);
  const [deleteSoulId, setDeleteSoulId] = useState<string | null>(null);
  const [assessmentSoulId, setAssessmentSoulId] = useState<string | null>(null);

  const [selectedFilterGroup, setSelectedFilterGroup] = useState<{ type: 'age' | 'gender' | 'marital', value: string } | null>(null);
  const [logSoulDefaults, setLogSoulDefaults] = useState<any>({});

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

  useEffect(() => {
    const soulIdFromUrl = searchParams?.get('soulId');
    if (soulIdFromUrl) {
      setSelectedId(soulIdFromUrl);
    }
  }, [searchParams]);

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

  const genderStats = useMemo(() => {
    const stats = {
      male: { count: 0, list: [] as Soul[] },
      female: { count: 0, list: [] as Soul[] },
      unassigned: { count: 0, list: [] as Soul[] },
      total: 0
    };
    if (!souls) return stats;
    souls.forEach(s => {
      if (s.gender === 'Male') {
          stats.male.count++;
          stats.male.list.push(s);
      } else if (s.gender === 'Female') {
          stats.female.count++;
          stats.female.list.push(s);
      } else {
          stats.unassigned.count++;
          stats.unassigned.list.push(s);
      }
      stats.total++;
    });
    return stats;
  }, [souls]);

  const maritalStats = useMemo(() => {
    const stats = {
      married: { count: 0, list: [] as any[] },
      single: { count: 0, list: [] as Soul[] },
      divorced: { count: 0, list: [] as Soul[] },
      widowed: { count: 0, list: [] as Soul[] },
      total: 0
    };
    if (!souls) return stats;

    const processedIds = new Set<string>();

    souls.forEach(soul => {
      const status = soul.maritalStatus;
      if (status === 'Married') {
          if (!processedIds.has(soul.id)) {
              const spouse = souls.find(other => {
                if (other.id === soul.id || other.maritalStatus !== 'Married') return false;
                const otherFullName = `${other.firstName} ${other.lastName}`.toLowerCase();
                const sFull = `${soul.firstName} ${soul.lastName}`.toLowerCase();
                const sSpouse = (soul.spouseName || "").toLowerCase();
                const otherSpouse = (other.spouseName || "").toLowerCase();
                return (sSpouse === otherFullName || sSpouse === other.firstName.toLowerCase()) &&
                       (otherSpouse === sFull || otherSpouse === soul.firstName.toLowerCase());
              });

              if (spouse) {
                processedIds.add(spouse.id);
                stats.married.list.push({ ...soul, spouseRecord: spouse });
              } else {
                stats.married.list.push(soul);
              }
              
              processedIds.add(soul.id);
              stats.married.count++;
          }
      } else if (status === 'Single') {
          stats.single.count++;
          stats.single.list.push(soul);
      } else if (status === 'Divorced') {
          stats.divorced.count++;
          stats.divorced.list.push(soul);
      } else if (status === 'Widowed') {
          stats.widowed.count++;
          stats.widowed.list.push(soul);
      }
      stats.total++;
    });
    return stats;
  }, [souls]);

  const activeFilteredSouls = useMemo(() => {
    if (!selectedFilterGroup) return [];
    const { type, value } = selectedFilterGroup;
    const groupKey = value.toLowerCase();

    if (type === 'age') {
        if (groupKey.includes('children')) return ageGroups.children.list;
        if (groupKey.includes('teens')) return ageGroups.teens.list;
        if (groupKey.includes('young adults')) return ageGroups.youngAdults.list;
        if (groupKey.includes('adults')) return ageGroups.adults.list;
        if (groupKey.includes('seniors')) return ageGroups.seniors.list;
        if (groupKey.includes('age not set')) return ageGroups.unknown.list;
    } else if (type === 'gender') {
        if (groupKey === 'male') return genderStats.male.list;
        if (groupKey === 'female') return genderStats.female.list;
        if (groupKey === 'not assigned') return genderStats.unassigned.list;
    } else if (type === 'marital') {
        if (groupKey === 'families') return maritalStats.married.list;
        if (groupKey === 'singles') return maritalStats.single.list;
        if (groupKey === 'divorced') return maritalStats.divorced.list;
        if (groupKey === 'widowers') return maritalStats.widowed.list;
    }
    return [];
  }, [selectedFilterGroup, ageGroups, genderStats, maritalStats]);

  const totalSoulsCount = useMemo(() => souls?.length || 0, [souls]);

  const soulForFollowUp = useMemo(() => souls?.find(s => s.id === followUpSoulId) || null, [souls, followUpSoulId]);
  const soulForHistory = useMemo(() => souls?.find(s => s.id === historySoulId) || null, [souls, historySoulId]);
  const soulToAssign = useMemo(() => souls?.find(s => s.id === assignSoulId) || null, [souls, assignSoulId]);
  const soulToEdit = useMemo(() => souls?.find(s => s.id === editSoulId) || null, [souls, editSoulId]);
  const soulToDelete = useMemo(() => souls?.find(s => s.id === deleteSoulId) || null, [souls, deleteSoulId]);
  const soulToAssess = useMemo(() => souls?.find(s => s.id === assessmentSoulId) || null, [souls, assessmentSoulId]);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid), where('status', '==', 'active'));
  }, [user?.uid, firestore]);
  const { data: campaigns } = useCollection<Campaign>(campaignsQuery);
  
  const activeFellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: fellowships } = useCollection<Fellowship>(activeFellowshipsQuery);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const loading = soulsLoading || profileLoading;

  const handleOpenFollowUp = useCallback((s: Soul) => setFollowUpSoulId(s.id), []);
  const handleOpenHistory = useCallback((s: Soul) => setHistorySoulId(s.id), []);
  const handleOpenAssign = useCallback((s: Soul) => setAssignSoulId(s.id), []);
  const handleOpenEdit = useCallback((s: Soul) => setEditSoulId(s.id), []);
  const handleOpenDelete = useCallback((s: Soul) => setDeleteSoulId(s.id), []);
  const handleOpenAssessment = useCallback((s: Soul) => setAssessmentSoulId(s.id), []);

  const handleAddChild = useCallback((p1: Soul, p2?: Soul | null) => {
    const parentNames = [p1.firstName];
    const parentIds = [p1.id];
    if (p2) {
      parentNames.push(p2.firstName);
      parentIds.push(p2.id);
    }
    setLogSoulDefaults({
      defaultLastName: p1.lastName,
      defaultLocation: p1.locationWon,
      defaultParentIds: parentIds,
      defaultParentNames: parentNames,
      defaultRelationship: 'Family' as any
    });
    setIsLogDialogOpen(true);
  }, []);

  const getBase64Logo = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new (window as any).Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject('Logo load failed');
    });
  }, []);

  const handleExportHarvest = async (formatType: 'csv' | 'pdf') => {
    if (!souls || souls.length === 0) {
        toast({ variant: 'destructive', title: 'Empty Harvest', description: 'No souls found to export.' });
        return;
    }
    
    toast({ title: "Exporting...", description: "Your professional Kingdom report is being generated." });

    const headers = ["First Name", "Last Name", "Gender", "Status", "Won At", "Source", "Phone", "Email", "City", "Country"];
    const body = souls.map(s => [
        s.firstName,
        s.lastName || '',
        s.gender || 'N/A',
        s.status,
        s.wonAt ? format(s.wonAt.toDate(), 'yyyy-MM-dd') : 'N/A',
        s.source,
        s.phone || 'N/A',
        s.email || 'N/A',
        s.locationWon?.city || 'N/A',
        s.locationWon?.country || 'N/A'
    ]);

    if (formatType === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const docObj = new jsPDF({ orientation: 'landscape' });
        
        const logo = PlaceHolderImages.find(img => img.id === 'logo');
        if (logo) {
            try {
                const base64 = await getBase64Logo(logo.imageUrl);
                docObj.addImage(base64, 'PNG', 14, 10, 15, 15);
            } catch (e) {}
        }

        docObj.setFontSize(22);
        docObj.setFont('helvetica', 'bold');
        docObj.text("Testify Global: Soul Winning Harvest", 32, 21);

        docObj.setFontSize(10);
        docObj.setFont('helvetica', 'normal');
        docObj.setTextColor(100);
        docObj.text(`Mobilizer: ${userProfile?.firstName} ${userProfile?.lastName || ''}`, 32, 27);
        docObj.text(`Total Impact: ${souls.length} Lives`, 14, 40);
        docObj.text(`Export Date: ${format(new Date(), 'PPPP')}`, 283, 40, { align: 'right' });

        autoTable(docObj, {
            head: [headers],
            body: body,
            startY: 45,
            styles: { fontSize: 8, font: 'helvetica' },
            headStyles: { 
                fillColor: [249, 116, 22],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [250, 245, 240]
            },
            margin: { top: 45 }
        });

        docObj.save(`testify-harvest-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csv = Papa.unparse({ fields: headers, data: body });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `testify-harvest-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
    toast({ title: "Report Ready", description: "Download started." });
  };

  const handleExportSingleSoul = useCallback(async (s: Soul, formatType: 'csv' | 'pdf') => {
      const wonAt = safeToDate(s.wonAt);
      const data = [
          ["First Name", s.firstName],
          ["Last Name", s.lastName || ''],
          ["Gender", s.gender || 'N/A'],
          ["Status", s.status],
          ["Date Won", wonAt ? format(wonAt, 'PPP') : 'N/A'],
          ["Source", s.source],
          ["Phone", s.phone || 'N/A'],
          ["Email", s.email || 'N/A'],
          ["Home Church", s.church || 'N/A'],
          ["Location", [s.locationWon?.city, s.locationWon?.country].filter(Boolean).join(', ') || 'N/A']
      ];

      if (formatType === 'pdf') {
          const { jsPDF } = await import('jspdf');
          const { default: autoTable } = await import('jspdf-autotable');
          const docObj = new jsPDF();
          
          const logo = PlaceHolderImages.find(img => img.id === 'logo');
          if (logo) {
            try {
                const base64 = await getBase64Logo(logo.imageUrl);
                docObj.addImage(base64, 'PNG', 14, 10, 12, 12);
            } catch (e) {}
          }

          docObj.setFontSize(18);
          docObj.setFont('helvetica', 'bold');
          docObj.text(`Kingdom Identity Profile`, 28, 19);

          docObj.setFontSize(10);
          docObj.setFont('helvetica', 'normal');
          docObj.setTextColor(100);
          docObj.text(`Full Record: ${s.firstName} ${s.lastName || ''}`, 14, 32);
          docObj.text(`Log Date: ${format(new Date(), 'PPP')}`, 196, 32, { align: 'right' });

          autoTable(docObj, {
              head: [["Attribute", "Information"]],
              body: data,
              startY: 38,
              theme: 'striped',
              headStyles: { fillColor: [249, 116, 22] },
              styles: { cellPadding: 5 }
          });
          
          docObj.save(`record-${s.firstName.toLowerCase()}.pdf`);
      } else {
          const csv = Papa.unparse({ fields: ["Field", "Detail"], data });
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `record-${s.firstName.toLowerCase()}.csv`);
          link.click();
          URL.revokeObjectURL(url);
      }
      toast({ title: "Record Exported" });
  }, [toast, getBase64Logo]);

  const handleDeleteSoul = () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);

    const soulRef = doc(firestore, `users/${soulToDelete.userId}/souls`, soulToDelete.id);
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

  const handleAssignGroup = (s: Soul, fellowshipId: string, groupType: 'Fellowship' | 'Association') => {
    if (!user || !firestore) return;

    const soulRef = doc(firestore, `users/${s.userId}/souls`, s.id);
    const globalSoulRef = doc(firestore, 'souls', s.id);
    const selectedGroup = fellowships?.find(f => f.id === fellowshipId);
    
    const updateData: { [key: string]: any } = {
        updatedAt: serverTimestamp(),
    };

    if (fellowshipId === 'none') {
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
    return souls.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
      (s.nickname && s.nickname.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 text-left">
            <div className="lg:col-span-8 space-y-8 pb-32 text-left">
                <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                        <div className="space-y-1 text-left">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase text-left">MY HARVEST</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                                <ClipboardList className="h-4 w-4 text-primary text-left" /> Logged Records
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto text-left">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-12 px-4 sm:px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background flex-1 sm:flex-none text-left">
                                        <Download className="mr-2 h-4 w-4 text-left" /> EXPORT
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-48 shadow-xl text-left">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">Select Format</DropdownMenuLabel>
                                    <DropdownMenuSeparator className="text-left" />
                                    <DropdownMenuItem onSelect={() => handleExportHarvest('csv')} className="rounded-lg py-2.5 text-left">
                                        <Download className="mr-2 h-4 w-4 opacity-40 text-left" /> CSV (Excel)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleExportHarvest('pdf')} className="rounded-lg py-2.5 text-left">
                                        <Download className="mr-2 h-4 w-4 text-primary text-left" /> PDF Report
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => { setLogSoulDefaults({}); setIsLogDialogOpen(true); }} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 flex-1 sm:flex-none text-left">
                                <PlusCircle className="mr-2 h-4 w-4 text-left" /> ADD SOUL
                            </Button>
                        </div>
                    </div>
                </header>

                {soulsWithPhotos.length > 0 && (
                    <div className="px-4 sm:px-0 animate-in fade-in slide-in-from-top-4 duration-700 text-left">
                        <div className="flex items-center justify-between mb-4 px-1 text-left">
                            <div className="flex items-center gap-2 text-left">
                                <ImageIcon className="h-4 w-4 text-primary text-left" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-left">GALLERY OF MY SOULS</h3>
                            </div>
                        </div>
                        <div 
                            className="overflow-hidden relative w-full text-left"
                            onMouseEnter={() => setIsGalleryPaused(true)}
                            onMouseLeave={() => setIsGalleryPaused(false)}
                        >
                            <motion.div 
                                className="flex gap-4 w-max text-left"
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
                                    <div key={`${s.id}-${idx}`} className="basis-[140px] sm:basis-[180px] shrink-0 text-left">
                                        <Dialog>
                                            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-background shadow-xl cursor-pointer group active:scale-95 transition-all text-left">
                                                    <Image 
                                                        src={s.photoURL!} 
                                                        alt={s.firstName} 
                                                        fill 
                                                        className="object-cover transition-transform group-hover:scale-110 duration-500 text-left" 
                                                        unoptimized 
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left" />
                                                    <div className="absolute bottom-3 left-3 right-3 text-white text-left">
                                                        <p className="font-black text-[10px] sm:text-xs uppercase truncate tracking-tight text-left">
                                                            {s.nickname || s.firstName} {s.age && <span className="opacity-60 ml-1 font-bold text-left">({s.age})</span>}
                                                        </p>
                                                        <Badge className={cn(
                                                            "text-white h-3.5 px-1 text-[7px] font-black uppercase border-none mt-1 shadow-sm text-left",
                                                            s.status === 'New' ? "bg-amber-500" : 
                                                            s.status === 'Contacted' ? "bg-blue-500" : 
                                                            "bg-green-500"
                                                        )}>{s.status}</Badge>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center text-left">
                                                <DialogHeader className="sr-only text-left"><DialogTitle>Soul Photo</DialogTitle></DialogHeader>
                                                <div className="relative h-full w-full flex items-center justify-center p-4 text-center text-left">
                                                    <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left">
                                                        <Image 
                                                            src={s.photoURL!} 
                                                            alt={s.firstName} 
                                                            fill 
                                                            className="object-contain shadow-2xl ring-4 ring-white/10 text-left" 
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

                <div className="px-4 sm:px-0 space-y-12 text-left">
                    {/* Age Demographics */}
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3 text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20 text-left">
                                <BarChart3 className="h-5 w-5 text-primary text-left" />
                            </div>
                            <div className="min-w-0 text-left">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight text-left">DEMOGRAPHICS</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left">Age Analysis</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden text-left">
                            <CardContent className="p-6 sm:p-8 space-y-6 text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
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
                                                onClick={() => setSelectedFilterGroup({ type: 'age', value: group.label })}
                                            >
                                                <div className="flex items-center justify-between text-left">
                                                    <div className="h-8 w-8 rounded-xl bg-muted/5 flex items-center justify-center transition-colors group-hover:bg-primary/10 text-left">
                                                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary text-left" />
                                                    </div>
                                                    <span className="font-black text-lg text-primary tracking-tighter text-left">{group.count}</span>
                                                </div>
                                                <div className="space-y-1 text-left">
                                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">
                                                        <span className="text-left">{group.label}</span>
                                                        <span className="text-left">{Math.round(percent)}%</span>
                                                    </div>
                                                    <Progress value={percent} className="h-1.5 bg-muted text-left" indicatorClassName={group.color} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gender Demographics */}
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3 text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20 text-left">
                                <Users className="h-5 w-5 text-primary text-left" />
                            </div>
                            <div className="min-w-0 text-left">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight text-left">GENDER BALANCE</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left">Kingdom Workforce Diversity</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden text-left">
                            <CardContent className="p-6 sm:p-8 text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                                    {[
                                        { label: 'Male', count: genderStats.male.count, color: 'bg-blue-600' },
                                        { label: 'Female', count: genderStats.female.count, color: 'bg-rose-500' },
                                        { label: 'Not Assigned', count: genderStats.unassigned.count, color: 'bg-slate-400' },
                                    ].map(stat => {
                                        const percent = genderStats.total > 0 ? (stat.count / genderStats.total) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-6 rounded-2xl bg-background shadow-sm border cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98] text-left"
                                              onClick={() => setSelectedFilterGroup({ type: 'gender', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-baseline text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">{stat.label}</p>
                                                    <span className="text-2xl font-black text-primary tracking-tighter text-left">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5 text-left">
                                                    <Progress value={percent} className="h-2 bg-muted text-left" indicatorClassName={stat.color} />
                                                    <p className="text-right text-[9px] font-black text-muted-foreground/60 uppercase text-left">{Math.round(percent)}% OF HARVEST</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Marital Demographics */}
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3 text-left">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20 text-left">
                                <Heart className="h-5 w-5 text-primary text-left" />
                            </div>
                            <div className="min-w-0 text-left">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight text-left">MARITAL DEMOGRAPHICS</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left">Family & Status Insights</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden text-left">
                            <CardContent className="p-6 sm:p-8 text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                                    {[
                                        { label: 'Families', count: maritalStats.married.count, color: 'bg-emerald-500', icon: Target },
                                        { label: 'Singles', count: maritalStats.single.count, color: 'bg-primary', icon: Sparkles },
                                        { label: 'Divorced', count: maritalStats.divorced.count, color: 'bg-slate-500', icon: HelpCircle },
                                        { label: 'Widowers', count: maritalStats.widowed.count, color: 'bg-indigo-600', icon: Award },
                                    ].map(stat => {
                                        const percent = totalSoulsCount > 0 ? (stat.count / totalSoulsCount) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-5 rounded-2xl bg-background shadow-sm border cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98] text-left"
                                              onClick={() => setSelectedFilterGroup({ type: 'marital', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-center text-left">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">{stat.label}</p>
                                                    <span className="text-xl font-black text-primary tracking-tighter text-left">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5 text-left">
                                                    <Progress value={percent} className="h-1.5 bg-muted text-left" indicatorClassName={stat.color} />
                                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase text-left">{Math.round(percent)}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="px-4 sm:px-0 text-left">
                    <RelationshipCircleTracker 
                        souls={souls || []}
                        campaigns={campaigns || []}
                        fellowships={fellowships || []}
                        className="rounded-3xl text-left"
                    />
                </div>

                <div className="px-4 sm:px-0 text-left">
                    <SoulsImportTemplateCard />
                </div>

                <div className="-mx-4 sm:mx-0 text-left">
                    <SoulsWonTable 
                        souls={filteredSouls || []} 
                        allSouls={souls || []}
                        loading={loading}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onFollowUp={handleOpenFollowUp}
                        onViewHistory={handleOpenHistory}
                        onExportSingle={handleExportSingleSoul}
                        onOpenAssignDialog={handleOpenAssign}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                        onAssess={handleOpenAssessment}
                        onAddChild={handleAddChild}
                    />
                </div>
            </div>

            <div className="lg:col-span-4 text-left">
                <FeedSidebar mode="harvest" />
            </div>
        </div>

        {mounted && (
            isMobile ? (
                <Drawer open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DrawerContent className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-4 sm:p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Harvest Demographic</span>
                            </div>
                            <DrawerHeader className="text-left flex-shrink-0">
                                <DrawerTitle className="text-2xl font-black font-headline uppercase leading-tight text-left"> {selectedFilterGroup?.value} Directory</DrawerTitle>
                                <DrawerDescription className="text-sm font-medium mt-1 text-left">Converts within the {selectedFilterGroup?.value?.toLowerCase()} demographic.</DrawerDescription>
                            </DrawerHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left">
                            <div className="p-4 sm:p-8 text-left">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(s) => {
                                    setSelectedFilterGroup(null);
                                    setSelectedId(s.id);
                                  }} 
                                  onAddChild={handleAddChild}
                                />
                            </div>
                        </ScrollArea>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                        <div className="p-8 border-b bg-muted/10 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Demographic View</span>
                            </div>
                            <DialogHeader className="text-left">
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">{selectedFilterGroup?.value} Directory</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-left">Viewing all souls within this demographic group.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[60vh] text-left">
                            <div className="p-4 sm:p-8 text-left">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(s) => {
                                    setSelectedFilterGroup(null);
                                    setSelectedId(s.id);
                                  }} 
                                  onAddChild={handleAddChild}
                                />
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
            userProfile={userProfile}
        />
        <ViewHistoryDialog soul={soulForHistory} isOpen={!!historySoulId} onOpenChange={(isOpen) => !isOpen && setHistorySoulId(null)} />
        <AssignFellowshipDialog soul={soulToAssign} fellowships={fellowships || []} isOpen={!!assignSoulId} onOpenChange={(isOpen) => !isOpen && setAssignSoulId(null)} onAssignGroup={handleAssignGroup} />
        <SoulAssessmentDialog soul={soulToAssess} isOpen={!!assessmentSoulId} onOpenChange={(isOpen) => !isOpen && setAssessmentSoulId(null)} />

        <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => !open && setDeleteSoulId(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                <AlertDialogHeader className="text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left">Delete Record?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left">
                        This will permanently remove the record from your Kingdom journal. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold text-left">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                        Confirm Removal
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {mounted && (
            isMobile ? (
                <>
                    <Drawer open={isLogDialogOpen} onOpenChange={(open) => { setIsLogDialogOpen(open); if(!open) setLogSoulDefaults({}); }}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <DrawerHeader className="text-left"><DrawerTitle className="text-2xl font-black font-headline text-left">Add New Soul</DrawerTitle><DrawerDescription className="text-sm text-left">Record a new life won for Christ.</DrawerDescription></DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogDialogOpen(false); setLogSoulDefaults({}); }} 
                                    fellowships={fellowships || []} 
                                    campaigns={campaigns || []} 
                                    {...logSoulDefaults}
                                />
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <DrawerHeader className="text-left"><DrawerTitle className="text-2xl font-black font-headline text-left">Edit Record</DrawerTitle><DrawerDescription className="text-sm text-left">Update soul identity and mission details.</DrawerDescription></DrawerHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={isLogDialogOpen} onOpenChange={(open) => { setIsLogDialogOpen(open); if(!open) setLogSoulDefaults({}); }}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold font-headline text-left">Add New Soul</DialogTitle>
                                    <DialogDescription className="text-sm text-left">Record a new life won for Christ.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogDialogOpen(false); setLogSoulDefaults({}); }} 
                                    fellowships={fellowships || []} 
                                    campaigns={campaigns || []} 
                                    {...logSoulDefaults}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <DialogHeader className="text-left">
                                    <DialogTitle className="text-2xl font-black font-headline text-left">Edit Record</DialogTitle>
                                    <DialogDescription className="text-sm text-left">Update soul identity and mission details.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </>
            )
        )}
    </div>
  );
}
