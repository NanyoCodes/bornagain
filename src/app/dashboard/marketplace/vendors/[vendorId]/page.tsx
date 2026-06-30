
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useUserProfile } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, serverTimestamp, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { VendorProfile, Meal, UserProfile, MealGift } from '@/lib/types';
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
    Store
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function VendorPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const vendorId = params.vendorId as string;
    const soulId = searchParams.get('soulId');
    const soulName = searchParams.get('soulName');
    
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isAddMealOpen, setIsAddMealOpen] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);

    const vendorDocRef = useMemo(() => vendorId ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor, loading: loadingVendor } = useDoc<VendorProfile>(vendorDocRef);

    const mealsQuery = useMemo(() => {
        if (!firestore || !vendorId) return null;
        return query(collection(firestore, 'vendors', vendorId, 'meals'));
    }, [firestore, vendorId]);
    const { data: meals, loading: loadingMeals } = useCollection<Meal>(mealsQuery);

    const isOwner = user?.uid === vendorId;

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
            toast({ title: 'Meal Added', description: `"${name}" is now on your menu.` });
            setIsAddMealOpen(false);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Failed to add meal' });
        } finally {
            setIsSubmittingMeal(false);
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

            // Log follow-up for the soul automatically
            const soulRef = doc(firestore, `users/${user.uid}/souls`, soulId);
            const globalSoulRef = doc(firestore, 'souls', soulId);
            const logEntry = {
                date: new Date(),
                note: `Sent a gifted meal (${selectedMeal.name}) via ${vendor?.businessName}.`,
                actions: ['shared_meal'],
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

            toast({ title: 'Order Placed!', description: `A ${selectedMeal.name} is being prepared for ${soulName}.` });
            setSelectedMeal(null);
            router.push('/dashboard/souls-won');
        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Gift Failed', description: 'Could not process the gift order.' });
        } finally {
            setIsProcessingOrder(false);
        }
    };

    if (loadingVendor || loadingMeals) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground font-black uppercase tracking-widest text-[10px]">Loading Menu...</p>
            </div>
        );
    }

    if (!vendor) return <div className="text-center py-20">Vendor not found.</div>;

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-32">
            <div className="px-4 sm:px-0 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 border bg-background">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-black font-headline uppercase tracking-tight truncate">{vendor.businessName}</h1>
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] truncate">{vendor.location || 'Global Delivery'}</p>
                    </div>
                </div>

                {soulName && (
                    <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-inner">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shrink-0">
                            <Heart className="h-6 w-6 text-white fill-current" />
                        </div>
                        <div>
                            <p className="text-lg font-black uppercase tracking-tight">Selecting for {soulName}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-70">Pick a meal to send as an act of Kingdom love.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                {isOwner && (
                    <Card 
                        className="rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/[0.02] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-primary/[0.05] transition-all min-h-[280px]"
                        onClick={() => setIsAddMealOpen(true)}
                    >
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Plus className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest text-primary text-sm">Add New Meal</h3>
                        <p className="text-[10px] text-muted-foreground mt-2 font-medium">Update your digital storefront</p>
                    </Card>
                )}

                {meals?.map(meal => (
                    <Card key={meal.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-md hover:shadow-xl transition-all group bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-0">
                            <div className="aspect-square relative bg-muted">
                                {meal.photoURL ? (
                                    <img src={meal.photoURL} alt={meal.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Utensils className="h-12 w-12 text-muted-foreground opacity-10" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4">
                                    <Badge className="bg-primary text-white font-black text-xs px-3 h-8 rounded-full shadow-lg">
                                        ₦{meal.price.toLocaleString()}
                                    </Badge>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight truncate">{meal.name}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium italic">{meal.description}</p>
                                </div>
                                <Button 
                                    onClick={() => setSelectedMeal(meal)}
                                    className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/10"
                                >
                                    {soulName ? `Send to ${soulName}` : 'Order Meal'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!meals || meals.length === 0 && !isOwner && (
                    <div className="col-span-full py-32 text-center">
                        <Utensils className="h-16 w-16 text-muted-foreground opacity-10 mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground italic">This vendor hasn't posted any meals yet.</p>
                    </div>
                )}
            </div>

            {/* Gift Confirmation Dialog */}
            <Dialog open={!!selectedMeal} onOpenChange={(open) => !open && setSelectedMeal(null)}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="p-8 border-b bg-muted/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Confirm Gift</DialogTitle>
                            <DialogDescription className="text-sm font-medium">You are about to purchase this meal for {soulName}.</DialogDescription>
                        </DialogHeader>
                    </div>
                    {selectedMeal && (
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border shadow-inner">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Utensils className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm uppercase tracking-tight">{selectedMeal.name}</p>
                                    <p className="text-[10px] font-bold text-primary uppercase">₦{selectedMeal.price.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>Recipient</span>
                                    <span className="text-foreground">{soulName}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>Vendor</span>
                                    <span className="text-foreground">{vendor.businessName}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-primary">
                                    <span>Total Payable</span>
                                    <span>₦{selectedMeal.price.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="p-8 bg-muted/5 border-t gap-3">
                        <Button variant="outline" onClick={() => setSelectedMeal(null)} className="rounded-xl h-12 flex-1">Cancel</Button>
                        <Button 
                            onClick={handleGiftMeal} 
                            disabled={isProcessingOrder} 
                            className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest"
                        >
                            {isProcessingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm & Pay
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Meal Dialog */}
            <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 border-b bg-muted/10">
                        <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight">Add to Menu</DialogTitle>
                        <DialogDescription className="text-sm font-medium">Post a new meal for believers to buy.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddMeal}>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Meal Name</Label>
                                <Input name="name" placeholder="e.g., Jollof Rice & Chicken" className="h-12 rounded-2xl bg-muted/20 border-none" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price (₦)</Label>
                                <Input name="price" type="number" placeholder="0.00" className="h-12 rounded-2xl bg-muted/20 border-none" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                                <Input name="category" placeholder="e.g., Main Dish" className="h-12 rounded-2xl bg-muted/20 border-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                                <Textarea name="description" placeholder="Describe the ingredients or serving..." className="min-h-[80px] rounded-2xl bg-muted/20 border-none" />
                            </div>
                        </div>
                        <DialogFooter className="p-8 bg-muted/5 border-t gap-3">
                            <Button type="button" variant="outline" onClick={() => setIsAddMealOpen(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
                            <Button type="submit" disabled={isSubmittingMeal} className="rounded-xl h-12 flex-1 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                                {isSubmittingMeal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Meal
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
