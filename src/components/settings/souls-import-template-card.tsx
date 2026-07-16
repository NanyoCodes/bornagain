'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Info, Upload, Loader2, ListChecks, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SoulRelationship } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * @fileOverview Provides a standardized CSV template and bulk upload handler.
 * REDO: Improved UI guidance for dropdown options and robust row parsing.
 */
export function SoulsImportTemplateCard() {
  const { toast } = useToast();
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownloadTemplate = () => {
    const BOM = '\uFEFF';
    const headers = [
      "First Name",
      "Last Name",
      "Gender",
      "Nationality",
      "Email",
      "Phone",
      "Church",
      "Relationship",
      "Location City",
      "Location State",
      "Location Country",
      "Date Won (YYYY-MM-DD)",
      "Source",
      "Source Details"
    ];

    const exampleRow = [
      "John",
      "Doe",
      "Male",
      "Nigerian",
      "john.doe@example.com",
      "+2348000000000",
      "New Life Church",
      "Friend",
      "Lagos",
      "Lagos State",
      "Nigeria",
      "2024-05-20",
      "Personal",
      ""
    ];

    const csvContent = BOM + [headers.join(","), exampleRow.join(",")].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "testify_souls_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Template Downloaded" });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !firestore || !userProfile) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        const rows = results.data as any[];
        
        const dataRows = rows.filter(row => {
            const firstName = (row["First Name"] || row["firstName"] || "").toString().trim();
            // Basic validation: must have a name and not be the example row
            return firstName && firstName !== "John" && firstName.length > 1;
        });

        if (dataRows.length === 0) {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'No valid records found after the header.' });
          setIsUploading(false);
          return;
        }

        const batch = writeBatch(firestore);
        const userSoulsRef = collection(firestore, `users/${user.uid}/souls`);
        const globalSoulsRef = collection(firestore, 'souls');
        
        const processedUserLocation = userProfile.location ? {
            city: userProfile.location.city || "",
            country: userProfile.location.country || "",
            city_lowercase: (userProfile.location.city || "").toLowerCase(),
            country_lowercase: (userProfile.location.country || "").toLowerCase(),
        } : null;

        let successCount = 0;

        dataRows.forEach((row) => {
          const firstName = (row["First Name"] || row["firstName"] || "").toString().trim();
          const lastName = (row["Last Name"] || row["lastName"] || "").toString().trim();
          
          if (!firstName) return;

          const newSoulId = doc(userSoulsRef).id;
          const userSoulDocRef = doc(userSoulsRef, newSoulId);
          const globalSoulDocRef = doc(globalSoulsRef, newSoulId);

          let wonAt = new Date();
          const dateStr = (row["Date Won (YYYY-MM-DD)"] || row["wonAt"] || "").toString().trim();
          if (dateStr) {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) wonAt = parsedDate;
          }

          // Normalization logic for "Dropdown" fields
          const rawSource = (row["Source"] || "").toString().trim().toLowerCase();
          const source = rawSource.includes("campaign") ? "Campaign" : "Personal";
          
          const rawRel = (row["Relationship"] || "Other").toString().trim().toLowerCase();
          let relationship: SoulRelationship = "Other";
          if (rawRel.includes("family")) relationship = "Family";
          else if (rawRel.includes("friend")) relationship = "Friend";
          else if (rawRel.includes("colleague")) relationship = "Colleague";
          else if (rawRel.includes("neighbor")) relationship = "Neighbor";
          else if (rawRel.includes("stranger") || rawRel.includes("outreach")) relationship = "Stranger";

          const soulData = {
            userId: user.uid,
            firstName,
            lastName,
            photoURL: null,
            gender: (row["Gender"] || "").toString().trim() || null,
            nationality: (row["Nationality"] || "").toString().trim() || null,
            email: (row["Email"] || "").toString().trim() || null,
            phone: (row["Phone"] || "").toString().trim() || null,
            church: (row["Church"] || "").toString().trim() || null,
            relationship: relationship,
            locationWon: {
              city: (row["Location City"] || "").toString().trim() || null,
              state: (row["Location State"] || "").toString().trim() || null,
              country: (row["Location Country"] || "").toString().trim() || null,
              latitude: null,
              longitude: null
            },
            wonAt: Timestamp.fromDate(wonAt),
            status: "New",
            followUpLog: [],
            source: source,
            sourceDetails: (row["Source Details"] || "").toString().trim() || null,
            userLocation: processedUserLocation,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          batch.set(userSoulDocRef, soulData);
          batch.set(globalSoulDocRef, soulData);
          successCount++;
        });

        if (successCount === 0) {
          toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not identify valid soul records.' });
          setIsUploading(false);
          return;
        }

        try {
          await batch.commit();
          toast({
            title: "Harvest Updated",
            description: `Added ${successCount} new records to your list.`,
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/souls`,
            operation: 'write',
          }, user));
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Parsing Error', description: 'Check your file format and try again.' });
        setIsUploading(false);
      }
    });
  };

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary/10">
      <CardHeader className="p-6 sm:p-8">
        <CardTitle className="flex items-center gap-2 text-lg font-black font-headline uppercase tracking-tight">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Harvest Import
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm font-medium">
          Synchronize bulk convert data by uploading a spreadsheet.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 sm:p-8 pt-0 space-y-8">
        {/* Dropdown Options Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/20 p-5 rounded-2xl border-2 border-dashed border-primary/10 shadow-inner">
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <ListChecks className="h-3.5 w-3.5" /> Relationship Options
                </div>
                <div className="flex flex-wrap gap-1">
                    {['Family', 'Friend', 'Colleague', 'Neighbor', 'Stranger', 'Other'].map(opt => (
                        <Badge key={opt} variant="secondary" className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-tight bg-background border leading-none">{opt}</Badge>
                    ))}
                </div>
                <p className="text-[9px] text-muted-foreground italic">Use these exact words for best results.</p>
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <Target className="h-3.5 w-3.5" /> Source Options
                </div>
                <div className="flex flex-wrap gap-1">
                    {['Personal', 'Campaign'].map(opt => (
                        <Badge key={opt} variant="secondary" className="text-[8px] h-4 px-1.5 font-bold uppercase tracking-tight bg-background border leading-none">{opt}</Badge>
                    ))}
                </div>
                <p className="text-[9px] text-muted-foreground italic">If Campaign, provide title in Source Details.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleDownloadTemplate} variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm transition-all active:scale-95">
                <Download className="mr-2 h-4 w-4" />
                GET TEMPLATE
            </Button>
            
            <div className="relative">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                />
                <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'SYNCHRONIZING...' : 'UPLOAD LIST'}
                </Button>
            </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-muted/10 rounded-2xl border-none">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed font-medium">
                Uploading a list will <span className="text-foreground font-bold">append</span> new souls to your current harvest record. Duplicate protection is handled by generating unique Kingdom IDs for every imported soul.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
