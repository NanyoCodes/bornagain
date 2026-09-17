'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection, useUserProfile } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, arrayUnion, deleteDoc, writeBatch, getDocs, where, getDoc, setDoc } from 'firebase/firestore';
import type { VendorProfile, Meal, UserProfile, Chat, MealGift, MealGiftStatus, Soul } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    Check
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription,
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
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { ImageUpload } from '@/components/common/image-upload';
import { Country, State } from 'country-state-city';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { format } from 'date-fns';

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

function VendorOrdersSheet({ vendorId, isOpen, onOpenChange }: { vendorId: string; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
    const ordersQuery = useMemo(() => {
        if (!firestore || !vendorId || !user?.uid) return null;
        return query(
            collection(firestore, 'mealGifts'), 
            where('vendorOwnerId', '==', user.uid),
            where('vendorId', '==', vendorId)
        );
    }, [firestore, vendorId, user?.uid]);
    const { data: rawOrders, loading } = useCollection<MealGift>(ordersQuery);

    const orders = useMemo(() => {
        if (!rawOrders) return [];
        return [...rawOrders].sort((a, b) => {
            const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
            const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
            return timeB - timeA;
        });
    }, [rawOrders]);

    const updateOrderStatus = async (orderId: string, newStatus: MealGiftStatus, senderId: string, itemName: string) => {
        if (!user || !firestore) return;
        
        const orderRef = doc(firestore, 'mealGifts', orderId);
        const batch = writeBatch(firestore);

        batch.update(orderRef, { status: newStatus });

        const notificationRef = doc(collection(firestore, `users/${senderId}/notifications`));
        batch.set(notificationRef, {
            userId: senderId,
            type: 'order_update',
            title: 'Provision Status Updated',
            message: `Your offering of "${itemName}" is now ${newStatus.toUpperCase()}.`,
            link: `/marketplace/orders`,
            isRead: false,
            createdAt: serverTimestamp(),
        });

        try {
            await batch.commit();
            toast({ title: 'Status Updated', description: `Order is now ${newStatus}.` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const getStatusIcon = (status: MealGiftStatus) => {
        switch (status) {
            case 'ordered': return <Timer className="h-4 w-4 text-amber-500" />;
            case 'preparing': return <Utensils className="h-4 w-4 text-blue-500" />;
            case 'delivering': return <Truck className="h-4 w-4 text-primary" />;
            case 'delivered': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'cancelled': return <XCircle className="h-4 w-4 text-destructive" />;
        }
    };

    const listContent = (
        <div className="space-y-4 pb-12 text-left">
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                </div>
            ) : orders && orders.length > 0 ? (
                orders.map(order => (
                    <Card key={order.id} className="rounded-2xl border-2 overflow-hidden bg-muted/5 text-left">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <div className="min-w-0 text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">RECIPIENT: {order.recipientName}</p>
                                <h4 className="font-bold text-sm truncate uppercase tracking-tight text-left">{order.mealName}</h4>
                            </div>
                            <Badge variant="outline" className={cn("h-6 flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-tighter", order.status === 'delivered' ? 'text-green-500 border-green-500/20' : 'text-primary border-primary/20')}>
                                {getStatusIcon(order.status)}
                                {order.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3 text-left">
                            <p className="text-xs text-muted-foreground leading-relaxed italic text-left">
                                &ldquo;{order.instructions}&rdquo;
                            </p>
                            <div className="flex items-center justify-between pt-2 border-t border-dashed text-left">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase text-left">From: {order.senderName}</p>
                                <div className="text-right text-left">
                                    <p className="text-[10px] font-bold text-primary uppercase text-left">{getCurrencySymbol(order.currency)}{(order.price + (order.deliveryFee || 0)).toLocaleString()}</p>
                                    {order.deliveryFee ? <p className="text-[7px] font-black uppercase text-muted-foreground text-left">Incl. Delivery</p> : null}
                                </div>
                            </div>
                        </CardContent>
                        {order.status !== 'cancelled' && (
                            <CardFooter className="p-2 bg-muted/20 border-t flex gap-1 text-left">
                                {['preparing', 'delivering', 'delivered'].map((status) => (
                                    <Button 
                                        key={status}
                                        variant="ghost" 
                                        size="sm" 
                                        disabled={order.status === status}
                                        className={cn(
                                            "flex-1 h-7 text-[8px] font-black uppercase tracking-tighter rounded-lg text-left",
                                            order.status === status && "bg-background text-primary shadow-sm"
                                        )}
                                        onClick={() => updateOrderStatus(order.id, status as MealGiftStatus, order.senderId, order.mealName)}
                                    >
                                        {status === 'preparing' && 'Prep'}
                                        {status === 'delivering' && 'Ship'}
                                        {status === 'delivered' && 'Done'}
                                    </Button>
                                ))}
                            </CardFooter>
                        )}
                    </Card>
                ))
            ) : (
                <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed text-left">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4 text-left" />
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest text-center text-left">No orders received yet.</p>
                </div>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <SheetHeader className="text-left flex-shrink-0 text-left">
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Order Hub</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left">Manage and update deliveries for your Kingdom offerings.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow px-8 pt-6 text-left">
                        {listContent}
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[85vh] text-left text-left">
                <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Order Hub</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1 text-left">Manage and update deliveries for your Kingdom offerings.</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="flex-grow p-8 text-left">
                    {listContent}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

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
    const [giftInstructions, setGiftInstructions] = useState('');
    const [manualRecipientName, setManualRecipientName] = useState('');

    const [isAddMealOpen, setIsAddMealOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isDeleteStoreOpen, setIsDeleteStoreOpen] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Meal | null>(null);
    const [itemToEdit, setItemToEdit] = useState<Meal | null>(null);
    
    const [itemPhotoURL, setItemPhotoURL] = useState('');
    const [vendorPhotoURL, setVendorPhotoURL] = useState('');
    
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isDeletingStore, setIsDeletingStore] = useState(false);
    const [isDeletingItem, setIsDeletingItem] = useState(false);
    const [isUpdatingItem, setIsUpdatingItem] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const [editCountry, setEditCountry] = useState('');
    const [editState, setEditState] = useState('');
    const [editCity, setEditCity] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editCurrency, setEditCurrency] = useState('NGN');

    const countriesList = useMemo(() => Country.getAllCountries(), []);
    const statesList = useMemo(() => {
        const country = countriesList.find(c => c.name === editCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [editCountry, countriesList]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const vendorDocRef = useMemo(() => (firestore && vendorId) ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor, loading: loadingVendor } = useDoc<VendorProfile>(vendorDocRef);

    const isOwner = useMemo(() => !!(user?.uid && vendor?.userId && user.uid === vendor.userId), [user, vendor]);

    useEffect(() => {
        if (vendor?.location) {
            const parts = vendor.location.split(',').map(p => p.trim());
            if (parts.length >= 4) {
                setEditAddress(parts[0]);
                setEditCity(parts[1]);
                setEditState(parts[2]);
                setEditCountry(parts[3]);
            }
        }
        if (vendor?.photoURL) setVendorPhotoURL(vendor.photoURL);
        if (vendor?.currency) setEditCurrency(vendor.currency);
    }, [vendor]);

    useEffect(() => {
        if (itemToEdit) setItemPhotoURL(itemToEdit.photoURL || '');
        else if (isAddMealOpen) setItemPhotoURL('');
    }, [itemToEdit, isAddMealOpen]);

    const mealsQuery = useMemo(() => {
        if (!firestore || !vendorId) return null;
        return query(collection(firestore, 'vendors', vendorId, 'meals'), orderBy('createdAt', 'desc'));
    }, [firestore, vendorId]);
    const { data: meals, loading: loadingMeals } = useCollection<Meal>(mealsQuery);

    const loading = userLoading || loadingVendor || loadingMeals || cartLoading;

    const cartItems = useMemo(() => Object.values(cart), [cart]);

    const cartByVendor = useMemo(() => {
        const groups: { [vId: string]: any } = {};
        cartItems.forEach(c => {
            const vId = c.item.vendorId;
            if (!groups[vId]) {
                groups[vId] = {
                    vendorId: vId,
                    vendorName: c.item.vendorName || 'Kingdom Provider',
                    vendorOwnerId: c.item.vendorOwnerId || '',
                    paymentDetails: c.item.vendorPaymentDetails || '',
                    currency: c.item.currency || 'NGN',
                    items: [],
                    deliveryFee: 0,
                    subtotal: 0
                };
            }
            groups[vId].items.push(c);
            groups[vId].subtotal += (c.item.price * c.quantity);
            groups[vId].deliveryFee = Math.max(groups[vId].deliveryFee, c.item.deliveryFee || 0);
        });
        return Object.values(groups);
    }, [cartItems]);

    const cartCount = useMemo(() => cartItems.reduce((acc, c) => acc + c.quantity, 0), [cartItems]);

    const addToCart = async (item: Meal) => {
        if (!user?.uid || !firestore) {
            toast({ variant: 'destructive', title: 'Login Required' });
            return;
        }
        const itemRef = doc(firestore, 'users', user.uid, 'cart', item.id);
        const existing = cart[item.id];
        const data = { ...item, vendorName: vendor?.businessName, vendorOwnerId: vendor?.userId, vendorPaymentDetails: vendor?.paymentDetails, vendorPhotoURL: vendor?.photoURL, vendorType: vendor?.vendorType, currency: vendor?.currency || 'NGN', quantity: (existing?.quantity || 0) + 1, updatedAt: serverTimestamp() };
        setDoc(itemRef, data, { merge: true }).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'write' }, user)));
    };

    const updateQuantity = async (itemId: string, delta: number) => {
        if (!user?.uid || !firestore) return;
        const existing = cart[itemId];
        if (!existing) return;
        const itemRef = doc(firestore, 'users', user.uid, 'cart', itemId);
        const newQty = existing.quantity + delta;
        if (newQty <= 0) deleteDoc(itemRef);
        else updateDoc(itemRef, { quantity: newQty, updatedAt: serverTimestamp() });
    };

    const removeFromCart = async (itemId: string) => {
        if (!user?.uid || !firestore) return;
        deleteDoc(doc(firestore, 'users', user.uid, 'cart', itemId));
    };

    const handleInitiateChat = async () => {
        if (!user || !firestore || !vendor) return;
        setIsChatLoading(true);
        try {
            const participantIds = [user.uid, vendor.userId].sort();
            const chatsRef = collection(firestore, 'chats');
            const q = query(chatsRef, where('participantIds', '==', participantIds), where('isGroupChat', '==', false));
            const querySnapshot = await getDocs(q);
            let existingChat = querySnapshot.docs.find(doc => doc.data().vendorId === vendor.id);
            let chatId = existingChat?.id;
            if (!chatId) {
                const ownerDoc = await getDoc(doc(firestore, "users", vendor.userId));
                const organizerProfile = ownerDoc.data() as UserProfile | undefined;
                const [userFirstName, ...userLastNameParts] = user.displayName?.split(' ') || ['User', ''];
                const newChatData: any = { participantIds, participantInfo: { [user.uid]: { firstName: userFirstName, lastName: userLastNameParts.join(' '), photoURL: user.photoURL || '' }, [vendor.userId]: { firstName: vendor.businessName, lastName: '', photoURL: organizerProfile?.photoURL || '' } }, vendorId: vendor.id, campaignTitle: vendor.businessName, lastUpdatedAt: serverTimestamp(), hasMessages: false, isGroupChat: false };
                const chatDocRef = await addDoc(chatsRef, newChatData);
                chatId = chatDocRef.id;
            }
            router.push(`/dashboard/chats/${chatId}`);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Chat Error' });
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleAddMeal = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !vendor) return;
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string);
        const deliveryFee = parseFloat(formData.get('deliveryFee') as string) || 0;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        if (!name || isNaN(price)) return;
        setIsSubmittingMeal(true);
        const mealsRef = collection(firestore, 'vendors', vendorId, 'meals');
        const mealData = { vendorId, name, price, deliveryFee, description, category, currency: vendor?.currency || 'NGN', photoURL: itemPhotoURL || null, createdAt: serverTimestamp() };
        addDoc(mealsRef, mealData).then(() => { toast({ title: 'Item Added' }); setIsAddMealOpen(false); }).catch(async (serverError) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `vendors/${vendorId}/meals`, operation: 'create', requestResourceData: mealData }, user))).finally(() => setIsSubmittingMeal(false));
    };

    const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !itemToEdit) return;
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string);
        const deliveryFee = parseFloat(formData.get('deliveryFee') as string) || 0;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        if (!name || isNaN(price)) return;
        setIsUpdatingItem(true);
        const itemRef = doc(firestore, 'vendors', vendorId, 'meals', itemToEdit.id);
        const updateData = { name, price, deliveryFee, description, category, photoURL: itemPhotoURL || null, updatedAt: serverTimestamp() };
        updateDoc(itemRef, updateData).then(() => { toast({ title: 'Item Updated' }); setItemToEdit(null); }).catch(async (serverError) => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'update', requestResourceData: updateData }, user))).finally(() => setIsUpdatingItem(false));
    };

    const handleDeleteItem = () => {
        if (!user || !firestore || !itemToDelete) return;
        setIsDeletingItem(true);
        const mealRef = doc(firestore, 'vendors', vendorId, 'meals', itemToDelete.id);
        deleteDoc(mealRef).then(() => { toast({ title: 'Item Removed' }); setItemToDelete(null); }).finally(() => setIsDeletingItem(false));
    };

    const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !vendor) return;
        const formData = new FormData(e.currentTarget);
        const businessName = formData.get('businessName') as string;
        const description = formData.get('description') as string;
        const paymentDetails = formData.get('paymentDetails') as string;
        const locationString = [editAddress, editCity, editState, editCountry].filter(Boolean).join(', ');
        setIsUpdatingProfile(true);
        const vendorRef = doc(firestore, 'vendors', vendorId);
        const updateData = { businessName, description, location: locationString, paymentDetails, currency: editCurrency, photoURL: vendorPhotoURL || null, updatedAt: serverTimestamp() };
        updateDoc(vendorRef, updateData).then(() => { toast({ title: 'Profile Updated' }); setIsEditProfileOpen(false); }).finally(() => setIsUpdatingProfile(false));
    };

    const handleDeleteStore = () => {
        if (!user || !firestore || !vendor) return;
        setIsDeletingStore(true);
        deleteDoc(doc(firestore, 'vendors', vendorId)).then(() => router.push(vendor?.vendorType === 'gift' ? '/marketplace/gifts' : '/marketplace')).finally(() => setIsDeletingStore(false));
    };

    const handleGiftItems = async () => {
        if (!user || !firestore || !userProfile || !vendor || cartItems.length === 0) return;
        const finalRecipientName = soulName || manualRecipientName;
        if (!finalRecipientName.trim() || !giftInstructions.trim()) {
            toast({ variant: 'destructive', title: 'Details Required' });
            return;
        }
        setIsProcessingOrder(true);
        const batch = writeBatch(firestore);
        const giftsRef = collection(firestore, 'mealGifts');
        const logActionId = vendor?.vendorType === 'gift' ? 'gave_gift' : 'shared_meal';
        const logEntry = { date: new Date(), note: `Logged via Kingdom Hub: FULFILLED [${cartItems.map(c => `${c.item.name} (x${c.quantity})`).join(', ')}]. Instructions: ${giftInstructions}`, actions: [logActionId], memberId: user.uid, memberName: `${userProfile?.firstName} ${userProfile?.lastName}` };
        
        cartItems.forEach(cartItem => {
            for(let i = 0; i < cartItem.quantity; i++) {
                const giftRef = doc(giftsRef);
                batch.set(giftRef, { senderId: user.uid, senderName: `${userProfile.firstName} ${userProfile.lastName}`, recipientSoulId: soulId || null, recipientName: finalRecipientName, vendorId: cartItem.item.vendorId, vendorName: cartItem.item.vendorName || 'Kingdom Store', vendorOwnerId: cartItem.item.vendorOwnerId, vendorPhotoURL: cartItem.item.vendorPhotoURL || null, vendorType: cartItem.item.vendorType || 'meal', mealId: cartItem.item.id, mealName: cartItem.item.name, price: cartItem.item.price, deliveryFee: cartItem.item.deliveryFee || 0, currency: cartItem.item.currency || 'NGN', status: 'ordered' as MealGiftStatus, instructions: giftInstructions, createdAt: serverTimestamp() });
            }
            batch.delete(doc(firestore, 'users', user.uid, 'cart', cartItem.item.id));
            if (cartItem.item.vendorOwnerId && cartItem.item.vendorOwnerId !== user.uid) {
                const notifRef = doc(collection(firestore, `users/${cartItem.item.vendorOwnerId}/notifications`));
                batch.set(notifRef, { userId: cartItem.item.vendorOwnerId, type: 'new_order', title: 'New Offering Order!', message: `${userProfile.firstName} ordered "${cartItem.item.name}" for ${finalRecipientName}.`, link: `/marketplace/orders`, isRead: false, createdAt: serverTimestamp() });
            }
        });

        if (soulId) {
            batch.update(doc(firestore, `users/${user.uid}/souls`, soulId), { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
            batch.update(doc(firestore, 'souls', soulId), { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
        }

        const dateString = format(new Date(), 'yyyy-MM-dd');
        batch.update(doc(firestore, 'users', user.uid), { 'dailyDiscipline.completed': arrayUnion(logActionId), 'dailyDiscipline.lastUpdated': serverTimestamp() });
        batch.set(doc(firestore, 'users', user.uid, 'disciplineHistory', dateString), { completed: arrayUnion(logActionId), date: serverTimestamp() }, { merge: true });

        batch.commit().then(() => { toast({ title: 'Offering Confirmed!' }); router.push('/souls-won'); }).finally(() => setIsProcessingOrder(false));
    };

    const isGiftVendor = vendor?.vendorType === 'gift';
    const storagePath = isGiftVendor ? 'kindness-center' : 'meals-center';
    const centerLabel = isGiftVendor ? 'Kindness Center' : 'Meals Center';
    const itemLabel = isGiftVendor ? 'Product' : 'Meal';
    const addLabel = isGiftVendor ? 'ADD NEW PRODUCT' : 'ADD NEW MEAL';
    const categoryPlaceholder = isGiftVendor ? 'e.g. Bibles' : 'e.g. Breakfast';
    const descriptionPlaceholder = isGiftVendor ? 'Product details...' : 'Meal ingredients and portions...';

    const editProfileForm = (
        <form onSubmit={handleUpdateProfile} className="flex flex-col h-full min-h-0 text-left">
            <ScrollArea className="flex-grow min-h-0 text-left">
                <div className="p-6 sm:p-8 space-y-6 text-left text-left">
                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Storefront Branding</Label>
                        <ImageUpload initialImageUrl={vendorPhotoURL} onUploadComplete={setVendorPhotoURL} storagePath="vendor-branding" cropAspect={21/9}/>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Business Name</Label>
                        <Input name="businessName" defaultValue={vendor?.businessName || ""} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Store Currency</Label>
                        <Select onValueChange={setEditCurrency} value={editCurrency}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left"><SelectValue placeholder="Select Currency" /></SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {currencyOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="rounded-xl font-bold">{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Location Details</Label>
                        <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Street Address" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <Select onValueChange={setEditCountry} value={editCountry}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner"><SelectValue placeholder="Country" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">{countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select onValueChange={setEditState} value={editState} disabled={!editCountry || statesList.length === 0}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner"><SelectValue placeholder="State" /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">{statesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <Input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="City" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">About Your Service</Label>
                        <Textarea id="description" name="description" defaultValue={vendor?.description || ""} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label htmlFor="paymentDetails" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Payment Instructions</Label>
                        <Textarea id="paymentDetails" name="paymentDetails" defaultValue={vendor?.paymentDetails || ""} placeholder="Bank details..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" required />
                    </div>
                </div>
            </ScrollArea>
            <div className="p-6 sm:p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row mt-auto shrink-0 text-left">
                <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isUpdatingProfile} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest text-left">
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}Update Profile
                </Button>
            </div>
        </form>
    );

    const itemForm = (initialItem?: Meal | null, isEdit = false) => (
        <form onSubmit={isEdit ? handleUpdateItem : handleAddMeal} className="flex flex-col h-full min-h-0 text-left">
            <ScrollArea className="flex-1 min-h-0 text-left">
                <div className="p-6 sm:p-8 space-y-6 text-left">
                    <div className="space-y-4 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">{itemLabel} Photo</Label>
                        <ImageUpload initialImageUrl={itemPhotoURL} onUploadComplete={setItemPhotoURL} storagePath={storagePath} cropAspect={4/3}/>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">{itemLabel} Name</Label>
                        <Input name="name" defaultValue={initialItem?.name || ""} placeholder={`e.g., ${isGiftVendor ? 'Study Bible' : 'Jollof Rice'}`} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Price ({vendor?.currency})</Label>
                            <Input name="price" type="number" defaultValue={initialItem?.price} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                        </div>
                        <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Delivery Fee</Label>
                            <Input name="deliveryFee" type="number" defaultValue={initialItem?.deliveryFee} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                        </div>
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Category</Label>
                        <Input name="category" defaultValue={initialItem?.category || ""} placeholder={categoryPlaceholder} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Description</Label>
                        <Textarea name="description" defaultValue={initialItem?.description || ""} placeholder={descriptionPlaceholder} className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </div>
                </div>
            </ScrollArea>
            <div className="p-6 sm:p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row shrink-0 text-left">
                <Button type="button" variant="outline" onClick={() => isEdit ? setItemToEdit(null) : setIsAddMealOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isEdit ? isUpdatingItem : isSubmittingMeal} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {(isEdit ? isUpdatingItem : isSubmittingMeal) && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}{isEdit ? 'Save Changes' : 'Add Item'}
                </Button>
            </div>
        </form>
    );

    return (
        <div className="w-full text-left">
            <div className="space-y-8 pb-32 max-w-4xl mx-auto text-left">
                <div className="px-4 sm:px-0 flex flex-col gap-6 pt-4 text-left">
                    <div className="flex flex-col gap-4 text-left">
                        <div className="flex items-center gap-4 text-left">
                            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                                <ArrowLeft className="h-6 w-6 text-left" />
                            </Button>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-2.5 mb-1 text-left">
                                    {isGiftVendor ? <Gift className="h-3.5 w-3.5 text-primary text-left" /> : <Utensils className="h-3.5 w-3.5 text-primary text-left" />}
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-left"> {centerLabel}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 border-background bg-muted text-left">
                            {vendor.photoURL ? (
                                <Image src={vendor.photoURL} alt={vendor.businessName} fill className="object-cover text-left" unoptimized />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 text-left text-left text-left">
                                    <Store className="h-16 w-16 text-primary opacity-10 text-left text-left" />
                                    <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mt-2 text-left">Kingdom Hub</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent text-left" />
                            <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 text-white max-w-[80%] text-left">
                                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-headline uppercase tracking-tight leading-tight text-balance text-left">{vendor.businessName}</h1>
                                <div className="flex items-center gap-2 mt-2 opacity-80 text-left">
                                    <MapPin className="h-3.5 w-3.5 text-primary text-left" />
                                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate text-left">{vendor.location || 'Kingdom Network'}</p>
                                </div>
                            </div>
                            {isOwner && (
                                <Button variant="outline" size="icon" className="absolute top-4 right-4 rounded-xl h-10 w-10 bg-background/50 backdrop-blur-md border-white/20 text-white hover:bg-background/80" onClick={() => setIsEditProfileOpen(true)}><Camera className="h-5 w-5 text-left" /></Button>
                            )}
                            {vendor.currency && (
                                <Badge className="absolute top-4 right-4 rounded-xl bg-primary text-white border-none h-10 px-4 font-black uppercase tracking-widest shadow-xl hidden sm:flex text-left">
                                    <Globe className="mr-2 h-4 w-4 text-left" /> {vendor.currency}
                                </Badge>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 px-1 text-left">
                        {!isOwner ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shrink-0 text-left" onClick={handleInitiateChat} disabled={isChatLoading}>
                                            {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin text-left" /> : <MessagesSquare className="h-5 w-5 text-left" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left"><p className="text-[10px] font-bold uppercase text-left">Provider Chat</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shrink-0 text-left" onClick={() => setIsOrdersOpen(true)}>
                                            <ShoppingBag className="h-5 w-5 text-left" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left"><p className="text-[10px] font-bold uppercase text-left">Manage Orders</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {isOwner && (
                            <Button variant="outline" onClick={() => setIsEditProfileOpen(true)} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[10px] shadow-md border-primary/20 text-primary text-left">
                                <Edit className="mr-2 h-4 w-4 text-left" /> MANAGE HUB
                            </Button>
                        )}
                    </div>

                    {vendor.description && <p className="text-sm sm:text-base text-muted-foreground leading-relaxed italic px-1 sm:px-0 text-balance max-w-3xl text-left">{vendor.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0 text-left">
                    {isOwner && (
                        <Card className="rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[280px] shadow-sm text-left" onClick={() => setIsAddMealOpen(true)}>
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-left"><Plus className="h-6 w-6 text-primary text-left" /></div>
                            <h3 className="font-black uppercase tracking-widest text-primary text-xs text-left"> {addLabel}</h3>
                        </Card>
                    )}

                    {meals?.map(meal => {
                        const cartItem = cart[meal.id];
                        const itemSymbol = getCurrencySymbol(meal.currency);
                        return (
                            <Card key={meal.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full text-left">
                                <CardContent className="p-0 text-left">
                                    <div className="aspect-[4/3] relative bg-muted text-left text-left">
                                        {meal.photoURL ? <img src={meal.photoURL} alt={meal.name} className="w-full h-full object-cover text-left" /> : <div className="w-full h-full flex items-center justify-center text-left">{isGiftVendor ? <Package className="h-12 w-12 text-muted-foreground opacity-10 text-left" /> : <Utensils className="h-12 w-12 text-muted-foreground opacity-10 text-left" />}</div>}
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 text-left">
                                            <Badge className="bg-primary text-white font-black text-[10px] px-3 h-8 rounded-full shadow-lg border-none tracking-widest text-left">{itemSymbol}{meal.price.toLocaleString()}</Badge>
                                            {meal.deliveryFee ? <Badge variant="outline" className="bg-background/80 backdrop-blur-md text-muted-foreground font-black text-[7px] px-1.5 h-4 rounded-full border-none tracking-tighter shadow-sm text-left">+ {itemSymbol}{meal.deliveryFee.toLocaleString()} DEL</Badge> : null}
                                        </div>
                                        {cartItem && <div className="absolute bottom-4 left-4 bg-primary text-white font-black text-xs h-8 w-8 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in text-left"> {cartItem.quantity}</div>}
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-4 flex-grow text-left">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight truncate leading-tight text-left">{meal.name}</h3>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 font-medium italic leading-relaxed text-left">{meal.description || `Verified Kingdom service item.`}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 sm:p-8 pt-0 flex gap-2 text-left">
                                    <div className="flex-1 flex flex-col gap-2 w-full text-left">
                                        <div className="flex items-center gap-2 text-left">
                                            {isOwner && (
                                                <div className="flex gap-2 text-left">
                                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0 text-left" onClick={() => { setItemPhotoURL(meal.photoURL || ''); setItemToEdit(meal); }}><Edit className="h-4 w-4 text-primary text-left" /></Button>
                                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0 text-destructive hover:bg-destructive/10 text-left" onClick={() => setItemToDelete(meal)}><Trash2 className="h-4 w-4 text-left" /></Button>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 text-left text-left">
                                                {cartItem ? (
                                                    <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border text-left">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-left" onClick={() => updateQuantity(meal.id, -1)}><Minus className="h-3 w-3 text-left"/></Button>
                                                        <span className="flex-1 text-center font-black text-[10px] uppercase tracking-tighter text-left">IN PACKAGE</span>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-left" onClick={() => updateQuantity(meal.id, 1)}><Plus className="h-3 w-3 text-left"/></Button>
                                                    </div>
                                                ) : (
                                                    <Button onClick={() => addToCart(meal)} className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/10 transition-all active:scale-95 text-left">{soulName ? `FOR ${soulName}` : 'ADD TO PACKAGE'}</Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                {cartCount > 0 && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-[22rem] px-4 animate-in slide-in-from-bottom-10 text-left">
                        <Button onClick={() => setIsCartOpen(true)} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-2xl shadow-primary/40 border-4 border-background flex items-center justify-between px-8 text-left">
                            <div className="flex items-center gap-3 text-left"><div className="relative text-left"><ShoppingCart className="h-5 w-5 text-left"/><span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center text-left text-left"> {cartCount}</span></div><span className="text-xs text-left">VIEW PACKAGE</span></div>
                            <span className="text-sm text-left">CHECKOUT</span>
                        </Button>
                    </div>
                )}
            </div>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left">
                        <div className="flex items-center gap-2 mb-2 text-left"><ShoppingCart className="h-4 w-4 text-primary text-left"/><span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kingdom Provision</span></div>
                        <SheetHeader className="text-left flex-shrink-0 text-left">
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight leading-tight text-left">Kindness Package</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1 text-left">Review selection for {soulName || manualRecipientName || 'Self'}.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow min-h-0 overscroll-contain text-left">
                        <div className="p-8 space-y-10 text-left">
                            {cartItems.length > 0 ? (
                                <div className="space-y-10 text-left">
                                    <div className="space-y-6 text-left">{cartByVendor.map(group => (
                                        <div key={group.vendorId} className="space-y-3 text-left"><div className="flex items-center justify-between px-1 text-left"><div className="flex items-center gap-2 text-left"><Store className="h-3.5 w-3.5 text-primary text-left"/><h4 className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[200px] text-left">{group.vendorName}</h4></div><Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-primary/20 text-left">{getCurrencySymbol(group.currency)}{(group.subtotal + group.deliveryFee).toLocaleString()} Delivery</Badge></div><div className="space-y-2 text-left">{group.items.map(c => (<div key={c.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border shadow-inner group text-left"><div className="flex items-center gap-3 min-w-0 flex-1 text-left"><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border text-left">{c.item.vendorType === 'gift' ? <Gift className="h-5 w-5 text-primary text-left"/> : <Utensils className="h-5 w-5 text-primary text-left"/>}</div><div className="min-w-0 flex-1 text-left"><p className="font-black text-sm uppercase tracking-tight truncate text-left">{c.item.name}</p><p className="text-[10px] font-bold text-primary uppercase text-left">{getCurrencySymbol(c.item.currency)}{c.item.price.toLocaleString()}</p></div></div><div className="flex items-center gap-2 ml-2 text-left"><div className="flex items-center gap-1 bg-background rounded-full p-0.5 border shadow-sm text-left"><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-left" onClick={() => updateQuantity(c.item.id, -1)}><Minus className="h-3 w-3 text-left"/></Button><span className="text-[11px] font-black min-w-[1.25rem] text-center text-left">{c.quantity}</span><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-left" onClick={() => updateQuantity(c.item.id, 1)}><Plus className="h-3 w-3 text-left"/></Button></div><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive text-left" onClick={() => removeFromCart(c.item.id)}><Trash2 className="h-4 w-4 text-left"/></Button></div></div>))}</div></div>
                                    ))}</div>
                                    <div className="space-y-6 text-left text-left"><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Recipient Name</Label><Input placeholder="Enter recipient" value={manualRecipientName} onChange={(e) => setManualRecipientName(e.target.value)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" /></div><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Logistical Instructions</Label><Textarea placeholder="Delivery details and contact info..." value={giftInstructions} onChange={(e) => setGiftInstructions(e.target.value)} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left" /></div></div>
                                    
                                    <div className="p-6 rounded-[2rem] bg-muted/20 border-2 border-dashed border-primary/20 relative overflow-hidden group shadow-inner text-left">
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity text-left">
                                            <CreditCard className="h-20 w-20 text-primary rotate-12 text-left" />
                                        </div>
                                        <div className="relative z-10 space-y-4 text-left text-left">
                                            <div className="flex items-center gap-2 mb-2 text-left">
                                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse text-left" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Checkout Guidance</span>
                                            </div>
                                            <div className="space-y-3 text-left text-left">
                                                <div className="flex justify-between items-center text-left text-left">
                                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">Package Value</span>
                                                    <span className="text-[11px] font-black text-foreground uppercase tracking-tight text-left">Multi-Currency Support</span>
                                                </div>
                                                <Separator className="bg-primary/10 text-left" />
                                                <div className="flex flex-col gap-1 text-left text-left">
                                                    <p className="text-lg font-black uppercase tracking-tight text-primary text-left">Action Required</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium text-left text-left">
                                                        To fulfill this offering, please review the provider's payment instructions below. After payment is done, dispatch your gift
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1 text-left text-left"><CreditCard className="h-3.5 w-3.5 text-left text-left"/> FULFILLMENT GUIDE</Label><div className="space-y-3 text-left">{cartByVendor.map(v => (
                                        <div key={v.vendorId} className="bg-primary/5 p-5 rounded-[1.5rem] border-2 border-dashed border-primary/20 relative group overflow-hidden text-left"><div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover:opacity-0.06 transition-opacity text-left text-left text-left text-left"><Store className="h-10 w-10 text-primary text-left text-left text-left text-left" /></div><div className="flex justify-between items-start mb-2 text-left"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest text-left">Pay to: {v.vendorName}</p><Badge variant="outline" className="h-5 px-2 bg-primary text-white border-none font-black text-[10px] text-left">{getCurrencySymbol(v.currency)}{(v.subtotal + v.deliveryFee).toLocaleString()}</Badge></div><p className="text-sm font-bold text-foreground whitespace-pre-wrap leading-relaxed break-words text-left">{v.paymentDetails || 'Contact provider for details.'}</p><Button size="icon" variant="ghost" className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-left" onClick={() => { navigator.clipboard.writeText(v.paymentDetails); toast({ title: 'Copied!' }); }}><Clipboard className="h-4 w-4 text-left" /></Button></div>
                                    ))}</div></div>
                                </div>
                            ) : (
                                <div className="py-24 text-center px-8 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center text-left text-left"><div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left text-left"><ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10 text-left text-left text-left" /></div><h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-left">Empty Hub</h3><p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto text-balance leading-relaxed text-left text-left">Add items to place an order.</p></div>
                            )}
                            <div className="h-24 text-left" />
                        </div>
                    </ScrollArea>
                    {cartItems.length > 0 && (<SheetFooter className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm text-left"><Button onClick={handleGiftItems} disabled={isProcessingOrder || (!soulName && !manualRecipientName.trim()) || !giftInstructions.trim()} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-left text-left">{isProcessingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left" />}DISPATCH OFFERINGS</Button></SheetFooter>)}
                </SheetContent>
            </Sheet>

            <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[90vh] text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">{addLabel}</DialogTitle></DialogHeader></div>
                    <div className="flex-grow overflow-hidden text-left">{itemForm()}</div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[90vh] text-left">
                    <div className="p-8 border-b bg-muted/10 shrink-0 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Edit Offering</DialogTitle></DialogHeader></div>
                    <div className="flex-grow overflow-hidden text-left">{itemForm(itemToEdit, true)}</div>
                </DialogContent>
            </Dialog>

            <VendorOrdersSheet vendorId={vendorId} isOpen={isOrdersOpen} onOpenChange={setIsOrdersOpen} />

            <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl text-left">
                    <div className="p-8 border-b shrink-0 bg-muted/10 text-left"><DialogHeader className="text-left"><DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Edit Storefront</DialogTitle></DialogHeader></div>
                    <div className="flex-grow overflow-hidden text-left">{editProfileForm}</div>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={isDeleteStoreOpen} onOpenChange={setIsDeleteStoreOpen}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                    <AlertDialogHeader className="text-left"><AlertDialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Delete Storefront?</AlertDialogTitle><AlertDialogDescription className="text-sm font-medium leading-relaxed text-left">This is permanent. All items and records will be removed.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6 text-left">
                        <AlertDialogCancel disabled={isDeletingStore} className="rounded-xl h-11 font-bold text-left">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStore} disabled={isDeletingStore} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold text-left">{isDeletingStore ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <Trash2 className="mr-2 h-4 w-4 text-left" />}Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                    <AlertDialogHeader className="text-left"><AlertDialogTitle className="font-black font-headline uppercase tracking-tight text-xl text-left">Remove Offering?</AlertDialogTitle><AlertDialogDescription className="text-sm font-medium text-left">Delete "{itemToDelete?.name}" from your catalog?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6 text-left">
                        <AlertDialogCancel disabled={isDeletingItem} className="rounded-xl h-11 font-bold text-left">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} disabled={isDeletingItem} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold text-left text-left">{isDeletingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" /> : <Trash2 className="mr-2 h-4 w-4 text-left" />}Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
