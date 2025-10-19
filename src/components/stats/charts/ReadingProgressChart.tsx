import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { FolderReadingStats } from '@/lib/types';

interface ReadingProgressChartProps {
  data: FolderReadingStats[];
}

interface ChartData {
  folderId: string;
  folderName: string;
  timeMinutes: number;
  timeSeconds: number;
  charactersRead: number;
  sessionCount: number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// Custom tooltip to show detailed breakdown
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as ChartData;

  return (
    <div
      className="rounded-lg border border-border bg-popover p-3 shadow-md"
      style={{ backgroundColor: 'hsl(var(--popover))' }}
    >
      <p className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--foreground))' }}>
        {data.folderName}
      </p>
      <div className="space-y-1 text-xs">
        <p style={{ color: 'hsl(var(--foreground))' }}>
          <span className="font-medium">Time:</span> {formatTime(data.timeSeconds)}
        </p>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          <span className="font-medium">Characters:</span> {formatNumber(data.charactersRead)}
        </p>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          <span className="font-medium">Sessions:</span> {data.sessionCount}
        </p>
      </div>
    </div>
  );
}

export function ReadingProgressChart({ data }: ReadingProgressChartProps) {
  console.log('[ReadingChart] Component received props:', {
    dataLength: data?.length,
    data,
  });

  // Sort by time spent and prepare chart data
  const sortedData = [...data].sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

  const chartData: ChartData[] = sortedData.map((folder) => ({
    folderId: folder.folderId,
    folderName: folder.folderName,
    timeMinutes: Math.floor(folder.totalTimeSeconds / 60),
    timeSeconds: folder.totalTimeSeconds,
    charactersRead: folder.charactersRead,
    sessionCount: folder.sessionCount,
  }));

  console.log('[ReadingChart] Chart data prepared:', {
    sortedDataLength: sortedData.length,
    chartDataLength: chartData.length,
    chartData,
  });

  console.log('[ReadingChart] Rendering chart component');

  return (
    <div className="w-full" style={{ minHeight: '350px', height: '350px' }}>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
          layout="horizontal"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border"
            opacity={0.3}
          />
          <XAxis
            dataKey="folderName"
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
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="timeMinutes"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
