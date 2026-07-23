'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';

type Step = 'scan' | 'verify' | 'done';

function TwoFASetupContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const setupToken   = searchParams.get('token') ?? '';

  const [step, setStep]       = useState<Step>('scan');
  const [qrCode, setQrCode]   = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL ?? '';

  useEffect(() => {
    if (!setupToken) { router.replace('/login'); return; }
    // Solicitar QR al backend usando el setupToken temporal
    fetch(`${API}/api/v1/auth/admin/2fa/setup`, {
      headers: { Authorization: `Bearer ${setupToken}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.data?.qrCode) {
          setQrCode(d.data.qrCode);
          setSecret(d.data.secret);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => router.replace('/login'));
  }, [setupToken, API, router]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/auth/admin/2fa/verify`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${setupToken}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Invalid code. Try again.');
        setLoading(false);
        return;
      }

      // Backend devuelve tokens completos — crear sesión next-auth
      const { user, tokens } = data.data;
      const result = await signIn('credentials', {
        email:      user.email,
        password:   '__mfa_setup_bypass__',
        setupToken: tokens.accessToken,
        redirect:   false,
      });

      setLoading(false);

      if (result?.ok) {
        setStep('done');
        setTimeout(() => router.replace('/dashboard'), 2000);
      } else {
        // Fallback: redirigir al login para que hagan login completo con 2FA
        setStep('done');
        setTimeout(() => router.replace('/login'), 2000);
      }
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Image src="/logo.png" alt="Verona Ride" width={160} height={80} style={{ objectFit: 'contain' }} priority />
          <h1 className="text-lg font-semibold text-gray-800">Set up Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 text-center">
            2FA is required for all admin accounts. Scan the QR code with Google Authenticator or Authy.
          </p>
        </div>

        {step === 'scan' && (
          <div className="space-y-4">
            {qrCode ? (
              <>
                <div className="flex justify-center">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-gray-200" />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
                  <p className="font-mono text-sm font-medium text-gray-800 break-all">{secret}</p>
                </div>
                <button onClick={() => setStep('verify')} className="btn-primary w-full h-11">
                  I scanned the QR code →
                </button>
              </>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            )}
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex flex-col items-center gap-1 mb-2">
              <ShieldCheck className="w-8 h-8 text-primary-600" />
              <p className="text-sm text-gray-600 text-center">Enter the 6-digit code from your authenticator app to confirm setup.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
              <input
                type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                className="input-base text-center text-2xl tracking-widest"
                placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full h-11">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Activate 2FA'}
            </button>
            <button type="button" onClick={() => setStep('scan')} className="w-full text-sm text-gray-500 hover:text-gray-700">
              ← Back to QR code
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="text-lg font-semibold text-gray-800">2FA Activated!</p>
            <p className="text-sm text-gray-500 text-center">Redirecting to dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TwoFASetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <TwoFASetupContent />
    </Suspense>
  );
}
