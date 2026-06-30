'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, serverTimestamp, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';
import type { VendorProfile, Meal, UserProfile, MealGift, Chat } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    Utensils, 
    Plus, 
    Loader2, 
    ShoppingBag, 
    Sparkles, 
    CheckCircle2, 
    MapPin, 
    Phone, 
    Heart,
    Store,
    CreditCard,
    Edit,
    Trash2,
    Clipboard,
    Gift,
    Package,
    ChefHat,
    ShoppingBasket,
    X,
    ChevronRight,
    LayoutGrid
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogTrigger
} from '@/components/ui/dialog';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription,
    SheetTrigger,
    SheetFooter
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';

export default function VendorPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const vendorId = params.vendorId as string;
    const soulId = searchParams.get('soulId');
    const soulName = searchParams.get('soulName');
    const actionId = searchParams.get('actionId');
    
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    const [isAddMealOpen, setIsAddMealOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isDeleteStoreOpen, setIsDeleteStoreOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Meal | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isDeletingStore, setIsDeletingStore] = useState(false);
    const [isDeletingItem, setIsDeletingItem] = useState(false);

    // Interactivity Safety Valve
    const isAnyModalOpen = !!(isAddMealOpen || isEditProfileOpen || isDeleteStoreOpen || itemToDelete || selectedMeal);

    useEffect(() => {
        if (!isAnyModalOpen && typeof document !== 'undefined') {
            const timer = setTimeout(() => {
                document.body.style.pointerEvents = 'auto';
                document.body.removeAttribute('aria-hidden');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isAnyModalOpen]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const vendorDocRef = useMemo(() => vendorId ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor, loading: loadingVendor } = useDoc<VendorProfile>(vendorDocRef);

    const mealsQuery = useMemo(() => {
        if (!firestore || !vendorId) return null;
        return query(collection(firestore, 'vendors', vendorId, 'meals'), orderBy('createdAt', 'desc'));
    }, [firestore, vendorId]);
    const { data: meals, loading: loadingMeals } = useCollection<Meal>(mealsQuery);

    const isOwner = user?.uid === vendor?.userId;
    const isGiftVendor = vendor?.vendorType === 'gift';
    
    // UI Helpers based on vendor type
    const CenterIcon = isGiftVendor ? Gift : ChefHat;
    const ItemIcon = isGiftVendor ? Package : Utensils;
    const centerLabel = isGiftVendor ? 'Kindness Center' : 'Meals Center';
    const itemLabel = isGiftVendor ? 'Product' : 'Meal';
    const actionLabel = isGiftVendor ? 'Gifting' : 'Provisioning';
    const manageLabel = isGiftVendor ? 'Manage Catalog' : 'Manage Menu';
    const addLabel = isGiftVendor ? 'Add New Product' : 'Add New Meal';
    const descriptionPlaceholder = isGiftVendor ? 'Describe the product details...' : 'Describe the ingredients and preparation...';
    const categoryPlaceholder = isGiftVendor ? 'e.g., Books, Devotionals' : 'e.g., Main Dish, Sides';

    const handleAddMeal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !isOwner) return;
        
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string);
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;

        if (!name || isNaN(price)) return;

        setIsSubmittingMeal(true);
        try {
            const mealsRef = collection(firestore, 'vendors', vendorId, 'meals');
            await addDoc(mealsRef, {
                vendorId,
                name,
                price,
                description,
                category,
                currency: 'NGN',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Item Added', description: `"${name}" has been added to your ${isGiftVendor ? 'catalog' : 'menu'}.` });
            setIsAddMealOpen(false);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Failed to add item' });
        } finally {
            setIsSubmittingMeal(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!user || !firestore || !itemToDelete || !isOwner) return;
        setIsDeletingItem(true);
        try {
            await deleteDoc(doc(firestore, 'vendors', vendorId, 'meals', itemToDelete.id));
            toast({ title: 'Item Removed', description: `"${itemToDelete.name}" has been deleted.` });
            setItemToDelete(null);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Deletion Failed' });
        } finally {
            setIsDeletingItem(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !isOwner || !vendor) return;

        const formData = new FormData(e.currentTarget);
        const businessName = formData.get('businessName') as string;
        const description = formData.get('description') as string;
        const location = formData.get('location') as string;
        const paymentDetails = formData.get('paymentDetails') as string;

        setIsUpdatingProfile(true);
        try {
            await updateDoc(doc(firestore, 'vendors', vendorId), {
                businessName,
                description,
                location,
                paymentDetails,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Profile Updated' });
            setIsEditProfileOpen(false);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleDeleteStore = async () => {
        if (!user || !firestore || !isOwner || !vendor) return;
        setIsDeletingStore(true);
        try {
            await deleteDoc(doc(firestore, 'vendors', vendorId));
            toast({ title: 'Storefront Deleted', description: 'Your business profile has been removed.' });
            setIsDeleteStoreOpen(false);
            router.push(isGiftVendor ? '/dashboard/marketplace/gifts' : '/dashboard/marketplace');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Deletion Failed' });
        } finally {
            setIsDeletingStore(false);
        }
    };

    const handleGiftMeal = async () => {
        if (!user || !firestore || !selectedMeal || !soulId || !soulName) return;

        setIsProcessingOrder(true);
        try {
            const giftsRef = collection(firestore, 'mealGifts');
            const giftData: any = {
                senderId: user.uid,
                recipientSoulId: soulId,
                recipientName: soulName,
                vendorId: vendorId,
                vendorName: vendor?.businessName || 'Unknown Vendor',
                mealId: selectedMeal.id,
                mealName: selectedMeal.name,
                price: selectedMeal.price,
                status: 'ordered',
                createdAt: serverTimestamp(),
            };

            await addDoc(giftsRef, giftData);

            const soulRef = doc(firestore, `users/${user.uid}/souls`, soulId);
            const globalSoulRef = doc(firestore, 'souls', soulId);
            
            const displayAction = isGiftVendor ? 'sent a gift' : 'shared a meal';
            const logActionId = isGiftVendor ? 'gave_gift' : 'shared_meal';
            
            const logEntry = {
                date: new Date(),
                note: `Logged via ${centerLabel}: ${displayAction} (${selectedMeal.name}) via ${vendor?.businessName}. Payment initiated.`,
                actions: [logActionId],
                memberId: user.uid,
                memberName: `${userProfile?.firstName} ${userProfile?.lastName}`,
            };

            await updateDoc(soulRef, {
                followUpLog: arrayUnion(logEntry),
                lastUpdatedAt: serverTimestamp(),
            });
            await updateDoc(globalSoulRef, {
                followUpLog: arrayUnion(logEntry),
                lastUpdatedAt: serverTimestamp(),
            });

            toast({ title: 'Order Placed!', description: `The ${selectedMeal.name} for ${soulName} is now in progress.` });
            setSelectedMeal(null);
            router.push('/dashboard/souls-won');
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Gift Failed', description: 'Could not process the gift order.' });
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const copyPaymentToClipboard = () => {
        if (!vendor?.paymentDetails) return;
        navigator.clipboard.writeText(vendor.paymentDetails);
        toast({ title: 'Copied!', description: 'Payment details copied to clipboard.' });
    };

    if (loadingVendor || loadingMeals) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-black uppercase tracking-widest text-[10px]">Establishing Storefront...</p>
            </div>
        );
    }

    if (!vendor) return <div className="text-center py-20">Storefront not found.</div>;

    const editProfileForm = (
        <form onSubmit={handleUpdateProfile} className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Name</Label>
                        <Input name="businessName" defaultValue={vendor.businessName} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Service Hub</Label>
                        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                           {isGiftVendor ? <Gift className="h-4 w-4 text-primary" /> : <Utensils className="h-4 w-4 text-primary" />}
                           <span className="text-xs font-bold text-primary uppercase tracking-widest">{centerLabel}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location / Area</Label>
                        <Input name="location" defaultValue={vendor.location} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">About Your Service</Label>
                        <Textarea name="description" defaultValue={vendor.description} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Instructions</Label>
                        <Textarea name="paymentDetails" defaultValue={vendor.paymentDetails} placeholder="Bank details..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" required />
                        <p className="text-[9px] text-muted-foreground px-1 italic">Users see this to pay you for gifts.</p>
                    </div>

                    <Separator />

                    <div className="pt-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-destructive ml-1">Danger Zone</Label>
                        <Card className="border-destructive/20 bg-destructive/5 mt-2 overflow-hidden">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-xs font-bold text-destructive">Delete Storefront</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight truncate">Permanently remove your business from Testify.</p>
                                </div>
                                <Button type="button" variant="destructive" size="sm" onClick={() => setIsDeleteStoreOpen(true)} className="rounded-xl h-8 font-black uppercase tracking-widest text-[9px] shrink-0">
                                    Delete
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </ScrollArea>
            <div className="p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row mt-auto">
                <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isUpdatingProfile} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Profile
                </Button>
            </div>
        </form>
    );

    const addMealForm = (
        <form onSubmit={handleAddMeal}>
            <div className="p-8 space-y-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{itemLabel} Name</Label>
                    <Input name="name" placeholder={`e.g., ${isGiftVendor ? 'Study Bible' : 'Jollof Rice'}`} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price (₦)</Label>
                    <Input name="price" type="number" placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                    <Input name="category" placeholder={categoryPlaceholder} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                    <Textarea name="description" placeholder={descriptionPlaceholder} className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
            </div>
            <div className="p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsAddMealOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmittingMeal} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {isSubmittingMeal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Item
                </Button>
            </div>
        </form>
    );

    const orderConfirmationContent = selectedMeal && (
        <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border shadow-inner">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ItemIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm uppercase tracking-tight truncate">{selectedMeal.name}</p>
                    <p className="text-[10px] font-bold text-primary uppercase">₦{selectedMeal.price.toLocaleString()}</p>
                </div>
            </div>

            <div className="space-y-4 bg-primary/5 p-5 rounded-2xl border-2 border-dashed border-primary/20 relative group">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <CreditCard className="h-3 w-3" /> Payment Instructions
                </Label>
                <p className="text-sm font-bold text-foreground whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] text-balance">
                    {vendor.paymentDetails || 'Contact provider for payment details.'}
                </p>
                <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={copyPaymentToClipboard}
                >
                    <Clipboard className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground gap-4">
                    <span className="shrink-0">Recipient</span>
                    <span className="text-foreground truncate">{soulName}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground gap-4">
                    <span className="shrink-0">Provider</span>
                    <span className="text-foreground truncate">{vendor.businessName}</span>
                </div>
                <Separator className="opacity-50" />
                <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-primary gap-4">
                    <span className="shrink-0">Transfer Amount</span>
                    <span className="shrink-0">₦{selectedMeal.price.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );

    const orderConfirmationFooter = (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" onClick={() => setSelectedMeal(null)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
            <Button 
                onClick={handleGiftMeal} 
                disabled={isProcessingOrder} 
                className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
                {isProcessingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                I HAVE PAID
            </Button>
        </div>
    );

    return (
        <div 
            className="space-y-8 max-w-4xl mx-auto pb-32"
            inert={isAnyModalOpen ? "" : undefined}
        >
            <div className="px-4 sm:px-0 flex flex-col gap-6 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full border bg-background">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <CenterIcon className="h-3 w-3 text-primary" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{centerLabel}</span>
                            </div>
                            <h1 className="text-xl sm:text-3xl font-black font-headline uppercase tracking-tight break-words [overflow-wrap:anywhere] leading-tight text-balance">{vendor.businessName}</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] truncate">{vendor.location || 'Kingdom Network'}</p>
                        </div>
                    </div>
                    {isOwner && (
                        <div className="flex gap-2 w-full sm:w-auto px-1 sm:px-0">
                            {mounted && (isMobile ? (
                                <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm" className="rounded-xl h-11 sm:h-10 px-4 font-bold uppercase tracking-widest text-[10px] flex-1 shadow-sm">
                                            <Edit className="mr-2 h-4 w-4" /> Profile
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                            <SheetHeader className="text-left">
                                                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Manage {centerLabel}</SheetTitle>
                                                <SheetDescription className="text-sm font-medium mt-1">Update your business details and payment instructions.</SheetDescription>
                                            </SheetHeader>
                                        </div>
                                        <div className="flex-grow overflow-hidden relative">
                                             {editProfileForm}
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            ) : (
                                <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 font-bold uppercase tracking-widest text-[10px] shadow-sm">
                                            <Edit className="mr-2 h-4 w-4" /> Manage Profile
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                                        <DialogHeader className="p-8 border-b bg-muted/10">
                                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Manage {centerLabel}</DialogTitle>
                                            <DialogDescription className="text-sm font-medium mt-1">Update your business details and payment instructions.</DialogDescription>
                                        </DialogHeader>
                                        {editProfileForm}
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>
                    )}
                </div>

                {soulName && (
                    <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2rem] flex items-center gap-5 shadow-inner animate-in fade-in slide-in-from-top-4 mx-1 sm:mx-0">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
                            <CenterIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-black uppercase tracking-tight leading-tight">
                                {actionLabel} for {soulName}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-70 mt-1 text-balance">
                                Select an item from the {isGiftVendor ? 'catalog' : 'menu'} below to gift as an act of Kingdom love.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                {isOwner && (
                    mounted && (isMobile ? (
                        <Sheet open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                            <SheetTrigger asChild>
                                <Card className="rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[240px] sm:min-h-[280px] shadow-sm">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                        <Plus className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-black uppercase tracking-widest text-primary text-sm">{addLabel}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-2 font-medium">Update your digital storefront catalog</p>
                                </Card>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                                <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                    <SheetHeader className="text-left">
                                        <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">{addLabel}</SheetTitle>
                                        <SheetDescription className="text-sm font-medium mt-1">Post a new offering for believers to gift.</SheetDescription>
                                    </SheetHeader>
                                </div>
                                <ScrollArea className="flex-grow">
                                    {addMealForm}
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    ) : (
                        <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                            <DialogTrigger asChild>
                                <Card className="rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[280px] shadow-sm">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                        <Plus className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-black uppercase tracking-widest text-primary text-sm">{addLabel}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-2 font-medium">Update your digital storefront catalog</p>
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                                <DialogHeader className="p-8 border-b bg-muted/10">
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{addLabel}</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1">Post a new offering for believers to gift.</DialogDescription>
                                </DialogHeader>
                                {addMealForm}
                            </DialogContent>
                        </Dialog>
                    ))
                )}

                {meals?.map(meal => (
                    <Card key={meal.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full">
                        <CardContent className="p-0">
                            <div className="aspect-[4/3] relative bg-muted">
                                {meal.photoURL ? (
                                    <img src={meal.photoURL} alt={meal.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ItemIcon className="h-12 w-12 text-muted-foreground opacity-10" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {isOwner && (
                                        <Button 
                                            variant="destructive" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            onClick={(e) => { e.stopPropagation(); setItemToDelete(meal); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Badge className="bg-primary text-white font-black text-xs px-3 h-8 rounded-full shadow-lg border-none">
                                        ₦{meal.price.toLocaleString()}
                                    </Badge>
                                </div>
                            </div>
                            <div className="p-6 space-y-4 flex-grow">
                                <div className="min-w-0">
                                    <h3 className="text-lg font-black uppercase tracking-tight truncate">{meal.name}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium italic leading-relaxed break-words">{meal.description || `Verified ${centerLabel} item.`}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                            <Button 
                                onClick={() => setSelectedMeal(meal)}
                                className="w-full h-12 sm:h-11 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-primary/10"
                            >
                                {soulName ? `Gift to ${soulName}` : 'Order Item'}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}

                {(!meals || meals.length === 0) && !isOwner && (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <ItemIcon className="h-16 w-16 text-muted-foreground opacity-10 mb-4" />
                        <p className="text-sm text-muted-foreground italic font-medium">This provider's {isGiftVendor ? 'catalog' : 'menu'} is coming soon.</p>
                    </div>
                )}
            </div>

            {/* Gift/Order Confirmation Interaction */}
            {mounted && (isMobile ? (
                <Sheet open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)}>
                    <SheetContent side="bottom" className="h-auto max-h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Confirm Gift</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Please send funds directly to the provider below.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-8">
                                {orderConfirmationContent}
                            </div>
                        </ScrollArea>
                        <SheetFooter className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
                            {orderConfirmationFooter}
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="p-8 border-b bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Confirm Gift</DialogTitle>
                                <DialogDescription className="text-sm font-medium mt-1">Please send the funds directly to the provider using the instructions below.</DialogDescription>
                            </DialogHeader>
                        </div>
                        <div className="p-8">
                            {orderConfirmationContent}
                        </div>
                        <DialogFooter className="p-8 bg-muted/5 border-t">
                            {orderConfirmationFooter}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ))}

            {/* Storefront Deletion Dialog */}
            <AlertDialog open={isDeleteStoreOpen} onOpenChange={setIsDeleteStoreOpen}>
                <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Delete Storefront?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                            This action is permanent and will remove "{vendor.businessName}" and its entire {isGiftVendor ? 'catalog' : 'menu'} from the Testify Network.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel disabled={isDeletingStore} className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStore} disabled={isDeletingStore} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">
                            {isDeletingStore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Item Deletion Dialog */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="w-[90vw] max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black font-headline uppercase tracking-tight">Remove {itemLabel}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Are you sure you want to delete "{itemToDelete?.name}" from your storefront?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel disabled={isDeletingItem} className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} disabled={isDeletingItem} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">
                            {isDeletingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Item
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
