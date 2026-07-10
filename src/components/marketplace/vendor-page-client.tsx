'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useUser, useCollection, useUserProfile } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, arrayUnion, deleteDoc, writeBatch, getDocs, where, getDoc, setDoc } from 'firebase/firestore';
import type { VendorProfile, Meal, UserProfile, Chat, MealGift, MealGiftStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    ChefHat,
    ChevronDown,
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
    Globe
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
import { Separator } from '../ui/separator';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { ImageUpload } from '@/components/common/image-upload';
import { Country, State, City } from 'country-state-city';
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

function VendorOrdersSheet({ vendorId, isOpen, onOpenChange, currencySymbol }: { vendorId: string; isOpen: boolean; onOpenChange: (open: boolean) => void; currencySymbol: string }) {
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
            const dateB = safeToDate(b.createdAt)?.getTime() ?? 0;
            return dateB - timeA;
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
            link: `/dashboard/marketplace/orders`,
            isRead: false,
            createdAt: serverTimestamp(),
        });

        try {
            await batch.commit();
            toast({ title: 'Status Updated', description: `Order is now ${newStatus}.` });
        } catch (e) {
            console.error(e);
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
        <div className="space-y-4 pb-12">
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
            ) : orders && orders.length > 0 ? (
                orders.map(order => (
                    <Card key={order.id} className="rounded-2xl border-2 overflow-hidden bg-muted/5">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">RECIPIENT: {order.recipientName}</p>
                                <h4 className="font-bold text-sm truncate uppercase tracking-tight">{order.mealName}</h4>
                            </div>
                            <Badge variant="outline" className="h-6 flex items-center gap-1.5 uppercase font-bold text-[9px] tracking-tighter">
                                {getStatusIcon(order.status)}
                                {order.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed italic">
                                &ldquo;{order.instructions}&rdquo;
                            </p>
                            <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">From: {order.senderName}</p>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-primary uppercase">{getCurrencySymbol(order.currency)}{(order.price + (order.deliveryFee || 0)).toLocaleString()}</p>
                                    {order.deliveryFee ? <p className="text-[7px] font-black uppercase text-muted-foreground">Incl. {getCurrencySymbol(order.currency)}{order.deliveryFee.toLocaleString()} Delivery</p> : null}
                                </div>
                            </div>
                        </CardContent>
                        {order.status !== 'cancelled' && (
                            <CardFooter className="p-2 bg-muted/20 border-t flex gap-1">
                                {['preparing', 'delivering', 'delivered'].map((status) => (
                                    <Button 
                                        key={status}
                                        variant="ghost" 
                                        size="sm" 
                                        disabled={order.status === status}
                                        className={cn(
                                            "flex-1 h-7 text-[8px] font-black uppercase tracking-tighter rounded-lg",
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
                <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-10 mx-auto mb-4" />
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No orders received yet.</p>
                </div>
            )}
        </div>
    );

    const sheetTitle = "Order Tracking Hub";
    const sheetDesc = "Manage and update deliveries for your Kingdom offerings.";

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b shrink-0 bg-muted/10">
                        <SheetHeader className="text-left flex-shrink-0">
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">{sheetTitle}</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">{sheetDesc}</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow px-8 pt-6">
                        {listContent}
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-8 border-b shrink-0 bg-muted/10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{sheetTitle}</DialogTitle>
                        <DialogDescription className="text-sm font-medium mt-1">{sheetDesc}</DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="flex-grow p-8">
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

    // Persistent Multi-Vendor Cart State
    const [cart, setCart] = useState<{ [mealId: string]: { item: Meal & { vendorName?: string; vendorOwnerId?: string; vendorPaymentDetails?: string; vendorPhotoURL?: string; vendorType?: 'meal' | 'gift' }; quantity: number } }>({});
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

    // Location State for Edit Profile
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

    const isAnyModalOpen = !!(isAddMealOpen || isEditProfileOpen || isDeleteStoreOpen || itemToDelete || itemToEdit || isCartOpen || isOrdersOpen);

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

    const cartKey = useMemo(() => user?.uid ? `testify_marketplace_cart_${user.uid}` : null, [user?.uid]);

    useEffect(() => {
        if (mounted && cartKey) {
            const stored = localStorage.getItem(cartKey);
            if (stored) {
                try {
                    setCart(JSON.parse(stored));
                } catch (e) {
                    setCart({});
                }
            } else {
                setCart({});
            }
        }
    }, [mounted, cartKey]);

    useEffect(() => {
        if (mounted && cartKey) {
            localStorage.setItem(cartKey, JSON.stringify(cart));
            window.dispatchEvent(new Event('testify_marketplace_cart_update'));
        }
    }, [cart, mounted, cartKey]);

    const vendorDocRef = useMemo(() => (firestore && vendorId) ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor, loading: loadingVendor } = useDoc<VendorProfile>(vendorDocRef);

    useEffect(() => {
        if (vendor?.location) {
            const parts = vendor.location.split(',').map(p => p.trim());
            if (parts.length >= 4) {
                setEditAddress(parts[0]);
                setEditCity(parts[1]);
                setEditState(parts[2]);
                setEditCountry(parts[3]);
            } else if (parts.length === 3) {
                setEditCity(parts[0]);
                setEditState(parts[1]);
                setEditCountry(parts[2]);
            } else if (parts.length === 2) {
                setEditState(parts[0]);
                setEditCountry(parts[1]);
            } else if (parts.length === 1) {
                setEditCountry(parts[0]);
            }
        }
        if (vendor?.photoURL) {
            setVendorPhotoURL(vendor.photoURL);
        }
        if (vendor?.currency) {
            setEditCurrency(vendor.currency);
        }
    }, [vendor]);

    useEffect(() => {
        if (itemToEdit) {
            setItemPhotoURL(itemToEdit.photoURL || '');
        } else if (isAddMealOpen) {
            setItemPhotoURL('');
        }
    }, [itemToEdit, isAddMealOpen]);

    const mealsQuery = useMemo(() => {
        if (!firestore || !vendorId) return null;
        return query(collection(firestore, 'vendors', vendorId, 'meals'), orderBy('createdAt', 'desc'));
    }, [firestore, vendorId]);
    const { data: meals, loading: loadingMeals } = useCollection<Meal>(mealsQuery);

    const loading = userLoading || loadingVendor || loadingMeals;

    const cartItems = useMemo(() => Object.values(cart), [cart]);

    const cartByVendor = useMemo(() => {
        const groups: { [vId: string]: { vendorId: string; vendorName: string; vendorOwnerId: string; paymentDetails: string; items: typeof cartItems; deliveryFee: number; subtotal: number; currency: string } } = {};
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

    const cartTotal = useMemo(() => {
        const subtotal = cartItems.reduce((acc, c) => acc + (c.item.price * c.quantity), 0);
        const shippingTotal = cartByVendor.reduce((acc, v) => acc + v.deliveryFee, 0);
        return subtotal + shippingTotal;
    }, [cartItems, cartByVendor]);

    const cartCount = useMemo(() => cartItems.reduce((acc, c) => acc + c.quantity, 0), [cartItems]);

    const addToCart = (item: Meal) => {
        if (!user?.uid) {
            toast({ variant: 'destructive', title: 'Login Required', description: 'Please sign in to building your offering package.' });
            return;
        }
        setCart(prev => {
            const existing = prev[item.id];
            return {
                ...prev,
                [item.id]: {
                    item: {
                        ...item,
                        vendorName: vendor?.businessName,
                        vendorOwnerId: vendor?.userId,
                        vendorPaymentDetails: vendor?.paymentDetails,
                        vendorPhotoURL: vendor?.photoURL,
                        vendorType: vendor?.vendorType,
                        currency: vendor?.currency || 'NGN'
                    },
                    quantity: (existing?.quantity || 0) + 1
                }
            };
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => {
            const existing = prev[itemId];
            if (!existing) return prev;
            const newQty = existing.quantity + delta;
            if (newQty <= 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return {
                ...prev,
                [itemId]: { ...existing, quantity: newQty }
            };
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const { [itemId]: _, ...rest } = prev;
            return rest;
        });
    };

    const handleInitiateChat = async () => {
        if (!user || !firestore || !vendor) {
            toast({ variant: 'destructive', title: 'Please log in', description: 'You must be logged in to start a chat.' });
            return;
        }
        setIsChatLoading(true);
        try {
            const participantIds = [user.uid, vendor.userId].sort();
            const chatsRef = collection(firestore, 'chats');

            const q = query(
                chatsRef,
                where('participantIds', '==', participantIds),
                where('isGroupChat', '==', false)
            );

            const querySnapshot = await getDocs(q);
            let existingChat = querySnapshot.docs.find(doc => doc.data().vendorId === vendor.id);

            let chatId: string;

            if (existingChat) {
                chatId = existingChat.id;
            } else {
                const ownerDoc = await getDoc(doc(firestore, "users", vendor.userId));
                const ownerProfile = ownerDoc.data() as UserProfile | undefined;
                const [userFirstName, ...userLastNameParts] = user.displayName?.split(' ') || ['User', ''];
                
                const newChatData: any = {
                    participantIds,
                    participantInfo: {
                        [user.uid]: {
                            firstName: userFirstName,
                            lastName: userLastNameParts.join(' '),
                            photoURL: user.photoURL || '',
                        },
                        [vendor.userId]: {
                            firstName: vendor.businessName,
                            lastName: '',
                            photoURL: ownerProfile?.photoURL || '', 
                        },
                    },
                    vendorId: vendor.id,
                    campaignTitle: vendor.businessName,
                    lastUpdatedAt: serverTimestamp(),
                    hasMessages: false,
                    isGroupChat: false,
                };
                const chatDocRef = await addDoc(chatsRef, newChatData);
                chatId = chatDocRef.id;
            }
            router.push(`/dashboard/chats/${chatId}`);

        } catch (error) {
            console.error("Error initiating chat:", error);
            toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not start the chat session.'});
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleAddMeal = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !isOwner) return;
        
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const priceValue = formData.get('price') as string;
        const deliveryFeeValue = formData.get('deliveryFee') as string;
        const price = parseFloat(priceValue);
        const deliveryFee = parseFloat(deliveryFeeValue) || 0;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;

        if (!name || isNaN(price)) return;

        setIsSubmittingMeal(true);
        const mealsRef = collection(firestore, 'vendors', vendorId, 'meals');
        const mealData = {
            vendorId,
            name,
            price,
            deliveryFee,
            description,
            category,
            currency: vendor?.currency || 'NGN',
            photoURL: itemPhotoURL || null,
            createdAt: serverTimestamp(),
        };

        addDoc(mealsRef, mealData)
            .then(() => {
                toast({ title: 'Item Added', description: `"${name}" has been added to your catalog.` });
                setIsAddMealOpen(false);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: `vendors/${vendorId}/meals`,
                    operation: 'create',
                    requestResourceData: mealData
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmittingMeal(false);
            });
    };

    const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !isOwner || !itemToEdit) return;

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const priceValue = formData.get('price') as string;
        const deliveryFeeValue = formData.get('deliveryFee') as string;
        const price = parseFloat(priceValue);
        const deliveryFee = parseFloat(deliveryFeeValue) || 0;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;

        if (!name || isNaN(price)) return;

        setIsUpdatingItem(true);
        const itemRef = doc(firestore, 'vendors', vendorId, 'meals', itemToEdit.id);
        const updateData = {
            name,
            price,
            deliveryFee,
            description,
            category,
            photoURL: itemPhotoURL || null,
            updatedAt: serverTimestamp(),
        };

        updateDoc(itemRef, updateData)
            .then(() => {
                toast({ title: 'Item Updated', description: `"${name}" has been updated.` });
                setItemToEdit(null);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: itemRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsUpdatingItem(false);
            });
    };

    const handleDeleteItem = () => {
        if (!user || !firestore || !itemToDelete || !isOwner) return;
        setIsDeletingItem(true);
        const mealRef = doc(firestore, 'vendors', vendorId, 'meals', itemToDelete.id);
        
        deleteDoc(mealRef)
            .then(() => {
                toast({ title: 'Item Removed', description: `"${itemToDelete.name}" has been deleted.` });
                setItemToDelete(null);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: mealRef.path,
                    operation: 'delete'
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsDeletingItem(false);
            });
    };

    const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore || !isOwner || !vendor) return;

        const formData = new FormData(e.currentTarget);
        const businessName = formData.get('businessName') as string;
        const description = formData.get('description') as string;
        const paymentDetails = formData.get('paymentDetails') as string;

        const locationString = [editAddress, editCity, editState, editCountry].filter(Boolean).join(', ');

        setIsUpdatingProfile(true);
        const vendorRef = doc(firestore, 'vendors', vendorId);
        const updateData = {
            businessName,
            description,
            location: locationString,
            paymentDetails,
            currency: editCurrency,
            photoURL: vendorPhotoURL || null,
            updatedAt: serverTimestamp(),
        };

        updateDoc(vendorRef, updateData)
            .then(() => {
                toast({ title: 'Profile Updated' });
                setIsEditProfileOpen(false);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: vendorRef.path,
                    operation: 'update',
                    requestResourceData: updateData
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsUpdatingProfile(false);
            });
    };

    const handleDeleteStore = () => {
        if (!user || !firestore || !isOwner || !vendor) return;
        setIsDeletingStore(true);
        const vendorRef = doc(firestore, 'vendors', vendorId);

        deleteDoc(vendorRef)
            .then(() => {
                toast({ title: 'Storefront Deleted', description: 'Your business profile has been removed.' });
                setIsDeleteStoreOpen(false);
                window.location.href = vendor?.vendorType === 'gift' ? '/dashboard/marketplace/gifts' : '/dashboard/marketplace';
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: vendorRef.path,
                    operation: 'delete',
                }, user);
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsDeletingStore(false);
            });
    };

    const handleGiftItems = async () => {
        if (!user || !firestore || !userProfile || cartItems.length === 0) return;

        const finalRecipientName = soulName || manualRecipientName;
        if (!finalRecipientName.trim()) {
            toast({ variant: 'destructive', title: 'Recipient Required', description: 'Please specify who receives this offering.' });
            return;
        }

        if (!giftInstructions.trim()) {
            toast({ variant: 'destructive', title: 'Instructions Required', description: 'Please provide delivery or gifting instructions.' });
            return;
        }

        setIsProcessingOrder(true);
        const batch = writeBatch(firestore);
        const giftsRef = collection(firestore, 'mealGifts');
        
        const itemNames = cartItems.map(c => `${c.item.name} (x${c.quantity})`).join(', ');
        const displayAction = vendor?.vendorType === 'gift' ? 'sent gifts' : 'shared physical provisions';
        const logActionId = vendor?.vendorType === 'gift' ? 'gave_gift' : 'shared_meal';
        
        const logNote = `Logged via Kingdom Hub: FULFILLED ${displayAction} [${itemNames}]. Instructions: ${giftInstructions}`;
        
        const logEntry = {
            date: new Date(),
            note: logNote,
            actions: [logActionId],
            memberId: user.uid,
            memberName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        };

        const senderName = `${userProfile.firstName} ${userProfile.lastName}`;

        cartItems.forEach(cartItem => {
            for(let i = 0; i < cartItem.quantity; i++) {
                const giftRef = doc(giftsRef);
                batch.set(giftRef, {
                    senderId: user.uid,
                    senderName,
                    recipientSoulId: soulId || null,
                    recipientName: finalRecipientName,
                    vendorId: cartItem.item.vendorId,
                    vendorName: cartItem.item.vendorName || 'Kingdom Store',
                    vendorOwnerId: cartItem.item.vendorOwnerId, 
                    vendorPhotoURL: cartItem.item.vendorPhotoURL || null,
                    vendorType: cartItem.item.vendorType || 'meal',
                    mealId: cartItem.item.id,
                    mealName: cartItem.item.name,
                    price: cartItem.item.price,
                    deliveryFee: cartItem.item.deliveryFee || 0,
                    currency: cartItem.item.currency || 'NGN',
                    status: 'ordered' as MealGiftStatus,
                    instructions: giftInstructions,
                    createdAt: serverTimestamp(),
                });
            }
        });

        if (soulId) {
            const soulRef = doc(firestore, `users/${user.uid}/souls`, soulId);
            const globalSoulRef = doc(firestore, 'souls', soulId);
            batch.update(soulRef, {
                followUpLog: arrayUnion(logEntry),
                lastUpdatedAt: serverTimestamp(),
            });
            batch.update(globalSoulRef, {
                followUpLog: arrayUnion(logEntry),
                lastUpdatedAt: serverTimestamp(),
            });
        }

        const currentUserRef = doc(firestore, 'users', user.uid);
        const dateString = format(new Date(), 'yyyy-MM-dd');
        const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
        
        batch.update(currentUserRef, {
            'dailyDiscipline.completed': arrayUnion(logActionId),
            'dailyDiscipline.lastUpdated': serverTimestamp()
        });
        batch.set(historyRef, {
            completed: arrayUnion(logActionId),
            date: serverTimestamp()
        }, { merge: true });

        try {
            await batch.commit();
            const key = `testify_pending_provisions_${user.uid}`;
            localStorage.removeItem(key);
            if (cartKey) localStorage.removeItem(cartKey);
            setCart({});
            window.dispatchEvent(new Event('testify_pending_action_update'));
            window.dispatchEvent(new Event('testify_marketplace_cart_update'));
            toast({ title: 'Offering Confirmed!', description: `Act of kindness for ${finalRecipientName} recorded.` });
            router.push('/dashboard/souls-won');
        } catch (serverError: any) {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_WRITE:GIFT_FULFILLMENT`,
                operation: 'write',
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const copyPaymentToClipboard = (details: string) => {
        navigator.clipboard.writeText(details);
        toast({ title: 'Copied!', description: 'Payment details copied to clipboard.' });
    };

    const editProfileForm = vendor && (
        <form onSubmit={handleUpdateProfile} className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
                <div className="p-6 sm:p-8 space-y-6">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Storefront Branding</Label>
                        <ImageUpload 
                            initialImageUrl={vendorPhotoURL} 
                            onUploadComplete={setVendorPhotoURL} 
                            storagePath="vendor-branding" 
                            cropAspect={21/9}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Name</Label>
                        <Input name="businessName" defaultValue={vendor.businessName} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store Currency</Label>
                        <Select onValueChange={setEditCurrency} value={editCurrency}>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold">
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

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editAddress" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Street Address</Label>
                            <Input id="editAddress" value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="e.g., 123 Kingdom Way" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                                <Select onValueChange={(val) => { setEditCountry(val); setEditState(''); }} value={editCountry}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner">
                                        <SelectValue placeholder="Country" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                        {countriesList.map(c => <SelectItem key={c.isoCode} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                                <Select onValueChange={setEditState} value={editState} disabled={!editCountry || statesList.length === 0}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner">
                                        <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                        {statesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">About Your Service</Label>
                        <Textarea id="description" name="description" defaultValue={vendor.description} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="paymentDetails" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Instructions</Label>
                        <Textarea name="paymentDetails" defaultValue={vendor.paymentDetails} placeholder="Bank details..." className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner" required />
                    </div>

                    <Separator />

                    <Card className="border-destructive/20 bg-destructive/5 overflow-hidden">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="space-y-1 flex-1">
                                <p className="text-xs font-bold text-destructive uppercase">Delete Storefront</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">Remove business permanently.</p>
                            </div>
                            <Button type="button" variant="destructive" size="sm" onClick={() => setIsDeleteStoreOpen(true)} className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest">Delete</Button>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
            <div className="p-6 sm:p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row mt-auto shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isUpdatingProfile} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Profile
                </Button>
            </div>
        </form>
    );

    if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin text-primary" /></div>;
    
    if (!vendor) return <div className="text-center p-12"><p>Storefront not found.</p></div>;

    const isGiftVendor = vendor.vendorType === 'gift';
    const centerLabel = isGiftVendor ? 'Kindness Center' : 'Meals Center';
    const itemLabel = isGiftVendor ? 'Product' : 'Meal';
    const addLabel = isGiftVendor ? 'Add New Product' : 'Add New Meal';
    const descriptionPlaceholder = isGiftVendor ? 'Describe the product details...' : 'Describe the ingredients and preparation...';
    const categoryPlaceholder = isGiftVendor ? 'e.g., Books, Devotionals' : 'e.g., Main Dish, Sides';
    const currencySymbol = getCurrencySymbol(vendor.currency);
    const storagePath = isGiftVendor ? 'kindness-center' : 'meals-center';

    const itemForm = (initialItem?: Meal | null, isEdit = false) => (
        <form onSubmit={isEdit ? handleUpdateItem : handleAddMeal}>
            <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{itemLabel} Photo</Label>
                  <ImageUpload 
                      initialImageUrl={itemPhotoURL} 
                      onUploadComplete={setItemPhotoURL} 
                      storagePath={storagePath} 
                      cropAspect={4/3}
                  />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{itemLabel} Name</Label>
                    <Input name="name" defaultValue={initialItem?.name} placeholder={`e.g., ${isGiftVendor ? 'Study Bible' : 'Jollof Rice'}`} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price ({vendor?.currency} {currencySymbol})</Label>
                        <Input name="price" type="number" defaultValue={initialItem?.price} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" required />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Delivery Fee ({vendor?.currency} {currencySymbol})</Label>
                        <Input name="deliveryFee" type="number" defaultValue={initialItem?.deliveryFee} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                    <Input name="category" defaultValue={initialItem?.category} placeholder={categoryPlaceholder} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                    <Textarea name="description" defaultValue={initialItem?.description} placeholder={descriptionPlaceholder} className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner" />
                </div>
            </div>
            <div className="p-6 sm:p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row">
                <Button type="button" variant="outline" onClick={() => isEdit ? setItemToEdit(null) : setIsAddMealOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isEdit ? isUpdatingItem : isSubmittingMeal} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {(isEdit ? isUpdatingItem : isSubmittingMeal) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? 'Save Changes' : 'Add Item'}
                </Button>
            </div>
        </form>
    );

    const isOwner = user?.uid === vendor.userId;

    return (
        <div className="w-full">
            <div 
                className="space-y-8 pb-32 max-w-4xl mx-auto"
                inert={isAnyModalOpen ? true : undefined}
            >
                <div className="px-4 sm:px-0 flex flex-col gap-6 pt-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-1">
                                    {isGiftVendor ? <Gift className="h-3.5 w-3.5 text-primary" /> : <Utensils className="h-3.5 w-3.5 text-primary" />}
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{centerLabel}</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 border-background bg-muted">
                            {vendor.photoURL ? (
                                <Image src={vendor.photoURL} alt={vendor.businessName} fill className="object-cover" unoptimized />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5">
                                    <Store className="h-16 w-16 text-primary opacity-10" />
                                    <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mt-2">Kingdom Hub</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 text-white max-w-[80%]">
                                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-headline uppercase tracking-tight leading-tight text-balance">{vendor.businessName}</h1>
                                <div className="flex items-center gap-2 mt-2 opacity-80">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate">{vendor.location || 'Kingdom Network'}</p>
                                </div>
                            </div>
                            {isOwner && (
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="absolute top-4 right-4 rounded-xl h-10 w-10 bg-background/50 backdrop-blur-md border-white/20 text-white hover:bg-background/80"
                                    onClick={() => setIsEditProfileOpen(true)}
                                >
                                    <Camera className="h-5 w-5" />
                                </Button>
                            )}
                            {vendor.currency && (
                                <Badge className="absolute top-4 right-4 rounded-xl bg-primary text-white border-none h-10 px-4 font-black uppercase tracking-widest shadow-xl hidden sm:flex">
                                    <Globe className="mr-2 h-4 w-4" /> {vendor.currency}
                                </Badge>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 px-1">
                        {!isOwner ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                                            onClick={handleInitiateChat}
                                            disabled={isChatLoading}
                                        >
                                            {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessagesSquare className="h-5 w-5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className="text-[10px] font-bold uppercase">Provider Chat</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg border-primary/20 text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                                            onClick={() => setIsOrdersOpen(true)}
                                        >
                                            <ShoppingBag className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl"><p className="text-[10px] font-bold uppercase">Manage Orders</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {isOwner && (
                            <Button variant="outline" onClick={() => setIsEditProfileOpen(true)} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[10px] shadow-md border-primary/20 text-primary">
                                <Edit className="mr-2 h-4 w-4" /> MANAGE PROFILE
                            </Button>
                        )}
                    </div>

                    {vendor.description && (
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed italic px-1 sm:px-0 text-balance max-w-3xl">
                        &ldquo;{vendor.description}&rdquo;
                    </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0">
                    {isOwner && (
                        <Card className="rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[280px] shadow-sm" onClick={() => setIsAddMealOpen(true)}>
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><Plus className="h-6 w-6 text-primary" /></div>
                            <h3 className="font-black uppercase tracking-widest text-primary text-xs">{addLabel}</h3>
                        </Card>
                    )}

                    {meals?.map(meal => {
                        const cartItem = cart[meal.id];
                        const itemSymbol = getCurrencySymbol(meal.currency);
                        return (
                            <Card key={meal.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm flex flex-col h-full">
                                <CardContent className="p-0">
                                    <div className="aspect-[4/3] relative bg-muted">
                                        {meal.photoURL ? (
                                            <img src={meal.photoURL} alt={meal.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {isGiftVendor ? <Package className="h-12 w-12 text-muted-foreground opacity-10" /> : <Utensils className="h-12 w-12 text-muted-foreground opacity-10" />}
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                                            <Badge className="bg-primary text-white font-black text-[10px] px-3 h-8 rounded-full shadow-lg border-none tracking-widest">
                                                {itemSymbol}{meal.price.toLocaleString()}
                                            </Badge>
                                            {meal.deliveryFee ? (
                                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-muted-foreground font-black text-[7px] px-1.5 h-4 rounded-full border-none tracking-tighter shadow-sm">
                                                    + {itemSymbol}{meal.deliveryFee.toLocaleString()} DEL
                                                </Badge>
                                            ) : null}
                                        </div>
                                        {cartItem && (
                                            <div className="absolute bottom-4 left-4 bg-primary text-white font-black text-xs h-8 w-8 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in">{cartItem.quantity}</div>
                                        )}
                                    </div>
                                    <div className="p-6 sm:p-8 space-y-4 flex-grow">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight truncate leading-tight">{meal.name}</h3>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 font-medium italic leading-relaxed">{meal.description || `Verified Kingdom service item.`}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 sm:p-8 pt-0 flex gap-2">
                                    {isOwner && (
                                        <div className="flex gap-2 w-full">
                                            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0" onClick={() => {
                                                setItemToEdit(meal);
                                            }}><Edit className="h-4 w-4 text-primary" /></Button>
                                            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0 text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(meal)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        {cartItem ? (
                                            <div className="flex items-center gap-3 w-full bg-muted/30 rounded-xl p-1 border">
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => updateQuantity(meal.id, -1)}><Minus className="h-3 w-3" /></Button>
                                                <span className="flex-1 text-center font-black text-xs">IN PACKAGE</span>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => updateQuantity(meal.id, 1)}><Plus className="h-3 w-3" /></Button>
                                            </div>
                                        ) : (
                                            <Button 
                                                onClick={() => addToCart(meal)}
                                                className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/10 transition-all active:scale-95"
                                            >
                                                {soulName ? `ADD FOR ${soulName}` : 'ADD TO PACKAGE'}
                                            </Button>
                                        )}
                                    </div>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                {cartCount > 0 && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-[22rem] px-4 animate-in slide-in-from-bottom-10">
                        <Button 
                            onClick={() => setIsCartOpen(true)}
                            className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-2xl shadow-primary/40 border-4 border-background flex items-center justify-between px-8"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative"><ShoppingCart className="h-5 w-5" /><span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center">{cartCount}</span></div>
                                <span className="text-xs">VIEW PACKAGE</span>
                            </div>
                            <span className="text-sm">CHECKOUT</span>
                        </Button>
                    </div>
                )}
            </div>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10"><div className="flex items-center gap-2 mb-2"><ShoppingCart className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Provision</span></div><SheetHeader className="text-left flex-shrink-0"><SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Kindness Package</SheetTitle><SheetDescription className="text-sm font-medium mt-1">Review selection for {soulName || manualRecipientName || 'Self'}.</SheetDescription></SheetHeader></div>
                    <ScrollArea className="flex-grow min-h-0 overscroll-contain">
                        <div className="p-8 space-y-10">{cartItems.length > 0 ? (
                            <div className="space-y-10">
                                <div className="space-y-6">{cartByVendor.map(group => (<div key={group.vendorId} className="space-y-3"><div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-primary" /><h4 className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[150px]">{group.vendorName}</h4></div><Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-primary/20">{getCurrencySymbol(group.currency)}{group.deliveryFee.toLocaleString()} Delivery</Badge></div><div className="space-y-2">{group.items.map(c => (<div key={c.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border shadow-inner group"><div className="flex items-center gap-3 min-w-0 flex-1"><div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border">{c.item.vendorType === 'gift' ? <Gift className="h-5 w-5 text-primary" /> : <Utensils className="h-5 w-5 text-primary" />}</div><div className="min-w-0 flex-1"><p className="font-black text-sm uppercase tracking-tight truncate">{c.item.name}</p><p className="text-[10px] font-bold text-primary uppercase">{getCurrencySymbol(c.item.currency)}{c.item.price.toLocaleString()}</p></div></div><div className="flex items-center gap-2 ml-2"><div className="flex items-center gap-1 bg-background rounded-full p-0.5 border shadow-sm"><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(c.item.id, -1)}><Minus className="h-3 w-3" /></Button><span className="text-[11px] font-black min-w-[1.25rem] text-center">{c.quantity}</span><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(c.item.id, 1)}><Plus className="h-3 w-3" /></Button></div><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive" onClick={() => removeFromCart(c.item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>))}</div></div>))}</div>
                                <div className="space-y-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recipient Name</Label><Input placeholder="Enter recipient" value={manualRecipientName} onChange={(e) => setManualRecipientName(e.target.value)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logistical Instructions</Label><Textarea placeholder="Delivery details and contact info..." value={giftInstructions} onChange={(e) => setGiftInstructions(e.target.value)} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base" /></div></div>
                                <div className="space-y-4"><Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><CreditCard className="h-3.5 w-3.5" /> FULFILLMENT GUIDE</Label><div className="space-y-3">{cartByVendor.map(v => (<div key={v.vendorId} className="bg-primary/5 p-5 rounded-[1.5rem] border-2 border-dashed border-primary/20 relative group overflow-hidden"><div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover:opacity-[0.06] transition-opacity"><Store className="h-10 w-10 text-primary" /></div><div className="flex justify-between items-start mb-2"><p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Pay to: {v.vendorName}</p><Badge variant="outline" className="h-5 px-2 bg-primary text-white border-none font-black text-[10px]">{getCurrencySymbol(v.currency)}{(v.subtotal + v.deliveryFee).toLocaleString()}</Badge></div><p className="text-sm font-bold text-foreground whitespace-pre-wrap leading-relaxed break-words">{v.paymentDetails || 'Contact provider for details.'}</p><Button size="icon" variant="ghost" className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyPaymentToClipboard(v.paymentDetails)}><Clipboard className="h-4 w-4" /></Button></div>))}</div></div>
                                <div className="space-y-3 p-6 bg-muted/20 rounded-[2rem] border shadow-inner"><div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground gap-4"><span className="shrink-0">Selection subtotal</span><span className="text-foreground shrink-0 font-black">Multi-Currency Package</span></div><Separator className="opacity-50" /><div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-primary gap-4"><span className="shrink-0">Action Required</span><span className="shrink-0 text-xl tracking-tighter">Review Vendors Below</span></div></div>
                            </div>
                        ) : (
                            <div className="py-24 text-center px-8 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center"><div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6"><ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10" /></div><h3 className="text-xl font-black uppercase tracking-tight opacity-40">Empty Hub</h3><p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto text-balance">Add items to place an order.</p><Button variant="outline" asChild className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-[0.2em] border-primary/20 text-primary hover:bg-primary/5 shadow-lg" onClick={() => setIsCartOpen(false)}><Link href="/dashboard/marketplace">GIVE PROVISION</Link></Button></div>
                        )}<div className="h-24" /></div>
                    </ScrollArea>
                    {cartItems.length > 0 && (<SheetFooter className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm"><Button onClick={handleGiftItems} disabled={isProcessingOrder || (!soulName && !manualRecipientName.trim()) || !giftInstructions.trim()} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase">{isProcessingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}DISPATCH OFFERINGS</Button></SheetFooter>)}
                </SheetContent>
            </Sheet>

            <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                    <div className="p-8 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{addLabel}</DialogTitle>
                        </DialogHeader>
                    </div>
                    {itemForm()}
                </DialogContent>
            </Dialog>

            <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                    <div className="p-8 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Offering</DialogTitle>
                        </DialogHeader>
                    </div>
                    {itemForm(itemToEdit, true)}
                </DialogContent>
            </Dialog>

            {isOwner && (
                <VendorOrdersSheet 
                    vendorId={vendorId} 
                    isOpen={isOrdersOpen} 
                    onOpenChange={setIsOrdersOpen} 
                    currencySymbol={currencySymbol} 
                />
            )}

            {isEditProfileOpen && (
                mounted && isMobile ? (
                    <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <SheetHeader className="text-left flex-shrink-0">
                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Storefront</SheetTitle>
                                    <SheetDescription className="text-sm font-medium mt-1">Refine your business details and mission.</SheetDescription>
                                </SheetHeader>
                            </div>
                            <div className="flex-grow overflow-hidden">
                                {editProfileForm}
                            </div>
                        </SheetContent>
                    </Sheet>
                ) : (
                    <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Storefront</DialogTitle>
                                    <DialogDescription className="text-sm font-medium mt-1">Refine your business details and mission.</DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="flex-grow overflow-hidden">
                                {editProfileForm}
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            )}
            
            <AlertDialog open={isDeleteStoreOpen} onOpenChange={setIsDeleteStoreOpen}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Delete Storefront?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                            This is permanent. All items and records for this store will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-6">
                        <AlertDialogCancel disabled={isDeletingStore} className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStore} disabled={isDeletingStore} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">
                            {isDeletingStore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black font-headline uppercase tracking-tight text-xl">Remove Offering?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">Delete "{itemToDelete?.name}" from your catalog?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel disabled={isDeletingItem} className="rounded-xl h-11 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} disabled={isDeletingItem} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold">
                            {isDeletingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
