'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useUserProfile } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, limit, getDoc, setDoc } from 'firebase/firestore';
import type { VendorProfile, UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Store, 
    Loader2, 
    PlusCircle, 
    MapPin, 
    ChevronRight,
    ShoppingBag,
    CreditCard,
    Gift,
    Package,
    ArrowLeft,
    Globe,
    ArrowRight,
    ChevronDown,
    Sparkles,
    Check,
    Filter,
    X
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
import { useRouter, useSearchParams } from 'next/navigation';
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

const giftStoreCategories = [
    'Bibles & Literature',
    'Books & Manuals',
    'Spiritual Tokens',
    'Clothing & Apparel',
    'Art & Decor',
    'Media & Content',
    'Care Packages',
    'Miscellaneous'
];

export default function GiftsMarketplaceClient() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);
    
    const soulId = searchParams?.get('soulId');
    const soulName = searchParams?.get('soulName');

    const [searchTerm, setSearchTerm] = useState('');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendorPhotoURL, setVendorPhotoURL] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('NGN');
    const [selectedRegCategory, setSelectedRegCategory] = useState('');

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

    const vendorsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'vendors'), where('status', '==', 'active'), where('vendorType', '==', 'gift'));
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

        if (!businessName || !selectedRegCategory) return;

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
            category: selectedRegCategory,
            status: 'active',
            vendorType: 'gift', 
            photoURL: vendorPhotoURL || null,
            createdAt: serverTimestamp(),
        };

        batch.set(newVendorRef, vendorData);
        batch.set(userRef, { isVendor: true }, { merge: true });

        batch.commit()
            .then(() => {
                toast({ title: 'Welcome, Partner!', description: 'Your gift storefront is now active.' });
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

    return (
        <div className="space-y-6 sm:space-y-10 max-w-4xl mx-auto pb-32 px-4 sm:px-6 text-left">
            <header className="space-y-6 pt-4 text-left">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm"><ArrowLeft className="h-6 w-6" /></Button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate">Kindness Center</h1>
                            <p className="text-[10px] sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <Gift className="h-3.5 w-3.5 text-primary" /> Provider Discovery
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => setIsRegisterOpen(true)} variant="outline" size="icon" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background h-10 w-10 sm:h-12 sm:w-12">
                                        <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className="text-[10px] font-black uppercase">Become a Provider</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {soulName && (
                    <div className="bg-primary/10 border-2 border-dashed border-primary/20 p-5 sm:p-8 rounded-[2rem] flex items-center justify-between group shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
                                <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight truncate">Gift for {soulName}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80 text-balance">Choose a provider to gift a token of kindness.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex flex-row items-center gap-2 sm:gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                            <Input 
                                placeholder="Search products, bibles, tokens..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-12 sm:h-14 pl-12 rounded-xl sm:rounded-[1.5rem] bg-muted/20 border-none shadow-inner font-bold w-full text-sm sm:text-lg"
                            />
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-[1.5rem] border-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm shrink-0">
                                    <Filter className="h-5 w-5 sm:h-6 sm:w-6" />
                                    <span className="sr-only">Filter Category</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none p-2">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2">Select Category</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setFilterCategory('all')} className="rounded-xl py-2.5">All Categories</DropdownMenuItem>
                                {giftStoreCategories.map(cat => (
                                    <DropdownMenuItem key={cat} onSelect={() => setFilterCategory(cat)} className="rounded-xl py-2.5">{cat}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                            <div className="space-y-1.5 shrink-0">
                                <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Country</Label>
                                <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterState('all'); }}>
                                    <SelectTrigger className="w-[130px] h-9 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        <SelectItem value="all">All Countries</SelectItem>
                                        {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 shrink-0">
                                <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Region</Label>
                                <Select value={filterState} onValueChange={setFilterState} disabled={filterCountry === 'all' || filterStatesList.length === 0}>
                                    <SelectTrigger className="w-[130px] h-9 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                        <SelectValue placeholder={filterStatesList.length === 0 ? "N/A" : "Select"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        <SelectItem value="all">All States</SelectItem>
                                        {filterStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0 text-left">
                {vendorsLoading ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="rounded-[2rem] border-none shadow-sm animate-pulse h-64 bg-muted/30" />
                    ))
                ) : filteredVendors.length > 0 ? (
                    filteredVendors.map(vendor => (
                        <Card key={vendor.id} className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full">
                            <div className="aspect-[21/9] relative bg-muted">
                                {vendor.photoURL ? (
                                    <Image src={vendor.photoURL} alt={vendor.businessName} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Gift className="h-10 w-10 text-muted-foreground opacity-20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                <div className="absolute bottom-3 left-4">
                                    <Badge className="bg-primary text-white font-black text-[9px] px-2 h-5 rounded-full border-none tracking-widest">{vendor.category}</Badge>
                                </div>
                            </div>
                            <div className="p-5 flex-grow space-y-3">
                                <div className="space-y-1">
                                    <h3 className="font-black text-base uppercase tracking-tight truncate leading-tight">{vendor.businessName}</h3>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest truncate">{vendor.location || 'Kingdom Network'}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 font-medium italic leading-relaxed">
                                    &ldquo;{vendor.description || 'Verified Kingdom product partner.'}&rdquo;
                                </p>
                            </div>
                            <CardFooter className="p-5 pt-0">
                                <Button asChild variant="ghost" className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all group/btn">
                                    <Link href={`/marketplace/vendors/${vendor.id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="flex items-center justify-center w-full gap-2 text-center">
                                        VIEW TOKENS & PRODUCTS <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <Store className="h-16 w-16 text-muted-foreground opacity-10 mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-center">No Services Found</h3>
                        <p className="text-sm text-muted-foreground italic mt-2 text-center text-balance px-8">Kingdom product vendors will appear here.</p>
                    </div>
                )}
            </div>

            {mounted && (
                isMobile ? (
                    <Sheet open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <SheetHeader className="text-left p-0">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Become a Provider</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1">Register your gift storefront.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                {registrationForm}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                            <div className="p-8 border-b bg-muted/10 shrink-0">
                                <DialogHeader className="p-0">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Become a Provider</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1">Register your gift storefront and start providing physical tokens of kindness.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <ScrollArea className="flex-grow">
                                {registrationForm}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                )
            )}
        </div>
    );
}
