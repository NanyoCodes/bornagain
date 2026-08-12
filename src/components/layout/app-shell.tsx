'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useRef, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  LogOut,
  MessagesSquare,
  Newspaper,
  Search,
  Settings,
  Target,
  User,
  UserPlus,
  Loader2,
  HeartHandshake,
  TrendingUp,
  BookMarked,
  Users,
  Info,
  CalendarDays,
  Store,
  Gift,
  Package,
  ShieldCheck,
  PlusCircle,
  ShoppingCart,
  ChevronRight,
  Menu,
  Edit,
  Globe,
  X,
  Sparkles,
  Utensils,
  Trash2,
  Minus,
  Plus
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, safeToDate } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, query, where, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { Notification, UserProfile, VendorProfile, MealGiftStatus } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { href: "/growth", label: "GROWTH", icon: TrendingUp, color: "text-chart-1" },
  { href: "/souls-won", label: "Souls", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "TESTIMONIES", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/victory-hub", label: "VICTORY", icon: ShieldCheck, color: "text-primary" },
  { href: "/accountability", label: "Partners", icon: HeartHandshake, color: "text-primary" },
];

const NOTIFICATION_TYPES = [
  'campaign_join', 
  'new_chat_message', 
  'accountability_nudge', 
  'accountability_request', 
  'request_accepted', 
  'request_declined', 
  'accountability_partner_removed', 
  'new_soul_in_fellowship', 
  'soul_unassigned_from_fellowship', 
  'new_order', 
  'order_update'
];

const inspirationalMessages = [
  "GOD FIRST",
  "SEEK THE KINGDOM",
  "POWER IN TESTIMONY",
  "GLORY TO THE MOST HIGH",
  "EMPOWERING THE HARVEST",
  "JESUS IS LORD",
  "THE HARVEST IS PLENTIFUL",
  "STAND FIRM IN FAITH",
  "REJOICE ALWAYS"
];

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

