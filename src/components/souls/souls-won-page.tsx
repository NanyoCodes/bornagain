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
  MessageSquare,
  HandHeart,
  BookMarked,
  ChevronDown,
  Zap,
  Phone,
  Mail,
  Send,
  X,
  Search
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
import { useCollection, useFirestore, useUser, useUserProfile } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, deleteField, where, getDocs, increment, arrayUnion } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { format } from "date-fns";
import { cn, safeToDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import NextImage from "next/image";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SoulProfileContent, getStatusClasses, ShareWordDialog, IntercessionHubDialog, MessageHubDialog } from "./soul-profile-content";
import { Checkbox } from "../ui/checkbox";
import { Input } from "@/components/ui/input";

const SoulsWonTableLazy = dynamic(() => import('@/components/souls/souls-won-table').then(m => m.SoulsWonTable), {
  loading: () => <div className="flex justify-center p-12 text-left"><Loader2 className="h-8 w-8 animate-spin text-left" /></div>,
  ssr: false
});

const LogFollowUpDialogLazy = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const ViewHistoryDialogLazy = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const AssignFellowshipDialogLazy = dynamic(() => import('@/components/souls/assign-fellowship-dialog').then(m => m.AssignFellowshipDialog), { ssr: false });
const LogSoulFormLazy = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });
const EditSoulFormLazy = dynamic(() => import('@/components/souls/edit-soul-form').then(m => m.EditSoulForm), { ssr: false });
const SoulAssessmentDialogLazy = dynamic(() => import('@/components/souls/soul-assessment-dialog').then(m => m.SoulAssessmentDialog), { ssr: false });

