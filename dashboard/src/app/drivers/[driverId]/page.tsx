// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminApi, type Driver, type DriverTrainingStatus } from '@/lib/api';
import { STATUS_DRIVER, formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';

const TRAINING_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  passed:     { label: '✓ Passed',      cls: 'text-emerald-700 bg-emerald-50 border border-emerald-200' },
  failed:     { label: '✗ Failed',      cls: 'text-red-700 bg-red-50 border border-red-200' },
  reading:    { label: '📖 In progress', cls: 'text-blue-700 bg-blue-50 border border-blue-200' },
  not_started:{ label: 'Pending',       cls: 'text-gray-500 bg-gray-100 border border-gray-200' },
};

export default function DriverDetailPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const router = useRouter();
  const [driver, setDriver]       = useState<Driver & Record<string, unknown> | null>(null);
  const [training, setTraining]   = useState<DriverTrainingStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<'approve' | 'reject' | 'suspend' | 'reactivate' | null>(null);
  const [reason, setReason]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      adminApi.getDriver(driverId),
      adminApi.getDriverTraining(driverId),
    ]).then(([driverRes, trainingRes]) => {
      setDriver(driverRes.data?.driver ?? driverRes.data);
      setTraining(trainingRes.data?.data ?? null);
    }).finally(() => setLoading(false));
  }, [driverId]);

  const handleAction = async () => {
    if (!driver) return;
    setSubmitting(true);
    try {
      if (modal === 'approve')    await adminApi.approveDriver(driver.id);
      if (modal === 'reject')     await adminApi.rejectDriver(driver.id, reason);
      if (modal === 'suspend')    await adminApi.suspendDriver(driver.id, reason);
      if (modal === 'reactivate') await adminApi.reactivateDriver(driver.id);

      const { data } = await adminApi.getDriver(driver.id);
      setDriver(data?.driver ?? data);
      setModal(null);
      setReason('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Driver detail">
        <Skeleton className="h-64 rounded-xl" />
      </AdminShell>
    );
  }

  if (!driver) {
    return (
      <AdminShell title="Driver not found">
        <p className="text-gray-500">The driver does not exist or was deleted.</p>
      </AdminShell>
    );
  }

  const st = STATUS_DRIVER[driver.status as string] ?? { label: driver.status as string, color: 'text-gray-600 bg-gray-100' };

  const docs = [
    { label: "Driver's license",        key: 'license_front_url' },
    { label: "License (back)",          key: 'license_back_url' },
    { label: "Vehicle insurance",       key: 'insurance_url' },
    { label: "Vehicle registration",    key: 'registration_url' },
    { label: "Profile photo",           key: 'profile_photo_url' },
    { label: "Vehicle photo",           key: 'vehicle_photo_url' },
  ] as const;

  return (
    <AdminShell title="Driver detail">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to drivers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda — Info + acciones */}
        <div className="space-y-5">
          <Card>
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
                {(driver.name as string).charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{driver.name as string}</h2>
              <p className="text-sm text-gray-400">{driver.email as string}</p>
              <div className="mt-2 flex justify-center">
                <Badge className={st.color} dot>{st.label}</Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Phone', driver.phone],
                ['State', driver.state_code],
                ['Rating', driver.rating_avg != null ? `⭐ ${parseFloat(String(driver.rating_avg)).toFixed(2)}` : '—'],
                ['Total rides', driver.total_rides],
                ['Registered', formatDate(driver.created_at as string)],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-800">{v as string}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Acciones */}
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
            <div className="space-y-2">
              {driver.status === 'under_review' && (
                <>
                  <Button variant="primary" className="w-full" onClick={() => setModal('approve')}>
                    <CheckCircle className="w-4 h-4" /> Approve driver
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => setModal('reject')}>
                    <XCircle className="w-4 h-4" /> Reject driver
                  </Button>
                </>
              )}
              {driver.status === 'active' && (
                <Button variant="danger" className="w-full" onClick={() => setModal('suspend')}>
                  <AlertCircle className="w-4 h-4" /> Suspend driver
                </Button>
              )}
              {(driver.status === 'suspended' || driver.status === 'rejected') && (
                <Button variant="secondary" className="w-full" onClick={() => setModal('reactivate')}>
                  <RotateCcw className="w-4 h-4" /> Reactivate driver
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Columna derecha — Vehículo + Docs */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Vehicle</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Brand',         driver.vehicle_brand],
                ['Model',         driver.vehicle_model],
                ['Color',         driver.vehicle_color],
                ['Year',          driver.vehicle_year],
                ['Plate',         driver.vehicle_plate],
                ['Service type',  driver.service_types],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-xs text-gray-400">{k as string}</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{
                    Array.isArray(v) ? (v as string[]).join(', ') : (v as string) ?? '—'
                  }</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Documents</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {docs.map(({ label, key }) => {
                const url = driver[key] as string | null;
                return (
                  <a
                    key={key}
                    href={url ?? '#'}
                    target={url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`rounded-xl border-2 p-3 text-center text-xs font-semibold transition ${
                      url
                        ? 'border-primary-200 text-primary-700 hover:bg-primary-50'
                        : 'border-dashed border-gray-200 text-gray-400 cursor-default'
                    }`}
                  >
                    {url ? '📄' : '⬜'}<br />
                    <span className="mt-1 block leading-tight">{label}</span>
                  </a>
                );
              })}
            </div>
          </Card>

          {/* Training progress */}
          {training && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Training</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  training.isComplete
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-amber-700 bg-amber-100'
                }`}>
                  {training.completed}/{training.total} modules
                </span>
              </div>
              <div className="space-y-2">
                {training.modules.map(m => {
                  const st = TRAINING_STATUS_STYLE[m.progress?.status ?? 'not_started'];
                  return (
                    <div key={m.module_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {m.title.replace(/^Module \d+: /, '')}
                        </p>
                        {m.progress?.last_score != null && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Score: {m.progress.last_score}/{m.total_questions} · {m.progress.attempts} attempt{m.progress.attempts !== 1 ? 's' : ''}
                            {m.progress.passed_at && ` · ${formatDate(m.progress.passed_at)}`}
                          </p>
                        )}
                      </div>
                      <span className={`ml-3 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        open={!!modal}
        onClose={() => { setModal(null); setReason(''); }}
        title={
          modal === 'approve'    ? 'Approve driver' :
          modal === 'reject'     ? 'Reject driver' :
          modal === 'suspend'    ? 'Suspend driver' :
          'Reactivate driver'
        }
        size="sm"
      >
        {(modal === 'reject' || modal === 'suspend') ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input-base resize-none h-24"
              placeholder="Minimum 10 characters…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            {modal === 'approve' && 'Confirm driver approval?'}
            {modal === 'reactivate' && 'Confirm driver reactivation?'}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button
            variant={modal === 'approve' || modal === 'reactivate' ? 'primary' : 'danger'}
            loading={submitting}
            disabled={(modal === 'reject' || modal === 'suspend') && reason.length < 10}
            onClick={handleAction}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
