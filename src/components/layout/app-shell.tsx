'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useRef } from "react";
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
import { cn } from "@/lib/utils";
import { useUser, useAuth, useFirestore, useCollection, useUserProfile } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { SplashScreen } from "../common/splash-screen";

const navItems = [
  { href: "/progress", label: "Progress", icon: TrendingUp, color: "text-chart-1" },
  { href: "/souls-won", label: "Souls", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "Testimonies", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/fellowships", label: "Groups", icon: Users, color: "text-primary" },
  { href: "/accountability", label: "Partners", icon: HeartHandshake, color: "text-primary" },
];

const NOTIFICATION_TYPES = ['campaign_join', 'new_chat_message', 'accountability_nudge', 'accountability_request', 'request_accepted', 'request_declined', 'accountability_partner_removed', 'new_soul_in_fellowship', 'soul_unassigned_from_fellowship'];

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

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean }) {
  const { user, loading: authLoading } = useUser();
  const { userProfile } = useUserProfile();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const otherNotificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      where('type', 'in', NOTIFICATION_TYPES),
      where('isRead', '==', false)
    );
  }, [user?.uid, firestore]);

  const { data: unreadOtherNotifications } = useCollection<Notification>(otherNotificationsQuery);
  const unreadCount = unreadOtherNotifications?.length ?? 0;

  const isProfileIncomplete = userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
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
              <AvatarFallback className="font-bold">T</AvatarFallback>
            </Avatar>
          )}
          <span className="sr-only">Testify</span>
        </Link>
      </div>

      <nav className="hidden items-center absolute left-1/2 -translate-x-1/2 md:flex overflow-x-auto no-scrollbar max-w-[50%] lg:max-w-none h-full pt-1">
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
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-transform", isActive ? "scale-110" : item.color)} />
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter transition-all leading-none",
                    isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
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
        
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-full transition-transform active:scale-95" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-4 w-4 md:h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <Link href="/chats">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-9 w-9 md:h-10 md:w-10 rounded-full">
                      <MessagesSquare className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
                      {unreadChatCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-in zoom-in border-2 border-background">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-9 w-9 md:h-10 md:w-10 rounded-full">
                      <Bell className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-in zoom-in border-2 border-background">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
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
              <DropdownMenuContent className="w-56 rounded-2xl shadow-xl" align="end">
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-tight truncate">{user.displayName || 'User'}</p>
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
                <DropdownMenuItem asChild className="rounded-lg mx-1">
                    <Link href="/guide" className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 rounded-lg mx-1">
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
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl md:hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex h-16 items-stretch justify-around px-2">
          {navItems.map((item) => {
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
                  className="flex flex-col items-center gap-1"
                  animate={{ 
                    color: isActive ? "inherit" : "var(--muted-foreground)"
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative">
                    <item.icon className={cn(
                        "h-6 w-6 transition-all duration-300", 
                        item.color,
                        !isActive && "opacity-40 grayscale-[0.5]"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter transition-all duration-300 leading-none",
                    isActive ? "opacity-100" : "opacity-40"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
                {isActive && (
                    <motion.div
                      layoutId="bottom-nav-highlight-bar"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
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

    if (forceSplash || !lastShown || now - parseInt(lastShown, 10) > SPLASH_COOLDOWN) {
        if (forceSplash) {
          sessionStorage.removeItem('testify_force_splash');
        }
        setShowSplash(true);
        const timer = setTimeout(() => {
            setShowSplash(false);
            localStorage.setItem('testify_splash_last_shown', now.toString());
            setContentVisible(true);
        }, 10000);
        return () => {
            clearTimeout(timer);
        };
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
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
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

  const publicRoutes = [
    '/testimonies', 
    '/campaigns', 
    '/about', 
    '/contact', 
    '/resources', 
    '/guide', 
    '/terms-of-service', 
    '/privacy-policy',
    '/progress',
    '/fellowships'
  ];
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

  useEffect(() => {
    if (!authLoading && !user && !isPublicRoute) {
      router.push('/login');
    }
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

  if (authLoading || (profileLoading && !isPublicRoute) || (!user && !isPublicRoute)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background animate-in fade-in duration-1000">
        <div className="relative mb-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
        </div>
        <p className="text-2xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-6">
          {loadingMessage || "GOD FIRST"}
        </p>
        <p className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60">
            Kingdom Network Active
        </p>
      </div>
    );
  }

  const isProfileIncomplete = user && userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());
  const showBottomNav = !isTakeoverPage;

  return (
    <SearchProvider>
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
                unreadChatCount={unreadChatNotifications?.length || 0} 
                unreadNotifCount={unreadOtherNotifications?.length || 0}
                isPublicRoute={isPublicRoute}
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
                !isTakeoverPage ? "max-w-7xl p-3 md:p-6 pb-28 md:pb-6" : "w-full flex flex-col" 
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
      </div>
    </SearchProvider>
  );
}
