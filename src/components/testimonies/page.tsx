
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Newspaper, HandHeart, Loader2, Trash2, Edit, Sparkles } from "lucide-react";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import { PrayerRequestCard } from "@/components/prayer/PrayerRequestCard";
import { CreatePrayerRequestForm } from "@/components/prayer/CreatePrayerRequestForm";
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
import { Card, CardContent } from "@/components/ui/card";
import type { Testimony, PrayerRequest, UserProfile, AccountabilityRequest } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, runTransaction, deleteField, where, getDocs, writeBatch } from "firebase/firestore";
import { useSearch } from "@/context/search-context";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { haversineDistance, safeToDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { EditTestimonyForm } from "@/components/testimonies/edit-testimony-form";
import { EditPrayerRequestForm } from "@/components/prayer/EditPrayerRequestForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeedSidebar } from "@/components/layout/feed-sidebar";

export default function TestimoniesPage() {
  const [isTestimonyDialogOpen, setIsTestimonyDialogOpen] = useState(false);
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();
  const [activeTab, setActiveTab] = useState("testimonies");
  const [highlightedTestimonyId, setHighlightedTestimonyId] = React.useState<string | null>(null);

  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
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
            .flatMap(r => r.participantIds)
            .filter(id => id !== user?.uid)
    );
  }, [accountabilityRequests, user?.uid]);

  const testimoniesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "testimonies"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const prayerRequestsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "prayerRequests"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: prayerRequests, loading: loadingPrayers } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const loading = userLoading || profileLoading || loadingTestimonies || loadingPrayers;

  const [itemToDelete, setItemToDelete] = useState<{ type: 'testimony', data: Testimony } | { type: 'prayer', data: PrayerRequest } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testimonyToEdit, setTestimonyToEdit] = useState<Testimony | null>(null);
  const [prayerToEdit, setPrayerToEdit] = useState<PrayerRequest | null>(null);
  const [prayerToAnswer, setPrayerToAnswer] = useState<PrayerRequest | null>(null);

  const isAnyModalOpen = !!(isTestimonyDialogOpen || isPrayerDialogOpen || itemToDelete || testimonyToEdit || prayerToEdit);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchTerm]);

  useEffect(() => {
    if (!firestore || !user || !testimonies || testimonies.length === 0) return;
    
    const runMigration = async () => {
      const batch = writeBatch(firestore);
      let migrationCount = 0;

      testimonies.forEach(t => {
        const rawId = t.authorId;
        if (typeof rawId !== 'string' && rawId) {
          const stringId = (rawId as any).id || (rawId as any).uid || (rawId as any).path?.split('/').pop();
          if (stringId === user.uid) {
            batch.update(doc(firestore, 'testimonies', t.id), { authorId: String(stringId) });
            migrationCount++;
          }
        }
      });

      if (migrationCount > 0) {
        try {
          await batch.commit();
        } catch (e) {
          console.error("Migration failed:", e);
        }
      }
    };

    runMigration();
  }, [firestore, user, testimonies]);

  useEffect(() => {
    if (activeTab === 'testimonies') {
      setSearchPlaceholder("Search testimonies...");
    } else {
      setSearchPlaceholder("Search prayer requests...");
    }
  }, [activeTab, setSearchPlaceholder]);
  
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) {
      const id = hash.substring(1);
      setActiveTab("testimonies");
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


  const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    
    const withMetadata = testimonies.map(testimony => {
        const distance = userProfile?.location?.latitude &&
                        userProfile.location?.longitude &&
                        testimony.authorLocation?.latitude &&
                        testimony.authorLocation?.longitude
                        ? haversineDistance(
                            { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
                            { lat: testimony.authorLocation.latitude, lng: testimony.authorLocation.longitude }
                          )
                        : null;
        
        const isPartner = partnerIds.has(testimony.authorId);
        
        return { ...testimony, _distance: distance, _isPartner: isPartner };
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
    return sorted.filter(testimony => 
      testimony.content.toLowerCase().includes(term) ||
      `${testimony.authorFirstName} ${testimony.authorLastName}`.toLowerCase().includes(term) ||
      testimony.category.toLowerCase().includes(term)
    );
  }, [testimonies, searchTerm, activeTab, userProfile, partnerIds]);

  const filteredPrayerRequests = useMemo(() => {
    if (!prayerRequests) return [];
    if (activeTab !== 'prayers' || !searchTerm) return prayerRequests;
    
    const term = searchTerm.toLowerCase();
    return prayerRequests.filter(req => 
      req.content.toLowerCase().includes(term) ||
      req.category.toLowerCase().includes(term)
    );
  }, [prayerRequests, searchTerm, activeTab]);

  const handleTestimonyCreated = () => {
    setIsTestimonyDialogOpen(false);
    setTimeout(() => setPrayerToAnswer(null), 300);
  };
  const handlePrayerRequestCreated = () => {
    setIsPrayerDialogOpen(false);
  };

  const handleOpenTestimonyDialog = (prayer?: PrayerRequest) => {
    if (prayer) {
      setPrayerToAnswer(prayer);
    }
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
                // ALL DATA FETCHING HAPPENS AT THE BEGINNING
                const testimonySnap = await transaction.get(docRef);
                if (!testimonySnap.exists()) return;
                const testimonyData = testimonySnap.data() as Testimony;

                let prayerSnap = null;
                if (testimonyData.answeredPrayerId) {
                    prayerSnap = await transaction.get(doc(firestore, 'prayerRequests', testimonyData.answeredPrayerId));
                }

                // ALL DELETIONS OR UPDATES HAPPEN AT THE END
                transaction.delete(docRef);

                if (prayerSnap && prayerSnap.exists()) {
                    transaction.update(prayerSnap.ref, {
                        status: 'pending',
                        answeredTestimonyId: deleteField()
                    });
                }
            });
        } else {
            await deleteDoc(docRef);
        }

        toast({
            title: `${type === 'testimony' ? 'Testimony' : 'Prayer Request'} Deleted`,
        });
        
    } catch (error: any) {
        console.error("Deletion failed:", error);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setItemToDelete(null);
        setIsDeleting(false);
    }
  };

  const testimonyFormContent = userProfile ? (
    <CreateTestimonyForm 
      onTestimonyCreated={handleTestimonyCreated} 
      userProfile={userProfile} 
      prayerRequest={prayerToAnswer}
    />
  ) : null;

  const prayerFormContent = (
    <CreatePrayerRequestForm onPrayerRequestCreated={handlePrayerRequestCreated} />
  );

  return (
    <div 
      className="space-y-6 md:space-y-10 w-full max-w-7xl mx-auto pt-4"
      inert={isAnyModalOpen ? true : undefined}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 text-left">
        <div className="lg:col-span-8 space-y-6 md:space-y-10">
            <Card className="border shadow-sm sm:shadow-md rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-3 sm:p-6">
                <div className="flex flex-row items-center gap-2 sm:gap-4 w-full">
                    <Button 
                    variant="outline" 
                    className="flex-1 justify-start text-left text-muted-foreground font-normal rounded-full h-10 sm:h-12 px-6 hover:bg-muted/50 transition-colors text-sm sm:text-base min-w-0 border-dashed"
                    onClick={() => setIsTestimonyDialogOpen(true)}
                    disabled={loading}
                    >
                    <span className="truncate">What has God done today?</span>
                    </Button>
                    <div className="flex items-center gap-2 shrink-0">
                    <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-10 sm:h-12 w-10 sm:w-12 rounded-full shadow-lg"
                        onClick={() => setIsTestimonyDialogOpen(true)}
                        disabled={loading}
                        title="Share Testimony"
                    >
                        < Newspaper className="h-5 w-5" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-10 sm:h-12 w-10 sm:w-12 rounded-full shadow-md bg-background"
                        onClick={() => setIsPrayerDialogOpen(true)}
                        disabled={loading}
                        title="Request Prayer"
                    >
                        <HandHeart className="h-5 w-5" />
                    </Button>
                    </div>
                </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/40 p-1 h-12 sm:h-14 mb-8">
                    <TabsTrigger value="testimonies" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full">Testimonies</TabsTrigger>
                    <TabsTrigger value="prayers" className="rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest h-full">Prayer Requests</TabsTrigger>
                </TabsList>
                
                <TabsContent value="testimonies" className="outline-none">
                    <div className="flex flex-col gap-4 w-full pb-24 sm:pb-12">
                        {loading ? (
                        [...Array(3)].map((_, i) => (
                            <Card key={i} className="flex flex-col h-full rounded-2xl border bg-card/50 backdrop-blur-sm"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
                        ))
                        ) : filteredTestimonies.map((testimony) => (
                            <TestimonyCard 
                                key={testimony.id}
                                testimony={testimony} 
                                isPartner={testimony._isPartner}
                                hasPendingRequest={pendingRequestIds.has(testimony.authorId)}
                                currentUserProfile={userProfile}
                                onDelete={() => setItemToDelete({ type: 'testimony', data: testimony })}
                                onEdit={() => setTestimonyToEdit(testimony)}
                            />
                        ))}
                        {!loading && filteredTestimonies?.length === 0 && (
                        <div className="col-span-full text-center py-32 px-8 flex flex-col items-center">
                            <Newspaper className="h-20 w-20 text-muted-foreground opacity-10 mb-6" />
                            <h3 className="text-2xl font-black font-headline uppercase tracking-tight">Your Altar of Praise</h3>
                            <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm text-balance">
                            Every miracle shared strengthens a brother. Be the first to record God's goodness in this feed!
                            </p>
                        </div>
                        )}
                    </div>
                </TabsContent>
                
                <TabsContent value="prayers" className="outline-none">
                    <div className="flex flex-col gap-4 w-full pb-24 sm:pb-12">
                        {loading ? (
                        [...Array(3)].map((_, i) => (
                            <Card key={i} className="flex flex-col h-full rounded-2xl border bg-card/50 backdrop-blur-sm"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
                        ))
                        ) : prayerRequests && prayerRequests.map((req) => (
                        <PrayerRequestCard 
                            key={req.id}
                            prayerRequest={req}
                            onDelete={() => setItemToDelete({ type: 'prayer', data: req })}
                            onAnswerPrayer={() => handleOpenTestimonyDialog(req)}
                            onEdit={() => setPrayerToEdit(req)}
                        />
                        ))}
                        {!loading && prayerRequests?.length === 0 && (
                        <div className="col-span-full text-center py-32 px-8 flex flex-col items-center">
                            <HandHeart className="h-20 w-20 text-muted-foreground opacity-10 mb-6" />
                            <h3 className="text-2xl font-black font-headline uppercase tracking-tight">United in Faith</h3>
                            <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm text-balance">
                            No one should walk through a trial alone. Share your request with the global community.
                            </p>
                        </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>

        <div className="lg:col-span-4">
            <FeedSidebar mode="testimonies" />
        </div>
      </div>
      
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl text-left">
          <AlertDialogHeader className="text-left">
              <AlertDialogTitle className="font-black text-2xl font-headline tracking-tight text-left">Remove from Feed?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium text-left">
              This will permanently delete this {itemToDelete?.type}. This action cannot be undone.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
              <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold text-left">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Deletion
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {mounted && (
        <>
          {isMobile ? (
            <>
              <Sheet open={!!testimonyToEdit} onOpenChange={(open) => !open && setTestimonyToEdit(null)}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                    <SheetHeader className="text-left">
                      <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Testimony</SheetTitle>
                      <SheetDescription className="text-sm font-medium mt-1">Update your shared story for the community.</SheetDescription>
                    </SheetHeader>
                  </div>
                  <ScrollArea className="flex-grow">
                    <div className="p-8">
                      {testimonyToEdit && <EditTestimonyForm testimony={testimonyToEdit} onTestimonyUpdated={() => setTestimonyToEdit(null)} />}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <Sheet open={!!prayerToEdit} onOpenChange={(open) => !open && setPrayerToEdit(null)}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                    <SheetHeader className="text-left">
                      <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Prayer Request</SheetTitle>
                      <SheetDescription className="text-sm font-medium mt-1">Update your request for the Body of Christ.</SheetDescription>
                    </SheetHeader>
                  </div>
                  <ScrollArea className="flex-grow">
                    <div className="p-8">
                      {prayerToEdit && <EditPrayerRequestForm prayerRequest={prayerToEdit} onPrayerRequestUpdated={() => setPrayerToEdit(null)} />}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
              
              <Sheet open={isTestimonyDialogOpen} onOpenChange={(open) => !open && setIsTestimonyDialogOpen(false)}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                    <SheetHeader className="text-left">
                      <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">{prayerToAnswer ? 'Record Miracle' : 'Share Testimony'}</SheetTitle>
                      <SheetDescription className="text-sm font-medium mt-1">{prayerToAnswer ? "Share how God answered this prayer." : "Encourage others with what God has done."}</SheetDescription>
                    </SheetHeader>
                  </div>
                  <ScrollArea className="flex-grow">
                    <div className="p-8">
                      {testimonyFormContent}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <Sheet open={isPrayerDialogOpen} onOpenChange={(open) => !open && setIsPrayerDialogOpen(false)}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                  <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                    <SheetHeader className="text-left">
                      <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Request Prayer</SheetTitle>
                      <SheetDescription className="text-sm font-medium mt-1">Share your need with the global community.</SheetDescription>
                    </SheetHeader>
                  </div>
                  <ScrollArea className="flex-grow">
                    <div className="p-8">
                      {prayerFormContent}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Dialog open={!!testimonyToEdit} onOpenChange={(open) => !open && setTestimonyToEdit(null)}>
                <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                  <div className="p-6 border-b bg-muted/10 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Edit Testimony</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">Make changes to your testimony here.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh]">
                    <div className="p-6 text-left">
                        {testimonyToEdit && <EditTestimonyForm testimony={testimonyToEdit} onTestimonyUpdated={() => setTestimonyToEdit(null)} />}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog open={!!prayerToEdit} onOpenChange={(open) => !open && setPrayerToEdit(null)}>
                <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-left">
                  <div className="p-6 border-b bg-muted/10 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Edit Prayer Request</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">Update the details of your request.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh]">
                    <div className="p-6 text-left">
                        {prayerToEdit && <EditPrayerRequestForm prayerRequest={prayerToEdit} onPrayerRequestUpdated={() => setPrayerToEdit(null)} />}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog open={isTestimonyDialogOpen} onOpenChange={(open) => !open && setIsTestimonyDialogOpen(false)}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left">
                  <div className="p-6 border-b bg-muted/10 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">{prayerToAnswer ? 'Record Answer' : 'Share Testimony'}</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">{prayerToAnswer ? "Share how God answered this prayer request." : "Encourage others by sharing God's goodness."}</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh]">
                    <div className="p-6 text-left">
                        {testimonyFormContent}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog open={isPrayerDialogOpen} onOpenChange={(open) => !open && setIsPrayerDialogOpen(false)}>
                <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl text-left">
                  <div className="p-6 border-b bg-muted/10 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Share Prayer Request</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-left">Share your request with the Body of Christ.</DialogDescription>
                    </DialogHeader>
                  </div>
                  <ScrollArea className="max-h-[70vh]">
                    <div className="p-6 text-left">
                        {prayerFormContent}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </>
          )}
        </>
      )}
    </div>
  );
}
