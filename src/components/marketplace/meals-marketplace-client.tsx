'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useUserProfile } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, limit, addDoc } from 'firebase/firestore';
import type { VendorProfile, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Store, 
    Utensils, 
    Loader2, 
    PlusCircle, 
    MapPin, 
    ChevronRight,
    ArrowLeft,
    Globe,
    ArrowRight,
    ChevronDown,
    Sparkles,
    CreditCard,
    Filter
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from '@/components/ui/dialog';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription 
} from '@/components/ui/sheet';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Country, State } from 'country-state-city';
import Image from 'next/image';
import { ImageUpload } from '@/components/common/image-upload';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const currencyOptions = [
    { value: 'NGN', label: 'Naira (₦)', symbol: '₦' },
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { value: 'GHS', label: 'Ghanaian Cedi (₵)', symbol: '₵' },
    { value: 'KES', label: 'Kenyan Shilling (KSh)', symbol: 'KSh' },
];

const vendorCategories = [
    'Local Delivery',
    'Bakery',
    'Restaurant',
    'Healthy Options',
    'Catering',
    'Miscellaneous'
];

export default function MealsMarketplaceClient() {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendorPhotoURL, setVendorPhotoURL] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('NGN');

    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [filterState, setFilterState] = useState<string>('all');

    const countriesList = useMemo(() => Country.getAllCountries(), []);
    
    const [regCountry, setRegCountry] = useState('');
    const [regState, setRegState] = useState('');
    const regStatesList = useMemo(() => {
        const country = countriesList.find(c => c.name === regCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [regCountry, countriesList]);

    const filterStatesList = useMemo(() => {
        const country = countriesList.find(c => c.name === filterCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [filterCountry, countriesList]);

    useEffect(() => { setMounted(true); }, []);

    // Primary query for Provision Stores (Vendors)
    const vendorsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'vendors'), where('vendorType', '==', 'meal'), limit(100));
    }, [firestore]);
    const { data: vendors, loading: vendorsLoading } = useCollection<VendorProfile>(vendorsQuery);

    const filteredVendors = useMemo(() => {
        if (!vendors) return [];
        let list = [...vendors];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(v => v.businessName.toLowerCase().includes(term) || v.description?.toLowerCase().includes(term));
        }

        if (filterCategory !== 'all') {
            list = list.filter(v => v.category === filterCategory);
        }

        if (filterCountry !== 'all') {
            list = list.filter(v => v.location?.toLowerCase().includes(filterCountry.toLowerCase()));
        }

        if (filterState !== 'all') {
            list = list.filter(v => v.location?.toLowerCase().includes(filterState.toLowerCase()));
        }

        return list;
    }, [vendors, searchTerm, filterCategory, filterCountry, filterState]);

    const handleRegisterVendor = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore) return;
        
        const formData = new FormData(e.currentTarget);
        const businessName = formData.get('businessName') as string;
        const description = formData.get('description') as string;
        const address = formData.get('address') as string;
        const city = formData.get('city') as string;
        const paymentDetails = formData.get('paymentDetails') as string;
        const category = formData.get('category') as string;

        if (!businessName) return;

        const locationString = [address, city, regState, regCountry].filter(Boolean).join(', ');

        setIsSubmitting(true);
        const batch = writeBatch(firestore);
        const newVendorRef = doc(collection(firestore, 'vendors'));
        const userRef = doc(firestore, 'users', user.uid);

        const vendorData = {
            userId: user.uid,
            businessName,
            description,
            location: locationString,
            paymentDetails: paymentDetails || '',
            currency: selectedCurrency,
            category,
            status: 'active',
            vendorType: 'meal', 
            photoURL: vendorPhotoURL || null,
            createdAt: serverTimestamp(),
        };

        batch.set(newVendorRef, vendorData);
        batch.set(userRef, { isVendor: true }, { merge: true });

        batch.commit()
            .then(() => {
                toast({ title: 'Welcome, Provision Partner!', description: 'Your meal storefront is now active.' });
                setIsRegisterOpen(false);
                router.push(`/marketplace/vendors/${newVendorRef.id}`);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: `vendors/${newVendorRef.id}`,
                    operation: 'create',
                    requestResourceData: vendorData
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    const registrationForm = (
        <form onSubmit={handleRegisterVendor}>
            <div className="p-8 space-y-6 text-left">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-3 text-left">
                    <Utensils className="h-5 w-5 text-primary text-left" />
                    <p className="text-xs font-bold text-primary uppercase tracking-widest text-left">Registering for Meals Hub</p>
                </div>

                <div className="space-y-4 text-left">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Storefront Photo</Label>
                  <ImageUpload 
                      initialImageUrl={vendorPhotoURL} 
                      onUploadComplete={setVendorPhotoURL} 
                      storagePath="vendor-branding" 
                      cropAspect={21/9}
                  />
                </div>

                <div className="space-y-2 text-left">
                    <Label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Business Name</Label>
                    <Input id="businessName" name="businessName" placeholder="e.g., Kingdom Kitchen" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Category</Label>
                        <Select name="category" defaultValue="Restaurant">
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                <SelectValue placeholder="Select Category" className="text-left" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                                {vendorCategories.map(cat => (
                                    <SelectItem key={cat} value={cat} className="rounded-xl font-bold text-left">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 text-left text-left text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left text-left">Base Currency</Label>
                        <Select onValueChange={setSelectedCurrency} value={selectedCurrency}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left">
                                <SelectValue placeholder="Select Currency" className="text-left text-left" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl text-left text-left">
                                {currencyOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold text-left text-left">{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4 text-left">
                    <div className="space-y-2 text-left">
                        <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Street Address</Label>
                        <Input id="address" name="address" placeholder="e.g., 123 Kingdom Way" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner text-left" required />
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Country</Label>
                        <Select onValueChange={(val) => { setRegCountry(val); setRegState(''); }} value={regCountry}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none font-bold text-left text-left text-left">
                                <SelectValue placeholder="Select Country" className="text-left text-left" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] text-left">
                                {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left">{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left text-left">
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">State</Label>
                            <Select onValueChange={setRegState} value={regState} disabled={!regCountry || regStatesList.length === 0}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left text-left">
                                    <SelectValue placeholder={regStatesList.length === 0 ? "N/A" : "Select State"} className="text-left text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    {regStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left">{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left text-left">
                            <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">City</Label>
                            <Input id="city" name="city" placeholder="Enter City" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-left text-left">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">About Your Service</Label>
                    <Textarea id="description" name="description" placeholder="Describe your food service..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-left" />
                </div>
                <div className="space-y-2 text-left text-left">
                    <Label htmlFor="paymentDetails" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left">
                        <CreditCard className="h-3 w-3 text-left" /> Payment Details
                    </Label>
                    <Textarea id="paymentDetails" name="paymentDetails" placeholder="Bank details or payment instructions..." className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 text-left text-left">
                <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-left">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : 'Launch Storefront'}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-6 sm:space-y-10 max-w-4xl mx-auto pb-32 px-4 sm:px-6 text-left text-left text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left text-left">
                <div className="flex items-center justify-between gap-4 text-left">
                    <div className="flex items-center gap-4 min-w-0 flex-1 text-left text-left text-left">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left"><ArrowLeft className="h-6 w-6 text-left text-left" /></Button>
                        <div className="space-y-1 min-w-0 text-left text-left text-left">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate text-left text-left">Meals Center</h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left text-left text-left">
                            <Utensils className="h-4 w-4 text-primary text-left text-left" /> Provision Hub
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0 text-left text-left">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => setIsRegisterOpen(true)} variant="outline" size="icon" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background h-10 w-10 sm:h-12 sm:w-12 text-left text-left">
                                        <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6 text-left text-left" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left text-left"><p className="text-[10px] font-black uppercase text-left text-left">Become a Provider</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="space-y-4 text-left text-left text-left">
                    <div className="flex flex-row items-center gap-2 sm:gap-3 text-left">
                        <div className="relative flex-1 text-left text-left text-left">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left text-left" />
                            <Input 
                                placeholder="Search for stores, kitchens, providers..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-12 sm:h-14 pl-12 rounded-xl sm:rounded-[1.5rem] bg-muted/20 border-none shadow-inner font-bold w-full text-sm sm:text-lg text-left text-left text-left"
                            />
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-[1.5rem] border-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm shrink-0 text-left">
                                    <Filter className="h-5 w-5 sm:h-6 sm:w-6 text-left text-left" />
                                    <span className="sr-only text-left text-left text-left">Filter Category</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none p-2 text-left">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2 text-left">Select Category</DropdownMenuLabel>
                                <DropdownMenuSeparator className="text-left" />
                                <DropdownMenuItem onSelect={() => setFilterCategory('all')} className="rounded-xl py-2.5 text-left text-left">All Categories</DropdownMenuItem>
                                {vendorCategories.map(cat => (
                                    <DropdownMenuItem key={cat} onSelect={() => setFilterCategory(cat)} className="rounded-xl py-2.5 text-left text-left">{cat}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex overflow-x-auto pb-1 no-scrollbar gap-3 text-left text-left text-left text-left">
                        <div className="space-y-1.5 shrink-0 text-left text-left text-left text-left">
                            <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Country</Label>
                            <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterState('all'); }}>
                                <SelectTrigger className="w-[130px] h-9 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                    <SelectValue placeholder="Select" className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left text-left text-left">
                                    <SelectItem value="all" className="text-left text-left">All Countries</SelectItem>
                                    {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left text-left">{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 shrink-0 text-left text-left text-left">
                            <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Region</Label>
                            <Select value={filterState} onValueChange={setFilterState} disabled={filterCountry === 'all' || filterStatesList.length === 0}>
                                <SelectTrigger className="w-[140px] h-9 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left text-left text-left">
                                    <SelectValue placeholder={filterStatesList.length === 0 ? "N/A" : "Select"} className="text-left text-left text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    <SelectItem value="all" className="text-left text-left text-left">All States</SelectItem>
                                    {filterStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left text-left text-left">{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0 text-left">
                {vendorsLoading ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="rounded-[2rem] border-none shadow-sm animate-pulse h-64 bg-muted/30 text-left text-left text-left text-left" />
                    ))
                ) : filteredVendors.length > 0 ? (
                    filteredVendors.map(v => (
                        <Card key={v.id} className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full text-left text-left text-left text-left">
                            <div className="aspect-[21/9] relative bg-muted text-left text-left text-left text-left">
                                {v.photoURL ? (
                                    <Image src={v.photoURL} alt={v.businessName} fill className="object-cover transition-transform group-hover:scale-105 text-left text-left text-left" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-left text-left text-left text-left">
                                        <Store className="h-10 w-10 text-muted-foreground opacity-20 text-left text-left" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 text-left">
                                    <Badge className="bg-primary text-white font-black text-[9px] px-2 h-6 rounded-full border-none tracking-widest text-left text-left text-left">{v.category || 'Kitchen'}</Badge>
                                </div>
                            </div>
                            <div className="p-5 flex-grow space-y-3 text-left">
                                <h3 className="font-black text-base uppercase tracking-tight truncate leading-tight text-left text-left">{v.businessName}</h3>
                                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 font-medium italic leading-relaxed text-left text-left">
                                    {v.description || 'Verified Kingdom provision partner.'}
                                </p>
                                <div className="flex items-center gap-1.5 text-primary/60 text-left text-left">
                                    <MapPin className="h-3 w-3 text-left" />
                                    <span className="text-[9px] font-black uppercase tracking-widest truncate text-left text-left">{v.location || 'Global'}</span>
                                </div>
                            </div>
                            <CardFooter className="p-5 pt-0 text-left">
                                <Button asChild variant="ghost" className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all group/btn text-center text-left text-left text-left">
                                    <Link href={`/marketplace/vendors/${v.id}`} className="flex items-center justify-center w-full gap-2 text-center text-left text-left text-left">
                                        ENTER STORE <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1 text-left text-left text-left" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center text-left text-left">
                        <Store className="h-16 w-16 text-muted-foreground opacity-10 mb-6 text-left" />
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left">No Providers Found</h3>
                        <p className="text-sm text-muted-foreground italic mt-2 text-center text-balance px-8 text-left text-left">Provision partners will appear here.</p>
                    </div>
                )}
            </div>

            {mounted && (
                isMobile ? (
                    <Sheet open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left text-left text-left">
                                <SheetHeader className="text-left p-0 text-left text-left text-left text-left">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Become a Provider</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1 text-left text-left text-left">Register your meal service.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {registrationForm}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left text-left">
                            <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left text-left">
                                <DialogHeader className="p-0 text-left text-left text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left">Become a Provider</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1 text-left text-left text-left text-left">Register your meal service and start providing physical provision for the brethren.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {registrationForm}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}
        </div>
    );
}