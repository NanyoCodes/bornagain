'use client';

import { useMemo, useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Soul } from '@/lib/types';
import { format, startOfMonth } from 'date-fns';
import { cn, safeToDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Skeleton } from '../ui/skeleton';

export function FollowUpHeatmap({ souls }: { souls: Soul[] }) {
  const [month, setMonth] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Set initial month on client to prevent hydration mismatch
    setMonth(startOfMonth(new Date()));
  }, []);

  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!souls) return map;

    souls.forEach(soul => {
      soul.followUpLog?.forEach(log => {
        const date = safeToDate(log.date);
        if (date) {
          const dateString = format(date, 'yyyy-MM-dd');
          map.set(dateString, (map.get(dateString) || 0) + 1);
        }
      });
    });
    return map;
  }, [souls]);

  const modifiers = useMemo(() => {
    const mods: Record<string, Date[]> = {};
    activityMap.forEach((_, dateString) => {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      mods[`activity-${dateString}`] = [date];
    });
    return mods;
  }, [activityMap]);

  const modifierStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    activityMap.forEach((count, dateString) => {
        if (count > 0) {
            const intensity = Math.min(count / 5, 1) * 0.8 + 0.2; // From 20% to 100% opacity, max intensity at 5 actions
            styles[`activity-${dateString}`] = { 
                backgroundColor: `hsla(var(--primary-hsl), ${intensity})`,
                color: 'hsl(var(--primary-foreground))'
            };
        }
    });
    return styles;
  }, [activityMap]);

  const handlePreviousMonth = () => {
    setMonth(prev => (prev ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1) : undefined));
  };

  const handleNextMonth = () => {
    setMonth(prev => (prev ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1) : undefined));
  };
  
  const isNextMonthDisabled = useMemo(() => {
    if (!month) return true;
    const currentMonth = startOfMonth(new Date());
    return month >= currentMonth;
  }, [month]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up Heat Map</CardTitle>
        <CardDescription>
          A visual overview of your follow-up activity intensity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center items-center min-h-[350px]">
        {!month ? (
          <Skeleton className="h-[350px] w-[340px]" />
        ) : (
        <TooltipProvider>
            <DayPicker
                month={month}
                onMonthChange={setMonth}
                modifiers={modifiers}
                modifiersStyles={modifierStyles}
                showOutsideDays
                fixedWeeks
                components={{
                    Day: (props) => {
                        const dateString = format(props.date, 'yyyy-MM-dd');
                        const count = activityMap.get(dateString);
                        const isDayOutside = props.displayMonth.getMonth() !== props.date.getMonth();
                        
                        const dayElement = (
                           <div
                             className={cn(
                                "h-9 w-9 p-0 flex items-center justify-center rounded-md transition-colors",
                                !isDayOutside && "hover:bg-accent",
                                count && count > 0 && "font-bold",
                                isDayOutside && "text-muted-foreground opacity-50"
                             )}
                           >
                            {props.date.getDate()}
                           </div>
                        );

                        if (count && count > 0) {
                            return (
                                <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild>
                                        {dayElement}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{count} follow-up action{count > 1 ? 's' : ''} on {format(props.date, 'PPP')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }
                        return dayElement;
                    },
                    Caption: (props) => (
                         <div className="flex justify-between items-center px-1 mb-4">
                            <h2 className="font-medium text-sm">{format(props.displayMonth, 'MMMM yyyy')}</h2>
                            <div className="flex items-center gap-1">
                               <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handlePreviousMonth}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                               </Button>
                               <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleNextMonth}
                                    disabled={isNextMonthDisabled}
                                >
                                    <ChevronRight className="h-4 w-4" />
                               </Button>
                            </div>
                        </div>
                    )
                }}
                classNames={{
                    table: 'w-full border-collapse space-y-1',
                    head_row: 'flex',
                    head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                    row: 'flex w-full mt-2',
                    cell: 'p-0 relative text-center text-sm focus-within:relative focus-within:z-20',
                    day: '',
                    day_selected: '',
                    day_today: 'bg-accent text-accent-foreground rounded-md',
                    day_disabled: 'text-muted-foreground opacity-50',
                }}
            />
        </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
