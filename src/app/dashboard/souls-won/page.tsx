
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { PlusCircle, Download, Loader2 } from "lucide-react";
import { SoulsWonTable } from "@/components/souls/souls-won-table";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import type { Soul, Campaign, Fellowship } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, writeBatch, updateDoc, runTransaction, addDoc, deleteField, serverTimestamp, increment } from "firebase/firestore";
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

export default function SoulsWonPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

  // Centralize state for all dialogs on this page
  const [soulToEdit, setSoulToEdit] = useState<Soul | null>(null);
  const [soulForFollowUp, setSoulForFollowUp] = useState<Soul | null>(null);
  const [soulForHistory, setSoulForHistory] = useState<Soul | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsSearchVisible(true);
    setSearchPlaceholder("Search by name, phone...");
    return () => {
      setIsSearchVisible(false);
      setSearchTerm("");
    };
  }, [setMounted, setIsSearchVisible, setSearchPlaceholder, setSearchTerm]);

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
  const { data: fellowships, loading: loadingFellowships } = useCollection<Fellowship>(fellowshipsQuery);

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
    setIsAssigning(true);

    const soulRef = doc(firestore, `users/${user.uid}/souls`, soul.id);
    const globalSoulRef = doc(firestore, 'souls', soul.id);

    const selectedFellowship = fellowships?.find(f => f.id === fellowshipId);
    
    const updateData: { [key: string]: any } = {};

    if (fellowshipId === 'none') {
        updateData.fellowshipId = deleteField();
        updateData.fellowshipName = deleteField();
    } else if (selectedFellowship) {
        updateData.fellowshipId = selectedFellowship.id;
        updateData.fellowshipName = selectedFellowship.name;
    } else {
        toast({ variant: "destructive", title: "Error", description: "Selected fellowship not found." });
        setIsAssigning(false);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const oldFellowshipId = soul.fellowshipId;
            
            // Decrement old fellowship count
            if (oldFellowshipId && oldFellowshipId !== fellowshipId) {
                const oldFellowshipRef = doc(firestore, "fellowships", oldFellowshipId);
                transaction.update(oldFellowshipRef, { memberCount: increment(-1) });
            }

            // Increment new fellowship count
            if (fellowshipId !== 'none' && oldFellowshipId !== fellowshipId) {
                const newFellowshipRef = doc(firestore, "fellowships", fellowshipId);
                transaction.update(newFellowshipRef, { memberCount: increment(1) });
            }
            
            transaction.update(soulRef, updateData);
            transaction.update(globalSoulRef, updateData);
        });

        toast({ title: "Fellowship Assigned", description: `${soul.firstName} has been assigned to ${selectedFellowship ? selectedFellowship.name : 'no fellowship'}.` });

        const wasNewlyAssigned = fellowshipId !== 'none' && fellowshipId !== soul.fellowshipId;
        if (wasNewlyAssigned && selectedFellowship && selectedFellowship.organizerId !== user.uid) {
            const notificationRef = collection(firestore, `users/${selectedFellowship.organizerId}/notifications`);
            const contactInfo = soul.email || soul.phone;
            await addDoc(notificationRef, {
                userId: selectedFellowship.organizerId,
                type: 'new_soul_in_fellowship',
                title: `New Member in ${selectedFellowship.name}`,
                message: `${soul.firstName} ${soul.lastName} was assigned to your fellowship. Please reach out to them${contactInfo ? ` at ${contactInfo}` : ''}.`,
                link: `/dashboard/fellowship`,
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
        setIsAssigning(false);
    }
  };


  const handleExport = (formatType: 'csv' | 'pdf') => {
    if (!filteredSouls || filteredSouls.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no records to export with the current filters.",
      });
      return;
    }

    const headers = [
      "Logged By", "First Name", "Last Name", "Email", "Phone", "Church", "Location Won", "Date Won", "Source", "Source Details", "Status",
      "Attending Church", "In Bible Study", "Attending Prayer", "In Service Dept.", "Follow Up History"
    ];

    const body = filteredSouls.map(soul => {
        const followUpHistoryString = soul.followUpLog && soul.followUpLog.length > 0
            ? [...soul.followUpLog]
                .sort((a, b) => (a.date?.toDate ? a.date.toDate().getTime() : 0) - (b.date?.toDate ? b.date.toDate().getTime() : 0)) // Sort oldest to newest
                .map(log => {
                    const date = log.date?.toDate ? format(log.date.toDate(), 'yyyy-MM-dd') : 'N/A';
                    const note = log.note || '';
                    const actions = log.actions && log.actions.length > 0 ? `Actions: ${log.actions.join(', ')}` : '';
                    const logParts = [note, actions].filter(Boolean).join(' - ');
                    return `${date}: ${logParts || 'Interaction logged.'}`;
                })
                .join('\\n')
            : 'No follow-up history.';

        const locationWonString = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : '';

        return [
            user?.displayName || '',
            soul.firstName,
            soul.lastName,
            soul.email || '',
            soul.phone || '',
            soul.church || '',
            locationWonString,
            soul.wonAt?.toDate ? format(soul.wonAt.toDate(), "yyyy-MM-dd") : '',
            soul.source,
            soul.sourceDetails || '',
            soul.status,
            soul.attendingChurch ? 'Yes' : 'No',
            soul.inBibleStudy ? 'Yes' : 'No',
            soul.attendingPrayer ? 'Yes' : 'No',
            soul.inServiceDepartment ? 'Yes' : 'No',
            followUpHistoryString
        ];
    });


    if (formatType === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        const logo = PlaceHolderImages.find((img) => img.id === 'logo');
        
        autoTable(doc, {
            head: [headers],
            body: body,
            didDrawPage: (data: any) => {
                if (logo?.imageUrl) {
                    doc.addImage(logo.imageUrl, 'JPG', data.settings.margin.left, 15, 12, 12);
                }
                doc.setFontSize(20);
                doc.text(`Souls Won Report - ${user?.displayName || ''}`, data.settings.margin.left + 15, 24);
            },
            startY: 32,
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [0, 128, 0] },
        });

        doc.save(`souls-won-${new Date().toISOString().slice(0,10)}.pdf`);
        toast({ title: "Export Started", description: "Your PDF file should begin downloading." });
        return;
    }

    const escapeCsvCell = (cellData: any): string => {
        if (cellData === null || cellData === undefined) return '';
        const stringVal = String(cellData);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };
    
    const csvRows = body.map(row => row.map(escapeCsvCell).join(','));

    const csvString = [headers.join(','), ...csvRows].join('\\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `souls-won-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
        title: "Export Started",
        description: "Your CSV file should begin downloading shortly.",
    });
  };

  const handleExportSingleSoul = (soul: Soul, formatType: 'csv' | 'pdf') => {
    if (!soul) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There is no record to export.",
      });
      return;
    }

    const headers = [
      "Logged By", "First Name", "Last Name", "Email", "Phone", "Church", "Location Won", "Date Won", "Source", "Source Details", "Status",
      "Attending Church", "In Bible Study", "Attending Prayer", "In Service Dept.", "Follow Up History"
    ];

    const followUpHistoryString = soul.followUpLog && soul.followUpLog.length > 0
        ? [...soul.followUpLog]
            .sort((a, b) => (a.date?.toDate ? a.date.toDate().getTime() : 0) - (b.date?.toDate ? b.date.toDate().getTime() : 0)) // Sort oldest to newest
            .map(log => {
                const date = log.date?.toDate ? format(log.date.toDate(), 'yyyy-MM-dd') : 'N/A';
                const note = log.note || '';
                const actions = log.actions && log.actions.length > 0 ? `Actions: ${log.actions.join(', ')}` : '';
                const logParts = [note, actions].filter(Boolean).join(' - ');
                return `${date}: ${logParts || 'Interaction logged.'}`;
            })
            .join('\\n')
        : 'No follow-up history.';

    const locationWonString = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : '';
    const fileName = `soul-${soul.firstName}-${soul.lastName}-${new Date().toISOString().slice(0,10)}`;

    if (formatType === 'pdf') {
        const doc = new jsPDF({ orientation: 'portrait' });
        const logo = PlaceHolderImages.find((img) => img.id === 'logo');
        
        const pdfBody = [
            ["Logged By", user?.displayName || ''],
            ["First Name", soul.firstName],
            ["Last Name", soul.lastName],
            ["Email", soul.email || ''],
            ["Phone", soul.phone || ''],
            ["Church", soul.church || ''],
            ["Location Won", locationWonString],
            ["Date Won", soul.wonAt?.toDate ? format(soul.wonAt.toDate(), "yyyy-MM-dd") : ''],
            ["Source", soul.source],
            ["Source Details", soul.sourceDetails || ''],
            ["Status", soul.status],
            ["Attending Church", soul.attendingChurch ? 'Yes' : 'No'],
            ["In Bible Study", soul.inBibleStudy ? 'Yes' : 'No'],
            ["Attending Prayer", soul.attendingPrayer ? 'Yes' : 'No'],
            ["In Service Dept.", soul.inServiceDepartment ? 'Yes' : 'No'],
            ["Follow Up History", followUpHistoryString],
        ];

        autoTable(doc, {
            body: pdfBody,
            didDrawPage: (data: any) => {
                if (logo?.imageUrl) {
                    doc.addImage(logo.imageUrl, 'JPG', data.settings.margin.left, 15, 12, 12);
                }
                doc.setFontSize(20);
                doc.text(`Soul Record - ${soul.firstName} ${soul.lastName}`, data.settings.margin.left + 15, 24);
            },
            startY: 32,
            theme: 'striped',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 'auto' },
            },
        });

        doc.save(`${fileName}.pdf`);
        toast({ title: "Export Started", description: "Your PDF file should begin downloading." });
        return;
    }
    
    const row = [
        user?.displayName || '',
        soul.firstName,
        soul.lastName,
        soul.email || '',
        soul.phone || '',
        soul.church || '',
        locationWonString,
        soul.wonAt?.toDate ? format(soul.wonAt.toDate(), "yyyy-MM-dd") : '',
        soul.source,
        soul.sourceDetails || '',
        soul.status,
        soul.attendingChurch ? 'Yes' : 'No',
        soul.inBibleStudy ? 'Yes' : 'No',
        soul.attendingPrayer ? 'Yes' : 'No',
        soul.inServiceDepartment ? 'Yes' : 'No',
        followUpHistoryString
    ];

    const escapeCsvCell = (cellData: any): string => {
        if (cellData === null || cellData === undefined) return '';
        const stringVal = String(cellData);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };
    
    const csvRows = [row].map(r => r.map(escapeCsvCell).join(','));

    const csvString = [headers.join(','), ...csvRows].join('\\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
        title: "Export Started",
        description: "Your CSV file should begin downloading shortly.",
    });
  };

  const triggerButton = (
    <Button disabled={!user}>
      <PlusCircle className="h-4 w-4" />
      <span className="hidden md:inline">Log Soul Won</span>
    </Button>
  );

  const formContent = <LogSoulForm onSoulLogged={handleSoulLogged} fellowships={fellowships || []} campaigns={campaigns || []} />;

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
                <span className="hidden md:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
      </div>
      
      <SoulsWonTable 
        souls={filteredSouls || []} 
        loading={loading}
        onEdit={setSoulToEdit}
        onFollowUp={setSoulForFollowUp}
        onViewHistory={setSoulForHistory}
        onExportSingle={handleExportSingleSoul}
        fellowships={fellowships || []}
        onAssignFellowship={handleAssignFellowship}
      />

      {soulToEdit && (
          <Dialog open={!!soulToEdit} onOpenChange={(isOpen) => !isOpen && setSoulToEdit(null)}>
              <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                      <DialogTitle>Edit Soul Details</DialogTitle>
                      <DialogDescription>Make changes to the record for {soulToEdit?.firstName} {soulToEdit?.lastName}.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-y-auto pr-2">
                      <EditSoulForm soul={soulToEdit} onSoulUpdated={handleSoulUpdated} fellowships={fellowships || []} campaigns={campaigns || []} />
                  </div>
              </DialogContent>
          </Dialog>
      )}

      {soulForFollowUp && (
        <LogFollowUpDialog
            soul={soulForFollowUp}
            isOpen={!!soulForFollowUp}
            onOpenChange={(isOpen) => { if (!isOpen) setSoulForFollowUp(null); }}
            onFollowUpLogged={handleFollowUpLogged}
        />
      )}

      {soulForHistory && (
        <ViewHistoryDialog
            soul={soulForHistory}
            isOpen={!!soulForHistory}
            onOpenChange={(isOpen) => { if (!isOpen) setSoulForHistory(null); }}
        />
      )}
    </div>
  );
}
