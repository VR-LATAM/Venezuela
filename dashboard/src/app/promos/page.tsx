// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromosPage() {
  const [promos, setPromos]       = useState<PromoCode[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState({ code: '', description: '', discount_percent: 10, max_uses: '', expires_at: '' });
  const [creating, setCreating]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/promos');
      setPromos(r.data.data.promos ?? []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await api.patch(`/admin/promos/${id}/toggle`, { is_active: !current });
      setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
    } catch { /* silencioso */ }
  };

  const handleCreate = async () => {
    if (!form.code.trim() || !form.discount_percent) return;
    setCreating(true);
    try {
      await api.post('/admin/promos', {
        code:             form.code.trim().toUpperCase(),
        description:      form.description.trim() || undefined,
        discount_percent: Number(form.discount_percent),
        max_uses:         form.max_uses ? Number(form.max_uses) : undefined,
        expires_at:       form.expires_at || undefined,
      });
      setShowCreate(false);
      setForm({ code: '', description: '', discount_percent: 10, max_uses: '', expires_at: '' });
      await load();
    } catch { /* silencioso */ }
    finally { setCreating(false); }
  };

  return (
    <AdminShell
      title="Promo Codes"
      subtitle={`${promos.filter(p => p.is_active).length} active codes`}
      action={<button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">+ New Code</button>}
    >
      <Card>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : promos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎁</div>
            <div className="font-semibold text-slate-600">No promo codes yet</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Code</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Discount</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Uses</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Expires</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{p.code}</span>
                    {p.description && <div className="text-xs text-slate-400 mt-1">{p.description}</div>}
                  </td>
                  <td className="p-3 font-bold text-green-600 text-lg">{p.discount_percent}%</td>
                  <td className="p-3 text-slate-600">
                    {p.uses_count}{p.max_uses ? ` / ${p.max_uses}` : ' (unlimited)'}
                  </td>
                  <td className="p-3 text-slate-600">{p.expires_at ? formatDateTime(p.expires_at) : 'Never'}</td>
                  <td className="p-3">
                    <Badge className={p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggle(p.id, p.is_active)}
                      className={`text-sm font-medium ${p.is_active ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}`}
                    >
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && (
        <Modal open={showCreate} title="Create Promo Code" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Code *</label>
              <input
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SUMMER25"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Description (optional)</label>
              <input
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Summer 2026 promotion"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Discount % *</label>
                <input
                  type="number"
                  min={1} max={100}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.discount_percent}
                  onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Max uses (optional)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Expiration date (optional)</label>
              <input
                type="datetime-local"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!form.code.trim() || creating}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
