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
import { PlusCircle, Download, Loader2, Target } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

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

  // Hook initialization first
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

  // Memoized variables after hooks
  const activeFellowships = useMemo(() => allFellowships?.filter(f => f.status !== 'deleted') ?? [], [allFellowships]);
  const activeCampaigns = useMemo(() => campaigns?.filter(c => c.status !== 'deleted') ?? [], [campaigns]);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search souls...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

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
            
            // --- ALL READS FIRST ---
            let oldFellowshipDoc = null;
            if (oldFellowshipId && oldFellowshipId !== fellowshipId) {
                oldFellowshipDoc = await transaction.get(doc(firestore, "fellowships", oldFellowshipId));
            }
            
            let newFellowshipDoc = null;
            if (fellowshipId !== 'none' && oldFellowshipId !== fellowshipId) {
                newFellowshipDoc = await transaction.get(doc(firestore, "fellowships", fellowshipId));
            }

            // --- ALL WRITES SECOND ---
            if (oldFellowshipDoc?.exists()) {
                transaction.update(oldFellowshipDoc.ref, { memberCount: increment(-1) });
            }
            
            if (newFellowshipDoc?.exists()) {
                transaction.update(newFellowshipDoc.ref, { memberCount: increment(1) });
            }

            transaction.update(soulRef, updateData);
            transaction.set(globalSoulRef, updateData, { merge: true });
        });

        toast({ title: "Assigned", description: "Fellowship assigned successfully." });
        setSoulToAssign(null);

        const wasNewlyAssigned = fellowshipId !== 'none' && fellowshipId !== soul.fellowshipId;
        if (wasNewlyAssigned && selectedFellowship && selectedFellowship.organizerId !== user.uid) {
            const notificationRef = collection(firestore, `users/${selectedFellowship.organizerId}/notifications`);
            const contactInfo = soul.email || soul.phone;
            await addDoc(notificationRef, {
                userId: selectedFellowship.organizerId,
                type: 'new_soul_in_fellowship',
                title: `New Member in ${selectedFellowship.name}`,
                message: `${soul.firstName} ${soul.lastName} was assigned to your fellowship. Please reach out to them${contactInfo ? ` at ${contactInfo}` : ''}.`,
                link: `/dashboard/fellowship/${selectedFellowship.id}`,
                isRead: false,
                createdAt: serverTimestamp(),
            });
        }
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
    if (!filteredSouls || filteredSouls.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const headers = ["First Name", "Last Name", "Email", "Phone", "Church", "Source", "Status", "Date Won"];
    const body = filteredSouls.map(soul => [
      soul.firstName, 
      soul.lastName, 
      soul.email || '', 
      soul.phone || '', 
      soul.church || '', 
      soul.source, 
      soul.status,
      soul.wonAt ? format(safeToDate(soul.wonAt)!, 'yyyy-MM-dd') : ''
    ]);

    if (formatType === 'pdf') {
        const docObj = new jsPDF({ orientation: 'landscape' });
        docObj.text("Souls Won Report", 14, 15);
        autoTable(docObj, { 
          head: [headers], 
          body: body, 
          startY: 20,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [249, 116, 22] }
        });
        docObj.save(`souls-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csvRows = [headers.join(",")];
        body.forEach(row => {
          csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `souls-won-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
    toast({ title: "Export Started" });
  };

  const handleExportSingleSoul = async (soul: Soul, formatType: 'csv' | 'pdf') => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const wonAtDate = safeToDate(soul.wonAt);
    const dateStr = wonAtDate ? format(wonAtDate, 'PPP') : 'N/A';

    if (formatType === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Soul Record: ${soul.firstName} ${soul.lastName}`, 14, 20);
      
      const data = [
        ["First Name", soul.firstName],
        ["Last Name", soul.lastName],
        ["Email", soul.email || 'N/A'],
        ["Phone", soul.phone || 'N/A'],
        ["Church", soul.church || 'N/A'],
        ["Source", soul.source],
        ["Status", soul.status],
        ["Won At", dateStr],
      ];

      autoTable(doc, {
        body: data,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [249, 116, 22] }
      });
      
      doc.save(`soul-${soul.firstName}-${soul.lastName}.pdf`);
    } else {
      const headers = ["Field", "Value"];
      const rows = [
        ["First Name", soul.firstName],
        ["Last Name", soul.lastName],
        ["Email", soul.email || ''],
        ["Phone", soul.phone || ''],
        ["Church", soul.church || ''],
        ["Source", soul.source],
        ["Status", soul.status],
        ["Won At", dateStr],
      ];
      
      const csvContent = headers.join(",") + "\n" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `soul-${soul.firstName}-${soul.lastName}.csv`);
      link.click();
      URL.revokeObjectURL(url);
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
    <Button variant="outline" className="flex-1 justify-center text-muted-foreground font-normal rounded-full h-9 sm:h-11 px-3 sm:px-4 hover:bg-muted/50 transition-colors text-[11px] sm:text-sm" disabled={loading}>
        {loading ? "Preparing harvest list..." : "Who did you minister to today?"}
    </Button>
  );

  return (
    <div className="space-y-8">
      {/* Facebook-style Soul Entry Box */}
      <Card className="border shadow-sm sm:shadow-md mx-[-1rem] sm:mx-0">
        <CardContent className="px-4 py-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            {triggerButton}
          </div>
          <div className="flex items-center justify-center mt-3 pt-3 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 text-muted-foreground hover:text-primary transition-colors py-2 sm:py-6 h-auto"
                onClick={() => setIsLogDialogOpen(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                )}
                <span className="text-[11px] sm:text-xs md:text-sm font-medium">Log Soul Won</span>
              </Button>
          </div>
        </CardContent>
      </Card>

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
        </div>
      </div>
      
      <SoulsWonTable 
        souls={filteredSouls || []} 
        loading={loading}
        onFollowUp={setSoulForFollowUp}
        onViewHistory={setSoulForHistory}
        onExportSingle={handleExportSingleSoul}
        onOpenAssignDialog={setSoulToAssign}
        onEdit={setSoulToEdit}
      />

      <LogFollowUpDialog 
          soul={soulForFollowUp} 
          isOpen={!!soulForFollowUp} 
          onOpenChange={(isOpen) => !isOpen && setSoulForFollowUp(null)} 
          onFollowUpLogged={handleFollowUpLogged} 
      />
      <ViewHistoryDialog 
          soul={soulForHistory} 
          isOpen={!!soulForHistory} 
          onOpenChange={(isOpen) => !isOpen && setSoulForHistory(null)} 
      />
      <AssignFellowshipDialog 
          soul={soulToAssign} 
          fellowships={activeFellowships} 
          isOpen={!!soulToAssign} 
          onOpenChange={() => setSoulToAssign(null)} 
          onAssignFellowship={handleAssignFellowship} 
          isAssigning={isAssigning} 
      />
      
      <Dialog open={!!soulToEdit} onOpenChange={(open) => !open && setSoulToEdit(null)}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Edit Soul Details</DialogTitle>
                  <DialogDescription>Update information for {soulToEdit?.firstName}.</DialogDescription>
              </DialogHeader>
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

      <Sheet open={isLogDialogOpen && isMobile} onOpenChange={setIsLogDialogOpen}>
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

      <Dialog open={isLogDialogOpen && !isMobile} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log a New Soul</DialogTitle>
            <DialogDescription>Record the details of the person you've ministered to.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
              <LogSoulForm onSoulLogged={handleSoulLogged} fellowships={activeFellowships} campaigns={activeCampaigns} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}