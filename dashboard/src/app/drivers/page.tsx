// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { adminApi, type Driver } from '@/lib/api';
import { STATUS_DRIVER, formatDate, timeAgo } from '@/lib/utils';
import { Search, RefreshCw, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type TabKey = 'all' | 'under_review' | 'active' | 'suspended';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'under_review', label: 'Under review' },
  { key: 'active',       label: 'Active' },
  { key: 'suspended',    label: 'Suspended' },
];

export default function DriversPage() {
  const [tab, setTab]         = useState<TabKey>('all');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  // Modal de acción
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject' | 'suspend';
    driver: Driver;
  } | null>(null);
  const [reason, setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (tab !== 'all') params.status = tab;
      const { data } = await adminApi.listDrivers(params);
      setDrivers(data?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = drivers.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      const { type, driver } = actionModal;
      if (type === 'approve') await adminApi.approveDriver(driver.id);
      if (type === 'reject')  await adminApi.rejectDriver(driver.id, reason);
      if (type === 'suspend') await adminApi.suspendDriver(driver.id, reason);
      setActionModal(null);
      setReason('');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell title="Drivers" subtitle="Driver management and approvals">

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
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
          <Input
            placeholder="Search by name or email…"
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <button onClick={load} className="ml-auto text-gray-400 hover:text-gray-700">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        {loading ? <SkeletonTable rows={8} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-3 pr-4">Driver</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3 pr-4">Training</th>
                  <th className="text-left pb-3 pr-4">Vehicle</th>
                  <th className="text-left pb-3 pr-4">Rating</th>
                  <th className="text-left pb-3 pr-4">Rides</th>
                  <th className="text-left pb-3 pr-4">Registered</th>
                  <th className="text-left pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No results</td></tr>
                )}
                {filtered.map(d => {
                  const st = STATUS_DRIVER[d.status] ?? { label: d.status, color: 'text-gray-600 bg-gray-100' };
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-semibold text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-400">{d.email}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={st.color} dot>{st.label}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const completed = (d as any).training_completed ?? 0;
                          const total     = (d as any).training_total ?? 5;
                          const done      = completed >= total;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                              done
                                ? 'text-emerald-700 bg-emerald-100'
                                : completed > 0
                                  ? 'text-amber-700 bg-amber-100'
                                  : 'text-gray-500 bg-gray-100'
                            }`}>
                              {done ? '✓' : '📚'} {completed}/{total}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {d.vehicle_color} {d.vehicle_brand} {d.vehicle_model}
                        <span className="block text-xs text-gray-400">{d.vehicle_plate}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-amber-600">⭐ {d.rating_avg != null ? parseFloat(String(d.rating_avg)).toFixed(1) : '—'}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{d.total_rides}</td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{timeAgo(d.created_at)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {d.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => setActionModal({ type: 'approve', driver: d })}
                                className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setActionModal({ type: 'reject', driver: d })}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {d.status === 'active' && (
                            <button
                              onClick={() => setActionModal({ type: 'suspend', driver: d })}
                              className="rounded-lg p-1.5 text-orange-500 hover:bg-orange-50"
                              title="Suspend"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                          <Link href={`/drivers/${d.id}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Action Modal */}
      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setReason(''); }}
        title={
          actionModal?.type === 'approve' ? `Approve ${actionModal.driver.name}` :
          actionModal?.type === 'reject'  ? `Reject ${actionModal.driver.name}` :
          `Suspend ${actionModal?.driver.name}`
        }
        size="sm"
      >
        {actionModal?.type === 'approve' ? (
          <p className="text-sm text-gray-600 mb-4">
            Confirm driver approval? They will gain full access to the platform.
          </p>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input-base resize-none h-24"
              placeholder="Describe the reason (min. 10 characters)…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setActionModal(null)}>Cancel</Button>
          <Button
            variant={actionModal?.type === 'approve' ? 'primary' : 'danger'}
            loading={submitting}
            disabled={actionModal?.type !== 'approve' && reason.length < 10}
            onClick={handleAction}
          >
            {actionModal?.type === 'approve' ? 'Approve driver' :
             actionModal?.type === 'reject'  ? 'Reject driver' : 'Suspend driver'}
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
