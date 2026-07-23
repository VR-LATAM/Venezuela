// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { clinicApi } from '@/lib/api';

export default function ClinicLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await clinicApi.login(email, password);
      localStorage.setItem('clinic_token', data.data.token);
      localStorage.setItem('clinic_data',  JSON.stringify(data.data.clinic));
      router.replace('/clinic/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Invalid credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/logo.png" alt="Verona Ride" width={200} height={100} style={{ objectFit: 'contain' }} priority />
          <p className="text-sm text-gray-500">Clinic Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email" className="input-base" placeholder="clinic@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" className="input-base" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full h-11">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Need access? Contact{' '}
          <a href="mailto:support@veronaride.app" className="underline">support@veronaride.app</a>
        </p>
      </div>
    </div>
  );
}
