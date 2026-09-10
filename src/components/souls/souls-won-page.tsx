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

    const headers = ["First Name", "Last Name", "Gender", "Age", "Status", "Won At", "Source", "Phone", "Email", "City", "Church", "Marital", "Social"];
    const body = souls.map(s => [
        s.firstName,
        s.lastName || '',
        s.gender || 'N/A',
        s.age ? String(s.age) : 'N/A',
        s.status,
        s.wonAt ? format(s.wonAt.toDate(), 'yyyy-MM-dd') : 'N/A',
        s.source,
        s.phone || 'N/A',
        s.email || 'N/A',
        s.locationWon?.city || 'N/A',
        s.church || 'N/A',
        s.maritalStatus || 'N/A',
        s.socialStatus || 'Normal'
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
      const dob = safeToDate(soul.dateOfBirth);
      const marriageDate = safeToDate(soul.marriageDate);
      
      const data = [
          ["Category", "Detail"],
          ["Basic Identity", ""],
          ["First Name", soul.firstName],
          ["Last Name", soul.lastName || ''],
          ["Nickname", soul.nickname || 'N/A'],
          ["Gender", soul.gender || 'N/A'],
          ["Age", soul.age ? `${soul.age} Years` : 'N/A'],
          ["Date of Birth", dob ? format(dob, 'PPP') : 'N/A'],
          ["Nationality", soul.nationality || 'N/A'],
          ["", ""],
          ["Life Context", ""],
          ["Marital Status", soul.maritalStatus || 'N/A'],
          ["Spouse Name", soul.spouseName || 'N/A'],
          ["Marriage Date", marriageDate ? format(marriageDate, 'PPP') : 'N/A'],
          ["Work Status", soul.workStatus || 'N/A'],
          ["Social Standing", soul.socialStatus || 'Normal'],
          ["Relationship to Mobilizer", soul.relationship || 'N/A'],
          ["Hobbies", soul.hobbies || 'N/A'],
          ["", ""],
          ["Harvest Data", ""],
          ["Spiritual Status", soul.status],
          ["Date Won", wonAt ? format(wonAt, 'PPP') : 'N/A'],
          ["Source", soul.source],
          ["Campaign/Source Detail", soul.sourceDetails || 'N/A'],
          ["Home Church", soul.church || 'N/A'],
          ["Attending Church", soul.attendingChurch ? "Yes" : "No"],
          ["In Bible Study", soul.inBibleStudy ? "Yes" : "No"],
          ["Attending Prayer", soul.attendingPrayer ? "Yes" : "No"],
          ["In Service Unit", soul.inServiceDepartment ? "Yes" : "No"],
          ["", ""],
          ["Contact & Logistics", ""],
          ["Phone", soul.phone || 'N/A'],
          ["Email", soul.email || 'N/A'],
          ["Street Address", soul.locationWon?.street || 'N/A'],
          ["Landmark", soul.locationWon?.landmark || 'N/A'],
          ["City", soul.locationWon?.city || 'N/A'],
          ["State", soul.locationWon?.state || 'N/A'],
          ["Country", soul.locationWon?.country || 'N/A'],
          ["History Privacy", soul.isHistoryPrivate ? "Locked (Private)" : "Public"],
          ["", ""],
          ["Needs Assessment", ""],
          ["General Impression", soul.needsAssessment?.generalImpression || 'N/A'],
          ["Follow-up Strategy", soul.needsAssessment?.followUpPlan || 'N/A'],
          ["Emotional Needs", soul.needsAssessment?.emotionalNeeds || 'N/A'],
          ["Physical Needs", soul.needsAssessment?.physicalNeeds || 'N/A'],
          ["Financial Needs", soul.needsAssessment?.financialNeeds || 'N/A'],
          ["Social Needs", soul.needsAssessment?.socialNeeds || 'N/A'],
          ["Other Needs", soul.needsAssessment?.otherNeeds || 'N/A'],
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
              body: data.slice(1), // Exclude custom header row as autoTable handles its own head
              startY: 38,
              theme: 'striped',
              headStyles: { fillColor: [249, 116, 22] },
              styles: { cellPadding: 5, fontSize: 9 }
          });
          
          docObj.save(`record-${soul.firstName.toLowerCase()}.pdf`);
      } else {
          const csv = Papa.unparse({ fields: ["Category", "Detail"], data: data });
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
                                            <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                                                <DialogHeader className="sr-only"><DialogTitle>Soul Photo</DialogTitle></DialogHeader>
                                                <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                                                    <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center">
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

                <div className="px-4 sm:px-0 text-left">
                    <RelationshipCircleTracker 
                        souls={souls || []}
                        campaigns={campaigns || []}
                        fellowships={fellowships || []}
                        className="rounded-3xl"
                    />
                </div>

                <div className="-mx-4 sm:mx-0 text-left">
                    <SoulsWonTable 
                        souls={filteredSouls || []} 
                        loading={loading}
                        selectedSoulId={selectedSoulId}
                        setSelectedSoulId={setSelectedSoulId}
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

            <div className="lg:col-span-4 text-left">
                <FeedSidebar mode="harvest" />
            </div>
        </div>

        {mounted && (
            isMobile ? (
                <Sheet open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-4 sm:p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Harvest Demographic</span>
                            </div>
                            <SheetHeader className="text-left flex-shrink-0 text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase leading-tight text-left">{selectedFilterGroup?.value} Directory</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left">Converts within the {selectedFilterGroup?.value?.toLowerCase()} demographic.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left">
                            <div className="p-4 sm:p-8 text-left">
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
                    <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                        <div className="p-8 border-b bg-muted/10 text-left">
                            <div className="flex items-center gap-2 mb-2 text-left">
                                <BarChart3 className="h-4 w-4 text-primary text-left" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left" />
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
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                <div className="p-8 border-b bg-muted/10 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase text-left">Link Existing Soul</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">Select an existing soul to add as a child to the selected parents.</DialogDescription>
                    </DialogHeader>
                </div>
                <div className="p-6 text-left">
                    <ScrollArea className="h-80 text-left">
                        <div className="space-y-2 text-left">
                            {souls?.filter(s => !s.parentIds?.length && !linkingParents?.some(p => p.id === s.id)).map(s => (
                                <Button 
                                    key={s.id} 
                                    variant="ghost" 
                                    className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group text-left"
                                    onClick={() => handleLinkExistingChild(s)}
                                    disabled={isUploading}
                                >
                                    <Avatar className="h-8 w-8 border shrink-0 text-left"><AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] text-center flex items-center justify-center w-full h-full text-left">{s.firstName.charAt(0)}</AvatarFallback></Avatar>
                                    <span className="font-bold text-sm uppercase tracking-tight text-left">{s.firstName} {s.lastName}</span>
                                </Button>
                            ))}
                            {souls?.filter(s => !s.parentIds?.length && !linkingParents?.some(p => p.id === s.id)).length === 0 && (
                                <p className="text-center text-xs text-muted-foreground py-12 text-left">No available unlinked souls found.</p>
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
                    <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <SheetHeader className="text-left"><SheetTitle className="text-2xl font-black font-headline text-left">Add New Soul</SheetTitle><SheetDescription className="text-sm text-left">Record a new life won for Christ.</SheetDescription></SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left">
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
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <SheetHeader className="text-left"><SheetTitle className="text-2xl font-black font-headline text-left">Edit Record</SheetTitle><SheetDescription className="text-sm text-left">Update soul identity and mission details.</SheetDescription></SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow p-8 text-left">
                                {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </>
            ) : (
                <>
                    <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <DialogHeader className="text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline text-left">Add New Soul</DialogTitle>
                                    <DialogDescription className="text-left text-left">Record a new life won for Christ.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8 text-left">
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
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <DialogHeader className="text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline text-left">Edit Record</DialogTitle>
                                    <DialogDescription className="text-left text-left">Update soul identity and mission details.</DialogDescription>
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

```
- src/components/souls/souls-won-table.tsx:
```tsx
'use client';

import * as React from "react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format, differenceInMinutes, isSameDay } from "date-fns";
import { 
  MoreHorizontal, 
  Church, 
  MapPin, 
  Phone, 
  Download, 
  HeartHandshake, 
  Edit, 
  Trash2, 
  Users, 
  History, 
  Heart, 
  Sparkles,
  ArrowRight,
  ClipboardList,
  Zap, 
  ShieldCheck, 
  Target, 
  Mail, 
  ArrowLeft, 
  BookOpen, 
  X, 
  Utensils, 
  Home, 
  Gift, 
  Calendar, 
  Send, 
  Share2,
  MessageSquare, 
  Loader2, 
  PlusCircle, 
  BookMarked,
  Check,
  ChevronDown,
  Search,
  XCircle,
  Award,
  Newspaper,
  ImageIcon,
  PlayCircle,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import type { Soul, FollowUpStatus, UserProfile, Chat, BibleChapterOutput, MealGiftStatus } from "@/lib/types";
import { useUser, useDoc, useUserProfile, useCollection, useFirestore } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  setDoc, 
  serverTimestamp, 
  addDoc, 
  getDoc, 
  getDocs, 
  where,
  writeBatch
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, safeToDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { actionItems, prayerTemplates, kingdomVerses } from "@/lib/follow-up-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MutualConnectBadge } from "./mutual-connect-badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
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
import { getBibleChapter } from "@/ai/flows/get-bible-chapter-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { bibleData } from "@/lib/bible-data";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const iconMap: Record<string, any> = {
    'prayed_together': Sparkles,
    'studied_bible': BookOpen,
    'shared_meal': Utensils,
    'visited_home': Home,
    'introduced_friend': Users,
    'gave_gift': Gift,
    'phone_call': Phone,
    'text_message': MessageSquare,
    'helped_with_need': Heart,
    'invited_to_event': Calendar,
};

const getStatusClasses = (status: FollowUpStatus | undefined): string => {
    if (!status) return 'bg-secondary text-secondary-foreground border-border';
    switch (status) {
        case 'New':
            return 'bg-[hsl(var(--status-new)/0.1)] text-[hsl(var(--status-new))] border-[hsl(var(--status-new)/0.2)]';
        case 'Contacted':
            return 'bg-[hsl(var(--status-contacted)/0.1)] text-[hsl(var(--status-contacted))] border-[hsl(var(--status-contacted)/0.2)]';
        case 'Established':
            return 'bg-[hsl(var(--status-established)/0.1)] text-[hsl(var(--status-established))] border-[hsl(var(--status-established)/0.2)]';
        default:
            return 'bg-secondary text-secondary-foreground border-border';
    }
}

const getSoulAddress = (soul: Soul) => {
  const loc = soul.locationWon;
  if (!loc) return '';
  return [loc.street, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
};

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function ShareWordDialog({ 
  isOpen, 
  onOpenChange, 
  soul, 
  onSelectVerse 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  onSelectVerse: (verse: string) => void;
}) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'hub' | 'books' | 'chapters' | 'verses'>('hub');
  const [bibleSearch, setBibleSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{reference: string, text: string}[]>([]);
  
  const [selectedBookName, setSelectedBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterContent, setChapterContent] = useState<BibleChapterOutput | null>(null);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setView('hub');
      setBibleSearch('');
      setSearchResults([]);
      setSelectedBookName(null);
      setSelectedChapter(null);
      setChapterContent(null);
      setSelectedVerses([]);
    }
  }, [isOpen]);

  const constructInvitationMessage = useCallback((verseText: string, reference: string, link: string) => {
    return `"${verseText.trim()}" — ${reference}\n\nJoin the harvest at Testify! Share your miracles, win souls for Christ, and glorify God. Visit: ${window.location.origin}/bible`;
  }, []);

  const handleSearch = async () => {
      if (!bibleSearch.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch)}`);
          if (res.ok) {
              const data = await res.json();
              if (data.verses) {
                  setSearchResults([{ 
                      reference: data.reference, 
                      text: data.text 
                  }]);
              }
          }
      } catch (e) {
          console.warn("Bible search failed", e);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSelectBook = (bookName: string) => {
    setSelectedBookName(bookName);
    setView('chapters');
  };

  const handleSelectChapter = async (num: number) => {
    if (!selectedBookName) return;
    setSelectedChapter(num);
    setLoadingVerses(true);
    try {
      const content = await getBibleChapter({ book: selectedBookName, chapter: num });
      setChapterContent(content);
      setView('verses');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVerses(false);
    }
  };

  const toggleVerse = (num: number) => {
    setSelectedVerses(prev => prev.includes(num) ? prev.filter(v => v !== num) : [...prev, num].sort((a,b) => a-b));
  };

  const handleShareSelected = () => {
    if (!chapterContent || selectedVerses.length === 0) return;
    
    const selectedTexts = chapterContent.verses
      .filter(v => selectedVerses.includes(v.verse))
      .map(v => v.text)
      .join(' ');
      
    const reference = `${chapterContent.book} ${chapterContent.chapter}:${selectedVerses.join(', ')}`;
    const link = `${window.location.origin}/dashboard/bible?book=${encodeURIComponent(chapterContent.book)}&chapter=${chapterContent.chapter}`;
    
    onSelectVerse(constructInvitationMessage(selectedTexts, reference, link));
  };

  const renderHub = (
    <div className="space-y-8 sm:space-y-10 text-left">
      <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground opacity-50" />
            <Input 
                placeholder="Search Bible (e.g. John 3:16)..." 
                value={bibleSearch}
                onChange={e => setBibleSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-10 sm:h-14 pl-10 sm:pl-14 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-xs sm:text-lg"
            />
            <Button 
                onClick={handleSearch} 
                disabled={isSearching || !bibleSearch.trim()}
                variant="ghost"
                size="sm"
                className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 h-7 sm:h-10 px-3 sm:px-6 rounded-xl font-black text-[9px] sm:text-xs uppercase text-primary"
            >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'SEARCH'}
            </Button>
        </div>

        {searchResults.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2">
                {searchResults.map((res, idx) => (
                    <Button 
                        key={idx}
                        variant="outline"
                        className="w-full h-auto p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-primary/20 bg-primary/5 flex flex-col items-start gap-3 text-left hover:bg-primary/10 transition-all border-2 border-dashed"
                        onClick={() => onSelectVerse(constructInvitationMessage(res.text, res.reference, `${window.location.origin}/dashboard/bible`))}
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="font-black text-[9px] sm:text-xs uppercase tracking-widest text-primary">{res.reference}</span>
                            <Send className="h-3.5 w-3.5 sm:h-4 w-4 text-primary opacity-40" />
                        </div>
                        <p className="text-xs sm:text-base text-muted-foreground leading-relaxed italic line-clamp-4">"{res.text.trim()}"</p>
                    </Button>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Button onClick={() => setView('books')} variant="outline" className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4 text-left">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-center">Browse Bible</span>
        </Button>
        <Button variant="outline" asChild className="h-24 sm:h-32 rounded-2xl sm:rounded-[2rem] gap-2 sm:gap-3 border-2 border-primary/20 text-primary hover:bg-primary/5 group transition-all flex flex-col items-center justify-center p-4 text-left">
            <Link href="/dashboard/bible" className="flex flex-col items-center justify-center">
                <BookMarked className="h-6 w-6 sm:h-8 sm:w-8 mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest text-center">Open Reader</span>
            </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Kingdom Essential Scriptures</Label>
            <Badge variant="outline" className="h-5 px-2 text-[8px] font-bold text-primary border-primary/20 bg-primary/5 uppercase">Top Weapons</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {kingdomVerses.map((v, idx) => (
            <Button 
              key={idx} 
              variant="ghost" 
              className="w-full justify-start h-auto py-4 sm:py-6 px-4 sm:px-6 rounded-2xl sm:rounded-[2rem] hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left block relative overflow-hidden bg-muted/5 shadow-sm"
              onClick={() => onSelectVerse(constructInvitationMessage(v.text, v.reference, `${window.location.origin}/dashboard/bible`))}
            >
              <div className="flex items-center justify-between w-full mb-1.5 text-left">
                  <span className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-primary">{v.reference}</span>
                  <PlusCircle className="h-3.5 w-3.5 sm:h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic line-clamp-2 text-left">{v.text}</p>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBooks = (
    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
      {bibleData.map(book => (
        <Button key={book.name} variant="outline" className="h-12 sm:h-14 rounded-xl font-bold uppercase text-[9px] sm:text-xs text-left" onClick={() => handleSelectBook(book.name)}>
          {book.name}
        </Button>
      ))}
    </div>
  );

  const renderChapters = (
    <div className="p-2 grid grid-cols-5 sm:grid-cols-8 gap-2 text-left">
       {selectedBookName && bibleData.find(b => b.name === selectedBookName)?.chapters.map(ch => (
         <Button key={ch.chapter} variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg font-black text-xs sm:text-sm text-left" onClick={() => handleSelectChapter(ch.chapter)}>
           {ch.chapter}
         </Button>
       ))}
    </div>
  );

  const renderVerses = (
    <div className="space-y-4 pb-12 text-left">
       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6 text-left">
          <p className="text-[10px] font-black uppercase text-primary mb-1 text-left">SELECTED FOR SHARING</p>
          <p className="text-xs font-bold text-muted-foreground text-left">
            {selectedBookName} {selectedChapter}:{selectedVerses.join(', ')}
          </p>
       </div>
       <div className="space-y-1 font-serif text-left">
         {loadingVerses ? (
           <div className="flex justify-center py-20 text-left"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 text-left" /></div>
         ) : chapterContent?.verses.map(v => (
           <div 
             key={v.verse} 
             className={cn(
               "p-3 rounded-xl transition-all cursor-pointer border-2 text-left",
               selectedVerses.includes(v.verse) ? "bg-primary/10 border-primary/40" : "bg-transparent border-transparent hover:bg-muted/50"
             )}
             onClick={() => toggleVerse(v.verse)}
            >
              <sup className="text-[10px] font-black mr-2 opacity-40 text-left">{v.verse}</sup>
              <span className="text-sm leading-relaxed text-left">{v.text}</span>
           </div>
         ))}
       </div>
    </div>
  );

  const titleStr = view === 'hub' ? "Share the Word" : view === 'books' ? "Select Book" : view === 'chapters' ? `${selectedBookName}: Select Chapter` : `${selectedBookName} ${selectedChapter}`;
  const descStr = view === 'hub' ? `Equip ${soul?.firstName} with the living Word.` : `Browsing ${selectedBookName || 'Bible'} for the harvest.`;

  const header = (
    <div className="p-6 sm:p-8 border-b bg-muted/10 shrink-0 text-left">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-3 mb-2 text-left">
            {view !== 'hub' && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -ml-2" onClick={() => setView(view === 'verses' ? 'chapters' : view === 'chapters' ? 'books' : 'hub')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            )}
            <Target className="h-5 w-5 text-primary text-left" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Kingdom Study</span>
          </div>
          <DialogHeader className="text-left text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left">{titleStr}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-left text-left">{descStr}</DialogDescription>
          </DialogHeader>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>
    </div>
  );

  const body = (
    <ScrollArea className="flex-grow min-h-[300px] text-left">
        <div className="p-4 sm:p-10 text-left">
            {view === 'hub' && renderHub}
            {view === 'books' && renderBooks}
            {view === 'chapters' && renderChapters}
            {view === 'verses' && renderVerses}
        </div>
    </ScrollArea>
  );

  const footer = view === 'verses' && (
    <div className="p-6 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 text-left">
        <Button variant="outline" onClick={() => setSelectedVerses([])} className="rounded-xl h-12 flex-1 font-bold text-left">Clear Selection</Button>
        <Button 
          onClick={handleShareSelected} 
          disabled={selectedVerses.length === 0}
          className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 text-left"
        >
          PREPARE SHARE ({selectedVerses.length})
        </Button>
    </div>
  );

  if (isMobile) {
      return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                  {header}
                  {body}
                  {footer}
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col text-left">
        {header}
        {body}
        {footer || (
            <div className="p-6 border-t bg-muted/5 flex justify-end shrink-0 text-left">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-xs text-left">Close Hub</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PrivateHangoutBuilder({ 
  isOpen, 
  onOpenChange, 
  soul, 
  userProfile,
  allSouls,
  onCreate 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  soul: Soul | null; 
  userProfile: UserProfile | null;
  allSouls: Soul[];
  onCreate: (targetSoul: Soul, details: { date: string; time: string; location: string }) => Promise<void>;
}) {
    const [thirdSoul, setThirdSoul] = useState<Soul | null>(null);
    const [search, setSearch] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [time, setTime] = useState('14:00');
    const [location, setLocation] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const isMobile = useIsMobile();

    const oppositeGender = useMemo(() => soul?.gender === 'Male' ? 'Female' : 'Male', [soul?.gender]);

    const filteredPotentials = useMemo(() => {
        const list = allSouls.filter(s => 
            s.id !== soul?.id && 
            (s.maritalStatus === 'Single' || s.maritalStatus === 'Widowed') &&
            s.gender === oppositeGender &&
            (s.age != null && s.age >= 18) // Matchmaking restricted to adults
        );
        if (!search) return list;
        const term = search.toLowerCase();
        return list.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
    }, [allSouls, soul, search, oppositeGender]);

    const handleCreate = async () => {
        if (!thirdSoul || !location.trim()) return;
        setIsCreating(true);
        await onCreate(thirdSoul, { date, time, location });
        setIsCreating(false);
        onOpenChange(false);
    };

    const step1 = (
        <div className="space-y-6 text-left">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Step 1: Pick a Kingdom Match (Single/Widowed {oppositeGender}s)</Label>
                <div className="relative text-left">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left" />
                    <Input placeholder={`Search single ${oppositeGender.toLowerCase()} souls...`} value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-left" />
                </div>
            </div>
            <ScrollArea className={cn("border rounded-2xl bg-muted/5 text-left", isMobile ? "h-[40vh]" : "h-[30vh]")}>
                <div className="p-2 space-y-1.5 text-left">
                    {filteredPotentials.map(s => (
                        <Button 
                            key={s.id} 
                            variant="ghost" 
                            className={cn(
                                "w-full justify-start h-14 rounded-xl gap-4 transition-all text-left",
                                thirdSoul?.id === s.id ? "bg-primary/10 border-primary/20 border shadow-inner" : "hover:bg-primary/5"
                            )}
                            onClick={() => setThirdSoul(s)}
                        >
                            <Avatar className="h-8 w-8 border shrink-0 text-left">
                                <AvatarFallback className="font-black bg-primary/10 text-primary text-center flex items-center justify-center w-full h-full text-[10px] text-left">{s.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 text-left">
                                <p className="font-black text-sm uppercase tracking-tight truncate text-left">{s.firstName} {s.lastName}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase text-left">{s.gender} • {s.age || 'Age N/A'}</p>
                            </div>
                            {thirdSoul?.id === s.id && <CheckCircle2 className="h-4 w-4 text-primary text-left" />}
                        </Button>
                    ))}
                    {filteredPotentials.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground italic text-xs px-6 text-left">
                            No other single {oppositeGender.toLowerCase()} souls found in your harvest list.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    const step2 = (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
            <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Date</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none font-bold text-left" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Time</Label>
                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none font-bold text-left" />
                </div>
            </div>
            <div className="space-y-2 text-left text-left text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Meeting Venue</Label>
                <Input placeholder="e.g., Kingdom Cafe, Central Park" value={location} onChange={e => setLocation(e.target.value)} className="h-11 rounded-xl bg-muted/20 border-none shadow-inner text-left" />
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 text-left">
                <div className="flex items-center gap-2 mb-2 text-left">
                    <Sparkles className="h-3.5 w-3.5 text-primary text-left" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest text-left">Invitation Logic</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left">This will not create a public event. It will prepare an invitation for you to share directly with both participants.</p>
            </div>
        </div>
    );

    const header = (
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center gap-2 mb-2 text-left">
                <Heart className="h-5 w-5 text-primary fill-current text-left" />
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">Private Matchmaking</span>
            </div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase text-left">Coordinate Connection</DialogTitle>
                <DialogDescription className="text-sm font-medium text-left">Draft a warm invitation for {soul?.firstName} and another soul to meet.</DialogDescription>
            </DialogHeader>
        </div>
    );

    const body = (
        <div className="p-8 space-y-10 text-left">
            {step1}
            {thirdSoul && step2}
        </div>
    );

    const footer = (
        <div className="p-8 border-t bg-muted/5 flex flex-col sm:flex-row gap-3 shrink-0 text-left">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-12 flex-1 font-bold text-left">Cancel</Button>
            <Button 
                onClick={handleCreate} 
                disabled={!thirdSoul || !location.trim() || isCreating}
                className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left"
            >
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <Send className="mr-2 h-4 w-4 text-left" />}
                PREPARE INVITATION
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    {header}
                    <ScrollArea className="flex-grow text-left">{body}</ScrollArea>
                    {footer}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
                {header}
                <ScrollArea className="flex-grow text-left">{body}</ScrollArea>
                {footer}
            </DialogContent>
        </Dialog>
    );
}

function SoulProfileContent({ 
  soul, 
  allSouls,
  onFollowUp,
  onViewHistory,
  onEdit,
  onAssess,
  onOpenAssignDialog,
  onExportSingle,
  onDelete
}: { 
  soul: Soul; 
  allSouls: Soul[];
  onFollowUp: (s: Soul) => void;
  onViewHistory: (s: Soul) => void;
  onEdit: (s: Soul) => void;
  onAssess: (s: Soul) => void;
  onOpenAssignDialog: (s: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onDelete: (s: Soul) => void;
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { userProfile: currentUserProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [isCommChannelDialogOpen, setIsCommChannelDialogOpen] = React.useState(false);
  const [isHelpNeedDialogOpen, setIsHelpNeedDialogOpen] = React.useState(false);
  const [isShareTargetDialogOpen, setIsShareTargetDialogOpen] = React.useState(false);
  const [isPartnerSelectionDialogOpen, setIsPartnerSelectionDialogOpen] = React.useState(false);
  const [isPrayerCustomizationOpen, setIsPrayerCustomizationOpen] = React.useState(false);
  const [isStudyWordOpen, setIsStudyWordOpen] = React.useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = React.useState(false);
  const [isPrivateHangoutOpen, setIsPrivateHangoutOpen] = React.useState(false);
  const [customMessageText, setCustomMessageText] = React.useState('');
  const [clickedActionId, setClickedActionId] = React.useState<string | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = React.useState(false);
  const [suitorTarget, setSuitorTarget] = React.useState<Soul | null>(null);

  const address = getSoulAddress(soul);
  const needs = soul.needsAssessment;

  const oppositeGender = useMemo(() => soul?.gender === 'Male' ? 'Female' : 'Male', [soul?.gender]);

  const sortedHistory = React.useMemo(() => {
    if (!soul.followUpLog || soul.followUpLog.length === 0) return [];
    return [...soul.followUpLog].sort((a, b) => {
      const dateB = safeToDate(b.date)?.getTime() ?? 0;
      const dateA = safeToDate(a.date)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [soul.followUpLog]);

  const resolveTemplate = React.useCallback((template: string, targetSoul: Soul) => {
      const gender = targetSoul.gender?.toLowerCase() || 'other';
      const pronouns = {
          subject: gender === 'female' ? 'she' : 'he',
          object: gender === 'female' ? 'her' : 'him',
          possessive: gender === 'female' ? 'her' : 'his'
      };
      
      return template
          .replace(/{name}/g, targetSoul.firstName)
          .replace(/{subject}/g, pronouns.subject)
          .replace(/{object}/g, pronouns.object)
          .replace(/{possessive}/g, pronouns.possessive);
  }, []);

  const finalizeLog = async (actionId: string, noteAddendum: string = '', targetSoul: Soul = soul) => {
    if (!user || !firestore || !targetSoul) return;
    
    const action = actionItems.find(a => a.id === actionId);
    const batch = writeBatch(firestore);
    const soulRef = doc(firestore, `users/${targetSoul.userId}/souls`, targetSoul.id);
    const globalSoulRef = doc(firestore, 'souls', targetSoul.id);

    const memberName = `${currentUserProfile?.firstName || ''} ${currentUserProfile?.lastName || ''}`.trim() || user.displayName || 'Member';
    const logEntry = {
        date: new Date(), 
        note: `Logged via Identity Hub: ${action?.label || actionId.replace(/_/g, ' ').toUpperCase()}${noteAddendum ? ` - ${noteAddendum}` : ''}`,
        actions: [actionId],
        memberId: user.uid,
        memberName: memberName,
    };

    batch.update(soulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });
    batch.update(globalSoulRef, {
        followUpLog: arrayUnion(logEntry),
        lastUpdatedAt: serverTimestamp(),
    });

    try {
        await batch.commit();
    } catch (err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: soulRef.path, operation: 'update' }, user));
    }
  };

  const handleActionClick = async (actionId: string) => {
    if (!soul) return;
    setClickedActionId(actionId);

    if (actionId === 'phone_call' || actionId === 'text_message' || actionId === 'prayed_together') {
        if (!soul.phone) {
            toast({ variant: 'destructive', title: 'Phone Missing', description: `Please save a number for ${soul.firstName} first.` });
            return;
        }
    }

    switch (actionId) {
        case 'prayed_together':
            setCustomMessageText(resolveTemplate(prayerTemplates[0].text, soul));
            setIsPrayerCustomizationOpen(true);
            return;
        case 'studied_bible':
            setIsStudyWordOpen(true);
            return;
        case 'text_message':
            setIsCommChannelDialogOpen(true);
            return;
        case 'introduced_friend':
            setIsShareTargetDialogOpen(true);
            return;
        case 'phone_call':
            await finalizeLog(actionId, 'Dialer initiated');
            window.location.href = `tel:${soul.phone}`;
            return;
        case 'visited_home':
            if (address) {
                await finalizeLog(actionId, `Navigated to venue: ${address}`);
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
            } else {
                toast({ variant: 'destructive', title: 'Location Undefined' });
            }
            return;
        case 'helped_with_need':
            setIsHelpNeedDialogOpen(true);
            return;
        case 'invited_to_event':
            await finalizeLog(actionId, 'Redirected to Events Hub');
            router.push('/dashboard/events');
            return;
        case 'shared_meal':
        case 'gave_gift':
            const provisionKey = `testify_pending_provisions_${user?.uid}`;
            const stored = localStorage.getItem(provisionKey);
            let current = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(current)) current = [];
            if (!current.some((p: any) => p.soulId === soul.id && p.actionId === actionId)) {
                current.push({ soulId: soul.id, soulName: `${soul.firstName} ${soul.lastName}`, actionId: actionId, timestamp: Date.now() });
                localStorage.setItem(provisionKey, JSON.stringify(current));
                window.dispatchEvent(new Event('testify_pending_action_update'));
            }
            const mPath = actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
            router.push(`${mPath}?soulId=${soul.id}&soulName=${encodeURIComponent(soul.firstName)}&actionId=${actionId}`);
            return;
        default:
            await finalizeLog(actionId);
    }
  };

  const handleCommChoice = (channel: 'whatsapp' | 'sms') => {
      const targetPhone = suitorTarget?.phone || soul?.phone;
      if (!targetPhone || !clickedActionId) return;
      
      const cleanPhone = targetPhone.replace(/\+/g, '').replace(/\D/g, '');
      const messageText = encodeURIComponent(customMessageText || `Hi, I'm thinking of you today and praying for you. God bless you!`);
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
      } else {
          window.location.href = `sms:${targetPhone}?body=${messageText}`;
      }
      
      const logAddendum = suitorTarget ? `Kingdom Matchmaking: Sent invitation to potential suitor ${suitorTarget.firstName}.` : `Sent via ${channel.toUpperCase()}: ${customMessageText.substring(0, 30)}...`;
      finalizeLog(clickedActionId, logAddendum);
      setIsCommChannelDialogOpen(false);
      setCustomMessageText('');
      setSuitorTarget(null);
  };

  const handleHelpNeedConfirm = (note: string) => {
    if (!soul) return;
    finalizeLog('helped_with_need', `Assistance details: ${note}`);
    setIsHelpNeedDialogOpen(false);
  };

  const handleShareToWhatsApp = () => {
    if (!soul) return;
    const wonAt = safeToDate(soul.wonAt);
    const details = `Introduction to ${soul.firstName}, a new soul won for the Kingdom! 🎊\n\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nSupport their growth on Testify: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(details)}`, '_blank');
    finalizeLog('introduced_friend', 'Shared via WhatsApp External');
    setIsShareTargetDialogOpen(false);
  };

  const handleShareToPartner = async (partner: UserProfile['accountabilityPartners'][0]) => {
      if (!user || !firestore || !soul || !currentUserProfile) return;
      const wonAt = safeToDate(soul.wonAt);
      const text = `SHARING SOUL DATA: ${soul.firstName} ${soul.lastName}\nStatus: ${soul.status}\nWon on: ${wonAt ? format(wonAt, 'PPP') : 'Recently'}\n\nLet's coordinate follow-up on Testify.`;
      try {
          const participantIds = [user.uid, String(partner.userId)].sort();
          const chatsRef = collection(firestore, 'chats');
          const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
          const snap = await getDocs(q);
          let chatId: string;
          if (!snap.empty) {
              chatId = snap.docs[0].id;
          } else {
              const otherDoc = await getDoc(doc(firestore, 'users', partner.userId));
              const otherProfile = otherDoc.data() as UserProfile;
              const newChat = {
                  participantIds,
                  participantInfo: {
                      [user.uid]: { firstName: currentUserProfile.firstName, lastName: currentUserProfile.lastName, photoURL: currentUserProfile.photoURL || '' },
                      [partner.userId]: { firstName: partner.firstName, lastName: partner.lastName, photoURL: partner.photoURL || '' }
                  },
                  lastUpdatedAt: serverTimestamp(),
                  isGroupChat: false,
                  hasMessages: true
              };
              const ref = await addDoc(chatsRef, newChat);
              chatId = ref.id;
          }
          await addDoc(collection(firestore, 'chats', chatId, 'messages'), { senderId: user.uid, text, createdAt: serverTimestamp() });
          await updateDoc(doc(firestore, 'chats', chatId), { lastUpdatedAt: serverTimestamp(), hasMessages: true });
          toast({ title: 'Shared with Partner!' });
          finalizeLog('introduced_friend', `Shared with partner: ${partner.firstName}`);
          setIsPartnerSelectionDialogOpen(false);
          setIsShareTargetDialogOpen(false);
          router.push(`/dashboard/chats/${chatId}?soulId=${soul.id}`);
      } catch (e) {
          toast({ variant: 'destructive', title: 'Share Failed' });
      }
  };

  const handlePrayerCustomizationConfirm = (text: string) => {
      setCustomMessageText(text);
      setIsPrayerCustomizationOpen(false);
      requestAnimationFrame(() => {
          setIsCommChannelDialogOpen(true);
      });
  };

  const handleMatchmakePairing = async (partner: Soul) => {
      if (!partner.phone) {
          toast({ variant: 'destructive', title: 'Partner Phone Missing', description: `I need a phone number for ${partner.firstName} to seek permission.` });
          return;
      }
      
      const userName = `${currentUserProfile?.firstName || 'A believer'}`;
      const message = `Hi ${partner.firstName}, I'm ${userName} from Testify. I've been praying about divine connections and would like to ask if you'd be open to an introduction with ${soul.firstName}? I believe there could be a godly alignment here for marriage. Let me know if you'd like to hear more. God bless!`;
      
      setCustomMessageText(message);
      setSuitorTarget(partner);
      setClickedActionId('matchmaking');
      setIsMatchmakingOpen(false);
      
      requestAnimationFrame(() => {
          setIsCommChannelDialogOpen(true);
      });
  };

  const handleMatchmakeActivity = async (strategyId: string) => {
      switch (strategyId) {
          case 'singles_fellowship':
              router.push('/dashboard/events');
              await finalizeLog('matchmaking', `Strategy: Scheduled participation in singles fellowship.`);
              break;
          case 'group_hangout':
              setIsMatchmakingOpen(false);
              setIsPrivateHangoutOpen(true);
              break;
          case 'marriage_committee':
              setIsMatchmakingOpen(false);
              setTimeout(() => setIsPartnerSelectionDialogOpen(true), 200);
              break;
          case 'courting_study':
              router.push('/dashboard/bible');
              await finalizeLog('matchmaking', `Strategy: Initiated courting study foundation.`);
              break;
          default:
              await finalizeLog('matchmaking', `Strategy selected: ${strategyId}`);
      }
      if (strategyId !== 'group_hangout') {
          setIsMatchmakingOpen(false);
      }
  };

  const handleCreatePrivateHangout = async (targetSoul: Soul, details: any) => {
    if (!user || !firestore || !currentUserProfile || !soul) return;
    
    setIsActionSubmitting(true);

    try {
        await finalizeLog('matchmaking', `COORDINATED HANGOUT: Scheduled intro with ${targetSoul.firstName} at ${details.location} on ${details.date}.`, soul);
        await finalizeLog('matchmaking', `COORDINATED HANGOUT: Scheduled intro with ${soul.firstName} at ${details.location} on ${details.date}.`, targetSoul);
        
        const invitation = `Hi ${soul.firstName}, I'm coordinating a Kingdom connection between you and ${targetSoul.firstName}. I believe there is a divine alignment here for matchmaking purposes.\n\nWould you be open to this introduction?\n\nProposed Gathering:\nVenue: ${details.location}\nDate: ${details.date}\nTime: ${details.time}\n\nPlease let me know if I have your permission to proceed with this introduction. God bless!`;
        setCustomMessageText(invitation);
        setClickedActionId('matchmaking');
        
        toast({ title: 'Hangout Arranged', description: 'Invitations are now ready for dispatch.' });
        
        setTimeout(() => {
            setIsCommChannelDialogOpen(true);
        }, 300);

    } catch (e: any) {
        console.error("Hangout coordination failed:", e);
        toast({ variant: 'destructive', title: 'Action Failed', description: e.message || 'Could not coordinate hangout.' });
    } finally {
        setIsActionSubmitting(false);
    }
  };

  const handleToggleHistoryPrivacy = async (checked: boolean) => {
      if (!user || !firestore || !soul) return;
      const soulRef = doc(firestore, `users/${soul.userId}/souls`, soul.id);
      const globalSoulRef = doc(firestore, 'souls', soul.id);
      
      const updateData = { isHistoryPrivate: checked, updatedAt: serverTimestamp() };
      
      try {
          const batch = writeBatch(firestore);
          batch.update(soulRef, updateData);
          batch.update(globalSoulRef, updateData);
          await batch.commit();
          toast({ title: checked ? 'History Locked' : 'History Visible', description: checked ? 'Your interaction logs for this soul are now private.' : 'Your logs are visible in the mutual hub.' });
      } catch (e) {
          toast({ variant: 'destructive', title: 'Update Failed' });
      }
  };

  const handleVerseSelected = (verseMessage: string) => {
    setCustomMessageText(verseMessage);
    setIsStudyWordOpen(false);
    setIsCommChannelDialogOpen(true);
  };

  const uniquePartners = React.useMemo(() => {
    const partners = currentUserProfile?.accountabilityPartners || [];
    const uniqueMap = new Map();
    partners.forEach(p => {
        if (p.userId && !uniqueMap.has(p.userId)) {
            uniqueMap.set(p.userId, p);
        }
    });
    return Array.from(uniqueMap.values());
  }, [currentUserProfile?.accountabilityPartners]);

  return (
    <div className="space-y-6 text-left">
      <Card className="rounded-none sm:rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-sm border-t-4 border-t-primary/20 text-left">
        <CardHeader className="p-8 pb-4 text-center text-left">
            <div className="relative inline-block mx-auto mb-4 text-left">
                <Dialog>
                    <DialogTrigger asChild disabled={!soul.photoURL}>
                        <Avatar className={cn("h-48 w-48 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-all active:scale-95 text-left", soul.photoURL && "cursor-pointer hover:scale-105")}>
                            <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                            <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary text-left text-center flex items-center justify-center w-full h-full">{soul.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </DialogTrigger>
                    {soul.photoURL && (
                        <DialogContent className="p-0 bg-black/95 border-0 sm:max-w-[95vw] h-dvh rounded-none flex items-center justify-center text-center">
                            <DialogHeader className="sr-only text-center"><DialogTitle>Soul Photo</DialogTitle></DialogHeader>
                            <div className="relative h-full w-full flex items-center justify-center p-4 text-center">
                                <div className="relative h-full w-full max-h-[85vh] max-w-[90vw] sm:max-w-[80vw] flex items-center justify-center text-center text-left text-left">
                                    <Image src={soul.photoURL} alt={soul.firstName} fill className="object-contain shadow-2xl ring-4 ring-white/10" unoptimized />
                                </div>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
                {address && (
                    <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full shadow-lg border-2 border-background"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')}
                        title="View Map"
                    >
                        <MapPin className="h-5 w-5" />
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-center truncate w-full">
                  {soul.firstName} {soul.lastName}
                </CardTitle>
                <div className="flex gap-2 justify-center items-center">
                    <Badge className={cn("h-5 px-2 text-[9px] uppercase font-black tracking-widest justify-center", getStatusClasses(soul.status))} variant="outline">
                        {soul.status}
                    </Badge>
                    <MutualConnectBadge soul={soul} />
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-6 text-left">
            <Separator className="opacity-50" />
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Identity</p>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Select Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'csv')}>CSV Export</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onExportSingle(soul, 'pdf')}>PDF Report</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onEdit(soul)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Full Name</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.firstName} {soul.lastName}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Gender/Age</p>
                        <p className="text-[11px] sm:text-xs font-bold">{soul.gender || 'N/A'} • {soul.age ? `${soul.age} yrs` : 'Age N/A'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">{soul.parentIds?.length ? "Parent Link" : "Relationship"}</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.parentNames?.length ? `Child of ${soul.parentNames.join(' & ')}` : (soul.relationship || 'N/A')}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Work Status</p>
                        <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.workStatus || 'N/A'}</p>
                    </div>
                </div>
                {(soul.hobbies || (soul.socialStatus && soul.socialStatus !== 'Normal')) && (
                   <div className="space-y-2">
                        {soul.socialStatus && soul.socialStatus !== 'Normal' && (
                            <div className="space-y-1">
                                <p className="text-[7px] font-black uppercase text-primary tracking-widest">Social standing</p>
                                <Badge variant="secondary" className="h-4 px-2 text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none">{soul.socialStatus}</Badge>
                            </div>
                        )}
                        {soul.hobbies && (
                            <div className="space-y-1">
                                <p className="text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">Kingdom Interests</p>
                                <p className="text-[11px] sm:text-xs font-medium italic text-primary leading-tight">{soul.hobbies}</p>
                            </div>
                        )}
                   </div>
                )}
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">History Privacy</p>
                    <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase">{soul.isHistoryPrivate ? 'Locked' : 'Visible'}</span>
                         <Switch 
                            checked={!!soul.isHistoryPrivate} 
                            onCheckedChange={handleToggleHistoryPrivacy}
                         />
                    </div>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                    When locked, your follow-up logs for this soul are hidden from other believers in the Mutual Effort hub.
                </p>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Relational Actions</p>
                <div className="grid grid-cols-2 gap-2">
                    {actionItems.map(action => {
                        const Icon = iconMap[action.id] || Heart;
                        const isThisProcessing = clickedActionId === action.id && isActionSubmitting;
                        return (
                            <Button
                                key={action.id}
                                variant="outline"
                                className="flex items-center justify-start gap-2 h-10 px-3 rounded-xl border-2 border-transparent bg-muted/20 hover:bg-primary/5 hover:border-primary/10 transition-all group"
                                onClick={() => handleActionClick(action.id)}
                                disabled={isActionSubmitting}
                            >
                                {isThisProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Icon className="h-3.5 w-3.5 text-primary" />}
                                <span className="text-[10px] font-bold uppercase tracking-tight truncate">{action.label}</span>
                            </Button>
                        )
                    })}
                    {(soul.maritalStatus === 'Single' || soul.maritalStatus === 'Widowed') && (soul.age != null && soul.age >= 18) && (
                        <Button
                            variant="outline"
                            className="flex items-center justify-start gap-2 h-10 px-3 rounded-xl border-2 border-transparent bg-primary/5 hover:bg-primary/10 transition-all group"
                            onClick={() => setIsMatchmakingOpen(true)}
                            disabled={isActionSubmitting}
                        >
                            <Heart className="h-3.5 w-3.5 text-primary fill-current" />
                            <span className="text-[10px] font-bold uppercase tracking-tight truncate">Matchmaking</span>
                        </Button>
                    )}
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Kingdom Placement</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onOpenAssignDialog(soul)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5 border border-primary/10">
                        <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Fellowship</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.fellowshipName || 'No Fellowship'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <Users className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-widest">Association</p>
                            <p className="text-[11px] sm:text-xs font-bold truncate capitalize">{soul.associationName || 'No Association'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="opacity-20" />

            <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Spiritual Milestones</p>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Church', val: soul.attendingChurch, icon: Church },
                        { label: 'Word Study', val: soul.inBibleStudy, icon: BookOpen },
                        { label: 'Prayer', val: soul.attendingPrayer, icon: Zap },
                        { label: 'Service', val: soul.inServiceDepartment, icon: ShieldCheck },
                    ].map(milestone => (
                        <div key={milestone.label} className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all",
                            milestone.val ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-transparent text-muted-foreground/40"
                        )}>
                            <milestone.icon className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-tight">{milestone.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Separator className="opacity-20" />
            
            <div className="space-y-3 p-5 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10 shadow-inner text-left">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5" /> Assessed Needs
                    </p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => onAssess(soul)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
                {needs ? (
                    <div className="space-y-4">
                        {needs.generalImpression && <p className="text-xs text-muted-foreground italic leading-relaxed text-balance">&ldquo;{needs.generalImpression}&rdquo;</p>}
                        
                        <div className="grid grid-cols-2 gap-3">
                            {needs.emotionalNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-red-500/10 text-red-600 border-none px-1.5 uppercase font-black">Emotional</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.emotionalNeeds}</p>
                                </div>
                            )}
                            {needs.physicalNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-amber-500/10 text-amber-600 border-none px-1.5 uppercase font-black">Physical</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.physicalNeeds}</p>
                                </div>
                            )}
                            {needs.financialNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-green-500/10 text-green-600 border-none px-1.5 uppercase font-black">Financial</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.financialNeeds}</p>
                                </div>
                            )}
                            {needs.socialNeeds && (
                                <div className="space-y-1">
                                    <Badge variant="secondary" className="text-[7px] h-4 bg-indigo-500/10 text-indigo-600 border-none px-1.5 uppercase font-black">Social</Badge>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{needs.socialNeeds}</p>
                                </div>
                            )}
                        </div>

                        {needs.followUpPlan && (
                            <div className="pt-2 border-t border-primary/10">
                                <p className="text-[8px] font-black uppercase text-primary/60 mb-1 flex items-center gap-1.5">
                                    <Target className="h-2.5 w-2.5" /> Strategy
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">{needs.followUpPlan}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 text-center">
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5" onClick={() => onAssess(soul)}>
                            BEGIN ASSESSMENT
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2">
                        <History className="h-3.5 w-3.5" /> Interaction History
                    </p>
                    <Button variant="ghost" className="h-6 text-[8px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => onViewHistory(soul)}>
                        View All
                    </Button>
                </div>
                <div className="space-y-4 pl-1">
                    {sortedHistory.length > 0 ? (
                        sortedHistory.slice(0, 3).map((log, index) => {
                            const date = safeToDate(log.date);
                            return (
                                <div key={index} className="relative">
                                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                        <p className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                                        {date ? format(date, "PPP 'at' p") : 'Date not available'}
                                        </p>
                                        {log.memberName && (
                                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-tighter truncate max-w-[140px]">
                                                By {log.memberName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="pl-6 border-l-4 border-primary/20 space-y-4">
                                    {log.actions && log.actions.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {log.actions.map(actionId => {
                                                    const action = actionItems.find(a => a.id === actionId);
                                                    return action ? (
                                                        <Badge key={actionId} variant="secondary" className="font-bold text-[9px] px-2 h-4 uppercase tracking-tight bg-background border">{action.label}</Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    {log.note ? (
                                            <div className="bg-background rounded-2xl p-4 border shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-3 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                                    <Sparkles className="h-8 w-8 text-primary rotate-12" />
                                                </div>
                                                <p className="text-sm sm:text-base text-muted-foreground italic leading-relaxed break-words [overflow-wrap:anywhere]">
                                                    &ldquo;{log.note}&rdquo;
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic pl-1 opacity-60">No additional details recorded for this entry.</p>
                                        )}
                                    </div>
                                    {index < sortedHistory.length - 1 && <Separator className="mt-8 opacity-30" />}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center border border-dashed rounded-xl bg-muted/5">
                            <p className="text-sm text-muted-foreground/40 italic">No interactions recorded.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2 space-y-3">
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" onClick={() => onFollowUp(soul)}>
                    LOG FOLLOW-UP
                </Button>
                <Button variant="ghost" className="w-full h-11 text-destructive font-bold uppercase tracking-widest text-[10px]" onClick={() => onDelete(soul)}>
                    <Trash2 className="mr-2 h-4 w-4" /> DELETE RECORD
                </Button>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isMatchmakingOpen} onOpenChange={setIsMatchmakingOpen}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="p-8 border-b bg-muted/10">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight flex items-center gap-2 text-left">
                          <Heart className="h-6 w-6 text-primary fill-current text-left" />
                          Kingdom Matchmaking
                      </DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left">Helping {soul.firstName} find a godly partner through divine connection and strategic activities.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6 text-left">
                  <Tabs defaultValue="suitors" className="w-full text-left">
                      <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/40 p-1 h-11 mb-6 text-left">
                          <TabsTrigger value="suitors" className="rounded-xl font-bold text-xs uppercase tracking-widest text-left">Divine Pairs</TabsTrigger>
                          <TabsTrigger value="activities" className="rounded-xl font-bold text-xs uppercase tracking-widest h-full text-left">Strategies</TabsTrigger>
                      </TabsList>
                      <TabsContent value="suitors" className="outline-none text-left">
                          <ScrollArea className="h-64 text-left">
                              <div className="space-y-2 pr-4 text-left">
                                  {allSouls.filter(s => s.id !== soul.id && (s.maritalStatus === 'Single' || s.maritalStatus === 'Widowed') && s.gender === oppositeGender && (s.age != null && s.age >= 18)).length > 0 ? allSouls.filter(s => s.id !== soul.id && (s.maritalStatus === 'Single' || s.maritalStatus === 'Widowed') && s.gender === oppositeGender && (s.age != null && s.age >= 18)).map(s => (
                                      <Button 
                                          key={s.id} 
                                          variant="ghost" 
                                          className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group flex items-center text-left"
                                          onClick={() => handleMatchmakePairing(s)}
                                      >
                                          <Avatar className="h-8 w-8 border shrink-0 text-left">
                                              <AvatarImage src={s.photoURL || undefined} className="text-left" />
                                              <AvatarFallback className="font-black text-[10px] text-center flex items-center justify-center w-full h-full text-left">{s.firstName.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div className="text-left flex-1 min-w-0 text-left">
                                              <p className="font-black text-sm uppercase tracking-tight truncate text-left">{s.firstName} {s.lastName}</p>
                                              <p className="text-[9px] font-bold text-muted-foreground uppercase text-left">{s.gender} • {s.age ? `${s.age} yrs` : 'Age N/A'}</p>
                                          </div>
                                          <MessageSquare className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity text-left" />
                                      </Button>
                                  )) : (
                                      <p className="text-center text-xs text-muted-foreground py-12 text-left">No other single {oppositeGender.toLowerCase()} souls found in your harvest list.</p>
                                  )}
                              </div>
                          </ScrollArea>
                      </TabsContent>
                      <TabsContent value="activities" className="outline-none text-left">
                          <div className="grid gap-2 text-left">
                              <Button 
                                  variant="outline" 
                                  className="justify-start h-12 rounded-xl gap-3 border-primary/10 hover:bg-primary/5 hover:border-primary/10 transition-all text-left"
                                  onClick={() => handleMatchmakeActivity('singles_fellowship')}
                              >
                                  <Users className="h-4 w-4 text-primary text-left" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Invite to Singles Fellowship</span>
                              </Button>
                              <Button 
                                  variant="outline" 
                                  className="justify-start h-12 rounded-xl gap-3 border-primary/10 hover:bg-primary/5 hover:border-primary/10 transition-all text-left"
                                  onClick={() => handleMatchmakeActivity('group_hangout')}
                              >
                                  <Sparkles className="h-4 w-4 text-primary text-left" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Draft Direct Hangout Invitation</span>
                              </Button>
                              <Button 
                                  variant="outline" 
                                  className="justify-start h-12 rounded-xl gap-3 border-primary/10 hover:bg-primary/5 hover:border-primary/10 transition-all text-left"
                                  onClick={() => handleMatchmakeActivity('marriage_committee')}
                              >
                                  <ShieldCheck className="h-4 w-4 text-primary text-left" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Refer to Marriage Committee</span>
                              </Button>
                              <Button 
                                  variant="outline" 
                                  className="justify-start h-12 rounded-xl gap-3 border-primary/10 hover:bg-primary/5 hover:border-primary/10 transition-all text-left"
                                  onClick={() => handleMatchmakeActivity('courting_study')}
                              >
                                  <BookOpen className="h-4 w-4 text-primary text-left" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-left">Start Courting Study</span>
                              </Button>
                          </div>
                      </TabsContent>
                  </Tabs>
              </div>
              <div className="p-6 border-t bg-muted/5 flex justify-end text-left">
                  <Button variant="ghost" onClick={() => setIsMatchmakingOpen(false)} className="rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest text-left">Cancel</Button>
              </div>
          </DialogContent>
      </Dialog>

      <PrivateHangoutBuilder 
        isOpen={isPrivateHangoutOpen}
        onOpenChange={setIsPrivateHangoutOpen}
        soul={soul}
        userProfile={currentUserProfile || null}
        allSouls={allSouls}
        onCreate={handleCreatePrivateHangout}
      />

      <Dialog open={isPrayerCustomizationOpen} onOpenChange={setIsPrayerCustomizationOpen}>
          <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="p-8 border-b bg-muted/10 text-left">
                  <DialogHeader>
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kingdom Intercession</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left">Draft a powerful prayer for {soul.firstName}.</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-8 space-y-6 text-left">
                <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Select Focus</label>
                    <div className="flex flex-wrap gap-2 text-left">
                        {prayerTemplates.map(t => (
                            <Button 
                                key={t.id} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full h-8 px-4 text-[9px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary text-left"
                                onClick={() => setCustomMessageText(resolveTemplate(t.text, soul))}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                </div>
                  <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Customize Message</Label>
                      <Textarea 
                          value={customMessageText}
                          onChange={e => setCustomMessageText(e.target.value)}
                          className="min-h-[200px] rounded-2xl bg-muted/20 border-none shadow-inner text-base leading-relaxed p-6 text-left"
                      />
                  </div>
                  <Button 
                      onClick={() => handlePrayerCustomizationConfirm(customMessageText)} 
                      disabled={!customMessageText.trim()} 
                      className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left"
                  >
                      CONTINUE TO CHANNEL
                  </Button>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isCommChannelDialogOpen} onOpenChange={setIsCommChannelDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
          <DialogHeader className="text-center space-y-2 text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-left">
                  <MessageSquare className="h-7 w-7 text-primary text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left">Message Hub</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center text-left">How would you like to encourage {suitorTarget?.firstName || soul.firstName}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left">
            <Button onClick={() => handleCommChoice('whatsapp')} className="h-14 rounded-2xl font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left">
              <WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp
            </Button>
            <Button onClick={() => handleCommChoice('sms')} variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left">
              <MessageSquare className="h-5 w-5 text-left" /> Standard SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpNeedDialogOpen} onOpenChange={setIsHelpNeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
          <div className="p-8 border-b bg-muted/10 text-left">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Support Provided</DialogTitle>
              <DialogDescription className="text-sm font-medium text-left">Describe how you supported {soul?.firstName}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6 text-left">
            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Support Details</Label>
                <Textarea 
                    placeholder="e.g. Provided food items, helped with bill..." 
                    onChange={e => setCustomMessageText(e.target.value)} 
                    className="min-h-[120px] rounded-2xl bg-muted/20 border-none shadow-inner text-left"
                />
            </div>
            <Button onClick={() => handleHelpNeedConfirm(customMessageText)} className="w-full h-12 rounded-xl font-bold text-left">Confirm Service</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareTargetDialogOpen} onOpenChange={setIsShareTargetDialogOpen}>
        <DialogContent className="sm:max-w-[340px] rounded-[2.5rem] p-8 border-none shadow-2xl text-center text-left">
          <DialogHeader className="text-center space-y-2 text-left text-left">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2 text-left">
                  <Share2 className="h-7 w-7 text-primary text-left" />
              </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight uppercase text-center text-left">Share Details</DialogTitle>
            <DialogDescription className="text-sm font-medium text-center text-left">Where would you like to share {soul.firstName}'s info?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-6 text-left">
            <Button onClick={handleShareToWhatsApp} className="h-14 rounded-2xl font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 text-left">
              <WhatsAppIcon className="h-5 w-5 text-left" /> WhatsApp External
            </Button>
            <Button onClick={() => { setIsShareTargetDialogOpen(false); setTimeout(() => setIsPartnerSelectionDialogOpen(true), 100); }} variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-[0.1em] border-2 border-primary/20 text-primary hover:bg-primary/5 text-left">
              <HeartHandshake className="h-5 w-5 text-left" /> Partner on App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPartnerSelectionDialogOpen} onOpenChange={setIsPartnerSelectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left">
              <div className="p-8 border-b bg-muted/10 text-left text-left">
                  <DialogHeader className="text-left text-left text-left">
                      <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Select Partner</DialogTitle>
                      <DialogDescription className="text-sm font-medium text-left text-left">Which partner should receive these details?</DialogDescription>
                  </DialogHeader>
              </div>
              <div className="p-6 text-left">
              <ScrollArea className="h-64 text-left">
                  <div className="space-y-2 text-left">
                      {uniquePartners.map(p => (
                          <Button 
                              key={p.userId} 
                              variant="ghost" 
                              className="w-full justify-start h-14 rounded-xl gap-4 hover:bg-primary/5 group flex items-center text-left"
                              onClick={() => handleShareToPartner(p)}
                          >
                              <Avatar className="h-8 w-8 border shrink-0 text-left">
                                  <AvatarImage src={p.photoURL} className="text-left" />
                                  <AvatarFallback className="font-bold text-[10px] text-center flex items-center justify-center w-full h-full text-left">{p.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-sm group-hover:text-primary transition-colors text-left">{p.firstName} {p.lastName}</span>
                          </Button>
                      ))}
                      {uniquePartners.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-12 text-left">No partners found. Connect with some in Settings!</p>
                      )}
                  </div>
              </ScrollArea>
              </div>
          </DialogContent>
      </Dialog>

      <ShareWordDialog 
          isOpen={isStudyWordOpen}
          onOpenChange={setIsStudyWordOpen}
          soul={soul}
          onSelectVerse={handleVerseSelected}
      />
    </div>
  );
}

const SoulCard = React.memo(({ soul, onClick }: { 
  soul: Soul; 
  onClick: () => void;
}) => {
    return (
        <Card onClick={onClick} className="rounded-none sm:rounded-xl border-x-0 sm:border-x border-b-2 sm:border-b shadow-none bg-card/50 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:bg-primary/[0.02] text-left">
            <div className="flex items-center justify-between p-4 gap-4 text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1 text-left text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-center flex items-center justify-center w-full h-full text-left">
                            {soul.firstName?.charAt(0) || 'S'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap text-left">
                            <p className="font-bold truncate text-[13px] sm:text-base leading-tight capitalize tracking-tight text-left">
                              {soul.firstName || 'Unknown'} {soul.lastName || ''}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-left">
                            <Badge className={cn("h-5 px-1.5 text-[9px] uppercase font-black tracking-widest text-left", getStatusClasses(soul.status))} variant="outline">{soul.status}</Badge>
                            {soul.fellowshipName && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] uppercase font-black tracking-tighter bg-primary/5 text-primary border-primary/20 shrink-0 text-left">Fellowship</Badge>}
                        </div>
                    </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-20 text-left" />
            </div>
        </Card>
    );
});
SoulCard.displayName = "SoulCard";

const SoulTableRow = React.memo(({ soul, isSelected, onSelect }: { 
  soul: Soul; 
  isSelected: boolean;
  onSelect: () => void;
}) => {
    return (
        <TableRow 
            className={cn("border-b hover:bg-muted/30 transition-colors cursor-pointer text-left", isSelected && "bg-primary/[0.03]")}
            onClick={() => onSelect()}
        >
            <TableCell className="font-medium p-4 text-left">
                <div className="flex items-center gap-4 text-left">
                    <Avatar className={cn("h-10 w-10 border shadow-inner shrink-0 text-left")}>
                        <AvatarImage src={soul.photoURL || undefined} className="object-cover text-left" />
                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-center flex items-center justify-center w-full h-full text-left">{soul.firstName?.charAt(0) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-left">
                        <div className="font-black text-xs sm:text-sm md:text-base truncate capitalize tracking-tight text-left">
                            {soul.firstName} {soul.lastName}
                        </div>
                        {soul.church && <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 font-medium truncate opacity-70 text-left" ><Church className="h-3 w-3 shrink-0 text-left" />{soul.church}</div>}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
});
SoulTableRow.displayName = "SoulTableRow";

export function SoulsWonTable({ souls, loading, selectedSoulId, setSelectedSoulId, onFollowUp, onViewHistory, onExportSingle, onOpenAssignDialog, onEdit, onDelete, onAssess }: {
  souls: Soul[];
  loading: boolean;
  selectedSoulId: string | null;
  setSelectedSoulId: (id: string | null) => void;
  onFollowUp: (soul: Soul) => void;
  onViewHistory: (soul: Soul) => void;
  onExportSingle: (soul: Soul, formatType: 'csv' | 'pdf') => void;
  onOpenAssignDialog: (soul: Soul) => void;
  onEdit: (soul: Soul) => void;
  onDelete: (soul: Soul) => void;
  onAssess: (soul: Soul) => void;
}) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { 
    setMounted(true); 
  }, []);

  const selectedSoul = React.useMemo(() => 
    souls.find(s => s.id === selectedSoulId) || null
  , [souls, selectedSoulId]);

  if (loading || !mounted) {
    return (
        <div className="space-y-4 text-left">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 bg-card/50 backdrop-blur-sm rounded-xl text-left">
                    <Skeleton className="h-12 w-12 rounded-full text-left" />
                    <div className="space-y-2 flex-1 text-left"><Skeleton className="h-5 w-3/4 text-left" /><Skeleton className="h-4 w-1/2 text-left" /></div>
                    <Skeleton className="h-9 w-24 rounded-xl text-left" />
                </div>
            ))}
        </div>
    )
  }
  
  if (souls.length === 0) {
    return (
        <Card className="rounded-none sm:rounded-xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm border-2 border-dashed text-left">
            <CardContent className="text-left">
                <div className="text-center py-24 flex flex-col items-center text-left">
                    <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/20 text-left">
                        <HeartHandshake className="h-10 w-10 text-primary opacity-40 text-left" />
                    </div>
                    <h3 className="text-xl font-black font-headline uppercase tracking-tight text-left">Your Harvest Field</h3>
                    <p className="text-sm text-muted-foreground italic font-medium max-w-[280px] leading-relaxed opacity-60 text-balance text-center text-left">The souls you lead to Christ will appear here for collaborative discipleship and strategic follow-up.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const profileView = selectedSoul && (
    <SoulProfileContent 
        soul={selectedSoul} 
        allSouls={souls}
        onFollowUp={onFollowUp} 
        onViewHistory={onViewHistory}
        onEdit={onEdit} 
        onAssess={onAssess} 
        onOpenAssignDialog={onOpenAssignDialog} 
        onExportSingle={onExportSingle} 
        onDelete={onDelete}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start text-left">
        <div className="flex-1 w-full text-left">
            {isMobile ? (
                <div className="space-y-px text-left">
                    {souls.map((soul) => (
                        <SoulCard key={soul.id} soul={soul} onClick={() => setSelectedSoulId(soul.id)} />
                    ))}
                </div>
            ) : (
                <Card className="rounded-none sm:rounded-[2rem] border-x-0 sm:border-x shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden text-left">
                    <CardHeader className="p-8 border-b bg-muted/5 text-left text-left text-left">
                        <CardTitle className="text-2xl font-black font-headline tracking-tight flex items-center gap-3 uppercase text-left text-left">
                            <Heart className="h-6 w-6 text-primary fill-current text-left text-left" />
                            Harvest Dashboard
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-left text-left">Keep track of spiritual development and community integration.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 text-left text-left">
                        <div className="overflow-x-auto text-left text-left text-left">
                            <Table className="text-left text-left text-left">
                                <TableHeader className="bg-muted/10 text-left text-left text-left">
                                    <TableRow className="hover:bg-transparent text-left text-left text-left">
                                        <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">Soul Identity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-left text-left text-left">
                                    {souls.map((soul) => (
                                    <SoulTableRow 
                                        key={soul.id} 
                                        soul={soul} 
                                        isSelected={selectedSoulId === soul.id}
                                        onSelect={() => setSelectedSoulId(soul.id)}
                                    />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        <Sheet open={!!selectedSoulId && !!selectedSoul && (isMobile || (typeof window !== 'undefined' && window.innerWidth < 1024))} onOpenChange={(open) => !open && setSelectedSoulId(null)}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left">
                    <SheetHeader className="text-left flex-shrink-0 text-left text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-2 text-left text-left text-left text-left">
                            <Sparkles className="h-4 w-4 text-primary text-left text-left text-left text-left" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left text-left text-left text-left">Identity Hub</span>
                        </div>
                        <SheetTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">
                            {selectedSoul?.firstName} {selectedSoul?.lastName}
                        </SheetTitle>
                        <SheetDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left">Full spiritual snapshot for the harvest workforce.</SheetDescription>
                    </SheetHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 text-left text-left text-left text-left text-left">
                    <div className="p-6 pb-24 text-left text-left text-left text-left text-left">
                        {profileView}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>

        <div className="hidden lg:block w-[320px] shrink-0 sticky top-24 text-left text-left text-left text-left">
            <AnimatePresence>
                {selectedSoul ? (
                    <motion.div
                        key={selectedSoulId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 text-left text-left text-left text-left"
                    >
                        {profileView}
                        <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.3em] text-center text-left text-left text-left text-left">
                            {selectedSoul.firstName} {selectedSoul.lastName}
                        </p>
                    </motion.div>
                ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed rounded-[2rem] bg-muted/5 text-left text-left text-left text-left">
                        <Users className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4 text-left text-left text-left text-left" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center text-balance text-left text-left text-left text-left">Select a record to preview identity</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
