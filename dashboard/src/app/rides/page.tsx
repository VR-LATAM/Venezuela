// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { adminApi, type Ride } from '@/lib/api';
import { STATUS_RIDE, formatCurrency, formatDateTime } from '@/lib/utils';
import { Search } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function RidesPage() {
  const [rides, setRides]     = useState<Ride[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const limit = 50;

  const [filters, setFilters] = useState({
    status:    '',
    stateCode: '',
    dateFrom:  '',
    dateTo:    '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit, offset: page * limit };
      if (filters.status)    params.status    = filters.status;
      if (filters.stateCode) params.stateCode = filters.stateCode;
      if (filters.dateFrom)  params.dateFrom  = filters.dateFrom;
      if (filters.dateTo)    params.dateTo    = filters.dateTo;
      const { data } = await adminApi.listRides(params);
      setRides(data?.data?.rides ?? []);
      setTotal(data?.data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell title="Rides" subtitle={`${total.toLocaleString()} total rides`}>

      {/* Filtros */}
      <Card className="mb-5">
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(0); }}
            className="input-base w-44"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_RIDE).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={filters.stateCode}
            onChange={e => { setFilters(f => ({ ...f, stateCode: e.target.value })); setPage(0); }}
            className="input-base w-36"
          >
            <option value="">All states</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <Input
            type="date"
            value={filters.dateFrom}
            onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(0); }}
            className="w-40"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(0); }}
            className="w-40"
          />
        </div>
      </Card>

      <Card>
        {loading ? <SkeletonTable rows={10} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left pb-3 pr-4">Passenger</th>
                    <th className="text-left pb-3 pr-4">Driver</th>
                    <th className="text-left pb-3 pr-4">Status</th>
                    <th className="text-left pb-3 pr-4">Type</th>
                    <th className="text-left pb-3 pr-4">State (US)</th>
                    <th className="text-right pb-3 pr-4">Total</th>
                    <th className="text-right pb-3 pr-4">Commission</th>
                    <th className="text-left pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rides.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400">No rides for the selected filters</td></tr>
                  )}
                  {rides.map(r => {
                    const st = STATUS_RIDE[r.status] ?? { label: r.status, color: 'text-gray-600 bg-gray-100' };
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 pr-4 font-medium text-gray-900">{r.passenger_name}</td>
                        <td className="py-3 pr-4 text-gray-600">{r.driver_name ?? '—'}</td>
                        <td className="py-3 pr-4">
                          <Badge className={st.color} dot>{st.label}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 capitalize">{r.service_type}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                            {r.state_code}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                          {r.total_charged ? formatCurrency(r.total_charged) : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right text-green-700 font-medium">
                          {r.platform_commission ? formatCurrency(r.platform_commission) : '—'}
                        </td>
                        <td className="py-3 text-gray-400 text-xs">{formatDateTime(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
              <p className="text-gray-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </AdminShell>
  );
}
