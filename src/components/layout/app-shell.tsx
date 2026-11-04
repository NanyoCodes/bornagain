'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  LogOut,
  MessagesSquare,
  Newspaper,
  Search,
  Settings,
  User,
  UserPlus,
  Loader2,
  HeartHandshake,
  TrendingUp,
  BookMarked,
  Users,
  ShoppingCart,
  ShieldCheck,
  CalendarDays,
  Store,
  Gift,
  Package,
  Globe,
  Sparkles,
  ChevronRight,
  X,
  Utensils,
  Info,
  ChevronDown,
  Gamepad2,
  Trash2,
  Map,
  Target,
  Heart
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, safeToDate } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, query, where, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import type { Notification, VendorProfile } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";

const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000;

const SYSTEM_NOTIFICATION_TYPES = [
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
  'order_update',
  'birthday_reminder',
  'pending_provision',
  'org_invite'
];

const OTHER_NOTIFICATION_TYPES = SYSTEM_NOTIFICATION_TYPES;

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
  { href: "/growth", label: "Growth", icon: TrendingUp, color: "bg-orange-500" },
  { href: "/souls-won", label: "Souls", icon: UserPlus, color: "bg-amber-500" },
  { href: "/testimonies", label: "TESTIMONIES", icon: Newspaper, color: "bg-primary" },
  { href: "/victory-hub", label: "Victory", icon: ShieldCheck, color: "bg-indigo-600" },
  { href: "/campaigns", label: "Missions", icon: Target, color: "bg-rose-500" },
];

const itemColors: Record<string, string> = {
  "/growth": "from-orange-500 to-orange-600",
  "/souls-won": "from-amber-500 to-amber-600",
  "/testimonies": "from-primary to-orange-600",
  "/victory-hub": "from-indigo-600 to-violet-700",
  "/campaigns": "from-rose-500 to-rose-600",
};

