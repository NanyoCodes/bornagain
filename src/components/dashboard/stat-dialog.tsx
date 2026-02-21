
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

interface StatDialogProps {
    title: string;
    value: string | number;
    change: string;
    icon: LucideIcon;
    dialogTitle: string;
    dialogDescription: string;
    children: React.ReactNode;
}

export function StatDialog({ title, value, change, icon: Icon, dialogTitle, dialogDescription, children }: StatDialogProps) {
    const isMobile = useIsMobile();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const trigger = (
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{change}</p>
            </CardContent>
        </Card>
    );

    if (!mounted) {
        return (
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold"><Skeleton className="h-8 w-12" /></div>
                    <div className="text-xs text-muted-foreground"><Skeleton className="h-4 w-24" /></div>
                </CardContent>
            </Card>
        );
    }
    
    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>{trigger}</SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh]">
                    <SheetHeader className="text-left">
                        <SheetTitle>{dialogTitle}</SheetTitle>
                        <SheetDescription>{dialogDescription}</SheetDescription>
                    </SheetHeader>
                    <div className="max-h-[calc(90vh-80px)] overflow-y-auto mt-4">
                        {isOpen && children}
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4 mt-4">
                  {isOpen && children}
                </div>
            </DialogContent>
        </Dialog>
    )
}

    