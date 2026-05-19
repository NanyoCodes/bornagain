"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Newspaper, HandHeart, Loader2 } from "lucide-react";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import { PrayerRequestCard } from "@/components/prayer/PrayerRequestCard";
import { CreatePrayerRequestForm } from "@/components/prayer/CreatePrayerRequestForm";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import type { Testimony, PrayerRequest, UserProfile } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, runTransaction, deleteField } from "firebase/firestore";
import { useSearch } from "@/context/search-context";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { haversineDistance } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { EditTestimonyForm } from "@/components/testimonies/edit-testimony-form";

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
  
  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user?.uid, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const testimoniesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "testimonies"), orderBy("createdAt", "desc"));
  }, [firestore, user?.uid]);

  const { data: testimonies, loading: loadingTestimonies } = useCollection<Testimony>(testimoniesQuery);

  const prayerRequestsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "prayerRequests"), orderBy("createdAt", "desc"));
  }, [firestore, user?.uid]);

  const { data: prayerRequests, loading: loadingPrayers } = useCollection<PrayerRequest>(prayerRequestsQuery);

  const loading = userLoading || profileLoading || loadingTestimonies || loadingPrayers;

  const [itemToDelete, setItemToDelete] = useState<{ type: 'testimony', data: Testimony } | { type: 'prayer', data: PrayerRequest } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Testimony | null>(null);
  const [prayerToAnswer, setPrayerToAnswer] = useState<PrayerRequest | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchTerm]);

  useEffect(() => {
    if (activeTab === 'testimonies') {
      setSearchPlaceholder("Search testimonies by content, author...");
    } else {
      setSearchPlaceholder("Search prayer requests by content, category...");
    }
  }, [activeTab, setSearchPlaceholder]);
  
  useEffect(() => {
    const hash = window.location.hash;
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
    
    const withDistance = testimonies.map(testimony => {
        const distance = userProfile?.location?.latitude &&
                        userProfile.location?.longitude &&
                        testimony.authorLocation?.latitude &&
                        testimony.authorLocation?.longitude
                        ? haversineDistance(
                            { lat: userProfile.location.latitude, lng: userProfile.location.longitude },
                            { lat: testimony.authorLocation.latitude, lng: testimony.authorLocation.longitude }
                          )
                        : null;
        return { ...testimony, _distance: distance };
    });

    const sorted = withDistance.sort((a, b) => {
        if (a._distance != null && b._distance != null) {
            if (a._distance !== b._distance) return a._distance - b._distance;
        }
        if (a._distance != null) return -1;
        if (b._distance != null) return 1;
        
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
    });

    if (activeTab !== 'testimonies' || !searchTerm) return sorted;
    
    const term = searchTerm.toLowerCase();
    return sorted.filter(testimony => 
      testimony.content.toLowerCase().includes(term) ||
      `${testimony.authorFirstName} ${testimony.authorLastName}`.toLowerCase().includes(term) ||
      testimony.category.toLowerCase().includes(term)
    );
  }, [testimonies, searchTerm, activeTab, userProfile]);

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
    setPrayerToAnswer(null);
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

  const handleCloseTestimonyDialog = () => {
    setIsTestimonyDialogOpen(false);
    setPrayerToAnswer(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !firestore || !user) return;
    setIsDeleting(true);
    
    const { type, data } = itemToDelete;
    const collectionName = type === 'testimony' ? 'testimonies' : 'prayerRequests';
    const docRef = doc(firestore, collectionName, data.id);
    
    setItemToDelete(null);

    try {
        if (type === 'testimony') {
            const testimonyToDelete = data as Testimony;
            
            await runTransaction(firestore, async (transaction) => {
                const testimonyDoc = await transaction.get(docRef);
                if (!testimonyDoc.exists()) {
                    throw new Error("This testimony has already been deleted.");
                }

                transaction.delete(docRef);
                
                if (testimonyToDelete.answeredPrayerId) {
                    const prayerRef = doc(firestore, 'prayerRequests', testimonyToDelete.answeredPrayerId);
                    transaction.update(prayerRef, {
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
            description: `The item has been successfully removed.`,
        });
    } catch (error: any) {
        setItemToDelete({ type, data });
        if (error.message === "This testimony has already been deleted.") {
            toast({ variant: 'destructive', title: 'Already Deleted', description: error.message });
            return;
        }
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };

  const testimonyFormContent = userProfile ? <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={handleCloseTestimonyDialog} prayerRequest={prayerToAnswer} /> : <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  const prayerFormContent = userProfile ? <CreatePrayerRequestForm onPrayerRequestCreated={handlePrayerRequestCreated} /> : <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Centered Interaction Box */}
      <Card className="border shadow-sm sm:shadow-md">
        <CardContent className="px-4 py-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              className="flex-1 justify-center text-muted-foreground font-normal rounded-full h-9 sm:h-11 px-3 sm:px-4 hover:bg-muted/50 transition-colors text-[11px] sm:text-sm"
              onClick={() => setIsTestimonyDialogOpen(true)}
            >
              What has God done today?
            </Button>
          </div>
          <div className="flex items-center gap-0 sm:gap-4 mt-3 pt-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 text-muted-foreground hover:text-primary transition-colors py-2 sm:py-6 h-auto"
                onClick={() => setIsTestimonyDialogOpen(true)}
              >
                <Newspaper className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-[11px] sm:text-xs md:text-sm font-medium">Share Testimony</span>
              </Button>
              <div className="h-6 w-px bg-border shrink-0" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 text-muted-foreground hover:text-primary transition-colors py-2 sm:py-6 h-auto"
                onClick={() => setIsPrayerDialogOpen(true)}
              >
                <HandHeart className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-[11px] sm:text-xs md:text-sm font-medium">Share Request</span>
              </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="testimonies">Testimonies</TabsTrigger>
              <TabsTrigger value="prayers">Prayer Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="testimonies" className="mt-4 md:mt-6">
              <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading && (
                  [...Array(3)].map((_, i) => (
                    <Card key={i} className="flex flex-col h-full"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
                  ))
                )}
                {!loading && filteredTestimonies.map((testimony) => {
                    return (
                        <TestimonyCard 
                            key={testimony.id} 
                            testimony={testimony} 
                            onDelete={() => setItemToDelete({ type: 'testimony', data: testimony })}
                            onEdit={() => setItemToEdit(testimony)}
                        />
                    );
                })}
                 {!loading && filteredTestimonies?.length === 0 && (
                  <div className="col-span-full text-center py-12 flex flex-col items-center">
                    <Newspaper className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Testimonies Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Be the first to share your story and encourage the body of Christ!
                    </p>
                  </div>
                )}
              </div>
          </TabsContent>
          <TabsContent value="prayers" className="mt-4 md:mt-6">
              <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading && (
                  [...Array(3)].map((_, i) => (
                    <Card key={i} className="flex flex-col h-full"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
                  ))
                )}
                {!loading && filteredPrayerRequests?.map((req) => (
                  <PrayerRequestCard 
                    key={req.id} 
                    prayerRequest={req}
                    onDelete={() => setItemToDelete({ type: 'prayer', data: req })}
                    onAnswerPrayer={() => handleOpenTestimonyDialog(req)}
                  />
                ))}
                {!loading && filteredPrayerRequests?.length === 0 && (
                  <div className="col-span-full text-center py-12 flex flex-col items-center">
                    <HandHeart className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No Prayer Requests</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                       Be the first to share a prayer need with the community.
                    </p>
                  </div>
                )}
              </div>
          </TabsContent>
      </Tabs>
      
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent className="w-[90vw] max-w-lg rounded-lg">
          <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
              This will permanently delete this {itemToDelete?.type}. This action cannot be undone.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Deletion
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Testimony</DialogTitle>
            <DialogDescription>
              Make changes to your testimony here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {itemToEdit && <EditTestimonyForm testimony={itemToEdit} onTestimonyUpdated={() => {setItemToEdit(null); }} />}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Centered Width Dialogs */}
      <Dialog open={isTestimonyDialogOpen} onOpenChange={setIsTestimonyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{prayerToAnswer ? 'Share Answered Prayer' : 'Share Testimony'}</DialogTitle>
            <DialogDescription>{prayerToAnswer ? "Share how God answered this prayer to encourage others." : "Encourage others by sharing what God has done."}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {testimonyFormContent}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPrayerDialogOpen} onOpenChange={setIsPrayerDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Prayer Request</DialogTitle>
            <DialogDescription>Share your request anonymously with the community.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {prayerFormContent}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}