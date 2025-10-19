import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { HourlyReviewDistribution } from '@/lib/types';

interface HourlyDistributionChartProps {
  data: HourlyReviewDistribution[];
}

interface ChartData {
  hour: number;
  displayHour: string;
  reviewCount: number;
  againRate: number;
  hardRate: number;
  goodRate: number;
  easyRate: number;
  avgDurationMs: number | null;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

// Custom tooltip to show detailed breakdown
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as ChartData;
  const avgDuration = data.avgDurationMs ? Math.round(data.avgDurationMs / 1000) : null;

  return (
    <div
      className="rounded-lg border border-border bg-popover p-3 shadow-md"
      style={{ backgroundColor: 'hsl(var(--popover))' }}
    >
      <p className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--foreground))' }}>
        {data.displayHour}
      </p>
      <div className="space-y-1 text-xs">
        <p style={{ color: 'hsl(var(--foreground))' }}>
          <span className="font-medium">Reviews:</span> {data.reviewCount}
        </p>
        <div className="flex gap-3 text-xs">
          <span style={{ color: 'hsl(0, 84%, 60%)' }}>Again: {(data.againRate * 100).toFixed(0)}%</span>
          <span style={{ color: 'hsl(38, 92%, 50%)' }}>Hard: {(data.hardRate * 100).toFixed(0)}%</span>
        </div>
        <div className="flex gap-3 text-xs">
          <span style={{ color: 'hsl(142, 71%, 45%)' }}>Good: {(data.goodRate * 100).toFixed(0)}%</span>
          <span style={{ color: 'hsl(217, 91%, 60%)' }}>Easy: {(data.easyRate * 100).toFixed(0)}%</span>
        </div>
        {avgDuration && (
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>
            Avg: {avgDuration}s
          </p>
        )}
      </div>
    </div>
  );
}

export function HourlyDistributionChart({ data }: HourlyDistributionChartProps) {
  const chartData: ChartData[] = data.map((hour) => ({
    hour: hour.hour,
    displayHour: formatHour(hour.hour),
    reviewCount: hour.reviewCount,
    againRate: hour.againRate,
    hardRate: hour.hardRate,
    goodRate: hour.goodRate,
    easyRate: hour.easyRate,
    avgDurationMs: hour.avgDurationMs,
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
            dataKey="displayHour"
            className="text-xs fill-muted-foreground"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            interval={1}
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
          <Bar
            dataKey="reviewCount"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          >
            {chartData.map((entry, index) => {
              // Color bars based on predominant answer type
              const rates = [
                { rate: entry.againRate, color: 'hsl(0, 84%, 60%)' },
                { rate: entry.hardRate, color: 'hsl(38, 92%, 50%)' },
                { rate: entry.goodRate, color: 'hsl(142, 71%, 45%)' },
                { rate: entry.easyRate, color: 'hsl(217, 91%, 60%)' },
              ];
              const maxRate = rates.reduce((prev, curr) => (curr.rate > prev.rate ? curr : prev));

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={maxRate.color}
                  fillOpacity={0.8}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
