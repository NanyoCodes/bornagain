'use client';

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  soulsWon: {
    label: 'Souls Won',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

interface MonthlyStatsChartProps {
  data: { date: string; soulsWon: number }[];
  monthlySoulsGoal: number;
}

export function MonthlyStatsChart({ data, monthlySoulsGoal }: MonthlyStatsChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          accessibilityLayer 
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            vertical={false} 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted-foreground))" 
            opacity={0.1} 
          />
          
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={12}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
          />
          
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            domain={[
              0,
              (dataMax: number) => Math.max(dataMax || 0, monthlySoulsGoal) + 2,
            ]}
          />
          
          <ChartTooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            content={<ChartTooltipContent hideLabel />}
          />
          
          {monthlySoulsGoal > 0 && (
            <ReferenceLine
              y={monthlySoulsGoal}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: `GOAL: ${monthlySoulsGoal}`,
                position: 'insideTopLeft',
                fill: 'hsl(var(--primary))',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
                className: 'opacity-70'
              }}
            />
          )}
          
          <Bar 
            dataKey="soulsWon" 
            fill="url(#barGradient)" 
            radius={[6, 6, 0, 0]}
            barSize={40}
          >
            <LabelList
              dataKey="soulsWon"
              position="top"
              offset={10}
              className="fill-foreground font-bold text-[10px]"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
