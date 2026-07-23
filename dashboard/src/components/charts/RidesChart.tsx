// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '@/lib/utils';

interface DayRevenue {
  day:   string;
  rides: number;
}

export function RidesChart({ data }: { data: DayRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={d => formatDate(d, 'dd MMM')}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          width={35}
        />
        <Tooltip
          formatter={(value: number) => [value, 'Rides']}
          labelFormatter={d => formatDate(d, 'dd MMMM yyyy')}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="rides" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
