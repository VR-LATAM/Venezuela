// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface Dispute {
  id: string;
  ride_id: string;
  reporter_id: string;
  reporter_role: 'passenger' | 'driver';
  reason: string;
  description: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'closed';
  resolution: string | null;
  created_at: string;
  passenger_name?: string;
  driver_name?: string;
}

const REASON_LABELS: Record<string, string> = {
  overcharged:        'Overcharged',
  wrong_route:        'Wrong route',
  unsafe_driving:     'Unsafe driving',
  driver_behavior:    'Driver behavior',
  vehicle_condition:  'Vehicle condition',
  passenger_behavior: 'Passenger behavior',
  no_show:            'No-show',
  cancellation_fee:   'Cancellation fee',
  other:              'Other',
};

export default function DisputesPage() {
  const [disputes, setDisputes]     = useState<Dispute[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/disputes');
      setDisputes(r.data.data.disputes ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async () => {
    if (!selected || resolution.trim().length < 10) return;
    setResolving(true);
    try {
      await api.put(`/admin/disputes/${selected.id}/resolve`, { resolution });
      setSelected(null);
      setResolution('');
      await load();
    } catch { /* silencioso */ }
    finally { setResolving(false); }
  };

  return (
    <AdminShell title="Disputes" subtitle={`${disputes.length} open dispute${disputes.length !== 1 ? 's' : ''}`}>
      <Card>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-semibold text-slate-600">No open disputes</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Date</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Reporter</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Reason</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Parties</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3 text-slate-600">{formatDateTime(d.created_at)}</td>
                  <td className="p-3">
                    <Badge className={d.reporter_role === 'passenger' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                      {d.reporter_role}
                    </Badge>
                  </td>
                  <td className="p-3 font-medium text-slate-700">{REASON_LABELS[d.reason] ?? d.reason}</td>
                  <td className="p-3 text-slate-600 text-xs">
                    {d.passenger_name && <div>Passenger: {d.passenger_name}</div>}
                    {d.driver_name    && <div>Driver: {d.driver_name}</div>}
                  </td>
                  <td className="p-3">
                    <Badge className={d.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>{d.status}</Badge>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => { setSelected(d); setResolution(''); }}
                      className="text-blue-600 hover:underline font-medium text-sm"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selected && (
        <Modal open={!!selected} title="Resolve Dispute" onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
              <div><span className="font-semibold">Reason:</span> {REASON_LABELS[selected.reason]}</div>
              {selected.description && <div><span className="font-semibold">Description:</span> {selected.description}</div>}
              <div><span className="font-semibold">Reporter:</span> {selected.reporter_role}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">Resolution note *</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Describe how this dispute was resolved (minimum 10 characters)..."
              />
            </div>
            <button
              onClick={handleResolve}
              disabled={resolution.trim().length < 10 || resolving}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {resolving ? 'Resolving...' : 'Mark as Resolved'}
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
