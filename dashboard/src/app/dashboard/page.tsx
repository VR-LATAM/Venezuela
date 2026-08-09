// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { AdminShell } from '@/components/AdminShell';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { RidesChart } from '@/components/charts/RidesChart';
import { LiveMap } from '@/components/maps/LiveMap';
import { adminApi, type KPIs, type OnlineDriver, type SOSEvent, type HeatPoint } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Car, Users, TrendingUp, Star, AlertTriangle, RefreshCw,
} from 'lucide-react';

interface FinanceData {
  dailyRevenue: { day: string; revenue: number; rides: number; commission: number }[];
  totals: { revenue: number; commission: number; rides: number; failedPayments: number };
}

const HEAT_PERIODS = [
  { label: '6h',  hours: 6 },
  { label: '24h', hours: 24 },
  { label: '3d',  hours: 72 },
  { label: '7d',  hours: 168 },
];

// Ciudades principales de Venezuela con coordenadas y peso de demanda simulado
const VE_CITIES = [
  { name: 'Caracas',        lat: 10.4806, lng: -66.9036, demand: 150 },
  { name: 'Maracaibo',      lat: 10.6666, lng: -71.6125, demand: 110 },
  { name: 'Valencia',       lat: 10.1620, lng: -68.0077, demand: 100 },
  { name: 'Barquisimeto',   lat:  9.9986, lng: -69.2990, demand: 90  },
  { name: 'Maracay',        lat: 10.2469, lng: -67.5958, demand: 80  },
  { name: 'Maturín',        lat:  9.7458, lng: -63.1811, demand: 55  },
  { name: 'Barcelona',      lat: 10.1337, lng: -64.6857, demand: 50  },
  { name: 'Ciudad Bolívar', lat:  8.1222, lng: -63.5500, demand: 45  },
  { name: 'Mérida',         lat:  8.5980, lng: -71.1440, demand: 40  },
  { name: 'Cumaná',         lat: 10.4639, lng: -64.1740, demand: 35  },
];

