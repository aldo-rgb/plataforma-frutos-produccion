'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Ticket, AlertTriangle, Building2, GraduationCap, Activity,
  Clock, Calendar, Scan
} from 'lucide-react';
import Link from 'next/link';
import MedicalAlertsWidget from '@/components/dashboard/MedicalAlertsWidget';
import MedicalFormsListWidget from '@/components/dashboard/MedicalFormsListWidget';
import GCCallsMonitorWidget from '@/components/dashboard/GCCallsMonitorWidget';
import TreasuryQuickWidget from '@/components/dashboard/TreasuryQuickWidget';

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

export default function CoordinadorBasicoDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [countdown, setCountdown] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINATOR_BASIC') {
      router.push('/dashboard');
    } else {
      fetchDashboardData();
      fetchProductos();
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

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/coordinador/productos-activos');
      const result = await res.json();
      if (res.ok && result.success) {
        setProductos(result.productos || []);
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Actualizar countdown cada segundo
  useEffect(() => {
    if (productos.length === 0) return;

    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns: {[key: number]: string} = {};

      productos.forEach(producto => {
        if (!producto.startDate) return;

        const startDate = new Date(producto.startDate);
        startDate.setHours(9, 0, 0, 0); // 9 AM

        const diff = startDate.getTime() - now.getTime();
        
        if (diff > 0 && diff <= 24 * 60 * 60 * 1000) { // Menos de 24 horas
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newCountdowns[producto.id] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      });

      setCountdown(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [productos]);

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
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 text-2xl">
                Coordinador Básico
              </span>
            </h1>
            <p className="text-slate-400 mt-1">📋 COORDINATOR_BASIC • Logística, Pagos y Asistencia</p>
            <p className="text-sm text-slate-500">{session?.user?.email}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Widget Comunidad */}
          <div className="bg-gradient-to-br from-blue-900/40 via-cyan-900/30 to-slate-900 border-2 border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:scale-105 hover:shadow-2xl h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-xl transition-colors">
                  <Building2 className="text-blue-400" size={32} />
                </div>
                <div>
                  <div className="text-blue-400 text-sm font-medium uppercase tracking-wider">Comunidad</div>
                  <div className="text-white text-4xl font-black mt-1">{data.overview.totalCommunityMembers || 0}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Todos los usuarios que pertenecen a la comunidad</span>
              <div className="h-6"></div>
            </div>
          </div>
          
          {/* Widget Llamadas Pendientes con botón */}
          <Link href="/dashboard/school-admin/vision/1/call-management?level=BASIC" className="h-full">
            <div className="bg-gradient-to-br from-yellow-900/40 via-orange-900/30 to-slate-900 border-2 border-yellow-500/30 rounded-2xl p-6 hover:border-yellow-500/50 transition-all cursor-pointer group hover:scale-105 hover:shadow-2xl h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/20 group-hover:bg-yellow-500/30 rounded-xl transition-colors">
                    <Ticket className="text-yellow-400" size={32} />
                  </div>
                  <div>
                    <div className="text-yellow-400 text-sm font-medium uppercase tracking-wider">Llamadas Pendientes</div>
                    <div className="text-white text-4xl font-black mt-1">0/50</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Gestión de llamadas del día</span>
                <div className="flex items-center gap-2 text-yellow-400 font-semibold group-hover:gap-3 transition-all">
                  <span>Ir a llamadas</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Widget de Alertas Médicas */}
        <div className="mt-8">
          <MedicalAlertsWidget />
        </div>

        {/* Widget Monitor de Llamadas GC */}
        <div className="mt-8">
          <GCCallsMonitorWidget />
        </div>

        {/* Widget de Tesorería Express */}
        <div className="mt-8">
          <TreasuryQuickWidget />
        </div>

        {/* Widget de Productos Activos */}
        <div className="mt-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Calendar className="text-cyan-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Entrenamientos Activos</h2>
                  <p className="text-sm text-slate-400">Ordenados por fecha de inicio</p>
                </div>
              </div>
              <div className="text-cyan-400 font-bold text-lg">{productos.length}</div>
            </div>

            {loadingProductos ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                <p className="text-slate-400 mt-4">Cargando productos...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="mx-auto text-slate-600 mb-4" size={48} />
                <p className="text-slate-400">No hay productos activos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productos.map((producto: any) => {
                  const startDate = producto.startDate ? new Date(producto.startDate) : null;
                  const now = new Date();
                  const hasStarted = startDate && startDate <= now;
                  const showCountdown = countdown[producto.id];

                  return (
                    <Link
                      key={producto.id}
                      href={`/dashboard/school-admin/vision/${producto.visionId}/manage`}
                      className="block"
                    >
                      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/50 transition-all cursor-pointer group hover:scale-[1.02]">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">
                              {producto.name}
                            </h3>
                            {producto.description && (
                              <p className="text-slate-400 text-sm line-clamp-1">
                                {producto.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {/* Badge de Tipo (Workshop/Training) */}
                            {producto.type && (
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                producto.type === 'WORKSHOP' 
                                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                                  : producto.type === 'EXTRA_WORKSHOP'
                                  ? 'bg-pink-500/20 text-pink-400 border-pink-500/50'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                              }`}>
                                {producto.type === 'WORKSHOP' ? '🎯 Taller' : 
                                 producto.type === 'EXTRA_WORKSHOP' ? '✨ Taller Extra' : 
                                 '📚 Entrenamiento'}
                              </div>
                            )}
                            {/* Badge de Nivel */}
                            {producto.levelType && producto.levelType !== 'NONE' && (
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                producto.levelType === 'BASIC' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                  : producto.levelType === 'INTERMEDIATE'
                                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                  : producto.levelType === 'ADVANCED'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                  : producto.levelType === 'PL'
                                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                                  : 'bg-slate-500/20 text-slate-400 border-slate-500/50'
                              }`}>
                                {producto.levelType === 'BASIC' ? 'Básico' : 
                                 producto.levelType === 'INTERMEDIATE' ? 'Intermedio' : 
                                 producto.levelType === 'ADVANCED' ? 'Avanzado' :
                                 producto.levelType === 'PL' ? 'Liderato' :
                                 producto.levelType}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <span className="text-slate-300">
                                {startDate ? new Date(startDate).toLocaleDateString('es-ES', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  year: 'numeric'
                                }) : 'Sin fecha'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-400" />
                              <span className="text-slate-300">
                                {producto.currentEnrollment || 0}/{producto.maxCapacity || 0}
                              </span>
                            </div>
                          </div>

                          {showCountdown && !hasStarted && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 px-4 py-2 rounded-lg animate-pulse">
                              <Clock size={16} className="text-orange-400" />
                              <span className="text-orange-400 font-bold font-mono text-sm">
                                {countdown[producto.id]}
                              </span>
                            </div>
                          )}

                          {hasStarted && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                En curso
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.location.href = `/staff/check-in/${producto.id}`;
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-all"
                              >
                                <Scan size={14} />
                                Check-In
                              </button>
                            </div>
                          )}

                          {!hasStarted && !showCountdown && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/staff/check-in/${producto.id}`;
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-600/20 to-slate-700/20 hover:from-cyan-500/20 hover:to-purple-500/20 border border-slate-500/50 hover:border-cyan-500/50 rounded-lg text-slate-400 hover:text-cyan-400 text-sm font-semibold transition-all"
                            >
                              <Scan size={14} />
                              Check-In
                            </button>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Widget de Formularios Médicos */}
        <div className="mt-8">
          <MedicalFormsListWidget />
        </div>

        {/* Sección de acciones adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gestionar Visiones */}
          <Link href="/dashboard/coordinador/visiones" className="block h-full">
            <div className="h-full bg-gradient-to-br from-emerald-900/50 to-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/20 group-hover:bg-emerald-500/30 rounded-xl transition-colors">
                  <Users size={24} className="text-emerald-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm uppercase">
                    Gestionar Visiones
                  </h3>
                  <p className="text-xs text-emerald-300">
                    Crea y asigna licencias
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-auto">
                Crea visiones/grupos y gestiona las licencias de tus participantes
              </p>
            </div>
          </Link>

          {/* Ver Participantes */}
          <Link href="/dashboard/coordinador/participantes" className="block h-full">
            <div className="h-full bg-gradient-to-br from-cyan-900/50 to-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-cyan-500/20 group-hover:bg-cyan-500/30 rounded-xl transition-colors">
                  <GraduationCap size={24} className="text-cyan-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm uppercase">
                    Ver Mis Participantes
                  </h3>
                  <p className="text-xs text-cyan-300">
                    Detalle y avances
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-auto">
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
