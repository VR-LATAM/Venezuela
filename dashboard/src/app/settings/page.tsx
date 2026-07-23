// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { adminApi, type SOSEvent } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { AlertTriangle, Bell, CheckCircle } from 'lucide-react';

const TOPICS = [
  { value: 'vride_passengers', label: 'All passengers' },
  { value: 'vride_drivers',    label: 'All drivers' },
  { value: 'vride_all',        label: 'Entire platform' },
  { value: 'vride_admins',     label: 'Admins' },
];

export default function SettingsPage() {
  const { data: session } = useSession();

  // SOS
  const [sosList, setSosList]   = useState<SOSEvent[]>([]);
  const [sosLoading, setSosLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<SOSEvent | null>(null);
  const [resolution, setResolution]     = useState('resolved');
  const [resolving, setResolving]       = useState(false);

  // Notificaciones
  const [notifForm, setNotifForm] = useState({
    title: '',
    body:  '',
    topic: 'vride_passengers',
  });
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);

  // Referral leaderboard
  const [leaderboard, setLeaderboard] = useState<{ name: string; completed: number; pending: number }[]>([]);
  const [lbLoading, setLbLoading]     = useState(true);

  const loadSOS = useCallback(async () => {
    try {
      const { data } = await adminApi.listActiveSOS();
      setSosList(data?.events ?? []);
    } finally {
      setSosLoading(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await adminApi.leaderboard();
      setLeaderboard(data?.leaderboard ?? []);
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSOS();
    loadLeaderboard();
  }, [loadSOS, loadLeaderboard]);

  // Socket: SOS en tiempo real
  useEffect(() => {
    if (!session?.accessToken) return;
    const socket = getSocket(session.accessToken);
    socket.on('admin:sos_activated', (event: SOSEvent) => {
      setSosList(prev => [event, ...prev]);
    });
    return () => { socket.off('admin:sos_activated'); };
  }, [session?.accessToken]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setResolving(true);
    try {
      await adminApi.resolveSOS(resolveModal.id, resolution);
      setSosList(prev => prev.filter(s => s.id !== resolveModal.id));
      setResolveModal(null);
    } finally {
      setResolving(false);
    }
  };

  const handleSendNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.body) return;
    setSending(true);
    try {
      await adminApi.sendCampaign(notifForm);
      setSent(true);
      setNotifForm(f => ({ ...f, title: '', body: '' }));
      setTimeout(() => setSent(false), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell title="Notifications & SOS" subtitle="Emergency alerts and mass communications">

      {/* SOS activos */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-semibold text-gray-700">Active SOS alerts</p>
            {sosList.length > 0 && (
              <Badge className="text-red-700 bg-red-100">{sosList.length}</Badge>
            )}
          </div>
          <button onClick={loadSOS} className="text-xs text-gray-400 hover:text-gray-700">
            Update
          </button>
        </div>

        {sosLoading ? <SkeletonTable rows={4} /> : sosList.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active SOS alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sosList.map(s => (
              <div
                key={s.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border border-red-200"
              >
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  🚨
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-red-900">{s.passenger_name}</p>
                    <Badge className="text-red-700 bg-red-100 text-xs">SOS</Badge>
                  </div>
                  <p className="text-xs text-red-700">
                    {formatDateTime(s.created_at)}
                    {s.latitude && s.longitude && ` · ${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setResolveModal(s); setResolution('resolved'); }}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Notificaciones masivas */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Bell className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-700">Send mass notification</p>
          </div>

          <form onSubmit={handleSendNotif} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Recipients</label>
              <select
                value={notifForm.topic}
                onChange={e => setNotifForm(f => ({ ...f, topic: e.target.value }))}
                className="input-base"
              >
                {TOPICS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Title"
              placeholder="Ex: Important Verona Ride update"
              value={notifForm.title}
              onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                className="input-base resize-none h-24"
                placeholder="Write the push message body…"
                value={notifForm.body}
                onChange={e => setNotifForm(f => ({ ...f, body: e.target.value }))}
                required
              />
            </div>

            <Button type="submit" variant="primary" loading={sending} className="w-full">
              {sent ? '✓ Notification sent' : 'Send notification'}
            </Button>
          </form>
        </Card>

        {/* Leaderboard de referidos */}
        <Card>
          <p className="text-sm font-semibold text-gray-700 mb-4">Top drivers — Referral program</p>
          {lbLoading ? <SkeletonTable rows={5} /> : (
            <div className="space-y-2">
              {leaderboard.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No completed referrals</p>
              )}
              {leaderboard.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3 py-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-400'}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.pending} in progress</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary-700">{d.completed}</p>
                    <p className="text-xs text-gray-400">completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Resolve Modal */}
      <Modal
        open={!!resolveModal}
        onClose={() => setResolveModal(null)}
        title="Resolve SOS alert"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Passenger: <strong>{resolveModal?.passenger_name}</strong><br />
          Activated: {resolveModal && formatDateTime(resolveModal.created_at)}
        </p>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Resolution</label>
          <select
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            className="input-base"
          >
            <option value="resolved">Resolved — alert attended</option>
            <option value="false_alarm">False alarm</option>
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Button>
          <Button variant="primary" loading={resolving} onClick={handleResolve}>
            Confirm resolution
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
