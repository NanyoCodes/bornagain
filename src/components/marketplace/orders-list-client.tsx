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
    X,
    XCircle,
    Globe,
    CreditCard
} from 'lucide-react';
import { format, isToday } from 'date-fns';
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

/**
 * Ensures vendor details in the order tracker are always current.
 */
function LiveVendorInfo({ vendorId, fallbackName, orderPhotoURL }: { vendorId: string, fallbackName: string, orderPhotoURL?: string }) {
    const firestore = useFirestore();
    const vendorRef = React.useMemo(() => vendorId ? doc(firestore, 'vendors', vendorId) : null, [firestore, vendorId]);
    const { data: vendor } = useDoc<VendorProfile>(vendorRef);
    
    const ownerRef = React.useMemo(() => vendor?.userId ? doc(firestore, 'users', vendor.userId) : null, [firestore, vendor?.userId]);
    const { data: owner } = useDoc<UserProfile>(ownerRef);
    const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Kingdom Believer';

    const phone = vendor?.phone || owner?.phone;
    const email = owner?.email;

    return (
        <div className="flex flex-col gap-1 min-w-0 text-left">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1 text-left">Kingdom Provider</p>
            <div className="flex items-center gap-3 text-left">
                 <Link href={`/dashboard/marketplace/vendors/${vendorId}`} className="shrink-0 active:scale-95 transition-transform text-left">
                    <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm text-left">
                        <AvatarImage src={vendor?.photoURL || orderPhotoURL || owner?.photoURL} className="object-cover text-left" />
                        <AvatarFallback className="text-[10px] font-black bg-primary/5 text-primary text-center flex items-center justify-center h-full w-full">
                            {owner?.firstName?.charAt(0) || vendor?.businessName?.charAt(0) || 'K'}
                        </AvatarFallback>
                    </Avatar>
                 </Link>
                 <div className="min-w-0 flex-1 text-left">
                    <Link href={`/dashboard/marketplace/vendors/${vendorId}`} className="text-sm font-black truncate hover:text-primary transition-colors uppercase tracking-tight flex items-center gap-1.5 text-left">
                        <Store className="h-3 w-3 shrink-0 text-left" />
                        {vendor?.businessName || fallbackName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-left">
                         <Link href={vendor?.userId ? `/dashboard/profile/${vendor.userId}` : '#'} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-left">
                            <User className="h-2.5 w-2.5 opacity-60 text-left" />
                            {ownerName}
                        </Link>
                        {email && (
                            <a href={`mailto:${email}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-left">
                                <Mail className="h-2.5 w-2.5 opacity-60 text-left" />
                                {email}
                            </a>
                        )}
                        {phone && (
                            <a href={`tel:${phone}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-left">
                                <Phone className="h-2.5 w-2.5 opacity-60 text-left" />
                                {phone}
                            </a>
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
        <div className="flex flex-col gap-1 min-w-0 text-left">
            <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-1 text-left">Recipient</p>
            <div className="flex items-center gap-3 text-left">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-dashed text-left">
                    <User className="h-5 w-5 text-muted-foreground text-left" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-black truncate uppercase tracking-tight text-left">{soul?.firstName ? `${soul.firstName} ${soul.lastName || ''}` : fallbackName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-left">
                        {soul?.email && (
                            <a href={`mailto:${soul.email}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-left">
                                <Mail className="h-2.5 w-2.5 opacity-60 text-left" />
                                {soul.email}
                            </a>
                        )}
                        {soul?.phone && (
                            <a href={`tel:${soul.phone}`} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-left">
                                <Phone className="h-2.5 w-2.5 opacity-60 text-left" />
                                {soul.phone}
                            </a>
                        )}
                        {!soul?.email && !soul?.phone && (
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70 text-left">Kingdom Member</p>
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
  const [orderToCancel, setOrderToCancel] = React.useState<MealGift | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

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

  const handleCancelOrder = async () => {
    if (!user || !firestore || !orderToCancel) return;
    
    // Safety check: Only sender can cancel
    if (orderToCancel.senderId !== user.uid) {
        toast({ variant: 'destructive', title: 'Action Denied', description: 'Only the sender can cancel this offering.' });
        return;
    }

    setIsCancelling(true);
    const orderRef = doc(firestore, 'mealGifts', orderToCancel.id);
    const batch = writeBatch(firestore);

    batch.update(orderRef, { status: 'cancelled' });

    // Notify vendor about cancellation
    const vendorNotificationRef = doc(collection(firestore, `users/${orderToCancel.vendorOwnerId}/notifications`));
    batch.set(vendorNotificationRef, {
        userId: orderToCancel.vendorOwnerId,
        type: 'order_update',
        title: 'Order Cancelled',
        message: `The order for "${orderToCancel.mealName}" by ${orderToCancel.senderName} was cancelled by the sender.`,
        link: `/dashboard/marketplace/orders`,
        isRead: false,
        createdAt: serverTimestamp(),
    });

    try {
        await batch.commit();
        toast({ title: 'Order Cancelled', description: 'Your offering has been cancelled.' });
        setOrderToCancel(null);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Cancellation Failed' });
    } finally {
        setIsCancelling(false);
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
    const body = ordersToExport.map(o => {
      const sym = getCurrencySymbol(o.currency);
      return [
        o.mealName,
        o.recipientName,
        o.senderName,
        o.vendorName,
        `${sym}${(o.price + (o.deliveryFee || 0)).toLocaleString()}`,
        o.status.toUpperCase(),
        o.createdAt ? format(o.createdAt.toDate(), 'yyyy-MM-dd') : ''
      ];
    });

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
                        photoURL: type === 'sent' ? order.vendorPhotoURL || otherProfile.photoURL || '' : otherProfile.photoURL || '', 
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
        case 'ordered': return <Timer className="h-4 w-4 text-amber-500 text-left" />;
        case 'preparing': return <Utensils className="h-4 w-4 text-blue-500 text-left" />;
        case 'delivering': return <Truck className="h-4 w-4 text-primary text-left" />;
        case 'delivered': return <CheckCircle2 className="h-4 w-4 text-green-500 text-left" />;
        case 'cancelled': return <XCircle className="h-4 w-4 text-destructive text-left" />;
        default: return <Package className="h-4 w-4 text-left" />;
    }
  };

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'preparing': return 'PREPARING';
          case 'delivering': return 'SHIPPING';
          case 'delivered': return 'DONE';
          case 'cancelled': return 'CANCELLED';
          default: return 'ORDERED';
      }
  };

  const renderOrderCard = (order: MealGift, type: 'sent' | 'received') => {
      const createdAt = safeToDate(order.createdAt);
      const isGift = order.vendorType === 'gift';
      const CenterIcon = isGift ? Gift : Utensils;
      const categoryLabel = isGift ? 'Kindness Offering' : 'Meal Provision';
      const orderSymbol = getCurrencySymbol(order.currency);

      return (
        <Card key={order.id} className="rounded-none sm:rounded-2xl overflow-hidden border-x-0 sm:border shadow-none sm:shadow-md bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all border-b-4 border-b-primary/5 text-left text-left">
            <CardHeader className="p-3.5 sm:p-5 pb-1.5 flex flex-row items-center justify-between border-b bg-muted/5 text-left">
                <div className="flex items-center gap-1.5 text-left">
                    <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shadow-inner text-left",
                        isGift ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
                    )}>
                        <CenterIcon className="h-3.5 w-3.5 text-left" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60 text-left">{categoryLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-left">
                    {order.currency && <Badge variant="outline" className="h-4 px-1 text-[7px] font-black uppercase bg-background/50 border-primary/20 text-left"><Globe className="h-2 w-2 mr-1 text-left" />{order.currency}</Badge>}
                    {createdAt && (
                        <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter text-left">
                            {format(createdAt, 'MMM d, p')}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 text-left">
                    <div className="flex items-start gap-4 min-w-0 flex-1 text-left">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform text-left">
                            {getStatusIcon(order.status)}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2 mb-0.5 text-left">
                                <Badge variant="outline" className={cn(
                                    "h-4 px-1.5 uppercase font-black text-[8px] tracking-widest border shadow-sm text-left",
                                    order.status === 'delivered' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                                    order.status === 'cancelled' ? "bg-destructive/5 text-destructive border-destructive/20" :
                                    "bg-primary/5 text-primary border-primary/20"
                                )}>
                                    {getStatusLabel(order.status)}
                                </Badge>
                            </div>
                            <h3 className="font-black text-sm sm:text-base uppercase tracking-tight truncate leading-tight mb-0.5 text-left">
                                {order.mealName}
                            </h3>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] opacity-80 text-left">
                                {type === 'sent' ? 'RECIPIENT' : 'SENDER'}: <span className="text-foreground text-left">{type === 'sent' ? order.recipientName : order.senderName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 text-left">
                         <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto text-left">
                            <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest sm:hidden text-left">VALUE</p>
                            <p className="text-lg sm:text-xl font-black text-primary tracking-tighter text-left">{orderSymbol}{(order.price + (order.deliveryFee || 0)).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-left">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-full h-8 px-3 text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 text-left"
                                onClick={() => handleInitiateChat(order, type)}
                                disabled={isChatLoading === order.id}
                            >
                                {isChatLoading === order.id ? <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin text-left" /> : <MessagesSquare className="mr-1 h-2.5 w-2.5 text-left" />}
                                CHAT
                            </Button>
                            {type === 'sent' && order.status === 'ordered' && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="rounded-full h-8 px-3 text-[9px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 text-left"
                                    onClick={() => setOrderToCancel(order)}
                                >
                                    CANCEL
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-dashed text-left">
                    {type === 'sent' ? (
                        <LiveVendorInfo vendorId={order.vendorId} fallbackName={order.vendorName} orderPhotoURL={order.vendorPhotoURL} />
                    ) : (
                        <LiveRecipientInfo soulId={order.recipientSoulId} fallbackName={order.recipientName} />
                    )}
                    
                    {order.instructions && (
                        <div className="p-3 rounded-xl bg-muted/20 border-2 border-dashed border-primary/10 text-[10px] text-muted-foreground italic font-medium leading-relaxed relative overflow-hidden group/text shadow-inner text-left">
                            <ShoppingBag className="absolute top-2 right-3 h-8 w-8 opacity-[0.03] rotate-12 group-hover/text:rotate-0 transition-transform pointer-events-none text-left" />
                            <p className="relative z-10 text-left">&ldquo;{order.instructions}&rdquo;</p>
                        </div>
                    )}
                </div>
            </CardContent>
            {type === 'received' && order.status !== 'cancelled' && (
                <CardFooter className="p-1.5 bg-muted/20 border-t flex flex-wrap gap-1 text-left">
                    {['preparing', 'delivering', 'delivered'].map((status) => (
                        <Button 
                            key={status}
                            variant="ghost" 
                            size="sm" 
                            disabled={order.status === status}
                            className={cn(
                                "flex-1 h-8 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all text-left",
                                order.status === status ? "bg-background text-primary shadow-sm scale-105" : "hover:bg-background/50"
                            )}
                            onClick={() => updateOrderStatus(order.id, status as MealGiftStatus, order.senderId, order.mealName)}
                        >
                            {status === 'preparing' && 'PREPARE'}
                            {status === 'delivering' && (isGift ? 'SHIP' : 'DELIVER')}
                            {status === 'delivered' && 'DONE'}
                        </Button>
                    ))}
                </CardFooter>
            )}
            {order.status === 'cancelled' && (
                <CardFooter className="p-2 bg-destructive/5 border-t justify-center text-left">
                    <p className="text-[8px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1.5 text-center text-left">
                        <XCircle className="h-2.5 w-2.5 text-left" /> Provision Cancelled. Coordinate with provider.
                    </p>
                </CardFooter>
            )}
        </Card>
      );
  };

  const emptyState = (
    <div className="py-24 text-center px-8 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center text-left">
        <div className="h-16 w-16 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
            <Inbox className="h-8 w-8 text-muted-foreground opacity-10 text-left" />
        </div>
        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-40 text-center text-left">No {activeCategory === 'meal' ? 'Meals' : 'Gifts'} Found</h3>
        <p className="mt-2 text-xs text-muted-foreground italic font-medium max-w-sm mx-auto leading-relaxed text-balance text-center text-left">
            {activeType === 'sent' 
                ? `Your acts of kindness in the ${activeCategory === 'meal' ? 'Meals' : 'Gifts'} category will appear here.`
                : `When believers order ${activeCategory === 'meal' ? 'meals' : 'gifts'} from your storefront, they will appear here.`
            }
        </p>
        {activeType === 'sent' && (
            <Button variant="outline" asChild className="mt-8 rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 shadow-lg text-left">
                <Link href={activeCategory === 'meal' ? "/marketplace" : "/marketplace/gifts"} className="text-left">EXPLORE {activeCategory === 'meal' ? 'MEALS' : 'GIFT'} HUB</Link>
            </Button>
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden text-left">
        <header className="flex-shrink-0 p-4 sm:p-6 md:p-8 pb-2 text-left">
            <div className="flex flex-col gap-6 text-left">
                <div className="flex items-center justify-between gap-4 text-left">
                    <div className="flex items-center gap-4 min-w-0 text-left">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-10 w-10 border bg-background shadow-sm text-left"><ArrowLeft className="h-6 w-6 text-left" /></Button>
                        <div className="space-y-1 min-w-0 text-left">
                            <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase truncate text-left">Order Hub</h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60 flex items-center gap-2 text-left">
                                <Package className="h-3.5 w-3.5 text-primary text-left" /> Provision Logistics
                            </p>
                        </div>
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full shadow-lg border-primary/20 text-primary h-10 w-10 text-left">
                                <Download className="h-5 w-5 text-left" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl text-left">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Export History</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleExportHistory('csv')} className="text-left py-2">CSV (Excel)</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleExportHistory('pdf')} className="text-left py-2">PDF Report</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 text-left">
                    <Tabs value={activeCategory} onValueChange={(val: any) => setActiveCategory(val)} className="flex-1 text-left">
                        <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/40 p-1 rounded-2xl text-left">
                            <TabsTrigger value="meal" className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 text-left"><Utensils className="h-3 w-3 text-left" /> Meals Hub</TabsTrigger>
                            <TabsTrigger value="gift" className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 text-left"><Gift className="h-3 w-3 text-left" /> Kindness Center</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {isVendorOfCurrentType && (
                        <Tabs value={activeType} onValueChange={(val: any) => setActiveType(val)} className="sm:w-[220px] text-left">
                            <TabsList className="grid w-full grid-cols-2 h-11 bg-primary/10 p-1 rounded-2xl border-2 border-primary/20 text-left">
                                <TabsTrigger value="sent" className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 text-left"><Send className="h-3 w-3 text-left" /> Sent</TabsTrigger>
                                <TabsTrigger value="received" className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 text-left"><Inbox className="h-3 w-3 text-left" /> Received</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            </div>
        </header>

        <ScrollArea className="flex-1 w-full px-4 sm:px-6 md:px-8 mt-4 text-left">
            <div className="space-y-4 sm:space-y-6 pb-20 text-left">
                {activeType === 'sent' ? (
                    filteredSentOrders.length > 0 ? (
                        filteredSentOrders.map(order => renderOrderCard(order, 'sent'))
                    ) : emptyState
                ) : (
                    filteredReceivedOrders.length > 0 ? (
                        filteredReceivedOrders.map(order => renderOrderCard(order, 'received'))
                    ) : emptyState
                )}
            </div>
        </ScrollArea>

        <footer className="text-center py-6 border-t mt-auto px-8 bg-background shrink-0 text-left">
            <p className="text-[9px] text-muted-foreground italic font-bold uppercase tracking-[0.2em] max-w-md mx-auto opacity-40 text-center text-left">
              "Whatever you did for one of the least of these brothers and sisters of mine, you did for me." — Matt 25:40
            </p>
        </footer>

        <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
            <AlertDialogContent className="rounded-[2rem] p-8 border-none shadow-2xl text-left">
                <AlertDialogHeader className="text-left">
                    <AlertDialogTitle className="text-2xl font-black font-headline uppercase leading-tight text-left">Cancel Offering?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed text-left">
                        Are you sure you want to cancel your offering of "{orderToCancel?.mealName}" for {orderToCancel?.recipientName}?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 mt-6 text-left">
                    <AlertDialogCancel disabled={isCancelling} className="rounded-xl h-11 font-bold text-left">Close</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleCancelOrder} 
                        disabled={isCancelling}
                        className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold text-left"
                    >
                        {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />}
                        Confirm Cancellation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
