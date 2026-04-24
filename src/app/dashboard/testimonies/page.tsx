
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle, Newspaper, HandHeart, Loader2, Award } from "lucide-react";
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
import type { Testimony, PrayerRequest, UserProfile } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
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

  // State for delete dialog
  const [itemToDelete, setItemToDelete] = useState<{ type: 'testimony' | 'prayer', id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Testimony | null>(null);
  const [prayerToAnswer, setPrayerToAnswer] = useState<PrayerRequest | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    // Placeholder will be updated by active tab effect
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
        
        // Fallback to createdAt
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
    
    const collectionName = itemToDelete.type === 'testimony' ? 'testimonies' : 'prayerRequests';
    const docRef = doc(firestore, collectionName, itemToDelete.id);
    const item = itemToDelete;
    
    // Close the dialog first to prevent race conditions on re-render
    setItemToDelete(null);

    try {
        await deleteDoc(docRef);
        toast({
            title: `${item.type === 'testimony' ? 'Testimony' : 'Prayer Request'} Deleted`,
            description: `Your ${item.name} has been successfully removed.`,
        });
    } catch (error) {
        // If the delete fails, re-open the dialog to allow the user to try again
        setItemToDelete(item);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };

  const testimonyTriggerButton = (
    <Button onClick={() => handleOpenTestimonyDialog()} disabled={loading}>
      {loading ? <Loader2 className="md:mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="md:mr-2 h-4 w-4" />}
      <span className="hidden md:inline">Share Testimony</span>
    </Button>
  );

  const prayerTriggerButton = (
    <Button onClick={() => setIsPrayerDialogOpen(true)} disabled={loading}>
      {loading ? <Loader2 className="md:mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="md:mr-2 h-4 w-4" />}
      <span className="hidden md:inline">Share Prayer Request</span>
    </Button>
  );

  const testimonyFormContent = userProfile ? <CreateTestimonyForm userProfile={userProfile} onTestimonyCreated={handleCloseTestimonyDialog} prayerRequest={prayerToAnswer} /> : <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  const prayerFormContent = userProfile ? <CreatePrayerRequestForm onPrayerRequestCreated={handlePrayerRequestCreated} /> : <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">
            Testimonies &amp; Prayer Requests
          </h1>
        </div>
        <div>
          {activeTab === 'testimonies' ? testimonyTriggerButton : prayerTriggerButton}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="testimonies">Testimonies</TabsTrigger>
              <TabsTrigger value="prayers">Prayer Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="testimonies" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading && (
                  [...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div></div></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent><CardFooter><Skeleton className="h-8 w-24 ml-auto" /></CardFooter></Card>
                  ))
                )}
                {!loading && filteredTestimonies.map((testimony) => {
                    return (
                        <TestimonyCard 
                            key={testimony.id} 
                            testimony={testimony} 
                            distance={(testimony as any)._distance}
                            onDelete={() => setItemToDelete({ type: 'testimony', id: testimony.id, name: 'testimony' })}
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
          <TabsContent value="prayers" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading && (
                  [...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader><div className="flex items-center gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="w-full space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/5" /></div></div></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent><CardFooter><Skeleton className="h-8 w-24 ml-auto" /></CardFooter></Card>
                  ))
                )}
                {!loading && filteredPrayerRequests?.map((req) => (
                  <PrayerRequestCard 
                    key={req.id} 
                    prayerRequest={req}
                    onDelete={() => setItemToDelete({ type: 'prayer', id: req.id, name: 'prayer request' })}
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
      
      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This will permanently delete this {itemToDelete.name}. This action cannot be undone.
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
      )}

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
      
      {mounted && isMobile ? (
        <Sheet open={isTestimonyDialogOpen} onOpenChange={handleCloseTestimonyDialog}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{prayerToAnswer ? 'Share Answered Prayer' : 'Share Testimony'}</SheetTitle>
              <SheetDescription>{prayerToAnswer ? "Share how God answered this prayer to encourage others." : "Encourage others by sharing what God has done."}</SheetDescription>
            </SheetHeader>
            <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">{testimonyFormContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isTestimonyDialogOpen} onOpenChange={handleCloseTestimonyDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{prayerToAnswer ? 'Share Answered Prayer' : 'Share Testimony'}</DialogTitle>
              <DialogDescription>{prayerToAnswer ? "Share how God answered this prayer to encourage others." : "Encourage others by sharing what God has done."}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">{testimonyFormContent}</div>
          </DialogContent>
        </Dialog>
      )}
      
      {mounted && isMobile ? (
        <Sheet open={isPrayerDialogOpen} onOpenChange={setIsPrayerDialogOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Share Prayer Request</SheetTitle>
              <SheetDescription>Share your request anonymously with the community.</SheetDescription>
            </SheetHeader>
            <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">{prayerFormContent}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isPrayerDialogOpen} onOpenChange={setIsPrayerDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Share Prayer Request</DialogTitle>
              <DialogDescription>Share your request anonymously with the community.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">{prayerFormContent}</div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
