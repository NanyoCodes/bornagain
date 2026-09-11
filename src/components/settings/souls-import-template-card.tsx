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
    Smartphone,
    UserCheck,
    Users,
    Search,
    X,
    Globe,
    CheckCircle2,
    ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useUserProfile, useAuth } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import Papa from 'papaparse';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SoulRelationship } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { motion, AnimatePresence } from 'framer-motion';

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

    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (!token) throw new Error("Could not obtain access token.");

        const response = await fetch(
            'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&pageSize=100',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("People API not enabled. Please enable 'Google People API' in your Google Cloud Console.");
            }
            throw new Error(`Failed to fetch Google contacts: ${response.status}`);
        }

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
            toast({ 
                variant: 'destructive', 
                title: 'Import Failed', 
                description: error.message || 'Check your permissions and try again.' 
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
    if (!contactSearch) return contacts;
    const term = contactSearch.toLowerCase();
    return contacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(term));
  }, [contacts, contactSearch]);

  const contactsListEl = (
    <div className="flex flex-col h-full text-left">
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left">
            <div className="flex items-center gap-3 mb-2 text-left text-left">
                <Smartphone className="h-5 w-5 text-primary text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Network Sync</span>
            </div>
            <h3 className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Select Contacts</h3>
            <div className="relative mt-6 text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left" />
                <Input 
                    placeholder="Search your contacts..." 
                    value={contactSearch}
                    onChange={e => setContactSearch(e.target.value)}
                    className="h-12 pl-10 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left"
                />
            </div>
        </div>

        <ScrollArea className="flex-grow min-h-[300px] text-left">
            <div className="p-4 space-y-1 text-left">
                <div className="p-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 text-left">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 text-left" />
                    <div className="space-y-1 text-left text-left">
                        <p className="text-[11px] font-black uppercase text-amber-700 tracking-tight text-left">Google Verification Pending</p>
                        <p className="text-[10px] text-amber-800/80 leading-relaxed text-left">
                            You may see a warning about "Unverified App". Click **Advanced** and then **Go to testifyglobal.com (unsafe)** to bypass this while we finalize official verification.
                        </p>
                    </div>
                </div>

                {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                    <div 
                        key={contact.resourceName}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group text-left",
                            selectedContactIds.has(contact.resourceName) ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20" : "bg-transparent border-transparent hover:bg-muted/50"
                        )}
                        onClick={() => handleToggleContact(contact.resourceName)}
                    >
                        <div className="flex items-center gap-4 min-w-0 text-left text-left text-left">
                            <Checkbox 
                                checked={selectedContactIds.has(contact.resourceName)}
                                onCheckedChange={() => handleToggleContact(contact.resourceName)}
                                className="rounded-md border-muted-foreground/30 text-left"
                            />
                            <Avatar className="h-10 w-10 border shadow-sm shrink-0 text-left">
                                <AvatarImage src={contact.photoURL} className="text-left" />
                                <AvatarFallback className="font-black bg-primary/10 text-primary text-xs text-center flex items-center justify-center w-full h-full text-left">{contact.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 text-left text-left text-left">
                                <p className="font-black text-sm uppercase tracking-tight truncate text-left">{contact.firstName} {contact.lastName}</p>
                                <div className="flex items-center gap-3 mt-1 opacity-60 text-left text-left">
                                    {contact.phone && <p className="text-[10px] font-bold truncate flex items-center gap-1 text-left"><Smartphone className="h-2.5 w-2.5 text-left" /> {contact.phone}</p>}
                                </div>
                            </div>
                        </div>
                        {selectedContactIds.has(contact.resourceName) && (
                            <div className="shrink-0 bg-primary/10 p-1 rounded-full text-left"><UserCheck className="h-4 w-4 text-primary text-left" /></div>
                        )}
                    </div>
                )) : (
                    <div className="text-center py-20 bg-muted/5 rounded-3xl border-2 border-dashed mx-4 text-left text-left">
                        <Users className="h-10 w-10 text-muted-foreground/10 mx-auto mb-4 text-left" />
                        <p className="text-sm text-muted-foreground font-medium italic text-left">No matching contacts found.</p>
                    </div>
                )}
            </div>
        </ScrollArea>

        <div className="p-8 border-t bg-muted/5 flex flex-col sm:flex-row gap-4 shrink-0 text-left text-left">
            <div className="flex-1 min-w-0 flex items-center gap-3 text-left text-left">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-left text-left text-left">
                    <span className="font-black text-primary text-sm text-left"> {selectedContactIds.size}</span>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight text-left">Souls Ready for Sync</p>
            </div>
            <div className="flex gap-2 text-left text-left">
                <Button variant="outline" onClick={() => setIsContactsDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold text-left text-left">Cancel</Button>
                <Button 
                    onClick={handleImportSelected} 
                    disabled={selectedContactIds.size === 0 || isUploading}
                    className="rounded-xl h-11 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-left text-left"
                >
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" />}
                    IMPORT SELECTED
                </Button>
            </div>
        </div>
    </div>
  );

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b overflow-hidden border-l-4 border-l-primary/10 text-left text-left">
      <CardHeader className="p-6 sm:p-8 text-left text-left">
        <div className="flex items-center justify-between gap-4 text-left text-left">
            <div className="space-y-1 text-left text-left">
                <CardTitle className="flex items-center gap-2 text-lg font-bold font-headline uppercase tracking-tight text-left text-left">
                <FileSpreadsheet className="h-5 w-5 text-primary text-left text-left" /> Harvest Mobilization
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm font-medium text-left text-left">
                Synchronize bulk convert data by uploading a spreadsheet or importing from Google.
                </CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-6 px-3 font-black uppercase text-[9px] tracking-widest hidden sm:flex text-left">Bulk Sync</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6 sm:p-8 pt-0 space-y-8 text-left text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-left text-left">
            <Button onClick={handleDownloadTemplate} variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm text-left text-left text-left">
                <Download className="mr-2 h-4 w-4 text-left" />
                GET CSV TEMPLATE
            </Button>
            
            <Button 
                onClick={handleGoogleContactsImport} 
                disabled={isFetchingContacts}
                variant="outline"
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-sm text-left text-left text-left"
            >
                {isFetchingContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" /> : <Smartphone className="mr-2 h-4 w-4 text-left text-left" />}
                IMPORT GOOGLE CONTACTS
            </Button>
        </div>

        <div className="relative text-left text-left">
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
                className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left text-left text-left"
            >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" /> : <Upload className="mr-2 h-4 w-4 text-left text-left" />}
                UPLOAD CUSTOM CSV LIST
            </Button>
        </div>

        <div className="bg-muted/10 p-5 rounded-2xl border-2 border-dashed flex items-start gap-4 text-left text-left">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5 text-left" />
            <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left text-left">
                Standardize your follow-up data. Import your existing contacts or use our template to organize outreach results for professional tracking.
            </p>
        </div>
      </CardContent>

      <AnimatePresence>
        {isContactsDialogOpen && (
            isMobile ? (
                <Drawer open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
                    <DrawerContent className="h-[95dvh] flex flex-col p-0 text-left text-left text-left text-left">
                        {contactsListEl}
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isContactsDialogOpen} onOpenChange={setIsContactsDialogOpen}>
                    <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left text-left text-left">
                        {contactsListEl}
                    </DialogContent>
                </Dialog>
            )
        )}
      </AnimatePresence>
    </Card>
  );
}
