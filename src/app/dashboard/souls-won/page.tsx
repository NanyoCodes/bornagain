"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { SoulsWonTable } from "@/components/souls/souls-won-table";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import type { Soul, Campaign, Fellowship, UserProfile } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp, increment, runTransaction, addDoc, deleteField } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { EditSoulForm } from "@/components/souls/edit-soul-form";
import { LogFollowUpDialog } from "@/components/souls/log-follow-up-dialog";
import { ViewHistoryDialog } from "@/components/souls/view-history-dialog";
import { AssignFellowshipDialog } from "@/components/souls/assign-fellowship-dialog";


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
    setSearchPlaceholder("Search by name, phone...");
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
  
  const activeCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter(c => c.status !== 'deleted');
  }, [campaigns]);
  
  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: allFellowships, loading: loadingFellowships } = useCollection<Fellowship>(fellowshipsQuery);
  
  const activeFellowships = useMemo(() => {
    if (!allFellowships) return [];
    return allFellowships.filter(f => f.status !== 'deleted');
  }, [allFellowships]);

  const loading = userLoading || soulsLoading || loadingCampaigns || loadingFellowships;
  
  const filteredSouls = useMemo(() => {
    if (!souls) return [];
    if (!searchTerm) return souls;
    const term = searchTerm.toLowerCase();
    return souls.filter(soul => 
      `${soul.firstName} ${soul.lastName}`.toLowerCase().includes(term) ||
      (soul.phone && soul.phone.toLowerCase().includes(term)) ||
      soul.source.toLowerCase().includes(term) ||
      (soul.sourceDetails && soul.sourceDetails.toLowerCase().includes(term)) ||
      (soul.church && soul.church.toLowerCase().includes(term))
    );
  }, [souls, searchTerm]);

  const handleSoulLogged = () => {
    setIsLogDialogOpen(false);
  };

  const handleSoulUpdated = () => {
    setSoulToEdit(null);
  };
  
  const handleFollowUpLogged = () => {
    setSoulForFollowUp(null);
  };

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
        toast({ variant: "destructive", title: "Error", description: "Selected fellowship not found." });
        setIsAssigning(null);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            
            if (oldFellowshipId && oldFellowshipId !== fellowshipId) {
                const oldFellowshipRef = doc(firestore, "fellowships", oldFellowshipId);
                transaction.update(oldFellowshipRef, { memberCount: increment(-1) });
            }

            if (fellowshipId !== 'none' && oldFellowshipId !== fellowshipId) {
                const newFellowshipRef = doc(firestore, "fellowships", fellowshipId);
                transaction.update(newFellowshipRef, { memberCount: increment(1) });
            }
            
            transaction.update(soulRef, updateData);
            transaction.update(globalSoulRef, updateData);
        });

        toast({ title: "Fellowship Assigned", description: `${soul.firstName} has been assigned to ${selectedFellowship ? selectedFellowship.name : 'no fellowship'}.` });
        setSoulToAssign(null);

        const wasNewlyAssigned = fellowshipId !== 'none' && fellowshipId !== soul.fellowshipId;
        if (wasNewlyAssigned && selectedFellowship && selectedFellowship.organizerId !== user.uid) {
            const notificationRef = collection(firestore, `users/${selectedFellowship.organizerId}/notifications`);
            await addDoc(notificationRef, {
                userId: selectedFellowship.organizerId,
                type: 'new_soul_in_fellowship',
                title: `New Member in ${selectedFellowship.name}`,
                message: `${soul.firstName} ${soul.lastName} was assigned to your fellowship.`,
                link: `/dashboard/fellowship/${selectedFellowship.id}`,
                isRead: false,
                createdAt: serverTimestamp(),
            });
        }
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: `TRANSACTION:ASSIGN_FELLOWSHIP:${soul.id}`,
            operation: 'update',
            requestResourceData: updateData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsAssigning(null);
    }
  };

  const handleExport = (formatType: 'csv' | 'pdf') => {
    if (!filteredSouls || filteredSouls.length === 0) {
      toast({ variant: "destructive", title: "No Data", description: "No records found to export." });
      return;
    }
    const headers = ["Logged By", "First Name", "Last Name", "Email", "Phone", "Church", "Location Won", "Date Won", "Source", "Status"];
    const body = filteredSouls.map(soul => {
        const locationWonString = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : '';
        const wonAtDate = soul.wonAt?.toDate ? soul.wonAt.toDate() : null;
        return [user?.displayName || '', soul.firstName, soul.lastName, soul.email || '', soul.phone || '', soul.church || '', locationWonString, wonAtDate ? format(wonAtDate, "yyyy-MM-dd") : '', soul.source, soul.status];
    });

    if (formatType === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        autoTable(doc, { head: [headers], body: body, startY: 20 });
        doc.save(`souls-won-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + body.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `souls-won-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
    }
    toast({ title: "Export Started" });
  };

  const handleExportSingleSoul = useCallback((soul: Soul, formatType: 'csv' | 'pdf') => {
    const headers = ["Field", "Value"];
    const locationWonString = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : '';
    const wonAtDate = soul.wonAt?.toDate ? soul.wonAt.toDate() : null;
    
    const body = [
        ["First Name", soul.firstName],
        ["Last Name", soul.lastName],
        ["Email", soul.email || 'N/A'],
        ["Phone", soul.phone || 'N/A'],
        ["Church", soul.church || 'N/A'],
        ["Location Won", locationWonString || 'N/A'],
        ["Date Won", wonAtDate ? format(wonAtDate, "PPP") : 'N/A'],
        ["Source", soul.source],
        ["Status", soul.status],
        ["Fellowship", soul.fellowshipName || 'None']
    ];

    if (formatType === 'pdf') {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Soul Record: ${soul.firstName} ${soul.lastName}`, 14, 15);
        autoTable(doc, { body: body, startY: 25 });
        
        if (soul.followUpLog && soul.followUpLog.length > 0) {
            doc.text("Follow-up History", 14, (doc as any).lastAutoTable.finalY + 15);
            const historyHeaders = ["Date", "Member", "Notes"];
            const historyBody = soul.followUpLog.map(log => {
                const d = log.date?.toDate ? log.date.toDate() : null;
                return [d ? format(d, 'yyyy-MM-dd') : 'N/A', log.memberName || 'N/A', log.note || 'No notes'];
            });
            autoTable(doc, { head: [historyHeaders], body: historyBody, startY: (doc as any).lastAutoTable.finalY + 20 });
        }

        doc.save(`soul-${soul.firstName}-${soul.lastName}.pdf`);
    } else {
        const csvRows = body.map(row => row.join(",")).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + csvRows;
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `soul-${soul.firstName}-${soul.lastName}.csv`);
        document.body.appendChild(link);
        link.click();
    }
    toast({ title: "Export Started" });
  }, [user?.displayName, toast]);

  const triggerButton = (
    <Button disabled={!user}>
      <PlusCircle className="h-4 w-4 md:mr-2" />
      <span className="hidden md:inline">Log Soul Won</span>
    </Button>
  );

  const formContent = <LogSoulForm onSoulLogged={handleSoulLogged} fellowships={activeFellowships || []} campaigns={activeCampaigns || []} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Souls Won</h1>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Export All</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {mounted && isMobile ? (
            <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
              <SheetTrigger asChild>{triggerButton}</SheetTrigger>
              <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0">
                <div className="p-6 border-b flex-shrink-0">
                    <SheetHeader className="text-left">
                    <SheetTitle>Log a New Soul</SheetTitle>
                    <SheetDescription>Record details of the person ministered to.</SheetDescription>
                    </SheetHeader>
                </div>
                <div className="flex-grow overflow-y-auto p-6 pt-2 pb-12">
                  {formContent}
                  <Button variant="ghost" className="w-full mt-6" onClick={() => setIsLogDialogOpen(false)}>Close</Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
              <DialogTrigger asChild>{triggerButton}</DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Log a New Soul</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {formContent}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <SoulsWonTable 
        souls={filteredSouls || []} 
        loading={loading}
        onEdit={setSoulToEdit}
        onFollowUp={setSoulForFollowUp}
        onViewHistory={setSoulForHistory}
        onExportSingle={handleExportSingleSoul}
        onOpenAssignDialog={setSoulToAssign}
      />

      <Dialog open={!!soulToEdit} onOpenChange={(open) => !open && setSoulToEdit(null)}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Edit Soul Details</DialogTitle></DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {soulToEdit && <EditSoulForm soul={soulToEdit} onSoulUpdated={handleSoulUpdated} fellowships={activeFellowships} campaigns={activeCampaigns} />}
              </div>
          </DialogContent>
      </Dialog>

      <LogFollowUpDialog
          soul={soulForFollowUp}
          isOpen={!!soulForFollowUp}
          onOpenChange={(isOpen) => { if (!isOpen) setSoulForFollowUp(null); }}
          onFollowUpLogged={handleFollowUpLogged}
      />

      <ViewHistoryDialog
          soul={soulForHistory}
          isOpen={!!soulForHistory}
          onOpenChange={(isOpen) => { if (!isOpen) setSoulForHistory(null); }}
      />

      <AssignFellowshipDialog
          soul={soulToAssign}
          fellowships={activeFellowships}
          isOpen={!!soulToAssign}
          onOpenChange={() => setSoulToAssign(null)}
          onAssignFellowship={handleAssignFellowship}
          isAssigning={isAssigning}
      />
    </div>
  );
}
