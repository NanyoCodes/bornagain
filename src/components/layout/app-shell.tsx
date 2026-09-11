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
  ChevronRight
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, safeToDate } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, query, where, updateDoc, serverTimestamp, limit } from "firebase/firestore";
import type { Notification, UserProfile, Testimony, PrayerRequest, Campaign, Fellowship, Soul } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";

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

const SPLASH_COOLDOWN = 12 * 60 * 60 * 1000;

function CartButton() {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  const updateCount = useCallback(() => {
    if (!user?.uid) return;
    const key = `testify_marketplace_cart_${user.uid}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (stored) {
      try {
        const cart = JSON.parse(stored);
        const total = Object.values(cart).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
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
    if (typeof window !== 'undefined') {
      window.addEventListener('testify_marketplace_cart_update', updateCount);
      window.addEventListener('storage', updateCount);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('testify_marketplace_cart_update', updateCount);
        window.removeEventListener('storage', updateCount);
      }
    };
  }, [updateCount]);

  return (
    <Link href="/marketplace">
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left">
          <ShoppingCart className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
          {count > 0 && (
            <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-left">
              {count}
            </div>
          )}
        </Button>
      </motion.div>
    </Link>
  );
}

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean }) {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Suggestions Collections
  const testimoniesRef = useMemo(() => firestore ? collection(firestore, 'testimonies') : null, [firestore]);
  const prayersRef = useMemo(() => firestore ? collection(firestore, 'prayerRequests') : null, [firestore]);
  const campaignsRef = useMemo(() => firestore ? collection(firestore, 'campaigns') : null, [firestore]);
  const fellowshipsRef = useMemo(() => firestore ? collection(firestore, 'fellowships') : null, [firestore]);
  const soulsRef = useMemo(() => (user && firestore) ? collection(firestore, 'users', user.uid, 'souls') : null, [user, firestore]);

  const testimoniesQuery = useMemo(() => testimoniesRef ? query(testimoniesRef, limit(20)) : null, [testimoniesRef]);
  const prayersQuery = useMemo(() => prayersRef ? query(prayersRef, limit(20)) : null, [prayersRef]);
  const allCampaignsQuery = useMemo(() => campaignsRef ? query(campaignsRef, where('status', '==', 'active'), limit(20)) : null, [campaignsRef]);
  const allFellowshipsQuery = useMemo(() => fellowshipsRef ? query(fellowshipsRef, where('status', '==', 'active'), limit(20)) : null, [fellowshipsRef]);
  const soulsQuery = useMemo(() => soulsRef ? query(soulsRef, limit(20)) : null, [soulsRef]);

  const { data: allTestimonies } = useCollection<Testimony>(testimoniesQuery);
  const { data: allPrayers } = useCollection<PrayerRequest>(prayersQuery);
  const { data: allCampaigns } = useCollection<Campaign>(allCampaignsQuery);
  const { data: allFellowships } = useCollection<Fellowship>(allFellowshipsQuery);
  const { data: allSouls } = useCollection<Soul>( soulsQuery);

  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    
    const results: { id: string, title: string, type: string, link: string, icon: any }[] = [];
    
    allTestimonies?.forEach(t => {
        if (t.content.toLowerCase().includes(term) || t.category.toLowerCase().includes(term)) {
            results.push({ id: t.id, title: t.category, type: 'Testimony', link: `/testimonies#${t.id}`, icon: Newspaper });
        }
    });
    
    allPrayers?.forEach(p => {
        if (p.content.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)) {
            results.push({ id: p.id, title: p.category, type: 'Prayer', link: `/testimonies?tab=prayers#${p.id}`, icon: HeartHandshake });
        }
    });
    
    allCampaigns?.forEach(c => {
        if (c.title.toLowerCase().includes(term) || c.goal.toLowerCase().includes(term)) {
            results.push({ id: c.id, title: c.title, type: 'Campaign', link: `/campaigns/${c.id}`, icon: Target });
        }
    });
    
    allFellowships?.forEach(f => {
        if (f.name.toLowerCase().includes(term)) {
            results.push({ id: f.id, title: f.name, type: 'Group', link: `/fellowship/${f.id}`, icon: Users });
        }
    });
    
    allSouls?.forEach(s => {
        const name = `${s.firstName} ${s.lastName}`;
        if (name.toLowerCase().includes(term)) {
            results.push({ id: s.id, title: name, type: 'Soul', link: `/souls-won?soulId=${s.id}`, icon: Heart });
        }
    });
    
    return results.slice(0, 6);
  }, [searchTerm, allTestimonies, allPrayers, allCampaigns, allFellowships, allSouls]);

  const isProfileIncomplete = !!(userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim()));

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-50 flex h-dvh w-full flex-col bg-background pt-[env(safe-area-inset-top)] animate-in fade-in duration-300 text-left">
        <div className="flex h-16 items-center gap-3 px-4 border-b shrink-0 text-left">
          <Button variant="ghost" size="icon" onClick={() => { setShowMobileSearch(false); setSearchTerm(''); }} className="shrink-0 h-11 w-11 rounded-full hover:bg-muted/50 transition-colors text-left text-left text-left">
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

        <ScrollArea className="flex-1 text-left">
            <div className="p-6 space-y-8 text-left text-left text-left">
                {suggestions.length > 0 ? (
                    <div className="space-y-4 text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 text-left">Kingdom Suggestions</p>
                        <div className="space-y-2 text-left">
                            {suggestions.map(s => (
                                <Button 
                                    key={s.id} 
                                    variant="ghost" 
                                    className="w-full justify-start h-14 rounded-2xl gap-4 hover:bg-primary/5 group border border-transparent hover:border-primary/10 transition-all text-left"
                                    onClick={() => {
                                        router.push(s.link);
                                        setShowMobileSearch(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <div className="h-9 w-9 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors text-left">
                                        <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary text-left" />
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="font-black text-sm uppercase tracking-tight truncate text-left">{s.title}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 text-left">{s.type}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity text-left" />
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : searchTerm.length >= 2 ? (
                    <div className="py-20 text-center flex flex-col items-center text-left text-left">
                        <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-6 text-left text-left">
                            <Search className="h-8 w-8 text-muted-foreground opacity-10 text-left" />
                        </div>
                        <p className="text-base font-black uppercase tracking-tight opacity-40 text-center text-left">No Matches Found</p>
                        <p className="text-xs text-muted-foreground italic mt-2 text-center text-left">Try searching for a different keyword or name.</p>
                    </div>
                ) : (
                    <div className="py-20 text-center flex flex-col items-center text-left text-left">
                        <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mb-6 text-left text-left text-left">
                            <Sparkles className="h-8 w-8 text-primary opacity-20 text-left" />
                        </div>
                        <h3 className="text-xl font-black font-headline uppercase tracking-tight opacity-30 text-center text-left">Kingdom Search</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mt-2 italic leading-relaxed font-medium text-center text-left">Search for souls, campaigns, testimonies or fellowship groups in the harvest network.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </header>
    );
  }

  const showGuestButtons = isPublicRoute && !user;

  return (
    <header className="sticky top-0 z-30 flex h-16 md:h-20 items-center justify-between border-b bg-background/95 backdrop-blur-xl px-4 md:px-8 shrink-0 pt-[env(safe-area-inset-top)] relative gap-4 text-left">
      <div className="flex shrink-0 w-auto text-left">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left text-left">
          {logo && (
            <Avatar className="h-11 w-11 md:h-14 md:w-14 shadow-sm transition-transform hover:scale-105 active:scale-95 border border-transparent text-left text-left">
              <AvatarImage src={logo.imageUrl} alt={logo.description} className="object-cover text-left" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          )}
        </Link>
      </div>

      <nav className="hidden md:flex flex-1 justify-center items-center h-full min-w-0 text-left">
        <div className="flex items-center gap-1 lg:gap-2 h-full max-w-full overflow-x-auto no-scrollbar text-left text-left">
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
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform text-left text-left", !isActive && item.color, isActive && "scale-110")} />
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
        
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 justify-end min-w-0 text-left text-left">
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full transition-transform active:scale-95 text-left text-left" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-6 w-6 text-left" />
            <span className="sr-only text-left">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <CartButton />
            <Link href="/chats">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="text-left text-left">
                    <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left text-left">
                      <MessagesSquare className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-left">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="text-left text-left">
                    <Button variant="ghost" size="icon" className="relative group h-11 w-11 rounded-full text-left">
                      <Bell className="h-6 w-6 transition-transform group-hover:scale-110 text-left" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-in zoom-in border-2 border-background text-left text-left">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-11 w-11 shrink-0 text-left text-left">
                  <Avatar className="h-10 w-10 border shadow-sm text-left text-left text-left">
                    <AvatarImage src={user.photoURL ?? undefined} className="object-cover text-left" />
                    <AvatarFallback className="text-xs font-bold text-left"> {user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0 right-0 flex h-3 w-3 text-left text-left">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 text-left text-left"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-background text-left text-left"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-[1.5rem] shadow-2xl p-2 border-none max-h-[80vh] overflow-y-auto no-scrollbar text-left text-left text-left" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 text-left text-left">
                  <div className="flex flex-col space-y-1 text-left text-left">
                    <p className="text-sm font-black leading-tight truncate uppercase tracking-tight text-left">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-wider text-left">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="text-left" />
                
                <div className="p-1 space-y-1 text-left text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/profile" className="flex items-center gap-3 w-full text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left">
                        <User className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Profile Identity</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/accountability" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                        <HeartHandshake className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Partners</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/settings" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left text-left">
                        <Settings className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left" />
                
                <div className="p-1 space-y-1 text-left text-left">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 px-3 py-1.5 tracking-[0.2em] text-left">Kingdom Hubs</p>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/victory-hub" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Victory Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/fellowships" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <Users className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Fellowship Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/events" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-left">
                        <CalendarDays className="h-3.5 w-3.5 text-primary text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Events Hub</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left">
                    <Link href="/marketplace" className="flex items-center gap-3 w-full text-left text-left">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-left">
                        <Store className="h-3.5 w-3.5 text-blue-600 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Meals Provision</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left text-left">
                    <Link href="/marketplace/gifts" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-left">
                        <Gift className="h-3.5 w-3.5 text-indigo-600 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Kindness Gifts</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left text-left">
                    <Link href="/marketplace/orders" className="flex items-center gap-3 w-full text-left">
                      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                        <Package className="h-3.5 w-3.5 text-left" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-left">Order Tracker</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left" />
                
                <div className="p-1 space-y-1 text-left text-left">
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                      <Link href="/guide" className="flex items-center gap-3 w-full text-left">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                          <Info className="h-3.5 w-3.5 text-left" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left">App Guide</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl h-10 px-3 transition-colors cursor-pointer text-left">
                      <Link href="/resources" className="flex items-center gap-3 w-full text-left">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-left">
                          <BookMarked className="h-3.5 w-3.5 text-left" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-left text-left text-left">Kingdom Library</span>
                      </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="text-left" />
                
                <div className="p-1 text-left text-left text-left text-left">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-xl h-10 px-3 cursor-pointer text-left text-left">
                    <LogOut className="mr-3 h-4 w-4 text-left" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-left">Sign Out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : showGuestButtons ? (
          <div className="flex items-center gap-2 text-left">
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex h-10 px-4 rounded-full font-bold text-left text-left">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 text-left">
              <Link href="/signup">Join Movement</Link>
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
        item.label !== "Partners" && 
        item.label !== "Groups" && 
        item.label !== "Events"
    );
  
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex min-h-[4.5rem] h-auto items-stretch justify-around px-1 py-1">
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
                      "relative z-10 flex flex-col items-center justify-center",
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

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
    localStorage.setItem('testify_splash_last_shown', Date.now().toString());
    setContentVisible(true);
  }, []);

  useEffect(() => { 
    setMounted(true); 
    setLoadingMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);

    // Boot splash logic
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
        <div className="relative mb-8 mx-auto w-fit text-left">
            <Loader2 className="h-12 w-12 animate-spin text-primary text-left" />
            <div className="absolute inset-0 flex items-center justify-center text-left">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse text-left" />
            </div>
        </div>
        <p className="text-2xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-6 mt-8">
          {loadingMessage || "GOD FIRST"}
        </p>
        <p className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60 text-center">
            Kingdom Network Active
        </p>
      </div>
    );
  }

  const isProfileIncomplete = !!(user && userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim()));

  // Bottom Nav is shown on regular pages and on chat module pages
  const showBottomNav = !isTakeoverPage || pathname.includes('/chats');

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
                unreadChatCount={unreadChatCount} 
                unreadNotifCount={unreadNotifCount}
                isPublicRoute={isPublicRoute}
            />
          )}
          <div className="flex-1 relative min-h-0 text-left text-left">
          <main 
              ref={scrollContainerRef}
              className={cn(
                  "absolute inset-0 text-left", 
                  !isTakeoverPage ? "overflow-y-auto" : "overflow-hidden"
              )}
          >
              <div className={cn(
              "mx-auto h-full text-left", 
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
          <DrawerContent className="h-[95dvh] flex flex-col p-0 rounded-t-2xl text-left text-left">
            <div className="p-8 border-b flex-shrink-0 bg-muted/10 pt-[env(safe-area-inset-top)] text-left">
              <DrawerHeader className="text-left text-left text-left">
                <DrawerTitle className="text-xl font-bold text-left">Complete Your Profile</DrawerTitle>
                <DrawerDescription className="text-xs text-left">Join the global movement by introducing yourself.</DrawerDescription>
              </DrawerHeader>
            </div>
            <div className="flex-grow overflow-y-auto p-8 text-left">
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : user ? (
        <Dialog open={!!isProfileIncomplete}>
          <DialogContent hideCloseButton className="sm:max-w-lg rounded-[2rem] overflow-hidden p-0 text-left">
            <div className="p-6 border-b bg-muted/10 text-left">
              <DialogHeader className="text-left text-left">
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
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
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
