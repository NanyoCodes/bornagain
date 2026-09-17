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
  Info,
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
  Utensils
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, query, where, serverTimestamp } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000;

const navItems = [
  { href: "/growth", label: "GROWTH", icon: TrendingUp, color: "text-chart-1" },
  { href: "/souls-won", label: "Souls", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "TESTIMONIES", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/fellowships", label: "Groups", icon: Users, color: "text-primary" },
  { href: "/events", label: "Events", icon: CalendarDays, color: "text-primary" },
  { href: "/victory-hub", label: "VICTORY", icon: ShieldCheck, color: "text-primary" },
  { href: "/accountability", label: "Partners", icon: HeartHandshake, color: "text-primary" },
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
  'pending_provision'
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

  const trigger = (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full">
            <ShoppingCart className="h-6 w-6 transition-transform group-hover:scale-110" />
            {count > 0 && (
                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white animate-in zoom-in border-2 border-background">
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
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/5">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={item.photoURL} />
                            <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate uppercase tracking-tight">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.currency}{item.price.toLocaleString()} x {item.quantity}</p>
                        </div>
                    </div>
                ))}
                <div className="pt-4 border-t border-dashed">
                    <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        <Link href="/marketplace">PROCEED TO HUB</Link>
                    </Button>
                </div>
            </div>
        ) : (
            <div className="py-12 text-center flex flex-col items-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-10 mb-4" />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center">Your package is empty</p>
                <Button variant="link" asChild className="mt-2 text-primary font-black uppercase text-[10px] tracking-widest h-auto p-0 text-center">
                    <Link href="/marketplace">Explore Provision Hub</Link>
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
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kingdom Offering</span>
                    </div>
                    <DrawerHeader className="text-left flex-shrink-0">
                        <DrawerTitle className="text-2xl font-black font-headline uppercase tracking-tight">Kindness Package</DrawerTitle>
                        <DrawerDescription className="text-sm font-medium mt-1">Review items selected for gifting.</DrawerDescription>
                    </DrawerHeader>
                </div>
                <ScrollArea className="flex-grow">{listContent}</ScrollArea>
            </DrawerContent>
        </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col max-h-[90dvh] text-left">
        <div className="p-8 border-b bg-muted/10 shrink-0 text-left">
            <div className="flex items-center gap-2 mb-1 text-left">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Kindness Package</span>
            </div>
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black font-headline uppercase tracking-tight text-left">Pending Offering</DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-left">Review the provisions in your active package.</DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="flex-grow">{listContent}</ScrollArea>
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
      <header className="sticky top-0 z-50 flex h-dvh w-full flex-col bg-background pt-[env(safe-area-inset-top)] animate-in fade-in duration-300">
        <div className="flex h-16 items-center gap-3 px-4 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={() => { setShowMobileSearch(false); setSearchTerm(''); }} className="shrink-0 h-11 w-11 rounded-full hover:bg-muted/50 transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full pl-10 h-11 rounded-2xl bg-muted/20 border-none shadow-inner text-base"
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
    <header className="sticky top-0 z-30 flex h-16 md:h-20 items-center justify-between border-b bg-background/95 backdrop-blur-xl px-4 md:px-8 shrink-0 pt-[env(safe-area-inset-top)] relative gap-4">
      <div className="flex shrink-0 w-auto text-left text-left">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {logo && (
            <Avatar className="h-11 w-11 md:h-14 md:w-14 shadow-sm transition-transform hover:scale-105 active:scale-95 border border-transparent">
              <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          )}
        </Link>
      </div>

      <nav className="hidden md:flex flex-1 justify-center items-center h-full min-w-0">
        <div className="flex items-center gap-1 lg:gap-2 h-full max-w-full overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-all px-2 lg:px-4 h-11 rounded-2xl whitespace-nowrap flex items-center justify-center gap-2 group relative",
                    isActive 
                      ? "bg-primary text-white shadow-xl shadow-primary/40 ring-2 ring-primary/20 scale-105" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform", !isActive && item.color, isActive && "scale-110")} />
                <span className={cn(
                    "text-[10px] lg:text-[11px] font-black uppercase tracking-tight transition-all leading-none",
                    isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                )}>
                {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
        
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 justify-end min-w-0">
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full transition-transform active:scale-95" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-6 w-6" />
            <span className="sr-only">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <CartButton />
            <Link href="/chats">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full">
                      <MessagesSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full">
                      <Bell className="h-6 w-6 transition-transform group-hover:scale-110" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-11 w-11 shrink-0">
                  <Avatar className="h-10 w-10 border shadow-sm">
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
              <DropdownMenuContent className="w-64 rounded-[1.5rem] shadow-2xl p-2 border-none max-h-[80vh] overflow-y-auto no-scrollbar" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black leading-tight truncate uppercase tracking-tight">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/profile" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Profile Identity</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/accountability" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                        <HeartHandshake className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Partners</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/settings" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                        <Settings className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em]">Kingdom Hubs</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/victory-hub" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Victory Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/fellowships" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Fellowship Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/events" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Events Hub</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em]">Provision & Support</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/marketplace" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Utensils className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Meals Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/marketplace/gifts" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Gift className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Kindness Center</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                    <Link href="/marketplace/orders" className="flex items-center gap-3 w-full">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Order Hub</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 space-y-1">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                      <Link href="/guide" className="flex items-center gap-3 w-full">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                          <Info className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest">App Guide</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer">
                      <Link href="/resources" className="flex items-center gap-3 w-full">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                          <BookMarked className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest">Kingdom Library</span>
                      </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />
                
                <div className="p-1 text-left">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl h-10 px-3 cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : showGuestButtons ? (
          <div className="flex items-center gap-2 text-left">
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex h-10 px-4 rounded-full font-bold">
              <Link href="/login" className="text-left">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 text-left">
              <Link href="/signup" className="text-left">Join Movement</Link>
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
    const bottomNavItems = navItems.filter(item => 
        item.label === "GROWTH" || 
        item.label === "Souls" || 
        item.label === "TESTIMONIES" || 
        item.label === "Campaigns" ||
        item.label === "VICTORY"
    );
  
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex min-h-[4.5rem] h-auto items-center justify-around px-1 py-1">
          {bottomNavItems.map((item) => {
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
                  className="relative flex flex-col items-center justify-center rounded-xl px-1 py-1 min-h-[56px] w-full"
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
                      "relative z-10",
                      isActive ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className={cn("h-6 w-6 mb-1", !isActive && item.color)} />
                    <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter transition-all leading-none text-center",
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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background animate-in fade-in duration-1000">
        <div className="relative mb-8 mx-auto w-fit">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            </div>
        </div>
        <p className="text-2xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-6 mt-8">
          {loadingMessage || "GOD FIRST"}
        </p>
        <p className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 text-center text-center">
            Kingdom Network Active
        </p>
      </div>
    );
  }

  const isProfileIncomplete = !!(user && userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim()));

  return (
    <div className={cn("flex w-full flex-col overflow-x-hidden", isTakeoverPage ? "h-dvh" : "min-h-dvh")}>
      <AnimatePresence>
          {showSplash && <SplashScreen onDismiss={handleDismissSplash} />}
      </AnimatePresence>

      <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: contentVisible ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="flex-1 flex flex-col min-h-0"
      >
          {!isTakeoverPage && (
            <AppHeader 
                unreadChatCount={unreadChatCount} 
                unreadNotifCount={unreadNotifCount}
                isPublicRoute={isPublicRoute}
                isProfileIncomplete={isProfileIncomplete}
            />
          )}
          <div className="flex-1 relative min-h-0">
          <main 
              ref={scrollContainerRef}
              className={cn(
                  "absolute inset-0", 
                  !isTakeoverPage ? "overflow-y-auto" : "overflow-hidden"
              )}
          >
              <div className={cn(
              "mx-auto h-full", 
              (!isTakeoverPage || isMobile) ? "max-w-7xl p-3 md:p-6 pb-24 sm:pb-6" : "w-full flex flex-col" 
              )}>
                  <PageTransition>{children}</PageTransition>
              </div>
          </main>
          </div>
      </motion.div>

      {user && !isTakeoverPage && <BottomNavBar />}
      
      {user && !isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
      
      {user && mounted && isMobile ? (
        <Drawer open={!!isProfileIncomplete} onOpenChange={() => {}}>
          <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-2xl text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 pt-[env(safe-area-inset-top)] text-left text-left text-left">
              <DrawerHeader className="text-left text-left text-left">
                <DrawerTitle className="text-xl font-bold text-left text-left">Complete Your Profile</DrawerTitle>
                <DrawerDescription className="text-xs text-left text-left">Join the global movement by introducing yourself.</DrawerDescription>
              </DrawerHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-8 text-left text-left">
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : user ? (
        <Dialog open={!!isProfileIncomplete}>
          <DialogContent hideCloseButton className="sm:max-w-lg rounded-[2rem] overflow-hidden p-0 text-left text-left">
            <div className="p-6 border-b bg-muted/10 text-left text-left text-left">
              <DialogHeader className="text-left text-left text-left">
                <DialogTitle className="text-2xl font-bold text-left text-left text-left">Complete Your Profile</DialogTitle>
                <DialogDescription className="text-sm text-left text-left text-left">Please provide your name and photo to join the Kingdom workforce.</DialogDescription>
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
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
                <div className="relative mx-auto w-fit">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
