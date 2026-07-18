'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
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
  Store,
  Gift,
  ShoppingCart,
  X,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  Flame,
  Zap,
  Utensils,
  Package,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Clipboard,
  Hourglass,
  CalendarDays,
  Menu,
  Edit,
  ChevronRight,
  Globe
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, safeToDate } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut, getAuth } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, query, where, updateDoc, serverTimestamp, getDoc, writeBatch, addDoc } from "firebase/firestore";
import type { Notification, UserProfile, Soul, MealGift, MealGiftStatus, Meal } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

const navItems = [
  { href: "/growth", label: "GROWTH", icon: TrendingUp, color: "text-chart-1" },
  { href: "/souls-won", label: "Souls", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "TESTIMONIES", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/fellowships", label: "Groups", icon: Users, color: "text-primary" },
  { href: "/accountability", label: "Partners", icon: HeartHandshake, color: "text-primary" },
  { href: "/dashboard/victory-hub", label: "Victory", icon: ShieldCheck, color: "text-primary" },
];

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

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute, onOpenCart, onOpenMenu }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean, onOpenCart: () => void, onOpenMenu: () => void }) {
  const { user, loading: authLoading } = useUser();
  const { userProfile } = useUserProfile();
  const pathname = usePathname();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = useCallback(() => {
    if (typeof window === 'undefined' || !user?.uid) {
        setCartCount(0);
        return;
    }
    const key = `testify_marketplace_cart_${user.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const cart = JSON.parse(stored);
            const count = Object.values(cart).reduce((acc: number, c: any) => acc + (c.quantity || 0), 0);
            setCartCount(count);
        } catch (e) { setCartCount(0); }
    } else {
        setCartCount(0);
    }
  }, [user?.uid]);

  useEffect(() => {
    updateCartCount();
    window.addEventListener('testify_marketplace_cart_update', updateCartCount);
    window.addEventListener('storage', updateCartCount);
    return () => {
        window.removeEventListener('testify_marketplace_cart_update', updateCartCount);
        window.removeEventListener('storage', updateCartCount);
    };
  }, [updateCartCount]);

  const isProfileIncomplete = userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());

  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-30 flex min-h-[4rem] h-auto py-2 items-center border-b bg-background px-4 md:px-6 shrink-0 pt-[env(safe-area-inset-top)] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex w-full items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)} className="shrink-0 h-10 w-10 rounded-full hover:bg-muted/50 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <form className="w-full" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full pl-10 h-11 rounded-2xl bg-muted/20 border-none shadow-inner text-base"
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

  const showGuestButtons = isPublicRoute && !authLoading && !user;

  return (
    <header className="sticky top-0 z-30 flex min-h-[4rem] md:min-h-[4.5rem] h-auto py-1 items-center justify-between border-b bg-background px-3 md:px-6 shrink-0 pt-[env(safe-area-inset-top)] relative">
      <div className="flex items-center shrink-0">
        <Link href={user ? "/dashboard/testimonies" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {logo && (
            <Avatar className="h-10 w-10 md:h-12 md:w-12 shadow-sm transition-transform hover:scale-105 active:scale-95 border border-transparent">
              <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          )}
          <span className="sr-only">Testify</span>
        </Link>
      </div>

      <nav className="hidden items-center absolute left-1/2 -translate-x-1/2 xl:flex overflow-x-auto no-scrollbar max-w-[50%] lg:max-w-none h-full pt-1">
        <div className="flex items-center gap-1.5 lg:gap-3 h-full">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-all hover:bg-muted/50 px-2 lg:px-4 h-[90%] rounded-2xl whitespace-nowrap flex flex-col items-center justify-center group relative",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex flex-col items-center gap-1">
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-transform", !isActive && item.color, isActive && "scale-110")} />
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter transition-all leading-none mt-0.5",
                    isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-60"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
                {isActive && (
                    <motion.div
                      layoutId="header-nav-active-bar"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
        
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 text-left">
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-full transition-transform active:scale-95" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-5 w-5 md:h-6 md:w-6" />
            <span className="sr-only">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative group h-10 w-10 md:h-12 md:w-12 rounded-full"
                    onClick={onOpenCart}
                >
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:scale-110" />
                  {cartCount > 0 && (
                    <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white animate-in zoom-in border-2 border-background shadow-sm">
                      {cartCount}
                    </div>
                  )}
                </Button>
            </motion.div>
            <Link href="/chats" prefetch={true}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-10 w-10 md:h-12 md:w-12 rounded-full">
                      <MessagesSquare className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:scale-110" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-in zoom-in border-2 border-background">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications" prefetch={true}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-10 w-10 md:h-12 md:w-12 rounded-full">
                      <Bell className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:scale-110" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-in zoom-in border-2 border-background">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>

            <Button 
                variant="ghost" 
                size="icon" 
                className="xl:hidden h-10 w-10 md:h-12 md:w-12 rounded-full transition-transform active:scale-95 group" 
                onClick={onOpenMenu}
            >
                <Menu className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:scale-110" />
                <span className="sr-only">Toggle Menu</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden xl:inline-flex">
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-10 w-10 md:h-12 md:w-12 shrink-0">
                  <Avatar className="h-9 w-9 md:h-11 md:w-11 border shadow-sm">
                    <AvatarImage src={user.photoURL ?? undefined} className="object-cover" />
                    <AvatarFallback className="text-xs font-bold">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0 right-0 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-background"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-2xl shadow-xl" align="end">
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{user.displayName || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2">Recovery Hub</DropdownMenuLabel>
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                  <Link href="/dashboard/victory-hub">
                    <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                    <span>Victory Hub</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2">Provision Hub</DropdownMenuLabel>
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                  <Link href="/dashboard/marketplace">
                    <Store className="mr-2 h-4 w-4" />
                    <span>Meals Center</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                  <Link href="/dashboard/marketplace/gifts">
                    <Gift className="mr-2 h-4 w-4" />
                    <span>Kindness Center</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                  <Link href="/dashboard/marketplace/orders">
                    <Package className="mr-2 h-4 w-4" />
                    <span>Order Tracker</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                    <Link href="/guide" className="cursor-pointer">
                    < BookOpen className="mr-2 h-4 w-4" />
                    <span>App Guide</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                    <Link href="/resources" className="cursor-pointer">
                    <BookMarked className="mr-2 h-4 w-4" />
                    <span>Spiritual Resources</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { signOut(getAuth()).then(() => router.push("/login")); }} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg mx-1">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : showGuestButtons ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex h-9 px-4 rounded-full font-bold">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-5 rounded-full font-black uppercase text-[10px] sm:text-xs tracking-widest shadow-lg shadow-primary/20">
              <Link href="/">Get Started</Link>
            </Button>
          </div>
        ) : (
          <div className="h-10 w-10 md:h-12 md:w-12 animate-pulse rounded-full bg-muted" />
        )}
      </div>
    </header>
  );
}

function BottomNavBar() {
    const pathname = usePathname();
    
    // Bottom nav shows top-level sectors (Partners filtered out for crowding)
    const mobileNavItems = navItems.filter(item => item.href !== '/accountability');
    
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex min-h-[4.5rem] h-auto items-stretch justify-around px-3 py-1 text-left">
          {mobileNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="relative flex flex-1 flex-col items-center justify-center min-w-0"
                aria-label={item.label}
              >
                <motion.div
                  className="relative flex flex-col items-center justify-center p-1.5 rounded-xl w-full text-left"
                  whileTap={{ scale: 0.85 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.1 : 1,
                      color: isActive ? "var(--primary)" : "var(--muted-foreground)"
                    }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "relative z-10 flex flex-col items-center gap-0.5",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", !isActive && item.color)} />
                    <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter transition-all leading-none mt-0.5 text-center px-0.5",
                        isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-60"
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

function PendingProvisionReminder() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [provisions, setProvisions] = useState<{ soulId: string; soulName: string; actionId: string, timestamp?: number }[]>([]);
    const [showList, setShowList] = useState(false);
    const pathname = usePathname();
    const isMobile = useIsMobile();

    const checkPendingActions = useCallback(() => {
        if (typeof window === 'undefined' || !user?.uid) {
            setProvisions([]);
            return;
        }
        const key = `testify_pending_provisions_${user.uid}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setProvisions(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                setProvisions([]);
            }
        } else {
            setProvisions([]);
        }
    }, [user?.uid]);

    useEffect(() => {
        checkPendingActions();
        window.addEventListener('testify_pending_action_update', checkPendingActions);
        window.addEventListener('storage', checkPendingActions);
        return () => {
            window.removeEventListener('testify_pending_action_update', checkPendingActions);
            window.removeEventListener('storage', checkPendingActions);
        };
    }, [checkPendingActions]);

    useEffect(() => {
        checkPendingActions();
        setShowList(false);
    }, [pathname, checkPendingActions]);

    const removeOne = async (soulId: string, actionId: string) => {
        if (!user?.uid) return;
        const key = `testify_pending_provisions_${user.uid}`;
        const next = provisions.filter(p => !(p.soulId === soulId && p.actionId === actionId));
        if (next.length === 0) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, JSON.stringify(next));
        }
        setProvisions(next);
        window.dispatchEvent(new Event('testify_pending_action_update'));

        if (!firestore) return;

        try {
            const batch = writeBatch(firestore);
            const userRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                const updatedCompleted = (userData.dailyDiscipline?.completed || []).filter(id => id !== actionId);
                batch.update(userRef, {
                    'dailyDiscipline.completed': updatedCompleted,
                    'dailyDiscipline.lastUpdated': serverTimestamp()
                });
                
                const dateString = format(new Date(), 'yyyy-MM-dd');
                const historyRef = doc(firestore, 'users', user.uid, 'disciplineHistory', dateString);
                batch.set(historyRef, {
                    completed: updatedCompleted,
                    date: serverTimestamp()
                }, { merge: true });
            }

            const soulUserRef = doc(firestore, 'users', user.uid, 'souls', soulId);
            const globalSoulRef = doc(firestore, 'souls', soulId);

            const soulDoc = await getDoc(soulUserRef);
            if (soulDoc.exists()) {
                const soulData = soulDoc.data() as Soul;
                const updatedLog = (soulData.followUpLog || []).filter(log => 
                    !(log.actions?.includes(actionId) && log.note?.includes('Initiated'))
                );
                
                batch.update(soulUserRef, { followUpLog: updatedLog, lastUpdatedAt: serverTimestamp() });
                batch.update(globalSoulRef, { followUpLog: updatedLog, lastUpdatedAt: serverTimestamp() });
            }

            await batch.commit();
        } catch (e) {
            console.error("Failed to sync cancellation:", e);
        }
    };

    if (provisions.length === 0) return null;
    if (pathname.includes('/marketplace')) return null;

    const isMultiple = provisions.length > 1;

    if (!showList) {
        const displayItem = provisions[0];
        const path = displayItem.actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
        const Icon = displayItem.actionId === 'shared_meal' ? Utensils : Gift;

        return (
            <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.8 }}
                className={cn(
                    "fixed z-[100] right-4 sm:right-8 w-[calc(100vw-2rem)] sm:w-[22rem] transition-all",
                    isMobile ? "bottom-24" : "bottom-8"
                )}
            >
                <Card 
                    className="rounded-[2rem] border-primary/20 bg-background shadow-2xl border-4 overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => isMultiple && setShowList(true)}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none text-left">
                        <ShoppingCart className="h-16 w-16 text-primary" />
                    </div>
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4 text-left">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                            {isMultiple ? <PlusCircle className="h-6 w-6 text-white" /> : <Icon className="h-6 w-6 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
                                {isMultiple ? `${provisions.length} Acts of Kindness` : 'Finish Provision'}
                            </p>
                            <p className="text-sm font-bold truncate leading-tight uppercase tracking-tight text-left">
                                {isMultiple 
                                    ? `Click to view pending gifts` 
                                    : `Complete ${displayItem.actionId === 'shared_meal' ? 'meal' : 'gift'} for ${displayItem.soulName}`
                                }
                            </p>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {!isMultiple && (
                                <Button asChild size="icon" className="h-10 w-10 rounded-full shadow-lg shrink-0">
                                    <Link href={`${path}?soulId=${displayItem.soulId}&soulName=${encodeURIComponent(displayItem.soulName)}&actionId=${displayItem.actionId}`}>
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                </Button>
                            )}
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive shrink-0"
                                onClick={() => {
                                    if (isMultiple) {
                                        setShowList(true);
                                    } else {
                                        removeOne(displayItem.soulId, displayItem.actionId);
                                    }
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.8 }}
            className={cn(
                "fixed z-[100] right-4 sm:right-8 w-[calc(100vw-2rem)] sm:w-[24rem] transition-all",
                isMobile ? "bottom-24" : "bottom-8"
            )}
        >
            <Card className="rounded-[2.5rem] border-primary/20 bg-background shadow-2xl border-4 overflow-hidden flex flex-col max-h-[60vh] text-left">
                <CardHeader className="p-6 pb-2 border-b bg-muted/5 flex flex-row items-center justify-between shrink-0 text-left">
                    <div className="space-y-0.5 text-left">
                        <CardTitle className="text-lg font-black font-headline uppercase tracking-tight text-left">Kindness Tasks</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary text-left">Pending acts for the harvest</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowList(false)} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <ScrollArea className="flex-1 min-h-0 text-left">
                    <div className="p-4 space-y-3 text-left">
                        {provisions.map((p) => {
                            const path = p.actionId === 'shared_meal' ? '/dashboard/marketplace' : '/dashboard/marketplace/gifts';
                            const Icon = p.actionId === 'shared_meal' ? Utensils : Gift;
                            return (
                                <div key={`${p.soulId}-${p.actionId}`} className="flex items-center gap-4 p-4 rounded-[1.5rem] border bg-muted/10 hover:bg-muted/20 transition-colors group text-left">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="text-sm font-black truncate uppercase tracking-tight leading-tight text-left">{p.soulName}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                                            {p.actionId === 'shared_meal' ? 'Meal Provision' : 'Send Gift'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button asChild size="sm" className="rounded-full h-8 px-4 text-[10px] font-black uppercase tracking-widest shadow-md">
                                            <Link href={`${path}?soulId=${p.soulId}&soulName=${encodeURIComponent(p.soulName)}&actionId=${p.actionId}`}>
                                                GO
                                            </Link>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full text-muted-foreground/30 hover:text-destructive"
                                            onClick={() => removeOne(p.soulId, p.actionId)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
                <CardFooter className="p-4 border-t bg-muted/5 justify-center">
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100" onClick={() => {
                         if(user?.uid) {
                             const key = `testify_pending_provisions_${user.uid}`;
                             localStorage.removeItem(key);
                             setProvisions([]);
                             window.dispatchEvent(new Event('testify_pending_action_update'));
                         }
                    }}>Clear All Pending</Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showSplash, setShowSplash] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<{ [itemId: string]: { item: Meal & { vendorName?: string; vendorOwnerId?: string; vendorPaymentDetails?: string; vendorPhotoURL?: string; vendorType?: 'meal' | 'gift' }; quantity: number } }>({});
  const [giftInstructions, setGiftInstructions] = useState('');
  const [manualRecipientName, setManualRecipientName] = useState('');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const updateCart = useCallback(() => {
    if (typeof window === 'undefined' || !user?.uid) {
        setCart({});
        return;
    }
    const key = `testify_marketplace_cart_${user.uid}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            setCart(JSON.parse(stored));
        } catch (e) { setCart({}); }
    } else {
        setCart({});
    }
  }, [user?.uid]);

  useEffect(() => {
    updateCart();
    window.addEventListener('testify_marketplace_cart_update', updateCart);
    window.addEventListener('storage', updateCart);
    return () => {
        window.removeEventListener('testify_marketplace_cart_update', updateCart);
        window.removeEventListener('storage', updateCart);
    };
  }, [updateCart]);

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

  const updateQuantity = (itemId: string, delta: number) => {
    if (!user?.uid) return;
    const key = `testify_marketplace_cart_${user.uid}`;
    const existing = cart[itemId];
    if (!existing) return;
    const { [itemId]: _, ...rest } = cart;
    const newQty = existing.quantity + delta;
    let next;
    if (newQty <= 0) {
        next = rest;
    } else {
        next = { ...cart, [itemId]: { ...existing, quantity: newQty } };
    }
    localStorage.setItem(key, JSON.stringify(next));
    setCart(next);
    window.dispatchEvent(new Event('testify_marketplace_cart_update'));
  };

  const removeFromCart = (itemId: string) => {
    if (!user?.uid) return;
    const key = `testify_marketplace_cart_${user.uid}`;
    const { [itemId]: _, ...rest } = cart;
    localStorage.setItem(key, JSON.stringify(rest));
    setCart(rest);
    window.dispatchEvent(new Event('testify_marketplace_cart_update'));
  };

  const handleGiftItems = async () => {
    if (!user || !firestore || !userProfile || cartItems.length === 0) return;
    if (!manualRecipientName.trim()) {
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
    const senderName = `${userProfile.firstName} ${userProfile.lastName}`;
    cartItems.forEach(cartItem => {
        for(let i = 0; i < cartItem.quantity; i++) {
            const giftRef = doc(giftsRef);
            batch.set(giftRef, {
                senderId: user.uid,
                senderName,
                recipientName: manualRecipientName,
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
    try {
        await batch.commit();
        const cartKey = `testify_marketplace_cart_${user.uid}`;
        localStorage.removeItem(cartKey);
        setCart({});
        window.dispatchEvent(new Event('testify_marketplace_cart_update'));
        toast({ title: 'Offering Confirmed!', description: `Package for ${manualRecipientName} recorded.` });
        setIsCartOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    } finally {
        setIsProcessingOrder(false);
    }
  };

  useEffect(() => { 
    setMounted(true); 
    setLoadingMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);
    const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000;
    const lastShown = localStorage.getItem('testify_splash_last_shown');
    const forceSplash = sessionStorage.getItem('testify_force_splash') === 'true';
    const now = Date.now();
    if (forceSplash || !lastShown || now - parseInt(lastShown, 10) > SPLASH_COOLDOWN) {
        if (forceSplash) sessionStorage.removeItem('testify_force_splash');
        setShowSplash(true);
        const timer = setTimeout(() => {
            setShowSplash(false);
            localStorage.setItem('testify_splash_last_shown', now.toString());
            setContentVisible(true);
        }, 10000);
        return () => clearTimeout(timer);
    } else { setContentVisible(true); }
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

  const publicRoutes = ['/testimonies', '/campaigns', '/about', '/contact', '/resources', '/guide', '/terms-of-service', '/privacy-policy', '/growth', '/fellowships', '/events'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/')) || pathname === '/';

  const isTakeoverPage = useMemo(() => {
    return pathname.startsWith('/chats') || pathname.startsWith('/dashboard/chats') || pathname.startsWith('/notes') || pathname.startsWith('/dashboard/notes') || pathname.startsWith('/bible') || pathname.startsWith('/dashboard/bible') || pathname.startsWith('/notifications') || pathname.startsWith('/dashboard/notifications');
  }, [pathname]);

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

  const unreadChatNotifsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where('type', '==', 'new_chat_message'), where('isRead', '==', false));
  }, [user?.uid, firestore]);
  const { data: unreadChatNotifications } = useCollection<Notification>(unreadChatNotifsQuery);

  const unreadOtherNotifsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where('type', 'in', NOTIFICATION_TYPES), where('isRead', '==', false));
  }, [user?.uid, firestore]);
  const { data: unreadOtherNotifications } = useCollection<Notification>(unreadOtherNotifsQuery);

  if (authLoading || (profileLoading && !userProfile && !isPublicRoute) || (!user && !isPublicRoute)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background animate-in fade-in duration-1000">
        <div className="relative mb-8"><Loader2 className="h-12 w-12 animate-spin text-primary" /><div className="absolute inset-0 flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-primary animate-pulse" /></div></div>
        <p className="text-2xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-6">{loadingMessage || "GOD FIRST"}</p>
        <p className="mt-4 text-[9px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 text-left">Kingdom Network Active</p>
      </div>
    );
  }

  const isProfileIncomplete = user && userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());
  const showBottomNav = !isTakeoverPage;

  return (
    <SearchProvider>
      <div className={cn("flex w-full flex-col overflow-x-hidden", isTakeoverPage ? "h-dvh" : "min-h-dvh")}>
        <AnimatePresence>{showSplash && <SplashScreen onDismiss={handleDismissSplash} />}</AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: contentVisible ? 1 : 0 }} transition={{ duration: 1 }} className="flex-1 flex flex-col min-h-0">
            {!isTakeoverPage && (
                <AppHeader 
                    unreadChatCount={unreadChatNotifications?.length || 0} 
                    unreadNotifCount={unreadOtherNotifications?.length || 0} 
                    isPublicRoute={isPublicRoute} 
                    onOpenCart={() => setIsCartOpen(true)} 
                    onOpenMenu={() => setIsMenuOpen(true)} 
                />
            )}
            <div className="flex-1 relative min-h-0">
            <main ref={scrollContainerRef} className={cn("absolute inset-0", !isTakeoverPage ? "overflow-y-auto" : "overflow-hidden")}>
                <div className={cn("mx-auto h-full", !isTakeoverPage ? "max-w-7xl p-3 md:p-6 pb-28 md:pb-6" : "w-full flex flex-col")}>
                    <PageTransition>{children}</PageTransition>
                </div>
            </main>
            </div>
        </motion.div>

        {user && showBottomNav && <BottomNavBar />}
        
        {user && !isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
        
        {user && mounted && isMobile ? (
          <Sheet open={!!isProfileIncomplete}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
              <div className="p-6 border-b flex-shrink-0 bg-muted/10 pt-[env(safe-area-inset-top)]">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-xl font-bold">Complete Your Profile</SheetTitle>
                  <SheetDescription className="text-xs">Join the global movement by introducing yourself.</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-grow overflow-y-auto p-6">
                {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
              </div>
            </SheetContent>
          </Sheet>
        ) : user ? (
          <Dialog open={!!isProfileIncomplete}>
            <DialogContent hideCloseButton className="sm:max-w-lg rounded-[2rem] overflow-hidden p-0">
              <div className="p-6 border-b bg-muted/10">
                <DialogHeader>
                    <DialogTitle>Complete Your Profile</DialogTitle>
                    <DialogDescription>Please provide your name and photo to join the Kingdom workforce.</DialogDescription>
                </DialogHeader>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetContent side="right" className="w-[300px] p-0 rounded-l-[2rem] border-l-4 border-primary/20 flex flex-col">
                <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarImage src={user?.photoURL ?? undefined} className="object-cover" />
                          <AvatarFallback className="font-black bg-primary/10 text-primary">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-black truncate uppercase tracking-tight leading-tight">{user?.displayName || 'User'}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-medium">{user?.email}</p>
                        </div>
                    </div>
                    <SheetHeader className="text-left flex-shrink-0">
                      <SheetTitle className="text-xl font-black font-headline uppercase tracking-tight">Kingdom Hub</SheetTitle>
                      <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-primary">Mission Navigation</SheetDescription>
                    </SheetHeader>
                </div>
                <ScrollArea className="flex-grow">
                    <div className="p-6 space-y-2 text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2">My Identity</p>
                        <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <User className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Profile</span>
                        </Link>
                        <Link href="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <Settings className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Settings</span>
                        </Link>
                        <Link href="/accountability" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <HeartHandshake className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Partners</span>
                        </Link>
                        
                        <Separator className="my-6 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2">Core Sectors</p>
                        {navItems.filter(item => item.href !== '/dashboard/victory-hub' && item.href !== '/accountability').map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                            <item.icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", item.color)} />
                            <span className="font-black uppercase tracking-widest text-sm">{item.label}</span>
                          </Link>
                        ))}

                        <Separator className="my-6 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2">Recovery & Provision</p>
                        <Link href="/dashboard/victory-hub" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <ShieldCheck className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Victory Hub</span>
                        </Link>
                        <Link href="/dashboard/marketplace" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <Store className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Meals Center</span>
                        </Link>
                        <Link href="/dashboard/marketplace/gifts" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <Gift className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Kindness Center</span>
                        </Link>
                        <Link href="/dashboard/marketplace/orders" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <Package className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Order Tracker</span>
                        </Link>

                        <Separator className="my-6 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2">Study Tools</p>
                        <Link href="/dashboard/bible" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <BookOpen className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Bible Reader</span>
                        </Link>
                        <Link href="/dashboard/notes" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <Edit className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Journal</span>
                        </Link>

                        <Separator className="my-6 opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2">Resources</p>
                        <Link href="/guide" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <BookMarked className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">App Guide</span>
                        </Link>
                        <Link href="/resources" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted group">
                          <BookOpen className="h-6 w-6 text-primary" />
                          <span className="font-black uppercase tracking-widest text-sm">Resources</span>
                        </Link>

                        <Separator className="my-6 opacity-50" />
                        <button onClick={() => { signOut(getAuth()).then(() => router.push("/login")); setIsMenuOpen(false); }} className="flex w-full items-center gap-4 p-4 rounded-2xl hover:bg-destructive/10 group text-destructive">
                          <LogOut className="h-6 w-6" />
                          <span className="font-black uppercase tracking-widest text-sm">Logout</span>
                        </button>
                    </div>
                </ScrollArea>
                <div className="p-8 border-t bg-muted/5 flex-shrink-0">
                    <p className="text-[9px] font-black text-center text-muted-foreground uppercase tracking-[0.2em] opacity-40 text-left">Testify Global • Mobilizing the Body</p>
                </div>
            </SheetContent>
        </Sheet>

        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
                <div className="p-6 sm:p-8 border-b flex-shrink-0 bg-muted/10">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Kingdom Provision</span>
                    </div>
                    <SheetHeader className="text-left flex-shrink-0">
                      <SheetTitle className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight leading-tight">Kindness Package</SheetTitle>
                      <SheetDescription className="text-xs sm:text-sm font-medium mt-1">Review your selections for the harvest.</SheetDescription>
                    </SheetHeader>
                </div>
                <ScrollArea className="flex-grow min-h-0 overscroll-contain text-left">
                    <div className="p-6 sm:p-8 space-y-10 text-left">
                        {cartItems.length > 0 ? (
                            <div className="space-y-10">
                                <div className="space-y-6 text-left">
                                    {cartByVendor.map(group => (
                                        <div key={group.vendorId} className="space-y-3 text-left">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2 max-w-[60%]">
                                                    <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary truncate">{group.vendorName}</h4>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 text-primary border-primary/20 shrink-0">{getCurrencySymbol(group.currency)}{group.deliveryFee.toLocaleString()} Delivery</Badge>
                                            </div>
                                            <div className="space-y-2 text-left">
                                                {group.items.map(c => (
                                                    <div key={c.item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border shadow-inner group gap-3 text-left">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border">{c.item.vendorType === 'gift' ? <Gift className="h-5 w-5 text-primary" /> : <Utensils className="h-5 w-5 text-primary" />}</div>
                                                            <div className="min-w-0 flex-1 text-left">
                                                                <p className="font-black text-sm uppercase tracking-tight truncate leading-tight text-left">{c.item.name}</p>
                                                                <p className="text-[10px] font-bold text-primary uppercase text-left">{getCurrencySymbol(c.item.currency)}{c.item.price.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <div className="flex items-center gap-1 bg-background rounded-full p-0.5 border shadow-sm">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(c.item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                                                <span className="text-[11px] font-black min-w-[1.25rem] text-center">{c.quantity}</span>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(c.item.id, 1)}><Plus className="h-3 w-3" /></Button>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-destructive" onClick={() => removeFromCart(c.item.id)}><Trash2 className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-6 text-left">
                                    <div className="space-y-2 text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recipient Name</Label>
                                        <Input placeholder="Enter recipient" value={manualRecipientName} onChange={(e) => setManualRecipientName(e.target.value)} className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner font-bold" />
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logistical Instructions</Label>
                                        <Textarea placeholder="Delivery details and contact info..." value={giftInstructions} onChange={(e) => setGiftInstructions(e.target.value)} className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner text-base" />
                                    </div>
                                </div>
                                <div className="space-y-4 text-left">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1"><CreditCard className="h-3.5 w-3.5" /> FULFILLMENT GUIDE</Label>
                                    <div className="space-y-3 text-left">
                                        {cartByVendor.map(v => (
                                            <div key={v.vendorId} className="bg-primary/5 p-5 rounded-[1.5rem] border-2 border-dashed border-primary/20 relative group overflow-hidden text-left">
                                                <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover:opacity-0.06 transition-opacity"><Store className="h-10 w-10 text-primary" /></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Pay to: {v.vendorName}</p>
                                                    <Badge variant="outline" className="h-5 px-2 bg-primary text-white border-none font-black text-[10px]">{getCurrencySymbol(v.currency)}{(v.subtotal + v.deliveryFee).toLocaleString()}</Badge>
                                                </div>
                                                <p className="text-sm font-bold text-foreground whitespace-pre-wrap leading-relaxed break-words text-left">{v.paymentDetails || 'Contact provider for details.'}</p>
                                                <Button size="icon" variant="ghost" className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { navigator.clipboard.writeText(v.paymentDetails); toast({ title: 'Copied!' }); }}><Clipboard className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-24 text-center px-8 border-2 border-dashed rounded-[2.5rem] bg-muted/5 flex flex-col items-center">
                                <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10 mb-4" />
                                <h3 className="text-xl font-black uppercase tracking-tight opacity-40">Empty Hub</h3>
                                <p className="mt-2 text-sm text-muted-foreground italic font-medium max-w-xs mx-auto text-balance leading-relaxed">Add items to place an order and bless the Body of Christ.</p>
                                <Button variant="outline" asChild className="mt-10 rounded-2xl h-12 px-10 font-black uppercase tracking-[0.2em] border-primary/20 text-primary hover:bg-primary/5 shadow-lg" onClick={() => setIsCartOpen(false)}>
                                    <Link href="/dashboard/marketplace">GIVE PROVISION</Link>
                                </Button>
                            </div>
                        )}
                        <div className="h-24" />
                    </div>
                </ScrollArea>
                {cartItems.length > 0 && (
                    <SheetFooter className="p-6 sm:p-8 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
                        <Button onClick={handleGiftItems} disabled={isProcessingOrder || !manualRecipientName.trim() || !giftInstructions.trim()} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 tracking-widest uppercase">
                            {isProcessingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            DISPATCH OFFERINGS
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
        
        {user && <PendingProvisionReminder />}
      </div>
    </SearchProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 text-left text-left">Kingdom Network Active</p>
        </div>
    }>
        <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
