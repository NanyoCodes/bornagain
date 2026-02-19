
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Testimony } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useSearch } from "@/context/search-context";

export default function TestimoniesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();

  const testimoniesQuery = useMemo(() => !authLoading && user && firestore 
    ? query(collection(firestore, "testimonies"), orderBy("createdAt", "desc"))
    : null, [authLoading, user, firestore]);

  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search testimonies by content, author...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setMounted, setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const filteredTestimonies = useMemo(() => {
    if (!testimonies) return [];
    if (!searchTerm) return testimonies;
    const term = searchTerm.toLowerCase();

    return testimonies.filter(testimony => 
      testimony.content.toLowerCase().includes(term) ||
      testimony.authorName.toLowerCase().includes(term) ||
      testimony.category.toLowerCase().includes(term)
    );
  }, [testimonies, searchTerm]);

  const handleTestimonyCreated = () => {
    setIsDialogOpen(false);
  };
  
  const triggerButton = (
    <Button>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Share Testimony</span>
    </Button>
  );

  const formContent = <CreateTestimonyForm onTestimonyCreated={handleTestimonyCreated} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
            Testimonies
          </h1>
          <p className="text-muted-foreground">
            Read and share what God has done.
          </p>
        </div>
        {mounted && isMobile ? (
            <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <SheetTrigger asChild>{triggerButton}</SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Share Your Testimony</SheetTitle>
                  <SheetDescription>
                    Encourage others by sharing what God has done in your life. Your
                    story matters.
                  </SheetDescription>
                </SheetHeader>
                <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                    {formContent}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>{triggerButton}</DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <SheetTitle>Share Your Testimony</SheetTitle>
                  <DialogDescription>
                    Encourage others by sharing what God has done in your life. Your
                    story matters.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {formContent}
                </div>
              </DialogContent>
            </Dialog>
          )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(loading || authLoading) && (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
              <CardFooter>
                 <Skeleton className="h-8 w-24 ml-auto" />
              </CardFooter>
            </Card>
          ))
        )}
        {!(loading || authLoading) && filteredTestimonies?.map((testimony) => (
          <TestimonyCard key={testimony.id} testimony={testimony} />
        ))}
         {!(loading || authLoading) && filteredTestimonies?.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center">No testimonies found.</p>
        )}
      </div>
    </div>
  );
}
