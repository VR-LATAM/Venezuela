// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { adminApi, type ClinicAccount } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/utils';
import { PlusCircle, RefreshCw, Cross, ToggleLeft, ToggleRight, KeyRound, Search, ChevronRight } from 'lucide-react';

const PLAN_BADGE: Record<string, string> = {
  basic:        'text-gray-700  bg-gray-100',
  professional: 'text-blue-700  bg-blue-100',
  enterprise:   'text-purple-700 bg-purple-100',
};

export default function ClinicsPage() {
  const [clinics,   setClinics]   = useState<ClinicAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  // Reset password modal
  const [resetModal, setResetModal] = useState<ClinicAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting,   setResetting]   = useState(false);
  const [showPw,      setShowPw]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listClinics();
      setClinics(data?.data?.clinics ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clinics.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (c: ClinicAccount) => {
    await adminApi.toggleClinic(c.id, !c.is_active);
    load();
  };

  const handleResetPassword = async () => {
    if (!resetModal || newPassword.length < 8) return;
    setResetting(true);
    try {
      await adminApi.resetClinicPassword(resetModal.id, newPassword);
      setResetModal(null);
      setNewPassword('');
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminShell
      title="Clinics"
      subtitle="NEMT clinic accounts and transport requests"
      action={
        <Link href="/clinics/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> Add Clinic
        </Link>
      }
    >
      <Card>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-base pl-9"
              placeholder="Search by name or email…"
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
            <Cross className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No clinics yet.</p>
            <Link href="/clinics/new" className="mt-3 inline-block btn-primary text-sm">
              Add first clinic
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-3 pr-4">Clinic</th>
                  <th className="text-left pb-3 pr-4">Plan</th>
                  <th className="text-left pb-3 pr-4">Requests</th>
                  <th className="text-left pb-3 pr-4">Pending</th>
                  <th className="text-left pb-3 pr-4">Status</th>
                  <th className="text-left pb-3 pr-4">Registered</th>
                  <th className="text-left pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.contact_email ?? '—'}</p>
                      {c.contact_phone && <p className="text-xs text-gray-400">{c.contact_phone}</p>}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={PLAN_BADGE[c.plan] ?? PLAN_BADGE.basic + ' capitalize'}>
                        {c.plan}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 font-semibold">{c.total_requests ?? 0}</td>
                    <td className="py-3 pr-4">
                      {(c.pending_requests ?? 0) > 0
                        ? <span className="text-amber-600 font-semibold">{c.pending_requests}</span>
                        : <span className="text-gray-400">0</span>
                      }
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={c.is_active ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-100'} dot>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{timeAgo(c.created_at)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(c)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {c.is_active
                            ? <ToggleRight className="w-4 h-4 text-green-600" />
                            : <ToggleLeft  className="w-4 h-4 text-gray-400" />
                          }
                        </button>
                        <button
                          onClick={() => { setResetModal(c); setNewPassword(''); setShowPw(false); }}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <Link href={`/clinics/${c.id}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reset password modal */}
      <Modal
        open={!!resetModal}
        onClose={() => setResetModal(null)}
        title={`Reset Password — ${resetModal?.name}`}
        size="sm"
      >
        <p className="text-sm text-gray-500 mb-4">
          Set a new password for this clinic's web portal access.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-base pr-16"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setResetModal(null)}>Cancel</Button>
          <Button
            variant="primary"
            loading={resetting}
            disabled={newPassword.length < 8}
            onClick={handleResetPassword}
          >
            Save Password
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
