"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { SoulsWonTable } from "@/components/souls/souls-won-table";
import { LogSoulForm } from "@/components/souls/log-soul-form";
import { mockSoulsWon } from "@/lib/data";
import type { Soul } from "@/lib/types";

export default function SoulsWonPage() {
  const [souls, setSouls] = useState<Soul[]>(mockSoulsWon);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  const handleSoulLogged = (newSoul: Soul) => {
    setSouls((prev) => [newSoul, ...prev]);
    setIsLogDialogOpen(false);
  };

  const handleUpdateSoul = (updatedSoul: Soul) => {
    setSouls((prev) =>
      prev.map((soul) => (soul.id === updatedSoul.id ? updatedSoul : soul))
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Souls Won</h1>
          <p className="text-muted-foreground">
            Track and nurture individuals you've led to Christ.
          </p>
        </div>
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Log Soul Won
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Log a New Soul</DialogTitle>
              <DialogDescription>
                Record the details of the person you've ministered to.
              </DialogDescription>
            </DialogHeader>
            <LogSoulForm onSoulLogged={handleSoulLogged} />
          </DialogContent>
        </Dialog>
      </div>
      
      <SoulsWonTable souls={souls} onUpdateSoul={handleUpdateSoul} />
    </div>
  );
}
