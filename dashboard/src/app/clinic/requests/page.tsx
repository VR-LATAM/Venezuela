// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClinicShell } from '@/components/ClinicShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { clinicApi, type ClinicRequest } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { PlusCircle, RefreshCw, XCircle, ClipboardList, Search } from 'lucide-react';

const STATUS_CLINIC: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'text-amber-700  bg-amber-100' },
  scheduled:   { label: 'Scheduled',   color: 'text-blue-700   bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-indigo-700 bg-indigo-100' },
  completed:   { label: 'Completed',   color: 'text-green-700  bg-green-100' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700    bg-red-100' },
};

type StatusFilter = 'all' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'scheduled',   label: 'Scheduled' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
];

export default function ClinicRequestsPage() {
  const [requests,   setRequests]   = useState<ClinicRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<StatusFilter>('all');
  const [search,     setSearch]     = useState('');
  const [cancelRow,  setCancelRow]  = useState<ClinicRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clinicApi.getRequests();
      setRequests(data.data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (search && !r.patient_name.toLowerCase().includes(search.toLowerCase()) &&
        !r.pickup_address.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCancel = async () => {
    if (!cancelRow) return;
    setCancelling(true);
    try {
      await clinicApi.cancelRequest(cancelRow.id);
      setCancelRow(null);
      load();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ClinicShell
      title="Transport Requests"
      subtitle="All patient transport requests"
      action={
        <Link href="/clinic/requests/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> New Request
        </Link>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-base pl-9"
              placeholder="Search patient or address…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={load} className="ml-auto text-gray-400 hover:text-gray-700">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-3 pr-4">Patient</th>
                  <th className="text-left pb-3 pr-4">Pickup → Dropoff</th>
                  <th className="text-left pb-3 pr-4">Scheduled</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Dx Code</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => {
                  const st = STATUS_CLINIC[r.status] ?? { label: r.status, color: 'text-gray-600 bg-gray-100' };
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{r.patient_name}</p>
                        {r.patient_phone && <p className="text-xs text-gray-400">{r.patient_phone}</p>}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 max-w-[200px]">
                        <p className="truncate text-xs">{r.pickup_address}</p>
                        <p className="truncate text-xs text-gray-400">→ {r.dropoff_address}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-xs whitespace-nowrap">
                        {formatDateTime(r.scheduled_at)}
                      </td>
                      <td className="py-3 pr-4 capitalize text-gray-600">{r.service_type}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs font-mono">{r.diagnosis_code ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge className={st.color}>{st.label}</Badge>
                      </td>
                      <td className="py-3">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => setCancelRow(r)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Cancel modal */}
      <Modal
        open={!!cancelRow}
        onClose={() => setCancelRow(null)}
        title="Cancel Transport Request"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Cancel the transport request for <strong>{cancelRow?.patient_name}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelRow(null)}>Keep it</Button>
          <Button variant="danger" loading={cancelling} onClick={handleCancel}>Cancel Request</Button>
        </div>
      </Modal>
    </ClinicShell>
  );
}
