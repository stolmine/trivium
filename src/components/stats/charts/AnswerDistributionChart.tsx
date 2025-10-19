import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DailyReviewStats } from '@/lib/types';

interface AnswerDistributionChartProps {
  data: DailyReviewStats[];
}

interface ChartData {
  date: string;
  displayDate: string;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Custom tooltip to show percentages
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as ChartData;
  const total = data.againCount + data.hardCount + data.goodCount + data.easyCount;

  if (total === 0) return null;

  const againPct = ((data.againCount / total) * 100).toFixed(1);
  const hardPct = ((data.hardCount / total) * 100).toFixed(1);
  const goodPct = ((data.goodCount / total) * 100).toFixed(1);
  const easyPct = ((data.easyCount / total) * 100).toFixed(1);

  return (
    <div
      className="rounded-lg border border-border bg-popover p-3 shadow-md"
      style={{ backgroundColor: 'hsl(var(--popover))' }}
    >
      <p className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--foreground))' }}>
        {data.displayDate}
      </p>
      <div className="space-y-1 text-xs">
        <p style={{ color: 'hsl(0, 84%, 60%)' }}>
          <span className="font-medium">Again:</span> {data.againCount} ({againPct}%)
        </p>
        <p style={{ color: 'hsl(38, 92%, 50%)' }}>
          <span className="font-medium">Hard:</span> {data.hardCount} ({hardPct}%)
        </p>
        <p style={{ color: 'hsl(142, 71%, 45%)' }}>
          <span className="font-medium">Good:</span> {data.goodCount} ({goodPct}%)
        </p>
        <p style={{ color: 'hsl(217, 91%, 60%)' }}>
          <span className="font-medium">Easy:</span> {data.easyCount} ({easyPct}%)
        </p>
        <p className="pt-1 border-t border-border" style={{ color: 'hsl(var(--foreground))' }}>
          <span className="font-medium">Total:</span> {total}
        </p>
      </div>
    </div>
  );
}

export function AnswerDistributionChart({ data }: AnswerDistributionChartProps) {
  // Take the last 10 days for the chart
  const chartData: ChartData[] = data.slice(-10).map((day) => ({
    date: day.date,
    displayDate: formatDate(day.date),
    againCount: day.againCount,
    hardCount: day.hardCount,
    goodCount: day.goodCount,
    easyCount: day.easyCount,
  }));

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              color: 'hsl(var(--foreground))',
            }}
          />
          <Bar
            dataKey="againCount"
            stackId="a"
            fill="hsl(0, 84%, 60%)"
            name="Again"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="hardCount"
            stackId="a"
            fill="hsl(38, 92%, 50%)"
            name="Hard"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="goodCount"
            stackId="a"
            fill="hsl(142, 71%, 45%)"
            name="Good"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="easyCount"
            stackId="a"
            fill="hsl(217, 91%, 60%)"
            name="Easy"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
