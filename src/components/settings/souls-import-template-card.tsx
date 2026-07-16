'use client';

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Download, 
    FileSpreadsheet, 
    Info, 
    Upload, 
    Loader2, 
    ListChecks, 
    Target, 
    Globe, 
    Search, 
    UserPlus, 
    CheckCircle2, 
    X, 
    Smartphone,
    UserCheck,
    Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useUserProfile, useAuth } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import Papa from 'papaparse';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SoulRelationship } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface GoogleContact {
    resourceName: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    photoURL?: string;
}

/**
 * @fileOverview Provides a standardized CSV template and bulk upload handler.
 * UPDATED: Includes Google Contacts integration for selective soul importing.
 */
export function SoulsImportTemplateCard() {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

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

    const hintsRow = [
      "HINT: Required",
      "HINT: Required",
      "HINT: Male / Female",
      "HINT: e.g. Nigerian",
      "HINT: Valid email",
      "HINT: Numbers only (e.g. +2348000000000)",
      "HINT: Home church",
      "HINT: Family / Friend / Colleague / Neighbor / Stranger / Other",
      "HINT: City name",
      "HINT: State name",
      "HINT: Country name",
      "HINT: 2024-12-31",
      "HINT: Personal / Campaign",
      "HINT: Campaign Title"
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

    const csvContent = BOM + [headers.join(","), hintsRow.join(","), exampleRow.join(",")].join("\n");
    
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

  const handleGoogleContactsImport = async () => {
    if (!user || !auth) return;
    setIsFetchingContacts(true);

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (!token) throw new Error("Could not obtain access token.");

        const response = await fetch(
            'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&pageSize=100',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) throw new Error("Failed to fetch Google contacts.");

        const data = await response.json();
        const connections = data.connections || [];

        const mappedContacts: GoogleContact[] = connections.map((c: any) => {
            const nameObj = c.names?.[0];
            const emailObj = c.emailAddresses?.[0];
            const phoneObj = c.phoneNumbers?.[0];
            const photoObj = c.photos?.[0];

            return {
                resourceName: c.resourceName,
                firstName: nameObj?.givenName || 'Unnamed',
                lastName: nameObj?.familyName || '',
                email: emailObj?.value || '',
                phone: phoneObj?.value || '',
                photoURL: photoObj?.url || '',
            };
        });

        setContacts(mappedContacts);
        setIsContactsDialogOpen(true);
    } catch (error: any) {
        console.error("Google Contacts Import Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'Check your permissions and try again.' });
        }
    } finally {
        setIsFetchingContacts(false);
    }
  };

  const handleToggleContact = (id: string) => {
      const next = new Set(selectedContactIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedContactIds(next);
  };

  const handleImportSelected = async () => {
      if (!user || !firestore || !userProfile || selectedContactIds.size === 0) return;
      setIsUploading(true);

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
      const selected = contacts.filter(c => selectedContactIds.has(c.resourceName));

      selected.forEach(contact => {
          const newSoulId = doc(userSoulsRef).id;
          const userSoulDocRef = doc(userSoulsRef, newSoulId);
          const globalSoulDocRef = doc(globalSoulsRef, newSoulId);

          const sanitizedPhone = contact.phone ? contact.phone.replace(/[^\d+]/g, '') : null;

          const soulData = {
              userId: user.uid,
              firstName: contact.firstName,
              lastName: contact.lastName,
              photoURL: null, // We don't import Google photos directly due to potential caching issues
              gender: null,
              nationality: null,
              email: contact.email || null,
              phone: sanitizedPhone,
              relationship: "Other" as SoulRelationship,
              source: "Personal",
              wonAt: serverTimestamp(),
              status: "New",
              followUpLog: [{
                  date: new Date(),
                  note: "Imported from Google Contacts",
                  memberId: user.uid,
                  memberName: `${userProfile.firstName} ${userProfile.lastName}`
              }],
              userLocation: processedUserLocation,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
          };

          batch.set(userSoulDocRef, soulData);
          batch.set(globalSoulDocRef, soulData);
          successCount++;
      });

      try {
          await batch.commit();
          toast({ title: "Harvest Synced", description: `Successfully imported ${successCount} souls from your contacts.` });
          setIsContactsDialogOpen(false);
          setSelectedContactIds(new Set());
      } catch (error) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `users/${user.uid}/souls`,
              operation: 'write'
          }, user));
      } finally {
          setIsUploading(false);
      }
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
            return firstName && !firstName.toLowerCase().startsWith("hint:") && firstName !== "John";
        });

        if (dataRows.length === 0) {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'No valid records found.' });
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
          if (!firstName) return;

          const newSoulId = doc(userSoulsRef).id;
          const userSoulDocRef = doc(userSoulsRef, newSoulId);
          const globalSoulDocRef = doc(globalSoulsRef, newSoulId);

          const rawPhone = (row["Phone"] || row["phone"] || "").toString().trim();
          const sanitizedPhone = rawPhone.replace(/[^\d+]/g, '');

          const soulData = {
            userId: user.uid,
            firstName,
            lastName: (row["Last Name"] || row["lastName"] || "").toString().trim(),
            photoURL: null,
            email: (row["Email"] || "").toString().trim() || null,
            phone: sanitizedPhone || null,
            relationship: "Other" as SoulRelationship,
            source: "Personal",
            wonAt: serverTimestamp(),
            status: "New",
            followUpLog: [],
            userLocation: processedUserLocation,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          batch.set(userSoulDocRef, soulData);
          batch.set(globalSoulDocRef, soulData);
          successCount++;
        });

        try {
          await batch.commit();
          toast({ title: "Harvest Updated", description: `Added ${successCount} souls.` });
        } catch (error: any) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${user.uid}/souls`,
            operation: 'write',
          }, user));
        } finally {
          setIsUploading(false);
        }
      }
    });
  };

  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    const term = contactSearch.toLowerCase();
    return contacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(term));
  }, [contacts, contactSearch]);

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary/10">
      <CardHeader className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-bold font-headline uppercase tracking-tight">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Harvest Mobilization
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm font-medium">
                Synchronize bulk convert data by uploading a spreadsheet or importing from Google.
                </CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-6 px-3 font-black uppercase text-[9px] tracking-widest hidden sm:flex">Bulk Sync</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6 sm:p-8 pt-0 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleDownloadTemplate} variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
                <Download className="mr-2 h-4 w-4" />
                GET CSV TEMPLATE
            </Button>
            
            <Button 
                onClick={handleGoogleContactsImport} 
                disabled={isFetchingContacts}
                variant="outline"
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
            >
                {isFetchingContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                IMPORT GOOGLE CONTACTS
            </Button>
        </div>

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
                className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                UPLOAD CUSTOM CSV LIST
            </Button>
        </div>

        <div className="bg-muted/10 p-5 rounded-2xl border-2 border-dashed flex items-start gap-4">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                You can import and select souls to be imported from your Google Contacts. This helps organize your existing connections for strategic Kingdom follow-up.
            </p>
        </div>
      </CardContent>

      <Dialog open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
          <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                <div className="p-8 border-b bg-muted/10 shrink-0">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <Smartphone className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Network Sync</span>
                        </div>
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight leading-tight">Select Souls from Contacts</DialogTitle>
                        <DialogDescription className="text-sm font-medium">Identify the individuals you wish to prioritize for follow-up.</DialogDescription>
                    </DialogHeader>
                    <div className="relative mt-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                        <Input 
                            placeholder="Search your contacts..." 
                            value={contactSearch}
                            onChange={e => setContactSearch(e.target.value)}
                            className="h-12 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold"
                        />
                    </div>
                </div>

                <ScrollArea className="max-h-[50vh] min-h-[300px]">
                    <div className="p-4 space-y-1">
                        {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                            <div 
                                key={contact.resourceName}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                                    selectedContactIds.has(contact.resourceName) ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:bg-muted/50"
                                )}
                                onClick={() => handleToggleContact(contact.resourceName)}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <Checkbox 
                                        checked={selectedContactIds.has(contact.resourceName)}
                                        onCheckedChange={() => handleToggleContact(contact.resourceName)}
                                        className="rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                    <Avatar className="h-10 w-10 border shadow-sm shrink-0">
                                        <AvatarImage src={contact.photoURL} />
                                        <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">{contact.firstName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-black text-sm uppercase tracking-tight truncate leading-tight">{contact.firstName} {contact.lastName}</p>
                                        <div className="flex items-center gap-3 mt-1 opacity-60">
                                            {contact.phone && <p className="text-[10px] font-bold truncate flex items-center gap-1"><Smartphone className="h-2.5 w-2.5" /> {contact.phone}</p>}
                                            {contact.email && <p className="text-[10px] font-bold truncate flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> {contact.email}</p>}
                                        </div>
                                    </div>
                                </div>
                                {selectedContactIds.has(contact.resourceName) && (
                                    <div className="shrink-0 bg-primary/10 p-1 rounded-full"><UserCheck className="h-4 w-4 text-primary" /></div>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-20 bg-muted/5 rounded-3xl border-2 border-dashed">
                                <Users className="h-10 w-10 text-muted-foreground/10 mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground font-medium italic">No matching contacts found.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-8 border-t bg-muted/5 flex flex-col sm:flex-row gap-4 shrink-0">
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <span className="font-black text-primary text-sm">{selectedContactIds.size}</span>
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight">Souls Ready for Sync</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsContactsDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold">Cancel</Button>
                        <Button 
                            onClick={handleImportSelected} 
                            disabled={selectedContactIds.size === 0 || isUploading}
                            className="rounded-xl h-11 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            IMPORT SELECTED
                        </Button>
                    </div>
                </div>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
