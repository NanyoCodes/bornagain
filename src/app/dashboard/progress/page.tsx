"use client"

import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { mockProgressData, mockSoulsWon } from "@/lib/data";
import { CalendarIcon, Edit, PlusCircle, Target, Trophy, TrendingUp, UserCheck2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";


const chartConfig = {
  soulsWon: {
    label: "Souls Won",
    color: "hsl(var(--primary))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;

export default function ProgressPage() {
  const { toast } = useToast();
  const [monthlyGoal, setMonthlyGoal] = useState(50);
  const [goalDate, setGoalDate] = useState(new Date());
  const [soulsThisMonth, setSoulsThisMonth] = useState(20); // This is mock data
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  
  const [newGoal, setNewGoal] = useState(monthlyGoal);
  const [newGoalDate, setNewGoalDate] = useState(goalDate);

  const handleSaveGoal = () => {
    if (newGoal > 0) {
      setMonthlyGoal(newGoal);
      setGoalDate(newGoalDate);
      setGoalDialogOpen(false);
      toast({
        title: "Monthly Goal Updated",
        description: `Your new goal for ${format(newGoalDate, "MMMM yyyy")} is ${newGoal} souls.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Goal",
        description: "Please enter a number greater than 0.",
      });
    }
  };

  const otherStats = [
    { title: "Total Souls Won", value: mockSoulsWon.length.toString(), icon: UserCheck2, description: "All time" },
    { title: "Longest Streak", value: "12 days", icon: Trophy, description: "Keep it up!" },
    { title: "Current Streak", value: "7 days", icon: TrendingUp, description: "Don't break it!" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Progress</h1>
          <p className="text-muted-foreground">Track your personal evangelism efforts.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/souls-won">
            <PlusCircle className="mr-2 h-4 w-4" />
            Log Soul Won
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {otherStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{format(goalDate, 'MMMM yyyy')} Goal</CardTitle>
              <Dialog 
                open={goalDialogOpen} 
                onOpenChange={(isOpen) => {
                  if(isOpen) {
                      setNewGoal(monthlyGoal);
                      setNewGoalDate(goalDate);
                  }
                  setGoalDialogOpen(isOpen);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Set Monthly Goal</DialogTitle>
                    <DialogDescription>
                      Set your personal goal for souls won for a specific month.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="goal" className="text-right">
                        Souls
                      </Label>
                      <Input
                        id="goal"
                        type="number"
                        value={newGoal}
                        onChange={(e) => setNewGoal(Number(e.target.value))}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                          For Month
                      </Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                              variant={"outline"}
                              className="col-span-3 font-normal"
                              >
                              <span>{format(newGoalDate, "MMMM yyyy")}</span>
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                captionLayout="dropdown-buttons"
                                fromYear={2020}
                                toYear={2030}
                                mode="single"
                                selected={newGoalDate}
                                onSelect={(date) => date && setNewGoalDate(date)}
                                initialFocus
                              />
                          </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveGoal}>Save Goal</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{`${soulsThisMonth} / ${monthlyGoal}`}</div>
              <p className="text-xs text-muted-foreground">{`${Math.round((soulsThisMonth / monthlyGoal) * 100)}% complete`}</p>
            </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Statistics</CardTitle>
          <CardDescription>Souls won in the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockProgressData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis />
                <Tooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="soulsWon" fill="var(--color-soulsWon)" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