function CartButton() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  const cartQuery = useMemo(() => (user && firestore) ? query(collection(firestore, 'users', user.uid, 'cart')) : null, [user, firestore]);
  const { data: cartItems } = useCollection<any>(cartQuery);

  const count = useMemo(() => {
    return cartItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
  }, [cartItems]);

  const handleDeleteItem = async (itemId: string) => {
    if (!user?.uid || !firestore) return;
    try {
        await deleteDoc(doc(firestore, 'users', user.uid, 'cart', itemId));
    } catch (e) {
        console.error("Cart item deletion failed", e);
    }
  };

  const trigger = (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left">
            <ShoppingCart className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
            {count > 0 && (
                <div className="absolute top-1 right-1 flex h-3.5 w-3.5 sm:h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-center text-left">
                    {count}
                </div>
            )}
        </Button>
    </motion.div>
  );

  const listContent = (
    <div className="p-4 space-y-4 text-left">
        {cartItems && cartItems.length > 0 ? (
            <div className="space-y-3 text-left">
                {cartItems.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/5 group text-left">
                        <Avatar className="h-10 w-10 border shrink-0 text-left">
                            <AvatarImage src={item.photoURL} className="object-cover text-left" />
                            <AvatarFallback className="text-left">P</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="font-bold text-sm truncate uppercase tracking-tight text-left">{item.name}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-left">{item.currency}{item.price.toLocaleString()} x {item.quantity}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10 text-left"
                            onClick={() => handleDeleteItem(item.id)}
                        >
                            <Trash2 className="h-4 w-4 text-left" />
                        </Button>
                    </div>
                ))}
                <div className="pt-4 border-t border-dashed text-left">
                    <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center text-left">
                        <Link href="/marketplace/checkout" onClick={() => setIsOpen(false)} className="text-left">PROCEED TO HUB</Link>
                    </Button>
                </div>
            </div>
        ) : (
            <div className="py-12 text-center flex flex-col items-center text-left">
                <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10 mb-4 text-left" />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center text-left">Your package is empty</p>
                <Button variant="link" asChild className="mt-2 text-primary font-black uppercase text-[10px] tracking-widest h-auto p-0 text-center text-left">
                    <Link href="/marketplace" onClick={() => setIsOpen(false)} className="text-left">Explore Provision Hub</Link>
                </Button>
            </div>
        )}
    </div>
  );

  if (isMobile) {
    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent className="h-[70dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left">
                <div className="p-8 border-b bg-muted/10 shrink-0 flex-shrink-0 text-left">
                    <div className="flex items-center gap-2 mb-1 text-left">
                        <ShoppingCart className="h-5 w-5 text-primary text-left" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kingdom Offering</span>
                    </div>
                    <DrawerHeader className="text-left p-0 text-left">
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Kindness Package</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left">Review selection for gifting.</DrawerDescription>
                    </DrawerHeader>
                </div>
                <ScrollArea className="flex-grow text-left">{listContent}</ScrollArea>
            </DrawerContent>
        </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col max-h-[90dvh] text-left">
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center gap-2 mb-1 text-left">
                <ShoppingCart className="h-3.5 w-3.5 text-primary text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left">Kindness Package</span>
            </div>
            <DialogHeader className="text-left p-0 text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Pending Offering</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-balance text-left">Review the provisions in your active package.</DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="flex-grow text-left">{listContent}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute, isProfileIncomplete }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean, isProfileIncomplete: boolean }) {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const userVendorsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, 'vendors'), where('userId', '==', user.uid));
  }, [user?.uid, firestore]);
  const { data: userVendors } = useCollection<VendorProfile>(userVendorsQuery);

  const showGuestButtons = isPublicRoute && !user;

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-50 flex h-dvh w-full flex-col bg-background pt-[env(safe-area-inset-top)] animate-in fade-in duration-300 text-left">
        <div className="flex h-16 items-center gap-3 px-4 border-b shrink-0 text-left">
          <Button variant="ghost" size="icon" onClick={() => { setShowMobileSearch(false); setSearchTerm(''); }} className="shrink-0 h-11 w-11 rounded-full hover:bg-muted/50 transition-colors text-left">
            <ArrowLeft className="h-6 w-6 text-left" />
          </Button>
          <div className="relative flex-1 text-left">
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
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 md:h-20 items-center justify-between border-b bg-background/95 backdrop-blur-xl px-3 sm:px-4 md:px-8 shrink-0 pt-[env(safe-area-inset-top)] relative gap-2 sm:gap-4 text-left">
      <div className="flex shrink-0 w-auto text-left">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
          {logo && (
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-primary/20 shadow-sm transition-transform hover:scale-105 active:scale-95 text-left relative z-10">
                <AvatarImage src={logo.imageUrl} alt="BornAgain" className="object-cover text-left" />
                <AvatarFallback className="text-left">B</AvatarFallback>
              </Avatar>
            </div>
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
                    "transition-all px-2 lg:px-4 h-11 rounded-2xl whitespace-nowrap flex items-center justify-center gap-2 group relative text-left",
                    isActive 
                      ? "bg-primary text-white shadow-xl shadow-primary/40 ring-2 ring-primary/20 scale-105" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform text-left", isActive && "scale-110")} />
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
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full transition-transform active:scale-95 text-left" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-left" />
            <span className="sr-only text-left">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <CartButton />
            <Link href="/chats">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="relative group h-10 w-10 sm:h-11 sm:w-11 rounded-full text-left">
                      <MessagesSquare className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 sm:h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-center text-left">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="relative group h-10 w-10 sm:h-11 sm:w-11 rounded-full text-left">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 sm:h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-center text-left">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-10 w-10 sm:h-11 sm:w-11 shrink-0 text-left">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border shadow-sm text-left">
                    <AvatarImage src={user.photoURL ?? undefined} className="object-cover text-left" />
                    <AvatarFallback className="text-xs font-bold text-left"> {user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 text-left">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 text-left"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border-2 border-background text-left"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-[1.5rem] shadow-2xl p-2 border-none max-h-[80vh] overflow-y-auto no-scrollbar text-left" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 text-left">
                  <div className="flex flex-col space-y-1 text-left">
                    <p className="text-sm font-black leading-none truncate uppercase tracking-tight text-left">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-left">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/profile" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                        <User className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Profile Identity</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/accountability" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                        <HeartHandshake className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Partners</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/settings" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                        <Settings className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em] text-left">Kingdom Hubs</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/victory-hub" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Victory Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/territories" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <Map className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Regions Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/games" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <Gamepad2 className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Games Arena</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/fellowships" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <Users className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Fellowship Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/events" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <CalendarDays className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Events Hub</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em] text-left">Provision & Support</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/marketplace" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-left">
                        <Utensils className="h-3.5 w-3.5 text-blue-500 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Meals Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/marketplace/gifts" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-left">
                        <Gift className="h-3.5 w-3.5 text-indigo-600 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Kindness Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                    <Link href="/marketplace/orders" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                        <Package className="h-3.5 w-3.5 text-muted-foreground text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Order Hub</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                {userVendors && userVendors.length > 0 && (
                    <div className="p-1 space-y-1 text-left">
                        <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em] text-left">Provider Stations</p>
                        {userVendors.map(v => (
                            <DropdownMenuItem key={v.id} asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                                <Link href={`/marketplace/vendors/${v.id}`} className="flex items-center gap-3 w-full text-left">
                                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                                        <Store className="h-3.5 w-3.5 text-primary text-left" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest truncate text-left">{v.businessName}</span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1 text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                      <Link href="/guide" className="flex items-center gap-3 w-full text-left">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                          <Info className="h-3.5 w-3.5 text-left" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-left">App Guide</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                      <Link href="/resources" className="flex items-center gap-3 w-full text-left">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                          <BookMarked className="h-3.5 w-3.5 text-left" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-left">Kingdom Library</span>
                      </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 text-left">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl h-10 px-3 cursor-pointer text-left">
                    <LogOut className="mr-3 h-4 w-4 text-left" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-left">Sign Out</span>
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
              <Link href="/signup" className="text-left">Experience New Birth</Link>
            </Button>
          </div>
        ) : (
          <div className="h-10 w-10 sm:h-11 sm:w-11 animate-pulse rounded-full bg-muted text-left" />
        )}
      </div>
    </header>
  );
}

function BottomNavBar() {
    const pathname = usePathname();
    const activeColorClass = useMemo(() => {
        const matchingPath = Object.keys(itemColors).find(path => pathname === path || (path !== '/' && pathname.startsWith(path)));
        return itemColors[matchingPath || "/testimonies"];
    }, [pathname]);
  
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/10 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] md:hidden text-left">
        <div className="flex h-16 items-stretch justify-around px-1 py-1 text-left">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="relative flex flex-1 flex-col items-center justify-center min-w-0 text-left"
                aria-label={item.label}
              >
                <motion.div
                  className="relative flex flex-col items-center justify-center rounded-xl px-1 py-1 h-full w-full text-left"
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="relative h-11 w-11 flex items-center justify-center mb-0.5 text-left">
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-circle"
                        className={cn(
                            "absolute inset-0 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.4)] bg-gradient-to-br text-left",
                            activeColorClass
                        )}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn(
                      "h-5 w-5 relative z-10 transition-colors duration-300 text-left",
                      isActive ? "text-white" : "text-zinc-500"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 leading-none text-left",
                    isActive ? "text-white" : "text-zinc-500"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>
    );
}

