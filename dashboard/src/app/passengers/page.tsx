// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/utils';
import { Search } from 'lucide-react';

interface Passenger {
  id:                 string;
  name:               string;
  email:              string;
  phone:              string;
  state_code:         string;
  is_active:          boolean;
  created_at:         string;
  rating_avg:         number;
  total_rides:        number;
  stripe_customer_id: string | null;
}

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]             = useState(0);
  const limit = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listPassengers({
        limit,
        offset: page * limit,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      setPassengers(data?.data?.passengers ?? []);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell title="Passengers" subtitle="All registered passengers">
      <Card>
        <div className="flex gap-3 mb-5">
          <Input
            placeholder="Search by name or email…"
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="max-w-xs"
          />
        </div>

        {loading ? <SkeletonTable rows={10} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left pb-3 pr-4">Passenger</th>
                    <th className="text-left pb-3 pr-4">Phone</th>
                    <th className="text-left pb-3 pr-4">State (US)</th>
                    <th className="text-right pb-3 pr-4">Rides</th>
                    <th className="text-right pb-3 pr-4">Rating</th>
                    <th className="text-left pb-3 pr-4">Stripe</th>
                    <th className="text-left pb-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {passengers.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">No results</td></tr>
                  )}
                  {passengers.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{p.phone}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                          {p.state_code ?? '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-gray-800">{p.total_rides}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className="font-semibold text-amber-600">
                          ⭐ {p.rating_avg != null ? parseFloat(String(p.rating_avg)).toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {p.stripe_customer_id
                          ? <span className="text-xs text-green-700 font-semibold">✓ Configurado</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="py-3 text-xs text-gray-400">{timeAgo(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
              <p className="text-gray-500">Page {page + 1}</p>
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
                  disabled={passengers.length < limit}
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
