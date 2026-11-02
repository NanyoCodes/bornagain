
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
  ShoppingCart,
  ShieldCheck,
  CalendarDays,
  Store,
  Gift,
  Package,
  Globe,
  Sparkles,
  ChevronRight,
  Heart,
  X,
  Utensils,
  Info,
  ChevronDown,
  Gamepad2,
  Trash2,
  Map
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useUser, useAuth, useDoc, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, query, where, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";

const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000;

const navItems = [
  { href: "/growth", label: "Growth", icon: TrendingUp, color: "bg-orange-500" },
  { href: "/souls-won", label: "Souls", icon: UserPlus, color: "bg-amber-500" },
  { href: "/territories", label: "Regions", icon: Map, color: "bg-indigo-500" },
  { href: "/testimonies", label: "TESTIMONIES", icon: Newspaper, color: "bg-primary" },
  { href: "/campaigns", label: "Missions", icon: Target, color: "bg-rose-500" },
];

const itemColors: Record<string, string> = {
  "/growth": "from-orange-500 to-orange-600",
  "/souls-won": "from-amber-500 to-amber-600",
  "/territories": "from-indigo-500 to-indigo-700",
  "/testimonies": "from-primary to-orange-600",
  "/campaigns": "from-rose-500 to-rose-600",
  "/victory-hub": "from-indigo-600 to-violet-700",
};

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

