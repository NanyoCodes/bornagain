'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useUser, useAuth, useCollection, useUserProfile, useFirestore } from '@/firebase';
import type { VendorProfile, Meal, UserProfile, MealGift, MealGiftStatus, Soul, Chat } from '@/lib/types';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, arrayUnion, deleteDoc, writeBatch, getDocs, where, getDoc, setDoc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, 
    Utensils, 
    Plus, 
    Loader2, 
    MapPin, 
    CreditCard,
    Edit,
    Trash2,
    Clipboard,
    Gift,
    Package,
    ChevronRight,
    Search,
    ShoppingBag,
    ShoppingCart,
    Minus,
    Camera,
    Store,
    MessagesSquare,
    Info,
    X,
    CheckCircle2,
    Truck,
    Timer,
    XCircle,
    Globe,
    Check,
    Quote,
    ChevronDown,
    ArrowRight
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
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
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Country, State } from 'country-state-city';
import Image from 'next/image';
import { ImageUpload } from '@/components/common/image-upload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';

const currencyOptions = [
    { value: 'NGN', label: 'Naira (₦)', symbol: '₦' },
    { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { value: 'EUR', label: 'Euro (€)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { value: 'GHS', label: 'Ghanaian Cedi (₵)', symbol: '₵' },
    { value: 'KES', label: 'Kenyan Shilling (KSh)', symbol: 'KSh' },
];

const getCurrencySymbol = (code?: string) => {
    return currencyOptions.find(opt => opt.value === code)?.symbol || '₦';
};

export default function VendorPageClient({ vendorId }: { vendorId: string }) {
    const searchParams = useSearchParams();
    const soulId = searchParams?.get('soulId') || null;
    const soulName = searchParams?.get('soulName') || null;
    const actionId = searchParams?.get('actionId') || null;
    
    const { user, loading: userLoading } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);

    const [itemSearchTerm, setItemSearchTerm] = useState('');

    const cartQuery = useMemo(() => (user && firestore) ? query(collection(firestore, 'users', user.uid, 'cart')) : null, [user, firestore]);
    const { data: cartDocs, loading: cartLoading } = useCollection<any>(cartQuery);

    const cart = useMemo(() => {
        const c: { [key: string]: any } = {};
        cartDocs?.forEach(doc => {
            c[doc.id] = { item: doc, quantity: doc.quantity };
        });
        return c;
    }, [cartDocs]);

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAddMealOpen, setIsAddMealOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Meal | null>(null);
    const [itemToEdit, setItemToEdit] = useState<Meal | null>(null);
    
    const [itemPhotoURL, setItemPhotoURL] = useState('');
    
    const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
    const [isDeletingItem, setIsDeletingItem] = useState(false);
    const [isUpdatingItem, setIsUpdatingItem] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const vendorDocRef = useMemo(() => (firestore && vendorId) ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor, loading: loadingVendor } = useDoc<VendorProfile>(vendorDocRef);

    const isOwner = useMemo(() => !!(user?.uid && vendor?.userId && user.uid === vendor.userId), [user, vendor]);

    const isGiftVendor = useMemo(() => vendor?.vendorType === 'gift', [vendor]);
    const centerLabel = useMemo(() => isGiftVendor ? 'Kindness Center' : 'Meals Center', [isGiftVendor]);
    const itemLabel = useMemo(() => isGiftVendor ? 'Product' : 'Meal', [isGiftVendor]);
    const addLabel = useMemo(() => isGiftVendor ? 'ADD NEW PRODUCT' : 'ADD NEW MEAL', [isGiftVendor]);

    const mealsQuery = useMemo(() => {
        if (!firestore || !vendorId) return null;
        return query(collection(firestore, 'vendors', vendorId, 'meals'), orderBy('createdAt', 'desc'));
    }, [firestore, vendorId]);
    const { data: meals, loading: loadingMeals } = useCollection<Meal>(mealsQuery);

    const filteredMeals = useMemo(() => {
        if (!meals) return [];
        if (!itemSearchTerm.trim()) return meals;
        const term = itemSearchTerm.toLowerCase();
        return meals.filter(m => 
            m.name.toLowerCase().includes(term) || 
            m.category?.toLowerCase().includes(term) || 
            m.description?.toLowerCase().includes(term)
        );
    }, [meals, itemSearchTerm]);

    const loading = userLoading || loadingVendor || loadingMeals || cartLoading;
    const cartItems = useMemo(() => Object.values(cart), [cart]);
    const cartCount = useMemo(() => cartItems.reduce((acc, c) => acc + c.quantity, 0), [cartItems]);

    const addToCart = async (item: Meal) => {
        if (!user?.uid || !firestore) return;
        const itemRef = doc(firestore, 'users', user.uid, 'cart', item.id);
        const existing = cart[item.id];
        const data = { ...item, vendorName: vendor?.businessName, vendorOwnerId: vendor?.userId, vendorPaymentDetails: vendor?.paymentDetails, vendorPhotoURL: vendor?.photoURL, vendorType: vendor?.vendorType, currency: vendor?.currency || 'NGN', quantity: (existing?.quantity || 0) + 1, updatedAt: serverTimestamp(), soulId, soulName };
        setDoc(itemRef, data, { merge: true });
    };

    const updateQuantity = async (itemId: string, currentQty: number, delta: number) => {
        if (!user?.uid || !firestore) return;
        const itemRef = doc(firestore, 'users', user.uid, 'cart', itemId);
        const newQty = currentQty + delta;
        if (newQty <= 0) deleteDoc(itemRef);
        else updateDoc(itemRef, { quantity: newQty, updatedAt: serverTimestamp() });
    };

    const handleAddMeal = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string);
        const deliveryFee = parseFloat(formData.get('deliveryFee') as string) || 0;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        if (!name || isNaN(price)) return;
        setIsSubmittingMeal(true);
        const mealsRef = collection(firestore!, 'vendors', vendorId, 'meals');
        addDoc(mealsRef, { vendorId, name, price, deliveryFee, description, category, currency: vendor?.currency || 'NGN', photoURL: itemPhotoURL || null, createdAt: serverTimestamp() }).then(() => { toast({ title: 'Item Added' }); setIsAddMealOpen(false); }).finally(() => setIsSubmittingMeal(false));
    };

    const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!itemToEdit) return;
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string);
        const deliveryFee = parseFloat(formData.get('deliveryFee') as string) || 0;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        if (!name || isNaN(price)) return;
        setIsUpdatingItem(true);
        updateDoc(doc(firestore!, 'vendors', vendorId, 'meals', itemToEdit.id), { name, price, deliveryFee, description, category, photoURL: itemPhotoURL || null, updatedAt: serverTimestamp() }).then(() => { toast({ title: 'Item Updated' }); setItemToEdit(null); }).finally(() => setIsUpdatingItem(false));
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete || !firestore) return;
        setIsDeletingItem(true);
        deleteDoc(doc(firestore, 'vendors', vendorId, 'meals', itemToDelete.id)).then(() => { toast({ title: 'Item Removed' }); setItemToDelete(null); }).finally(() => setIsDeletingItem(false));
    };

    const itemForm = (item?: Meal | null, isEdit = false) => (
        <form onSubmit={isEdit ? handleUpdateItem : handleAddMeal}>
            <div className="p-8 space-y-6 text-left">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"> {itemLabel} Visual</Label>
                  <ImageUpload initialImageUrl={itemPhotoURL} onUploadComplete={setItemPhotoURL} storagePath="marketplace-items" cropAspect={4/3} />
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"> {itemLabel} Name</Label><Input name="name" defaultValue={item?.name || ''} placeholder={`e.g. ${isGiftVendor ? 'Study Bible' : 'Full Platter'}`} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price ({getCurrencySymbol(vendor?.currency)})</Label><Input name="price" type="number" step="0.01" defaultValue={item?.price || ''} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Delivery Fee</Label><Input name="deliveryFee" type="number" step="0.01" defaultValue={item?.deliveryFee || ''} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label><Input name="category" defaultValue={item?.category || ''} placeholder="e.g. Bibles, Lunch..." className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label><Textarea name="description" defaultValue={item?.description || ''} placeholder="Provide details about this offering..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" /></div>
            </div>
            <div className="p-8 border-t bg-muted/5 flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => { setIsAddMealOpen(false); setItemToEdit(null); }} className="flex-1 rounded-xl h-12 font-bold text-left text-left">Cancel</Button>
                <Button type="submit" disabled={isSubmittingMeal || isUpdatingItem} className="flex-1 rounded-xl h-12 font-black shadow-lg uppercase tracking-widest text-center">
                    {(isSubmittingMeal || isUpdatingItem) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? 'SAVE CHANGES' : 'ADD TO CATALOG'}
                </Button>
            </div>
        </form>
    );

    if (loading || !vendor) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    return (
        <div className="w-full">
            <div className="space-y-8 pb-32 max-w-4xl mx-auto text-left">
                <div className="px-4 sm:px-0 flex flex-col gap-6 pt-4 text-left">
                    <div className="flex items-center gap-4 text-left">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left"><ArrowLeft className="h-6 w-6" /></Button>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1 text-left">
                                {isGiftVendor ? <Gift className="h-3.5 w-3.5 text-primary text-left" /> : <Utensils className="h-3.5 w-3.5 text-primary text-left" />}
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left">{centerLabel}</span>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black font-headline uppercase truncate leading-tight text-left">{vendor.businessName}</h1>
                        </div>
                    </div>

                    <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 border-background bg-muted text-left">
                        {vendor.photoURL ? <Image src={vendor.photoURL} alt={vendor.businessName} fill className="object-cover" unoptimized /> : <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 text-left"><Store className="h-16 w-16 text-primary opacity-10 text-left" /></div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left" />
                        <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 text-white max-w-[80%] text-left text-left">
                            <div className="flex items-center gap-2 opacity-80 mb-2 text-left">
                                <MapPin className="h-3.5 w-3.5 text-primary text-left" />
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate text-left">{vendor.location || 'Kingdom Network'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative text-left">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40 text-left" />
                        <Input placeholder={`Search ${itemLabel.toLowerCase()}s...`} value={itemSearchTerm} onChange={e => setItemSearchTerm(e.target.value)} className="h-12 pl-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold w-full text-left" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0 text-left">
                    {isOwner && !itemSearchTerm && (
                        <Card className="rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[280px] shadow-sm text-left" onClick={() => setIsAddMealOpen(true)}>
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-left"><Plus className="h-6 w-6 text-primary text-left" /></div>
                            <h3 className="font-black uppercase tracking-widest text-primary text-xs text-center text-left"> {addLabel}</h3>
                        </Card>
                    )}

                    {filteredMeals.map(meal => {
                        const cartItem = cart[meal.id];
                        const itemSymbol = getCurrencySymbol(meal.currency);
                        return (
                            <Card key={meal.id} className="rounded-[2rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full text-left">
                                <CardContent className="p-0 text-left">
                                    <div className="aspect-[4/3] relative bg-muted text-left">
                                        {meal.photoURL ? <Image src={meal.photoURL} alt={meal.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full flex items-center justify-center text-left">{isGiftVendor ? <Package className="h-12 w-12 text-muted-foreground opacity-10 text-left" /> : <Utensils className="h-12 w-12 text-muted-foreground opacity-10 text-left" />}</div>}
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 text-left">
                                            <Badge className="bg-primary text-white font-black text-[10px] px-3 h-8 rounded-full shadow-lg border-none tracking-widest text-center text-left">{itemSymbol}{meal.price.toLocaleString()}</Badge>
                                            {meal.deliveryFee ? <Badge variant="outline" className="bg-background/80 backdrop-blur-md text-muted-foreground font-black text-[7px] px-1.5 h-4 rounded-full border-none tracking-tighter shadow-sm text-center text-left">+ {itemSymbol}{meal.deliveryFee.toLocaleString()} DEL</Badge> : null}
                                        </div>
                                        {cartItem && <div className="absolute bottom-4 left-4 bg-primary text-white font-black text-xs h-8 w-8 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in text-center text-left"> {cartItem.quantity}</div>}
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-4 flex-grow text-left">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight truncate leading-tight mb-1 text-left">{meal.name}</h3>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 font-medium italic leading-relaxed text-left">{meal.description || `Verified Kingdom service item.`}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 sm:p-8 pt-0 flex gap-2 text-left">
                                    {isOwner && (
                                        <div className="flex gap-2 text-left">
                                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0 text-left" onClick={() => { setItemPhotoURL(meal.photoURL || ''); setItemToEdit(meal); }}><Edit className="h-4 w-4 text-primary text-left" /></Button>
                                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0 text-destructive hover:bg-destructive/10 text-left" onClick={() => setItemToDelete(meal)}><Trash2 className="h-4 w-4 text-left" /></Button>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 text-left">
                                        {cartItem ? (
                                            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border text-left">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-left" onClick={() => updateQuantity(meal.id, cartItem.quantity, -1)}><Minus className="h-3.5 w-3.5 text-left"/></Button>
                                                <span className="flex-1 text-center font-black text-[10px] uppercase tracking-tighter text-center text-left">IN PACKAGE</span>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-left" onClick={() => updateQuantity(meal.id, cartItem.quantity, 1)}><Plus className="h-3.5 w-3.5 text-left"/></Button>
                                            </div>
                                        ) : (
                                            <Button onClick={() => addToCart(meal)} className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10 transition-all active:scale-90 text-center text-left">{soulName ? `FOR ${soulName}` : 'ADD TO PACKAGE'}</Button>
                                        )}
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
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
                                    <div className="flex flex-col text-left leading-none min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1 text-left">{isGiftVendor ? 'Kindness Package' : 'Provision Package'}</span>
                                        <span className="text-[13px] font-black uppercase tracking-tight text-zinc-100 truncate text-left">View My Offering</span>
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_20px_rgba(249,116,22,0.4)] transition-all relative z-10 shrink-0 mr-1 text-left">
                                    <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1 text-left" />
                                </div>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
            
            <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[90vh] text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left"> {addLabel}</DialogTitle>
                        </DialogHeader>
                    </div>
                    <div className="flex-grow overflow-hidden text-left">{itemForm()}</div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[90vh] text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Edit Offering</DialogTitle>
                        </DialogHeader>
                    </div>
                    <div className="flex-grow overflow-hidden text-left">{itemForm(itemToEdit, true)}</div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                    <AlertDialogHeader className="text-left">
                        <AlertDialogTitle className="font-black font-headline uppercase tracking-tight text-xl text-left">Remove Offering?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium text-left">Delete "{itemToDelete?.name}" from your catalog?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6 text-left">
                        <AlertDialogCancel className="rounded-xl h-11 font-bold text-left">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} disabled={isDeletingItem} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold text-center text-left">{isDeletingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <Trash2 className="mr-2 h-4 w-4 text-left" />}Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
