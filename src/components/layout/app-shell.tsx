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
  { href: "/souls-won", label: "Souls Won", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "Testimonies", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/fellowships", label: "Fellowship", icon: Users, color: "text-primary" },
  { href: "/accountability", label: "Accountability", icon: HeartHandshake, color: "text-primary" },
];

const NOTIFICATION_TYPES = ['campaign_join', 'new_chat_message', 'accountability_nudge', 'accountability_request', 'request_accepted', 'request_declined', 'accountability_partner_removed', 'new_soul_in_fellowship'];

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

  const isProfileIncomplete = userProfile && (!userProfile.firstName?.trim() || !userProfile.lastName?.trim() || !userProfile.photoURL?.trim());

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-30 flex min-h-[3.5rem] md:min-h-[4rem] h-auto py-1 items-center border-b bg-background px-3 md:px-6 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex w-full items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <form className="w-full" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full pl-8 h-9"
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
    <header className="sticky top-0 z-30 flex min-h-[3.5rem] md:min-h-[4rem] h-auto py-1 items-center justify-between border-b bg-background px-3 md:px-6 shrink-0 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 text-lg font-semibold shrink-0">
          {logo && (
            <Avatar className="h-9 w-9 md:h-10 md:w-10">
              <AvatarImage src={logo.imageUrl} alt={logo.description} />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          )}
          <span className="sr-only">Testify</span>
        </Link>
        <nav className="hidden items-center gap-4 lg:gap-5 text-sm font-medium md:flex overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    "transition-all hover:text-primary whitespace-nowrap flex items-center gap-1.5 group py-1",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5">
                      <item.icon className={cn("h-4 w-4 transition-transform", !isActive && item.color, isActive && "scale-110")} />
                      <span className="hidden lg:inline">{item.label}</span>
                    </motion.div>
                </Link>
              );
            })}
        </nav>
      </div>
        
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
        {isSearchVisible && (
          <div className="hidden md:block">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="pl-8 sm:w-[120px] md:w-[180px] lg:w-[220px] h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
          </div>
        )}
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <Link href="/chats">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-8 w-8">
                      <MessagesSquare className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {unreadChatCount > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-in zoom-in">
                          {unreadChatCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <Link href="/notifications">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="relative group h-8 w-8">
                      <Bell className="h-4 w-4 transition-transform group-hover:scale-110" />
                      {unreadNotifCount > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-in zoom-in">
                          {unreadNotifCount}
                        </div>
                      )}
                    </Button>
                </motion.div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative hover:scale-105 transition-transform h-8 w-8">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.photoURL ?? undefined} />
                    <AvatarFallback className="text-[9px]">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0 right-0 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 border border-background"></span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.displayName || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/guide" className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>App Guide</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/resources" className="cursor-pointer">
                    <BookMarked className="mr-2 h-4 w-4" />
                    <span>Spiritual Resources</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : showGuestButtons ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" asChild size="sm" className="hidden sm:inline-flex h-8 px-3">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="h-8 px-3">
              <Link href="/">Get Started</Link>
            </Button>
          </div>
        ) : (
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        )}
      </div>
    </header>
  );
}

function BottomNavBar() {
    const pathname = usePathname();
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[calc(env(safe-area-inset-bottom)+0.25rem)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex min-h-[3.5rem] h-auto items-stretch justify-around px-1 py-1">
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
                  className="relative flex items-center justify-center p-1.5 rounded-xl"
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
                      "relative z-10",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", !isActive && item.color)} />
                  </motion.div>
                </motion.div>
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

    // Interactivity Safety Valve
    const interval = setInterval(() => {
        if (typeof document !== 'undefined') {
            const hasModals = !!document.querySelector('[role="dialog"], [role="menu"], [data-radix-portal]');
            if (!hasModals) {
                if (document.body.style.pointerEvents === 'none') {
                    document.body.style.pointerEvents = 'auto';
                }
                if (document.body.style.overflow === 'hidden' && !pathname.includes('/chats')) {
                    document.body.style.overflow = 'auto';
                }
            }
        }
    }, 1000);

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
            clearInterval(interval);
        };
    } else {
        setContentVisible(true);
    }
    return () => clearInterval(interval);
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
                "mx-auto min-h-full", 
                !isTakeoverPage ? "max-w-7xl p-3 md:p-6 pb-28 md:pb-6" : "w-full"
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
            <DialogContent hideCloseButton className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Complete Your Profile</DialogTitle>
                  <DialogDescription>Please provide your name and photo to join the Kingdom workforce.</DialogDescription>
              </DialogHeader>
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </SearchProvider>
  );
}
