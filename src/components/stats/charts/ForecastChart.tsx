import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ForecastDay } from '@/lib/types';

interface ForecastChartProps {
  data: ForecastDay[];
}

interface ChartData {
  date: string;
  displayDate: string;
  newCards: number;
  reviewCards: number;
  learningCards: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ForecastChart({ data }: ForecastChartProps) {
  const chartData: ChartData[] = data.map((day) => ({
    date: day.date,
    displayDate: formatDate(day.date),
    newCards: day.newCards,
    reviewCards: day.reviewCards,
    learningCards: day.learningCards,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            opacity={0.3}
          />
          <XAxis
            dataKey="displayDate"
            className="text-xs fill-muted-foreground"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--popover-foreground))',
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: 600,
            }}
          />
          <Legend
            wrapperStyle={{
              color: 'hsl(var(--foreground))',
            }}
          />
          <Area
            type="monotone"
            dataKey="newCards"
            stackId="1"
            stroke="hsl(217, 91%, 60%)"
            fill="hsl(217, 91%, 60%)"
            fillOpacity={0.6}
            name="New Cards"
          />
          <Area
            type="monotone"
            dataKey="reviewCards"
            stackId="1"
            stroke="hsl(142, 71%, 45%)"
            fill="hsl(142, 71%, 45%)"
            fillOpacity={0.6}
            name="Review Cards"
          />
          <Area
            type="monotone"
            dataKey="learningCards"
            stackId="1"
            stroke="hsl(38, 92%, 50%)"
            fill="hsl(38, 92%, 50%)"
            fillOpacity={0.6}
            name="Learning Cards"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
