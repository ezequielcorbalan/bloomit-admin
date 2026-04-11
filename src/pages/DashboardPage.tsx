import { useEffect, useState } from 'react';
import { Users, Cpu, Activity, Clock } from 'lucide-react';
import { getOverview, getPlantRequestAnalytics } from '../services/adminApi';
import type { OverviewData } from '../services/adminApi';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, subtitle, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-300 p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-neutral-600">{title}</p>
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [requestStats, setRequestStats] = useState<any>(null);
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
      <div className="p-8">
        <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-lg p-4 text-accent-coral-dark text-sm">
          Error cargando datos: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 text-sm mt-1">Resumen general de Bloomit</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Usuarios registrados"
          value={overview?.users.total ?? 0}
          icon={<Users className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Dispositivos activos"
          value={overview?.devices.active ?? 0}
          subtitle={`${overview?.devices.total ?? 0} total`}
          icon={<Cpu className="w-5 h-5 text-secondary-dark" />}
          iconBg="bg-secondary/10"
        />
        <StatCard
          title="Lecturas últimas 24h"
          value={overview?.sensors_last_24h ?? 0}
          icon={<Activity className="w-5 h-5 text-primary-light" />}
          iconBg="bg-accent-mint/30"
        />
        <StatCard
          title="Solicitudes pendientes"
          value={overview?.plant_requests_pending ?? 0}
          subtitle="plantas por aprobar"
          icon={<Clock className="w-5 h-5 text-accent-yellow-dark" />}
          iconBg="bg-accent-yellow/20"
        />
      </div>

      {/* Plant request stats */}
      {requestStats && (
        <div className="bg-white rounded-xl border border-neutral-300 p-6 shadow-soft">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Solicitudes de plantas</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-accent-yellow/10 rounded-xl border border-accent-yellow/20">
              <p className="text-3xl font-bold text-accent-yellow-dark">{requestStats.pending}</p>
              <p className="text-sm text-neutral-600 mt-1 font-medium">Pendientes</p>
            </div>
            <div className="text-center p-4 bg-secondary/10 rounded-xl border border-secondary/20">
              <p className="text-3xl font-bold text-secondary-dark">{requestStats.approved}</p>
              <p className="text-sm text-neutral-600 mt-1 font-medium">Aprobadas</p>
            </div>
            <div className="text-center p-4 bg-accent-coral/10 rounded-xl border border-accent-coral/20">
              <p className="text-3xl font-bold text-accent-coral-dark">{requestStats.rejected}</p>
              <p className="text-sm text-neutral-600 mt-1 font-medium">Rechazadas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
