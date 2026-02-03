import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, BarChart3, Loader2, Fuel, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type FuelType = 'E5' | 'E10' | 'Diesel' | 'Super Diesel' | 'B10' | 'HVO';

const fuelTypes: { label: string; value: FuelType }[] = [
  { label: 'E10 (Regular)', value: 'E10' },
  { label: 'E5 (Super)', value: 'E5' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'Super Diesel', value: 'Super Diesel' },
  { label: 'B10 (Bio)', value: 'B10' },
  { label: 'HVO', value: 'HVO' },
];

const timeRangeOptions = [
  { label: '24 Hours', value: 1 },
  { label: '3 Days', value: 3 },
  { label: 'Week', value: 7 },
  { label: '2 Weeks', value: 14 },
  { label: 'Month', value: 30 },
  { label: '3 Months', value: 90 },
];

interface PriceHistoryGraphProps {
  stationId: Id<'stations'>;
  stationName?: string;
  defaultFuelType?: FuelType;
}

export function PriceHistoryGraph({
  stationId,
  stationName,
  defaultFuelType = 'E10',
}: PriceHistoryGraphProps) {
  const [fuelType, setFuelType] = React.useState<FuelType>(defaultFuelType);
  const [daysBack, setDaysBack] = React.useState<number>(7);

  const priceHistory = useQuery(api.fuelPrices.getPriceHistory, {
    stationId,
    fuelType,
    daysBack,
  });

  const chartData = React.useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];

    return priceHistory
      .map((record) => {
        const date = new Date(record.recordedAt);
        
        let dateLabel: string;
        if (daysBack <= 1) {
          dateLabel = date.toLocaleString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } else if (daysBack <= 7) {
          dateLabel = date.toLocaleString('en-GB', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        } else {
          dateLabel = date.toLocaleString('en-GB', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        
        return {
          timestamp: record.recordedAt,
          date: dateLabel,
          fullDate: date.toLocaleString('en-GB', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          price: record.price,
        };
      })
      .reverse();
  }, [priceHistory, daysBack]);

  const stats = React.useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return null;

    const prices = priceHistory.map((p) => p.price);
    const currentPrice = prices[0];
    const oldestPrice = prices[prices.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceChange = currentPrice - oldestPrice;
    const priceChangePercent = ((priceChange / oldestPrice) * 100).toFixed(2);

    return {
      current: currentPrice.toFixed(1),
      min: minPrice.toFixed(1),
      max: maxPrice.toFixed(1),
      avg: avgPrice.toFixed(1),
      change: priceChange.toFixed(1),
      changePercent: priceChangePercent,
      trend: priceChange > 0.5 ? 'up' : priceChange < -0.5 ? 'down' : 'stable',
    };
  }, [priceHistory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">
            {payload[0].payload.fullDate}
          </p>
          <p className="text-xl font-bold text-primary">
            {payload[0].value.toFixed(1)}p
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Price History</h2>
              {stationName && (
                <p className="text-sm text-muted-foreground">{stationName}</p>
              )}
            </div>
          </div>

          {/* Selectors */}
          <div className="flex gap-2">
            <Select value={fuelType} onValueChange={(value) => setFuelType(value as FuelType)}>
              <SelectTrigger className="w-[130px] sm:w-[150px] h-10 bg-secondary/50 border-border">
                <Fuel className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {fuelTypes.map((fuel) => (
                    <SelectItem key={fuel.value} value={fuel.value}>
                      {fuel.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={daysBack.toString()} onValueChange={(value) => value && setDaysBack(parseInt(value))}>
              <SelectTrigger className="w-[110px] sm:w-[130px] h-10 bg-secondary/50 border-border">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Price Statistics */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-xl font-bold text-primary">{stats.current}p</p>
            </div>

            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Change</p>
              <div className="flex items-center gap-1">
                {stats.trend === 'up' && <TrendingUp className="h-4 w-4 text-destructive" />}
                {stats.trend === 'down' && <TrendingDown className="h-4 w-4 text-primary" />}
                {stats.trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className={`text-xl font-bold ${
                  stats.trend === 'up' ? 'text-destructive' : 
                  stats.trend === 'down' ? 'text-primary' : 
                  'text-muted-foreground'
                }`}>
                  {stats.change}p
                </span>
              </div>
              <p className="text-xs text-muted-foreground">({stats.changePercent}%)</p>
            </div>

            <div className="rounded-xl bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">Lowest</p>
              <p className="text-xl font-bold text-primary">{stats.min}p</p>
            </div>

            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="text-xs text-muted-foreground">Highest</p>
              <p className="text-xl font-bold text-destructive">{stats.max}p</p>
            </div>

            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-xl font-bold text-foreground">{stats.avg}p</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {priceHistory === undefined && (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* No Data State */}
        {priceHistory && priceHistory.length === 0 && (
          <div className="flex h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                No price history available for {fuelType}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try a different fuel type or time range
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <>
            <div className="bg-secondary/30 rounded-xl p-3 sm:p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    stroke="rgba(255,255,255,0.1)"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                    stroke="rgba(255,255,255,0.1)"
                    domain={['dataMin - 2', 'dataMax + 2']}
                    width={45}
                    tickFormatter={(value) => `${value}p`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="oklch(0.65 0.22 145)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: 'oklch(0.65 0.22 145)' }}
                    activeDot={{ r: 4, fill: 'oklch(0.65 0.22 145)' }}
                    name={`${fuelType} Price`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Data Summary */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Badge variant="outline" className="text-xs bg-secondary/50">
                {chartData.length} data points
              </Badge>
              {chartData.length > 1 && (
                <>
                  <Badge variant="outline" className="text-xs bg-secondary/50">
                    From: {chartData[0].fullDate.split(',')[0]}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-secondary/50">
                    To: {chartData[chartData.length - 1].fullDate.split(',')[0]}
                  </Badge>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
