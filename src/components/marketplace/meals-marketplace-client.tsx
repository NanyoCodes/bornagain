'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import type { VendorProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
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
    CreditCard,
    ArrowLeft,
    Globe
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Country, State } from 'country-state-city';
import { ImageUpload } from '@/components/common/image-upload';

const currencyOptions = [
    { value: 'NGN', label: 'Naira (₦)', symbol: '₦' },
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { value: 'GHS', label: 'Ghanaian Cedi (₵)', symbol: '₵' },
    { value: 'KES', label: 'Kenyan Shilling (KSh)', symbol: 'KSh' },
];

export default function MealsMarketplaceClient() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);
    
    const soulId = searchParams.get('soulId');
    const soulName = searchParams.get('soulName');
    const actionId = searchParams.get('actionId');

    const [searchTerm, setSearchTerm] = useState('');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendorPhotoURL, setVendorPhotoURL] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('NGN');

    // Location State
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedState, setSelectedState] = useState('');

    const countriesList = useMemo(() => Country.getAllCountries(), []);
    const statesList = useMemo(() => {
        const country = countriesList.find(c => c.name === selectedCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [selectedCountry, countriesList]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const vendorsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'vendors'), 
            where('status', '==', 'active'),
            where('vendorType', '==', 'meal')
        );
    }, [firestore]);
    const { data: vendors, loading } = useCollection<VendorProfile>(vendorsQuery);

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

    const filteredVendors = useMemo(() => {
        if (!vendors) return [];
        if (!searchTerm) return vendors;
        const term = searchTerm.toLowerCase();
        return vendors.filter(v => 
            v.businessName.toLowerCase().includes(term) || 
            v.location?.toLowerCase().includes(term)
        );
    }, [vendors, searchTerm]);

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

        const locationString = [address, city, selectedState, selectedCountry].filter(Boolean).join(', ');

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
            <div className="p-6 sm:p-8 space-y-6 text-left text-left">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-3 text-left">
                    <Utensils className="h-5 w-5 text-primary text-left" />
                    <p className="text-xs font-bold text-primary uppercase tracking-widest text-left">Registering for Meals Center</p>
                </div>

                <div className="space-y-4 text-left">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Storefront Photo</Label>
                  <ImageUpload 
                      initialImageUrl={vendorPhotoURL} 
                      onUploadComplete={setVendorPhotoURL} 
                      storagePath="vendor-branding" 
                      cropAspect={21/9}
                  />
                  <p className="text-[9px] text-muted-foreground px-1 italic text-left">This will be your storefront's hero image.</p>
                </div>

                <div className="space-y-2 text-left text-left text-left">
                    <Label htmlFor="businessName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Business Name</Label>
                    <Input id="businessName" name="businessName" placeholder="e.g., Kingdom Kitchen" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner text-left" required />
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Base Currency</Label>
                    <Select onValueChange={setSelectedCurrency} value={selectedCurrency}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left">
                            <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {currencyOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold">
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4 text-left">
                    <div className="space-y-2 text-left text-left">
                        <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Street Address</Label>
                        <Input id="address" name="address" placeholder="e.g., 123 Kingdom Way" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                    </div>

                    <div className="space-y-2 text-left text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                        <Select onValueChange={(val) => { setSelectedCountry(val); setSelectedState(''); }} value={selectedCountry}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left text-left text-left">
                        <div className="space-y-2 text-left text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                            <Select 
                                onValueChange={setSelectedState} 
                                value={selectedState}
                                disabled={!selectedCountry || statesList.length === 0}
                            >
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner">
                                    <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {statesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-left text-left">
                            <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                            <Input id="city" name="city" placeholder="Enter City" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-left text-left text-left">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">About Your Service</Label>
                    <Textarea id="description" name="description" placeholder="Describe your food service and mission..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-left" />
                </div>
                <div className="space-y-2 text-left text-left text-left">
                    <Label htmlFor="paymentDetails" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <CreditCard className="h-3 w-3 text-left" /> Payment Details
                    </Label>
                    <Textarea id="paymentDetails" name="paymentDetails" placeholder="Bank details or payment instructions..." className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner text-left" required />
                    <p className="text-[9px] text-muted-foreground px-1 italic text-left">Users will see this to pay you when gifting.</p>
                </div>
            </div>
            <div className="p-6 sm:p-8 bg-muted/5 border-t flex flex-col sm:flex-row gap-3 text-left">
                <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} className="rounded-xl h-12 flex-1 font-bold text-left">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" />}
                    Launch Storefront
                </Button>
            </div>
        </form>
    );

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-6 pt-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-left">
                    <div className="flex items-center gap-4 text-left">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 text-left">
                            <ArrowLeft className="h-6 w-6 text-left" />
                            <span className="sr-only text-left">Back</span>
                        </Button>
                        <div className="space-y-1 min-w-0 text-left">
                            <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate text-left">Meals Center</h1>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                            <Utensils className="h-4 w-4 text-primary text-left" /> Provision Hub
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 text-left">
                        {myVendorProfile ? (
                            <Button onClick={() => router.push(`/dashboard/marketplace/vendors/${myVendorProfile.id}`)} variant="outline" className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-md text-left">
                                <Store className="mr-2 h-4 w-4 text-left" /> My Storefront
                            </Button>
                        ) : (
                            <Button onClick={() => setIsRegisterOpen(true)} className="rounded-2xl font-black uppercase tracking-widest h-12 shadow-xl shadow-primary/20 text-left">
                                <PlusCircle className="mr-2 h-4 w-4 text-left" /> Become a Provider
                            </Button>
                        )}
                    </div>
                </div>

                {soulName && (
                    <div className="bg-primary/10 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex items-center justify-between group shadow-inner text-left">
                        <div className="flex items-center gap-4 text-left">
                            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg text-left">
                                <Utensils className="h-6 w-6 text-white animate-pulse text-left" />
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-black uppercase tracking-tight leading-tight text-left">Meal for {soulName}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80 text-balance text-left">Choose a food service below to gift a physical meal.</p>
                            </div>
                        </div>
                        <ShoppingBag className="h-8 w-8 text-primary opacity-20 rotate-12 group-hover:rotate-0 transition-transform hidden sm:block text-left" />
                    </div>
                )}

                <div className="relative text-left">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                    <Input 
                        placeholder="Search for local food outlets..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-14 pl-12 rounded-[1.5rem] bg-muted/20 border-none shadow-inner text-lg text-left"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4 sm:px-0 text-left">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <Card key={i} className="rounded-[2rem] border-none shadow-sm animate-pulse text-left">
                            <CardContent className="h-48 bg-muted/30 text-left" />
                        </Card>
                    ))
                ) : filteredVendors.length > 0 ? (
                    filteredVendors.map(vendor => (
                        <Card 
                            key={vendor.id} 
                            className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group cursor-pointer bg-card/50 backdrop-blur-sm text-left"
                            onClick={() => router.push(`/dashboard/marketplace/vendors/${vendor.id}${soulId ? `?soulId=${soulId}&soulName=${soulName}&actionId=${actionId}` : ''}`)}
                        >
                            <CardContent className="p-0 text-left">
                                <div className="aspect-[2/1] relative bg-muted text-left">
                                    {vendor.photoURL ? (
                                        <img src={vendor.photoURL} alt={vendor.businessName} className="w-full h-full object-cover text-left" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-left">
                                            <Store className="h-12 w-12 text-muted-foreground opacity-20 text-left" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left" />
                                    <div className="absolute bottom-4 left-6 text-left">
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight text-left">{vendor.businessName}</h3>
                                        <div className="flex items-center gap-1.5 text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1 text-left">
                                            <MapPin className="h-3 w-3 text-primary text-left" /> {vendor.location || 'Local Delivery'}
                                        </div>
                                    </div>
                                    {vendor.currency && (
                                        <Badge className="absolute top-4 right-4 bg-background/80 backdrop-blur-md text-primary font-black uppercase text-[10px] px-2 h-6 border-none shadow-sm text-left">
                                            {vendor.currency}
                                        </Badge>
                                    )}
                                </div>
                                <div className="p-6 text-left">
                                    <p className="text-sm text-muted-foreground line-clamp-2 font-medium leading-relaxed italic mb-4 text-left">
                                        &ldquo;{vendor.description || 'Verified Kingdom provision partner.'}&rdquo;
                                    </p>
                                    <Button variant="ghost" className="w-full justify-between h-10 rounded-xl px-4 hover:bg-primary/5 hover:text-primary transition-all font-black text-xs uppercase tracking-widest text-left">
                                        View Menu & Gifting Options
                                        <ChevronRight className="h-4 w-4 text-left" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center text-left">
                        <Utensils className="h-20 w-20 text-muted-foreground opacity-10 mb-6 text-left" />
                        <h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-left">No Food Outlets Found</h3>
                        <p className="text-sm text-muted-foreground italic mt-2 text-left">Local meal vendors will appear here.</p>
                    </div>
                )}
            </div>

            {mounted && isMobile ? (
                <Sheet open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                            <SheetHeader className="text-left text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Become a Provider</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1 text-left text-left">
                                    Register your meal service and start providing physical provision.
                                </SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow text-left">
                            {registrationForm}
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Become a Provider</DialogTitle>
                                <DialogDescription className="text-sm font-medium mt-1 text-left">
                                    Register your meal service and start providing physical provision.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            {registrationForm}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

