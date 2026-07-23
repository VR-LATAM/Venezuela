// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api';
import { Pencil, Search } from 'lucide-react';

interface FareConfig {
  code:                         string;
  name:                         string;
  base_fare:                    number;
  price_per_km:                 number;
  price_per_minute:             number;
  min_fare:                     number;
  surge_multiplier:             number;
  platform_commission_percent:  number;
  executive_multiplier:         number;
  accessible_multiplier:        number;
  hourly_rate:                  number;
  scheduled_surcharge:          number;
}

const FIELDS: { key: keyof FareConfig; label: string; min: number; max: number; step: number }[] = [
  { key: 'base_fare',                   label: 'Tarifa base ($)',         min: 0.5,  max: 20,  step: 0.1 },
  { key: 'price_per_km',               label: 'Precio/mi ($)',           min: 0.1,  max: 5,   step: 0.05 },
  { key: 'price_per_minute',           label: 'Precio/min ($)',          min: 0.05, max: 2,   step: 0.01 },
  { key: 'min_fare',                   label: 'Minimum fare ($)',        min: 1,    max: 20,  step: 0.5 },
  { key: 'surge_multiplier',           label: 'Multiplicador surge',     min: 1,    max: 5,   step: 0.1 },
  { key: 'platform_commission_percent',label: 'Platform commission (%)', min: 5,    max: 30,  step: 0.5 },
  { key: 'executive_multiplier',       label: 'Multiplicador executive', min: 1,    max: 5,   step: 0.1 },
  { key: 'accessible_multiplier',      label: 'Multiplicador accesible', min: 1,    max: 5,   step: 0.1 },
  { key: 'hourly_rate',                label: 'Tarifa por hora ($)',     min: 10,   max: 200, step: 1 },
  { key: 'scheduled_surcharge',        label: 'Recargo programado',      min: 1,    max: 3,   step: 0.05 },
];

export default function StatesPage() {
  const [fares, setFares]       = useState<FareConfig[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState<FareConfig | null>(null);
  const [form, setForm]         = useState<Partial<Record<keyof FareConfig, number>>>({});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.listFares();
      setFares(data?.fares ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (fare: FareConfig) => {
    setEditing(fare);
    const initial: Partial<Record<keyof FareConfig, number>> = {};
    FIELDS.forEach(f => { initial[f.key] = fare[f.key] as number; });
    setForm(initial);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.updateFare(editing.code, form as Record<string, number>);
      setSaved(true);
      await load();
      setTimeout(() => { setEditing(null); setSaved(false); }, 800);
    } finally {
      setSaving(false);
    }
  };

  const filtered = fares.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Fares by state" subtitle="Price configuration for each US state">

      <Card>
        <div className="flex gap-3 mb-5">
          <Input
            placeholder="Search state…"
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <p className="ml-auto text-sm text-gray-400 self-center">
            {filtered.length} of {fares.length} states
          </p>
        </div>

        {loading ? <SkeletonTable rows={10} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left pb-3 pr-3">State</th>
                  <th className="text-right pb-3 pr-3">Base</th>
                  <th className="text-right pb-3 pr-3">$/mi</th>
                  <th className="text-right pb-3 pr-3">$/min</th>
                  <th className="text-right pb-3 pr-3">Min.</th>
                  <th className="text-right pb-3 pr-3">Commission</th>
                  <th className="text-right pb-3 pr-3">Surge</th>
                  <th className="text-left pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => (
                  <tr key={f.code} className="hover:bg-gray-50 transition">
                    <td className="py-2.5 pr-3">
                      <span className="font-bold text-gray-900">{f.code}</span>
                      <span className="ml-2 text-gray-500">{f.name}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">${f.base_fare.toFixed(2)}</td>
                    <td className="py-2.5 pr-3 text-right">${f.price_per_km.toFixed(2)}</td>
                    <td className="py-2.5 pr-3 text-right">${f.price_per_minute.toFixed(2)}</td>
                    <td className="py-2.5 pr-3 text-right">${f.min_fare.toFixed(2)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-green-700">
                      {f.platform_commission_percent}%
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className={f.surge_multiplier > 1 ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                        {f.surge_multiplier}×
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => openEdit(f)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Editar tarifas — ${editing?.name} (${editing?.code})`}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4 mb-5">
          {FIELDS.map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={form[key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                className="input-base text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={handleSave}
          >
            {saved ? '✓ Guardado' : 'Guardar cambios'}
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
