"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { mockTestimonies } from "@/lib/data";
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
  const [testimonies, setTestimonies] = useState<Testimony[]>(mockTestimonies);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<TestimonyCategory | "All">("All");
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTestimonyCreated = (newTestimony: Testimony) => {
    setTestimonies((prev) => [newTestimony, ...prev]);
    setIsDialogOpen(false);
  };

  const filteredTestimonies = testimonies.filter(
    (testimony) => filter === "All" || testimony.category === filter
  );

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Share Testimony
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Share Your Testimony</DialogTitle>
              <DialogDescription>
                Encourage others by sharing what God has done in your life. Your
                story matters.
              </DialogDescription>
            </DialogHeader>
            <CreateTestimonyForm onTestimonyCreated={handleTestimonyCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {mounted ? filterComponent : <Skeleton className="h-10 w-full" />}

      <div className="grid gap-6 md:grid-cols-1 lg:max-w-3xl mx-auto">
        {filteredTestimonies.map((testimony) => (
          <TestimonyCard key={testimony.id} testimony={testimony} />
        ))}
      </div>
    </div>
  );
}
