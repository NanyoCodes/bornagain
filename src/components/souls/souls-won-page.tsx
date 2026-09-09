"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from "next/navigation";
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
  ArrowRight,
  Globe,
  Sparkles,
  HelpCircle,
  ClipboardList,
  ChevronRight,
  Plus,
  Users,
  Heart,
  Search,
  CheckCircle2,
  ShieldCheck,
  HandHeart,
  CircleAlert
} from "lucide-react";
import { 
  Dialog, 
  DialogTrigger,
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
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
import { format, differenceInYears } from "date-fns";
import { safeToDate, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import Image from "next/image";
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
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Papa from 'papaparse';
import Link from 'next/link';

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

function FilteredSoulList({ 
    souls, 
    allSouls,
    onSelectSoul,
    onAddChild,
    onLinkExistingChild,
    isUploading
}: { 
    souls: any[], 
    allSouls: Soul[],
    onSelectSoul: (soul: Soul) => void,
    onAddChild: (parents: Soul[]) => void,
    onLinkExistingChild: (parents: Soul[]) => void,
    isUploading: boolean
}) {
  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10 px-6">
        <p className="text-sm text-muted-foreground italic text-left">No souls found matching this criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-12 text-left">
      {souls.map((item) => {
        const soul = item;
        const isFamily = !!item.spouseRecord;
        const wonAt = safeToDate(soul.wonAt);
        const name = `${soul.firstName || 'Unnamed'} ${soul.lastName || ''}`.trim();
        
        if (isFamily) {
            const spouse = item.spouseRecord;
            const spouseName = `${spouse.firstName || 'Unnamed'} ${spouse.lastName || ''}`.trim();
            const marriageDate = safeToDate(soul.marriageDate || spouse.marriageDate);
            const yearsMarried = marriageDate ? differenceInYears(new Date(), marriageDate) : null;
            
            const children = allSouls.filter(s => 
                s.parentIds?.includes(soul.id) || s.parentIds?.includes(spouse.id)
            );

            return (
                <Accordion type="single" collapsible key={soul.id} className="w-full text-left">
                    <AccordionItem value={soul.id} className="border rounded-[1.5rem] bg-card overflow-hidden shadow-sm transition-all hover:border-primary/20 text-left">
                        <AccordionTrigger className="flex items-center justify-between p-3 sm:p-4 hover:no-underline group text-left">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 text-left">
                                <div className="flex -space-x-3 shrink-0 text-left">
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-sm ring-1 ring-primary/5 text-left">
                                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                                        <AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] text-left">{soul.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-background shadow-sm ring-1 ring-primary/5 text-left">
                                        <AvatarImage src={spouse.photoURL || undefined} className="object-cover text-left" />
                                        <AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] text-left">{spouse.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="min-w-0 flex-1 space-y-1 text-left">
                                    <p className="font-black text-[12px] sm:text-base uppercase tracking-tight leading-tight text-balance break-words [overflow-wrap:anywhere] text-left">
                                        {soul.firstName} & {spouse.firstName}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-wrap text-left">
                                        <Badge variant="outline" className="h-4 px-1 text-[7px] sm:text-[8px] font-black uppercase border-primary/20 text-primary bg-primary/5 leading-none text-left">
                                            {yearsMarried !== null ? `${yearsMarried} Years Married` : 'Family Unit'}
                                        </Badge>
                                        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter whitespace-nowrap text-left">
                                            {soul.age && spouse.age ? `${soul.age} & ${spouse.age} Yrs • ` : (soul.age || spouse.age) ? `${soul.age || spouse.age} Yrs • ` : ''}Won {wonAt ? format(wonAt, 'MMM d, yy') : 'Recently'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 sm:px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-300 text-left">
                            <div className="space-y-3 text-left">
                                <div className="flex items-center justify-between px-1 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">Parents</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                                    <Button 
                                        variant="outline" 
                                        className="justify-start h-14 gap-3 px-3 rounded-xl hover:bg-primary/5 border-dashed text-left"
                                        onClick={() => onSelectSoul(soul)}
                                    >
                                        <Avatar className="h-8 w-8 border shrink-0 text-left"><AvatarFallback className="font-bold bg-background text-left">{soul.firstName.charAt(0)}</AvatarFallback></Avatar>
                                        <div className="min-w-0 flex-1 text-left"><p className="font-bold text-xs truncate uppercase tracking-tight text-left">{name}</p></div>
                                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-30 text-left" />
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="justify-start h-14 gap-3 px-3 rounded-xl hover:bg-primary/5 border-dashed text-left"
                                        onClick={() => onSelectSoul(spouse)}
                                    >
                                        <Avatar className="h-8 w-8 border shrink-0 text-left"><AvatarFallback className="font-bold bg-background text-left">{spouse.firstName.charAt(0)}</AvatarFallback></Avatar>
                                        <div className="min-w-0 flex-1 text-left"><p className="font-bold text-xs truncate uppercase tracking-tight text-left">{spouseName}</p></div>
                                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-30 text-left" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3 text-left">
                                <div className="flex items-center justify-between px-1 text-left">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">Children ({children.length})</p>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 text-left"
                                            >
                                                <PlusCircle className="mr-1 h-3 w-3 text-left" /> ADD CHILD
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl shadow-xl w-48 text-left">
                                            <DropdownMenuItem className="text-xs font-bold text-left" onSelect={() => onAddChild([soul, spouse])}>
                                                Log New Record
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-xs font-bold text-left" onSelect={() => onLinkExistingChild([soul, spouse])}>
                                                Link Existing Soul
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="space-y-2 text-left">
                                    {children.map(child => (
                                        <Button 
                                            key={child.id}
                                            variant="ghost" 
                                            className="w-full justify-start h-14 gap-3 px-3 rounded-xl bg-muted/20 hover:bg-primary/5 text-left"
                                            onClick={() => onSelectSoul(child)}
                                        >
                                            <Avatar className="h-8 w-8 border shrink-0 text-left">
                                                <AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] text-left">{child.firstName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="font-bold text-xs truncate uppercase tracking-tight text-left">{child.firstName} {child.lastName}</p>
                                                <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60 text-left">{child.age ? `${child.age} Years` : 'Age N/A'}</p>
                                            </div>
                                            <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-30 text-left" />
                                        </Button>
                                    ))}
                                    {children.length === 0 && (
                                        <div className="py-8 text-center bg-muted/10 rounded-2xl border border-dashed text-left">
                                            <p className="text-[10px] text-muted-foreground italic text-left">No children linked to this unit.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            );
        }
        
        return (
          <Button 
            key={soul.id} 
            variant="ghost"
            onClick={() => onSelectSoul(soul)}
            className="flex items-center justify-between p-3 sm:p-4 h-auto rounded-[1.5rem] hover:bg-primary/5 transition-all border bg-card group w-full text-left active:scale-[0.98] shadow-sm relative overflow-hidden text-left"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 text-left">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border shadow-sm shrink-0 text-left">
                    <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs sm:text-sm text-left">
                        {soul.firstName?.charAt(0) || 'S'}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                        <p className="font-black text-[13px] sm:text-base uppercase tracking-tight truncate leading-tight text-left">
                            {name}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-left">
                        <Badge variant="secondary" className="h-4 px-1 text-[7px] sm:text-[8px] uppercase font-black tracking-widest bg-muted/50 border-none leading-none text-left">
                            {soul.status}
                        </Badge>
                        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter whitespace-nowrap text-left">
                            {soul.age ? `${soul.age} Yrs • ` : ''}Won {wonAt ? format(wonAt, 'MMM d, yy') : 'Recently'}
                        </span>
                    </div>
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0 ml-2 text-left" />
          </Button>
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
  
  const [selectedSoulId, setSelectedSoulId] = useState<string | null>(null);
  const [followUpSoulId, setFollowUpSoulId] = useState<string | null>(null);
  const [historySoulId, setHistorySoulId] = useState<string | null>(null);
  const [assignSoulId, setAssignSoulId] = useState<string | null>(null);
  const [editSoulId, setEditSoulId] = useState<string | null>(null);
  const [deleteSoulId, setDeleteSoulId] = useState<string | null>(null);
  const [assessmentSoulId, setAssessmentSoulId] = useState<string | null>(null);

  const [selectedFilterGroup, setSelectedFilterGroup] = useState<{ type: 'age' | 'gender' | 'marital' | 'compassion', value: string } | null>(null);
  const [childImportConfig, setChildImportConfig] = useState<{ lastName: string, location: any, parentIds: string[], parentNames: string[] } | null>(null);
  const [isLinkChildDialogOpen, setIsLinkChildDialogOpen] = useState(false);
  const [linkingParents, setLinkingParents] = useState<Soul[] | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
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
      setSelectedSoulId(soulIdFromUrl);
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
      notAssigned: { count: 0, list: [] as Soul[] },
      total: 0
    };
    if (!souls) return stats;

    const processedIds = new Set<string>();

    souls.forEach(s => {
      const status = s.maritalStatus;
      if (!status) {
          stats.notAssigned.count++;
          stats.notAssigned.list.push(s);
      } else if (status === 'Married') {
          if (!processedIds.has(s.id)) {
              const spouse = souls.find(other => {
                if (other.id === s.id || other.maritalStatus !== 'Married') return false;
                
                const otherFullName = `${other.firstName} ${other.lastName}`.toLowerCase();
                const sFullName = `${s.firstName} ${s.lastName}`.toLowerCase();
                const sSpouse = (s.spouseName || "").toLowerCase();
                const otherSpouse = (other.spouseName || "").toLowerCase();

                return (sSpouse.includes(other.firstName.toLowerCase()) || sSpouse.includes(otherFullName)) ||
                       (otherSpouse.includes(s.firstName.toLowerCase()) || otherSpouse.includes(sFullName));
              });

              if (spouse) {
                processedIds.add(spouse.id);
                stats.married.list.push({ ...s, spouseRecord: spouse });
              } else {
                stats.married.list.push(s);
              }
              
              processedIds.add(s.id);
              stats.married.count++;
          }
      } else if (status === 'Single') {
          stats.single.count++;
          stats.single.list.push(s);
      } else if (status === 'Divorced') {
          stats.divorced.count++;
          stats.divorced.list.push(s);
      } else if (status === 'Widowed') {
          stats.widowed.count++;
          stats.widowed.list.push(s);
      }
      stats.total++;
    });
    return stats;
  }, [souls]);

  const compassionStats = useMemo(() => {
    const stats = {
      orphans: { count: 0, list: [] as Soul[] },
      lessPrivileged: { count: 0, list: [] as Soul[] },
      wellToDo: { count: 0, list: [] as Soul[] },
      notAssigned: { count: 0, list: [] as Soul[] },
      needsSupport: { count: 0, list: [] as Soul[] },
      total: 0
    };
    if (!souls) return stats;

    souls.forEach(s => {
      let matched = false;
      const isVulnerableYouth = (s.age != null && s.age < 20 && s.workStatus === 'Unemployed');
      
      if (s.socialStatus === 'Orphan') {
          stats.orphans.count++;
          stats.orphans.list.push(s);
          matched = true;
      }
      
      if (s.socialStatus === 'Well-to-do') {
          stats.wellToDo.count++;
          stats.wellToDo.list.push(s);
          matched = true;
      }

      if (s.socialStatus === 'Less Privileged' || s.socialStatus === 'Homeless' || isVulnerableYouth) {
          stats.lessPrivileged.count++;
          stats.lessPrivileged.list.push(s);
          matched = true;
      }

      const hasAssessmentNeeds = s.needsAssessment && (
          s.needsAssessment.financialNeeds || 
          s.needsAssessment.physicalNeeds || 
          s.needsAssessment.emotionalNeeds || 
          s.needsAssessment.socialNeeds
      );
      if (hasAssessmentNeeds || isVulnerableYouth) {
          stats.needsSupport.count++;
          stats.needsSupport.list.push(s);
          matched = true;
      }

      if (!s.socialStatus || s.socialStatus === 'Normal') {
          stats.notAssigned.count++;
          stats.notAssigned.list.push(s);
          matched = true;
      }

      if (matched) stats.total++;
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
        if (groupKey === 'married') return maritalStats.married.list;
        if (groupKey === 'singles') return maritalStats.single.list;
        if (groupKey === 'divorced') return maritalStats.divorced.list;
        if (groupKey === 'widowers') return maritalStats.widowed.list;
        if (groupKey === 'not assigned') return maritalStats.notAssigned.list;
    } else if (type === 'compassion') {
        if (groupKey === 'orphans') return compassionStats.orphans.list;
        if (groupKey === 'less privileged') return compassionStats.lessPrivileged.list;
        if (groupKey === 'well-to-do') return compassionStats.wellToDo.list;
        if (groupKey === 'needs support') return compassionStats.needsSupport.list;
        if (groupKey === 'not assigned') return compassionStats.notAssigned.list;
    }
    return [];
  }, [selectedFilterGroup, ageGroups, genderStats, maritalStats, compassionStats]);

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

  const handleOpenFollowUp = useCallback((soul: Soul) => setFollowUpSoulId(soul.id), []);
  const handleOpenHistory = useCallback((soul: Soul) => setHistorySoulId(soul.id), []);
  const handleOpenAssign = useCallback((soul: Soul) => setAssignSoulId(soul.id), []);
  const handleOpenEdit = useCallback((soul: Soul) => setEditSoulId(soul.id), []);
  const handleOpenDelete = useCallback((soul: Soul) => setDeleteSoulId(soul.id), []);
  const handleOpenAssessment = useCallback((soul: Soul) => setAssessmentSoulId(soul.id), []);

  const handleAddChild = useCallback((parents: Soul[]) => {
      const parentIds = parents.map(p => p.id);
      const parentNames = parents.map(p => p.firstName);
      const lastName = parents[0].lastName;
      const location = parents[0].locationWon;
      
      setChildImportConfig({ lastName, location, parentIds, parentNames });
      setIsLogDialogOpen(true);
  }, []);

  const handleLinkExistingChildRequest = useCallback((parents: Soul[]) => {
      setLinkingParents(parents);
      setIsLinkChildDialogOpen(true);
  }, []);

  const handleLinkExistingChild = async (child: Soul) => {
      if (!user || !firestore || !linkingParents || linkingParents.length === 0) return;
      
      setIsUploading(true);
      const parentIds = linkingParents.map(p => p.id);
      const parentNames = linkingParents.map(p => p.firstName);
      
      const batch = writeBatch(firestore);
      const childRef = doc(firestore, `users/${user.uid}/souls`, child.id);
      const globalChildRef = doc(firestore, 'souls', child.id);

      batch.update(childRef, {
          parentIds: arrayUnion(...parentIds),
          parentNames: arrayUnion(...parentNames),
          relationship: 'Family' as SoulRelationship,
          updatedAt: serverTimestamp()
      });
      batch.update(globalChildRef, {
          parentIds: arrayUnion(...parentIds),
          parentNames: arrayUnion(...parentNames),
          relationship: 'Family' as SoulRelationship,
          updatedAt: serverTimestamp()
      });

      linkingParents.forEach(p => {
          const pRef = doc(firestore, `users/${user.uid}/souls`, p.id);
          const gpRef = doc(firestore, 'souls', p.id);
          batch.update(pRef, { childrenIds: arrayUnion(child.id) });
          batch.update(gpRef, { childrenIds: arrayUnion(child.id) });
      });

      try {
          await batch.commit();
          toast({ title: "Child Linked", description: `${child.firstName} is now linked to the household.` });
          setIsLinkChildDialogOpen(false);
          setLinkingParents(null);
      } catch (error) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'souls', operation: 'write' }, user));
      } finally {
          setIsUploading(false);
      }
  };

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

  const handleExportSingleSoul = useCallback(async (soul: Soul, formatType: 'csv' | 'pdf') => {
      const wonAt = safeToDate(soul.wonAt);
      const data = [
          ["First Name", soul.firstName],
          ["Last Name", soul.lastName || ''],
          ["Gender", soul.gender || 'N/A'],
          ["Status", soul.status],
          ["Date Won", wonAt ? format(wonAt, 'PPP') : 'N/A'],
          ["Source", soul.source],
          ["Phone", soul.phone || 'N/A'],
          ["Email", soul.email || 'N/A'],
          ["Home Church", soul.church || 'N/A'],
          ["Location", [soul.locationWon?.city, soul.locationWon?.country].filter(Boolean).join(', ') || 'N/A']
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
          docObj.text(`Full Record: ${soul.firstName} ${soul.lastName || ''}`, 14, 32);
          docObj.text(`Log Date: ${format(new Date(), 'PPP')}`, 196, 32, { align: 'right' });

          autoTable(docObj, {
              head: [["Attribute", "Information"]],
              body: data,
              startY: 38,
              theme: 'striped',
              headStyles: { fillColor: [249, 116, 22] },
              styles: { cellPadding: 5 }
          });
          
          docObj.save(`record-${soul.firstName.toLowerCase()}.pdf`);
      } else {
          const csv = Papa.unparse({ fields: ["Field", "Detail"], data });
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `record-${soul.firstName.toLowerCase()}.csv`);
          link.click();
          URL.revokeObjectURL(url);
      }
      toast({ title: "Record Exported" });
  }, [toast, getBase64Logo]);

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

  const handleAssignGroup = (soul: Soul, fellowshipId: string, groupType: 'Fellowship' | 'Association') => {
    if (!user || !firestore) return;

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
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
    return souls.filter(soul => 
      `${soul.firstName} ${soul.lastName}`.toLowerCase().includes(term) ||
      (soul.nickname && soul.nickname.toLowerCase().includes(term)) ||
      (soul.phone && soul.phone.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            <div className="lg:col-span-8 space-y-8 pb-32">
                <header className="px-4 sm:px-0 space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase">MY HARVEST</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-primary" /> Logged Records
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-12 px-4 sm:px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background flex-1 sm:flex-none">
                                        <Download className="mr-2 h-4 w-4" /> EXPORT
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-48 shadow-xl">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Select Format</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleExportHarvest('csv')} className="rounded-lg py-2.5">
                                        <Download className="mr-2 h-4 w-4 opacity-40" /> CSV (Excel)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleExportHarvest('pdf')} className="rounded-lg py-2.5">
                                        <Download className="mr-2 h-4 w-4 text-primary" /> PDF Report
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => { setChildImportConfig(null); setIsLogDialogOpen(true); }} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 flex-1 sm:flex-none">
                                <PlusCircle className="mr-2 h-4 w-4" /> ADD SOUL
                            </Button>
                        </div>
                    </div>
                </header>

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
                                                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-background shadow-xl cursor-pointer group active:scale-[0.98] transition-all">
                                                    <Image 
                                                        src={s.photoURL!} 
                                                        alt={s.firstName} 
                                                        fill 
                                                        className="object-cover transition-transform group-hover:scale-110 duration-500" 
                                                        unoptimized 
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                                    <div className="absolute bottom-3 left-3 right-3 text-white">
                                                        <p className="font-black text-[10px] sm:text-xs uppercase truncate tracking-tight">
                                                            {s.nickname || s.firstName} {s.age && <span className="opacity-60 ml-1">({s.age})</span>}
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

                <div className="px-4 sm:px-0 space-y-12">
                    {/* Age Demographics */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
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
                                                    "space-y-3 p-4 rounded-2xl bg-background shadow-sm border group transition-all cursor-pointer relative overflow-hidden",
                                                    "hover:border-primary/20"
                                                )}
                                                onClick={() => setSelectedFilterGroup({ type: 'age', value: group.label })}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="h-8 w-8 rounded-xl bg-muted/5 flex items-center justify-center transition-colors group-hover:bg-primary/10">
                                                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                                    </div>
                                                    <span className="font-black text-lg text-primary tracking-tighter">{group.count}</span>
                                                </div>
                                                <div className="space-y-1">
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

                    {/* Gender Demographics */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">GENDER BALANCE</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Kingdom Workforce Diversity</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Male', count: genderStats.male.count, color: 'bg-blue-600' },
                                        { label: 'Female', count: genderStats.female.count, color: 'bg-rose-500' },
                                        { label: 'Not Assigned', count: genderStats.unassigned.count, color: 'bg-slate-400' },
                                    ].map(stat => {
                                        const percent = genderStats.total > 0 ? (stat.count / genderStats.total) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-6 rounded-2xl bg-background shadow-sm border cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98]"
                                              onClick={() => setSelectedFilterGroup({ type: 'gender', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-baseline">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                                    <span className="text-2xl font-black text-primary tracking-tighter">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Progress value={percent} className="h-2 bg-muted" indicatorClassName={stat.color} />
                                                    <p className="text-right text-[9px] font-black text-muted-foreground/60 uppercase">{Math.round(percent)}% OF HARVEST</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Marital Demographics */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                                <Heart className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">MARITAL DEMOGRAPHICS</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Family & Status Insights</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Married', count: maritalStats.married.count, color: 'bg-emerald-500', icon: Target },
                                        { label: 'Singles', count: maritalStats.single.count, color: 'bg-primary', icon: Sparkles },
                                        { label: 'Divorced', count: maritalStats.divorced.count, color: 'bg-slate-500', icon: HelpCircle },
                                        { label: 'Widowers', count: maritalStats.widowed.count, color: 'bg-indigo-600', icon: Award },
                                        { label: 'Not Assigned', count: maritalStats.notAssigned.count, color: 'bg-slate-400', icon: CircleAlert },
                                    ].map(stat => {
                                        const percent = totalSoulsCount > 0 ? (stat.count / totalSoulsCount) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-5 rounded-2xl bg-background shadow-sm border cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98]"
                                              onClick={() => setSelectedFilterGroup({ type: 'marital', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                                    <span className="text-xl font-black text-primary tracking-tighter">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Progress value={percent} className="h-1.5 bg-muted" indicatorClassName={stat.color} />
                                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase">{Math.round(percent)}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kingdom Compassion Demographics */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
                                <HandHeart className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">KINGDOM COMPASSION</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Social Standing & Support Insights</p>
                            </div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Orphans', count: compassionStats.orphans.count, color: 'bg-orange-500', icon: Heart },
                                        { label: 'Less Privileged', count: compassionStats.lessPrivileged.count, color: 'bg-emerald-600', icon: ShieldCheck },
                                        { label: 'Well-to-do', count: compassionStats.wellToDo.count, color: 'bg-blue-500', icon: Target },
                                        { label: 'Needs Support', count: compassionStats.needsSupport.count, color: 'bg-rose-500', icon: Zap },
                                        { label: 'Not Assigned', count: compassionStats.notAssigned.count, color: 'bg-slate-400', icon: CircleAlert },
                                    ].map(stat => {
                                        const percent = totalSoulsCount > 0 ? (stat.count / totalSoulsCount) * 100 : 0;
                                        return (
                                            <div 
                                              key={stat.label} 
                                              className="space-y-3 p-5 rounded-2xl bg-background shadow-sm border cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98]"
                                              onClick={() => setSelectedFilterGroup({ type: 'compassion', value: stat.label })}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                                                    <span className="text-xl font-black text-primary tracking-tighter">{stat.count}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Progress value={percent} className="h-1.5 bg-muted" indicatorClassName={stat.color} />
                                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase">{Math.round(percent)}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="px-4 sm:px-0 text-left text-left text-left">
                    <RelationshipCircleTracker 
                        souls={souls || []}
                        campaigns={campaigns || []}
                        fellowships={fellowships || []}
                        className="rounded-3xl"
                    />
                </div>

                <div className="-mx-4 sm:mx-0 text-left text-left text-left">
                    <SoulsWonTable 
                        souls={filteredSouls || []} 
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
                    />
                </div>
            </div>

            <div className="lg:col-span-4 text-left text-left text-left">
                <FeedSidebar mode="harvest" />
            </div>
        </div>

        {mounted && (
            isMobile ? (
                <Sheet open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                        <div className="p-4 sm:p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left text-left text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left">Harvest Demographic</span>
                            </div>
                            <SheetHeader className="text-left flex-shrink-0 text-left text-left text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight text-left text-left text-left">{selectedFilterGroup?.value} Directory</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left text-left text-left">Converts within the {selectedFilterGroup?.value?.toLowerCase()} demographic.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left text-left text-left">
                            <div className="p-4 sm:p-8 text-left text-left text-left">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(soul) => {
                                    setSelectedFilterGroup(null);
                                    setSelectedSoulId(soul.id);
                                  }} 
                                  onAddChild={handleAddChild}
                                  onLinkExistingChild={handleLinkExistingChildRequest}
                                  isUploading={isUploading}
                                />
                            </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left">
                        <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left">
                            <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left text-left text-left text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left" />
                            </div>
                            <DialogHeader className="text-left text-left text-left text-left">
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">{selectedFilterGroup?.value} Directory</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-left text-left text-left text-left">Viewing all souls within this demographic group.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="max-h-[60vh] text-left text-left text-left text-left">
                            <div className="p-4 sm:p-8 text-left text-left text-left text-left">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(soul) => {
                                    setSelectedFilterGroup(null);
                                    setSelectedSoulId(soul.id);
                                  }} 
                                  onAddChild={handleAddChild}
                                  onLinkExistingChild={handleLinkExistingChildRequest}
                                  isUploading={isUploading}
                                />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        <Dialog open={isLinkChildDialogOpen} onOpenChange={setIsLinkChildDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left">
                <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left">
                    <DialogHeader className="text-left text-left text-left text-left text-left text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase text-left text-left text-left text-left">Link Existing Soul</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left text-left">Select an existing soul to add as a child to the selected parents.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="p-6 text-left text-left text-left text-left text-left">
                    <ScrollArea className="h-80 text-left text-left text-left text-left">
                        <div className="space-y-2 text-left text-left text-left text-left">
                            {souls?.filter(s => !s.parentIds?.length && !linkingParents?.some(p => p.id === s.id)).map(s => (
                                <Button 
                                    key={s.id} 
                                    variant="ghost" 
                                    className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group text-left text-left text-left text-left"
                                    onClick={() => handleLinkExistingChild(s)}
                                    disabled={isUploading}
                                >
                                    <Avatar className="h-8 w-8 border shrink-0 text-left text-left text-left text-left"><AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] text-center flex items-center justify-center w-full h-full text-left text-left text-left text-left">{s.firstName.charAt(0)}</AvatarFallback></Avatar>
                                    <span className="font-bold text-sm truncate uppercase tracking-tight text-left text-left text-left text-left">{s.firstName} {s.lastName}</span>
                                </Button>
                            ))}
                            {souls?.filter(s => !s.parentIds?.length && !linkingParents?.some(p => p.id === s.id)).length === 0 && (
                                <p className="text-center text-xs text-muted-foreground py-12 text-left text-left text-left">No available unlinked souls found.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>

        <LogFollowUpDialog 
            soul={soulForFollowUp} 
            isOpen={!!followUpSoulId} 
            onOpenChange={(isOpen) => !isOpen && setFollowUpSoulId(null)} 
            onFollowUpLogged={() => setFollowUpSoulId(null)} 
        />
        <ViewHistoryDialog soul={soulForHistory} isOpen={!!historySoulId} onOpenChange={(isOpen) => !isOpen && setHistorySoulId(null)} />
        <AssignFellowshipDialog soul={soulToAssign} fellowships={fellowships || []} isOpen={!!assignSoulId} onOpenChange={(isOpen) => !isOpen && setAssignSoulId(null)} onAssignGroup={handleAssignGroup} />
        <SoulAssessmentDialog soul={soulToAssess} isOpen={!!assessmentSoulId} onOpenChange={(isOpen) => !isOpen && setAssessmentSoulId(null)} />

        <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => !open && setDeleteSoulId(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left text-left text-left">
                <AlertDialogHeader className="text-left text-left text-left text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline leading-tight text-left text-left text-left text-left">Delete Record?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left text-left text-left text-left">
                        This will permanently remove the record from your Kingdom journal. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold text-left text-left text-left text-left">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left text-left text-left text-left">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left text-left text-left" />}
                        Confirm Removal
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {mounted && (
            isMobile ? (
                <>
                    <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                                <SheetHeader className="text-left text-left text-left text-left"><SheetTitle className="text-2xl font-black font-headline text-left text-left text-left text-left">Add New Soul</SheetTitle><SheetDescription className="text-sm text-left text-left text-left">Record a new life won for Christ.</SheetDescription></SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left text-left text-left text-left">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogDialogOpen(false); setChildImportConfig(null); }} 
                                    fellowships={fellowships || []} 
                                    campaigns={campaigns || []}
                                    defaultLastName={childImportConfig?.lastName}
                                    defaultLocation={childImportConfig?.location}
                                    defaultParentIds={childImportConfig?.parentIds}
                                    defaultParentNames={childImportConfig?.parentNames}
                                    defaultRelationship={childImportConfig ? 'Family' : undefined}
                                />
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <Sheet open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left">
                                <SheetHeader className="text-left text-left text-left text-left text-left"><SheetTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left">Edit Record</SheetTitle><SheetDescription className="text-sm text-left text-left text-left text-left">Update soul identity and mission details.</SheetDescription></SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left text-left text-left text-left">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </>
            ) : (
                <>
                    <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                                <DialogHeader className="text-left text-left text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left">Add New Soul</DialogTitle>
                                    <DialogDescription className="text-left text-left text-left text-left">Record a new life won for Christ.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left text-left text-left text-left">
                                <LogSoulForm 
                                    onSoulLogged={() => { setIsLogDialogOpen(false); setChildImportConfig(null); }} 
                                    fellowships={fellowships || []} 
                                    campaigns={campaigns || []}
                                    defaultLastName={childImportConfig?.lastName}
                                    defaultLocation={childImportConfig?.location}
                                    defaultParentIds={childImportConfig?.parentIds}
                                    defaultParentNames={childImportConfig?.parentNames}
                                    defaultRelationship={childImportConfig ? 'Family' : undefined}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left text-left">
                                <DialogHeader className="text-left text-left text-left text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline text-left text-left text-left text-left text-left text-left">Edit Record</DialogTitle>
                                    <DialogDescription className="text-left text-left text-left text-left text-left">Update soul identity and mission details.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left text-left text-left text-left text-left">
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