function ChildSelectionDialog({
    isOpen,
    onOpenChange,
    souls,
    parent,
    spouse,
    onShareWord,
    isLoading
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    souls: Soul[];
    parent: Soul | null;
    spouse?: Soul | null;
    onShareWord: (child: Soul) => void;
    isLoading: boolean;
}) {
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    
    const filteredSouls = useMemo(() => {
        if (!parent?.id) return [];
        const forbiddenIds = new Set([parent.id, ...(spouse?.id ? [spouse.id] : []), ...(parent.childrenIds || [])]);
        let list = souls.filter(s => !forbiddenIds.has(s.id));
        if (search) {
            const term = search.toLowerCase();
            list = list.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term));
        }
        return list;
    }, [souls, parent, spouse, search]);

    if (!parent) return null;

    const header = (
        <div className="p-8 border-b bg-muted/10 text-left flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 text-left">
                <div className="text-left p-0">
                    <DialogTitle className="text-2xl font-black font-headline uppercase">Select Child</DialogTitle>
                    <DialogDescription className="text-sm font-medium mt-1">Pick an existing convert to add to {parent.firstName}&apos;s household.</DialogDescription>
                </div>
            </div>
            <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => onOpenChange(false)}>
                <X className="h-5 w-5 text-left" />
            </Button>
        </div>
    );

    const body = (
        <div className="p-6 space-y-6 text-left">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input 
                    placeholder="Search converts..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    className="h-12 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left"
                />
            </div>
            <ScrollArea className="h-[40vh] border rounded-3xl bg-muted/5">
                <div className="p-2 space-y-1.5">
                    {filteredSouls.length > 0 ? (
                        filteredSouls.map(s => (
                            <Button 
                                key={s.id} 
                                variant="ghost" 
                                className="w-full justify-start h-16 px-4 rounded-2xl hover:bg-primary/5 hover:text-primary transition-all gap-4 group flex flex-row items-center border bg-card/50"
                                onClick={() => onShareWord(s)}
                                disabled={isLoading}
                            >
                                <Avatar className="h-10 w-10 border shadow-sm shrink-0">
                                    <AvatarImage src={s.photoURL || undefined} className="object-cover" />
                                    <AvatarFallback className="font-black bg-primary/10 text-primary text-xs"> {s.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-left min-w-0 flex-1">
                                    <p className="font-black text-sm uppercase tracking-tight truncate leading-tight">{s.firstName} {s.lastName}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{s.status}</p>
                                </div>
                                <PlusCircle className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        ))
                    ) : (
                        <div className="text-center py-24 px-8 space-y-3">
                            <Users className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 text-center">No converts available to link</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    {header}
                    <div className="flex-grow overflow-hidden">{body}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                {header}
                {body}
            </DialogContent>
        </Dialog>
    );
}

function FilteredSoulList({ 
    souls, 
    allSouls, 
    onSelectSoul, 
    onPickChild,
    onAddChildForm, 
    onShareWord, 
    onPray, 
    onMessage 
}: { 
    souls: Soul[], 
    allSouls: Soul[], 
    onSelectSoul: (soul: Soul) => void, 
    onPickChild: (parent: Soul, spouse?: Soul | null) => void,
    onAddChildForm: (p1: Soul, p2?: Soul | null) => void,
    onShareWord: (soul: Soul) => void,
    onPray: (soul: Soul) => void,
    onMessage: (soul: Soul) => void
}) {
  const [openFamilyId, setOpenFamilyId] = useState<string | null>(null);

  if (!souls || souls.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground italic">No souls found matching this criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6 text-left">
      {souls.map((soul) => {
        const isFamilyMember = soul.maritalStatus === 'Married';
        const wonAt = safeToDate(soul.wonAt);
        
        const spouseObj = isFamilyMember ? allSouls.find(other => {
            if (other.id === soul.id || other.maritalStatus !== 'Married') return false;
            const otherFull = `${other.firstName} ${other.lastName}`.toLowerCase();
            const soulFull = `${soul.firstName} ${soul.lastName}`.toLowerCase();
            const soulSpouse = (soul.spouseName || "").toLowerCase();
            const otherSpouse = (other.spouseName || "").toLowerCase();
            return (soulSpouse === otherFull || soulSpouse === other.firstName.toLowerCase()) &&
                   (otherSpouse === soulFull || otherSpouse === soul.firstName.toLowerCase());
        }) : null;

        const children = allSouls.filter(child => soul.childrenIds?.includes(child.id));
        const hasFamily = spouseObj || children.length > 0;

        return (
          <div key={soul.id} className="relative text-left">
            <Collapsible open={openFamilyId === soul.id} onOpenChange={() => setOpenFamilyId(openFamilyId === soul.id ? null : soul.id)}>
                <div 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-[2rem] border bg-background/50 group w-full relative gap-4 transition-all hover:bg-card/40 cursor-pointer"
                    onClick={() => onShareWord(soul)}
                >
                    <div className="flex flex-row items-center gap-3 min-w-0 flex-1 w-full text-left">
                        <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <div className="flex -space-x-3 sm:-space-x-4 shrink-0 hover:scale-105 active:scale-95 transition-transform text-left">
                                <Avatar className="h-11 w-11 sm:h-12 sm:w-12 border-2 border-background shadow-md shrink-0">
                                    <AvatarImage src={soul.photoURL || undefined} className="object-cover" />
                                    <AvatarFallback className="font-black bg-primary/10 text-primary text-[10px] sm:text-xs flex items-center justify-center h-full w-full"> {soul.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {spouseObj && (
                                    <Avatar className="h-11 w-11 sm:h-12 sm:w-12 border-2 border-background shadow-md ring-2 ring-primary/5 shrink-0">
                                        <AvatarImage src={spouseObj.photoURL || undefined} className="object-cover" />
                                        <AvatarFallback className="font-black bg-primary/10 text-primary/60 text-[10px] sm:text-xs flex items-center justify-center h-full w-full"> {spouseObj.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        </CollapsibleTrigger>
                        <div className="min-w-0 flex-1 pr-1 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-[14px] sm:text-base uppercase tracking-tight max-w-[150px] sm:max-w-full truncate">
                                    {soul.firstName} {soul.lastName}
                                </p>
                                <Badge variant="outline" className={cn("h-4 px-1 text-[7px] sm:text-[9px] uppercase font-black tracking-tighter shrink-0 bg-background/50", getStatusClasses(soul.status))}>{soul.status}</Badge>
                            </div>
                            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 group/trigger hover:opacity-80 transition-opacity">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                        Won {wonAt ? format(wonAt, 'MMM d, yy') : 'Recently'}
                                        {soul.age && <span className="opacity-60 font-black"> • {soul.age} YRS</span>}
                                    </p>
                                    {hasFamily && (
                                        <ChevronDown className={cn("h-3 w-3 text-primary transition-transform duration-200", openFamilyId === soul.id && "rotate-180")} />
                                    )}
                                    {isFamilyMember && (
                                        <Badge variant="secondary" className="h-4 px-1.5 text-[7px] font-black uppercase bg-primary/10 text-primary border-none leading-none">Family Unit</Badge>
                                    )}
                                </div>
                            </CollapsibleTrigger>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2 shrink-0 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-none border-dashed border-primary/10" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 text-primary" onClick={() => onShareWord(soul)}>
                            <BookMarked className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 text-primary" onClick={() => onPray(soul)}>
                            <HandHeart className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 text-primary" onClick={() => onMessage(soul)}>
                            <MessageSquare className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted/20 text-muted-foreground hover:bg-muted/30">
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-xl text-left">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground font-black">More Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => onSelectSoul(soul)} className="text-left py-2.5">
                                    <User className="mr-2 h-4 w-4" /> View Full Identity
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
              <CollapsibleContent className="px-4 pb-4">
                  <div className="pt-3 space-y-2 text-left">
                      <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest ml-4 mb-2">Household Members</p>
                      {spouseObj && (
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-dashed ml-4 text-left">
                              <Avatar className="h-8 w-8 border">
                                  <AvatarImage src={spouseObj.photoURL || undefined} className="object-cover" />
                                  <AvatarFallback className="text-center flex items-center justify-center h-full w-full"> {spouseObj.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xs uppercase truncate leading-none">{spouseObj.firstName} {spouseObj.lastName}</p>
                                  <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Spouse</p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold" onClick={() => onSelectSoul(spouseObj)}>View Profile</Button>
                          </div>
                      )}
                      {children.map(child => (
                           <div key={child.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-dashed ml-4 text-left">
                              <Avatar className="h-8 w-8 border">
                                  <AvatarImage src={child.photoURL || undefined} className="object-cover" />
                                  <AvatarFallback className="text-center flex items-center justify-center h-full w-full"> {child.firstName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xs uppercase truncate leading-none">{child.firstName} {child.lastName}</p>
                                  <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Child</p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold" onClick={() => onSelectSoul(child)}>View Profile</Button>
                          </div>
                      ))}
                      <div className="flex gap-2 ml-4 w-[calc(100%-1rem)]">
                        <Button variant="outline" className="flex-1 h-9 rounded-xl border-dashed text-[10px] font-bold uppercase" onClick={() => onPickChild(soul, spouseObj)}>
                            <Users className="mr-1.5 h-3.5 w-3.5" /> Pick Existing Soul
                        </Button>
                        <Button variant="outline" className="flex-1 h-9 rounded-xl border-dashed text-[10px] font-bold uppercase" onClick={() => onAddChildForm(soul, spouseObj)}>
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New Record
                        </Button>
                      </div>
                  </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}

export function SoulsWonPage() {
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
  const [shareWordSoulId, setShareWordSoulId] = useState<string | null>(null);
  const [prayerSoulId, setPrayerSoulId] = useState<string | null>(null);
  const [messageSoulId, setMessageSoulId] = useState<string | null>(null);

  const [isChildSelectionOpen, setIsChildSelectionOpen] = useState(false);
  const [activeParentGroup, setActiveParentGroup] = useState<{parent: Soul, spouse?: Soul | null} | null>(null);
  const [isLinkingChild, setIsLinkingChild] = useState(false);

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
      if (age === null || age === undefined) { stats.unknown.count++; stats.unknown.list.push(soul); }
      else if (age <= 12) { stats.children.count++; stats.children.list.push(soul); }
      else if (age <= 19) { stats.teens.count++; stats.teens.list.push(soul); }
      else if (age <= 33) { stats.youngAdults.count++; stats.youngAdults.list.push(soul); }
      else if (age <= 55) { stats.adults.count++; stats.adults.list.push(soul); }
      else { stats.seniors.count++; stats.seniors.list.push(soul); }
    });
    return stats;
  }, [souls]);

  const genderStats = useMemo(() => {
    const stats = { male: { count: 0, list: [] as Soul[] }, female: { count: 0, list: [] as Soul[] }, unassigned: { count: 0, list: [] as Soul[] }, total: 0 };
    if (!souls) return stats;
    souls.forEach(soul => {
      if (soul.gender === 'Male') { stats.male.count++; stats.male.list.push(soul); }
      else if (soul.gender === 'Female') { stats.female.count++; stats.female.list.push(soul); }
      else { stats.unassigned.count++; stats.unassigned.list.push(soul); }
      stats.total++;
    });
    return stats;
  }, [souls]);

  const maritalStats = useMemo(() => {
    const stats = { married: { count: 0, list: [] as any[] }, single: { count: 0, list: [] as Soul[] }, divorced: { count: 0, list: [] as Soul[] }, widowed: { count: 0, list: [] as Soul[] }, total: 0 };
    if (!souls) return stats;
    const processedIds = new Set<string>();
    souls.forEach(soul => {
      const marital = soul.maritalStatus;
      if (marital === 'Married') {
          if (!processedIds.has(soul.id)) {
              const spouse = souls.find(other => {
                if (other.id === soul.id || other.maritalStatus !== 'Married') return false;
                const otherFull = `${other.firstName} ${other.lastName}`.toLowerCase();
                const soulFull = `${soul.firstName} ${soul.lastName}`.toLowerCase();
                const soulSpouse = (soul.spouseName || "").toLowerCase();
                const otherSpouse = (other.spouseName || "").toLowerCase();
                return (soulSpouse === otherFull || soulSpouse === other.firstName.toLowerCase()) &&
                       (otherSpouse === soulFull || otherSpouse === soul.firstName.toLowerCase());
              });
              if (spouse) { processedIds.add(spouse.id); stats.married.list.push({ ...soul, spouseRecord: spouse }); }
              else { stats.married.list.push(soul); }
              processedIds.add(soul.id);
              stats.married.count++;
          }
      } else if (marital === 'Single') { stats.single.count++; stats.single.list.push(soul); }
      else if (marital === 'Divorced') { stats.divorced.count++; stats.divorced.list.push(soul); }
      else if (marital === 'Widowed') { stats.widowed.count++; stats.widowed.list.push(soul); }
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
  const soulForWordSharing = useMemo(() => souls?.find(s => s.id === shareWordSoulId) || null, [souls, shareWordSoulId]);
  const soulForPrayer = useMemo(() => souls?.find(s => s.id === prayerSoulId) || null, [souls, prayerSoulId]);
  const soulForMessage = useMemo(() => souls?.find(s => s.id === messageSoulId) || null, [souls, messageSoulId]);

  const activeFellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), where('status', '==', 'active'));
  }, [firestore]);
  const { data: fellowships } = useCollection<Fellowship>(activeFellowshipsQuery);

  const activeCampaignsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'campaigns'), where('organizerId', '==', user.uid), where('status', '==', 'active'));
  }, [user?.uid, firestore]);
  const { data: campaigns } = useCollection<Campaign>(activeCampaignsQuery);

  const { userProfile: profileData, loading: profileLoading } = useUserProfile();

  const handleOpenFollowUp = useCallback((s: Soul) => setFollowUpSoulId(s.id), []);
  const handleOpenHistory = useCallback((s: Soul) => setHistorySoulId(s.id), []);
  const handleOpenAssign = useCallback((s: Soul) => setAssignSoulId(s.id), []);
  const handleOpenEdit = useCallback((s: Soul) => setEditSoulId(s.id), []);
  const handleOpenDelete = useCallback((s: Soul) => setDeleteSoulId(s.id), []);
  const handleOpenAssessment = useCallback((s: Soul) => setAssessmentSoulId(s.id), []);

  const handleAddChildForm = useCallback((p1: Soul, p2?: Soul | null) => {
    const parentNames = [p1.firstName];
    const parentIds = [p1.id];
    if (p2) { parentNames.push(p2.firstName); parentIds.push(p2.id); }
    setLogSoulDefaults({ defaultLastName: p1.lastName, defaultLocation: p1.locationWon, defaultParentIds: parentIds, defaultParentNames: parentNames, defaultRelationship: 'Family' as any });
    setIsLogDialogOpen(true);
  }, []);

  const handleLinkExistingChild = async (child: Soul) => {
      if (!user || !firestore || !activeParentGroup || isLinkingChild) return;
      setIsLinkingChild(true);
      
      const { parent, spouse } = activeParentGroup;
      const batch = writeBatch(firestore);
      
      const parentNames = [parent.firstName];
      const parentIds = [parent.id];
      if (spouse) { parentNames.push(spouse.firstName); parentIds.push(spouse.id); }

      const childRef = doc(firestore, `users/${user.uid}/souls`, child.id);
      const globalChildRef = doc(firestore, 'souls', child.id);
      batch.update(childRef, { 
          parentIds: arrayUnion(...parentIds), 
          parentNames: arrayUnion(...parentNames),
          relationship: 'Family',
          updatedAt: serverTimestamp() 
      });
      batch.update(globalChildRef, { 
          parentIds: arrayUnion(...parentIds), 
          parentNames: arrayUnion(...parentNames),
          relationship: 'Family',
          updatedAt: serverTimestamp() 
      });

      parentIds.forEach(pId => {
          const pRef = doc(firestore, `users/${user.uid}/souls`, pId);
          const gpRef = doc(firestore, 'souls', pId);
          batch.update(pRef, { childrenIds: arrayUnion(child.id), updatedAt: serverTimestamp() });
          batch.update(gpRef, { childrenIds: arrayUnion(child.id), updatedAt: serverTimestamp() });
      });

      try {
          await batch.commit();
          toast({ title: 'Household Updated', description: `${child.firstName} is now linked to the household.` });
          setIsChildSelectionOpen(false);
          setActiveParentGroup(null);
      } catch (error) {
          toast({ variant: 'destructive', title: 'Update Failed' });
      } finally {
          setIsLinkingChild(false);
      }
  };

  const handleExportHistory = async (formatType: 'csv' | 'pdf') => {
    if (!souls || souls.length === 0) return;
    const headers = ["First Name", "Last Name", "Gender", "Status", "Won At", "Source", "Phone", "Email", "City", "Country"];
    const body = souls.map(s => [s.firstName, s.lastName || '', s.gender || 'N/A', s.status, s.wonAt ? format(s.wonAt.toDate(), 'yyyy-MM-dd') : 'N/A', s.source, s.phone || 'N/A', s.email || 'N/A', s.locationWon?.city || 'N/A', s.locationWon?.country || 'N/A']);
    if (formatType === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const docObj = new jsPDF({ orientation: 'landscape' });
        docObj.setFontSize(22);
        docObj.text("Soul Winning Harvest", 14, 20);
        autoTable(docObj, { head: [headers], body: body, startY: 25, headStyles: { fillColor: [249, 116, 22] } });
        docObj.save(`harvest-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const { default: Papa } = await import('papaparse');
        const csv = Papa.unparse({ fields: headers, data: body });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `harvest-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
  };

  const handleExportSingleSoul = useCallback(async (s: Soul, formatType: 'csv' | 'pdf') => {
    const wonAt = safeToDate(s.wonAt);
    const data = [
        ["Attribute", "Information"],
        ["First Name", s.firstName],
        ["Last Name", s.lastName || ''],
        ["Gender", s.gender || 'N/A'],
        ["Status", s.status],
        ["Date Won", wonAt ? format(wonAt, 'PPP') : 'N/A'],
        ["Source", s.source],
        ["Phone", s.phone || 'N/A'],
        ["Email", s.email || 'N/A'],
        ["Home Church", s.church || 'N/A'],
        ["Location", [s.locationWon?.city, s.locationWon?.state, s.locationWon?.country].filter(Boolean).join(', ') || 'N/A']
    ];

    if (formatType === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const docObj = new jsPDF();
        docObj.setFontSize(18);
        docObj.text(`Kingdom Identity Profile`, 14, 15);
        docObj.setFontSize(10);
        docObj.text(`Name: ${s.firstName} ${s.lastName || ''}`, 14, 25);
        autoTable(docObj, {
            body: data.slice(1),
            startY: 30,
            head: [data[0]],
            theme: 'striped',
            headStyles: { fillColor: [249, 116, 22] },
            styles: { font: 'helvetica' }
        });
        docObj.save(`record-${s.firstName.toLowerCase()}.pdf`);
    } else {
        const { default: Papa } = await import('papaparse');
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `record-${s.firstName.toLowerCase()}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
  }, []);

  const handleAssignGroup = (s: Soul, fellowshipId: string, groupType: 'Fellowship' | 'Association') => {
    if (!user || !firestore) return;
    const soulRef = doc(firestore, `users/${s.userId}/souls`, s.id);
    const globalSoulRef = doc(firestore, 'souls', s.id);
    const selectedGroup = fellowships?.find(f => f.id === fellowshipId);
    const updateData: { [key: string]: any } = { updatedAt: serverTimestamp() };
    if (fellowshipId === 'none') {
        if (groupType === 'Association') { updateData.associationId = deleteField(); updateData.associationName = deleteField(); }
        else { updateData.fellowshipId = deleteField(); updateData.fellowshipName = deleteField(); }
    } else if (selectedGroup) {
        if (groupType === 'Association') { updateData.associationId = selectedGroup.id; updateData.associationName = selectedGroup.name; }
        else { updateData.fellowshipId = selectedGroup.id; updateData.fellowshipName = selectedGroup.name; }
    }
    updateDoc(soulRef, updateData).then(() => { updateDoc(globalSoulRef, updateData); toast({ title: "Community Assignment Updated" }); setAssignSoulId(null); });
  };

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    const term = searchTerm.toLowerCase();
    return souls.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) || (s.nickname && s.nickname.toLowerCase().includes(term)) || (s.phone && s.phone.toLowerCase().includes(term)));
  }, [souls, searchTerm]);

  const handleDeleteSoul = () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, `users/${user.uid}/souls`, soulToDelete.id));
    batch.delete(doc(firestore, 'souls', soulToDelete.id));
    batch.commit().then(() => { toast({ title: "Record Removed" }); setIsDeleting(false); setDeleteSoulId(null); }).catch(() => { toast({ variant: 'destructive', title: "Delete Failed" }); setIsDeleting(false); });
  };

  return (
    <div className="w-full max-w-7xl mx-auto text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            <div className="lg:col-span-8 space-y-10 pb-32">
                <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase">MY HARVEST</h1>
                                <Badge variant="secondary" className="h-7 sm:h-9 px-3 rounded-full font-black text-xs sm:text-sm bg-primary/10 text-primary border-primary/20 shrink-0">{totalSoulsCount}</Badge>
                            </div>
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
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground font-black">Select Format</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleExportHistory('csv')} className="py-2.5">
                                        <Download className="mr-2 h-4 w-4 opacity-40" /> CSV (Excel)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleExportHistory('pdf')} className="py-2.5">
                                        <Download className="mr-2 h-4 w-4 text-primary" /> PDF Report
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => { setLogSoulDefaults({}); setIsLogDialogOpen(true); }} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 flex-1 sm:flex-none">
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
                        <div className="overflow-hidden relative w-full" onMouseEnter={() => setIsGalleryPaused(true)} onMouseLeave={() => setIsGalleryPaused(false)}>
                            <motion.div className="flex gap-4 w-max" animate={{ x: isGalleryPaused ? undefined : ["0%", "-33.3333333%"] }} transition={{ x: { duration: 30, repeat: Infinity, ease: "linear", repeatType: "loop" } }}>
                                {duplicatedSouls.map((s, idx) => (
                                    <div key={`${s.id}-${idx}`} className="basis-[140px] sm:basis-[180px] shrink-0">
                                        <div onClick={() => setShareWordSoulId(s.id)} className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-background shadow-xl cursor-pointer group active:scale-[0.98] transition-all">
                                            <NextImage src={s.photoURL!} alt={s.firstName} fill className="object-cover transition-transform group-hover:scale-110 duration-500" unoptimized />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3 text-white">
                                                <p className="font-black text-[10px] sm:text-xs uppercase truncate tracking-tight">
                                                    {s.nickname || s.firstName} {s.age && <span className="opacity-60 font-bold ml-1">({s.age})</span>}
                                                </p>
                                                <Badge className={cn("text-white h-3.5 px-1 text-[7px] font-black uppercase border-none mt-1 shadow-sm", getStatusClasses(s.status))}>{s.status}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                )}

                <div className="px-4 sm:px-0 space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20"><BarChart3 className="h-5 w-5 text-primary" /></div>
                            <div className="min-w-0"><h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">DEMOGRAPHICS</h2><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Age Analysis</p></div>
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
                                            <div key={group.label} className={cn("space-y-3 p-4 rounded-2xl bg-background shadow-sm border group transition-all cursor-pointer relative overflow-hidden", "hover:border-primary/20")} onClick={() => setSelectedFilterGroup({ type: 'age', value: group.label })}>
                                                <div className="flex items-center justify-between"><div className="h-8 w-8 rounded-xl bg-muted/5 flex items-center justify-center transition-colors group-hover:bg-primary/10"><Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><span className="font-black text-lg text-primary tracking-tighter">{group.count}</span></div>
                                                <div className="space-y-1"><div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground"><span>{group.label}</span><span>{Math.round(percent)}%</span></div><Progress value={percent} className="h-1.5 bg-muted" indicatorClassName={group.color} /></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20"><Users className="h-5 w-5 text-primary" /></div>
                            <div className="min-w-0"><h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">GENDER BALANCE</h2><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Kingdom Workforce Diversity</p></div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {[ { label: 'Male', count: genderStats.male.count, color: 'bg-blue-600' }, { label: 'Female', count: genderStats.female.count, color: 'bg-rose-500' }, { label: 'Not Assigned', count: genderStats.unassigned.count, color: 'bg-slate-400' } ].map(stat => {
                                        const percent = genderStats.total > 0 ? (stat.count / genderStats.total) * 100 : 0;
                                        return (
                                            <div key={stat.label} className="space-y-3 p-6 rounded-2xl bg-background shadow-sm border text-left cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98]" onClick={() => setSelectedFilterGroup({ type: 'gender', value: stat.label })}>
                                                <div className="flex justify-between items-baseline"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p><span className="text-2xl font-black text-primary tracking-tighter">{stat.count}</span></div>
                                                <div className="space-y-1.5"><Progress value={percent} className="h-2 bg-muted" indicatorClassName={stat.color} /><p className="text-right text-[9px] font-black text-muted-foreground/60 uppercase">{Math.round(percent)}% OF HARVEST</p></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20"><Heart className="h-5 w-5 text-primary" /></div>
                            <div className="min-w-0"><h2 className="text-xl font-black font-headline uppercase tracking-tight leading-tight">MARITAL DEMOGRAPHICS</h2><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Family & Status Insights</p></div>
                        </div>
                        <Card className="rounded-[2rem] bg-muted/20 border-none shadow-inner overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[ { label: 'Families', count: maritalStats.married.count, color: 'bg-emerald-500', icon: Target }, { label: 'Singles', count: maritalStats.single.count, color: 'bg-primary', icon: Sparkles }, { label: 'Divorced', count: maritalStats.divorced.count, color: 'bg-slate-500', icon: HelpCircle }, { label: 'Widowers', count: maritalStats.widowed.count, color: 'bg-indigo-600', icon: Award } ].map(stat => {
                                        const percent = totalSoulsCount > 0 ? (stat.count / totalSoulsCount) * 100 : 0;
                                        return (
                                            <div key={stat.label} className="space-y-3 p-5 rounded-2xl bg-background shadow-sm border text-left cursor-pointer hover:border-primary/20 transition-all active:scale-[0.98]" onClick={() => setSelectedFilterGroup({ type: 'marital', value: stat.label })}>
                                                <div className="flex justify-between items-center"><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p><span className="text-xl font-black text-primary tracking-tighter">{stat.count}</span></div>
                                                <div className="space-y-1.5"><Progress value={percent} className="h-1.5 bg-muted" indicatorClassName={stat.color} /><p className="text-[8px] font-black text-muted-foreground/40 uppercase">{Math.round(percent)}%</p></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="px-4 sm:px-0"><RelationshipCircleTracker souls={souls || []} campaigns={campaigns || []} fellowships={fellowships || []} className="rounded-3xl" /></div>
                <div className="px-4 sm:px-0"><SoulsImportTemplateCard /></div>

                <div className="-mx-4 sm:mx-0">
                    <SoulsWonTableLazy 
                        souls={filteredSouls || []} 
                        allSouls={souls || []}
                        loading={soulsLoading}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onFollowUp={handleOpenFollowUp}
                        onViewHistory={handleOpenHistory}
                        onExportSingle={handleExportSingleSoul}
                        onOpenAssignDialog={handleOpenAssign}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                        onAssess={handleOpenAssessment}
                        onAddChild={handleAddChildForm}
                    />
                </div>
            </div>

            <div className="lg:col-span-4"><FeedSidebar mode="harvest" /></div>
        </div>

        {mounted && (
            isMobile ? (
                <Drawer open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DrawerContent className="h-[85dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-4 sm:p-8 border-b flex-shrink-0 bg-muted/10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Harvest Demographic</span>
                                    </div>
                                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left">
                                        <DrawerTitle className="text-2xl font-black font-headline uppercase leading-tight">{selectedFilterGroup?.value} Directory</DrawerTitle>
                                        <DrawerDescription className="text-sm font-medium mt-1">Converts within the {selectedFilterGroup?.value?.toLowerCase()} demographic.</DrawerDescription>
                                    </DrawerHeader>
                                </div>
                                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60 hover:text-foreground" onClick={() => setSelectedFilterGroup(null)}>
                                    <X className="h-5 w-5 text-left" />
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-4 sm:p-8">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(s) => { setSelectedFilterGroup(null); setSelectedId(s.id); }} 
                                  onPickChild={(parent, spouse) => { setSelectedFilterGroup(null); setActiveParentGroup({parent, spouse}); setIsChildSelectionOpen(true); }}
                                  onAddChildForm={handleAddChildForm}
                                  onShareWord={(s) => { setSelectedFilterGroup(null); setShareWordSoulId(s.id); }}
                                  onPray={(s) => { setSelectedFilterGroup(null); setPrayerSoulId(s.id); }}
                                  onMessage={(s) => { setSelectedFilterGroup(null); setMessageSoulId(s.id); }}
                                />
                            </div>
                        </ScrollArea>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={!!selectedFilterGroup} onOpenChange={(open) => !open && setSelectedFilterGroup(null)}>
                    <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                        <div className="p-8 border-b bg-muted/10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Demographic View</span>
                                    </div>
                                    <DialogHeader className="text-left p-0">
                                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{selectedFilterGroup?.value} Directory</DialogTitle>
                                        <DialogDescription className="text-sm font-medium">Viewing all souls within this demographic group.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60" onClick={() => setSelectedFilterGroup(null)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="max-h-[60vh]">
                            <div className="p-4 sm:p-8">
                                <FilteredSoulList 
                                  souls={activeFilteredSouls} 
                                  allSouls={souls || []}
                                  onSelectSoul={(s) => { setSelectedFilterGroup(null); setSelectedId(s.id); }} 
                                  onPickChild={(parent, spouse) => { setSelectedFilterGroup(null); setActiveParentGroup({parent, spouse}); setIsChildSelectionOpen(true); }}
                                  onAddChildForm={handleAddChildForm}
                                  onShareWord={(s) => { setSelectedFilterGroup(null); setShareWordSoulId(s.id); }}
                                  onPray={(s) => { setSelectedFilterGroup(null); setPrayerSoulId(s.id); }}
                                  onMessage={(s) => { setSelectedFilterGroup(null); setMessageSoulId(s.id); }}
                                />
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )
        )}

        <LogFollowUpDialogLazy soul={soulForFollowUp} isOpen={!!followUpSoulId} onOpenChange={(isOpen) => !isOpen && setFollowUpSoulId(null)} onFollowUpLogged={() => setFollowUpSoulId(null)} userProfile={profileData} />
        <ViewHistoryDialogLazy soul={soulForHistory} isOpen={!!historySoulId} onOpenChange={(open) => !open && setHistorySoulId(null)} />
        <AssignFellowshipDialogLazy soul={soulToAssign} fellowships={fellowships || []} isOpen={!!assignSoulId} onOpenChange={(isOpen) => !isOpen && setAssignSoulId(null)} onAssignGroup={handleAssignGroup} />
        <SoulAssessmentDialogLazy soul={soulToAssess} isOpen={!!assessmentSoulId} onOpenChange={(open) => !open && setAssessmentSoulId(null)} />
        
        <ShareWordDialog 
          isOpen={!!shareWordSoulId}
          onOpenChange={(open: boolean) => !open && setShareWordSoulId(null)}
          soul={soulForWordSharing}
          onSelectVerse={(v: string) => { setShareWordSoulId(null); setSelectedId(null); }}
        />

        <IntercessionHubDialog 
          isOpen={!!prayerSoulId}
          onOpenChange={(open: boolean) => !open && setPrayerSoulId(null)}
          soul={soulForPrayer}
          onComplete={(msg: string) => { setPrayerSoulId(null); setSelectedId(null); }}
        />

        <MessageHubDialog 
          isOpen={!!messageSoulId}
          onOpenChange={(open: boolean) => !open && setMessageSoulId(null)}
          soul={soulForMessage}
          onChannelSelect={(channel: any) => { setMessageSoulId(null); setSelectedId(null); }}
        />

        <ChildSelectionDialog 
            isOpen={isChildSelectionOpen} 
            onOpenChange={setIsChildSelectionOpen} 
            souls={souls || []} 
            parent={activeParentGroup?.parent || null} 
            spouse={activeParentGroup?.spouse}
            onShareWord={(s) => { handleLinkExistingChild(s); }}
            isLoading={isLinkingChild}
        />

        <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => !open && setDeleteSoulId(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                <AlertDialogHeader className="text-left">
                    <AlertDialogTitle className="font-black text-2xl font-headline leading-tight text-left">Delete Record?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left">This will permanently remove the record from your Kingdom journal. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left">
                    <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold text-left">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-center text-left">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}Confirm Removal
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
                                <div className="flex items-center justify-between gap-4 text-left">
                                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left">
                                        <DrawerTitle className="text-2xl font-black font-headline text-left">Add New Soul</DrawerTitle>
                                        <DrawerDescription className="text-sm font-medium mt-1 text-left">Record a new life won for Christ.</DrawerDescription>
                                    </DrawerHeader>
                                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60" onClick={() => setIsLogDialogOpen(false)}>
                                        <X className="h-5 w-5 text-left" />
                                    </Button>
                                </div>
                            </div>
                            <ScrollArea className="flex-grow px-8">
                                <div className="py-8">
                                    <LogSoulFormLazy onSoulLogged={() => { setIsLogDialogOpen(false); setLogSoulDefaults({}); }} fellowships={fellowships || []} campaigns={campaigns || []} {...logSoulDefaults} />
                                </div>
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                    <Drawer open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                                <div className="flex items-center justify-between gap-4 text-left">
                                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left">
                                        <DrawerTitle className="text-2xl font-black font-headline text-left">Edit Record</DrawerTitle>
                                        <DrawerDescription className="text-sm font-medium mt-1 text-left">Update soul identity and mission details.</DrawerDescription>
                                    </DrawerHeader>
                                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60" onClick={() => setEditSoulId(null)}>
                                        <X className="h-5 w-5 text-left" />
                                    </Button>
                                </div>
                            </div>
                            <ScrollArea className="flex-grow p-8">
                                {soulToEdit && <EditSoulFormLazy soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DrawerContent>
                    </Drawer>
                </>
            ) : (
                <>
                    <Dialog open={isLogDialogOpen} onOpenChange={(open) => { setIsLogDialogOpen(open); if(!open) setLogSoulDefaults({}); }}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <div className="flex items-center justify-between gap-4">
                                    <DialogHeader className="text-left p-0">
                                        <DialogTitle className="text-2xl font-bold font-headline">Add New Soul</DialogTitle>
                                        <DialogDescription className="text-sm font-medium mt-1">Record a new life won for Christ.</DialogDescription>
                                    </DialogHeader>
                                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60" onClick={() => setIsLogDialogOpen(false)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8">
                                <LogSoulFormLazy onSoulLogged={() => { setIsLogDialogOpen(false); setLogSoulDefaults({}); }} fellowships={fellowships || []} campaigns={campaigns || []} {...logSoulDefaults} />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={!!editSoulId} onOpenChange={(open) => !open && setEditSoulId(null)}>
                        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl sm:rounded-[2rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b shrink-0 bg-muted/10">
                                <div className="flex items-center justify-between gap-4">
                                    <DialogHeader className="text-left p-0">
                                        <DialogTitle className="text-2xl font-black font-headline">Edit Record</DialogTitle>
                                        <DialogDescription className="text-sm font-medium mt-1">Update soul identity and mission details.</DialogDescription>
                                    </DialogHeader>
                                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60" onClick={() => setEditSoulId(null)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                            <ScrollArea className="max-h-[75vh] p-8">
                                {soulToEdit && <EditSoulFormLazy soul={soulToEdit} onSoulUpdated={() => setEditSoulId(null)} fellowships={fellowships || []} campaigns={campaigns || []} />}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </>
            )
        )}
        
        <Drawer open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
            <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <DrawerHeader className="text-left flex-shrink-0 p-0">
                                <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Identity Hub</span></div>
                                <DrawerTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">
                                    {souls?.find(s => s.id === selectedId)?.firstName} {souls?.find(s => s.id === selectedId)?.lastName}
                                </DrawerTitle>
                                <DrawerDescription className="text-sm font-medium mt-1">Full spiritual snapshot for the harvest workforce.</DrawerDescription>
                            </DrawerHeader>
                        </div>
                        <Button variant="outline" size="icon" className="rounded-full h-9 w-9 shrink-0 border bg-background shadow-sm text-muted-foreground/60" onClick={() => setSelectedId(null)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                <ScrollArea className="flex-grow min-h-0">
                    <div className="p-6 pb-24">
                        {selectedId && souls?.find(s => s.id === selectedId) && (
                            <SoulProfileContent 
                                soul={souls.find(s => s.id === selectedId)!} 
                                onFollowUp={handleOpenFollowUp} 
                                onViewHistory={handleOpenHistory}
                                onEdit={handleOpenEdit} 
                                onAssess={handleOpenAssessment} 
                                onOpenAssignDialog={handleOpenAssign} 
                                onExportSingle={handleExportSingleSoul} 
                                onDelete={handleOpenDelete}
                            />
                        )}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    </div>
  );
}
