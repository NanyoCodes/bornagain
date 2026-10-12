'use client';

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Download, 
    FileSpreadsheet, 
    Info, 
    Upload, 
    Loader2, 
    Smartphone,
    UserCheck,
    Users,
    Search,
    X,
    Globe,
    CheckCircle2,
    ShieldAlert,
    ChevronRight,
    PlusCircle,
    Send,
    ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useUserProfile, useAuth } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import Papa from 'papaparse';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SoulRelationship } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, safeToDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerPortal, DrawerOverlay } from '@/components/ui/drawer';
import { format, isToday } from 'date-fns';

interface GoogleContact {
    resourceName: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    photoURL?: string;
}

export function SoulsImportTemplateCard() {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const { userProfile } = useUserProfile();
  const firestore = useFirestore();
  const isMobile = useIsMobile();
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
    provider.setCustomParameters({ prompt: 'select_account' });

    let tempApp;
    try {
        const appName = `temp-contacts-${Date.now()}`;
        tempApp = initializeApp(firebaseConfig, appName);
        const tempAuth = getAuth(tempApp);

        const result = await signInWithPopup(tempAuth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (!token) throw new Error("Could not obtain access token.");

        const allMappedContacts: GoogleContact[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
            const url = new URL('https://people.googleapis.com/v1/people/me/connections');
            url.searchParams.append('personFields', 'names,emailAddresses,phoneNumbers,photos');
            url.searchParams.append('pageSize', '1000');
            if (nextPageToken) url.searchParams.append('pageToken', nextPageToken);

            const response = await fetch(url.toString(), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error("People API not enabled or access denied.");
                throw new Error(`Google API error: ${response.status}`);
            }

            const data = await response.json();
            const connections = data.connections || [];

            connections.forEach((c: any) => {
                const nameObj = c.names?.[0];
                const emailObj = c.emailAddresses?.[0];
                const phoneObj = c.phoneNumbers?.[0];
                const photoObj = c.photos?.[0];

                allMappedContacts.push({
                    resourceName: c.resourceName,
                    firstName: nameObj?.givenName || 'Unnamed',
                    lastName: nameObj?.familyName || '',
                    email: emailObj?.value || '',
                    phone: phoneObj?.value || '',
                    photoURL: photoObj?.url || '',
                });
            });

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        setContacts(allMappedContacts);
        setIsContactsDialogOpen(true);
        
        await deleteApp(tempApp);
    } catch (error: any) {
        if (tempApp) await deleteApp(tempApp);
        console.error("Google Contacts Import Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({ 
                variant: 'destructive', 
                title: 'Import Failed', 
                description: error.message || 'Please check your connection and try again.' 
            });
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
              photoURL: null,
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
          toast({ title: "Harvest Synced", description: `Successfully imported ${successCount} souls.` });
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
    let list = [...contacts];
    if (contactSearch) {
      const term = contactSearch.toLowerCase();
      list = list.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(term));
    }
    return list.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });
  }, [contacts, contactSearch]);

  const contactsListEl = (
    <div className="flex flex-col h-full text-left">
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Network Sync</span>
                </div>
                <Button 
                    onClick={handleImportSelected} 
                    disabled={selectedContactIds.size === 0 || isUploading}
                    size="sm"
                    className="rounded-xl h-9 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]"
                >
                    {isUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    IMPORT SELECTED
                </Button>
            </div>
            <h3 className="text-2xl font-black font-headline uppercase tracking-tight">Select Contacts</h3>
            <div className="flex items-center gap-2 mt-2 opacity-40">
                <ChevronDown className="h-3 w-3 animate-bounce" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Swipe down to close</span>
            </div>
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

        <ScrollArea className="flex-grow min-h-0">
            <div className="p-4 space-y-1">
                {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                    <div 
                        key={contact.resourceName}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group text-left",
                            selectedContactIds.has(contact.resourceName) ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:bg-muted/50"
                        )}
                        onClick={() => handleToggleContact(contact.resourceName)}
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <Checkbox 
                                checked={selectedContactIds.has(contact.resourceName)}
                                onCheckedChange={() => handleToggleContact(contact.resourceName)}
                                className="rounded-md border-muted-foreground/30"
                            />
                            <Avatar className="h-10 w-10 border shadow-sm shrink-0">
                                <AvatarImage src={contact.photoURL} />
                                <AvatarFallback className="font-black bg-primary/10 text-primary text-xs flex items-center justify-center h-full w-full">{contact.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="font-black text-sm uppercase tracking-tight truncate">{contact.firstName} {contact.lastName}</p>
                                <div className="flex items-center gap-3 mt-1 opacity-60">
                                    {contact.phone && <p className="text-[10px] font-bold truncate flex items-center gap-1"><Smartphone className="h-2.5 w-2.5" /> {contact.phone}</p>}
                                </div>
                            </div>
                        </div>
                        {selectedContactIds.has(contact.resourceName) && (
                            <div className="shrink-0 bg-primary/10 p-1 rounded-full"><UserCheck className="h-4 w-4 text-primary" /></div>
                        )}
                    </div>
                )) : (
                    <div className="text-center py-20 bg-muted/5 rounded-3xl border-2 border-dashed mx-4">
                        <Users className="h-10 w-10 text-muted-foreground/10 mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground font-medium italic">No matching contacts found.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
        <div className="p-8 border-t bg-muted/5 flex items-center justify-center gap-2 shrink-0">
            <Info className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Selected: {selectedContactIds.size} / {filteredContacts.length}
            </p>
        </div>
    </div>
  );

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden border-l-4 border-l-primary/10 text-left">
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
        <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadTemplate} variant="outline" className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
                <Download className="mr-2 h-4 w-4" />
                TEMPLATE
            </Button>
            
            <Button 
                onClick={handleGoogleContactsImport} 
                disabled={isFetchingContacts}
                variant="outline"
                className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
            >
                {isFetchingContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                GOOGLE SYNC
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
                    variant="outline"
                    className="h-10 px-4 rounded-xl font-black border-primary/20 text-primary hover:bg-primary/5 shadow-sm uppercase tracking-widest text-[10px]"
                >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    CSV UPLOAD
                </Button>
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-muted/10 p-5 rounded-2xl border-2 border-dashed flex items-start gap-4">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Standardize your follow-up data. Import your existing contacts or use our template to organize outreach results for professional tracking.
                </p>
            </div>

            <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Verification Status: Testing</p>
                    <p className="text-[9px] text-amber-700/80 leading-relaxed font-medium">
                        The Google Contacts import is currently in testing. If you see a warning, click <span className="font-bold">"Advanced"</span> and then <span className="font-bold">"Go to testifyglobal.com (unsafe)"</span> to proceed with the sync.
                    </p>
                </div>
            </div>
        </div>
      </CardContent>

      <AnimatePresence>
        {isContactsDialogOpen && (
            <Drawer open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
                <DrawerPortal>
                    <DrawerOverlay className="fixed inset-0 z-50 bg-black/80" />
                    <DrawerContent className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[95dvh] flex-col rounded-t-[2.5rem] border bg-background sm:max-w-xl sm:mx-auto text-left">
                        <DrawerHeader className="sr-only">
                            <DrawerTitle>Network Sync</DrawerTitle>
                            <DrawerDescription>Select contacts to synchronize.</DrawerDescription>
                        </DrawerHeader>
                        {contactsListEl}
                    </DrawerContent>
                </DrawerPortal>
            </Drawer>
        )}
      </AnimatePresence>
    </Card>
  );
}

