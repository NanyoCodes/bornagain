'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, limit, collectionGroup } from 'firebase/firestore';
import type { VendorProfile, Soul, Meal } from '@/lib/types';
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
    ShoppingBag,
    ArrowLeft,
    Globe,
    ArrowRight,
    ChevronDown,
    Package,
    Sparkles,
    Check,
    CreditCard,
    Gift,
    X,
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

const mealCategories = [
    'Traditional Platters',
    'Healthy & Organic',
    'Baked Goods',
    'Snack Packs',
    'Catering Services',
    'Breakfast Items',
    'Lunch Deals',
    'Dinner Specials'
];

export default function MealsMarketplaceClient() {
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

    // Global Meals discovery using collectionGroup
    const allMealsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'meals'));
    }, [firestore]);
    const { data: allMeals, loading: mealsLoading } = useCollection<Meal>(allMealsQuery);

    const myMealVendorsQuery = useMemo(() => {
        if (!user?.uid || !firestore) return null;
        return query(
            collection(firestore, 'vendors'), 
            where('userId', '==', user.uid), 
            where('vendorType', '==', 'meal'),
            limit(1)
        );
    }, [user?.uid, firestore]);
    const { data: myMealVendors } = useCollection<VendorProfile>(myMealVendorsQuery);
    const myVendorProfile = myMealVendors?.[0];

    const cartQuery = useMemo(() => (user && firestore) ? query(collection(firestore, 'users', user.uid, 'cart')) : null, [user, firestore]);
    const { data: cartDocs, loading: cartLoading } = useCollection<any>(cartQuery);
    const cart = useMemo(() => {
        const c: Record<string, number> = {};
        cartDocs?.forEach(d => c[d.id] = d.quantity);
        return c;
    }, [cartDocs]);
    const cartCount = useMemo(() => cartDocs?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0, [cartDocs]);

    // Use a separate hook or effect to fetch vendor details for each meal is expensive. 
    // In a real app we'd denormalize or use a better structure.
    // For this prototype, we'll assume filteredMeals are enough for basic discovery.
    
    const filteredMeals = useMemo(() => {
        if (!allMeals) return [];
        let list = [...allMeals];

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(m => m.name.toLowerCase().includes(term) || m.description?.toLowerCase().includes(term));
        }

        if (filterCategory !== 'all') {
            list = list.filter(m => m.category === filterCategory);
        }

        return list;
    }, [allMeals, searchTerm, filterCategory]);

    const handleRegisterVendor = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore) return;
        
        const formData = new FormData(e.currentTarget);
        const businessName = formData.get('businessName') as string;
        const description = formData.get('description') as string;
        const address = formData.get('address') as string;
        const city = formData.get('city') as string;
        const paymentDetails = formData.get('paymentDetails') as string;

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

    const addToCart = async (item: Meal) => {
        if (!user?.uid || !firestore) return;
        
        // Fetch full vendor info for the cart item
        const vRef = doc(firestore, 'vendors', item.vendorId);
        const vSnap = await getDoc(vRef);
        if(!vSnap.exists()) return;
        const vendor = vSnap.data() as VendorProfile;

        const itemRef = doc(firestore, 'users', user.uid, 'cart', item.id);
        const currentQty = cart[item.id] || 0;
        const data = { 
            ...item, 
            vendorName: vendor.businessName, 
            vendorOwnerId: vendor.userId, 
            vendorPaymentDetails: vendor.paymentDetails, 
            vendorPhotoURL: vendor.photoURL, 
            vendorType: vendor.vendorType, 
            currency: vendor.currency || 'NGN', 
            quantity: currentQty + 1, 
            updatedAt: serverTimestamp(), 
            soulId, 
            soulName 
        };
        setDoc(itemRef, data, { merge: true });
        toast({ title: 'Added to Package' });
    };

    const updateQuantity = async (itemId: string, currentQty: number, delta: number) => {
        if (!user?.uid || !firestore) return;
        const itemRef = doc(firestore, 'users', user.uid, 'cart', itemId);
        const newQty = currentQty + delta;
        if (newQty <= 0) deleteDoc(itemRef);
        else updateDoc(itemRef, { quantity: newQty, updatedAt: serverTimestamp() });
    };

    const registrationForm = (
        <form onSubmit={handleRegisterVendor}>
            <div className="p-8 space-y-6 text-left text-left">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-3">
                    <Utensils className="h-5 w-5 text-primary" />
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Registering for Meals Center</p>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Storefront Photo</Label>
                  <ImageUpload 
                      initialImageUrl={vendorPhotoURL} 
                      onUploadComplete={setVendorPhotoURL} 
                      storagePath="vendor-branding" 
                      cropAspect={21/9}
                  />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Name</Label>
                    <Input id="businessName" name="businessName" placeholder="e.g., Kingdom Kitchen" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Base Currency</Label>
                    <Select onValueChange={setSelectedCurrency} value={selectedCurrency}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                            <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {currencyOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold">{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Street Address</Label>
                        <Input id="address" name="address" placeholder="e.g., 123 Kingdom Way" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                        <Select onValueChange={(val) => { setRegCountry(val); setRegState(''); }} value={regCountry}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                            <Select onValueChange={setRegState} value={regState} disabled={!regCountry || regStatesList.length === 0}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
                                    <SelectValue placeholder={regStatesList.length === 0 ? "N/A" : "Select State"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {regStatesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                            <Input id="city" name="city" placeholder="Enter City" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">About Your Service</Label>
                    <Textarea id="description" name="description" placeholder="Describe your food service..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="paymentDetails" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <CreditCard className="h-3 w-3" /> Payment Details
                    </Label>
                    <Textarea id="paymentDetails" name="paymentDetails" placeholder="Bank details or payment instructions..." className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="flex-1 rounded-xl h-12 font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-center">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Launch Storefront'}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-6 sm:space-y-10 max-w-4xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm"><ArrowLeft className="h-6 w-6" /></Button>
                        <div className="space-y-1 min-w-0">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase tracking-tight truncate">Meals Center</h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-primary" /> Provision Hub
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {myVendorProfile ? (
                                        <Button onClick={() => router.push(`/marketplace/vendors/${myVendorProfile.id}`)} variant="outline" size="icon" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background h-10 w-10 sm:h-12 sm:w-12">
                                            <Store className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </Button>
                                    ) : (
                                        <Button onClick={() => setIsRegisterOpen(true)} variant="outline" size="icon" className="rounded-full border-primary/20 text-primary hover:bg-primary/5 shadow-md bg-background h-10 w-10 sm:h-12 sm:w-12">
                                            <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </Button>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className="text-[10px] font-black uppercase">{myVendorProfile ? "My Storefront" : "Become a Provider"}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {soulName && (
                    <div className="bg-primary/10 border-2 border-dashed border-primary/20 p-5 sm:p-8 rounded-[2rem] flex items-center justify-between group shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
                                <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight truncate">Meal for {soulName}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80 text-balance">Choose a provision from the catalog below.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex flex-row items-center gap-2 sm:gap-3 text-left">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                            <Input 
                                placeholder="Search for meals, platters, or drinks..." 
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
                                <DropdownMenuItem onSelect={() => setFilterCategory('all')} className="rounded-xl py-2.5">All Provisions</DropdownMenuItem>
                                {mealCategories.map(cat => (
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
                                    <SelectTrigger className="w-[140px] h-9 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-[10px] uppercase tracking-wider text-left">
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
                {mealsLoading ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="rounded-[2rem] border-none shadow-sm animate-pulse h-64 bg-muted/30" />
                    ))
                ) : filteredMeals.length > 0 ? (
                    filteredMeals.map(meal => {
                        const quantity = cart[meal.id] || 0;
                        const symbol = getCurrencySymbol(meal.currency);
                        return (
                            <Card 
                                key={meal.id} 
                                className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full"
                            >
                                <div className="aspect-[4/3] relative bg-muted">
                                    {meal.photoURL ? (
                                        <Image src={meal.photoURL} alt={meal.name} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Utensils className="h-10 w-10 text-muted-foreground opacity-20" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                                        <Badge className="bg-primary text-white font-black text-[10px] px-3 h-7 rounded-full shadow-lg border-none tracking-widest">
                                            {symbol}{meal.price.toLocaleString()}
                                        </Badge>
                                        {meal.deliveryFee ? (
                                            <Badge variant="outline" className="bg-background/80 backdrop-blur-md text-muted-foreground font-black text-[7px] px-1.5 h-4 rounded-full border-none tracking-tighter shadow-sm">
                                                +{symbol}{meal.deliveryFee.toLocaleString()} DEL
                                            </Badge>
                                        ) : null}
                                    </div>

                                    {quantity > 0 && (
                                        <div className="absolute bottom-3 left-3 bg-primary text-white font-black text-xs h-7 w-7 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in">
                                            {quantity}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex-grow space-y-3">
                                    <div className="space-y-1">
                                        <h3 className="font-black text-sm uppercase tracking-tight truncate leading-tight">{meal.name}</h3>
                                        <p className="text-[10px] text-muted-foreground line-clamp-2 font-medium italic leading-relaxed">
                                            &ldquo;{meal.description || 'Verified provision item.'}&rdquo;
                                        </p>
                                    </div>
                                    <div className="pt-3 border-t border-dashed flex items-center gap-1.5">
                                        <Store className="h-2.5 w-2.5 text-primary/60" />
                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest truncate">From Kingdom Provider</span>
                                    </div>
                                </div>
                                <CardFooter className="p-5 pt-0">
                                    {quantity > 0 ? (
                                        <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border w-full">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(meal.id, quantity, -1)}><Minus className="h-3.5 w-3.5"/></Button>
                                            <span className="flex-1 text-center font-black text-[10px] uppercase tracking-tighter">IN PACKAGE</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(meal.id, quantity, 1)}><Plus className="h-3.5 w-3.5"/></Button>
                                        </div>
                                    ) : (
                                        <Button onClick={() => addToCart(meal)} className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/10 transition-all active:scale-95 text-center">
                                            {soulName ? `FOR ${soulName}` : 'ADD TO PACKAGE'}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center text-left text-left text-left">
                        <Utensils className="h-16 w-16 text-muted-foreground opacity-10 mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-center">No Provisions Found</h3>
                        <p className="text-xs text-muted-foreground italic mt-2 text-center">Individual meal listings will appear here.</p>
                    </div>
                )}
            </div>

            {cartCount > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6 animate-in slide-in-from-bottom-10 duration-500">
                    <Link href="/marketplace/checkout" className="block group">
                        <div className="relative overflow-hidden rounded-full bg-[#1c1c21] border-4 border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center h-16 p-1 transition-all group-hover:scale-[1.02] group-active:scale-95 group-hover:border-primary/20">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex-1 flex items-center gap-4 pl-5 pr-2 relative z-10 text-left">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border border-white/10">
                                        <ShoppingBag className="h-5 w-5 text-white/80" />
                                    </div>
                                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-[#1c1c21] shadow-xl animate-in zoom-in text-center">
                                        <span className="text-[10px] font-black text-white text-center"> {cartCount}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col leading-none min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Provision Package</span>
                                </div>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_20px_rgba(249,116,22,0.4)] transition-all relative z-10 shrink-0 mr-1">
                                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
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
                                <SheetHeader className="text-left p-0">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Become a Provider</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1 text-left">Register your meal service and start providing physical provision.</SheetDescription>
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
                                    <DialogDescription className="text-sm font-medium mt-1 text-left">Register your meal service and start providing physical provision.</DialogDescription>
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
