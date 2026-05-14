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
  DialogTrigger 
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
import { safeToDate } from "@/lib/utils";

// Performance: Dynamically import heavy table and PDF/Export components
const SoulsWonTable = dynamic(() => import('@/components/souls/souls-won-table').then(m => m.SoulsWonTable), {
  loading: () => <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>,
  ssr: false
});

const EditSoulForm = dynamic(() => import('@/components/souls/edit-soul-form').then(m => m.EditSoulForm), { ssr: false });
const LogFollowUpDialog = dynamic(() => import('@/components/souls/log-follow-up-dialog').then(m => m.LogFollowUpDialog), { ssr: false });
const ViewHistoryDialog = dynamic(() => import('@/components/souls/view-history-dialog').then(m => m.ViewHistoryDialog), { ssr: false });
const AssignFellowshipDialog = dynamic(() => import('@/components/souls/assign-fellowship-dialog').then(m => m.AssignFellowshipDialog), { ssr: false });

export default function SoulsWonPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [soulToEdit, setSoulToEdit] = useState<Soul | null>(null);
  const [soulForFollowUp, setSoulForFollowUp] = useState<Soul | null>(null);
  const [soulForHistory, setSoulForHistory] = useState<Soul | null>(null);
  const [soulToAssign, setSoulToAssign] = useState<Soul | null>(null);
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

  const handleSoulUpdated = useCallback(() => {
    setSoulToEdit(null);
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
    const updateData: { [key: string]: any } = {};

    if (fellowshipId === 'none') {
        updateData.fellowshipId = deleteField();
        updateData.fellowshipName = deleteField();
    } else if (selectedFellowship) {
        updateData.fellowshipId = selectedFellowship.id;
        updateData.fellowshipName = selectedFellowship.name;
    } else {
        toast({ variant: "destructive", title: "Error" });
        setIsAssigning(null);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            if (oldFellowshipId && oldFellowshipId !== fellowshipId) {
                transaction.update(doc(firestore, "fellowships", oldFellowshipId), { memberCount: increment(-1) });
            }
            if (fellowshipId !== 'none' && oldFellowshipId !== fellowshipId) {
                transaction.update(doc(firestore, "fellowships", fellowshipId), { memberCount: increment(1) });
            }
            transaction.update(soulRef, updateData);
            transaction.update(globalSoulRef, updateData);
        });
        toast({ title: "Assigned" });
        setSoulToAssign(null);
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `souls/${soul.id}`, operation: 'update' }, user));
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold font-headline">Souls Won</h1>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleExport('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport('pdf')}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsLogDialogOpen(true)} disabled={loading}><PlusCircle className="h-4 w-4 md:mr-2" />Log Soul</Button>
        </div>
      </div>
      
      <SoulsWonTable 
        souls={filteredSouls || []} 
        loading={loading}
        onEdit={setSoulToEdit}
        onFollowUp={setSoulForFollowUp}
        onViewHistory={setSoulForHistory}
        onExportSingle={() => {}}
        onOpenAssignDialog={setSoulToAssign}
      />

      <Dialog open={!!soulToEdit} onOpenChange={(open) => !open && setSoulToEdit(null)}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Edit Soul</DialogTitle><DialogDescription>Update details.</DialogDescription></DialogHeader>
              {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={handleSoulUpdated} fellowships={activeFellowships} campaigns={activeCampaigns} />}
          </DialogContent>
      </Dialog>

      <LogFollowUpDialog soul={soulForFollowUp} isOpen={!!soulForFollowUp} onOpenChange={(isOpen) => !isOpen && setSoulForFollowUp(null)} onFollowUpLogged={handleFollowUpLogged} />
      <ViewHistoryDialog soul={soulForHistory} isOpen={!!soulForHistory} onOpenChange={(isOpen) => !isOpen && setSoulForHistory(null)} />
      <AssignFellowshipDialog soul={soulToAssign} fellowships={activeFellowships} isOpen={!!soulToAssign} onOpenChange={() => setSoulToAssign(null)} onAssignFellowship={handleAssignFellowship} isAssigning={isAssigning} />
      
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>Log Soul</DialogTitle></DialogHeader><LogSoulForm onSoulLogged={handleSoulLogged} fellowships={activeFellowships} campaigns={activeCampaigns} /></DialogContent>
      </Dialog>
    </div>
  );
}
