"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { SoulsWonTable } from "@/components/souls/souls-won-table";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import type { Soul, Campaign } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function SoulsWonPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  // Fetch souls for the current user
  const soulsQuery = user ? query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc")) : null;
  const { data: souls, loading: loadingSouls } = useCollection<Soul>(soulsQuery);

  // Fetch campaigns for the form dropdown
  const campaignsQuery = query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  const { data: campaigns } = useCollection<Campaign>(campaignsQuery);


  const handleSoulLogged = () => {
    setIsLogDialogOpen(false);
  };

  const handleUpdateSoul = async (soulId: string, data: Partial<Soul>) => {
    if (!user) return;
    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulId);
    try {
      await updateDoc(soulRef, data);
    } catch (error) {
      console.error("Error updating soul: ", error);
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the record."});
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Souls Won</h1>
          <p className="text-muted-foreground">
            Track and nurture individuals you've led to Christ.
          </p>
        </div>
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!user}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Log Soul Won
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log a New Soul</DialogTitle>
              <DialogDescription>
                Record the details of the person you've ministered to.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <LogSoulForm onSoulLogged={handleSoulLogged} campaigns={campaigns || []} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <SoulsWonTable 
        souls={souls || []} 
        onUpdateSoul={handleUpdateSoul} 
        loading={loadingSouls}
      />
    </div>
  );
}
