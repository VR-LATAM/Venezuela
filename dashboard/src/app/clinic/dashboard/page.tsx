// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClinicShell } from '@/components/ClinicShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { clinicApi, type ClinicStats, type ClinicRequest } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { ClipboardList, Clock, CheckCircle, XCircle, PlusCircle, RefreshCw } from 'lucide-react';

const STATUS_CLINIC: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'text-amber-700  bg-amber-100' },
  scheduled:   { label: 'Scheduled',   color: 'text-blue-700   bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-indigo-700 bg-indigo-100' },
  completed:   { label: 'Completed',   color: 'text-green-700  bg-green-100' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700    bg-red-100' },
};

export default function ClinicDashboardPage() {
  const [stats,    setStats]    = useState<ClinicStats | null>(null);
  const [recent,   setRecent]   = useState<ClinicRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        clinicApi.stats(),
        clinicApi.getRequests(),
      ]);
      setStats(sRes.data.data.stats);
      setRecent((rRes.data.data.requests ?? []).slice(0, 5));
    } catch {
      // token inválido — ClinicShell se encarga del redirect
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const StatCard = ({ label, value, icon: Icon, color }: {
    label: string; value: number; icon: React.ElementType; color: string;
  }) => (
    <Card className="flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Card>
  );

  return (
    <ClinicShell
      title="Dashboard"
      subtitle="Overview of your transport requests"
      action={
        <Link href="/clinic/requests/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> New Request
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total requests"    value={stats?.total     ?? 0} icon={ClipboardList} color="bg-blue-50   text-blue-600" />
        <StatCard label="Pending"           value={stats?.pending   ?? 0} icon={Clock}         color="bg-amber-50  text-amber-600" />
        <StatCard label="Completed"         value={stats?.completed ?? 0} icon={CheckCircle}   color="bg-green-50  text-green-600" />
        <StatCard label="Cancelled"         value={stats?.cancelled ?? 0} icon={XCircle}       color="bg-red-50    text-red-600" />
      </div>

      {/* Recent requests */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Requests</h2>
          <div className="flex items-center gap-3">
            <button onClick={load} className="text-gray-400 hover:text-gray-700">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/clinic/requests" className="text-sm text-primary-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No requests yet.</p>
            <Link href="/clinic/requests/new" className="mt-3 inline-block btn-primary text-sm">
              Create your first request
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-3 pr-4">Patient</th>
                  <th className="text-left pb-3 pr-4">Pickup</th>
                  <th className="text-left pb-3 pr-4">Scheduled</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(r => {
                  const st = STATUS_CLINIC[r.status] ?? { label: r.status, color: 'text-gray-600 bg-gray-100' };
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{r.patient_name}</p>
                        {r.patient_phone && <p className="text-xs text-gray-400">{r.patient_phone}</p>}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 max-w-[180px] truncate">{r.pickup_address}</td>
                      <td className="py-3 pr-4 text-gray-600 text-xs whitespace-nowrap">{formatDateTime(r.scheduled_at)}</td>
                      <td className="py-3 pr-4 capitalize text-gray-600">{r.service_type}</td>
                      <td className="py-3">
                        <Badge className={st.color}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </ClinicShell>
  );
}
