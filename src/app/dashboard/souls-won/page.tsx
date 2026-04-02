
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { PlusCircle, Download } from "lucide-react";
import { SoulsWonTable } from "@/components/souls/souls-won-table";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import type { Soul, FollowUpLogItem } from "@/lib/types";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearch } from "@/context/search-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PlaceHolderImages } from "@/lib/placeholder-images";

// This is a workaround for the jspdf-autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function SoulsWonPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const { searchTerm, setSearchPlaceholder, setIsSearchVisible, setSearchTerm } = useSearch();

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

  const loading = userLoading || soulsLoading;

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
    router.refresh();
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
      "First Name", "Last Name", "Phone", "Church", "Location Won", "Date Won", "Source", "Source Details", "Status",
      "Attending Church", "In Bible Study", "Attending Prayer", "Last Follow Up Date", "Last Follow Up Note"
    ];

    const body = filteredSouls.map(soul => {
        const lastFollowUp = soul.followUpLog && soul.followUpLog.length > 0
            ? [...soul.followUpLog].sort((a, b) => (b.date?.toDate ? b.date.toDate().getTime() : 0) - (a.date?.toDate ? a.date.toDate().getTime() : 0))[0]
            : null;

        const locationWonString = soul.locationWon ? [soul.locationWon.city, soul.locationWon.state, soul.locationWon.country].filter(Boolean).join(', ') : '';

        return [
            soul.firstName,
            soul.lastName,
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
            lastFollowUp?.date?.toDate ? format(lastFollowUp.date.toDate(), 'yyyy-MM-dd') : '',
            lastFollowUp ? lastFollowUp.note : ''
        ];
    });


    if (formatType === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' });
        const logo = PlaceHolderImages.find((img) => img.id === 'logo');
        
        doc.autoTable({
            head: [headers],
            body: body,
            didDrawPage: (data) => {
                // Header
                if (logo?.imageUrl) {
                    doc.addImage(logo.imageUrl, 'JPG', data.settings.margin.left, 15, 12, 12);
                }
                doc.setFontSize(20);
                doc.text("Souls Won Report", data.settings.margin.left + 15, 24);
            },
            startY: 32,
            styles: { fontSize: 8, cellPadding: 1.5 },
            headStyles: { fillColor: [34, 139, 34] },
        });

        doc.save(`souls-won-${new Date().toISOString().slice(0,10)}.pdf`);
        toast({ title: "Export Started", description: "Your PDF file should begin downloading." });
        return;
    }

    // CSV Export Logic
    const escapeCsvCell = (cellData: any): string => {
        if (cellData === null || cellData === undefined) return '';
        const stringVal = String(cellData);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };
    
    const csvRows = body.map(row => row.map(escapeCsvCell).join(','));

    const csvString = [headers.join(','), ...csvRows].join('\n');
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Souls Won</h1>
          <p className="text-xs text-muted-foreground">
            Track and nurture individuals you've led to Christ.
          </p>
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
                  <SheetDescription>
                    Record the details of the person you've ministered to.
                  </SheetDescription>
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
      />
    </div>
  );
}
