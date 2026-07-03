'use client';

import * as React from 'react';
import { useUser, useAuth, useCollection, useDoc, useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, writeBatch, getDocs, addDoc, getDoc } from 'firebase/firestore';
import type { MealGift, VendorProfile, UserProfile, MealGiftStatus, Soul } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Package, 
    Truck, 
    Utensils, 
    CheckCircle2, 
    Timer, 
    ArrowLeft, 
    ShoppingBag, 
    MapPin, 
    Store, 
    User,
    Loader2,
    Inbox,
    Send,
    Gift,
    Mail,
    Phone,
    Download,
    MessagesSquare,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Ensures vendor details in the order tracker are always current.
 */
function LiveVendorInfo({ vendorId, fallbackName }: { vendorId: string, fallbackName: string }) {
    const firestore = useFirestore();
    const vendorRef = React.useMemo(() => vendorId ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor } = useDoc<VendorProfile>(vendorRef);
    
    const ownerRef = React.useMemo(() => vendor?.userId ? doc(firestore, 'users', vendor.userId) : null, [firestore, vendor?.userId]);
    const { data: owner } = useDoc<UserProfile>(ownerRef);
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Kingdom Believer';

    const phone = vendor?.phone || owner?.phone;
    const email = owner?.email;

    return (
        <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1">Kingdom Provider</p>
            <div className="flex items-center gap-3">
                 <Link href={`/dashboard/marketplace/vendors/${vendorId}`} className="shrink-0 active:scale-95 transition-transform">
                    <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={vendor?.photoURL || owner?.photoURL} className="object-cover" />
                        <AvatarFallback className="text-[10px] font-black bg-primary/5 text-primary">
                            {owner?.firstName?.charAt(0) || vendor?.businessName?.charAt(0) || 'K'}
                        </AvatarFallback>
                    </Avatar>
                 </Link>
                 <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/marketplace/vendors/${vendorId}`} className="text-sm font-black truncate hover:text-primary transition-colors uppercase tracking-tight flex items-center gap-1.5">
                        <Store className="h-3 w-3 shrink-0" />
                        {vendor?.businessName || fallbackName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                         <Link href={vendor?.userId ? `/dashboard/profile/${vendor.userId}` : '#'} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                            <User className="h-2.5 w-2.5 opacity-60" />
                            {ownerName}
                        </Link>
                        {email && (
                            <a href={`mailto:${email}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5 opacity-60" />
                                {email}
                            </a>
                        )}
                        {phone && (
                            <a href={`tel:${phone}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 opacity-60" />
                                {phone}
                            </a>
                        )}
                        {vendor?.location && (
                            <p className="text-[10px] text-muted-foreground font-medium truncate flex items-center gap-1 uppercase tracking-tighter opacity-70">
                                <MapPin className="h-2.5 w-2.5 shrink-0" /> {vendor.location}
                            </p>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
}

/**
 * For received orders, shows the recipient soul's contact details.
 */
function LiveRecipientInfo({ soulId, fallbackName }: { soulId?: string | null, fallbackName: string }) {
    const firestore = useFirestore();
    const soulRef = React.useMemo(() => soulId ? doc(firestore, 'souls', soulId) : null, [firestore, soulId]);
    const { data: soul } = useDoc<Soul>(soulRef);

    return (
        <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1">Recipient</p>
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-dashed">
                    <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black truncate uppercase tracking-tight">{soul?.firstName ? `${soul.firstName} ${soul.lastName || ''}` : fallbackName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        {soul?.email && (
                            <a href={`mailto:${soul.email}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5 opacity-60" />
                                {soul.email}
                            </a>
                        )}
                        {soul?.phone && (
                            <a href={`tel:${soul.phone}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 opacity-60" />
                                {soul.phone}
                            </a>
                        )}
                        {!soul?.email && !soul?.phone && (
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70">Kingdom Member</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrdersListClient() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeCategory, setActiveCategory] = React.useState<'meal' | 'gift'>('meal');
  const [activeType, setActiveType] = React.useState<'sent' | 'received'>('sent');
  const [isChatLoading, setIsChatLoading] = React.useState<string | null>(null);

  // Guarded Sent Orders Query
  const sentOrdersQuery = React.useMemo(() => {
    if (!user?.uid || !firestore || activeType !== 'sent') return null;
    return query(
      collection(firestore, 'mealGifts'),
      where('senderId', '==', user.uid)
    );
  }, [user?.uid, firestore, activeType]);
  const { data: rawSentOrders, loading: loadingSent } = useCollection<MealGift>(sentOrdersQuery);

  // User Vendors lookup to identify received order capability
  const myVendorsQuery = React.useMemo(() => {
      if (!user?.uid || !firestore) return null;
      return query(collection(firestore, 'vendors'), where('userId', '==', user.uid));
  }, [user?.uid, firestore]);
  const { data: myVendors, loading: loadingVendors } = useCollection<VendorProfile>(myVendorsQuery);

  const isVendorOfCurrentType = React.useMemo(() => {
      return myVendors?.some(v => v.vendorType === activeCategory) || false;
  }, [myVendors, activeCategory]);

  // Guarded Received Orders Query
  const receivedOrdersQuery = React.useMemo(() => {
    if (!user?.uid || !firestore || !isVendorOfCurrentType || activeType !== 'received') return null;
    return query(
        collection(firestore, 'mealGifts'),
        where('vendorOwnerId', '==', user.uid)
    );
  }, [user?.uid, firestore, isVendorOfCurrentType, activeType]);
  const { data: rawReceivedOrders, loading: loadingReceived } = useCollection<MealGift>(receivedOrdersQuery);

  const filteredSentOrders = React.useMemo(() => {
    if (!rawSentOrders) return [];
    return rawSentOrders
        .filter(o => o.vendorType === activeCategory)
        .sort((a, b) => (safeToDate(b.createdAt)?.getTime() ?? 0) - (safeToDate(a.createdAt)?.getTime() ?? 0));
  }, [rawSentOrders, activeCategory]);

  const filteredReceivedOrders = React.useMemo(() => {
    if (!rawReceivedOrders) return [];
    return rawReceivedOrders
        .filter(o => o.vendorType === activeCategory)
        .sort((a, b) => (safeToDate(b.createdAt)?.getTime() ?? 0) - (safeToDate(a.createdAt)?.getTime() ?? 0));
  }, [rawReceivedOrders, activeCategory]);

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
        toast({ title: 'Status Established', description: `Order is now marked as ${newStatus}.` });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };

  const handleExportHistory = async (formatType: 'csv' | 'pdf') => {
    const ordersToExport = activeType === 'sent' ? filteredSentOrders : filteredReceivedOrders;
    if (ordersToExport.length === 0) {
        toast({ variant: 'destructive', title: 'Empty History', description: 'No records found to export.' });
        return;
    }

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const headers = ["Item", "Recipient", "Sender", "Provider", "Amount", "Status", "Date"];
    const body = ordersToExport.map(o => [
      o.mealName,
      o.recipientName,
      o.senderName,
      o.vendorName,
      `N${(o.price + (o.deliveryFee || 0)).toLocaleString()}`,
      o.status.toUpperCase(),
      o.createdAt ? format(o.createdAt.toDate(), 'yyyy-MM-dd') : ''
    ]);

    if (formatType === 'pdf') {
        const docObj = new jsPDF({ orientation: 'landscape' });
        docObj.text(`Transaction History - ${activeCategory === 'meal' ? 'Meals' : 'Gifts'} (${activeType})`, 14, 15);
        autoTable(docObj, { 
          head: [headers], 
          body: body, 
          startY: 20,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [249, 116, 22] }
        });
        docObj.save(`orders-${activeCategory}-${activeType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } else {
        const csvRows = [headers.join(",")];
        body.forEach(row => {
          csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `orders-${activeCategory}-${activeType}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.click();
        URL.revokeObjectURL(url);
    }
    toast({ title: "History Exported" });
  };

  const handleInitiateChat = async (order: MealGift, type: 'sent' | 'received') => {
    if (!user || !firestore) return;
    
    const otherParticipantId = type === 'sent' ? order.vendorOwnerId : order.senderId;
    if (!otherParticipantId) return;

    setIsChatLoading(order.id);
    try {
        const participantIds = [user.uid, otherParticipantId].sort();
        const chatsRef = collection(firestore, 'chats');
        
        const q = query(
            chatsRef,
            where('participantIds', '==', participantIds),
            where('isGroupChat', '==', false)
        );

        const querySnapshot = await getDocs(q);
        let existingChat = querySnapshot.docs.find(doc => doc.data().vendorId === order.vendorId);
        
        let chatId: string;

        if (existingChat) {
            chatId = existingChat.id;
        } else {
            // Need profiles for info
            const [myDoc, otherDoc] = await Promise.all([
                getDoc(doc(firestore, 'users', user.uid)),
                getDoc(doc(firestore, 'users', otherParticipantId))
            ]);
            const myProfile = myDoc.data() as UserProfile;
            const otherProfile = otherDoc.data() as UserProfile;

            const newChatData = {
                participantIds,
                participantInfo: {
                    [user.uid]: {
                        firstName: myProfile.firstName || '',
                        lastName: myProfile.lastName || '',
                        photoURL: myProfile.photoURL || '',
                    },
                    [otherParticipantId]: {
                        firstName: type === 'sent' ? order.vendorName : otherProfile.firstName,
                        lastName: type === 'sent' ? '' : otherProfile.lastName,
                        photoURL: type === 'sent' ? (order as any).vendorPhotoURL || otherProfile.photoURL || '' : otherProfile.photoURL || '', 
                    },
                },
                vendorId: order.vendorId,
                campaignTitle: order.vendorName,
                lastUpdatedAt: serverTimestamp(),
                isGroupChat: false,
                hasMessages: false,
            };
            const chatDocRef = await addDoc(chatsRef, newChatData);
            chatId = chatDocRef.id;
        }
        router.push(`/dashboard/chats/${chatId}`);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not open communication channel.' });
    } finally {
        setIsChatLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
        case 'ordered': return <Timer className="h-5 w-5 text-amber-500" />;
        case 'preparing': return <Utensils className="h-5 w-5 text-blue-500" />;
        case 'delivering': return <Truck className="h-5 w-5 text-primary" />;
        case 'delivered': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'preparing': return 'PREPARING';
          case 'delivering': return 'SHIPPING';
          case 'delivered': return 'DONE';
          default: return 'ORDERED';
      }
  };

  const renderOrderCard = (order: MealGift, type: 'sent' | 'received') => {
      const createdAt = safeToDate(order.createdAt);
      const isGift = order.vendorType === 'gift';
      const CenterIcon = isGift ? Gift : Utensils;
      const categoryLabel = isGift ? 'Kindness Offering' : 'Meal Provision';

      return (
        <Card key={order.id} className="rounded-[2rem] overflow-hidden border shadow-sm bg-card/50 backdrop-blur-sm group hover:shadow-xl transition-all border-b-8 border-b-primary/5">
            <CardHeader className="p-4 sm:p-6 pb-2 flex flex-row items-center justify-between border-b bg-muted/5">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center shadow-inner",
                        isGift ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
                    )}>
                        <CenterIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{categoryLabel}</span>
                </div>
                {createdAt && (
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                        {format(createdAt, 'MMM d, p')}
                    </span>
                )}
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start gap-5 min-w-0 flex-1">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                            {getStatusIcon(order.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mr-1">Status:</span>
                                <Badge variant="outline" className={cn(
                                    "h-5 px-2 uppercase font-black text-[9px] tracking-widest gap-1.5 border-2 shadow-sm",
                                    order.status === 'delivered' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-primary/5 text-primary border-primary/20"
                                )}>
                                    {getStatusLabel(order.status)}
                                </Badge>
                            </div>
                            <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight truncate leading-tight mb-1">
                                {order.mealName}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-[0.1em] opacity-80">
                                {type === 'sent' ? 'RECIPIENT' : 'SENDER'}: <span className="text-foreground">{type === 'sent' ? order.recipientName : order.senderName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                         <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-4 sm:pt-0">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest sm:hidden">Price Value</p>
                            <p className="text-xl sm:text-2xl font-black text-primary tracking-tighter">₦{(order.price + (order.deliveryFee || 0)).toLocaleString()}</p>
                            {order.deliveryFee ? (
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Incl. ₦{order.deliveryFee.toLocaleString()} Delivery</p>
                            ) : null}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full h-8 px-4 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 transition-transform active:scale-95"
                            onClick={() => handleInitiateChat(order, type)}
                            disabled={isChatLoading === order.id}
                        >
                            {isChatLoading === order.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <MessagesSquare className="mr-1.5 h-3 w-3" />}
                            CHAT
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                    {type === 'sent' ? (
                        <LiveVendorInfo vendorId={order.vendorId} fallbackName={order.vendorName} />
                    ) : (
                        <LiveRecipientInfo soulId={order.recipientSoulId} fallbackName={order.recipientName} />
                    )}
                    
                    {order.instructions && (
                        <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed border-primary/10 text-xs text-muted-foreground italic font-medium leading-relaxed relative overflow-hidden group/text shadow-inner">
                            <ShoppingBag className="absolute top-2 right-4 h-12 w-12 opacity-[0.03] rotate-12 group-hover/text:rotate-0 transition-transform pointer-events-none" />
                            <p className="relative z-10">&ldquo;{order.instructions}&rdquo;</p>
                        </div>
                    )}
                </div>
            </CardContent>
            {type === 'received' && (
                <CardFooter className="p-2 bg-muted/20 border-t flex flex-wrap gap-1">
                    {['preparing', 'delivering', 'delivered'].map((status) => (
                        <Button 
                            key={status}
                            variant="ghost" 
                            size="sm" 
                            disabled={order.status === status}
                            className={cn(
                                "flex-1 h-8 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                                order.status === status ? "bg-background text-primary shadow-md scale-105" : "hover:bg-background/50"
                            )}
                            onClick={() => updateOrderStatus(order.id, status as MealGiftStatus, order.senderId, order.mealName)}
                        >
                            {status === 'preparing' && 'PREPARE'}
                            {status === 'delivering' && 'SHIPPING'}
                            {status === 'delivered' && 'MARK DONE'}
                        </Button>
                    ))}
                </CardFooter>
            )}
        </Card>
      );
  };

  const emptyState = (
    <div className="py-32 text-center px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 flex flex-col items-center">
        <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
            <Inbox className="h-10 w-10 text-muted-foreground opacity-10" />
        </div>
        <h3 className="text-2xl font-black font-headline uppercase tracking-tight opacity-40">No {activeCategory === 'meal' ? 'Meals' : 'Gifts'} Found</h3>
        <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-sm mx-auto leading-relaxed text-balance">
            {activeType === 'sent' 
                ? `Your acts of kindness in the ${activeCategory === 'meal' ? 'Meals' : 'Gifts'} category will appear here.`
                : `When believers order ${activeCategory === 'meal' ? 'meals' : 'gifts'} from your storefront, they will appear here.`
            }
        </p>
        {activeType === 'sent' && (
            <Button variant="outline" asChild className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-[0.2em] border-primary/20 text-primary hover:bg-primary/5 shadow-lg">
                <Link href={activeCategory === 'meal' ? "/dashboard/marketplace" : "/dashboard/marketplace/gifts"}>VISIT {activeCategory === 'meal' ? 'MEALS' : 'GIFT'} HUB</Link>
            </Button>
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
        <header className="px-4 sm:px-0 space-y-8 pt-4">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm">
                            <ArrowLeft className="h-6 w-6" />
                            <span className="sr-only">Back</span>
                        </Button>
                        <div className="space-y-1 min-w-0">
                            <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tight uppercase truncate">Order Hub</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" /> Provision Logistics
                            </p>
                        </div>
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full shadow-lg border-primary/20 text-primary h-10 w-10">
                                <Download className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Export History</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleExportHistory('csv')}>CSV (Excel)</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleExportHistory('pdf')}>PDF Report</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Tabs value={activeCategory} onValueChange={(val: any) => setActiveCategory(val)} className="flex-1">
                        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/40 p-1 rounded-2xl">
                            <TabsTrigger value="meal" className="font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                                <Utensils className="h-3.5 w-3.5" /> Meals Hub
                            </TabsTrigger>
                            <TabsTrigger value="gift" className="font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                                <Gift className="h-3.5 w-3.5" /> Kindness Center
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {isVendorOfCurrentType && (
                        <Tabs value={activeType} onValueChange={(val: any) => setActiveType(val)} className="sm:w-[240px]">
                            <TabsList className="grid w-full grid-cols-2 h-12 bg-primary/10 p-1 rounded-2xl border-2 border-primary/20">
                                <TabsTrigger value="sent" className="font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                                    <Send className="h-3.5 w-3.5" /> Sent
                                </TabsTrigger>
                                <TabsTrigger value="received" className="font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2">
                                    <Inbox className="h-3.5 w-3.5" /> Received
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            </div>
        </header>

        <ScrollArea className="flex-1 w-full px-4 sm:px-0 mt-8">
            <div className="space-y-6">
                {activeType === 'sent' ? (
                    filteredSentOrders.length > 0 ? (
                        filteredSentOrders.map(order => renderOrderCard(order, 'sent'))
                    ) : emptyState
                ) : (
                    filteredReceivedOrders.length > 0 ? (
                        filteredReceivedOrders.map(order => renderOrderCard(order, 'received'))
                    ) : emptyState
                )}
                <div className="h-24 sm:hidden" />
            </div>
        </ScrollArea>

        <footer className="text-center pt-8 border-t mt-auto px-8 bg-background shrink-0">
            <p className="text-[10px] text-muted-foreground italic font-bold uppercase tracking-[0.2em] max-w-md mx-auto opacity-40">
              "Whatever you did for one of the least of these brothers and sisters of mine, you did for me." — Matthew 25:40
            </p>
        </footer>
    </div>
  );
}
