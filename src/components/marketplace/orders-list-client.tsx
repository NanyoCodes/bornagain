'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { MealGift, VendorProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Utensils, CheckCircle2, Timer, ArrowLeft, ShoppingBag, MapPin, Store } from 'lucide-react';
import { format } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Ensures vendor details in the order tracker are always current.
 */
function LiveVendorInfo({ vendorId, fallbackName }: { vendorId: string, fallbackName: string }) {
    const firestore = useFirestore();
    const vendorRef = React.useMemo(() => vendorId ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor } = useDoc<VendorProfile>(vendorRef);
    
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-0.5">Kingdom Provider</p>
            <Link href={`/dashboard/marketplace/vendors/${vendorId}`} className="text-sm font-black truncate hover:underline uppercase tracking-tight flex items-center gap-2">
                <Store className="h-3 w-3 shrink-0" />
                {vendor?.businessName || fallbackName}
            </Link>
            {vendor?.location && (
                <p className="text-[9px] text-muted-foreground font-bold truncate flex items-center gap-1 uppercase tracking-tighter opacity-70">
                    <MapPin className="h-2.5 w-2.5 shrink-0" /> {vendor.location}
                </p>
            )}
        </div>
    );
}

export default function OrdersListClient() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const ordersQuery = React.useMemo(() => {
    if (!user?.uid || !firestore) return null;
    // We sort on client side to avoid index requirements
    return query(
      collection(firestore, 'mealGifts'),
      where('senderId', '==', user.uid)
    );
  }, [user?.uid, firestore]);

  const { data: rawOrders, loading } = useCollection<MealGift>(ordersQuery);

  const orders = React.useMemo(() => {
    if (!rawOrders) return [];
    return [...rawOrders].sort((a, b) => {
      const timeA = safeToDate(a.createdAt)?.getTime() ?? 0;
      const timeB = safeToDate(b.createdAt)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [rawOrders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
        case 'ordered': return <Timer className="h-5 w-5 text-amber-500" />;
        case 'preparing': return <Utensils className="h-5 w-5 text-blue-500" />;
        case 'delivering': return <Truck className="h-5 w-5 text-primary" />;
        case 'delivered': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        default: return <Package className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-32">
        <header className="px-4 sm:px-0 space-y-6 pt-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                    <ArrowLeft className="h-6 w-6" />
                    <span className="sr-only">Back</span>
                </Button>
                <div className="space-y-1 min-w-0">
                    <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate">Order Tracker</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" /> Tracking Kindness
                    </p>
                </div>
            </div>
        </header>

        <div className="grid gap-6 px-4 sm:px-0">
            {loading ? (
                [...Array(3)].map((_, i) => (
                    <Card key={i} className="rounded-[2.5rem] border-none shadow-sm animate-pulse h-40 bg-muted/20" />
                ))
            ) : orders && orders.length > 0 ? (
                orders.map(order => {
                    const createdAt = safeToDate(order.createdAt);
                    return (
                        <Card key={order.id} className="rounded-[2rem] overflow-hidden border shadow-sm bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all border-b-8 border-b-primary/5">
                            <CardContent className="p-6 sm:p-8 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex items-start gap-5 min-w-0">
                                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                            {getStatusIcon(order.status)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Badge variant="outline" className={cn(
                                                    "h-5 px-2 uppercase font-black text-[9px] tracking-widest gap-1.5 border-2 shadow-sm",
                                                    order.status === 'delivered' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-primary/5 text-primary border-primary/20"
                                                )}>
                                                    {order.status}
                                                </Badge>
                                                {createdAt && (
                                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">
                                                        {format(createdAt, 'MMM d, h:mm a')}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight truncate leading-tight mb-1">
                                                {order.mealName}
                                            </h3>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-[0.1em] opacity-80">
                                                RECIPIENT: <span className="text-foreground">{order.recipientName}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest sm:hidden">Price Paid</p>
                                        <p className="text-xl sm:text-2xl font-black text-primary tracking-tighter">₦{order.price.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                                    <LiveVendorInfo vendorId={order.vendorId} fallbackName={order.vendorName} />
                                    
                                    {order.instructions && (
                                        <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed border-primary/10 text-xs text-muted-foreground italic leading-relaxed relative overflow-hidden group/text shadow-inner">
                                            <ShoppingBag className="absolute top-2 right-4 h-12 w-12 opacity-[0.03] rotate-12 group-hover/text:rotate-0 transition-transform pointer-events-none" />
                                            <p className="relative z-10">&ldquo;{order.instructions}&rdquo;</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            ) : (
                <div className="py-32 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
                    <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
                        <Package className="h-10 w-10 text-muted-foreground opacity-10" />
                    </div>
                    <h3 className="text-2xl font-black font-headline uppercase tracking-tight opacity-40">No Sent Gifts</h3>
                    <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto leading-relaxed text-balance">
                        Your acts of kindness in the marketplace will appear here so you can track their progress from provider to recipient.
                    </p>
                    <Button variant="outline" asChild className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-[0.2em] border-primary/20 text-primary hover:bg-primary/5 shadow-lg">
                        <Link href="/dashboard/marketplace">VISIT MARKETPLACE</Link>
                    </Button>
                </div>
            )}
        </div>

        <footer className="text-center pt-12 border-t mt-12 px-8">
            <p className="text-[10px] text-muted-foreground italic font-bold uppercase tracking-[0.2em] max-w-md mx-auto opacity-40">
              "Whatever you did for one of the least of these brothers and sisters of mine, you did for me." — Matthew 25:40
            </p>
        </footer>
    </div>
  );
}
