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
import { PlusCircle, Download, Loader2, Trash2 } from "lucide-react";
import type { Soul, Campaign, Fellowship } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp, increment, runTransaction, addDoc, deleteField, writeBatch } from "firebase/firestore";
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
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [mounted, setMounted] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  
  // Data states as source of truth for modals
  const [soulForFollowUp, setSoulForFollowUp] = useState<Soul | null>(null);
  const [soulForHistory, setSoulForHistory] = useState<Soul | null>(null);
  const [soulToAssign, setSoulToAssign] = useState<Soul | null>(null);
  const [soulToEdit, setSoulToEdit] = useState<Soul | null>(null);
  const [soulToDelete, setSoulToDelete] = useState<Soul | null>(null);

  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const { data: campaigns } = useCollection<Campaign>(campaignsQuery);
  
  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: allFellowships } = useCollection<Fellowship>(fellowshipsQuery);

  const activeFellowships = useMemo(() => allFellowships?.filter(f => f.status !== 'deleted') ?? [], [allFellowships]);
  const activeCampaigns = useMemo(() => campaigns?.filter(c => c.status !== 'deleted') ?? [], [campaigns]);

  const loading = userLoading || soulsLoading;

  // Memoized handlers to stabilize SoulsWonTable props
  const handleOpenFollowUp = useCallback((soul: Soul) => setSoulForFollowUp(soul), []);
  const handleOpenHistory = useCallback((soul: Soul) => setSoulForHistory(soul), []);
  const handleOpenAssign = useCallback((soul: Soul) => setSoulToAssign(soul), []);
  const handleOpenEdit = useCallback((soul: Soul) => setSoulToEdit(soul), []);
  const handleOpenDelete = useCallback((soul: Soul) => setSoulToDelete(soul), []);

  const handleExportHarvest = async (formatType: 'csv' | 'pdf') => {
    if (!souls || souls.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const headers = ["First Name", "Last Name", "Email", "Phone", "Church", "Source", "Status", "Date Won"];
    const body = souls.map(soul => [
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


  const handleDeleteSoul = async () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulToDelete.id);
    const globalSoulRef = doc(firestore, 'souls', soulToDelete.id);

    try {
        const batch = writeBatch(firestore);
        batch.delete(soulRef);
        batch.delete(globalSoulRef);
        
        await batch.commit();
        toast({ title: "Record Deleted", description: "The soul record has been permanently removed." });
        setSoulToDelete(null);
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: soulRef.path,
            operation: 'delete',
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleting(false);
    }
  };

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
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            
            let oldFellowshipDoc = null;
            if (oldFellowshipId && oldFellowshipId !== fellowshipId) {
                oldFellowshipDoc = await transaction.get(doc(firestore, "fellowships", oldFellowshipId));
            }
            
            let newFellowshipDoc = null;
            if (fellowshipId !== 'none' && oldFellowshipId !== fellowshipId) {
                newFellowshipDoc = await transaction.get(doc(firestore, "fellowships", fellowshipId));
            }

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
    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `souls/${soul.id}`, operation: 'update' }, user));
    } finally { setIsAssigning(null); }
  };

  const handleExportSingleSoul = useCallback(async (soul: Soul, formatType: 'csv' | 'pdf') => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const wonAtDate = safeToDate(soul.wonAt);
    const dateStr = wonAtDate ? format(wonAtDate, 'PPP') : 'N/A';

    if (formatType === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Soul Record: ${soul.firstName} ${soul.lastName}`, 14, 20);
      autoTable(doc, {
        body: [
          ["First Name", soul.firstName],
          ["Last Name", soul.lastName],
          ["Email", soul.email || 'N/A'],
          ["Phone", soul.phone || 'N/A'],
          ["Source", soul.source],
          ["Status", soul.status],
          ["Won At", dateStr],
        ],
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [249, 116, 22] }
      });
      doc.save(`soul-${soul.firstName}-${soul.lastName}.pdf`);
    } else {
      const headers = ["Field", "Value"];
      const rows = [["First Name", soul.firstName], ["Last Name", soul.lastName], ["Email", soul.email || ''], ["Phone", soul.phone || ''], ["Status", soul.status], ["Won At", dateStr]];
      const csvContent = headers.join(",") + "\n" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `soul-${soul.firstName}-${soul.lastName}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    }
  }, []);

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
    <div className="space-y-6 md:space-y-12">
      {/* Centered Interaction Box */}
      <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-lg border-x-0 sm:border-x -mx-4 sm:mx-0">
        <CardContent className="px-4 py-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
                variant="outline" 
                className="flex-1 justify-center text-muted-foreground font-normal rounded-full h-9 sm:h-11 px-3 sm:px-4 hover:bg-muted/50 transition-colors text-[11px] sm:text-sm"
                onClick={() => setIsLogDialogOpen(true)}
                disabled={loading}
            >
                <span className="truncate">
                    {loading ? "Preparing harvest list..." : "Who did you minister to today?"}
                </span>
            </Button>
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
              <div className="h-6 w-px bg-border shrink-0" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-muted-foreground hover:text-primary transition-colors py-2 sm:py-6 h-auto"
                    disabled={loading}
                  >
                    <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="text-[11px] sm:text-xs md:text-sm font-medium">Export Harvest</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleExportHarvest('csv')}>CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleExportHarvest('pdf')}>PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <div className="-mx-4 sm:mx-0">
        <SoulsWonTable 
          souls={filteredSouls || []} 
          loading={loading}
          onFollowUp={handleOpenFollowUp}
          onViewHistory={handleOpenHistory}
          onExportSingle={handleExportSingleSoul}
          onOpenAssignDialog={handleOpenAssign}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />
      </div>

      <LogFollowUpDialog 
          soul={soulForFollowUp} 
          isOpen={!!soulForFollowUp} 
          onOpenChange={(isOpen) => !isOpen && setSoulForFollowUp(null)} 
          onFollowUpLogged={() => setSoulForFollowUp(null)} 
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
          onOpenChange={(open) => !open && setSoulToAssign(null)} 
          onAssignFellowship={handleAssignFellowship} 
          isAssigning={isAssigning} 
      />
      
      <Dialog open={!!soulToEdit} onOpenChange={(open) => !open && setSoulToEdit(null)}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Edit Soul Details</DialogTitle>
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

      {mounted && isMobile ? (
        <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
            <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                    <SheetTitle className="text-xl font-bold font-headline">Log a New Soul</SheetTitle>
                    <SheetDescription className="text-xs">Record the details of the person you've ministered to.</SheetDescription>
                </SheetHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-6">
                <LogSoulForm onSoulLogged={() => setIsLogDialogOpen(false)} fellowships={activeFellowships} campaigns={activeCampaigns} />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-headline">Log a New Soul</DialogTitle>
              <DialogDescription>
                  Record the details of the person you've ministered to.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <LogSoulForm onSoulLogged={() => setIsLogDialogOpen(false)} fellowships={activeFellowships} campaigns={activeCampaigns} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!soulToDelete} onOpenChange={(open) => !open && setSoulToDelete(null)}>
        <AlertDialogContent className="w-[90vw] max-w-lg rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove {soulToDelete?.firstName} {soulToDelete?.lastName} from your records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}