const SYSTEM_NOTIFICATION_TYPES = [
  'campaign_join', 
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
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left">
            <ShoppingCart className="h-6 w-6 transition-transform group-hover:scale-110" />
            {count > 0 && (
                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-center">
                    {count}
                </div>
            )}
        </Button>
    </motion.div>
  );

  const listContent = (
    <div className="p-4 space-y-4 text-left">
        {cartItems && cartItems.length > 0 ? (
            <div className="space-y-3">
                {cartItems.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/5 text-left group">
                        <Avatar className="h-10 w-10 border shrink-0">
                            <AvatarImage src={item.photoURL} className="object-cover text-left" />
                            <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                            <p className="font-bold text-sm truncate uppercase tracking-tight">{item.name}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest">{item.currency}{item.price.toLocaleString()} x {item.quantity}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10"
                            onClick={() => handleDeleteItem(item.id)}
                        >
                            <Trash2 className="h-4 w-4 text-left" />
                        </Button>
                    </div>
                ))}
                <div className="pt-4 border-t border-dashed text-left">
                    <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-center">
                        <Link href="/marketplace/checkout" onClick={() => setIsOpen(false)}>PROCEED TO HUB</Link>
                    </Button>
                </div>
            </div>
        ) : (
            <div className="py-12 text-center flex flex-col items-center text-left">
                <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10 mb-4 text-left" />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center">Your package is empty</p>
                <Button variant="link" asChild className="mt-2 text-primary font-black uppercase text-[10px] tracking-widest h-auto p-0 text-center">
                    <Link href="/marketplace" onClick={() => setIsOpen(false)}>Explore Provision Hub</Link>
                </Button>
            </div>
        )}
    </div>
  );

  if (isMobile) {
    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
            <DrawerContent className="h-[70dvh] flex flex-col p-0 rounded-t-[2.5rem] text-left text-left text-left text-left">
                <div className="p-8 border-b bg-muted/10 shrink-0 flex-shrink-0 text-left text-left">
                    <div className="flex items-center gap-2 mb-1 text-left text-left text-left">
                        <ShoppingCart className="h-5 w-5 text-primary text-left text-left text-left" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left">Kingdom Offering</span>
                    </div>
                    <DrawerHeader className="text-left flex-shrink-0 p-0 text-left text-left">
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Kindness Package</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1 text-left text-left text-left">Review selection for gifting.</DrawerDescription>
                    </DrawerHeader>
                </div>
                <ScrollArea className="flex-grow text-left text-left text-left">{listContent}</ScrollArea>
            </DrawerContent>
        </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col max-h-[90dvh] text-left text-left text-left text-left">
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left text-left text-left">
            <div className="flex items-center gap-2 mb-1 text-left text-left text-left">
                <ShoppingCart className="h-3.5 w-3.5 text-primary text-left text-left text-left" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em] text-left text-left text-left">Kindness Package</span>
            </div>
            <DialogHeader className="text-left p-0 text-left text-left text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left text-left text-left">Pending Offering</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left text-balance text-left text-left">Review the provisions in your active package.</DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="flex-grow text-left text-left text-left">{listContent}</ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute, isProfileIncomplete }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean, isProfileIncomplete: boolean }) {
  const { user } = useUser();
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const showGuestButtons = isPublicRoute && !user;

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-50 flex h-dvh w-full flex-col bg-background pt-[env(safe-area-inset-top)] animate-in fade-in duration-300 text-left text-left text-left text-left">
        <div className="flex h-16 items-center gap-3 px-4 border-b shrink-0 text-left text-left text-left">
          <Button variant="ghost" size="icon" onClick={() => { setShowMobileSearch(false); setSearchTerm(''); }} className="shrink-0 h-11 w-11 rounded-full hover:bg-muted/50 transition-colors text-left text-left">
            <ArrowLeft className="h-6 w-6 text-left" />
          </Button>
          <div className="relative flex-1 text-left text-left">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50 text-left" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full pl-10 h-11 rounded-2xl bg-muted/20 border-none shadow-inner text-base text-left text-left"
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
    <header className="sticky top-0 z-30 flex h-16 md:h-20 items-center justify-between border-b bg-background/95 backdrop-blur-xl px-3 sm:px-4 md:px-8 shrink-0 pt-[env(safe-area-inset-top)] relative gap-2 sm:gap-4 text-left text-left text-left text-left text-left">
      <div className="flex shrink-0 w-auto text-left text-left text-left text-left">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left text-left">
          {logo && (
            <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-primary/20 shadow-sm transition-transform hover:scale-105 active:scale-95 text-left text-left">
              <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover text-left text-left" />
              <AvatarFallback className="text-left">T</AvatarFallback>
            </Avatar>
          )}
        </Link>
      </div>

      <nav className="hidden md:flex flex-1 justify-center items-center h-full min-w-0 text-left text-left text-left text-left">
        <div className="flex items-center gap-1 lg:gap-2 h-full max-w-full overflow-x-auto no-scrollbar text-left text-left text-left text-left">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-all px-2 lg:px-4 h-11 rounded-2xl whitespace-nowrap flex items-center justify-center gap-2 group relative text-left text-left",
                    isActive 
                      ? "bg-primary text-white shadow-xl shadow-primary/40 ring-2 ring-primary/20 scale-105" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform text-left", isActive && "scale-110")} />
                <span className={cn(
                    "text-[10px] lg:text-[11px] font-black uppercase tracking-tight transition-all leading-none text-left text-left",
                    isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                )}>
                {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
        
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 justify-end min-w-0 text-left text-left text-left text-left">
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full transition-transform active:scale-95 text-left text-left text-left" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-left text-left" />
            <span className="sr-only text-left">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <CartButton />
            <Link href="/chats" className="text-left text-left text-left text-left">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-left text-left text-left text-left text-left">
                    <Button variant="ghost" size="icon" className="relative group h-10 w-10 sm:h-11 sm:w-11 rounded-full text-left text-left text-left text-left text-left">
                      <MessagesSquare className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-center text-left text-left">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications" className="text-left text-left text-left text-left">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-left text-left text-left text-left">
                    <Button variant="ghost" size="icon" className="relative group h-10 w-10 sm:h-11 sm:w-11 rounded-full text-left text-left text-left text-left text-left">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-center text-left text-left">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-10 w-10 sm:h-11 sm:w-11 shrink-0 text-left text-left text-left text-left">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border shadow-sm text-left text-left">
                    <AvatarImage src={user.photoURL ?? undefined} className="object-cover text-left text-left" />
                    <AvatarFallback className="text-xs font-bold text-left"> {user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 text-left text-left text-left text-left">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 text-left text-left text-left text-left"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border-2 border-background text-left text-left text-left text-left"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-[1.5rem] shadow-2xl p-2 border-none max-h-[80vh] overflow-y-auto no-scrollbar text-left text-left text-left text-left text-left" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 text-left text-left text-left">
                  <div className="flex flex-col space-y-1 text-left text-left text-left text-left">
                    <p className="text-sm font-black leading-none truncate uppercase tracking-tight text-left text-left text-left text-left text-left">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-left text-left text-left text-left">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="text-left text-left text-left" />
                
                <div className="p-1 space-y-1 text-left text-left text-left text-left text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left">
                    <Link href="/profile" className="flex items-center gap-3 w-full text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left text-left">
                        <User className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left">Profile Identity</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left">
                    <Link href="/accountability" className="flex items-center gap-3 w-full text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left text-left">
                        <HeartHandshake className="h-3.5 w-3.5 text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left">Partners</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left">
                    <Link href="/settings" className="flex items-center gap-3 w-full text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left text-left">
                        <Settings className="h-3.5 w-3.5 text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left text-left text-left" />
                
                <div className="p-1 space-y-1 text-left text-left text-left text-left text-left">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em] text-left text-left text-left text-left">Kingdom Hubs</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                    <Link href="/territories" className="flex items-center gap-3 w-full text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-left text-left text-left">
                        <Map className="h-3.5 w-3.5 text-indigo-500 text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left">Territories Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                    <Link href="/victory-hub" className="flex items-center gap-3 w-full text-left text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left text-left text-left text-left">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary text-left text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left">Victory Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                    <Link href="/games" className="flex items-center gap-3 w-full text-left text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-left text-left text-left text-left">
                        <Gamepad2 className="h-3.5 w-3.5 text-violet-500 text-left text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left">Games Arena</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left text-left">
                    <Link href="/fellowships" className="flex items-center gap-3 w-full text-left text-left text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left text-left text-left text-left text-left">
                        <Users className="h-3.5 w-3.5 text-primary text-left text-left text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left text-left">Fellowship Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                    <Link href="/events" className="flex items-center gap-3 w-full text-left text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left text-left text-left text-left">
                        <CalendarDays className="h-3.5 w-3.5 text-primary text-left text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left">Events Hub</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left text-left text-left" />
                
                <div className="p-1 space-y-1 text-left text-left text-left text-left text-left">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em] text-left text-left text-left text-left text-left">Provision & Support</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                    <Link href="/marketplace" className="flex items-center gap-3 w-full text-left text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-left text-left text-left text-left">
                        <Utensils className="h-3.5 w-3.5 text-blue-500 text-left text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left">Meals Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left">
                    <Link href="/marketplace/gifts" className="flex items-center gap-3 w-full text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-left text-left text-left">
                        <Gift className="h-3.5 w-3.5 text-indigo-600 text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left">Kindness Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                    <Link href="/marketplace/orders" className="flex items-center gap-3 w-full text-left text-left text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left text-left text-left">
                        <Package className="h-3.5 w-3.5 text-muted-foreground text-left text-left text-left text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left">Order Hub</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left text-left text-left" />
                
                <div className="p-1 space-y-1 text-left text-left text-left text-left text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                      <Link href="/guide" className="flex items-center gap-3 w-full text-left text-left text-left">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left text-left">
                          <Info className="h-3.5 w-3.5 text-left text-left text-left" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left">App Guide</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left text-left">
                      <Link href="/resources" className="flex items-center gap-3 w-full text-left text-left text-left text-left">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left text-left text-left text-left">
                          <BookMarked className="h-3.5 w-3.5 text-left text-left text-left text-left" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left text-left text-left">Kingdom Library</span>
                      </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left text-left text-left" />
                
                <div className="p-1 text-left text-left text-left text-left">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl h-10 px-3 cursor-pointer text-left text-left text-left">
                    <LogOut className="mr-3 h-4 w-4 text-left text-left text-left" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-left text-left text-left">Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : showGuestButtons ? (
          <div className="flex items-center gap-2 text-left text-left text-left text-left">
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex h-10 px-4 rounded-full font-bold text-left text-left text-left text-left">
              <Link href="/login" className="text-left text-left text-left">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 text-left text-left text-left">
              <Link href="/signup" className="text-left text-left text-left">Join Movement</Link>
            </Button>
          </div>
        ) : (
          <div className="h-11 w-11 md:h-12 md:w-12 animate-pulse rounded-full bg-muted text-left text-left text-left" />
        )}
      </div>
    </header>
  );
}
