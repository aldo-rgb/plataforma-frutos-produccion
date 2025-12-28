'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Target, Ticket, BarChart3, Zap,
  AlertTriangle, Building2, GraduationCap, Star, Activity,
  FileText, CheckCircle, Shield, Clock
} from 'lucide-react';
import Link from 'next/link';

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

interface ActionStats {
  cartasPendientes: number;
  cartasAutorizadas: number;
  alertasActivas: number;
  participantesRiesgo: number;
}

export default function CoordinadorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<ActionStats>({
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

        {/* KPI Cards */}
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
            trend="Todos los usuarios que pertenecen la comunidad"
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

        {/* Widgets de Acción - 2x3 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Widget 1: Cartas Pendientes */}
          <Link href="/dashboard/coordinador/cartas-pendientes">
            <div className="bg-gradient-to-br from-yellow-900/40 to-slate-900 border-2 border-yellow-500/30 rounded-3xl p-8 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-yellow-500/20 group-hover:bg-yellow-500/30 rounded-xl transition-colors">
                  <FileText size={32} className="text-yellow-400" />
                </div>
                <Clock size={20} className="text-yellow-400/60" />
              </div>
              <p className="text-6xl font-black text-white mb-2">{stats.cartasPendientes}</p>
              <p className="text-lg font-bold text-white mb-1">Cartas Pendientes</p>
              <p className="text-xs text-slate-400">Esperando autorización</p>
            </div>
          </Link>

          {/* Widget 2: Cartas Autorizadas */}
          <Link href="/dashboard/coordinador/cartas-aprobadas">
            <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border-2 border-green-500/30 rounded-3xl p-8 hover:border-green-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-green-500/20 group-hover:bg-green-500/30 rounded-xl transition-colors">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <Shield size={20} className="text-green-400/60" />
              </div>
              <p className="text-6xl font-black text-white mb-2">{stats.cartasAutorizadas}</p>
              <p className="text-lg font-bold text-white mb-1">Cartas Autorizadas</p>
              <p className="text-xs text-slate-400">Total aprobadas</p>
            </div>
          </Link>

          {/* Widget 3: Alertas Activas */}
          <Link href="/dashboard/coordinador/alertas-activas">
            <div className="bg-gradient-to-br from-red-900/40 to-slate-900 border-2 border-red-500/30 rounded-3xl p-8 hover:border-red-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-red-500/20 group-hover:bg-red-500/30 rounded-xl transition-colors">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
                <Zap size={20} className="text-red-400/60" />
              </div>
              <p className="text-6xl font-black text-white mb-2">{stats.alertasActivas}</p>
              <p className="text-lg font-bold text-white mb-1">Alertas Activas</p>
              <p className="text-xs text-slate-400">Requieren atención</p>
            </div>
          </Link>

          {/* Widget 4: En Riesgo */}
          <Link href="/dashboard/coordinador/en-riesgo">
            <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border-2 border-orange-500/30 rounded-3xl p-8 hover:border-orange-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-orange-500/20 group-hover:bg-orange-500/30 rounded-xl transition-colors">
                  <Shield size={32} className="text-orange-400" />
                </div>
                <Target size={20} className="text-orange-400/60" />
              </div>
              <p className="text-6xl font-black text-white mb-2">{stats.participantesRiesgo}</p>
              <p className="text-lg font-bold text-white mb-1">En Riesgo</p>
              <p className="text-xs text-slate-400">Participantes con 2+ faltas</p>
            </div>
          </Link>

          {/* Widget 5: Gestión de Strikes */}
          <Link href="/dashboard/coordinador/gestion-strikes">
            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border-2 border-purple-500/30 rounded-3xl p-8 hover:border-purple-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-purple-500/20 group-hover:bg-purple-500/30 rounded-xl transition-colors">
                  <Shield size={32} className="text-purple-400" />
                </div>
                <Star size={20} className="text-purple-400/60" />
              </div>
              <p className="text-6xl font-black text-white mb-2">-</p>
              <p className="text-lg font-bold text-white mb-1">Gestión de Strikes</p>
              <p className="text-xs text-slate-400">Administrar vidas extra</p>
            </div>
          </Link>

          {/* Widget 6: Autorizar Cartas */}
          <Link href="/dashboard/coordinador/autorizar-cartas">
            <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 border-2 border-cyan-500/30 rounded-3xl p-8 hover:border-cyan-500/50 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-cyan-500/20 group-hover:bg-cyan-500/30 rounded-xl transition-colors">
                  <FileText size={32} className="text-cyan-400" />
                </div>
                <CheckCircle size={20} className="text-cyan-400/60" />
              </div>
              <p className="text-6xl font-black text-white mb-2">→</p>
              <p className="text-lg font-bold text-white mb-1">Autorizar Cartas</p>
              <p className="text-xs text-slate-400">Revisar cartas pendientes</p>
            </div>
          </Link>

        </div>

        {/* Sección de acciones adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gestionar Visiones */}
          <Link href="/dashboard/coordinador/visiones" className="block">
            <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/20 group-hover:bg-emerald-500/30 rounded-xl transition-colors">
                  <Users size={24} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm uppercase">
                    Gestionar Visiones
                  </h3>
                    <p className="text-xs text-emerald-300">
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
          <Link href="/dashboard/coordinador/participantes" className="block">
            <div className="bg-gradient-to-br from-cyan-900/50 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-cyan-500/20 group-hover:bg-cyan-500/30 rounded-xl transition-colors">
                  <GraduationCap size={24} className="text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm uppercase">
                    Ver Mis Participantes
                  </h3>
                  <p className="text-xs text-cyan-300">
                    Detalle y avances
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Lista completa: Participantes, Game Changers, Coordinadores y Mentores
              </p>
            </div>
          </Link>

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
