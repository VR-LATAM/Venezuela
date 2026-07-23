// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { HeatMap } from '@/components/maps/HeatMap';
import { adminApi, type HeatPoint } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const HOURS_OPTIONS = [1, 3, 6, 12, 24];
const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

interface SurgeStatus {
  periods: { state_code: string; multiplier: number; reason: string; ends_at: string }[];
}

interface KPIs {
  ridesToday: number;
  ridesWeek: number;
  ridesMonth: number;
  revenueToday: number;
  revenueMonth: number;
  activeDrivers: number;
  avgRating: number;
  cancelRate: number;
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [heatmap, setHeatmap]   = useState<HeatPoint[]>([]);
  const [surge, setSurge]       = useState<SurgeStatus | null>(null);
  const [kpis, setKpis]         = useState<KPIs | null>(null);
  const [hours, setHours]       = useState(6);
  const [stateCode, setStateCode] = useState('');
  const [loading, setLoading]   = useState(true);
  const [mapLoading, setMapLoading] = useState(true);

  const loadKpis = useCallback(async () => {
    const [kpisRes, surgeRes] = await Promise.all([
      adminApi.kpis(),
      adminApi.surgeStatus(),
    ]);
    const raw = kpisRes.data?.data;
    setKpis({
      ridesToday:    raw?.ridesTotal?.today     ?? 0,
      ridesWeek:     raw?.ridesTotal?.thisWeek  ?? 0,
      ridesMonth:    raw?.ridesTotal?.thisMonth ?? 0,
      revenueToday:  raw?.revenue?.today        ?? 0,
      revenueMonth:  raw?.revenue?.thisMonth    ?? 0,
      activeDrivers: raw?.activeDrivers         ?? 0,
      avgRating:     raw?.avgPassengerRating    ?? 0,
      cancelRate:    (raw?.cancellationRate     ?? 0) / 100,
    });
    setSurge(surgeRes.data);
    setLoading(false);
  }, []);

  const loadHeatmap = useCallback(async () => {
    setMapLoading(true);
    try {
      const { data } = await adminApi.demandHeatmap(hours, stateCode || undefined);
      setHeatmap(data?.data?.heatmap ?? data?.data?.points ?? []);
    } finally {
      setMapLoading(false);
    }
  }, [hours, stateCode]);

  useEffect(() => { loadKpis(); }, [loadKpis]);
  useEffect(() => { loadHeatmap(); }, [loadHeatmap]);

  return (
    <AdminShell title="Analytics" subtitle="Demand, surge pricing & platform KPIs">

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5"><Skeleton className="h-16" /></div>
            ))
          : [
              { label: 'Rides today',        value: kpis?.ridesToday ?? 0 },
              { label: 'Revenue today',      value: formatCurrency(kpis?.revenueToday ?? 0) },
              { label: 'Active drivers',     value: kpis?.activeDrivers ?? 0 },
              { label: 'Cancellation rate',  value: `${((kpis?.cancelRate ?? 0) * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="card p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
              </div>
            ))
        }
      </div>

      {/* Heatmap de demanda */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <p className="text-sm font-semibold text-gray-700">Demand heatmap</p>
          <span className="text-gray-300">|</span>

          {/* Hours selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {HOURS_OPTIONS.map(h => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  hours === h ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>

          {/* State filter */}
          <select
            value={stateCode}
            onChange={e => setStateCode(e.target.value)}
            className="input-base w-32 h-8 text-xs"
          >
            <option value="">All</option>
            {US_STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <p className="ml-auto text-xs text-gray-400">{heatmap.length} demand points</p>
        </div>

        {mapLoading
          ? <Skeleton className="h-[480px] rounded-xl" />
          : <HeatMap points={heatmap} height={480} />
        }
      </Card>

      {/* Surge activo */}
      <Card>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Active surge pricing
        </p>
        {loading ? <Skeleton className="h-24" /> : (
          surge?.periods && surge.periods.length > 0 ? (
            <div className="space-y-2">
              {surge.periods.map(p => (
                <div key={p.state_code} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold rounded bg-amber-200 text-amber-800 px-2 py-0.5">
                      {p.state_code}
                    </span>
                    <p className="text-sm text-amber-900 font-medium">{p.reason}</p>
                  </div>
                  <span className="text-lg font-bold text-amber-700">{p.multiplier}×</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No active surge periods right now</p>
          )
        )}
      </Card>
    </AdminShell>
  );
}
