import * as React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, BarChart3Icon } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type FuelType = 'E5' | 'E10' | 'Diesel' | 'Super Diesel' | 'B10' | 'HVO';

const fuelTypes: { label: string; value: FuelType }[] = [
  { label: 'E5 (Super Unleaded)', value: 'E5' },
  { label: 'E10 (Regular Unleaded)', value: 'E10' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'Super Diesel', value: 'Super Diesel' },
  { label: 'B10 (Biodiesel)', value: 'B10' },
  { label: 'HVO (Renewable Diesel)', value: 'HVO' },
];

const timeRangeOptions = [
  { label: 'Last 24 Hours', value: 1 },
  { label: 'Last 3 Days', value: 3 },
  { label: 'Last Week', value: 7 },
  { label: 'Last 2 Weeks', value: 14 },
  { label: 'Last Month', value: 30 },
  { label: 'Last 3 Months', value: 90 },
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

  // Fetch price history from Convex
  const priceHistory = useQuery(api.fuelPrices.getPriceHistory, {
    stationId,
    fuelType,
    daysBack,
  });

  // Transform data for recharts
  const chartData = React.useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];

    return priceHistory
      .map((record) => {
        const date = new Date(record.recordedAt);
        
        // Format based on time range
        let dateLabel: string;
        if (daysBack <= 1) {
          // Last 24 hours: show time only
          dateLabel = date.toLocaleString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } else if (daysBack <= 7) {
          // Last week: show day and time
          dateLabel = date.toLocaleString('en-GB', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        } else {
          // Longer periods: show date and time
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
      .reverse(); // Oldest first for graph
  }, [priceHistory, daysBack]);

  // Calculate price statistics
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
      trend:
        priceChange > 0.5 ? 'up' : priceChange < -0.5 ? 'down' : 'stable',
    };
  }, [priceHistory]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="text-xs text-gray-600 mb-1">
            {payload[0].payload.fullDate}
          </p>
          <p className="text-xl font-bold text-blue-600">
            {payload[0].value.toFixed(1)}p
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5" />
              Price History
            </CardTitle>
            {stationName && (
              <CardDescription className="mt-1">{stationName}</CardDescription>
            )}
          </div>

          {/* Fuel Type & Time Range Selectors */}
          <div className="flex gap-2">
            <Select
              value={fuelType}
              onValueChange={(value) => setFuelType(value as FuelType)}
            >
              <SelectTrigger className="w-[180px]">
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

            <Select
              value={daysBack.toString()}
              onValueChange={(value) => value && setDaysBack(parseInt(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {timeRangeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Price Statistics */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {/* Current Price */}
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-gray-600">Current</p>
              <p className="text-2xl font-bold text-blue-600">{stats.current}p</p>
            </div>

            {/* Price Change */}
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Change</p>
              <div className="flex items-center gap-1">
                {stats.trend === 'up' && (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                )}
                {stats.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
                {stats.trend === 'stable' && (
                  <Minus className="h-4 w-4 text-gray-500" />
                )}
                <p
                  className={`text-xl font-bold ${
                    stats.trend === 'up'
                      ? 'text-red-600'
                      : stats.trend === 'down'
                        ? 'text-green-600'
                        : 'text-gray-600'
                  }`}
                >
                  {stats.change}p
                </p>
              </div>
              <p className="text-xs text-gray-500">({stats.changePercent}%)</p>
            </div>

            {/* Min Price */}
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-gray-600">Lowest</p>
              <p className="text-2xl font-bold text-green-600">{stats.min}p</p>
            </div>

            {/* Max Price */}
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-gray-600">Highest</p>
              <p className="text-2xl font-bold text-red-600">{stats.max}p</p>
            </div>

            {/* Average Price */}
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Average</p>
              <p className="text-2xl font-bold text-gray-600">{stats.avg}p</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {priceHistory === undefined && (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-gray-500">Loading price history...</p>
          </div>
        )}

        {/* No Data State */}
        {priceHistory && priceHistory.length === 0 && (
          <div className="flex h-[300px] items-center justify-center">
            <div className="text-center">
              <BarChart3Icon className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-gray-500">
                No price history available for {fuelType}
              </p>
              <p className="text-sm text-gray-400">
                Try selecting a different fuel type or time range
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  label={{
                    value: 'Price (pence)',
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={`${fuelType} Price (p)`}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Data Summary */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Badge variant="outline">
                {chartData.length} price {chartData.length === 1 ? 'point' : 'points'}{' '}
                recorded
              </Badge>
              {chartData.length > 1 && (
                <>
                  <Badge variant="outline" className="text-xs">
                    First: {chartData[0].fullDate}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Latest: {chartData[chartData.length - 1].fullDate}
                  </Badge>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
