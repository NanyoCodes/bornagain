'use client';

/**
 * @fileOverview This layout wrapper handles dashboard-specific logic, including
 * mandatory authentication redirects and unread notification tracking.
 */

import Image from "next/image";
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
  Info,
  Phone,
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
import type { Notification, UserProfile } from "@/lib/types";
import { WelcomePopup } from "@/components/auth/welcome-popup";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { href: "/progress", label: "Progress", icon: TrendingUp, color: "text-chart-1" },
  { href: "/dashboard/souls-won", label: "Souls Won", icon: UserPlus, color: "text-chart-2" },
  { href: "/dashboard/testimonies", label: "Testimonies", icon: Newspaper, color: "text-chart-3" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/dashboard/fellowship", label: "Fellowship", icon: Users, color: "text-primary" },
  { href: "/dashboard/accountability", label: "Accountability", icon: HeartHandshake, color: "text-primary" },
];

const OTHER_NOTIFICATION_TYPES = ['campaign_join', 'new_chat_message', 'accountability_nudge', 'accountability_request', 'request_accepted', 'request_declined', 'accountability_partner_removed', 'new_soul_in_fellowship'];

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

function AppHeader({ unreadChatCount }: { unreadChatCount: number }) {
  const { user } = useUser();
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
      where('type', 'in', OTHER_NOTIFICATION_TYPES),
      where('isRead', '==', false)
    );
  }, [user?.uid, firestore]);

  const { data: unreadOtherNotifications } = useCollection<Notification>(otherNotificationsQuery);
  const unreadCount = unreadOtherNotifications?.length ?? 0;

  const isProfileIncomplete = userProfile && (!userProfile.firstName || !userProfile.lastName || !userProfile.photoURL);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (!user) return null;

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-6">
        <Link href="/dashboard/testimonies" className="flex items-center gap-2 text-lg font-semibold">
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
                    prefetch={true}
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
                  className="pl-8 sm:w-auto md:w-[250px] lg:w-[300px] h-10"
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
        <Link href="/dashboard/chats">
            <Button variant="ghost" size="icon" className="relative h-10 w-10">
              <MessagesSquare className="h-5 w-5" />
              {unreadChatCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unreadChatCount}
                </div>
              )}
              <span className="sr-only">View chats</span>
            </Button>
        </Link>
        <Link href="/dashboard/notifications">
            <Button variant="ghost" size="icon" className="relative h-10 w-10">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unreadCount}
                </div>
              )}
              <span className="sr-only">View notifications</span>
            </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName || "User avatar"} />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              {isProfileIncomplete && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-background"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href="/guide" className="cursor-pointer">
                < BookOpen className="mr-2 h-4 w-4" />
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
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function BottomNavBar() {
    const pathname = usePathname();
  
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
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

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const isTakeoverPage = pathname.startsWith('/dashboard/chats/') || pathname.startsWith('/dashboard/notes') || pathname.startsWith('/dashboard/bible');
  const [lastActiveUpdated, setLastActiveUpdated] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    setLoadingMessage(inspirationalMessages[Math.floor(Math.random() * inspirationalMessages.length)]);
  }, []);

  const { userProfile, loading: profileLoading } = useUserProfile();

  const unreadChatNotifsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      where('type', '==', 'new_chat_message'),
      where('isRead', '==', false)
    );
  }, [user?.uid, firestore]);
  const { data: unreadChatNotifications } = useCollection<Notification>(unreadChatNotifsQuery);
  const unreadChatCount = unreadChatNotifications?.length ?? 0;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user && firestore && !lastActiveUpdated) {
      const userRef = doc(firestore, 'users', user.uid);
      const updatePayload = { lastActive: serverTimestamp() };
      updateDoc(userRef, updatePayload).then(() => setLastActiveUpdated(true)).catch(() => {
        const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'update', requestResourceData: updatePayload }, user);
        errorEmitter.emit('permission-error', permissionError);
      });
    }
  }, [user, firestore, lastActiveUpdated]);

  useEffect(() => {
    if (profileLoading || !userProfile) return;
    const isNewUserSession = sessionStorage.getItem('isNewUserSession') === 'true';
    const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');
    const isProfileComplete = !!(userProfile.firstName && userProfile.lastName);
    if (isNewUserSession && isProfileComplete && !welcomePopupShown) {
        const timer = setTimeout(() => {
            setShowWelcomePopup(true);
            sessionStorage.setItem('welcomePopupShown', 'true');
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [profileLoading, userProfile]);

  if (loading || (profileLoading && !userProfile) || !user?.uid) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background animate-in fade-in duration-1000">
        <div className="relative mb-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            </div>
        </div>
        <p className="text-xl font-black font-headline tracking-[0.4em] uppercase text-primary animate-pulse text-center px-8">
          {loadingMessage || "GOD FIRST"}
        </p>
        <p className="mt-4 text-[9px] uppercase font-bold tracking-[0.2em] text-muted-foreground/50">
            Establishing Kingdom Connection...
        </p>
      </div>
    );
  }

  const isProfileIncomplete = userProfile && (!userProfile.firstName || !userProfile.lastName);

  // We show the navbar on chat pages as requested, but keep the header hidden for focus
  const showBottomNav = !isTakeoverPage || pathname.startsWith('/dashboard/chats/');

  return (
    <SearchProvider>
      <div className={cn("flex w-full flex-col overflow-x-hidden", isTakeoverPage ? "h-dvh" : "min-h-dvh")}>
        {!isTakeoverPage && <AppHeader unreadChatCount={unreadChatCount} />}
        <div className="flex-1 relative min-h-0">
          <main className={cn("absolute inset-0", !isTakeoverPage && "overflow-y-auto")}>
            <div className={cn(
              "max-w-7xl mx-auto", 
              !isTakeoverPage && "p-4 md:p-6 pb-32 md:pb-6", 
              isTakeoverPage && "h-full",
              (isTakeoverPage && showBottomNav) && "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"
            )}>
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
        {user && showBottomNav && <BottomNavBar />}
        {!isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
        
        {mounted && isMobile ? (
          <Sheet open={!!isProfileIncomplete}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-[2.5rem]">
              <div className="p-8 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-2xl font-black font-headline leading-tight">Complete Your Profile</SheetTitle>
                  <SheetDescription className="text-sm font-medium mt-1">Join the Kingdom workforce by introducing yourself.</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-grow overflow-y-auto p-8">
                {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={!!isProfileIncomplete}>
            <DialogContent hideCloseButton className="sm:max-w-lg rounded-3xl overflow-hidden p-0">
              <div className="p-6 border-b bg-muted/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Complete Your Profile</DialogTitle>
                    <DialogDescription className="text-sm">Please provide your name to continue.</DialogDescription>
                </DialogHeader>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SearchProvider>
  );
}
