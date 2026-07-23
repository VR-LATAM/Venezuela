// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DayRevenue {
  day:        string;
  revenue:    number;
  commission: number;
  rides:      number;
}

export function RevenueChart({ data }: { data: DayRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCommission" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis
          dataKey="day"
          tickFormatter={d => formatDate(d, 'dd MMM')}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'revenue' ? 'Gross revenue' : 'Commission',
          ]}
          labelFormatter={d => formatDate(d, 'dd MMMM yyyy')}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#gradRevenue)"
        />
        <Area
          type="monotone"
          dataKey="commission"
          stroke="#10B981"
          strokeWidth={2}
          fill="url(#gradCommission)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
