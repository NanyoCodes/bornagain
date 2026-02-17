
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Bell,
  Home,
  LogOut,
  Newspaper,
  Search,
  Settings,
  Target,
  TrendingUp,
  User,
  UserPlus,
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
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const logo = PlaceHolderImages.find((img) => img.id === "logo");
const userAvatar = PlaceHolderImages.find((img) => img.id === "user-1");

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/testimonies", label: "Testimonies", icon: Newspaper },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Target },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  { href: "/dashboard/souls-won", label: "Souls Won", icon: UserPlus },
];

function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          {logo && <Image src={logo.imageUrl} alt="Testify" width={30} height={30} />}
          <span className="hidden font-bold sm:inline-block">Testify</span>
        </Link>
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex lg:gap-6">
            {navItems.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                "transition-colors hover:text-foreground whitespace-nowrap",
                pathname === item.href ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
            >
                {item.label}
            </Link>
            ))}
        </nav>
      </div>
        
      <div className="flex items-center gap-2 md:gap-4">
        <form className="hidden sm:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8 md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-9 w-9">
                {userAvatar && (
                  <AvatarImage
                    src={userAvatar.imageUrl}
                    alt="User avatar"
                    data-ai-hint={userAvatar.imageHint}
                  />
                )}
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs leading-none text-muted-foreground">
                  user@testify.com
                </p>
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
              <Link href="/login">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </Link>
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
                "flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors hover:text-primary",
                (pathname.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
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
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {mounted ? (
        <AppHeader />
      ) : (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 lg:px-8" />
      )}
      <main className="flex flex-1 flex-col p-4 pb-24 md:p-6 md:pb-8 lg:p-8">{children}</main>
      {mounted && <BottomNavBar />}
    </div>
  );
}
