
'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Info, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useUserProfile } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SoulRelationship } from '@/lib/types';

/**
 * @fileOverview Provides a standardized CSV template for missionaries and handles bulk uploads.
 * The template now includes guidance for fields that require specific options (dropdowns).
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

    const guidanceRow = [
      "(Required)",
      "(Required)",
      "Options: Male, Female, Other",
      "e.g. Nigerian",
      "e.g. user@email.com",
      "e.g. +234...",
      "Primary Church",
      "Options: Family, Friend, Colleague, Neighbor, Stranger, Other",
      "City Name",
      "State Name",
      "Country Name",
      "Format: YYYY-MM-DD",
      "Options: Personal, Campaign",
      "e.g. Mission Title"
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

    const csvContent = BOM + [
        headers.join(","), 
        guidanceRow.join(","), 
        exampleRow.join(",")
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "testify_souls_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Guidance included for Relationship and Source fields.",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !firestore || !userProfile) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        
        // Filter out the guidance row if it exists
        const dataRows = rows.filter(row => {
            const firstName = (row["First Name"] || row["firstName"] || "").toString();
            return firstName && !firstName.includes("(Required)");
        });

        if (dataRows.length === 0) {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'No valid records found after the guidance row.' });
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
          const firstName = row["First Name"] || row["firstName"];
          const lastName = row["Last Name"] || row["lastName"];
          
          if (!firstName || !lastName) return;

          const newSoulId = doc(userSoulsRef).id;
          const userSoulDocRef = doc(userSoulsRef, newSoulId);
          const globalSoulDocRef = doc(globalSoulsRef, newSoulId);

          let wonAt = new Date();
          const dateStr = row["Date Won (YYYY-MM-DD)"] || row["wonAt"];
          if (dateStr) {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) wonAt = parsedDate;
          }

          // Normalize values for fields with specific options
          const source = (row["Source"] || "Personal").toString().includes("Campaign") ? "Campaign" : "Personal";
          const relationship = (row["Relationship"] || "Other") as SoulRelationship;

          const soulData = {
            userId: user.uid,
            firstName,
            lastName,
            photoURL: null,
            gender: row["Gender"] || null,
            nationality: row["Nationality"] || null,
            email: row["Email"] || null,
            phone: row["Phone"] || null,
            church: row["Church"] || null,
            relationship: relationship,
            locationWon: {
              city: row["Location City"] || null,
              state: row["Location State"] || null,
              country: row["Location Country"] || null,
              latitude: null,
              longitude: null
            },
            wonAt: Timestamp.fromDate(wonAt),
            status: "New",
            followUpLog: [],
            source: source,
            sourceDetails: row["Source Details"] || null,
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
            title: "Harvest Synchronized",
            description: `Successfully added ${successCount} new souls.`,
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
          const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}/souls`,
            operation: 'write',
          }, user);
          errorEmitter.emit('permission-error', permissionError);
        } finally {
          setIsUploading(false);
        }
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        toast({ variant: 'destructive', title: 'File Error', description: 'Could not read the CSV file correctly.' });
        setIsUploading(false);
      }
    });
  };

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Harvest Management
        </CardTitle>
        <CardDescription>
          Organize your souls list using our template and upload it to synchronize your records. Uploading a list will add new entries to your current collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed flex items-start gap-4 shadow-inner">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    This hub allows you to maintain your records offline. Our template now includes <span className="text-foreground font-black uppercase text-[10px]">Option Guides</span> for fields like Relationship and Source to ensure your data is mission-ready.
                </p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleDownloadTemplate} variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5">
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
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'SYNCHRONIZING...' : 'UPLOAD COMPLETED LIST'}
                </Button>
            </div>
        </div>

        {isUploading && (
            <div className="flex items-center gap-3 justify-center py-2 animate-pulse">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Synchronizing your spreadsheet data</p>
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>
        )}
      </CardContent>
    </Card>
  );
}
