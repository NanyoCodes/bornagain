
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateTestimonyForm } from "@/components/testimonies/create-testimony-form";
import { TestimonyCard } from "@/components/testimonies/testimony-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Testimony, TestimonyCategory } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

const categories: (TestimonyCategory | "All")[] = [
  "All",
  "Healing",
  "Financial Breakthrough",
  "Salvation",
  "Relationships",
  "Deliverance",
  "General",
];

export default function TestimoniesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<TestimonyCategory | "All">("All");
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  const firestore = useFirestore();

  const testimoniesQuery =
    filter === "All"
      ? query(collection(firestore, "testimonies"), orderBy("createdAt", "desc"))
      : query(
          collection(firestore, "testimonies"),
          where("category", "==", filter),
          orderBy("createdAt", "desc")
        );

  const { data: testimonies, loading } = useCollection<Testimony>(testimoniesQuery);


  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTestimonyCreated = () => {
    setIsDialogOpen(false);
  };

  const filterComponent = isMobile ? (
    <Select
      value={filter}
      onValueChange={(value) => setFilter(value as TestimonyCategory | "All")}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Filter by category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : (
    <Tabs
      value={filter}
      onValueChange={(value) => setFilter(value as TestimonyCategory | "All")}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {categories.map((category) => (
          <TabsTrigger key={category} value={category}>
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
  
  const triggerButton = (
    <Button>
      <PlusCircle className="mr-2 h-4 w-4" />
      Share Testimony
    </Button>
  );

  const formContent = <CreateTestimonyForm onTestimonyCreated={handleTestimonyCreated} />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Testimonies
          </h1>
          <p className="text-muted-foreground">
            Read and share what God has done.
          </p>
        </div>
        {mounted && isMobile ? (
            <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <SheetTrigger asChild>{triggerButton}</SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Share Your Testimony</SheetTitle>
                  <SheetDescription>
                    Encourage others by sharing what God has done in your life. Your
                    story matters.
                  </SheetDescription>
                </SheetHeader>
                <div className="max-h-[80vh] overflow-y-auto p-1 mt-4">
                    {formContent}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>{triggerButton}</DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Share Your Testimony</DialogTitle>
                  <DialogDescription>
                    Encourage others by sharing what God has done in your life. Your
                    story matters.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {formContent}
                </div>
              </DialogContent>
            </Dialog>
          )}
      </div>

      {mounted ? filterComponent : <Skeleton className="h-10 w-full" />}

      <div className="grid gap-6 md:grid-cols-1 lg:max-w-5xl mx-auto">
        {loading && (
          [...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
              <CardFooter>
                 <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))
        )}
        {testimonies?.map((testimony) => (
          <TestimonyCard key={testimony.id} testimony={testimony} />
        ))}
      </div>
    </div>
  );
}
