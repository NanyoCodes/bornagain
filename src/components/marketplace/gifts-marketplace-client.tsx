'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useUserProfile } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import type { VendorProfile, Soul } from '@/lib/types';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Country, State } from 'country-state-city';
import { ImageUpload } from '@/components/common/image-upload';
import NextImage from 'next/image';
import Link from 'next/link';

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

const getCurrencySymbol = (code?: string) => {
    return currencyOptions.find(opt => opt.value === code)?.symbol || '₦';
};

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
    const actionId = searchParams?.get('actionId');

    const [searchTerm, setSearchTerm] = useState('');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendorPhotoURL, setVendorPhotoURL] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('NGN');
    const [selectedRegCategory, setSelectedRegCategory] = useState('');

    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [filterState, setFilterState] = useState<string>('all');
    const [filterBySoulLoc, setFilterBySoulLoc] = useState(false);

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

    useEffect(() => {
        setMounted(true);
    }, []);

    const soulDocRef = useMemo(() => {
        if (!firestore || !user?.uid || !soulId) return null;
        return doc(firestore, `users/${user.uid}/souls`, soulId);
    }, [firestore, user?.uid, soulId]);
    const { data: soul } = useDoc<Soul>(soulDocRef);

    const vendorsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'vendors'), 
            where('status', '==', 'active'),
            where('vendorType', '==', 'gift')
        );
    }, [firestore]);
    const { data: vendors, loading } = useCollection<VendorProfile>(vendorsQuery);

    const myGiftVendorsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'vendors'), 
            where('userId', '==', user.uid), 
            where('vendorType', '==', 'gift'),
            limit(1)
        );
    }, [user?.uid, firestore]);
    const { data: myGiftVendors } = useCollection<VendorProfile>(myGiftVendorsQuery);
    const myVendorProfile = myGiftVendors?.[0];

    const cartQuery = useMemo(() => (user && firestore) ? query(collection(firestore, 'users', user.uid, 'cart')) : null, [user, firestore]);
    const { data: cartItems } = useCollection<any>(cartQuery);
    const cartCount = useMemo(() => cartItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0, [cartItems]);

    const filteredVendors = useMemo(() => {
        if (!vendors) return [];
        let list = [...vendors];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(v => 
                v.businessName.toLowerCase().includes(term) || 
                v.location?.toLowerCase().includes(term)
            );
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

        if (filterBySoulLoc && soul && soul.locationWon?.city) {
            const city = soul.locationWon.city.toLowerCase();
            list = list.filter(v => v.location?.toLowerCase().includes(city));
        }

        return list;
    }, [vendors, searchTerm, filterCategory, filterCountry, filterState, filterBySoulLoc, soul]);

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
                router.push(`/dashboard/marketplace/vendors/${newVendorRef.id}`);
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
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 flex items-center gap-3 text-left">
                    <Gift className="h-5 w-5 text-primary text-left" />
                    <p className="text-xs font-bold text-primary uppercase tracking-widest text-left">Registering for Kindness Center</p>
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
                    <Input id="businessName" name="businessName" placeholder="e.g., Kingdom Books & Gifts" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Store Category</Label>
                    <Select onValueChange={setSelectedRegCategory} value={selectedRegCategory}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                            <SelectValue placeholder="What do you provide?" className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                            {giftStoreCategories.map(cat => (
                                <SelectItem key={cat} value={cat} className="rounded-xl font-bold text-left">
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Base Currency</Label>
                        <Select onValueChange={setSelectedCurrency} value={selectedCurrency}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                <SelectValue placeholder="Select Currency" className="text-left" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl text-left">
                                {currencyOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold text-left">
                                        {opt.label}
                                    </SelectItem>
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
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                <SelectValue placeholder="Select Country" className="text-left" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] text-left">
                                {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left">{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">State</Label>
                            <Select onValueChange={setRegState} value={regState} disabled={!regCountry || regStatesList.length === 0}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                                    <SelectValue placeholder={regStatesList.length === 0 ? "N/A" : "Select State"} className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    {regStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left">{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left">
                            <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">City</Label>
                            <Input id="city" name="city" placeholder="Enter City" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner text-left" required />
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-left">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">About Your Service</Label>
                    <Textarea id="description" name="description" placeholder="Describe your products..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-left" />
                </div>
                <div className="space-y-2 text-left">
                    <Label htmlFor="paymentDetails" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left">
                        <CreditCard className="h-3 w-3 text-left" /> Payment Details
                    </Label>
                    <Textarea id="paymentDetails" name="paymentDetails" placeholder="Bank details or payment instructions..." className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" required />
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 text-left">
                <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-left">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center text-left">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />} START PROVIDING
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-6 sm:space-y-10 max-w-4xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                    <div className="flex items-center gap-4 text-left">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left"><ArrowLeft className="h-6 w-6 text-left" /></Button>
                        <div className="min-w-0 text-left">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate text-left">Kindness Center</h1>
                            <p className="text-[10px] sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                                <Gift className="h-3.5 w-3.5 text-primary text-left" /> Products Hub
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto text-left">
                        {myVendorProfile ? (
                            <Button onClick={() => router.push(`/dashboard/marketplace/vendors/${myVendorProfile.id}`)} variant="outline" className="flex-1 sm:flex-none rounded-2xl font-black uppercase tracking-widest h-12 shadow-md text-[10px] sm:text-xs text-left">
                                <Store className="mr-2 h-4 w-4 text-primary text-left" /> My Storefront
                            </Button>
                        ) : (
                            <Button onClick={() => setIsRegisterOpen(true)} className="flex-1 sm:flex-none rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 text-[10px] sm:text-xs text-left">
                                <PlusCircle className="mr-2 h-4 w-4 text-left" /> Become a Provider
                            </Button>
                        )}
                    </div>
                </div>

                {soulName && (
                    <div className="bg-primary/10 border-2 border-dashed border-primary/20 p-5 sm:p-8 rounded-[2rem] flex items-center justify-between group shadow-inner text-left">
                        <div className="flex items-center gap-4 text-left">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0 text-left">
                                <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse text-left" />
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight truncate text-left">Gift for {soulName}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80 text-balance text-left">Choose a provider to gift a token of kindness.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4 text-left">
                    <div className="flex flex-col sm:flex-row gap-3 text-left">
                        <div className="relative flex-1 text-left">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                            <Input 
                                placeholder="Search stores..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-12 sm:h-14 pl-12 rounded-[1.25rem] sm:rounded-[1.5rem] bg-muted/20 border-none shadow-inner font-bold w-full text-left"
                            />
                        </div>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-12 sm:h-14 px-6 rounded-[1.25rem] sm:rounded-[1.5rem] border-2 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px] gap-2 shadow-sm text-left">
                                    <Filter className="h-4 w-4 text-left" />
                                    {filterCategory === 'all' ? 'FILTER CATEGORY' : filterCategory.toUpperCase()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none p-2 text-left">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2 text-left">Select Category</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setFilterCategory('all')} className="rounded-xl py-2.5 text-left">All Products</DropdownMenuItem>
                                {giftStoreCategories.map(cat => (
                                    <DropdownMenuItem key={cat} onSelect={() => setFilterCategory(cat)} className="rounded-xl py-2.5 text-left">{cat}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 text-left">
                        {filterCategory !== 'all' && (
                            <Badge variant="secondary" className="h-8 pl-3 pr-1 gap-2 bg-primary/10 text-primary border-primary/20 animate-in zoom-in text-left">
                                <span className="text-[10px] font-black uppercase tracking-tight text-left">{filterCategory}</span>
                                <button onClick={() => setFilterCategory('all')} className="h-5 w-5 rounded-full hover:bg-primary/10 flex items-center justify-center text-left"><X className="h-3 w-3 text-left" /></button>
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 text-left">
                        <div className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar text-left">
                            <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterState('all'); }}>
                                <SelectTrigger className="w-[140px] h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                    <SelectValue placeholder="Country" className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    <SelectItem value="all" className="text-left">All Countries</SelectItem>
                                    {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name} className="text-left">{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filterState} onValueChange={setFilterState} disabled={filterCountry === 'all' || filterStatesList.length === 0}>
                                <SelectTrigger className="w-[140px] h-10 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
                                    <SelectValue placeholder="State/Region" className="text-left" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] text-left">
                                    <SelectItem value="all" className="text-left">All States</SelectItem>
                                    {filterStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name} className="text-left">{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {soul?.locationWon?.city && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setFilterBySoulLoc(!filterBySoulLoc)}
                                className={cn(
                                    "h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] gap-2 transition-all text-left",
                                    filterBySoulLoc ? "bg-primary text-white border-none shadow-lg ring-2 ring-primary/20" : "border-primary/20 text-primary hover:bg-primary/5"
                                )}
                            >
                                {filterBySoulLoc ? <Check className="h-3 w-3 text-left" /> : <MapPin className="h-3 w-3 text-left" />}
                                GIFTS NEAR {soul.locationWon.city.toUpperCase()}
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 sm:px-0 text-left">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <Card key={i} className="rounded-[2rem] border-none shadow-sm animate-pulse h-48 bg-muted/30 text-left" />
                    ))
                ) : filteredVendors.length > 0 ? (
                    filteredVendors.map(vendor => (
                        <Card 
                            key={vendor.id} 
                            className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group cursor-pointer bg-card/50 backdrop-blur-sm flex flex-col h-full text-left"
                            onClick={() => router.push(`/dashboard/marketplace/vendors/${vendor.id}${soulId ? `?soulId=${soulId}&soulName=${soulName}&actionId=${actionId}` : ''}`)}
                        >
                            <div className="aspect-[2/1] relative bg-muted text-left">
                                {vendor.photoURL ? (
                                    <NextImage src={vendor.photoURL} alt={vendor.businessName} fill className="object-cover text-left" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-center text-left">
                                        <Package className="h-10 w-10 text-muted-foreground opacity-20 text-left" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left" />
                                <div className="absolute bottom-4 left-6 pr-4 text-left">
                                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight truncate text-left">{vendor.businessName}</h3>
                                    <div className="flex items-center gap-1.5 text-white/70 text-[9px] font-bold uppercase tracking-widest mt-1 text-left text-left">
                                        <MapPin className="h-2.5 w-2.5 text-primary text-left" /> {vendor.location || 'Online / Delivery'}
                                    </div>
                                </div>
                                <div className="absolute top-4 left-4 text-left">
                                    {vendor.category && (
                                        <Badge className="bg-primary text-white font-black uppercase text-[7px] px-2 h-5 border-none shadow-sm text-center text-left">
                                            {vendor.category}
                                        </Badge>
                                    )}
                                </div>
                                {vendor.currency && (
                                    <Badge className="absolute top-4 right-4 bg-background/80 backdrop-blur-md text-primary font-black uppercase text-[8px] px-2 h-6 border-none shadow-sm text-center text-left">
                                        {vendor.currency}
                                    </Badge>
                                )}
                            </div>
                            <div className="p-6 text-left">
                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 font-medium leading-relaxed italic mb-4 text-left">
                                    &ldquo;{vendor.description || 'Verified Kingdom gift partner.'}&rdquo;
                                </p>
                                <Button className="w-full h-12 rounded-2xl px-6 font-black text-[11px] uppercase tracking-widest group/btn shadow-md shadow-primary/10 hover:shadow-lg transition-all active:scale-[0.98] text-center text-left">
                                    <span className="flex-1 text-left text-center">EXPLORE OFFERINGS</span>
                                    <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1 text-left" />
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center text-left">
                        <Gift className="h-16 w-16 text-muted-foreground opacity-10 mb-6 text-left" />
                        <h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-center text-left">No Services Found</h3>
                        <p className="text-xs text-muted-foreground italic mt-2 text-center text-left">Kingdom product vendors will appear here.</p>
                    </div>
                )}
            </div>

            {cartCount > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6 animate-in slide-in-from-bottom-10 duration-500 text-left">
                    <Link href="/marketplace/checkout" className="block group text-left">
                        <div className="relative overflow-hidden rounded-full bg-[#1c1c21] border-4 border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center h-16 p-1 transition-all group-hover:scale-[1.02] group-active:scale-95 group-hover:border-primary/20 text-left">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-left" />
                            
                            <div className="flex-1 flex items-center gap-4 pl-5 pr-2 relative z-10 text-left">
                                <div className="relative text-left">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10 text-left">
                                        <ShoppingBag className="h-5 w-5 text-white/80 text-left" />
                                    </div>
                                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-[#1c1c21] shadow-xl animate-in zoom-in text-center text-left">
                                        <span className="text-[10px] font-black text-white text-center text-left"> {cartCount}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col leading-none min-w-0 text-left">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1 text-left">Kindness Package</span>
                                    <span className="text-[13px] font-black uppercase tracking-tight text-zinc-100 truncate text-left">View My Offering</span>
                                </div>
                            </div>

                            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_20px_rgba(249,116,22,0.4)] transition-all relative z-10 shrink-0 mr-1 text-left text-left">
                                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1 text-left text-left" />
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {mounted && (
                isMobile ? (
                    <Sheet open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <SheetHeader className="text-left p-0 text-left">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Become a Provider</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1 text-left">Register your gift storefront.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <ScrollArea className="flex-grow text-left">
                                {registrationForm}
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl text-left">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                                <DialogHeader className="p-0 text-left">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Become a Provider</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1 text-left">Register your gift storefront and start providing physical tokens of kindness.</DialogDescription>
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
