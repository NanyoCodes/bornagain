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
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc, serverTimestamp, updateDoc, writeBatch, addDoc, deleteField } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { safeToDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // LIVE SOUL TRACKING: Store only the ID to prevent staleness when Firestore updates
  const [soulToAssignId, setSoulToAssignId] = useState<string | null>(null);
  const [soulToEditId, setSoulToEditId] = useState<string | null>(null);
  const [soulToDeleteId, setSoulToDeleteId] = useState<string | null>(null);

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

  // Derived "live" souls for dialogs
  const soulToAssign = useMemo(() => souls?.find(s => s.id === soulToAssignId) || null, [soulToAssignId, souls]);
  const soulToEdit = useMemo(() => souls?.find(s => s.id === soulToEditId) || null, [soulToEditId, souls]);
  const soulToDelete = useMemo(() => souls?.find(s => s.id === soulToDeleteId) || null, [soulToDeleteId, souls]);

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

  const handleOpenFollowUp = useCallback((soul: Soul) => setSoulForFollowUp(soul), []);
  const handleOpenHistory = useCallback((soul: Soul) => setSoulForHistory(soul), []);
  const handleOpenAssign = useCallback((soul: Soul) => setSoulToAssignId(soul.id), []);
  const handleOpenEdit = useCallback((soul: Soul) => setSoulToEditId(soul.id), []);
  const handleOpenDelete = useCallback((soul: Soul) => setSoulToDeleteId(soul.id), []);

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
        setSoulToDeleteId(null);
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

  const handleAssignGroup = (soul: Soul, groupId: string, groupType: 'Fellowship' | 'Association') => {
    if (!user || !firestore) return;

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);
    const selectedGroup = activeFellowships?.find(f => f.id === groupId);
    
    const updateData: { [key: string]: any } = {
        updatedAt: serverTimestamp(),
    };

    if (groupId === 'none') {
        if (groupType === 'Association') {
            updateData.associationId = deleteField();
            updateData.associationName = deleteField();
        } else {
            updateData.fellowshipId = deleteField();
            updateData.fellowshipName = deleteField();
        }
    } else if (selectedGroup) {
        if (groupType === 'Association') {
            updateData.associationId = selectedGroup.id;
            updateData.associationName = selectedGroup.name;
        } else {
            updateData.fellowshipId = selectedGroup.id;
            updateData.fellowshipName = selectedGroup.name;
        }
    }

    // NON-BLOCKING: Use optimistic background sync
    updateDoc(soulRef, updateData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: soulRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
    });

    updateDoc(globalSoulRef, updateData).catch(() => {});

    if (groupId !== 'none' && selectedGroup && selectedGroup.organizerId !== user.uid) {
        const notificationRef = collection(firestore, `users/${selectedGroup.organizerId}/notifications`);
        addDoc(notificationRef, {
            userId: selectedGroup.organizerId,
            type: 'new_soul_in_fellowship',
            title: `New Convert assigned to ${selectedGroup.name}`,
            message: `${soul.firstName} ${soul.lastName} was assigned to your group for discipleship.`,
            link: `/dashboard/fellowship/${selectedGroup.id}`,
            isRead: false,
            createdAt: serverTimestamp(),
        }).catch(() => {});
    }
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
      {/* Responsive Single-Row Interaction Box */}
      <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-lg border-x-0 sm:border-x -mx-4 sm:mx-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <Button 
                variant="outline" 
                className="flex-1 justify-start text-muted-foreground font-normal rounded-full h-10 sm:h-11 px-4 hover:bg-muted/50 transition-colors text-sm min-w-0"
                onClick={() => setIsLogDialogOpen(true)}
                disabled={loading}
            >
                <span className="truncate">
                    {loading ? "Preparing harvest list..." : "Who did you minister to today?"}
                </span>
            </Button>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-10 sm:h-11 w-10 sm:w-11 rounded-full"
                onClick={() => setIsLogDialogOpen(true)}
                disabled={loading}
                title="Log Soul"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 sm:h-11 w-10 sm:w-11 rounded-full"
                    disabled={loading}
                    title="Export Harvest"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleExportHarvest('csv')}>CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleExportHarvest('pdf')}>PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

      <footer className="pt-8 pb-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
              Glorifying God Through Technology
          </p>
      </footer>

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
          isOpen={!!soulToAssignId} 
          onOpenChange={(open) => !open && setSoulToAssignId(null)} 
          onAssignGroup={handleAssignGroup} 
      />
      
      {/* Edit Soul */}
      {mounted && isMobile ? (
        <Sheet open={!!soulToEditId} onOpenChange={(open) => !open && setSoulToEditId(null)}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
            <div className="p-6 border-b flex-shrink-0 bg-muted/10">
              <SheetHeader className="text-left">
                <SheetTitle className="text-xl font-bold">Edit Soul Record</SheetTitle>
                <SheetDescription className="text-xs">Update information for {soulToEdit?.firstName}.</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow">
              <div className="p-6">
                 {soulToEdit && (
                  <EditSoulForm 
                      soul={soulToEdit} 
                      onSoulUpdated={() => setSoulToEditId(null)} 
                      fellowships={activeFellowships}
                      campaigns={activeCampaigns}
                  />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!soulToEditId} onOpenChange={(open) => !open && setSoulToEditId(null)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Edit Soul Details</DialogTitle>
                    <DialogDescription>Update information for {soulToEdit?.firstName}.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    {soulToEdit && (
                      <EditSoulForm 
                          soul={soulToEdit} 
                          onSoulUpdated={() => setSoulToEditId(null)} 
                          fellowships={activeFellowships}
                          campaigns={activeCampaigns}
                      />
                    )}
                </div>
            </DialogContent>
        </Dialog>
      )}

      {/* Log Soul */}
      {mounted && isMobile ? (
        <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
            <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                    <SheetTitle className="font-bold font-headline text-xl">Log a New Soul</SheetTitle>
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

      <AlertDialog open={!!soulToDeleteId} onOpenChange={(open) => !open && setSoulToDeleteId(null)}>
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
