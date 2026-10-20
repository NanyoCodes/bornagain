'use client';

import * as React from 'react';
import { useUser, useCollection, useUserProfile, useFirestore } from '@/firebase';
import { collection, query, doc, deleteDoc, serverTimestamp, writeBatch, arrayUnion, updateDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    ArrowLeft, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    Loader2, 
    CheckCircle2, 
    Gift,
    Utensils,
    Package,
    MapPin,
    User,
    ShieldCheck,
    Store,
    Info,
    Globe,
    Heart,
    CreditCard,
    ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const currencyOptions = [
    { value: 'NGN', symbol: '₦' },
    { value: 'USD', symbol: '$' },
    { value: 'EUR', symbol: '€' },
    { value: 'GBP', symbol: '£' },
    { value: 'GHS', symbol: '₵' },
    { value: 'KES', symbol: 'KSh' },
];

const getCurrencySymbol = (code?: string) => {
    return currencyOptions.find(opt => opt.value === code)?.symbol || '₦';
};

function CheckoutPageContent() {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [instructions, setInstructions] = React.useState<{ [key: string]: string }>({});

    const cartQuery = React.useMemo(() => (user && firestore) ? query(collection(firestore, 'users', user.uid, 'cart')) : null, [user, firestore]);
    const { data: cartItems, loading } = useCollection<any>(cartQuery);

    const groupedByVendor = React.useMemo(() => {
        const groups: { [vendorId: string]: { 
            vendorId: string;
            vendorName: string; 
            vendorPhotoURL?: string; 
            paymentDetails?: string; 
            vendorOwnerId: string;
            items: any[]; 
            deliveryFee: number; 
            currency: string 
        } } = {};
        
        cartItems?.forEach(item => {
            const vId = item.vendorId;
            if (!groups[vId]) {
                groups[vId] = {
                    vendorId: vId,
                    vendorName: item.vendorName,
                    vendorOwnerId: item.vendorOwnerId,
                    vendorPhotoURL: item.vendorPhotoURL,
                    paymentDetails: item.vendorPaymentDetails,
                    items: [],
                    deliveryFee: item.deliveryFee || 0,
                    currency: item.currency || 'NGN'
                };
            }
            groups[vId].items.push(item);
            if ((item.deliveryFee || 0) > groups[vId].deliveryFee) {
                groups[vId].deliveryFee = item.deliveryFee;
            }
        });
        
        return Object.values(groups);
    }, [cartItems]);

    const totalsByCurrency = React.useMemo(() => {
        const totals: { [key: string]: { subtotal: number; delivery: number } } = {};
        
        groupedByVendor.forEach(group => {
            const currency = group.currency;
            if (!totals[currency]) {
                totals[currency] = { subtotal: 0, delivery: 0 };
            }
            const itemTotal = group.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totals[currency].subtotal += itemTotal;
            totals[currency].delivery += group.deliveryFee;
        });

        return totals;
    }, [groupedByVendor]);

    const updateQuantity = async (itemId: string, currentQty: number, delta: number) => {
        if (!user?.uid || !firestore) return;
        const itemRef = doc(firestore, 'users', user.uid, 'cart', itemId);
        const newQty = currentQty + delta;
        if (newQty <= 0) {
            await deleteDoc(itemRef);
        } else {
            await updateDoc(itemRef, { quantity: newQty, updatedAt: serverTimestamp() });
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!user?.uid || !firestore) return;
        await deleteDoc(doc(firestore, 'users', user.uid, 'cart', itemId));
        toast({ title: 'Item removed from package' });
    };

    const handleFinalizeOffering = async () => {
        if (!user || !firestore || !userProfile || !cartItems || cartItems.length === 0) return;
        
        setIsSubmitting(true);
        const batch = writeBatch(firestore);

        try {
            for (const item of cartItems) {
                const orderData: any = {
                    senderId: user.uid,
                    senderName: `${userProfile.firstName} ${userProfile.lastName}`,
                    recipientSoulId: item.soulId || null,
                    recipientName: item.soulName || 'Kingdom Member',
                    vendorId: item.vendorId,
                    vendorName: item.vendorName,
                    vendorOwnerId: item.vendorOwnerId,
                    vendorPhotoURL: item.vendorPhotoURL || null,
                    vendorType: item.vendorType || 'meal',
                    mealId: item.id,
                    mealName: item.name,
                    price: item.price,
                    deliveryFee: item.deliveryFee || 0,
                    currency: item.currency || 'NGN',
                    status: 'ordered' as const,
                    instructions: instructions[item.id] || '',
                    createdAt: serverTimestamp(),
                };

                const orderRef = doc(collection(firestore, 'mealGifts'));
                batch.set(orderRef, orderData);

                const vendorNotifRef = doc(collection(firestore, `users/${item.vendorOwnerId}/notifications`));
                batch.set(vendorNotifRef, {
                    userId: item.vendorOwnerId,
                    type: 'new_order',
                    title: 'New Kingdom Offering',
                    message: `${userProfile.firstName} sent a "${item.name}" offering. Check your hub for details!`,
                    link: `/dashboard/marketplace/orders`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                });

                if (item.soulId) {
                    const logEntry = {
                        date: new Date(),
                        note: `PROVISION ORDERED: ${item.name} via ${item.vendorName}. Status: ORDERED.`,
                        actions: [item.vendorType === 'gift' ? 'gave_gift' : 'shared_meal'],
                        memberId: user.uid,
                        memberName: `${userProfile.firstName} ${userProfile.lastName}`,
                    };
                    const soulUserRef = doc(firestore, `users/${user.uid}/souls`, item.soulId);
                    const globalSoulRef = doc(firestore, 'souls', item.soulId);
                    
                    batch.update(soulUserRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
                    batch.update(globalSoulRef, { followUpLog: arrayUnion(logEntry), lastUpdatedAt: serverTimestamp() });
                }

                const cartItemRef = doc(firestore, 'users', user.uid, 'cart', item.id);
                batch.delete(cartItemRef);
            }

            await batch.commit();
            toast({ title: 'Offering Initiated!', description: 'Your provision package has been sent to the providers.' });
            router.push('/dashboard/marketplace/orders');
        } catch (error) {
            console.error("Finalize Error:", error);
            toast({ variant: 'destructive', title: 'Action Failed', description: 'Could not process the offering at this time.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-32 text-left">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Organizing package...</p>
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center px-8">
                <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-20" />
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Package is empty</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">Visit the Provision Hub or Kindness Center to add offerings.</p>
                <div className="flex gap-4 mt-8">
                    <Button asChild variant="outline" className="rounded-xl h-11 font-bold">
                        <Link href="/marketplace">Meals Hub</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl h-11 font-bold">
                        <Link href="/marketplace/gifts">Kindness Hub</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 text-left">
            <header className="px-4 sm:px-0 space-y-4 pt-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 border bg-background shadow-sm">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Offering</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black font-headline uppercase truncate leading-tight">Checkout Hub</h1>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-0">
                <div className="lg:col-span-2 space-y-10">
                    {groupedByVendor.map((group) => {
                        const symbol = getCurrencySymbol(group.currency);
                        return (
                            <div key={group.vendorId} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 rounded-xl border shadow-sm shrink-0">
                                        <AvatarImage src={group.vendorPhotoURL} className="object-cover" />
                                        <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                                            {group.vendorName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="font-black text-sm sm:text-base uppercase tracking-tight truncate">{group.vendorName}</h2>
                                    </div>
                                </div>

                                <Card className="rounded-[2.5rem] bg-card/30 border-none shadow-sm overflow-hidden border-l-8 border-l-primary/10">
                                    <CardContent className="p-0 divide-y divide-dashed">
                                        {group.items.map((item) => (
                                            <div key={item.id} className="p-6 flex flex-col gap-5">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="h-14 w-14 rounded-2xl border shadow-inner">
                                                        <AvatarImage src={item.photoURL} className="object-cover" />
                                                        <AvatarFallback className="bg-primary/5 text-primary font-bold"> {item.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-black text-lg uppercase tracking-tight truncate leading-tight">{item.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                                                                {item.vendorType === 'gift' ? <Gift className="h-2 w-2 mr-1" /> : <Utensils className="h-2 w-2 mr-1" />}
                                                                {item.vendorType === 'gift' ? 'GIFT' : 'MEAL'}
                                                            </Badge>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                                <User className="h-2.5 w-2.5" /> For: {item.soulName || 'Kingdom Member'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xl font-black text-primary tracking-tighter">{symbol}{item.price.toLocaleString()}</p>
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter text-right">Per Unit</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-muted/20">
                                                    <div className="flex items-center gap-2 bg-background border rounded-xl p-1 shadow-sm">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity, -1)}><Minus className="h-3.5 w-3.5"/></Button>
                                                        <span className="w-8 text-center font-black text-xs"> {item.quantity}</span>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity, 1)}><Plus className="h-3.5 w-3.5"/></Button>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest ml-1">Special Instructions</Label>
                                                    <Textarea 
                                                        placeholder="e.g., Delivery instructions, personal message..."
                                                        value={instructions[item.id] || ''}
                                                        onChange={(e) => setInstructions(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        className="min-h-[80px] rounded-2xl bg-muted/20 border-none shadow-inner text-sm"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                    <CardFooter className="bg-muted/30 p-8 flex flex-col gap-6">
                                        <div className="space-y-3 w-full">
                                            <Label className="text-[10px] font-black uppercase text-primary tracking-[0.3em] flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" /> ACCOUNT DETAILS FOR {group.vendorName}
                                            </Label>
                                            <div className="p-6 rounded-[1.5rem] bg-background border-2 border-primary/10 shadow-inner relative overflow-hidden group/pay">
                                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover/pay:opacity-10 transition-opacity">
                                                    <ShieldCheck className="h-16 w-16 text-primary rotate-12" />
                                                </div>
                                                <p className="text-sm sm:text-base font-black text-foreground whitespace-pre-wrap leading-relaxed relative z-10 text-balance">
                                                    {group.paymentDetails || 'Contact provider for specific payment coordinates.'}
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2 px-1">
                                                <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                                                    Transfer the total amount to the details above. The provider will be notified once you finalize.
                                                </p>
                                            </div>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </div>
                        )
                    })}
                </div>

                <div className="space-y-6">
                    <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl bg-primary text-primary-foreground">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Summary</CardTitle>
                            <CardDescription className="text-primary-foreground/70 font-medium">Consolidated Kingdom Offering.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="space-y-6">
                                {Object.entries(totalsByCurrency).map(([curr, values]) => {
                                    const symbol = getCurrencySymbol(curr);
                                    return (
                                        <div key={curr} className="space-y-4 border-b border-white/10 pb-6 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest opacity-70">
                                                <span>Items Total</span>
                                                <span>{symbol}{values.subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest opacity-70">
                                                <span>Delivery (Grouped)</span>
                                                <span>{symbol}{values.delivery.toLocaleString()}</span>
                                            </div>
                                            <Separator className="bg-white/10" />
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-xs font-black uppercase tracking-[0.2em]">Grand Total</span>
                                                <span className="text-3xl font-black tracking-tighter">{symbol}{(values.subtotal + values.delivery).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="bg-white/10 p-5 rounded-2xl border border-white/10 flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 opacity-60" />
                                <p className="text-[10px] leading-relaxed font-medium">
                                    Finalizing your order notifies providers immediately. Please coordinate payments directly using their saved details.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0">
                            <Button 
                                onClick={handleFinalizeOffering} 
                                disabled={isSubmitting} 
                                size="lg" 
                                className="w-full h-14 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-2xl tracking-[0.1em] uppercase text-sm text-center"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                FINALIZE OFFERING
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="p-8 rounded-[2.5rem] bg-muted/30 border-2 border-dashed border-primary/20 text-center space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                            <Heart className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium italic leading-relaxed text-balance text-center">
                            "Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done." <br/>
                            <span className="font-black uppercase tracking-widest text-[9px] mt-2 block text-center">- Proverbs 19:17</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <AppShell>
            <CheckoutPageContent />
        </AppShell>
    );
}