function GlobalCartSheet({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useUser();
    const { userProfile } = useUserProfile();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [cart, setCart] = useState<{ [mealId: string]: { item: any, quantity: number } }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [manualRecipientName, setManualRecipientName] = useState('');
    const [giftInstructions, setGiftInstructions] = useState('');

    const cartKey = useMemo(() => user?.uid ? `testify_marketplace_cart_${user.uid}` : null, [user?.uid]);

    const loadCart = useCallback(() => {
        if (!cartKey) return;
        const stored = localStorage.getItem(cartKey);
        if (stored) {
            try { setCart(JSON.parse(stored)); } catch (e) { setCart({}); }
        } else {
            setCart({});
        }
    }, [cartKey]);

    useEffect(() => {
        if (isOpen) loadCart();
        const handler = () => loadCart();
        window.addEventListener('testify_marketplace_cart_update', handler);
        return () => window.removeEventListener('testify_marketplace_cart_update', handler);
    }, [isOpen, loadCart]);

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

    const handleUpdateQty = (id: string, delta: number) => {
        const next = { ...cart };
        const item = next[id];
        if (!item) return;
        item.quantity += delta;
        if (item.quantity <= 0) delete next[id];
        setCart(next);
        if (cartKey) localStorage.setItem(cartKey, JSON.stringify(next));
        window.dispatchEvent(new Event('testify_marketplace_cart_update'));
    };

    const handleRemove = (id: string) => {
        const next = { ...cart };
        delete next[id];
        setCart(next);
        if (cartKey) localStorage.setItem(cartKey, JSON.stringify(next));
        window.dispatchEvent(new Event('testify_marketplace_cart_update'));
    };

    const handleDispatch = async () => {
        if (!user || !firestore || !userProfile || cartItems.length === 0) return;
        if (!manualRecipientName.trim()) {
            toast({ variant: 'destructive', title: 'Recipient Required' });
            return;
        }
        if (!giftInstructions.trim()) {
            toast({ variant: 'destructive', title: 'Instructions Required' });
            return;
        }

        setIsProcessing(true);
        const batch = writeBatch(firestore);
        const giftsRef = collection(firestore, 'mealGifts');
        const senderName = `${userProfile.firstName} ${userProfile.lastName}`;

        cartItems.forEach(cartItem => {
            const vendorOwnerId = cartItem.item.vendorOwnerId;
            for(let i = 0; i < cartItem.quantity; i++) {
                const giftRef = doc(giftsRef);
                batch.set(giftRef, {
                    senderId: user.uid,
                    senderName,
                    recipientSoulId: null,
                    recipientName: manualRecipientName,
                    vendorId: cartItem.item.vendorId,
                    vendorName: cartItem.item.vendorName,
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

            if (vendorOwnerId && vendorOwnerId !== user.uid) {
                const notifRef = doc(collection(firestore, `users/${vendorOwnerId}/notifications`));
                batch.set(notifRef, {
                    userId: vendorOwnerId,
                    type: 'new_order',
                    title: 'New Offering Order!',
                    message: `${senderName} ordered "${cartItem.item.name}" for ${manualRecipientName}.`,
                    link: `/dashboard/marketplace/orders`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                });
            }
        });

        try {
            await batch.commit();
            if (cartKey) localStorage.removeItem(cartKey);
            setCart({});
            window.dispatchEvent(new Event('testify_marketplace_cart_update'));
            toast({ title: 'Offering Confirmed!', description: `Act of kindness for ${manualRecipientName} recorded.` });
            onOpenChange(false);
            router.push('/marketplace/orders');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Dispatch Failed' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b flex-shrink-0 bg-muted/10 text-left">
                    <div className="flex items-center gap-2 mb-2 text-left">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary text-left">Provision Hub</span>
                    </div>
                    <SheetHeader className="text-left flex-shrink-0 text-left">
                        <SheetTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kindness Package</SheetTitle>
                        <SheetDescription className="text-sm font-medium mt-1 text-left">Review selection for {manualRecipientName || 'the brethren'}.</SheetDescription>
                    </SheetHeader>
                </div>
                
                <ScrollArea className="flex-grow min-h-0 overscroll-contain">
                    <div className="p-8 space-y-10 text-left">
                        {cartItems.length > 0 ? (
                            <div className="space-y-10 text-left">
                                <div className="space-y-6 text-left">
                                    {cartByVendor.map(group => (
                                        <div key={group.vendorId} className="space-y-3 text-left">
                                            <div className="flex items-center justify-between px-1 text-left">
                                                <div className="flex items-center gap-2 text-left">
                                                    <Store className="h-3.5 w-3.5 text-primary" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[200px] text-left">{group.vendorName}</h4>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-primary/20 text-left">{getCurrencySymbol(group.currency)}{group.deliveryFee.toLocaleString()} Delivery</Badge>
                                            </div>
                                            <div className="space-y-2 text-left text-left">
                                                {group.items.map((c: any) => (
                                                    <div key={c.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border shadow-inner group text-left text-left">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border text-left">
                                                                {c.item.vendorType === 'gift' ? <Gift className="h-5 w-5 text-primary" /> : <Utensils className="h-5 w-5 text-primary" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1 text-left text-left">
                                                                <p className="font-black text-sm uppercase tracking-tight truncate text-left">{c.item.name}</p>
                                                                <p className="text-[10px] font-bold text-primary uppercase text-left">{getCurrencySymbol(c.item.currency)}{c.item.price.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-2 text-left text-left">
                                                            <div className="flex items-center gap-1 bg-background rounded-full p-0.5 border shadow-sm text-left">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleUpdateQty(c.item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                                                <span className="text-[11px] font-black min-w-[1.25rem] text-center">{c.quantity}</span>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleUpdateQty(c.item.id, 1)}><Plus className="h-3 w-3" /></Button>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive" onClick={() => handleRemove(c.item.id)}><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-6 text-left text-left text-left">
                                    <div className="space-y-2 text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recipient Name</Label>
                                        <Input placeholder="Who is this for?" value={manualRecipientName} onChange={(e) => setManualRecipientName(e.target.value)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold text-left" />
                                    </div>
                                    <div className="space-y-2 text-left text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logistical Instructions</Label>
                                        <Textarea placeholder="Delivery details, contact info..." value={giftInstructions} onChange={(e) => setGiftInstructions(e.target.value)} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-24 text-center px-8 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center text-left text-left">
                                <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mb-6 text-left">
                                    <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10 text-left" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight opacity-40 text-left">Empty Hub</h3>
                                <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto text-balance leading-relaxed text-left text-left">Add items from the marketplace to build your package.</p>
                                <Button variant="outline" asChild className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-[0.2em] border-primary/20 text-primary hover:bg-primary/5 shadow-lg text-left text-left" onClick={() => onOpenChange(false)}>
                                    <Link href="/marketplace" className="text-left text-left">VISIT HUB</Link>
                                </Button>
                            </div>
                        )}
                        <div className="h-24" />
                    </div>
                </ScrollArea>

                {cartItems.length > 0 && (
                    <SheetFooter className="p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm text-left">
                        <Button onClick={handleDispatch} disabled={isProcessing || !manualRecipientName.trim() || !giftInstructions.trim()} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase text-left text-left">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin text-left text-left text-left" />}
                            DISPATCH PACKAGE
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

function CartButton() {
  const { user } = useUser();
  const [count, setCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const updateCount = useCallback(() => {
    if (!user?.uid) {
      setCount(0);
      return;
    }
    const key = `testify_marketplace_cart_${user.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const cart = JSON.parse(stored);
        const total = Object.values(cart).reduce((acc: number, c: any) => acc + c.quantity, 0);
        setCount(total);
      } catch (e) {
        setCount(0);
      }
    } else {
      setCount(0);
    }
  }, [user?.uid]);

  useEffect(() => {
    updateCount();
    window.addEventListener('testify_marketplace_cart_update', updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener('testify_marketplace_cart_update', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, [updateCount]);

  if (!user) return null;

  return (
    <>
        <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left" onClick={() => setIsSheetOpen(true)}>
                <ShoppingCart className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
                {count > 0 && (
                    <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white border-2 border-background animate-in zoom-in text-left">
                    {count}
                    </div>
                )}
            </Button>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl border-primary/20 shadow-xl text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-left">Kindness Package</p>
            </TooltipContent>
        </Tooltip>
        </TooltipProvider>
        <GlobalCartSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  );
}

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute, userVendors }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean, userVendors: VendorProfile[] | null }) {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isProfileIncomplete = userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-4 md:px-6 shrink-0 pt-[env(safe-area-inset-top)] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex w-full items-center gap-3 text-left">
          <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)} className="shrink-0 h-11 w-11 rounded-full hover:bg-muted/50 transition-colors text-left">
            <ArrowLeft className="h-6 w-6 text-left" />
          </Button>
          <form className="w-full text-left" onSubmit={(e) => e.preventDefault()}>
            <div className="relative text-left">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50 text-left" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full pl-10 h-11 rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </form>
        </div>
      </header>
    );
  }

  const showGuestButtons = isPublicRoute && !user;

  return (
    <header className="sticky top-0 z-30 flex h-16 md:h-20 items-center justify-between border-b bg-background/95 backdrop-blur-xl px-4 md:px-8 shrink-0 pt-[env(safe-area-inset-top)] relative gap-4">
      <div className="flex shrink-0 w-[56px] md:w-[220px] text-left">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {logo && (
            <Avatar className="h-14 w-14 md:h-16 md:w-16 shadow-sm transition-transform hover:scale-105 active:scale-95 border border-transparent text-left">
              <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover text-left" />
              <AvatarFallback className="text-left">T</AvatarFallback>
            </Avatar>
          )}
        </Link>
      </div>

      <nav className="hidden md:flex flex-1 justify-center items-center h-full min-w-0 text-left">
        <div className="flex items-center gap-1 lg:gap-2 h-full max-w-full overflow-x-auto no-scrollbar text-left">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-all px-2 lg:px-4 h-11 rounded-2xl whitespace-nowrap flex items-center gap-2 group relative text-left",
                    isActive 
                      ? "bg-primary text-white shadow-xl shadow-primary/40 ring-2 ring-primary/20 scale-105" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform", !isActive && item.color, isActive && "scale-110")} />
                <span className={cn(
                    "text-[10px] lg:text-[11px] font-black uppercase tracking-tight transition-all leading-none text-left",
                    isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                )}>
                {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
        
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 justify-end min-w-0 text-left">
        <div className="hidden lg:block min-w-0 text-left">
            <form onSubmit={(e) => e.preventDefault()} className="text-left">
              <div className="relative text-left">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 text-left" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="pl-8 w-[140px] xl:w-[200px] h-10 rounded-xl bg-muted/20 border-none text-[12px] transition-all focus:w-[180px] xl:focus:w-[260px] text-left"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
        </div>
        
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="lg:hidden h-11 w-11 rounded-full transition-transform active:scale-95 text-left" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-6 w-6 text-left" />
            <span className="sr-only text-left">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <CartButton />
            <Link href="/chats" className="text-left">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="text-left">
                    <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left">
                      <MessagesSquare className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-left">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications" className="text-left">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="text-left">
                    <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left">
                      <Bell className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-left">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-11 w-11 shrink-0 text-left">
                  <Avatar className="h-10 w-10 border shadow-sm text-left">
                    <AvatarImage src={user.photoURL ?? undefined} className="object-cover text-left" />
                    <AvatarFallback className="text-xs font-bold text-left">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0 right-0 flex h-3 w-3 text-left">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-background"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-50 min-w-[8rem] overflow-hidden border bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-64 rounded-[1.5rem] shadow-2xl p-2 border-none max-h-[80vh] overflow-y-auto no-scrollbar text-left" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 text-left">
                  <div className="flex flex-col space-y-1 text-left">
                    <p className="text-sm font-black leading-tight truncate uppercase tracking-tight text-left">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-wider text-left">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/profile" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-left">
                        <User className="h-4 w-4 text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left text-left">Profile Identity</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/settings" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-left">
                        <Settings className="h-4 w-4 text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left text-left">System Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-2 tracking-[0.2em] text-left">Kingdom Hubs</p>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/victory-hub" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <ShieldCheck className="h-4 w-4 text-primary text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left">Victory Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/marketplace" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-left">
                        <Store className="h-4 w-4 text-blue-600 text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left">Meals Provision</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/marketplace/gifts" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-left">
                        <Gift className="h-4 w-4 text-indigo-600 text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left">Kindness Gifts</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/marketplace/orders" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-left">
                        <Package className="h-4 w-4 text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left">Order Tracker</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/events" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <CalendarDays className="h-4 w-4 text-primary text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left">Event Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/fellowships" className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-left">
                        <Users className="h-4 w-4 text-left" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-left">Fellowships</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                {userVendors && userVendors.length > 0 && (
                   <>
                    <DropdownMenuSeparator />
                    <div className="p-1 space-y-1 text-left">
                      <p className="text-[9px] font-black uppercase text-primary/60 px-3 py-2 tracking-[0.2em] text-left">My Storefronts</p>
                      {userVendors.map(v => (
                        <DropdownMenuItem key={v.id} asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                          <Link href={`/marketplace/vendors/${v.id}`} className="flex items-center gap-3 w-full text-left">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-left">
                              <Package className="h-4 w-4 text-primary text-left" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-tight truncate text-left">{v.businessName}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                   </>
                )}

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                      <Link href="/guide" className="flex items-center gap-3 w-full text-left text-left">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-left">
                          <Info className="h-4 w-4 text-left" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-left">App Guide</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-12 px-3 transition-colors cursor-pointer text-left">
                      <Link href="/resources" className="flex items-center gap-3 w-full text-left text-left">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-left">
                          <BookMarked className="h-4 w-4 text-left" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-left">Kingdom Library</span>
                      </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 text-left text-left">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl h-12 px-3 cursor-pointer text-left">
                    <LogOut className="mr-3 h-5 w-5 text-left" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-left">Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : showGuestButtons ? (
          <div className="flex items-center gap-2 text-left">
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex h-10 px-4 rounded-full font-bold text-left">
              <Link href="/login" className="text-left">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 text-left">
              <Link href="/" className="text-left">Get Started</Link>
            </Button>
          </div>
        ) : (
          <div className="h-11 w-11 md:h-12 md:w-12 animate-pulse rounded-full bg-muted text-left" />
        )}
      </div>
    </header>
  );
}

function BottomNavBar() {
    const pathname = usePathname();
    const mobileNavItems = navItems.slice(0, 5);
  
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex min-h-[4.5rem] h-auto items-stretch justify-around px-1 py-1">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="relative flex flex-1 flex-col items-center justify-center min-w-0"
                aria-label={item.label}
              >
                <motion.div
                  className="relative flex flex-col items-center justify-center rounded-xl px-1 py-1 min-h-[56px]"
                  whileTap={{ scale: 0.85 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 bg-primary rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.15 : 1,
                      color: isActive ? "#ffffff" : "var(--muted-foreground)"
                    }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "relative z-10 flex flex-col items-center gap-1",
                      isActive ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className={cn("h-6 w-6", !isActive && item.color)} />
                    <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter transition-all leading-none",
                        isActive ? "opacity-100" : "opacity-60"
                    )}>
                        {item.label}
                    </span>
                  </motion.div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>
    );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showSplash, setShowSplash] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    setLoadingMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);

    const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000;
    const lastShown = localStorage.getItem('testify_splash_last_shown');
    const forceSplash = sessionStorage.getItem('testify_force_splash') === 'true';
    const now = Date.now();

    if (forceSplash || !lastShown || now - parseInt(lastShown || '0', 10) > SPLASH_COOLDOWN) {
        if (forceSplash) sessionStorage.removeItem('testify_force_splash');
        setShowSplash(true);
        const timer = setTimeout(() => {
            setShowSplash(false);
            localStorage.setItem('testify_splash_last_shown', now.toString());
            setContentVisible(true);
        }, 10000);
        return () => clearTimeout(timer);
    } else {
        setContentVisible(true);
    }
  }, [pathname]);

  const handleDismissSplash = () => {
    setShowSplash(false);
    localStorage.setItem('testify_splash_last_shown', Date.now().toString());
    setContentVisible(true);
  };

  useEffect(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (userProfile?.backgroundImage) {
      const isGradient = userProfile.backgroundImage.startsWith('linear-gradient');
      const bgValue = isGradient ? userProfile.backgroundImage : `url('${userProfile.backgroundImage}')`;
      root.style.setProperty('--app-bg-image', bgValue);
    }
    if (userProfile?.backgroundOverlayOpacity != null) {
      root.style.setProperty('--app-bg-overlay', userProfile.backgroundOverlayOpacity.toString());
    }
  }, [userProfile, mounted]);

  const publicRoutes = ['/testimonies', '/campaigns', '/about', '/contact', '/resources', '/guide', '/terms-of-service', '/privacy-policy', '/growth', '/fellowships', '/events', '/marketplace', '/marketplace/gifts', '/marketplace/orders', '/victory-hub', '/strongholds'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) || pathname === '/';

  const isTakeoverPage = useMemo(() => {
    return (
      pathname.startsWith('/chats') ||
      pathname.startsWith('/dashboard/chats') ||
      pathname.startsWith('/notes') ||
      pathname.startsWith('/dashboard/notes') ||
      pathname.startsWith('/bible') ||
      pathname.startsWith('/dashboard/bible') ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/dashboard/notifications')
    );
  }, [pathname]);

  const unreadChatNotificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where('type', '==', 'new_chat_message'), where('isRead', '==', false));
  }, [user?.uid, firestore]);
  const { data: unreadChatNotifications } = useCollection<Notification>(unreadChatNotificationsQuery);

  const unreadOtherNotificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where('type', 'in', NOTIFICATION_TYPES), where('isRead', '==', false));
  }, [user?.uid, firestore]);
  const { data: unreadOtherNotifications } = useCollection<Notification>(unreadOtherNotificationsQuery);

  const userVendorsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'vendors'), where('userId', '==', user.uid));
  }, [user?.uid, firestore]);
  const { data: userVendors } = useCollection<VendorProfile>(userVendorsQuery);

  useEffect(() => {
    if (!authLoading && !user && !isPublicRoute) router.push('/login');
  }, [authLoading, user, router, isPublicRoute]);

  useEffect(() => {
    if (!profileLoading && userProfile) {
        const isNewUserSession = sessionStorage.getItem('isNewUserSession') === 'true';
        const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');
        if (isNewUserSession && userProfile.firstName && !welcomePopupShown) {
            const timer = setTimeout(() => {
                setShowWelcomePopup(true);
                sessionStorage.setItem('welcomePopupShown', 'true');
            }, 500);
            return () => clearTimeout(timer);
        }
    }
  }, [profileLoading, userProfile]);

  if (authLoading || (profileLoading && !userProfile) || (!user && !isPublicRoute)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background animate-in fade-in duration-1000 text-center text-left">
        <div className="relative mb-8 mx-auto w-fit text-left">
            <Loader2 className="h-12 w-12 animate-spin text-primary text-left" />
            <div className="absolute inset-0 flex items-center justify-center text-left">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse text-left" />
            </div>
        </div>
        <p className="text-2xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-6 text-left">
          {loadingMessage || "GOD FIRST"}
        </p>
        <p className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 text-left">
            Kingdom Network Active
        </p>
      </div>
    );
  }

  const isProfileIncomplete = user && userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());
  const showBottomNav = !isTakeoverPage;

  return (
    <div className={cn("flex w-full flex-col overflow-x-hidden", isTakeoverPage ? "h-dvh" : "min-h-dvh")}>
      <AnimatePresence>
          {showSplash && <SplashScreen onDismiss={handleDismissSplash} />}
      </AnimatePresence>

      <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: contentVisible ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="flex-1 flex flex-col min-h-0 text-left"
      >
          {!isTakeoverPage && (
          <AppHeader 
              unreadChatCount={unreadChatNotifications?.length || 0} 
              unreadNotifCount={unreadOtherNotifications?.length || 0}
              isPublicRoute={isPublicRoute}
              userVendors={userVendors || null}
          />
          )}
          <div className="flex-1 relative min-h-0 text-left">
          <main 
              ref={scrollContainerRef}
              className={cn(
                  "absolute inset-0", 
                  !isTakeoverPage ? "overflow-y-auto" : "overflow-hidden"
              )}
          >
              <div className={cn(
              "mx-auto h-full", 
              !isTakeoverPage ? "max-w-7xl p-3 md:p-6 pb-24 sm:pb-6" : "w-full flex flex-col" 
              )}>
                  <PageTransition>{children}</PageTransition>
              </div>
          </main>
          </div>
      </motion.div>

      {user && showBottomNav && <BottomNavBar />}
      
      {user && !isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
      
      {user && mounted && isMobile ? (
        <Sheet open={!!isProfileIncomplete}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl text-left">
            <div className="p-6 border-b flex-shrink-0 bg-muted/10 pt-[env(safe-area-inset-top)] text-left">
              <SheetHeader className="text-left text-left">
                <SheetTitle className="text-xl font-bold text-left">Complete Your Profile</SheetTitle>
                <SheetDescription className="text-xs text-left">Join the global movement by introducing yourself.</SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-6 text-left">
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </div>
          </SheetContent>
        </Sheet>
      ) : user ? (
        <Dialog open={!!isProfileIncomplete}>
          <DialogContent hideCloseButton className="sm:max-w-lg rounded-[2rem] overflow-hidden p-0 text-left">
            <div className="p-6 border-b bg-muted/10 text-left">
              <DialogHeader className="text-left text-left">
                  <DialogTitle className="text-2xl font-bold text-left">Complete Your Profile</DialogTitle>
                  <DialogDescription className="text-sm text-left">Please provide your name and photo to join the Kingdom workforce.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto text-left text-left">
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center text-left">
                <Loader2 className="h-10 w-10 animate-spin text-primary text-left" />
            </div>
        }>
            <ShellInner>{children}</ShellInner>
        </Suspense>
    </SearchProvider>
  );
}
