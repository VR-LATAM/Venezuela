// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ClinicShell } from '@/components/ClinicShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { clinicApi } from '@/lib/api';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const SERVICE_TYPES = [
  { value: 'accessible', label: 'Accessible (WAV / Wheelchair)' },
  { value: 'medical',    label: 'Medical (Post-op / Post-partum)' },
  { value: 'dialysis',   label: 'Dialysis' },
  { value: 'standard',   label: 'Standard' },
];

export default function NewClinicRequestPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    patient_name:    '',
    patient_phone:   '',
    pickup_address:  '',
    dropoff_address: '',
    scheduled_at:    '',
    service_type:    'accessible',
    diagnosis_code:  '',
    notes:           '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        patient_name:    form.patient_name,
        pickup_address:  form.pickup_address,
        dropoff_address: form.dropoff_address,
        scheduled_at:    new Date(form.scheduled_at).toISOString(),
        service_type:    form.service_type,
      };
      if (form.patient_phone)  payload.patient_phone  = form.patient_phone;
      if (form.diagnosis_code) payload.diagnosis_code = form.diagnosis_code;
      if (form.notes)          payload.notes          = form.notes;

      await clinicApi.createRequest(payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ClinicShell title="New Request" subtitle="Transport request submitted">
        <div className="max-w-md mx-auto">
          <Card className="text-center p-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Request Submitted!</h2>
            <p className="text-gray-500 mb-6">
              Your transport request has been received. Our team will assign a driver and you will be notified.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" onClick={() => setSuccess(false)}>Submit Another Request</Button>
              <Link href="/clinic/requests" className="btn-secondary text-center">View All Requests</Link>
            </div>
          </Card>
        </div>
      </ClinicShell>
    );
  }

  return (
    <ClinicShell title="New Transport Request" subtitle="Schedule a ride for your patient">
      <div className="max-w-2xl mx-auto">
        <Link href="/clinic/requests" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Requests
        </Link>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Patient info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-base" placeholder="Full name"
                    value={form.patient_name} onChange={e => set('patient_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    className="input-base" placeholder="+1 (555) 000-0000" type="tel"
                    value={form.patient_phone} onChange={e => set('patient_phone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Trip Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-base" placeholder="123 Main St, Houston, TX 77001"
                    value={form.pickup_address} onChange={e => set('pickup_address', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dropoff Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-base" placeholder="456 Oak Ave, Houston, TX 77002"
                    value={form.dropoff_address} onChange={e => set('dropoff_address', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Schedule & service */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-base" type="datetime-local"
                  value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
                  required min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  className="input-base"
                  value={form.service_type} onChange={e => set('service_type', e.target.value)}
                >
                  {SERVICE_TYPES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Medical info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Medical Information (optional)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis Code (ICD-10)
                  </label>
                  <input
                    className="input-base font-mono" placeholder="e.g. Z51.0"
                    value={form.diagnosis_code} onChange={e => set('diagnosis_code', e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes</label>
                  <textarea
                    className="input-base resize-none h-24"
                    placeholder="Wheelchair, oxygen tank, mobility limitations, required assistance, etc."
                    value={form.notes} onChange={e => set('notes', e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{form.notes.length}/500</p>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/clinic/requests" className="btn-secondary">Cancel</Link>
              <Button type="submit" variant="primary" loading={loading}>
                Submit Request
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ClinicShell>
  );
}
