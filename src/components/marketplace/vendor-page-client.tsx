
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc, useCollection, useUserProfile } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, arrayUnion, deleteDoc, writeBatch, getDocs, where, getDoc } from 'firebase/firestore';
import type { VendorProfile, Meal, UserProfile, Chat } from '@/lib/types';
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
    MessagesSquare
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
import { Country, State } from 'country-state-city';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Ensures the profile photo displayed in the storefront is always the most recent version.
 */
function LiveVendorAvatar({ userId, fallbackUrl, fallbackInitials, className }: { userId: string, fallbackUrl?: string, fallbackInitials: string, className?: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: profile } = useDoc<UserProfile>(userRef);
    const currentPhotoUrl = profile?.photoURL || fallbackUrl;
    
    return (
        <Avatar className={className}>
            <AvatarImage src={currentPhotoUrl} className="object-cover" />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">{fallbackInitials}</AvatarFallback>
        </Avatar>
    );
}

export default function VendorPageClient({ vendorId }: { vendorId: string }) {
    const searchParams = useSearchParams();
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

    // Cart State
    const [cart, setCart] = useState<{ [mealId: string]: { item: Meal; quantity: number } }>({});
    const [isCartOpen, setIsCartOpen] = useState(false);

    const [isAddMealOpen, setIsAddMealOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isDeleteStoreOpen, setIsDeleteStoreOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Meal | null>(null);
    const [itemToEdit, setItemToEdit] = useState<Meal | null>(null);
    
    const [itemPhotoURL, setItemPhotoURL] = useState('');
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

    const countriesList = useMemo(() => Country.getAllCountries(), []);
    const statesList = useMemo(() => {
        const country = countriesList.find(c => c.name === editCountry);
        return country ? State.getStatesOfCountry(country.isoCode) : [];
    }, [editCountry, countriesList]);

    const isAnyModalOpen = !!(isAddMealOpen || isEditProfileOpen || isDeleteStoreOpen || itemToDelete || itemToEdit || isCartOpen);

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

    const isOwner = user?.uid === vendor?.userId;
    const isGiftVendor = vendor?.vendorType === 'gift';
    
    const CenterIcon = isGiftVendor ? Gift : ChefHat;
    const ItemIcon = isGiftVendor ? Package : Utensils;
    const centerLabel = isGiftVendor ? 'Kindness Center' : 'Meals Center';
    const itemLabel = isGiftVendor ? 'Product' : 'Meal';
    const actionLabel = isGiftVendor ? 'Gifting' : 'Provisioning';
    const addLabel = isGiftVendor ? 'Add New Product' : 'Add New Meal';
    const descriptionPlaceholder = isGiftVendor ? 'Describe the product details...' : 'Describe the ingredients and preparation...';
    const categoryPlaceholder = isGiftVendor ? 'e.g., Books, Devotionals' : 'e.g., Main Dish, Sides';

    const cartItems = useMemo(() => Object.values(cart), [cart]);
    const cartTotal = useMemo(() => cartItems.reduce((acc, c) => acc + (c.item.price * c.quantity), 0), [cartItems]);
    const cartCount = useMemo(() => cartItems.reduce((acc, c) => acc + c.quantity, 0), [cartItems]);

    const addToCart = (item: Meal) => {
        setCart(prev => {
            const existing = prev[item.id];
            return {
                ...prev,
                [item.id]: {
                    item,
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
        const price = parseFloat(priceValue);
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;

        if (!name || isNaN(price)) return;

        setIsSubmittingMeal(true);
        const mealsRef = collection(firestore, 'vendors', vendorId, 'meals');
        const mealData = {
            vendorId,
            name,
            price,
            description,
            category,
            currency: 'NGN',
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
        const price = parseFloat(priceValue);
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;

        if (!name || isNaN(price)) return;

        setIsUpdatingItem(true);
        const itemRef = doc(firestore, 'vendors', vendorId, 'meals', itemToEdit.id);
        const updateData = {
            name,
            price,
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
                router.push(isGiftVendor ? '/dashboard/marketplace/gifts' : '/dashboard/marketplace');
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
        if (!user || !firestore || cartItems.length === 0 || !soulId || !soulName) return;

        setIsProcessingOrder(true);
        const batch = writeBatch(firestore);
        const giftsRef = collection(firestore, 'mealGifts');
        
        const itemNames = cartItems.map(c => `${c.item.name} (x${c.quantity})`).join(', ');
        const displayAction = isGiftVendor ? 'sent gifts' : 'shared a meal package';
        const logActionId = isGiftVendor ? 'gave_gift' : 'shared_meal';
        
        const logEntry = {
            date: new Date(),
            note: `Logged via ${centerLabel}: ${displayAction} [${itemNames}] via ${vendor?.businessName}. Payment of ₦${cartTotal.toLocaleString()} initiated.`,
            actions: [logActionId],
            memberId: user.uid,
            memberName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        };

        const soulRef = doc(firestore, `users/${user.uid}/souls`, soulId);
        const globalSoulRef = doc(firestore, 'souls', soulId);

        cartItems.forEach(cartItem => {
            for(let i = 0; i < cartItem.quantity; i++) {
                const giftRef = doc(giftsRef);
                batch.set(giftRef, {
                    senderId: user.uid,
                    recipientSoulId: soulId,
                    recipientName: soulName,
                    vendorId: vendorId,
                    vendorName: vendor?.businessName || 'Unknown Vendor',
                    mealId: cartItem.item.id,
                    mealName: cartItem.item.name,
                    price: cartItem.item.price,
                    status: 'ordered',
                    createdAt: serverTimestamp(),
                });
            }
        });

        batch.update(soulRef, {
            followUpLog: arrayUnion(logEntry),
            lastUpdatedAt: serverTimestamp(),
        });
        batch.update(globalSoulRef, {
            followUpLog: arrayUnion(logEntry),
            lastUpdatedAt: serverTimestamp(),
        });

        try {
            await batch.commit();
            toast({ title: 'Gifts Sent!', description: `Your package for ${soulName} has been ordered.` });
            setCart({});
            setIsCartOpen(false);
            router.push('/dashboard/souls-won');
        } catch (serverError: any) {
            const permissionError = new FirestorePermissionError({
                path: `BATCH_WRITE:GIFT_PACKAGE`,
                operation: 'write',
                requestResourceData: { cartTotal, items: itemNames }
            }, user);
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const copyPaymentToClipboard = () => {
        if (!vendor?.paymentDetails) return;
        navigator.clipboard.writeText(vendor.paymentDetails);
        toast({ title: 'Copied!', description: 'Payment details copied to clipboard.' });
    };

    const editProfileForm = vendor && (
        <form onSubmit={handleUpdateProfile} className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
                <div className="p-6 sm:p-8 space-y-6">
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

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editAddress" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Street Address</Label>
                            <Input 
                                id="editAddress" 
                                value={editAddress} 
                                onChange={e => setEditAddress(e.target.value)} 
                                placeholder="e.g., 123 Kingdom Way" 
                                className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" 
                                required 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                            <Select onValueChange={(val) => { setEditCountry(val); setEditState(''); }} value={editCountry}>
                                <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner">
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
                                <Select 
                                    onValueChange={setEditState} 
                                    value={editState}
                                    disabled={!editCountry || statesList.length === 0}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner">
                                        <SelectValue placeholder={statesList.length === 0 ? "N/A" : "Select State"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {statesList.map(s => <SelectItem key={s.isoCode + s.name} value={s.name}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="editCity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                                <Input 
                                    id="editCity" 
                                    value={editCity} 
                                    onChange={e => setEditCity(e.target.value)} 
                                    placeholder="Enter City" 
                                    className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" 
                                    required
                                />
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
            <div className="p-6 sm:p-8 bg-muted/5 border-t gap-3 flex flex-col sm:flex-row mt-auto">
                <Button type="button" variant="outline" onClick={() => setIsEditProfileOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Cancel</Button>
                <Button type="submit" disabled={isUpdatingProfile} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Profile
                </Button>
            </div>
        </form>
    );

    const itemForm = (initialItem?: Meal | null, isEdit = false) => (
        <form onSubmit={isEdit ? handleUpdateItem : handleAddMeal}>
            <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{itemLabel} Photo</Label>
                  <ImageUpload 
                      initialImageUrl={itemPhotoURL} 
                      onUploadComplete={setItemPhotoURL} 
                      storagePath="vendor-items" 
                      cropAspect={4/3}
                  />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{itemLabel} Name</Label>
                    <Input name="name" defaultValue={initialItem?.name} placeholder={`e.g., ${isGiftVendor ? 'Study Bible' : 'Jollof Rice'}`} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price (₦)</Label>
                    <Input name="price" type="number" defaultValue={initialItem?.price} placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner" required />
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

    const cartContent = (
        <div className="space-y-8">
            <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Gifts in Package</h4>
                <div className="space-y-2">
                    {cartItems.map(c => (
                        <div key={c.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border shadow-inner">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <ItemIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-sm uppercase tracking-tight truncate">{c.item.name}</p>
                                    <p className="text-[9px] font-bold text-primary uppercase">₦{c.item.price.toLocaleString()} x {c.quantity}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 bg-background rounded-full p-0.5 border">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(c.item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="text-xs font-black min-w-[1.5rem] text-center">{c.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(c.item.id, 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4 bg-primary/5 p-5 rounded-[2rem] border-2 border-dashed border-primary/20 relative group">
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
                    <span className="text-foreground truncate font-black">{soulName}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground gap-4">
                    <span className="shrink-0">Provider</span>
                    <span className="text-foreground truncate font-black">{vendor.businessName}</span>
                </div>
                <Separator className="opacity-50" />
                <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-primary gap-4">
                    <span className="shrink-0">Total Package Amount</span>
                    <span className="shrink-0 text-xl">₦{cartTotal.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );

    const cartFooter = (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button variant="outline" onClick={() => setIsCartOpen(false)} className="rounded-xl h-12 flex-1 font-bold">Back to Menu</Button>
            <Button 
                onClick={handleGiftItems} 
                disabled={isProcessingOrder} 
                className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
                {isProcessingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                I HAVE TRANSFERRED ₦{cartTotal.toLocaleString()}
            </Button>
        </div>
    );

    const addProductCard = (
        <Card className="rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-6 sm:p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[200px] sm:min-h-[280px] shadow-sm" onClick={() => setIsAddMealOpen(true)}>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="font-black uppercase tracking-widest text-primary text-xs sm:text-sm">{addLabel}</h3>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-2 font-medium">Update your digital storefront catalog</p>
        </Card>
    );

    if (loadingVendor || !mounted) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Inventory...</p>
            </div>
        );
    }

    return (
        <div 
            className="space-y-8 max-w-4xl mx-auto pb-32"
            inert={isAnyModalOpen ? true : undefined}
        >
            <div className="px-4 sm:px-0 flex flex-col gap-6 pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full border bg-background shadow-sm">
                            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2.5 mb-1.5">
                                <CenterIcon className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{centerLabel}</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black font-headline uppercase tracking-tight break-words [overflow-wrap:anywhere] leading-none text-balance">{vendor.businessName}</h1>
                            <p className="text-[11px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed break-words [overflow-wrap:anywhere] opacity-70">{vendor.location || 'Kingdom Network'}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto px-1 sm:px-0 shrink-0">
                        {!isOwner && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-lg border-primary/20 text-primary hover:bg-primary/5 shrink-0"
                                            onClick={handleInitiateChat}
                                            disabled={isChatLoading}
                                        >
                                            {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessagesSquare className="h-5 w-5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-xl border-primary/20 shadow-xl">
                                        <p className="text-[10px] font-bold uppercase">Chat with Provider</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {isOwner && (
                            <div className="flex gap-2 flex-1 sm:flex-none">
                                {isMobile ? (
                                    <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm" className="rounded-xl h-12 sm:h-11 px-6 font-black uppercase tracking-widest text-[10px] flex-1 shadow-lg border-primary/20 text-primary">
                                                <Edit className="mr-2 h-4 w-4" /> MANAGE PROFILE
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                                            <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                                                <SheetHeader className="text-left">
                                                    <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Storefront Hub</SheetTitle>
                                                    <SheetDescription className="text-sm font-medium mt-1">Refine your Kingdom business details.</SheetDescription>
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
                                            <Button variant="outline" size="sm" className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[10px] shadow-md border-primary/20 text-primary">
                                                <Edit className="mr-2 h-4 w-4" /> MANAGE PROFILE
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                                            <DialogHeader className="p-8 border-b bg-muted/10">
                                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Storefront Hub</DialogTitle>
                                                <DialogDescription className="text-sm font-medium mt-1">Refine your business details and payment flow.</DialogDescription>
                                            </DialogHeader>
                                            {editProfileForm}
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {soulName && (
                    <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-inner animate-in fade-in slide-in-from-top-4 mx-1 sm:mx-0">
                        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0">
                            <CenterIcon className="h-7 w-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight">
                                {actionLabel} GIFT FOR {soulName}
                            </p>
                            <p className="text-[11px] sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70 mt-1.5 text-balance leading-relaxed">
                                Select items from the catalog below to gift as a strategic act of Kingdom kindness.
                            </p>
                        </div>
                    </div>
                )}

                {vendor.description && (
                  <p className="text-[11px] sm:text-sm md:text-lg text-muted-foreground leading-relaxed italic px-1 sm:px-0 text-balance max-w-3xl">
                    &ldquo;{vendor.description}&rdquo;
                  </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-0">
                {isOwner && addProductCard}

                {loadingMeals ? (
                     [...Array(3)].map((_, i) => (
                        <Card key={i} className="rounded-[2.5rem] border-none shadow-sm animate-pulse h-[300px]">
                            <CardContent className="h-full bg-muted/30 rounded-[2.5rem]" />
                        </Card>
                    ))
                ) : meals?.map(meal => {
                    const cartItem = cart[meal.id];
                    return (
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
                                            <div className="flex gap-2">
                                                <button 
                                                    className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl bg-background flex items-center justify-center border hover:bg-muted active:scale-90"
                                                    onClick={(e) => { e.stopPropagation(); setItemToEdit(meal); }}
                                                >
                                                    <Edit className="h-4 w-4 text-primary" />
                                                </button>
                                                <button 
                                                    className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl bg-destructive flex items-center justify-center hover:bg-destructive/90 active:scale-90"
                                                    onClick={(e) => { e.stopPropagation(); setItemToDelete(meal); }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-white" />
                                                </button>
                                            </div>
                                        )}
                                        <Badge className="bg-primary text-white font-black text-[10px] sm:text-xs px-3 h-8 rounded-full shadow-lg border-none tracking-widest">
                                            ₦{meal.price.toLocaleString()}
                                        </Badge>
                                    </div>
                                    {cartItem && (
                                        <div className="absolute bottom-4 left-4 bg-primary text-white font-black text-xs h-8 w-8 rounded-full flex items-center justify-center shadow-xl animate-in zoom-in">
                                            {cartItem.quantity}
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 sm:p-8 space-y-4 flex-grow">
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight truncate leading-tight">{meal.name}</h3>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mt-2 font-medium italic leading-relaxed break-words">{meal.description || `Verified Kingdom service item.`}</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-6 sm:p-8 pt-0">
                                {cartItem ? (
                                    <div className="flex items-center gap-3 w-full bg-muted/30 rounded-xl p-1 border">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => updateQuantity(meal.id, -1)}><Minus className="h-4 w-4" /></Button>
                                        <span className="flex-1 text-center font-black text-sm">{cartItem.quantity} IN PACKAGE</span>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => addToCart(meal)}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <Button 
                                        onClick={() => addToCart(meal)}
                                        className="w-full h-12 sm:h-11 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-primary/10 transition-all active:scale-95"
                                    >
                                        {soulName ? `ADD FOR ${soulName}` : 'ADD TO CART'}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}

                {(!meals || meals.length === 0) && !isOwner && (
                    <div className="col-span-full py-32 text-center flex flex-col items-center">
                        <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                            <ItemIcon className="h-10 w-10 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-sm text-muted-foreground italic font-medium max-w-xs mx-auto">This provider's catalog is being prepared for the harvest.</p>
                    </div>
                )}
            </div>

            {/* Sticky Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4 animate-in slide-in-from-bottom-10">
                    <Button 
                        onClick={() => setIsCartOpen(true)}
                        className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-2xl shadow-primary/40 border-4 border-background flex items-center justify-between px-8"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingCart className="h-5 w-5" />
                                <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center shadow-sm">{cartCount}</span>
                            </div>
                            <span>REVIEW PACKAGE</span>
                        </div>
                        <span className="text-sm">₦{cartTotal.toLocaleString()}</span>
                    </Button>
                </div>
            )}

            {/* Cart Review Sheet */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="h-auto max-h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                    <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Gift Package for {soulName || 'Convert'}</SheetTitle>
                            <SheetDescription className="text-sm font-medium mt-1">Review your selection and proceed to payment.</SheetDescription>
                        </SheetHeader>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-8">
                            {cartContent}
                        </div>
                    </ScrollArea>
                    <SheetFooter className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
                        {cartFooter}
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Add/Edit Item Flows */}
            {isMobile ? (
                <Sheet open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Add Offering</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Post a new offering for believers to gift.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            {itemForm()}
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">{addLabel}</DialogTitle>
                                <DialogDescription className="text-sm font-medium mt-1">Post a new offering for believers to gift.</DialogDescription>
                            </DialogHeader>
                        </div>
                        {itemForm()}
                    </DialogContent>
                </Dialog>
            )}

            {isMobile ? (
                <Sheet open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
                    <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <SheetHeader className="text-left">
                                <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Item</SheetTitle>
                                <SheetDescription className="text-sm font-medium mt-1">Update item details in your catalog.</SheetDescription>
                            </SheetHeader>
                        </div>
                        <ScrollArea className="flex-grow">
                            {itemForm(itemToEdit, true)}
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Edit Item</DialogTitle>
                                <DialogDescription className="text-sm font-medium mt-1">Update item details in your catalog.</DialogDescription>
                            </DialogHeader>
                        </div>
                        {itemForm(itemToEdit, true)}
                    </DialogContent>
                </Dialog>
            )}

            <AlertDialog open={isDeleteStoreOpen} onOpenChange={setIsDeleteStoreOpen}>
                <AlertDialogContent className="w-[90vw] max-w-lg rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Delete Storefront?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                            This action is permanent and will remove "{vendor.businessName}" and its entire catalog from the Testify Network.
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

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="w-[90vw] max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black font-headline uppercase tracking-tight text-xl">Remove Item?</AlertDialogTitle>
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
