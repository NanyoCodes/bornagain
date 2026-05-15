"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PlusCircle, Download, Loader2 } from "lucide-react";
import type { Soul, Campaign, Fellowship } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp, increment, runTransaction, addDoc, deleteField } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

// Performance: Dynamically import heavy components
const SoulsWonTable = dynamic(() => import('@/components/souls/souls-won-table').then(m => m.SoulsWonTable), {
  loading: () => <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false
});

const LogFollowUpDialog = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const ViewHistoryDialog = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const AssignFellowshipDialog = dynamic(() => import('@/components/souls/assign-fellowship-dialog').then(m => m.AssignFellowshipDialog), { ssr: false });
const LogSoulForm = dynamic(() => import('@/components/souls/log-soul-form').then(m => m.LogSoulForm), { ssr: false });
const EditSoulForm = dynamic(() => import('@/components/souls/edit-soul-form').then(m => m.EditSoulForm), { ssr: false });

export default function SoulsWonPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [soulForFollowUp, setSoulForFollowUp] = useState<Soul | null>(null);
  const [soulForHistory, setSoulForHistory] = useState<Soul | null>(null);
  const [soulToAssign, setSoulToAssign] = useState<Soul | null>(null);
  const [soulToEdit, setSoulToEdit] = useState<Soul | null>(null);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search souls...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: campaigns, loading: loadingCampaigns } = useCollection<Campaign>(campaignsQuery);
  
  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: allFellowships, loading: loadingFellowships } = useCollection<Fellowship>(fellowshipsQuery);
  
  const activeFellowships = useMemo(() => allFellowships?.filter(f => f.status !== 'deleted') ?? [], [allFellowships]);
  const activeCampaigns = useMemo(() => campaigns?.filter(c => c.status !== 'deleted') ?? [], [campaigns]);

  const loading = userLoading || soulsLoading || loadingCampaigns || loadingFellowships;

  const handleSoulLogged = useCallback(() => {
    setIsLogDialogOpen(false);
  }, []);

  const handleFollowUpLogged = useCallback(() => {
    setSoulForFollowUp(null);
  }, []);

  const handleAssignFellowship = async (soul: Soul, fellowshipId: string) => {
    if (!user || !firestore || isAssigning) return;
    setIsAssigning(fellowshipId);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    const selectedFellowship = activeFellowships?.find(f => f.id === fellowshipId);
    
    // Explicitly include userId to satisfy security rules on global record
    const updateData: { [key: string]: any } = {
        userId: user.uid,
        updatedAt: serverTimestamp(),
    };

    if (fellowshipId === 'none') {
        updateData.fellowshipId = deleteField();
        updateData.fellowshipName = deleteField();
    } else if (selectedFellowship) {
        updateData.fellowshipId = selectedFellowship.id;
        updateData.fellowshipName = selectedFellowship.name;
    } else {
        toast({ variant: "destructive", title: "Error", description: "Selected fellowship not found." });
        setIsAssigning(null);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            
            // Safer update for old fellowship
            if (oldFellowshipId && oldFellowshipId !== fellowshipId) {
                const oldRef = doc(firestore, "fellowships", oldFellowshipId);
                const oldSnap = await transaction.get(oldRef);
                if (oldSnap.exists()) {
                    transaction.update(oldRef, { memberCount: increment(-1) });
                }
            }
            
            // Safer update for new fellowship
            if (fellowshipId !== 'none' && oldFellowshipId !== fellowshipId) {
                const newFellowshipRef = doc(firestore, "fellowships", fellowshipId);
                const newSnap = await transaction.get(newFellowshipRef);
                if (newSnap.exists()) {
                    transaction.update(newRef, { memberCount: increment(1) });
                }
            }

            transaction.update(soulRef, updateData);
            // Use set with merge for global record to ensure it satisfies ownership rules
            transaction.set(globalSoulRef, updateData, { merge: true });
        });
        toast({ title: "Assigned", description: "Fellowship assigned successfully." });
        setSoulToAssign(null);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `souls/${soul.id}`, operation: 'update' }, user));
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to assign fellowship."
            });
        }
    } finally { setIsAssigning(null); }
  };

  const handleExport = async (formatType: 'csv' | 'pdf') => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    if (!filteredSouls || filteredSouls.length === 0) return;
    const headers = ["First Name", "Last Name", "Email", "Phone", "Church", "Source", "Status"];
    const body = filteredSouls.map(soul => [soul.firstName, soul.lastName, soul.email || '', soul.phone || '', soul.church || '', soul.source, soul.status]);

    if (formatType === 'pdf') {
        const docObj = new jsPDF({ orientation: 'landscape' });
        autoTable(docObj, { head: [headers], body: body, startY: 20 });
        docObj.save(`souls-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + body.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `souls-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
    }
  };

  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    const term = searchTerm.toLowerCase();
    return souls.filter(soul => 
      `${soul.firstName} ${soul.lastName}`.toLowerCase().includes(term) ||
      (soul.phone && soul.phone.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  const triggerButton = (
    <Button disabled={loading}>
      <PlusCircle className="h-4 w-4 md:mr-2" />
      <span className="hidden md:inline">Log Soul Won</span>
    </Button>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold font-headline">Souls Won</h1>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" disabled={loading}><Download className="mr-2 h-4 w-4" />Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleExport('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport('pdf')}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {mounted && isMobile ? (
            <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
              <SheetTrigger asChild>
                {triggerButton}
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
                <div className="p-6 border-b flex-shrink-0">
                    <SheetHeader className="text-left">
                        <SheetTitle>Log a New Soul</SheetTitle>
                        <SheetDescription>Record the details of the person you've ministered to.</SheetDescription>
                    </SheetHeader>
                </div>
                <div className="flex-grow overflow-y-auto p-6">
                    <LogSoulForm onSoulLogged={handleSoulLogged} fellowships={activeFellowships} campaigns={activeCampaigns} />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
              <SheetTrigger asChild>
                {triggerButton}
              </SheetTrigger>
              <DialogContent className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Log a New Soul</SheetTitle>
                  <SheetDescription>Record the details of the person you've ministered to.</SheetDescription>
                </SheetHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    <LogSoulForm onSoulLogged={handleSoulLogged} fellowships={activeFellowships} campaigns={activeCampaigns} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <SoulsWonTable 
        souls={filteredSouls || []} 
        loading={loading}
        onFollowUp={setSoulForFollowUp}
        onViewHistory={setSoulForHistory}
        onExportSingle={() => {}}
        onOpenAssignDialog={setSoulToAssign}
        onEdit={setSoulToEdit}
      />

      <LogFollowUpDialog soul={soulForFollowUp} isOpen={!!soulForFollowUp} onOpenChange={(isOpen) => !isOpen && setSoulForFollowUp(null)} onFollowUpLogged={handleFollowUpLogged} />
      <ViewHistoryDialog soul={soulForHistory} isOpen={!!soulForHistory} onOpenChange={(isOpen) => !isOpen && setSoulForHistory(null)} />
      <AssignFellowshipDialog soul={soulToAssign} fellowships={activeFellowships} isOpen={!!soulToAssign} onOpenChange={() => setSoulToAssign(null)} onAssignFellowship={handleAssignFellowship} isAssigning={isAssigning} />
      
      <Dialog open={!!soulToEdit} onOpenChange={(open) => !open && setSoulToEdit(null)}>
          <DialogContent className="sm:max-w-lg">
              <SheetHeader>
                  <SheetTitle>Edit Soul Details</SheetTitle>
                  <SheetDescription>Update information for {soulToEdit?.firstName}.</SheetDescription>
              </SheetHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {soulToEdit && (
                    <EditSoulForm 
                        soul={soulToEdit} 
                        onSoulUpdated={() => setSoulToEdit(null)} 
                        fellowships={activeFellowships}
                        campaigns={activeCampaigns}
                    />
                  )}
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}