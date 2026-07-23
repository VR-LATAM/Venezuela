'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';

type Step = 'credentials' | 'totp';

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep]       = useState<Step>('credentials');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Si viene de una redirección con error de next-auth, mostrar paso correcto
  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'TOTP_REQUIRED') setStep('totp');
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      totpCode: step === 'totp' ? totpCode : '',
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.replace('/dashboard');
      return;
    }

    const err = result?.error ?? '';

    if (err.startsWith('MFA_SETUP_REQUIRED:')) {
      const setupToken = err.replace('MFA_SETUP_REQUIRED:', '');
      router.replace(`/2fa-setup?token=${encodeURIComponent(setupToken)}`);
      return;
    }

    if (err === 'TOTP_REQUIRED') {
      setStep('totp');
      return;
    }

    setError(step === 'totp' ? 'Invalid 2FA code. Try again.' : 'Invalid credentials.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/logo.png" alt="Verona Ride" width={200} height={100} style={{ objectFit: 'contain' }} priority />
          <p className="text-sm text-gray-500">National admin panel</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email" className="input-base" placeholder="admin@veronaride.app"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" className="input-base" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full h-11">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2 mb-2">
              <ShieldCheck className="w-10 h-10 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-800">Two-Factor Authentication</h2>
              <p className="text-sm text-gray-500 text-center">Enter the 6-digit code from your authenticator app.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Authentication code</label>
              <input
                type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                className="input-base text-center text-2xl tracking-widest"
                placeholder="000000" value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading || totpCode.length !== 6} className="btn-primary w-full h-11">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700">
              ← Back to login
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">Authorized Verona Ride administrators only</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-700" />}>
      <LoginContent />
    </Suspense>
  );
}
