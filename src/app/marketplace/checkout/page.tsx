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
    Globe
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn, safeToDate } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

    const subtotalByCurrency = React.useMemo(() => {
        const totals: { [key: string]: number } = {};
        cartItems?.forEach(item => {
            const currency = item.currency || 'NGN';
            const total = (item.price + (item.deliveryFee || 0)) * item.quantity;
            totals[currency] = (totals[currency] || 0) + total;
        });
        return totals;
    }, [cartItems]);

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
                <Loader2 className="h-12 w-12 animate-spin text-primary text-left text-left" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse text-left text-left">Organizing package...</p>
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center px-8 text-left text-left">
                <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6 text-left text-left">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-20 text-left text-left" />
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight text-center text-left text-left">Package is empty</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto text-center text-left text-left">Visit the Provision Hub or Kindness Center to add offerings.</p>
                <div className="flex gap-4 mt-8 justify-center text-left text-left text-left">
                    <Button asChild variant="outline" className="rounded-xl h-11 font-bold text-left text-left">
                        <Link href="/marketplace" className="text-left text-left">Meals Hub</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl h-11 font-bold text-left text-left">
                        <Link href="/marketplace/gifts" className="text-left text-left">Kindness Hub</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-4xl mx-auto pb-32 text-left text-left">
            <header className="px-4 sm:px-0 space-y-4 pt-4 text-left text-left">
                <div className="flex items-center gap-4 text-left text-left">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 border bg-background shadow-sm text-left text-left">
                        <ArrowLeft className="h-6 w-6 text-left text-left" />
                    </Button>
                    <div className="min-w-0 text-left text-left">
                        <div className="flex items-center gap-2 mb-1 text-left text-left">
                            <ShoppingCart className="h-3.5 w-3.5 text-primary text-left text-left" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left">Kingdom Offering</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black font-headline uppercase truncate leading-tight text-left text-left">Checkout Hub</h1>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 sm:px-0 text-left text-left">
                <div className="lg:col-span-2 space-y-6 text-left text-left">
                    <div className="space-y-4 text-left text-left">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2 text-left text-left">Package Items</Label>
                        {cartItems.map((item) => {
                            const symbol = getCurrencySymbol(item.currency);
                            return (
                                <Card key={item.id} className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary/10 text-left text-left">
                                    <CardContent className="p-5 flex flex-col gap-5 text-left text-left text-left">
                                        <div className="flex items-start gap-4 text-left text-left text-left">
                                            <Avatar className="h-14 w-14 rounded-2xl border shadow-inner text-left text-left">
                                                <AvatarImage src={item.photoURL} className="object-cover text-left text-left" />
                                                <AvatarFallback className="bg-primary/5 text-primary font-bold text-left text-left"> {item.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1 text-left text-left text-left">
                                                <h3 className="font-black text-lg uppercase tracking-tight truncate leading-tight text-left text-left">{item.name}</h3>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-left text-left text-left">
                                                    <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 text-left text-left">
                                                        {item.vendorType === 'gift' ? <Gift className="h-2 w-2 mr-1 text-left text-left" /> : <Utensils className="h-2 w-2 mr-1 text-left text-left" />}
                                                        {item.vendorType === 'gift' ? 'GIFT' : 'MEAL'}
                                                    </Badge>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 text-left text-left">
                                                        <Store className="h-2.5 w-2.5 text-left text-left" /> {item.vendorName}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 text-left text-left">
                                                <p className="text-lg font-black text-primary tracking-tighter text-left text-left">{symbol}{item.price.toLocaleString()}</p>
                                                {item.deliveryFee ? <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter text-right text-left text-left">+ {symbol}{item.deliveryFee.toLocaleString()} Delivery</p> : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-dashed text-left text-left">
                                            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-2xl border border-transparent shadow-inner text-left text-left">
                                                <div className="h-7 w-7 rounded-xl bg-background flex items-center justify-center border shadow-sm text-left text-left">
                                                    <User className="h-4 w-4 text-primary text-left text-left" />
                                                </div>
                                                <div className="min-w-0 text-left text-left">
                                                    <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest text-left text-left">Recipient</p>
                                                    <p className="text-xs font-bold truncate text-foreground text-left text-left">{item.soulName || 'Kingdom Member'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 text-left text-left">
                                                <div className="flex items-center gap-2 bg-background border rounded-xl p-1 shadow-sm text-left text-left text-left">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-left text-left" onClick={() => updateQuantity(item.id, item.quantity, -1)}><Minus className="h-3.5 w-3.5 text-left text-left"/></Button>
                                                    <span className="w-6 text-center font-black text-xs text-left text-left text-left"> {item.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-left text-left" onClick={() => updateQuantity(item.id, item.quantity, 1)}><Plus className="h-3.5 w-3.5 text-left text-left"/></Button>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 text-left text-left" onClick={() => handleRemoveItem(item.id)}>
                                                    <Trash2 className="h-5 w-5 text-left text-left" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-left text-left text-left">
                                            <Label className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest ml-1 text-left text-left">Special Instructions</Label>
                                            <Textarea 
                                                placeholder="e.g., Please deliver by 2PM, specific message for recipient..."
                                                value={instructions[item.id] || ''}
                                                onChange={(e) => setInstructions(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                className="min-h-[80px] rounded-xl bg-muted/20 border-none shadow-inner text-sm text-left text-left text-left"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-6 text-left text-left">
                    <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl bg-primary text-primary-foreground text-left text-left">
                        <CardHeader className="p-8 pb-4 text-left text-left">
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-left text-left">Summary</CardTitle>
                            <CardDescription className="text-primary-foreground/70 font-medium text-left text-left">Finalize your spiritual investment.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6 text-left text-left">
                            <div className="space-y-4 text-left text-left">
                                {Object.entries(subtotalByCurrency).map(([curr, total]) => (
                                    <div key={curr} className="flex justify-between items-baseline border-b border-white/10 pb-4 last:border-0 text-left text-left">
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-70 text-left text-left">Total in {curr}</span>
                                        <span className="text-2xl font-black tracking-tighter text-left text-left">{getCurrencySymbol(curr)}{total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex items-start gap-3 text-left text-left">
                                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 opacity-60 text-left text-left" />
                                <p className="text-[10px] leading-relaxed font-medium text-left text-left">
                                    Finalizing this order notifies providers immediately. Please coordinate payments directly using their saved details.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0 text-left text-left">
                            <Button 
                                onClick={handleFinalizeOffering} 
                                disabled={isSubmitting} 
                                size="lg" 
                                className="w-full h-14 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-2xl tracking-[0.1em] uppercase text-sm text-center text-left text-left"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin text-left text-left" />}
                                FINALIZE OFFERING
                            </Button>
                        </CardFooter>
                    </Card>

                    <div className="p-6 rounded-[2rem] bg-muted/30 border-2 border-dashed border-primary/20 text-center space-y-4 text-left text-left text-left">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-left text-left">
                            <Info className="h-6 w-6 text-primary text-left text-left" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium italic leading-relaxed text-balance text-center text-left text-left">
                            "God loves a cheerful giver. Let each one give as he has decided in his heart." <br/>
                            <span className="font-black uppercase tracking-widest text-[9px] mt-2 block text-center text-left">- 2 Cor 9:7</span>
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
