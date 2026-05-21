'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
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
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { PageTransition } from "../page-transition";

const navItems = [
  { href: "/progress", label: "Progress", icon: TrendingUp, color: "text-chart-1" },
  { href: "/souls-won", label: "Souls Won", icon: UserPlus, color: "text-chart-2" },
  { href: "/testimonies", label: "Testimonies", icon: Newspaper, color: "text-chart-3" },
  { href: "/campaigns", label: "Campaigns", icon: Target, color: "text-chart-4" },
  { href: "/fellowships", label: "Fellowship", icon: HeartHandshake, color: "text-primary" },
];

const NOTIFICATION_TYPES = ['campaign_join', 'accountability_nudge', 'accountability_request', 'request_accepted', 'request_declined', 'accountability_partner_removed', 'new_soul_in_fellowship'];

function AppHeader({ unreadChatCount, unreadNotifCount }: { unreadChatCount: number, unreadNotifCount: number }) {
  const { user } = useUser();
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-6">
        <Link href="/progress" className="flex items-center gap-2 text-lg font-semibold">
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
          </div>
        )}
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
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL ?? undefined} />
                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
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
            <DropdownMenuItem asChild><Link href="/profile"><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
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
        <div className="grid h-16 grid-cols-5 items-center">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px]",
                  isActive ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isActive && item.color)} />
                <span>{item.label}</span>
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
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

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
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

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

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isProfileIncomplete = userProfile && (!userProfile.firstName || !userProfile.lastName);

  return (
    <SearchProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader unreadChatCount={unreadChatNotifications?.length || 0} unreadNotifCount={unreadOtherNotifications?.length || 0} />
        <main className="flex-1 pb-20 md:pb-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <PageTransition>{children}</PageTransition>
        </main>
        <BottomNavBar unreadChatCount={unreadChatNotifications?.length || 0} />
        
        {!isProfileIncomplete && <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userName={userProfile?.firstName} />}
        
        <Dialog open={!!isProfileIncomplete}>
          <DialogContent hideCloseButton className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Complete Your Profile</DialogTitle>
                <DialogDescription>Please provide your name to join the Kingdom workforce.</DialogDescription>
            </DialogHeader>
            {userProfile && <EditProfileModal userProfile={userProfile} onClose={() => {}} />}
          </DialogContent>
        </Dialog>
      </div>
    </SearchProvider>
  );
}
