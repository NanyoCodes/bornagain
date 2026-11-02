'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Newspaper, HandHeart, Loader2, Trash2, Edit, Camera, Flame, Sparkles, X, ChevronDown, Send, Globe, Hourglass, UserPlus, PlusCircle } from 'lucide-react';
import { CreateTestimonyForm } from '@/components/testimonies/create-testimony-form';
import { TestimonyCard } from '@/components/testimonies/testimony-card';
import { PrayerRequestCard } from '@/components/prayer/PrayerRequestCard';
import { CreatePrayerRequestForm } from '@/components/prayer/CreatePrayerRequestForm';
import { KingdomAdSpot } from '@/components/testimonies/kingdom-ad-spot';
import { AdsenseAd } from '@/components/common/adsense-ad';
import { BibleGameCard } from '@/components/testimonies/bible-game-card';
import Script from 'next/script';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Testimony, PrayerRequest, UserProfile, AccountabilityRequest } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser, useDoc, useStorage } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, runTransaction, deleteField, where, getDocs } from 'firebase/firestore';
import { useSearch } from '@/context/search-context';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { haversineDistance, safeToDate, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { EditTestimonyForm } from '@/components/testimonies/edit-testimony-form';
import { EditPrayerRequestForm } from '@/components/prayer/EditPrayerRequestForm';
import { FeedSidebar } from '@/components/layout/feed-sidebar';
import { AppShell } from '@/components/layout/app-shell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function TestimoniesContent() {
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
  const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('testimonies');
  const [highlightedTestimonyId, setHighlightedTestimonyId] = React.useState<string | null>(null);

  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();

  const userDocRef = useMemo(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const partnerIds = useMemo(() => new Set(userProfile?.partnerIds || []), [userProfile?.partnerIds]);

  const requestsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'accountabilityRequests'),
      where('participantIds', 'array-contains', user.uid),
      where('status', '==', 'pending')
    );
  }, [user, firestore]);
  const { data: accountabilityRequests } = useCollection<AccountabilityRequest>(requestsQuery);

  const pendingRequestIds = useMemo(() => {
    if (!accountabilityRequests) return new Set<string>();
    return new Set(
      accountabilityRequests
        .flatMap((r) => r.participantIds)
        .filter((id) => id !== user?.uid)
    );
  }, [accountabilityRequests, user?.uid]);

  const testimoniesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'testimonies'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const prayerRequestsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'prayerRequests'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: prayerRequests, loading: loadingPrayers } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const loading = authLoading || profileLoading || loadingTestimonies || loadingPrayers;

  const [itemToDelete, setItemToDelete] = useState<{ type: 'testimony'; data: Testimony } | { type: 'prayer'; data: PrayerRequest } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testimonyToEdit, setTestimonyToEdit] = useState<Testimony | null>(null);
  const [prayerToEdit, setPrayerToEdit] = useState<PrayerRequest | null>(null);
  const [prayerToAnswer, setPrayerToAnswer] = useState<PrayerRequest | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    const initialTab = searchParams?.get('tab');
    if (initialTab === 'prayers') setActiveTab('prayers');
    return () => {
      setIsSearchVisible(false);
      setSearchTerm('');
    };
  }, [setIsSearchVisible, setSearchTerm, searchParams]);

  const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    const withMetadata = testimonies.map((testimony) => {
      const distance =
        userProfile?.location?.latitude &&
        userProfile.location?.longitude &&
        testimony.authorLocation?.latitude &&
        testimony.authorLocation?.longitude
          ? haversineDistance(
              { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
              { lat: testimony.authorLocation.latitude, lng: testimony.authorLocation.longitude }
            )
          : null;
      const isPartnerMember = partnerIds.has(testimony.authorId);
      return { ...testimony, _distance: distance, _isPartner: isPartnerMember };
    });
    const sorted = withMetadata.sort((a, b) => {
      if (a._isPartner && !b._isPartner) return -1;
      if (!a._isPartner && b._isPartner) return 1;
      if (a._distance != null && b._distance != null) {
        if (a._distance !== b._distance) return a._distance - b._distance;
      }
      if (a._distance != null) return -1;
      if (b._distance != null) return 1;
      const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
      const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
      return timeB - timeA;
    });
    if (activeTab !== 'testimonies' || !searchTerm) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter(
      (t) =>
        t.content.toLowerCase().includes(term) ||
        `${t.authorFirstName} ${t.authorLastName}`.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term)
    );
  }, [testimonies, searchTerm, activeTab, userProfile, partnerIds]);

  const interleavedTestimonies = useMemo(() => {
    const list: (Testimony & { isAd?: boolean; isGame?: boolean; adType?: 'business' | 'event' | 'adsense' })[] = [];
    filteredTestimonies.forEach((t, i) => {
      list.push(t);
      if ((i + 1) % 4 === 0) {
        const adIdx = (i + 1) / 4;
        if (adIdx % 3 === 0) {
           list.push({ id: `adsense-${i}`, isAd: true, adType: 'adsense' } as any);
        } else {
            list.push({
              id: `ad-testimony-${i}`,
              isAd: true,
              adType: adIdx % 2 === 0 ? 'event' : 'business'
            } as any);
        }
      }
      if ((i + 1) % 5 === 0) {
          list.push({ id: `game-testimony-${i}`, isGame: true } as any);
      }
    });
    return list;
  }, [filteredTestimonies]);

  const filteredPrayerRequests = useMemo(() => {
    if (!prayerRequests) return [];
    if (activeTab === 'prayers' && searchTerm) {
        const term = searchTerm.toLowerCase();
        return prayerRequests.filter(
            (req) => req.content.toLowerCase().includes(term) || req.category.toLowerCase().includes(term)
        );
    }
    return prayerRequests;
  }, [prayerRequests, searchTerm, activeTab]);

  const interleavedPrayers = useMemo(() => {
    const list: (PrayerRequest & { isAd?: boolean; isGame?: boolean; adType?: 'business' | 'event' | 'adsense' })[] = [];
    filteredPrayerRequests.forEach((p, i) => {
      list.push(p);
      if ((i + 1) % 4 === 0) {
        const adIdx = (i + 1) / 4;
        if (adIdx % 3 === 0) {
            list.push({ id: `adsense-prayer-${i}`, isAd: true, adType: 'adsense' } as any);
        } else {
            list.push({
              id: `ad-prayer-${i}`,
              isAd: true,
              adType: adIdx % 2 === 0 ? 'business' : 'event'
            } as any);
        }
      }
      if ((i + 1) % 5 === 0) {
          list.push({ id: `game-prayer-${i}`, isGame: true } as any);
      }
    });
    return list;
  }, [filteredPrayerRequests]);

  useEffect(() => {
    if (activeTab === 'testimonies') setSearchPlaceholder('Search testimonies...');
    else setSearchPlaceholder('Search prayer requests...');
  }, [activeTab, setSearchPlaceholder]);
  
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) {
      const id = hash.substring(1);
      setActiveTab('testimonies');
      setHighlightedTestimonyId(id);
    }
  }, []);

  useEffect(() => {
    if (highlightedTestimonyId && activeTab === 'testimonies' && !loadingTestimonies) {
      const element = document.getElementById(highlightedTestimonyId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-shadow', 'duration-1000');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2500);
          setHighlightedTestimonyId(null);
        }, 300);
      }
    }
  }, [highlightedTestimonyId, activeTab, loadingTestimonies]);

  const handleTestimonyCreated = () => {
    setIsTestimonyDialogOpen(false);
    setTimeout(() => setPrayerToAnswer(null), 300);
  };
  const handlePrayerRequestCreated = () => setIsPrayerDialogOpen(false);

  const handleOpenTestimonyDialog = (prayer?: PrayerRequest) => {
    if (prayer) setPrayerToAnswer(prayer);
    setIsTestimonyDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !firestore || !user) return;
    setIsDeleting(true);
    const { type, data } = itemToDelete;
    const docRef = doc(firestore, type === 'testimony' ? 'testimonies' : 'prayerRequests', data.id);
    try {
      if (type === 'testimony') {
        await runTransaction(firestore, async (transaction) => {
          const testimonySnap = await transaction.get(docRef);
          if (!testimonySnap.exists()) return;
          const testimonyData = testimonySnap.data() as Testimony;
          if (testimonyData.answeredPrayerId) {
            const prayerRef = doc(firestore, 'prayerRequests', testimonyData.answeredPrayerId);
            const prayerSnap = await transaction.get(prayerRef);
            if (prayerSnap.exists()) {
              transaction.update(prayerRef, { status: 'pending', answeredTestimonyId: deleteField() });
            }
          }
          transaction.delete(docRef);
        });
      } else await deleteDoc(docRef);
      toast({ title: `${type === 'testimony' ? 'Testimony' : 'Prayer Request'} Deleted` });
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }, user));
    } finally {
      setItemToDelete(null);
      setIsDeleting(false);
    }
  };

  const testimonyFormContent = userProfile ? (
    <CreateTestimonyForm onTestimonyCreated={handleTestimonyCreated} userProfile={userProfile} prayerRequest={prayerToAnswer} />
  ) : null;
  const prayerFormContent = <CreatePrayerRequestForm onPrayerRequestCreated={handlePrayerRequestCreated} />;

  return (
    <div className="space-y-6 md:space-y-10 w-full max-w-7xl mx-auto pt-4 text-left">
      <Script 
        async 
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5186166468494737"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
          <div
            className="bg-card border border-white/5 rounded-2xl p-2.5 flex items-center gap-3 mx-4 sm:mx-0 shadow-lg backdrop-blur-md cursor-pointer hover:bg-card/80 transition-all active:scale-[0.98]"
            onClick={() => setIsTestimonyDialogOpen(true)}
          >
            <Avatar className="h-9 w-9 border shadow-sm shrink-0 text-left">
              <AvatarImage src={user?.photoURL ?? undefined} className="object-cover text-left" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px] text-left">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left text-left">
              <p className="text-[12px] font-bold text-foreground/80 leading-tight text-left">Share God's goodness today...</p>
            </div>
            <div className="flex items-center gap-2 text-left">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="h-8 w-8 rounded-full bg-muted/40 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTestimonyDialogOpen(true);
                      }}
                    >
                      <Newspaper className="h-3.5 w-3.5 text-left" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-left">
                    <p className="text-[10px] font-black uppercase text-left">Share Testimony</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="h-8 w-8 rounded-full bg-muted/40 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPrayerDialogOpen(true);
                      }}
                    >
                      <HandHeart className="h-3.5 w-3.5 text-left" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-left">
                    <p className="text-[10px] font-black uppercase text-left">Request Prayer</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="px-4 sm:px-0 text-left">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full text-left">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/40 p-1 h-12 sm:h-14 mb-8 text-left">
                <TabsTrigger value="testimonies" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full text-center">
                  Testimonies
                </TabsTrigger>
                <TabsTrigger value="prayers" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full text-center">
                  Prayer requests
                </TabsTrigger>
              </TabsList>
              <TabsContent value="testimonies" className="outline-none text-left">
                <div className="flex flex-col gap-0 sm:gap-6 pb-24 sm:pb-12 -mx-3 sm:mx-0 w-[calc(100%+1.5rem)] sm:w-full text-left">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <Card key={i} className="flex flex-col h-full rounded-none sm:rounded-3xl border bg-card/50 backdrop-blur-sm text-left"><CardContent className="p-6 space-y-4 text-left"><Skeleton className="h-12 w-12 rounded-full text-left" /><div className="w-full space-y-2 text-left"><Skeleton className="h-4 w-1/4 text-left" /><Skeleton className="h-4 w-1/5 text-left" /></div><Skeleton className="h-5 w-3/4 text-left" /><Skeleton className="h-4 w-full text-left" /><Skeleton className="h-4 w-full text-left" /></CardContent></Card>
                    ))
                  ) : (
                    interleavedTestimonies.map((item) => (
                      item.isAd ? (
                        item.adType === 'adsense' 
                            ? <AdsenseAd key={item.id} adSlot="5186166468" />
                            : <KingdomAdSpot key={item.id} type={item.adType as any} />
                      ) : item.isGame ? (
                        <BibleGameCard key={item.id} />
                      ) : (
                        <TestimonyCard
                          key={item.id}
                          testimony={item}
                          isPartner={item._isPartner}
                          hasPendingRequest={pendingRequestIds.has(item.authorId)}
                          currentUserProfile={userProfile}
                          onDelete={() => setItemToDelete({ type: 'testimony', data: item })}
                          onEdit={() => setTestimonyToEdit(item)}
                        />
                      )
                    ))
                  )}
                  {!loading && filteredTestimonies?.length === 0 && (
                    <div className="col-span-full text-center py-32 px-8 flex flex-col items-center text-left text-left">
                      <Newspaper className="h-20 w-20 text-muted-foreground opacity-10 mb-6 text-left text-left" />
                      <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-center text-left text-left">Your Altar of Praise</h3>
                      <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm text-balance text-center text-left text-left">
                        Every miracle shared strengthens a brother. Be the first to record God's goodness in this feed!
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="prayers" className="outline-none text-left">
                <div className="flex flex-col gap-0 sm:gap-6 pb-24 sm:pb-12 -mx-3 sm:mx-0 w-[calc(100%+1.5rem)] sm:w-full text-left">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <Card key={i} className="flex flex-col h-full rounded-none sm:rounded-3xl border bg-card/50 backdrop-blur-sm text-left"><CardContent className="p-6 space-y-4 text-left"><Skeleton className="h-12 w-12 rounded-full text-left" /><div className="w-full space-y-2 text-left"><Skeleton className="h-4 w-1/4 text-left" /><Skeleton className="h-4 w-1/5 text-left" /></div><Skeleton className="h-5 w-3/4 text-left" /><Skeleton className="h-4 w-full text-left" /><Skeleton className="h-4 w-full text-left" /></CardContent></Card>
                    ))
                  ) : (
                    interleavedPrayers.map((item) => (
                      item.isAd ? (
                        item.adType === 'adsense' 
                            ? <AdsenseAd key={item.id} adSlot="5186166468" />
                            : <KingdomAdSpot key={item.id} type={item.adType as any} />
                      ) : item.isGame ? (
                        <BibleGameCard key={item.id} />
                      ) : (
                        <PrayerRequestCard
                          key={item.id}
                          prayerRequest={item}
                          onDelete={() => setItemToDelete({ type: 'prayer', data: item })}
                          onAnswerPrayer={() => handleOpenTestimonyDialog(item)}
                          onEdit={() => setPrayerToEdit(item)}
                        />
                      )
                    ))
                  )}
                  {!loading && filteredPrayerRequests?.length === 0 && (
                    <div className="col-span-full text-center py-32 px-8 flex flex-col items-center text-left text-left">
                      <HandHeart className="h-20 w-20 text-muted-foreground opacity-10 mb-6 text-left text-left" />
                      <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-center text-left text-left">United in Faith</h3>
                      <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm text-balance text-center text-left text-left">
                        No one should walk through a trial alone. Share your request with the global community.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="lg:col-span-4 text-left">
          <FeedSidebar mode="testimonies" />
        </div>
      </div>
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl text-left text-left text-left">
          <AlertDialogHeader className="text-left text-left text-left">
            <AlertDialogTitle className="font-black text-2xl font-headline tracking-tight text-left text-left">Remove from Feed?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-sm font-medium text-left text-left">
              This will permanently delete this {itemToDelete?.type}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6 text-left text-left text-left">
            <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-11 font-bold text-left text-left text-left">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left text-left text-left">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" />}Confirm Deletion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {mounted && (
        <React.Fragment>
          {isMobile ? (
            <>
              <Drawer open={!!testimonyToEdit} onOpenChange={(open) => !open && setTestimonyToEdit(null)}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-4 text-left text-left text-left">
                            <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce text-left text-left text-left" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">SWIPE DOWN TO CLOSE</span>
                        </div>
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Edit Testimony</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">Update your shared story for the community.</DrawerDescription>
                    </DrawerHeader>
                  </div>
                  <ScrollArea className="flex-grow text-left text-left text-left">
                    <div className="p-8 text-left text-left text-left">{testimonyToEdit && <EditTestimonyForm testimony={testimonyToEdit} onTestimonyUpdated={() => setTestimonyToEdit(null)} />}</div>
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
              <Drawer open={!!prayerToEdit} onOpenChange={(open) => !open && setPrayerToEdit(null)}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left text-left text-left text-left">
                      <div className="flex items-center gap-2 mb-4 text-left text-left text-left">
                        <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce text-left text-left text-left" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">SWIPE DOWN TO CLOSE</span>
                      </div>
                      <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Edit Prayer Request</DrawerTitle>
                      <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">Update your request for the Body of Christ.</DrawerDescription>
                    </DrawerHeader>
                  </div>
                  <ScrollArea className="flex-grow text-left text-left text-left">
                    <div className="p-8 text-left text-left text-left">{prayerToEdit && <EditPrayerRequestForm prayerRequest={prayerToEdit} onPrayerRequestUpdated={() => setPrayerToEdit(null)} />}</div>
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
              
              <Drawer open={isTestimonyDialogOpen} onOpenChange={(open) => !open && setIsTestimonyDialogOpen(false)}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left text-left">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10 flex-shrink-0 text-left text-left text-left">
                    <DrawerHeader className="text-left flex-shrink-0 text-left text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-4 text-left text-left text-left"><ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce text-left text-left text-left" /><span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">SWIPE DOWN TO CLOSE</span></div>
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">
                          {prayerToAnswer ? 'Record Answer' : 'Share Testimony'}
                        </DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">
                          {prayerToAnswer ? 'Share how God answered this prayer.' : 'Encourage others with what God has done.'}
                        </DrawerDescription>
                    </DrawerHeader>
                  </div>
                  <ScrollArea className="flex-grow text-left text-left text-left">
                    <div className="p-8 text-left text-left text-left">{testimonyFormContent}</div>
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
              <Drawer open={isPrayerDialogOpen} onOpenChange={(open) => !open && setIsPrayerDialogOpen(false)}>
                <DrawerContent className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10 flex-shrink-0 text-left text-left text-left">
                    <DrawerHeader className="text-left flex-shrink-0 text-left text-left text-left text-left">
                        <div className="flex items-center gap-2 mb-4 text-left text-left text-left"><ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce text-left text-left text-left" /><span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-left text-left text-left">SWIPE DOWN TO CLOSE</span></div>
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Request Prayer</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">Share your need with the global community.</DrawerDescription>
                    </DrawerHeader>
                  </div>
                  <ScrollArea className="flex-grow text-left text-left text-left">
                    <div className="p-8 text-left text-left text-left">{prayerFormContent}</div>
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            <>
              <Dialog open={!!testimonyToEdit} onOpenChange={(open) => !open && setTestimonyToEdit(null)}>
                <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left text-left text-left">
                  <div className="p-8 border-b shrink-0 bg-muted/10 text-left text-left text-left text-left text-left">
                    <DialogHeader className="text-left text-left text-left text-left text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">Edit Testimony</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left text-left">Make changes to your testimony here.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 text-left text-left text-left text-left text-left text-left text-left">
                    <div className="p-8 text-left text-left text-left text-left text-left">{testimonyToEdit && <EditTestimonyForm testimony={testimonyToEdit} onTestimonyUpdated={() => setTestimonyToEdit(null)} />}</div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog open={!!prayerToEdit} onOpenChange={(open) => !open && setPrayerToEdit(null)}>
                <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left">
                  <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left">
                    <DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left text-left">Edit Prayer Request</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left">Update the details of your request.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh] text-left text-left text-left text-left text-left text-left text-left text-left"><div className="p-8 text-left text-left text-left text-left text-left text-left text-left">{prayerToEdit && <EditPrayerRequestForm prayerRequest={prayerToEdit} onPrayerRequestUpdated={() => setPrayerToEdit(null)} />}</div></ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog open={isTestimonyDialogOpen} onOpenChange={(open) => !open && setIsTestimonyDialogOpen(false)}>
                <DialogContent className="sm:max-w-3xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left">
                  <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left">
                    <DialogHeader className="text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        <DialogTitle className="text-2xl font-bold font-headline uppercase tracking-tight text-left text-left text-left text-left text-left text-left text-left">
                          {prayerToAnswer ? 'Record Answer' : 'Share Testimony'}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left">{prayerToAnswer ? "Share how God answered this prayer request." : "Encourage others by sharing God's goodness."}</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh] text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><div className="p-8 text-left text-left text-left text-left text-left text-left text-left">{testimonyFormContent}</div></ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog open={isPrayerDialogOpen} onOpenChange={(open) => !open && setIsPrayerDialogOpen(false)}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                  <div className="p-8 border-b bg-muted/10 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <DialogHeader className="text-left text-left text-left text-left text-left text-left text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left text-left">Share Prayer Request</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left text-left text-left text-left text-left text-left text-left">Share your request with the Body of Christ.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh] text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><div className="p-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left">{prayerFormContent}</div></ScrollArea>
                </DialogContent>
              </Dialog>
            </>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

export default function TestimoniesPage() {
    return (
        <AppShell>
            <Suspense fallback={<div className="flex justify-center py-20 text-left text-left text-left text-left text-left"><Loader2 className="h-8 w-8 animate-spin text-primary text-left text-left text-left text-left text-left" /></div>}>
                <TestimoniesContent />
            </Suspense>
        </AppShell>
    );
}
