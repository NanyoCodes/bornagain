'use client';

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
import { useUser, useAuth, useFirestore, useCollection, useDoc } from "@/firebase";
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

function AppHeader({ unreadChatCount }: { unreadChatCount: number }) {
  const { user } = useUser();
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
                className="w-full pl-8"
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
        <Link href="/dashboard/chats">
            <Button variant="ghost" size="icon" className="relative">
              <MessagesSquare className="h-5 w-5" />
              {unreadChatCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {unreadChatCount}
                </div>
              )}
              <span className="sr-only">View chats</span>
            </Button>
        </Link>
        <Link href="/dashboard/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {unreadCount}
                </div>
              )}
              <span className="sr-only">View notifications</span>
            </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName || "User avatar"} />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
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
            <DropdownMenuItem onClick={handleLogout}>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur-lg md:hidden pb-[env(safe-area-inset-bottom)]">
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
  const isTakeoverPage = pathname.startsWith('/dashboard/chats/') || pathname.startsWith('/dashboard/notes') || pathname.startsWith('/dashboard/bible');
  const [lastActiveUpdated, setLastActiveUpdated] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userDocRef);

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

  const isProfileIncomplete = userProfile && (!userProfile.firstName || !userProfile.lastName);

  if (loading || profileLoading || !user?.uid) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse font-headline italic">Connecting to the Kingdom network...</p>
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className={cn("flex w-full flex-col overflow-x-hidden", isTakeoverPage ? "h-dvh" : "min-h-dvh")}>
        {!isTakeoverPage && <AppHeader unreadChatCount={unreadChatCount} />}
        <div className="flex-1 relative min-h-0">
          <main className={cn("absolute inset-0", !isTakeoverPage && "overflow-y-auto")}>
            <div className={cn("max-w-7xl mx-auto", !isTakeoverPage && "p-4 md:p-6 pb-40 md:pb-6", isTakeoverPage && "h-full")}>
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
        {!isTakeoverPage && <BottomNavBar />}
        {!isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
        
        {mounted && isMobile ? (
          <Sheet open={!!isProfileIncomplete}>
            <SheetContent side="bottom" className="h-[95dvh] flex flex-col p-0 rounded-t-2xl">
              <div className="p-6 border-b flex-shrink-0 bg-muted/10">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-xl font-bold">Complete Your Profile</SheetTitle>
                  <SheetDescription className="text-xs">Join the Kingdom workforce by introducing yourself.</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-grow overflow-y-auto p-6">
                {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={!!isProfileIncomplete}>
            <DialogContent hideCloseButton className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Complete Your Profile</DialogTitle>
                  <DialogDescription>Please provide your name to continue.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto pr-2">
                {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SearchProvider>
  );
}
