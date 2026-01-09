'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Target, Ticket, BarChart3, Zap,
  AlertTriangle, Building2, GraduationCap, Star, Activity,
  FileText, CheckCircle, Shield, Clock, Calendar
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

export default function CoordinadorBasicoDashboard() {
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
  const [consejoQuantum, setConsejoQuantum] = useState<any>(null);
  const [loadingConsejo, setLoadingConsejo] = useState(true);
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
      fetchActionStats();
      fetchConsejoQuantum();
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

  const fetchConsejoQuantum = async () => {
    try {
      const res = await fetch('/api/quantum/consejo-vision');
      const result = await res.json();
      if (res.ok && result.success) {
        setConsejoQuantum(result.consejo);
      }
    } catch (error) {
      console.error('Error fetching consejo quantum:', error);
    } finally {
      setLoadingConsejo(false);
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
          <div className="bg-gradient-to-br from-blue-900/40 via-cyan-900/30 to-slate-900 border-2 border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:scale-105 hover:shadow-2xl">
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
              <span className="text-slate-400 text-sm">Todos los usuarios que pertenecen la comunidad</span>
            </div>
          </div>
          
          {/* Widget Llamadas Pendientes con botón */}
          <Link href="/dashboard/school-admin/vision/1/call-management?level=BASIC">
            <div className="bg-gradient-to-br from-yellow-900/40 via-orange-900/30 to-slate-900 border-2 border-yellow-500/30 rounded-2xl p-6 hover:border-yellow-500/50 transition-all cursor-pointer group hover:scale-105 hover:shadow-2xl">
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

        {/* Widget de Productos Activos */}
        <div className="mt-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Calendar className="text-cyan-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Productos Activos</h2>
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
                      href={`/dashboard/school-admin/vision/${producto.visionId}`}
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
                            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              En curso
                            </div>
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
          <Link href="/dashboard/coordinador/cartas-pendientes?filter=APROBADA">
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

          {/* Widget 4: En Riesgo + Gestión de Strikes (FUSIONADO) */}
          <div className="bg-gradient-to-br from-orange-900/40 via-purple-900/30 to-slate-900 border-2 border-orange-500/30 rounded-3xl p-8 hover:border-orange-500/50 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-gradient-to-br from-orange-500/20 to-purple-500/20 group-hover:from-orange-500/30 group-hover:to-purple-500/30 rounded-xl transition-colors">
                <Shield size={32} className="text-orange-400" />
              </div>
              <Target size={20} className="text-orange-400/60" />
            </div>
            <p className="text-6xl font-black text-white mb-2">{stats.participantesRiesgo}</p>
            <p className="text-lg font-bold text-white mb-1">En Riesgo</p>
            <p className="text-xs text-slate-400 mb-4">Participantes con 2+ faltas</p>
            
            {/* Botón de acceso a Strikes */}
            <Link href="/dashboard/coordinador/strikes">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 flex items-center justify-center gap-2">
                <Shield size={18} />
                Gestionar Strikes
              </button>
            </Link>
          </div>

          {/* Widget 5: Misiones & Tareas Extraordinarias (NUEVO - DOBLE ESPACIO) */}
          <div className="lg:col-span-2 bg-gradient-to-br from-orange-900/40 via-yellow-900/30 to-orange-900/40 border-2 border-orange-600/40 rounded-3xl p-8">
            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <Zap className="text-yellow-400" size={28} />
              Misiones & Tareas Extraordinarias
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Misiones con Quantum IA */}
              <Link 
                href="/dashboard/admin/tareas/nueva?quantum=true"
                className="block p-5 bg-slate-900/60 border border-purple-600/30 rounded-xl hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                      <FileText size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">
                        🧠 Misiones con Quantum IA
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Crea misiones personalizadas con IA
                      </p>
                    </div>
                  </div>
                  <div className="text-purple-400 group-hover:translate-x-1 transition-transform text-2xl">→</div>
                </div>
              </Link>

              {/* Tareas Extraordinarias */}
              <Link 
                href="/dashboard/admin/tareas/nueva"
                className="block p-5 bg-slate-900/60 border border-orange-600/30 rounded-xl hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                      <Shield size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-orange-300 transition-colors">
                        ⚡ Tareas Extraordinarias
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Asigna tareas para activar visión
                      </p>
                    </div>
                  </div>
                  <div className="text-orange-400 group-hover:translate-x-1 transition-transform text-2xl">→</div>
                </div>
              </Link>
            </div>

            {/* Tip de Quantum IA */}
            <div className="mt-5 p-5 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-600/30 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{loadingConsejo ? '⏳' : consejoQuantum?.emoji || '🧬'}</div>
                <div className="flex-1">
                  <p className="text-sm text-cyan-200 font-semibold mb-2">
                    💡 Consejo de Quantum IA {consejoQuantum?.tipo && `- ${consejoQuantum.tipo}`}
                  </p>
                  {loadingConsejo ? (
                    <p className="text-sm text-cyan-100/60 animate-pulse">
                      Cargando consejo de activación...
                    </p>
                  ) : (
                    <div 
                      className="text-sm text-cyan-100/80"
                      dangerouslySetInnerHTML={{ __html: consejoQuantum?.consejo || 'No hay consejo disponible' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Sección de acciones adicionales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revisar Evidencias de Tareas Extraordinarias */}
          <Link href="/dashboard/admin/evidencias" className="block h-full">
            <div className="h-full bg-gradient-to-br from-amber-900/50 to-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/20 group-hover:bg-amber-500/30 rounded-xl transition-colors">
                  <Zap size={24} className="text-amber-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm uppercase">
                    Revisar Evidencias
                  </h3>
                  <p className="text-xs text-amber-300">
                    Tareas extraordinarias y eventos
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-auto">
                Revisa y aprueba evidencias de misiones y tareas especiales
              </p>
            </div>
          </Link>

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
