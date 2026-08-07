// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { adminApi, type ClinicAccount, type ClinicRequest } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { ArrowLeft, RefreshCw, KeyRound, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';

const STATUS_CLINIC: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'text-amber-700  bg-amber-100' },
  scheduled:   { label: 'Scheduled',   color: 'text-blue-700   bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-indigo-700 bg-indigo-100' },
  completed:   { label: 'Completed',   color: 'text-green-700  bg-green-100' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-700    bg-red-100' },
};

const PLAN_BADGE: Record<string, string> = {
  basic:        'text-gray-700  bg-gray-100',
  professional: 'text-blue-700  bg-blue-100',
  enterprise:   'text-purple-700 bg-purple-100',
};

export default function ClinicDetailPage() {
  const { clinicId } = useParams<{ clinicId: string }>();

  const [clinic,   setClinic]   = useState<ClinicAccount | null>(null);
  const [requests, setRequests] = useState<ClinicRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [resetModal,  setResetModal]  = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [resetting,   setResetting]   = useState(false);
  const [toggling,    setToggling]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all clinics and filter — backend doesn't have GET /admin/clinics/:id yet
      const [cRes, rRes] = await Promise.all([
        adminApi.listClinics(),
        adminApi.clinicAllRequests(),
      ]);
      const all    = cRes.data?.data?.clinics ?? [];
      const found  = all.find((c: ClinicAccount) => c.id === clinicId) ?? null;
      setClinic(found);
      const allReqs: ClinicRequest[] = rRes.data?.data?.requests ?? [];
      setRequests(allReqs.filter(r => r.clinic_id === clinicId));
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => {
    if (!clinic) return;
    setToggling(true);
    try {
      await adminApi.toggleClinic(clinic.id, !clinic.is_active);
      load();
    } finally {
      setToggling(false);
    }
  };

  const handleResetPassword = async () => {
    if (!clinic || newPassword.length < 8) return;
    setResetting(true);
    try {
      await adminApi.resetClinicPassword(clinic.id, newPassword);
      setResetModal(false);
      setNewPassword('');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Clinic" subtitle="Loading…">
        <div className="py-20 text-center text-gray-400">Loading…</div>
      </AdminShell>
    );
  }

  if (!clinic) {
    return (
      <AdminShell title="Clinic not found">
        <div className="py-20 text-center text-gray-400">
          <p>Clinic not found.</p>
          <Link href="/clinics" className="mt-4 inline-block btn-secondary">← Back to Clinics</Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={clinic.name} subtitle="Clinic detail and request history">
      <Link href="/clinics" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Clinics
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Clinic info card */}
        <Card className="lg:col-span-1 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">{clinic.name}</h2>
            <Badge className={clinic.is_active ? 'text-green-700 bg-green-100' : 'text-gray-600 bg-gray-100'} dot>
              {clinic.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {clinic.contact_name  && <p><span className="text-gray-400">Contact:</span> {clinic.contact_name}</p>}
            {clinic.contact_email && <p><span className="text-gray-400">Email:</span> {clinic.contact_email}</p>}
            {clinic.contact_phone && <p><span className="text-gray-400">Phone:</span> {clinic.contact_phone}</p>}
            {clinic.address       && <p><span className="text-gray-400">Address:</span> {clinic.address}</p>}
            {clinic.billing_code  && <p><span className="text-gray-400">Billing:</span> <code className="font-mono text-xs">{clinic.billing_code}</code></p>}
          </div>

          <div>
            <Badge className={PLAN_BADGE[clinic.plan] ?? PLAN_BADGE.basic + ' capitalize'}>
              {clinic.plan} plan
            </Badge>
          </div>

          <div className="pt-2 space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">API Key</p>
            <code className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all block bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
              {clinic.api_key}
            </code>
          </div>

          <p className="text-xs text-gray-400">Added {timeAgo(clinic.created_at)}</p>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => { setResetModal(true); setNewPassword(''); setShowPw(false); }}
            >
              <KeyRound className="w-4 h-4" /> Reset Password
            </Button>
            <Button
              variant={clinic.is_active ? 'danger' : 'primary'}
              loading={toggling}
              onClick={handleToggle}
            >
              {clinic.is_active
                ? <><ToggleLeft  className="w-4 h-4" /> Deactivate</>
                : <><ToggleRight className="w-4 h-4" /> Activate</>
              }
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 content-start">
          {[
            { label: 'Total',     value: clinic.total_requests   ?? requests.length, color: 'text-blue-600'  },
            { label: 'Pending',   value: requests.filter(r => r.status === 'pending').length,   color: 'text-amber-600' },
            { label: 'Completed', value: requests.filter(r => r.status === 'completed').length, color: 'text-green-600' },
            { label: 'Cancelled', value: requests.filter(r => r.status === 'cancelled').length, color: 'text-red-600'   },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Requests table */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Transport Requests</h2>
          <button onClick={load} className="text-gray-400 hover:text-gray-700">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No requests from this clinic yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-3 pr-4">Patient</th>
                  <th className="text-left pb-3 pr-4">Route</th>
                  <th className="text-left pb-3 pr-4">Scheduled</th>
                  <th className="text-left pb-3 pr-4">Type</th>
                  <th className="text-left pb-3 pr-4">Dx Code</th>
                  <th className="text-left pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => {
                  const st = STATUS_CLINIC[r.status] ?? { label: r.status, color: 'text-gray-600 bg-gray-100' };
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-900">{r.patient_name}</p>
                        {r.patient_phone && <p className="text-xs text-gray-400">{r.patient_phone}</p>}
                      </td>
                      <td className="py-3 pr-4 max-w-[180px]">
                        <p className="truncate text-xs text-gray-600">{r.pickup_address}</p>
                        <p className="truncate text-xs text-gray-400">→ {r.dropoff_address}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600 whitespace-nowrap">
                        {formatDateTime(r.scheduled_at)}
                      </td>
                      <td className="py-3 pr-4 capitalize text-gray-600">{r.service_type}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-500">{r.diagnosis_code ?? '—'}</td>
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

      {/* Reset password modal */}
      <Modal
        open={resetModal}
        onClose={() => setResetModal(false)}
        title={`Reset Password — ${clinic.name}`}
        size="sm"
      >
        <p className="text-sm text-gray-500 mb-4">Set a new portal password for this clinic.</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-base pr-10"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={8}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setResetModal(false)}>Cancel</Button>
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
