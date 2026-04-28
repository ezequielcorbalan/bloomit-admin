import { useEffect, useState } from 'react';
import { Users, Cpu, Activity, Clock, UserCheck, Wifi, LineChart as LineChartIcon, Mail } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  getOverview,
  getPlantRequestAnalytics,
  getDailyLogins,
  getConnectedUsers,
} from '../services/adminApi';
import type {
  OverviewData,
  DailyLoginPoint,
  ConnectedUserItem,
} from '../services/adminApi';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, subtitle, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-4 sm:p-6 shadow-soft">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm font-semibold text-neutral-600">{title}</p>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="text-xs sm:text-sm text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function formatShortDate(date: string) {
  // date: 'YYYY-MM-DD'
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

function formatRelative(ts: number) {
  const diffSec = Math.floor(Date.now() / 1000) - ts;
  if (diffSec < 60) return 'hace instantes';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.floor(hr / 24);
  return `hace ${days} d`;
}

export function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [requestStats, setRequestStats] = useState<any>(null);
  const [dailyLogins, setDailyLogins] = useState<DailyLoginPoint[] | null>(null);
  const [dailyLoginsError, setDailyLoginsError] = useState('');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUserItem[] | null>(null);
  const [connectedUsersError, setConnectedUsersError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [ov, pr] = await Promise.all([
          getOverview(),
          getPlantRequestAnalytics(),
        ]);
        setOverview(ov.data);
        setRequestStats(pr.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }

      // Secondary widgets — fail independently so the dashboard still renders
      // if the backend doesn't have these endpoints yet.
      try {
        const dl = await getDailyLogins(15);
        setDailyLogins(dl.data);
      } catch (err: any) {
        setDailyLoginsError(err.message);
      }

      try {
        const cu = await getConnectedUsers(24);
        setConnectedUsers(cu.data);
      } catch (err: any) {
        setConnectedUsersError(err.message);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8">
        <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-lg p-4 text-accent-coral-dark text-sm">
          Error cargando datos: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">Resumen general de Bloomit</p>
      </div>

      {/* Stats grid — 2 filas x 3 columnas en desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          title="Usuarios registrados"
          value={overview?.users.total ?? 0}
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Usuarios activos 24h"
          value={overview?.users.active_last_24h ?? 0}
          subtitle="con login reciente"
          icon={<UserCheck className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Solicitudes pendientes"
          value={overview?.plant_requests_pending ?? 0}
          subtitle="plantas por aprobar"
          icon={<Clock className="w-5 h-5 text-accent-yellow-dark" />}
          iconBg="bg-accent-yellow/20"
        />
        <StatCard
          title="Dispositivos activos"
          value={overview?.devices.active ?? 0}
          subtitle={`${overview?.devices.total ?? 0} total`}
          icon={<Cpu className="w-5 h-5 text-secondary-dark" />}
          iconBg="bg-secondary/10"
        />
        <StatCard
          title="Dispositivos conectados 24h"
          value={overview?.devices.connected_last_24h ?? 0}
          subtitle="con handshake reciente"
          icon={<Wifi className="w-5 h-5 text-secondary-dark" />}
          iconBg="bg-secondary/10"
        />
        <StatCard
          title="Lecturas últimas 24h"
          value={overview?.sensors_last_24h ?? 0}
          icon={<Activity className="w-5 h-5 text-primary-light" />}
          iconBg="bg-accent-mint/30"
        />
      </div>

      {/* Plant request stats */}
      {requestStats && (
        <div className="bg-white rounded-xl border border-neutral-300 p-4 sm:p-6 shadow-soft mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 mb-4">Solicitudes de plantas</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-accent-yellow/10 rounded-xl border border-accent-yellow/20">
              <p className="text-2xl sm:text-3xl font-bold text-accent-yellow-dark">{requestStats.pending}</p>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">Pendientes</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-secondary/10 rounded-xl border border-secondary/20">
              <p className="text-2xl sm:text-3xl font-bold text-secondary-dark">{requestStats.approved}</p>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">Aprobadas</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-accent-coral/10 rounded-xl border border-accent-coral/20">
              <p className="text-2xl sm:text-3xl font-bold text-accent-coral-dark">{requestStats.rejected}</p>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">Rechazadas</p>
            </div>
          </div>
        </div>
      )}

      {/* Daily logins line chart */}
      <div className="bg-white rounded-xl border border-neutral-300 p-4 sm:p-6 shadow-soft mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <LineChartIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">Logueos por día</h2>
            <p className="text-xs sm:text-sm text-neutral-500">Últimos 15 días</p>
          </div>
        </div>

        {dailyLoginsError ? (
          <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-lg p-4 text-accent-coral-dark text-sm">
            No se pudo cargar la serie: {dailyLoginsError}
          </div>
        ) : !dailyLogins ? (
          <div className="h-56 sm:h-72 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dailyLogins.length === 0 ? (
          <div className="h-56 sm:h-72 flex items-center justify-center text-sm text-neutral-400">
            Sin datos en el período
          </div>
        ) : (
          <div className="h-56 sm:h-72 -ml-2 sm:-ml-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyLogins} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0D4BC" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fill: '#757575', fontSize: 12 }}
                  stroke="#BDBDBD"
                  minTickGap={16}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#757575', fontSize: 12 }}
                  stroke="#BDBDBD"
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E0D4BC',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => `Fecha: ${label}`}
                  formatter={(value) => [value as number, 'Logueos']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#31703A"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#31703A' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Connected users in last 24h */}
      <div className="bg-white rounded-xl border border-neutral-300 p-4 sm:p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-secondary/10 rounded-lg flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5 text-secondary-dark" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">Usuarios con dispositivo conectado</h2>
            <p className="text-xs sm:text-sm text-neutral-500">Últimas 24 horas</p>
          </div>
        </div>

        {connectedUsersError ? (
          <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-lg p-4 text-accent-coral-dark text-sm">
            No se pudo cargar la lista: {connectedUsersError}
          </div>
        ) : !connectedUsers ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : connectedUsers.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-400">
            Ningún usuario tuvo dispositivos conectados en las últimas 24h
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {connectedUsers.map((u) => (
              <li
                key={u.id_user}
                className="py-3 flex items-center gap-3 sm:gap-4"
              >
                <div className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center text-xs font-bold text-secondary-dark shrink-0">
                  {u.email[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {u.device_count} {u.device_count === 1 ? 'dispositivo' : 'dispositivos'} · último handshake {formatRelative(u.last_connected)}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 text-secondary-dark text-xs font-medium rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  conectado
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
