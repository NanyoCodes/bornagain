
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PlusCircle } from "lucide-react";
import { SoulsWonTable } from "@/components/souls/souls-won-table";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import type { Soul } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";

export default function SoulsWonPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search by name, source, contact...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setMounted, setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading } = useCollection<Soul>(soulsQuery);

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    const term = searchTerm.toLowerCase();
    return souls.filter(soul => 
      soul.name.toLowerCase().includes(term) ||
      (soul.contact && soul.contact.toLowerCase().includes(term)) ||
      soul.source.toLowerCase().includes(term) ||
      (soul.sourceDetails && soul.sourceDetails.toLowerCase().includes(term)) ||
      (soul.church && soul.church.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  const handleSoulLogged = () => {
    setIsLogDialogOpen(false);
  };

  const handleUpdateSoul = async (soulId: string, data: Partial<Soul>) => {
    if (!user || !firestore) return;
    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulId);
    try {
      await updateDoc(soulRef, data);
    } catch (error) {
      console.error("Error updating soul: ", error);
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the record."});
    }
  };

  const triggerButton = (
    <Button disabled={!user}>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Log Soul Won</span>
    </Button>
  );

  const formContent = <LogSoulForm onSoulLogged={handleSoulLogged} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">Souls Won</h1>
          <p className="text-muted-foreground">
            Track and nurture individuals you've led to Christ.
          </p>
        </div>
        {mounted && isMobile ? (
          <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
            <SheetTrigger asChild>{triggerButton}</SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Log a New Soul</SheetTitle>
                <SheetDescription>
                  Record the details of the person you've ministered to.
                </SheetDescription>
              </SheetHeader>
              <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                {formContent}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
            <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Log a New Soul</DialogTitle>
                <DialogDescription>
                  Record the details of the person you've ministered to.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                {formContent}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <SoulsWonTable 
        souls={filteredSouls || []} 
        onUpdateSoul={handleUpdateSoul} 
        loading={loading}
      />
    </div>
  );
}
