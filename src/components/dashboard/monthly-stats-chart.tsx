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

const chartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface MonthlyStatsChartProps {
  data: { date: string; soulsWon: number }[];
  monthlySoulsGoal: number;
}

export function MonthlyStatsChart({ data, monthlySoulsGoal }: MonthlyStatsChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            allowDecimals={false}
            domain={[
              0,
              (dataMax: number) => Math.max(dataMax || 0, monthlySoulsGoal) + 2,
            ]}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          {monthlySoulsGoal > 0 && (
            <ReferenceLine
              y={monthlySoulsGoal}
              label={{
                value: `Goal: ${monthlySoulsGoal}`,
                position: 'insideTopLeft',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 12,
              }}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
          )}
          <Bar dataKey="soulsWon" radius={[4, 4, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartColors[index % chartColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
