'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Target, Ticket, BarChart3, Zap, Building2, GraduationCap, Star, Activity,
  FileText, CheckCircle, Shield, Clock, AlertTriangle, TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  cartasPendientes: number;
  cartasAutorizadas: number;
  alertasActivas: number;
  participantesRiesgo: number;
}

interface DashboardData {
  overview: {
    totalStudents: number;
    activeStudents: number;
    completionRate: number;
    totalCommunityMembers?: number;
  };
  tierDistribution: {
    tier: string;
    count: number;
    percentage: number;
  }[];
  topStudents: {
    id: number;
    nombre: string;
    puntosCultivo: number;
    racha: number;
    tier: string;
  }[];
  availableCredits: number;
}

export default function CoordinadorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    cartasPendientes: 0,
    cartasAutorizadas: 0,
    alertasActivas: 0,
    participantesRiesgo: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINADOR') {
      router.push('/dashboard');
    } else {
      fetchDashboardData();
      fetchActionStats();
    }
  }, [status, session]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/coordinador/dashboard-stats');
      const result = await res.json();

      if (res.ok && result.success) {
        setData(result.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionStats = async () => {
    try {
      const res = await fetch('/api/coordinador/action-stats');
      const result = await res.json();
      if (res.ok && result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching action stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={64} />
          <h2 className="text-2xl font-bold text-white mb-2">No hay datos disponibles</h2>
          <p className="text-slate-400">Por favor contacte al administrador del sistema</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Dashboard
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 text-2xl">
                Coordinador
              </span>
            </h1>
            <p className="text-slate-400 mt-1">COORDINADOR • Panel de Control</p>
            <p className="text-sm text-slate-500">{session?.user?.email}</p>
          </div>
        </div>

        {/* KPI Cards - Primera Fila */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            icon={<Users className="text-cyan-400" />}
            label="Usuarios Totales"
            value={data.overview.totalStudents.toString()}
            trend="✅ Activos"
            color="cyan"
          />
          <KpiCard
            icon={<Building2 className="text-blue-400" />}
            label="Comunidad"
            value={(data.overview.totalCommunityMembers || 0).toString()}
            trend="Usuarios en la comunidad"
            color="blue"
          />
          <KpiCard
            icon={<Target className="text-purple-400" />}
            label="Tasa de Cumplimiento"
            value={`${data.overview.completionRate}%`}
            trend="Cartas y evidencias"
            color="purple"
          />
          <KpiCard
            icon={<Ticket className="text-yellow-400" />}
            label="Licencias Disponibles"
            value={data.availableCredits.toString()}
            trend="✅ Activos"
            color="yellow"
          />
        </div>

        {/* Cards de Acción - Segunda Fila */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            icon={<FileText className="text-yellow-400" />}
            label="Cartas Pendientes"
            value={stats.cartasPendientes}
            bgColor="from-yellow-900/30 to-yellow-950/20"
            borderColor="border-yellow-500/30"
            iconBg="bg-yellow-500/10"
          />
          <ActionCard
            icon={<CheckCircle className="text-green-400" />}
            label="Cartas Autorizadas"
            value={stats.cartasAutorizadas}
            bgColor="from-green-900/30 to-green-950/20"
            borderColor="border-green-500/30"
            iconBg="bg-green-500/10"
          />
          <ActionCard
            icon={<AlertTriangle className="text-red-400" />}
            label="Alertas Activas"
            value={stats.alertasActivas}
            bgColor="from-red-900/30 to-red-950/20"
            borderColor="border-red-500/30"
            iconBg="bg-red-500/10"
          />
          <ActionCard
            icon={<Shield className="text-orange-400" />}
            label="En Riesgo"
            value={stats.participantesRiesgo}
            bgColor="from-orange-900/30 to-orange-950/20"
            borderColor="border-orange-500/30"
            iconBg="bg-orange-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Distribución y Top Estudiantes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
                <BarChart3 className="text-purple-400" /> Distribución de Estudiantes
              </h2>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-3xl p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {data.tierDistribution.map((tier) => (
                  <div
                    key={tier.tier}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-400">{tier.tier}</span>
                      <span className="text-2xl font-black text-white">{tier.count}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          tier.tier === 'PREMIUM'
                            ? 'bg-purple-500'
                            : tier.tier === 'ELITE'
                            ? 'bg-yellow-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${tier.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">{tier.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Star className="text-yellow-400" size={16} />
                Top Estudiantes
              </h3>
              <div className="space-y-3">
                {data.topStudents.slice(0, 5).map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{student.nombre}</p>
                        <p className="text-xs text-slate-400">{student.tier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{student.puntosCultivo} pts</p>
                      <p className="text-xs text-yellow-400">🔥 {student.racha} días</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Acciones Rápidas */}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase flex items-center gap-2">
              <Zap className="text-yellow-400" /> Acciones Rápidas
            </h2>

            {/* Gestión de Strikes */}
            <Link href="/dashboard/admin/strikes" className="block">
              <div className="bg-gradient-to-br from-purple-900/50 to-slate-900 border-2 border-purple-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 group-hover:bg-purple-500/30 rounded-xl transition-colors">
                    <Shield size={24} className="text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Gestión de Strikes
                    </h3>
                    <p className="text-xs text-purple-300">
                      Administrar vidas extra
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Gestionar strikes y vidas de participantes
                </p>
              </div>
            </Link>

            {/* Autorizar Cartas */}
            <Link href="/dashboard/staff/cartas" className="block">
              <div className="bg-gradient-to-br from-green-900/50 to-slate-900 border-2 border-green-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 group-hover:bg-green-500/30 rounded-xl transition-colors">
                    <FileText size={24} className="text-green-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Autorizar Cartas
                    </h3>
                    <p className="text-xs text-green-300">
                      Revisar cartas pendientes
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {stats.cartasPendientes} carta(s) esperando autorización
                </p>
                <Link href="/dashboard/staff/cartas" className="mt-3 text-green-400 hover:text-green-300 text-xs font-bold flex items-center gap-1">
                  Ver pendientes →
                </Link>
              </div>
            </Link>

            {/* Gestionar Visiones */}
            <Link href="/dashboard/school-admin/visiones" className="block">
              <div className="bg-gradient-to-br from-cyan-900/50 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-cyan-500/20 group-hover:bg-cyan-500/30 rounded-xl transition-colors">
                    <Users size={24} className="text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Gestionar Visiones
                    </h3>
                    <p className="text-xs text-cyan-300">
                      Crea y asigna licencias
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Crea visiones/grupos y gestiona las licencias de tus participantes
                </p>
              </div>
            </Link>

            {/* Ver Participantes */}
            <Link href="/dashboard/school-admin/users" className="block">
              <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 border-2 border-blue-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 group-hover:bg-blue-500/30 rounded-xl transition-colors">
                    <GraduationCap size={24} className="text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase">
                      Ver Mis Participantes
                    </h3>
                    <p className="text-xs text-blue-300">
                      Detalle y avances
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Lista completa: Participantes, Game Changers, Coordinadores y Mentores
                </p>
              </div>
            </Link>

            {/* Progreso Global */}
            <div className="bg-gradient-to-br from-green-900/50 to-slate-900 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Activity size={24} className="text-green-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm uppercase">Progreso Global</h3>
                  <p className="text-xs text-green-300">Rendimiento general</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cumplimiento:</span>
                  <span className="text-white font-bold">{data.overview.completionRate}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${data.overview.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, trend, color }: any) {
  const colors: any = {
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-900 rounded-lg">{icon}</div>
        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">KPI</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs font-medium text-slate-400 mt-1">{label}</p>
      <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-slate-500">
        {trend}
      </div>
    </div>
  );
}

function ActionCard({ icon, label, value, bgColor, borderColor, iconBg }: any) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${bgColor} border ${borderColor} rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
        <span className="text-xs font-bold text-slate-500 uppercase">Estado</span>
      </div>
      <p className="text-4xl font-black text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-300">{label}</p>
    </div>
  );
}
