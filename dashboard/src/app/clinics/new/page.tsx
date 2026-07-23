// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/lib/api';
import { CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const PLANS = [
  { value: 'basic',        label: 'Basic',        price: '$49/mo',   desc: 'Up to 50 requests/month' },
  { value: 'professional', label: 'Professional',  price: '$99/mo',   desc: 'Up to 200 requests/month + priority' },
  { value: 'enterprise',   label: 'Enterprise',    price: '$199/mo',  desc: 'Unlimited + dedicated coordinator' },
];

export default function NewClinicPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name:          '',
    contact_name:  '',
    contact_email: '',
    contact_phone: '',
    address:       '',
    billing_code:  '',
    plan:          'basic',
    password:      '',
  });
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [created,  setCreated]  = useState<{ name: string; api_key: string } | null>(null);

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.billing_code) delete payload.billing_code;
      const { data } = await adminApi.createClinic(payload);
      const clinic   = data?.data?.clinic;
      setCreated({ name: clinic.name, api_key: clinic.api_key });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create clinic. Check the fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success && created) {
    return (
      <AdminShell title="New Clinic" subtitle="Clinic account created">
        <div className="max-w-lg mx-auto">
          <Card className="p-8 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {created.name} created!
            </h2>
            <p className="text-gray-500 mb-5">
              The clinic can now log in at{' '}
              <code className="bg-gray-100 px-1 rounded text-sm">/clinic/login</code>{' '}
              using the email and password you set.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">API Key (for direct integration)</p>
              <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                {created.api_key}
              </code>
              <p className="text-xs text-gray-400 mt-1">Share this only if the clinic will use direct API integration.</p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/clinics" className="btn-primary text-center">← Back to Clinics</Link>
              <Button variant="secondary" onClick={() => { setSuccess(false); setForm({ name:'',contact_name:'',contact_email:'',contact_phone:'',address:'',billing_code:'',plan:'basic',password:'' }); }}>
                Add Another Clinic
              </Button>
            </div>
          </Card>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Add Clinic" subtitle="Create a new NEMT clinic account">
      <div className="max-w-2xl mx-auto">
        <Link href="/clinics" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Clinics
        </Link>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Clinic info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Clinic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic Name <span className="text-red-500">*</span>
                  </label>
                  <input className="input-base" placeholder="Houston Dialysis Center"
                    value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input className="input-base" placeholder="123 Medical Dr, Houston, TX 77001"
                    value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Code</label>
                  <input className="input-base font-mono" placeholder="CLINIC-001"
                    value={form.billing_code} onChange={e => set('billing_code', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Contact Person
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input className="input-base" placeholder="Jane Doe"
                    value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input className="input-base" type="email" placeholder="admin@clinic.com"
                    value={form.contact_email} onChange={e => set('contact_email', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="input-base" type="tel" placeholder="+1 (713) 000-0000"
                    value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Plan */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Subscription Plan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('plan', p.value)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      form.plan === p.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.label}</p>
                    <p className="text-primary-600 font-bold text-sm mt-0.5">{p.price}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Portal password */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Portal Access
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-base pr-20"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required minLength={8}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Share this with the clinic. They can request a reset if needed.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/clinics" className="btn-secondary">Cancel</Link>
              <Button type="submit" variant="primary" loading={loading}>
                Create Clinic Account
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