function ShellInner({ children, unreadChatCount, unreadNotifCount }: { children: React.ReactNode, unreadChatCount: number, unreadNotifCount: number }) {
  const { user, loading: authLoading } = useUser();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showSplash, setShowSplash] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
    localStorage.setItem('testify_splash_last_shown', Date.now().toString());
    setContentVisible(true);
  }, []);

  useEffect(() => { 
    setMounted(true); 
    setLoadingMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);

    const lastShown = typeof window !== 'undefined' ? localStorage.getItem('testify_splash_last_shown') : null;
    const forceSplash = typeof window !== 'undefined' ? sessionStorage.getItem('testify_force_splash') === 'true' : false;
    const now = Date.now();

    if (forceSplash || !lastShown || now - parseInt(lastShown || '0', 10) > SPLASH_COOLDOWN) {
        if (forceSplash) sessionStorage.removeItem('testify_force_splash');
        setShowSplash(true);
        const timer = setTimeout(() => {
            setShowSplash(false);
            localStorage.setItem('testify_splash_last_shown', now.toString());
            setContentVisible(true);
        }, 2500); 
        return () => clearTimeout(timer);
    } else {
        setContentVisible(true);
    }
  }, []);

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

  const publicRoutes = ['/testimonies', '/campaigns', '/about', '/contact', '/resources', '/guide', '/terms-of-service', '/privacy-policy', '/growth', '/fellowships', '/events', '/marketplace', '/marketplace/gifts', '/marketplace/orders', '/victory-hub', '/strongholds', '/territories', '/games'];
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

  useEffect(() => {
    if (!authLoading && !user && !isPublicRoute) router.push('/login');
  }, [authLoading, user, router, isPublicRoute]);

  useEffect(() => {
    if (!profileLoading && userProfile) {
        const isNewUserSession = sessionStorage.getItem('isNewUserSession') === 'true';
        const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');
        const isProfileComplete = !!(userProfile.firstName && userProfile.lastName && userProfile.photoURL);
        if (isNewUserSession && isProfileComplete && !welcomePopupShown) {
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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background animate-in fade-in duration-1000 text-left">
        <div className="relative mb-8 mx-auto w-fit text-left">
            <Loader2 className="h-12 w-12 animate-spin text-primary text-left" />
            <div className="absolute inset-0 flex items-center justify-center text-left">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse text-left" />
            </div>
        </div>
        <p className="text-2xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-6 mt-8 text-left">
          {loadingMessage || "GOD FIRST"}
        </p>
        <p className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 text-center text-left">
            Kingdom Network Active
        </p>
      </div>
    );
  }

  const isProfileIncomplete = !!(user && userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim()));

  const showBottomNav = !isTakeoverPage || pathname.includes('/chats');

  return (
    <div className={cn("flex w-full flex-col overflow-x-hidden text-left", isTakeoverPage ? "h-dvh" : "min-h-dvh")}>
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
                unreadChatCount={unreadChatCount} 
                unreadNotifCount={unreadNotifCount}
                isPublicRoute={isPublicRoute}
                isProfileIncomplete={isProfileIncomplete}
            />
          )}
          <div className="flex-1 relative min-h-0 text-left">
          <main 
              ref={scrollContainerRef}
              className={cn(
                  "absolute inset-0 text-left", 
                  !isTakeoverPage ? "overflow-y-auto" : "overflow-hidden"
              )}
          >
              <div className={cn(
              "mx-auto h-full text-left", 
              (!isTakeoverPage || isMobile) ? "max-w-7xl p-3 md:p-6 pb-24 sm:pb-6 text-left" : "w-full flex flex-col text-left" 
              )}>
                  <PageTransition>{children}</PageTransition>
              </div>
          </main>
          </div>
      </motion.div>

      {user && showBottomNav && <BottomNavBar />}
      
      {user && !isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
      
      {user && mounted && isMobile ? (
        <Sheet open={!!isProfileIncomplete} onOpenChange={() => {}}>
          <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 pt-[env(safe-area-inset-top)] text-left">
              <SheetHeader className="text-left flex-shrink-0 text-left">
                <SheetTitle className="text-xl font-bold text-left">Complete Your Profile</SheetTitle>
                <SheetDescription className="text-xs text-left">Join the global movement by introducing yourself.</SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-8 text-left">
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </div>
          </SheetContent>
        </Sheet>
      ) : user ? (
        <Dialog open={!!isProfileIncomplete}>
          <DialogContent hideCloseButton className="sm:max-w-lg rounded-[2rem] overflow-hidden p-0 text-left">
            <div className="p-6 border-b bg-muted/10 text-left">
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-bold text-left">Complete Your Profile</DialogTitle>
                <DialogDescription className="text-sm text-left">Please provide your name and photo to join the Kingdom workforce.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto text-left">
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const unreadChatNotificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where('type', '==', 'new_chat_message'), where('isRead', '==', false));
  }, [user?.uid, firestore]);
  const { data: unreadChatNotifications } = useCollection<Notification>(unreadChatNotificationsQuery);

  const unreadOtherNotificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where('type', 'in', SYSTEM_NOTIFICATION_TYPES), where('isRead', '==', false));
  }, [user?.uid, firestore]);
  const { data: unreadOtherNotifications } = useCollection<Notification>(unreadOtherNotificationsQuery);

  const unreadChatCount = unreadChatNotifications?.length ?? 0;
  const unreadNotifCount = unreadOtherNotifications?.length ?? 0;

  return (
    <SearchProvider>
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center text-left">
                <div className="relative mx-auto w-fit text-left">
                    <Loader2 className="h-10 w-10 animate-spin text-primary text-left" />
                </div>
            </div>
        }>
            <ShellInner 
              unreadChatCount={unreadChatCount} 
              unreadNotifCount={unreadNotifCount}
            >
              {children}
            </ShellInner>
        </Suspense>
    </SearchProvider>
  );
}
