'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
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
  LayoutGrid,
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
import { collection, query, where } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { href: "/progress", label: "Progress", icon: TrendingUp, color: "text-chart-1" },
  { href: "/souls-won", label: "Souls Won", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "Testimonies", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/fellowships", label: "Fellowship", icon: Users, color: "text-primary" },
  { href: "/accountability", label: "Accountability", icon: HeartHandshake, color: "text-primary" },
];

const NOTIFICATION_TYPES = ['campaign_join', 'new_chat_message', 'accountability_nudge', 'accountability_request', 'request_accepted', 'request_declined', 'accountability_partner_removed', 'new_soul_in_fellowship'];

function AppHeader({ unreadChatCount, unreadNotifCount, isPublicRoute }: { unreadChatCount: number, unreadNotifCount: number, isPublicRoute: boolean }) {
  const { user, loading: authLoading } = useUser();
  const { userProfile } = useUserProfile();
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isProfileIncomplete = userProfile && (!userProfile.firstName || !userProfile.lastName || !userProfile.photoURL);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (showMobileSearch) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background px-4 md:px-6">
        <div className="flex w-full items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <form className="w-full" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="w-full pl-8 h-11"
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

  // Determine if we should show the "Guest" buttons.
  // We only show them if we are on a public route AND auth check is finished AND there's no user.
  const showGuestButtons = isPublicRoute && !authLoading && !user;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-6">
        <Link href={user ? "/testimonies" : "/"} className="flex items-center gap-2 text-lg font-semibold">
          {logo && (
            <Avatar className="h-11 w-11">
              <AvatarImage src={logo.imageUrl} alt={logo.description} />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          )}
          <span className="sr-only">Testify</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    "transition-colors hover:text-primary whitespace-nowrap flex items-center gap-2",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                >
                    <item.icon className={cn("h-4 w-4", !isActive && item.color)} />
                    {item.label}
                </Link>
              );
            })}
        </nav>
      </div>
        
      <div className="flex items-center gap-2 md:gap-3">
        {isSearchVisible && (
          <div className="hidden sm:block">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="pl-8 sm:w-auto md:w-[250px] lg:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
          </div>
        )}
        {isSearchVisible && (
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setShowMobileSearch(true)}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
        )}
        
        {user ? (
          <>
            <Link href="/chats">
                <Button variant="ghost" size="icon" className="relative">
                  <MessagesSquare className="h-5 w-5" />
                  {unreadChatCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                      {unreadChatCount}
                    </div>
                  )}
                </Button>
            </Link>
            <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotifCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                      {unreadNotifCount}
                    </div>
                  )}
                </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL ?? undefined} />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {isProfileIncomplete && (
                    <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-background"></span>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
                aria-label={item.label}
              >
                <item.icon className={cn("h-6 w-6", !isActive && item.color)} />
                <span className="sr-only">{item.label}</span>
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

  useEffect(() => { setMounted(true); }, []);

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

  // Identify pages that take over the screen (like chat, bible, or notes editor)
  const isTakeoverPage = pathname.startsWith('/dashboard/chats/') || pathname.startsWith('/dashboard/notes') || pathname.startsWith('/dashboard/bible');

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
    // Only redirect if it's NOT a public route and user is definitely logged out
    if (!authLoading && !user && !isPublicRoute) {
      router.push('/login');
    }
  }, [authLoading, user, router, isPublicRoute]);

  useEffect(() => {
    if (!profileLoading && userProfile) {
        const isNewUserSession = sessionStorage.getItem('isNewUserSession') === 'true';
        const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');
        if (isNewUserSession && userProfile.firstName && !welcomePopupShown) {
            setShowWelcomePopup(true);
            sessionStorage.setItem('welcomePopupShown', 'true');
        }
    }
  }, [profileLoading, userProfile]);

  // STRIKE: Prevent flickering by returning a full-screen loader until auth is resolved.
  if (authLoading || (profileLoading && !isPublicRoute) || (!user && !isPublicRoute)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isProfileIncomplete = user && userProfile && (!userProfile.firstName || !userProfile.lastName);

  return (
    <SearchProvider>
      <div className={cn("flex w-full flex-col overflow-x-hidden", isTakeoverPage ? "h-full" : "min-h-screen")}>
        {!isTakeoverPage && (
          <AppHeader 
            unreadChatCount={unreadChatNotifications?.length || 0} 
            unreadNotifCount={unreadOtherNotifications?.length || 0}
            isPublicRoute={isPublicRoute}
          />
        )}
        <main className={cn(
          "flex-1 w-full mx-auto relative",
          isTakeoverPage ? "h-full overflow-hidden" : "pb-32 md:pb-8 p-4 md:p-8 max-w-7xl"
        )}>
            <div className={cn("h-full w-full", isTakeoverPage && "pb-16 md:pb-0")}>
                <PageTransition>{children}</PageTransition>
            </div>
        </main>
        {user && BottomNavBar && <BottomNavBar />}
        
        {user && !isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
        
        {user && mounted && isMobile ? (
          <Sheet open={!!isProfileIncomplete}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
              <div className="p-6 border-b flex-shrink-0 bg-muted/10">
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
                  <DialogDescription>Please provide your name to join the Kingdom workforce.</DialogDescription>
              </DialogHeader>
              {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </SearchProvider>
  );
}
