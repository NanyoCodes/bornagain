
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
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";


const navItems = [
  { href: "/dashboard", label: "Progress", icon: TrendingUp, color: "text-chart-1" },
  { href: "/dashboard/souls-won", label: "Souls Won", icon: UserPlus, color: "text-chart-2" },
  { href: "/dashboard/testimonies", label: "Testimonies", icon: Newspaper, color: "text-chart-3" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/dashboard/fellowship", label: "Fellowship", icon: HeartHandshake, color: "text-primary" },
  { href: "/dashboard/chats", label: "Chats", icon: MessagesSquare, color: "text-chart-5" },
];

function AppHeader({ unreadChatCount }: { unreadChatCount: number }) {
  const { user } = useUser();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Query for other notifications (for the bell icon badge)
  const otherNotificationTypes = ['campaign_join', 'accountability_nudge', 'accountability_request', 'request_accepted', 'request_declined', 'accountability_partner_removed'];
  const otherNotificationsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      where('type', 'in', otherNotificationTypes),
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
  
  if (!user) {
    return null;
  }

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
        <Link
          href="/dashboard/testimonies"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          {logo && (
            <Avatar className="h-11 w-11">
              <AvatarImage src={logo.imageUrl} alt={logo.description} />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          )}
          <span className="sr-only">Testify</span>
        </Link>
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6">
            {navItems.map((item) => {
              const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
              const isChats = item.label === 'Chats';
              return (
                <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                    "transition-colors hover:text-primary whitespace-nowrap relative flex items-center gap-2",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                >
                    <item.icon className={cn("h-4 w-4", !isActive && item.color)} />
                    {item.label}
                    {isChats && unreadChatCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                        {unreadChatCount}
                      </span>
                    )}
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
              <Link href="/dashboard/accountability">
                <HeartHandshake className="mr-2 h-4 w-4" />
                <span>Accountability Partner</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/dashboard/guide">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>App Guide</span>
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

function BottomNavBar({ unreadChatCount }: { unreadChatCount: number }) {
    const pathname = usePathname();
  
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
        <div className="grid h-16 grid-cols-6 items-center">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
            const isChats = item.label === 'Chats';
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                 {isChats && unreadChatCount > 0 && (
                    <div className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                        {unreadChatCount}
                    </div>
                )}
                <item.icon className={cn("h-5 w-5", !isActive && item.color)} />
                <span className="text-center">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    );
}


export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const isChatPage = /^\/dashboard\/chats\/.+/.test(pathname);
  const isNotesPage = pathname.startsWith('/dashboard/notes');
  const [lastActiveUpdated, setLastActiveUpdated] = useState(false);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
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
    // Effect for redirection
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    // Effect for updating lastActive timestamp.
    if (user && firestore && !lastActiveUpdated) {
      const userRef = doc(firestore, 'users', user.uid);
      const updatePayload = { lastActive: serverTimestamp() };
      updateDoc(userRef, updatePayload)
        .then(() => {
          setLastActiveUpdated(true);
        })
        .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updatePayload,
        }, user);
        errorEmitter.emit('permission-error', permissionError);
      });
    }
  }, [user, firestore, lastActiveUpdated]);

  useEffect(() => {
    // Effect for Welcome Popup logic. Depends on userProfile.
    if (!loading && user && userProfile) {
      const isNewUserSession = sessionStorage.getItem('isNewUserSession');
      if (isNewUserSession === null && user.metadata.creationTime && user.metadata.lastSignInTime) {
          const creationTime = new Date(user.metadata.creationTime).getTime();
          const lastSignInTime = new Date(user.metadata.lastSignInTime).getTime();
          if (Math.abs(lastSignInTime - creationTime) < 5000) { // Heuristic for first login
              sessionStorage.setItem('isNewUserSession', 'true');
          } else {
              sessionStorage.setItem('isNewUserSession', 'false');
          }
      }
      
      const isProfileComplete = userProfile.firstName && userProfile.lastName;
      const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');

      if (sessionStorage.getItem('isNewUserSession') === 'true' && isProfileComplete && !welcomePopupShown) {
          setShowWelcomePopup(true);
          sessionStorage.setItem('welcomePopupShown', 'true');
      }
    }
  }, [user, loading, userProfile]);

  const getLoadingMessage = (path: string) => {
    if (path.startsWith('/dashboard/souls-won')) return 'Loading souls won...';
    if (path.startsWith('/dashboard/testimonies')) return 'Loading testimonies...';
    if (path.startsWith('/dashboard/campaigns')) return 'Loading campaigns...';
    if (path.startsWith('/dashboard/accountability')) return 'Loading accountability...';
    if (path.startsWith('/dashboard/progress')) return 'Loading your progress...';
    if (path.startsWith('/dashboard/chats')) return 'Loading chats...';
    if (path.startsWith('/dashboard/profile')) return 'Loading your profile...';
    if (path.startsWith('/dashboard/settings')) return 'Loading settings...';
    if (path.startsWith('/dashboard/notifications')) return 'Loading notifications...';
    if (path.startsWith('/dashboard/fellowship')) return 'Loading fellowships...';
    return 'Loading your dashboard...';
  };

  const isProfileIncomplete = userProfile && (!userProfile.firstName || !userProfile.lastName);

  if (loading || profileLoading || !user?.uid) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        {logo && (
          <Avatar className="h-16 w-16 mb-6 animate-pulse">
            <AvatarImage src={logo.imageUrl} alt={logo.description} />
            <AvatarFallback></AvatarFallback>
          </Avatar>
        )}
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{getLoadingMessage(pathname)}</p>
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className={cn("flex w-full flex-col overflow-x-hidden", isChatPage || isNotesPage ? "h-dvh" : "min-h-dvh")}>
        {!(isNotesPage || isChatPage) && <AppHeader unreadChatCount={unreadChatCount} />}
        <div className="flex-1 relative min-h-0">
          <main className={cn("absolute inset-0", !(isChatPage || isNotesPage) && "overflow-y-auto")}>
            <div className={cn(
                "max-w-7xl mx-auto",
                !(isChatPage || isNotesPage) && "p-4 md:p-6 pb-20 md:pb-6",
                (isChatPage || isNotesPage) && "h-full"
            )}>
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
        {!isChatPage && !isNotesPage && <BottomNavBar unreadChatCount={unreadChatCount} />}
        {!isProfileIncomplete && (
          <WelcomePopup 
            isOpen={showWelcomePopup}
            onClose={() => setShowWelcomePopup(false)}
            userName={userProfile?.firstName}
          />
        )}
         <Dialog open={isProfileIncomplete}>
          <DialogContent hideCloseButton className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Complete Your Profile</DialogTitle>
              <DialogDescription>
                Welcome! Please provide your name to continue using the app.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              {userProfile && (
                <EditProfileModal
                  userProfile={userProfile}
                  onClose={() => {
                    // This is intentionally empty. The dialog closes automatically 
                    // when the `isProfileIncomplete` state becomes false.
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SearchProvider>
  );
}
