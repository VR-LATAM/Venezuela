// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface SosEvent {
  id: string;
  ride_id: string | null;
  triggered_by: string;
  triggered_by_role: 'passenger' | 'driver';
  lat: number | null;
  lng: number | null;
  address_at_trigger: string | null;
  status: 'active' | 'resolved' | 'false_alarm';
  notes: string | null;
  created_at: string;
}

export default function SosPage() {
  const [events, setEvents]   = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/sos/active');
      setEvents(r.data.data.events ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh cada 30 segundos mientras está abierto
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleResolve = async (id: string, status: 'resolved' | 'false_alarm') => {
    const notes = prompt(`Notes for ${status === 'resolved' ? 'resolution' : 'false alarm'}:`);
    if (notes === null) return;
    try {
      await api.put(`/sos/${id}/resolve`, { status, notes });
      await load();
    } catch { /* silencioso */ }
  };

  const mapsUrl = (lat: number, lng: number) =>
    `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <AdminShell
      title="SOS Alerts"
      subtitle={`${events.length} active alert${events.length !== 1 ? 's' : ''} — auto-refreshes every 30s`}
    >
      {events.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl animate-pulse">🚨</span>
          <div>
            <div className="font-bold text-red-700">{events.length} active emergency alert{events.length !== 1 ? 's' : ''}</div>
            <div className="text-sm text-red-600">Respond immediately. Check the location and contact the user.</div>
          </div>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-semibold text-slate-600">No active SOS alerts</div>
            <div className="text-sm text-slate-400 mt-1">All clear</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map(e => (
              <div key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🚨</span>
                      <Badge className={e.triggered_by_role === 'passenger' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                        {e.triggered_by_role}
                      </Badge>
                      <span className="text-sm text-slate-500">{formatDateTime(e.created_at)}</span>
                    </div>
                    {e.address_at_trigger && (
                      <div className="text-slate-700 font-medium mb-1">📍 {e.address_at_trigger}</div>
                    )}
                    {e.ride_id && (
                      <div className="text-sm text-slate-500">Ride ID: {e.ride_id}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {e.lat && e.lng && (
                      <a
                        href={mapsUrl(e.lat, e.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 text-center"
                      >
                        View Map
                      </a>
                    )}
                    <button
                      onClick={() => handleResolve(e.id, 'resolved')}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => handleResolve(e.id, 'false_alarm')}
                      className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300"
                    >
                      False Alarm
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
