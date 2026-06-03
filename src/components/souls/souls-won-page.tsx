
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
import type { Soul, Campaign, Fellowship, UserProfile } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useDoc } from "@/firebase/firestore/use-doc";
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, writeBatch, addDoc, deleteField, where } from "firebase/firestore";
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
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  const [mounted, setMounted] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  
  // Triggers for specific records using IDs for live synchronization
  const [followUpSoulId, setFollowUpSoulId] = useState<string | null>(null);
  const [historySoulId, setHistorySoulId] = useState<string | null>(null);
  const [assignSoulId, setAssignSoulId] = useState<string | null>(null);
  const [editSoulId, setEditSoulId] = useState<string | null>(null);
  const [deleteSoulId, setDeleteSoulId] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search souls...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setIsSearchVisible, setSearchTerm, setSearchPlaceholder]);

  const isAnyModalOpen = !!(followUpSoulId || historySoulId || assignSoulId || editSoulId || deleteSoulId || isLogDialogOpen);

  useEffect(() => {
    if (!isAnyModalOpen && typeof document !== 'undefined') {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.removeAttribute('aria-hidden');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnyModalOpen]);

  const soulsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/souls`), orderBy("wonAt", "desc"));
  }, [user?.uid, firestore]);
  const { data: souls, loading: soulsLoading } = useCollection<Soul>(soulsQuery);

  // Derive live soul objects from IDs
  const soulForFollowUp = useMemo(() => souls?.find(s => s.id === followUpSoulId) || null, [souls, followUpSoulId]);
  const soulForHistory = useMemo(() => souls?.find(s => s.id === historySoulId) || null, [souls, historySoulId]);
  const soulToAssign = useMemo(() => souls?.find(s => s.id === assignSoulId) || null, [souls, assignSoulId]);
  const soulToEdit = useMemo(() => souls?.find(s => s.id === editSoulId) || null, [souls, editSoulId]);
  const soulToDelete = useMemo(() => souls?.find(s => s.id === deleteSoulId) || null, [souls, deleteSoulId]);

  const campaignsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);
  const { data: allCampaignsData } = useCollection<Campaign>(campaignsQuery);

  const campaigns = useMemo(() => {
    if (!allCampaignsData) return [];
    return allCampaignsData.filter(c => c.status === 'active');
  }, [allCampaignsData]);
  
  const fellowshipsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'fellowships'), orderBy('name', 'asc'));
  }, [firestore]);
  const { data: allFellowshipsData } = useCollection<Fellowship>(fellowshipsQuery);

  const activeFellowships = useMemo(() => {
    if (!allFellowshipsData) return [];
    return allFellowshipsData.filter(f => f.status === 'active');
  }, [allFellowshipsData]);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const loading = userLoading || soulsLoading || profileLoading;

  const handleOpenFollowUp = useCallback((soul: Soul) => setFollowUpSoulId(soul.id), []);
  const handleOpenHistory = useCallback((soul: Soul) => setHistorySoulId(soul.id), []);
  const handleOpenAssign = useCallback((soul: Soul) => setAssignSoulId(soul.id), []);
  const handleOpenEdit = useCallback((soul: Soul) => setEditSoulId(soul.id), []);
  const handleOpenDelete = useCallback((soul: Soul) => setDeleteSoulId(soul.id), []);

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


  const handleDeleteSoul = () => {
    if (!soulToDelete || !user || !firestore) return;
    setIsDeleting(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soulToDelete.id);
    const globalSoulRef = doc(firestore, 'souls', soulToDelete.id);

    const batch = writeBatch(firestore);
    batch.delete(soulRef);
    batch.delete(globalSoulRef);
    
    // Non-blocking mutation to ensure immediate UI responsiveness
    batch.commit().catch(async (serverError) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_DELETE: ${soulRef.path} & ${globalSoulRef.path}`,
                operation: 'delete',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: "Delete Failed", description: serverError.message });
        }
    });

    toast({ title: "Record Removed" });
    setIsDeleting(false);
    setDeleteSoulId(null);
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

    // Non-blocking updates
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
    
    setAssignSoulId(null);
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
    <>
      <div 
        className="space-y-6 md:space-y-12 pb-32" 
        inert={isAnyModalOpen ? true : undefined}
      >
        <Card className="border shadow-sm sm:shadow-md rounded-none sm:rounded-lg border-x-0 sm:border-x -mx-4 sm:mx-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-row items-center gap-2 sm:gap-3">
              <Button 
                  variant="outline" 
                  className="flex-1 justify-start text-left text-muted-foreground font-normal rounded-full h-10 sm:h-11 px-4 hover:bg-muted/50 transition-colors text-sm min-w-0 border-dashed"
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
      </div>

      <LogFollowUpDialog 
          soul={soulForFollowUp} 
          isOpen={!!followUpSoulId} 
          onOpenChange={(isOpen) => {
              if (!isOpen) setFollowUpSoulId(null);
          }} 
          onFollowUpLogged={() => {
            setFollowUpSoulId(null);
          }} 
      />
      
      <ViewHistoryDialog 
          soul={soulForHistory} 
          isOpen={!!historySoulId} 
          onOpenChange={(isOpen) => {
              if (!isOpen) setHistorySoulId(null);
          }} 
      />
      
      <AssignFellowshipDialog 
          soul={soulToAssign} 
          fellowships={activeFellowships || []} 
          isOpen={!!assignSoulId} 
          onOpenChange={(isOpen) => {
              if (!isOpen) setAssignSoulId(null);
          }} 
          onAssignGroup={handleAssignGroup} 
      />
      
      {mounted && isMobile ? (
        <Sheet open={!!editSoulId} onOpenChange={(open) => { if(!open) setEditSoulId(null); }}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
              <SheetHeader className="text-left">
                <SheetTitle className="text-2xl font-black font-headline">Edit Soul Record</SheetTitle>
                <SheetDescription className="text-sm">Update information for {soulToEdit?.firstName}.</SheetDescription>
              </SheetHeader>
            </div>
            <ScrollArea className="flex-grow">
              <div className="p-8">
                 {soulToEdit && (
                  <EditSoulForm 
                      soul={soulToEdit} 
                      onSoulUpdated={() => { setEditSoulId(null); }} 
                      fellowships={activeFellowships || []}
                      campaigns={campaigns || []}
                  />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!editSoulId} onOpenChange={(open) => { if(!open) setEditSoulId(null); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Edit Soul Details</DialogTitle>
                    <DialogDescription>Update information for {soulToEdit?.firstName}.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    {soulToEdit && (
                      <EditSoulForm 
                          soul={soulToEdit} 
                          onSoulUpdated={() => { setEditSoulId(null); }} 
                          fellowships={activeFellowships || []}
                          campaigns={campaigns || []}
                      />
                    )}
                </div>
            </DialogContent>
        </Dialog>
      )}

      {mounted && isMobile ? (
        <Sheet open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                    <SheetTitle className="font-black font-headline text-2xl">Log a New Soul</SheetTitle>
                    <SheetDescription className="text-sm">Record the details of the person you've ministered to.</SheetDescription>
                </SheetHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-8">
                <LogSoulForm onSoulLogged={() => {
                  setIsLogDialogOpen(false);
                }} fellowships={activeFellowships || []} campaigns={campaigns || []} />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log a New Soul</DialogTitle>
              <DialogDescription>
                  Record the details of the person you've ministered to.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <LogSoulForm onSoulLogged={() => {
                setIsLogDialogOpen(false);
              }} fellowships={activeFellowships || []} campaigns={campaigns || []} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleteSoulId} onOpenChange={(open) => { if(!open) setDeleteSoulId(null); }}>
        <AlertDialogContent className="w-[90vw] max-w-lg rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove {soulToDelete?.firstName} {soulToDelete?.lastName} from your records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSoul} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-bold">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
