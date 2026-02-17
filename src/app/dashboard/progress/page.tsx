"use client"

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { mockProgressData, mockSoulsWon } from "@/lib/data";
import { PlusCircle, Target, Trophy, TrendingUp, UserCheck2 } from "lucide-react";

const chartConfig = {
  soulsWon: {
    label: "Souls Won",
    color: "hsl(var(--primary))",
  },
} satisfies import("@/components/ui/chart").ChartConfig;

export default function ProgressPage() {
  const stats = [
    { title: "Total Souls Won", value: mockSoulsWon.length.toString(), icon: UserCheck2, description: "All time" },
    { title: "Monthly Goal", value: "20 / 50", icon: Target, description: "40% complete" },
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
        {stats.map((stat) => (
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
