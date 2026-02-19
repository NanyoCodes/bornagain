
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Home,
  LogOut,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Target,
  TrendingUp,
  User,
  UserPlus,
  Loader2,
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
import { useUser, useAuth, useFirestore, useCollection } from "@/firebase";
import { signOut } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { SearchProvider, useSearch } from "@/context/search-context";
import { collection, doc, limit, orderBy, query, writeBatch } from "firebase/firestore";
import type { Notification } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { WelcomePopup } from "@/components/auth/welcome-popup";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/testimonies", label: "Testimonies", icon: Newspaper },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Target },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  { href: "/dashboard/souls-won", label: "Souls Won", icon: UserPlus },
];

function AppHeader() {
  const { user, loading: authLoading } = useUser();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const logo = PlaceHolderImages.find((img) => img.id === "logo");
  const { searchTerm, setSearchTerm, searchPlaceholder, isSearchVisible } = useSearch();
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  const notificationsQuery = useMemo(() => {
    if (authLoading || !user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc'), limit(10));
  }, [authLoading, user?.uid, firestore]);

  const { data: notifications, loading: notificationsLoading } = useCollection<Notification>(notificationsQuery);
  const unreadCount = useMemo(() => notifications?.filter(n => !n.isRead).length ?? 0, [notifications]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/login");
  };
  
  const handleMarkAllAsRead = async () => {
    if (!user || !firestore || !notifications) return;
    
    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const b = writeBatch(firestore);
    unreadNotifications.forEach(notification => {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
        b.update(notifRef, { isRead: true });
    });
    
    await b.commit().catch(console.error);
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
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          {logo && <Image src={logo.imageUrl} alt={logo.description} width={32} height={10} data-ai-hint={logo.imageHint} />}
          <span className="sr-only">Testify</span>
        </Link>
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6">
            {navItems.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                "transition-colors hover:text-foreground whitespace-nowrap",
                pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
            >
                {item.label}
            </Link>
            ))}
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
        <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/chats">
                <MessageSquare className="h-5 w-5" />
                <span className="sr-only">Chats</span>
            </Link>
        </Button>
        <DropdownMenu onOpenChange={(open) => {
          if (open && unreadCount > 0) {
            handleMarkAllAsRead();
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {unreadCount}
                </div>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsLoading ? (
              <div className="p-4 text-sm text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : notifications && notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} asChild className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto">
                    <Link href={notification.link || '#'} className={cn("flex flex-col items-start gap-1 p-2 w-full", !notification.isRead && "bg-accent/50")}>
                        <p className="font-semibold text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground whitespace-normal">{notification.message}</p>
                         <p className="text-xs text-muted-foreground self-end">
                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : ''}
                        </p>
                    </Link>
                  </DropdownMenuItem>
                ))
            ) : (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No new notifications.
                </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                <span>My Testimony</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] transition-colors hover:text-primary",
                (pathname.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Check if it's a new user to show the welcome popup
      const welcomePopupShown = sessionStorage.getItem('welcomePopupShown');
      if (!welcomePopupShown && user.metadata.creationTime && user.metadata.lastSignInTime) {
        const creationTime = new Date(user.metadata.creationTime).getTime();
        const lastSignInTime = new Date(user.metadata.lastSignInTime).getTime();
        
        // Show popup if last sign in is within a short time from creation (e.g., 5 seconds)
        if (lastSignInTime - creationTime < 5000) {
          setShowWelcomePopup(true);
          sessionStorage.setItem('welcomePopupShown', 'true');
        }
      }
    } else if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <SearchProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader />
        <main className="flex w-full flex-1 flex-col p-4 pb-24 md:p-6 md:pb-8 lg:p-8 max-w-7xl mx-auto">{children}</main>
        <BottomNavBar />
        <WelcomePopup 
          isOpen={showWelcomePopup}
          onClose={() => setShowWelcomePopup(false)}
          userName={user?.displayName}
        />
      </div>
    </SearchProvider>
  );
}
