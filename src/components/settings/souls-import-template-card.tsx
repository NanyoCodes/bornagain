
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
 * Ensures that uploaded lists only add to the existing souls list without overwriting.
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
      "Source (Personal or Campaign)",
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
    link.setAttribute("download", "testify_souls_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Use this file to organize your records for Kingdom entry.",
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
        
        if (rows.length === 0) {
          toast({ variant: 'destructive', title: 'Empty File', description: 'No records found in the uploaded list.' });
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

        rows.forEach((row) => {
          // Map CSV headers to internal fields
          const firstName = row["First Name"] || row["firstName"];
          const lastName = row["Last Name"] || row["lastName"];
          
          if (!firstName || !lastName) return;

          // Crucially: Creating NEW document references to ensure we ONLY ADD to the existing list.
          const newSoulId = doc(userSoulsRef).id;
          const userSoulDocRef = doc(userSoulsRef, newSoulId);
          const globalSoulDocRef = doc(globalSoulsRef, newSoulId);

          let wonAt = new Date();
          const dateStr = row["Date Won (YYYY-MM-DD)"] || row["wonAt"];
          if (dateStr) {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) wonAt = parsedDate;
          }

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
            relationship: (row["Relationship"] || "Other") as SoulRelationship,
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
            source: (row["Source (Personal or Campaign)"] || "Personal") as 'Personal' | 'Campaign',
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
          toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not identify valid soul records in the file.' });
          setIsUploading(false);
          return;
        }

        try {
          await batch.commit();
          toast({
            title: "Harvest Synchronized",
            description: `Successfully added ${successCount} new souls to your existing list.`,
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
        <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    This hub allows you to maintain your records offline and sync them with the Kingdom cloud. Uploading a file <span className="text-foreground font-black uppercase text-[10px]">only adds new records</span>—it will not delete or overwrite your existing harvest list.
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
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Adding records to your existing harvest</p>
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>
        )}
      </CardContent>
    </Card>
  );
}
