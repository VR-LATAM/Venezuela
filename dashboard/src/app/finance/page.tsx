// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { RidesChart } from '@/components/charts/RidesChart';
import { adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const PERIODS = [
  { label: '7 days',   days: 7 },
  { label: '30 days',  days: 30 },
  { label: '90 days',  days: 90 },
];

interface FinanceData {
  dailyRevenue: { day: string; revenue: number; rides: number; commission: number }[];
  totals:       { revenue: number; commission: number; rides: number; failedPayments: number };
  topDrivers:   { name: string; earned: number; trips: number }[];
  pendingPayouts: { count: number; total: number };
  days:         number;
}

export default function FinancePage() {
  const [data, setData]     = useState<FinanceData | null>(null);
  const [days, setDays]     = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await adminApi.financeSummary(days);
      setData(d?.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell title="Finance" subtitle="Platform financial summary">

      {/* Period selector */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              days === p.days ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI totals */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : [
              { label: 'Gross revenue',         value: formatCurrency(data?.totals.revenue ?? 0),    color: 'text-blue-700' },
              { label: 'Verona Ride commission', value: formatCurrency(data?.totals.commission ?? 0), color: 'text-green-700' },
              { label: 'Completed rides',        value: (data?.totals.rides ?? 0).toLocaleString(),   color: 'text-gray-900' },
              { label: 'Failed payments',        value: (data?.totals.failedPayments ?? 0).toLocaleString(), color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
              </Card>
            ))
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Daily revenue & commission
          </p>
          {loading || !data
            ? <Skeleton className="h-[220px]" />
            : <RevenueChart data={data.dailyRevenue} />
          }
        </Card>
        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Rides per day
          </p>
          {loading || !data
            ? <Skeleton className="h-[220px]" />
            : <RidesChart data={data.dailyRevenue} />
          }
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Top conductores */}
        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Top 10 drivers by earnings
          </p>
          {loading ? <Skeleton className="h-48" /> : (
            <div className="space-y-2">
              {(data?.topDrivers ?? []).map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-bold text-gray-400 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.trips} rides</p>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(d.earned)}</span>
                </div>
              ))}
              {(data?.topDrivers ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No data for this period</p>
              )}
            </div>
          )}
        </Card>

        {/* Pending withdrawals */}
        <Card>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Pending withdrawals
          </p>
          {loading ? <Skeleton className="h-32" /> : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-5xl font-bold text-gray-900">
                {data?.pendingPayouts.count ?? 0}
              </p>
              <p className="text-gray-500 text-sm">withdrawal requests</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(data?.pendingPayouts.total ?? 0)}
              </p>
              <p className="text-gray-400 text-xs">total requested</p>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