function generateSimulatedHeat(): HeatPoint[] {
  const points: HeatPoint[] = [];
  const rng = (min: number, max: number) => min + Math.random() * (max - min);

  for (const city of VE_CITIES) {
    // Núcleo de alta demanda (centro de la ciudad)
    for (let i = 0; i < city.demand; i++) {
      points.push({
        lat:    city.lat    + rng(-0.04, 0.04),
        lng:    city.lng    + rng(-0.06, 0.06),
        weight: Math.round(rng(city.demand * 0.5, city.demand)),
      });
    }
    // Zona suburbana de demanda media
    for (let i = 0; i < Math.floor(city.demand * 0.4); i++) {
      points.push({
        lat:    city.lat    + rng(-0.12, 0.12),
        lng:    city.lng    + rng(-0.15, 0.15),
        weight: Math.round(rng(5, city.demand * 0.3)),
      });
    }
  }

  // Algunos puntos aislados en autopistas entre ciudades
  const highways = [
    { lat: 10.3, lng: -67.5 }, // Caracas → Valencia
    { lat: 10.1, lng: -68.9 }, // Valencia → Barquisimeto
    { lat: 10.4, lng: -66.5 }, // Guarenas → Caracas
    { lat:  9.9, lng: -65.5 }, // Anzoátegui → Miranda
  ];
  for (const hw of highways) {
    for (let i = 0; i < 8; i++) {
      points.push({
        lat:    hw.lat + rng(-0.08, 0.08),
        lng:    hw.lng + rng(-0.1,  0.1),
        weight: Math.round(rng(3, 15)),
      });
    }
  }

  return points;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [kpis, setKpis]           = useState<KPIs | null>(null);
  const [finance, setFinance]     = useState<FinanceData | null>(null);
  const [drivers, setDrivers]     = useState<OnlineDriver[]>([]);
  const [sosList, setSosList]     = useState<SOSEvent[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [heatHours, setHeatHours] = useState(24);
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [heatLoading, setHeatLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [kpisRes, financeRes, sosRes] = await Promise.all([
        adminApi.kpis(),
        adminApi.financeSummary(30),
        adminApi.listActiveSOS(),
      ]);
      const raw = kpisRes.data?.data;
      setKpis({
        ridesToday:    raw?.ridesTotal?.today    ?? 0,
        ridesWeek:     raw?.ridesTotal?.thisWeek ?? 0,
        ridesMonth:    raw?.ridesTotal?.thisMonth ?? 0,
        revenueToday:  raw?.revenue?.today       ?? 0,
        revenueMonth:  raw?.revenue?.thisMonth   ?? 0,
        activeDrivers: raw?.activeDrivers        ?? 0,
        avgRating:     raw?.avgPassengerRating   ?? 0,
        cancelRate:    (raw?.cancellationRate    ?? 0) / 100,
      });
      setFinance(financeRes.data?.data ?? null);
      setSosList(sosRes.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMap = useCallback(async () => {
    try {
      const { data } = await adminApi.onlineDriversMap();
      setDrivers(data?.data?.drivers ?? []);
    } finally {
      setMapLoading(false);
    }
  }, []);

  const loadHeatmap = useCallback(async (hours: number) => {
    setHeatLoading(true);
    try {
      const { data } = await adminApi.demandHeatmap(hours);
      const points = data?.data?.points ?? data?.data?.heatmap ?? [];
      setHeatPoints(points);
    } catch {
      setHeatPoints([]);
    } finally {
      setHeatLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadMap();
    loadHeatmap(heatHours);
    const mapInterval = setInterval(loadMap, 10_000);
    return () => clearInterval(mapInterval);
  }, [loadData, loadMap, loadHeatmap, heatHours]);

  // Socket.io para SOS en tiempo real
  useEffect(() => {
    if (!session?.accessToken) return;
    const socket = getSocket(session.accessToken);
    socket.on('admin:sos_activated', (event: SOSEvent) => {
      setSosList(prev => [event, ...prev]);
    });
    return () => { socket.off('admin:sos_activated'); };
  }, [session?.accessToken]);

  const kpiCards = [
    {
      label: 'Viajes hoy',
      value: kpis?.ridesToday ?? 0,
      icon:  Car,
      color: 'text-blue-600 bg-blue-50',
      sub:   `${kpis?.ridesWeek ?? 0} esta semana`,
    },
    {
      label: 'Ingresos hoy',
      value: formatCurrency(kpis?.revenueToday ?? 0),
      icon:  TrendingUp,
      color: 'text-green-600 bg-green-50',
      sub:   `${formatCurrency(kpis?.revenueMonth ?? 0)} este mes`,
    },
    {
      label: 'Conductores online',
      value: drivers.length,
      icon:  Users,
      color: 'text-purple-600 bg-purple-50',
      sub:   `${kpis?.activeDrivers ?? 0} aprobados`,
    },
    {
      label: 'Calificación promedio',
      value: kpis?.avgRating?.toFixed(2) ?? '—',
      icon:  Star,
      color: 'text-amber-600 bg-amber-50',
      sub:   `${((kpis?.cancelRate ?? 0) * 100).toFixed(1)}% tasa cancelación`,
    },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Operaciones nacionales — Venezuela">

      {/* SOS Banner */}
      {sosList.length > 0 && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {sosList.length} alerta{sosList.length > 1 ? 's' : ''} SOS activa{sosList.length > 1 ? 's' : ''}
            </p>
            <ul className="mt-1 space-y-0.5">
              {sosList.slice(0, 3).map(s => (
                <li key={s.id} className="text-xs text-red-700">
                  {s.passenger_name} — {formatDateTime(s.created_at)}
                </li>
              ))}
            </ul>
          </div>
          <a href="/settings" className="text-xs text-red-700 font-semibold hover:underline whitespace-nowrap">
            Ver todas →
          </a>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpiCards.map(({ label, value, icon: Icon, color, sub }) => (
              <Card key={label}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                    <p className="mt-1 text-xs text-gray-400">{sub}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            ))
        }
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Revenue últimos 30 días</CardTitle>
          </CardHeader>
          {loading || !finance
            ? <Skeleton className="h-[220px]" />
            : <RevenueChart data={finance.dailyRevenue} />
          }
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Viajes por día</CardTitle>
          </CardHeader>
          {loading || !finance
            ? <Skeleton className="h-[220px]" />
            : <RidesChart data={finance.dailyRevenue} />
          }
        </Card>
      </div>

      {/* Live Map + Heatmap */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Conductores online · Zonas de demanda
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {drivers.length} activos · {heatPoints.length} zonas · Se actualiza cada 10s
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector período heatmap (solo cuando no hay simulación) */}
            {!simulating && (
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                {HEAT_PERIODS.map(({ label, hours }) => (
                  <button
                    key={hours}
                    onClick={() => { setHeatHours(hours); loadHeatmap(hours); }}
                    className={`px-3 py-1.5 transition ${
                      heatHours === hours
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {heatLoading && heatHours === hours ? '…' : label}
                  </button>
                ))}
              </div>
            )}

            {/* Botón simulación */}
            <button
              onClick={() => {
                if (simulating) {
                  setSimulating(false);
                  loadHeatmap(heatHours);
                } else {
                  setSimulating(true);
                  setHeatPoints(generateSimulatedHeat());
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                simulating
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {simulating ? '⚡ Simulando — detener' : '⚡ Simular demanda'}
            </button>

            {/* Refresh mapa */}
            <button
              onClick={() => { setMapLoading(true); loadMap(); }}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition"
            >
              <RefreshCw className={`h-4 w-4 ${mapLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {mapLoading && drivers.length === 0
          ? <Skeleton className="h-[450px] rounded-xl" />
          : <LiveMap drivers={drivers} heatPoints={heatPoints} height={450} />
        }
      </Card>

      {/* Totals row */}
      {finance && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos totales 30d',   value: formatCurrency(finance.totals.revenue) },
            { label: 'Comisión 30d',           value: formatCurrency(finance.totals.commission) },
            { label: 'Viajes completados',     value: finance.totals.rides.toLocaleString() },
            { label: 'Pagos fallidos',         value: finance.totals.failedPayments.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
