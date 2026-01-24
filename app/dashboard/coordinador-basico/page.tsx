'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Ticket, AlertTriangle, Building2, GraduationCap, Activity,
  Clock, Calendar, Scan, Heart, ChevronRight, X, Phone, Mail, Loader2, History
} from 'lucide-react';
import Link from 'next/link';
import MedicalAlertsWidget from '@/components/dashboard/MedicalAlertsWidget';
import GCCallsMonitorWidget from '@/components/dashboard/GCCallsMonitorWidget';
import TreasuryQuickWidget from '@/components/dashboard/TreasuryQuickWidget';
import BacklogsDropsWidget from '@/components/dashboard/BacklogsDropsWidget';
import PersonalQRWidget from '@/components/dashboard/PersonalQRWidget';
import { ElCruceAccessWidget } from '@/components/el-cruce';

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
  const [medicalAlertsCount, setMedicalAlertsCount] = useState(0);
  const [callsData, setCallsData] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [preRegistros, setPreRegistros] = useState<{ pending: number; paid: number; total: number }>({ pending: 0, paid: 0, total: 0 });
  const [visionInfo, setVisionInfo] = useState<{ nombre: string; level: string } | null>(null);
  const [advancedStats, setAdvancedStats] = useState<{ pending: number; enrolled: number; total: number }>({ pending: 0, enrolled: 0, total: 0 });
  const [widgetStats, setWidgetStats] = useState<{ 
    declarados: { numerator: number; denominator: number }; 
    inscritos: { numerator: number; denominator: number } 
  }>({ declarados: { numerator: 0, denominator: 0 }, inscritos: { numerator: 0, denominator: 0 } });
  
  // Estados para modales de Declarados e Inscritos
  const [showDeclaradosModal, setShowDeclaradosModal] = useState(false);
  const [showInscritosModal, setShowInscritosModal] = useState(false);
  const [declaradosList, setDeclaradosList] = useState<any[]>([]);
  const [inscritosList, setInscritosList] = useState<any[]>([]);
  const [loadingDeclarados, setLoadingDeclarados] = useState(false);
  const [loadingInscritos, setLoadingInscritos] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINATOR_BASIC') {
      router.push('/dashboard');
    } else {
      fetchDashboardData();
      fetchProductos();
      fetchMedicalAlerts();
      fetchCallsData();
      fetchPreRegistros();
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

  const fetchMedicalAlerts = async () => {
    try {
      const res = await fetch('/api/coordinator/medical-alerts?onlyAlerts=true');
      const result = await res.json();
      if (res.ok && result.success) {
        setMedicalAlertsCount(result.unreviewedAlertsCount || 0);
      }
    } catch (error) {
      console.error('Error fetching medical alerts:', error);
    }
  };

  const fetchCallsData = async () => {
    try {
      const res = await fetch('/api/gc-calls/today-stats?level=BASIC');
      const result = await res.json();
      if (res.ok && result.success) {
        setCallsData({
          completed: result.completed || 0,
          total: result.total || 0
        });
      }
    } catch (error) {
      console.error('Error fetching calls data:', error);
    }
  };

  const fetchPreRegistros = async () => {
    try {
      const res = await fetch('/api/coordinador/training-stats');
      const result = await res.json();
      console.log('[Coordinador Básico] Training stats response:', result);
      
      if (res.ok && result.success) {
        // Usar estadísticas del SIGUIENTE NIVEL
        const nextLevelStats = result.stats?.nextLevelStats;
        const nextLevel = result.stats?.nextLevel;
        const nextLevelName = result.stats?.nextLevelName;
        const currentProduct = result.stats?.currentProduct;
        const widgetStatsData = result.stats?.widgetStats;
        
        console.log('[Coordinador Básico] Current product:', currentProduct);
        console.log('[Coordinador Básico] Next level:', nextLevel, 'Stats:', nextLevelStats);
        console.log('[Coordinador Básico] Widget stats:', widgetStatsData);
        
        setPreRegistros({
          pending: result.stats?.preRegistros?.pending || 0,
          paid: result.stats?.preRegistros?.paid || 0,
          total: result.stats?.preRegistros?.total || 0,
        });
        
        // Guardar estadísticas de widgets con numerador/denominador correctos
        if (widgetStatsData) {
          setWidgetStats(widgetStatsData);
        }
        
        // Mostrar información del SIGUIENTE NIVEL
        if (nextLevel && nextLevelStats) {
          setVisionInfo({
            nombre: nextLevelName || currentProduct?.visionName || 'Visión',
            level: nextLevel
          });
          setAdvancedStats(nextLevelStats);
        } else if (currentProduct) {
          setVisionInfo({
            nombre: currentProduct.visionName || currentProduct.name,
            level: currentProduct.level || (currentProduct.levelType === 'BASIC' ? 'BÁSICO' : 'AVANZADO')
          });
          if (result.stats?.advancedStats) {
            setAdvancedStats(result.stats.advancedStats);
          }
        } else {
          // Fallback
          const advancedProduct = result.stats?.activeProducts?.find((p: any) => p.levelType === 'ADVANCED');
          if (advancedProduct?.visionName) {
            setVisionInfo({
              nombre: advancedProduct.visionName,
              level: 'AVANZADO'
            });
          }
          if (result.stats?.advancedStats) {
            setAdvancedStats(result.stats.advancedStats);
          }
        }
      } else {
        console.error('Training stats error:', result.error);
      }
    } catch (error) {
      console.error('Error fetching pre-registros:', error);
    }
  };

  // Cargar lista de declarados (pendientes de pago)
  const fetchDeclaradosList = async () => {
    setLoadingDeclarados(true);
    try {
      const res = await fetch('/api/coordinador/participantes-lista?status=PENDING&level=ADVANCED');
      const result = await res.json();
      if (res.ok && result.success) {
        setDeclaradosList(result.participantes || []);
      }
    } catch (error) {
      console.error('Error fetching declarados:', error);
    } finally {
      setLoadingDeclarados(false);
    }
  };

  // Cargar lista de inscritos (pagados)
  const fetchInscritosList = async () => {
    setLoadingInscritos(true);
    try {
      const res = await fetch('/api/coordinador/participantes-lista?status=ENROLLED&level=ADVANCED');
      const result = await res.json();
      if (res.ok && result.success) {
        setInscritosList(result.participantes || []);
      }
    } catch (error) {
      console.error('Error fetching inscritos:', error);
    } finally {
      setLoadingInscritos(false);
    }
  };

  // Handlers para abrir modales
  const handleOpenDeclarados = () => {
    fetchDeclaradosList();
    setShowDeclaradosModal(true);
  };

  const handleOpenInscritos = () => {
    fetchInscritosList();
    setShowInscritosModal(true);
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
        <div className="grid grid-cols-1 gap-6">
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
                    <div className="text-white text-4xl font-black mt-1">{callsData.completed}/{callsData.total}</div>
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

        {/* Widgets de Declarados e Inscritos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Widget de Declarados */}
          <div onClick={handleOpenDeclarados} className="cursor-pointer">
            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900/80 border-2 border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all group">
              {/* Header con nombre de visión y nivel */}
              {visionInfo && (
                <div className="mb-3 pb-3 border-b border-amber-500/20">
                  <p className="text-xs text-amber-300/70 font-medium">
                    📍 {visionInfo.nombre} • <span className="text-orange-400">Nivel {visionInfo.level}</span>
                  </p>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    DECLARADOS
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-black text-white">
                      {widgetStats.declarados.numerator}
                    </p>
                    <span className="text-xl text-slate-500 font-bold">/{widgetStats.declarados.denominator}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Participantes comprometidos
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Widget de Inscritos */}
          <div onClick={handleOpenInscritos} className="cursor-pointer">
            <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border-2 border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all group">
              {/* Header con nombre de visión y nivel */}
              {visionInfo && (
                <div className="mb-3 pb-3 border-b border-emerald-500/20">
                  <p className="text-xs text-emerald-300/70 font-medium">
                    📍 {visionInfo.nombre} • <span className="text-green-400">Nivel {visionInfo.level}</span>
                  </p>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    INSCRITOS
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-black text-white">
                      {widgetStats.inscritos.numerator}
                    </p>
                    <span className="text-xl text-slate-500 font-bold">/{widgetStats.inscritos.denominator}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Participantes pagados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget de Alertas Médicas */}
        <div className="mt-8">
          <MedicalAlertsWidget />
        </div>

        {/* Widget Monitor de Llamadas */}
        <div className="mt-8">
          <GCCallsMonitorWidget />
        </div>

        {/* Widget de Tesorería Express */}
        <div className="mt-8">
          <TreasuryQuickWidget />
        </div>

        {/* Widget de Backlogs y Drops */}
        <div className="mt-8">
          <BacklogsDropsWidget />
        </div>

        {/* Widget de El Atravezar */}
        <div className="mt-8">
          <ElCruceAccessWidget />
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/*              QR PERSONAL - INVITAR PARTICIPANTES    */}
        {/* ═══════════════════════════════════════════════════ */}
        {session?.user && (
          <div className="mt-8">
            <PersonalQRWidget
              userName={session.user.name || 'Coordinador'}
              userId={parseInt(session.user.id as string)}
              userEmail={session.user.email || ''}
              referralCode={session.user.referralCode}
              organizationId={session.user.organizationId}
            />
          </div>
        )}

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
                  // Para PL, usar plWeekend1StartDate; para otros, usar startDate
                  const isPL = producto.levelType === 'PL';
                  const effectiveStartDate = isPL 
                    ? (producto.plWeekend1StartDate ? new Date(producto.plWeekend1StartDate) : null)
                    : (producto.startDate ? new Date(producto.startDate) : null);
                  const now = new Date();
                  
                  // Lógica de Check-In:
                  // - Countdown: 24h antes hasta las 9 AM del día del entrenamiento
                  // - Botón Check-In: Desde las 9 AM hasta las 11 PM del primer día
                  // - En curso (sin Check-In): Después de las 11 PM
                  
                  let showCheckInButton = false;
                  let showInProgress = false;
                  
                  if (effectiveStartDate) {
                    // El Check-In siempre empieza a las 9 AM del día del entrenamiento
                    const checkInStartTime = new Date(effectiveStartDate);
                    checkInStartTime.setHours(9, 0, 0, 0);
                    
                    // 11 PM del día del entrenamiento (límite de Check-In)
                    const checkInDeadline = new Date(effectiveStartDate);
                    checkInDeadline.setHours(23, 0, 0, 0);
                    
                    // Botón Check-In: desde las 9 AM hasta las 11 PM
                    showCheckInButton = now >= checkInStartTime && now <= checkInDeadline;
                    
                    // En curso (sin botón): después de las 11 PM
                    showInProgress = now > checkInDeadline;
                  }
                  
                  const isCompleted = producto.trainingStatus === 'COMPLETED';
                  const showCountdown = countdown[producto.id]; // Ya calculado en el useEffect (24h antes hasta 9 AM)

                  return (
                    <Link
                      key={producto.id}
                      href={`/dashboard/school-admin/vision/${producto.visionId}/manage`}
                      className="block"
                    >
                      <div className={`rounded-xl p-5 transition-all cursor-pointer group hover:scale-[1.02] ${
                        isCompleted
                          ? 'bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900 border-2 border-slate-600/50'
                          : (showCheckInButton || showInProgress)
                          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-slate-900 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-slate-700/50 hover:border-cyan-500/50'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-base sm:text-lg mb-1 group-hover:text-cyan-400 transition-colors truncate">
                              {producto.name}
                            </h3>
                            {producto.description && (
                              <p className="text-slate-400 text-xs sm:text-sm line-clamp-1">
                                {producto.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* Badge de Tipo (Workshop/Training) */}
                            {producto.type && (
                              <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
                                producto.type === 'WORKSHOP' 
                                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                                  : producto.type === 'EXTRA_WORKSHOP'
                                  ? 'bg-pink-500/20 text-pink-400 border-pink-500/50'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                              }`}>
                                {producto.type === 'WORKSHOP' ? '🎯 Taller' : 
                                 producto.type === 'EXTRA_WORKSHOP' ? '✨ Extra' : 
                                 '📚 Entrena...'}
                              </div>
                            )}
                            {/* Badge de Nivel */}
                            {producto.levelType && producto.levelType !== 'NONE' && (
                              <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
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

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                              <span className="text-slate-300">
                                {startDate ? new Date(startDate).toLocaleDateString('es-ES', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  year: 'numeric'
                                }) : 'Sin fecha'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Users size={14} className="text-slate-400 flex-shrink-0" />
                              <span className="text-slate-300">
                                {producto.currentEnrollment || 0}/{producto.maxCapacity || 0}
                              </span>
                            </div>
                          </div>

                          {/* Status y botones - ahora en su propia fila en móvil */}
                          <div className="flex items-center justify-end sm:justify-start">
                          {/* Countdown: 24h antes hasta 9 AM del día del entrenamiento */}
                          {showCountdown && !isCompleted && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/staff/check-in/${producto.id}`;
                              }}
                              className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 border border-orange-500/50 px-4 py-2 rounded-lg animate-pulse cursor-pointer transition-all"
                            >
                              <Clock size={16} className="text-orange-400" />
                              <span className="text-orange-400 font-bold font-mono text-sm">
                                {countdown[producto.id]}
                              </span>
                            </button>
                          )}

                          {/* Completado */}
                          {isCompleted && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
                                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                Completado
                              </div>
                            </div>
                          )}

                          {/* Botón Check-In: desde 9 AM hasta 1 PM del primer día */}
                          {showCheckInButton && !isCompleted && !showCountdown && (
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
                          )}

                          {/* En curso (después de las 11 PM): sin botón Check-In */}
                          {showInProgress && !isCompleted && (
                            <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm font-semibold">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              En curso
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Widget de Registros Médicos - Acceso Rápido */}
        <Link href="/dashboard/coordinador/medical-records" className="block mt-8">
          <div className="bg-gradient-to-br from-red-900/50 via-pink-900/30 to-slate-900 border-2 border-red-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 relative overflow-hidden">
            {/* Badge de alertas */}
            {medicalAlertsCount > 0 && (
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <div className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-red-400 opacity-75"></div>
                  <div className="relative inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 border-2 border-slate-900">
                    <span className="text-white font-bold text-xs">{medicalAlertsCount}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 group-hover:bg-red-500/30 rounded-xl transition-colors">
                <Heart size={24} className="text-red-300" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">
                  🏥 REGISTROS MÉDICOS
                </h3>
                <p className="text-xs text-red-300">
                  {medicalAlertsCount > 0 ? `${medicalAlertsCount} alertas pendientes` : 'Ver formularios médicos'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Revisa los registros médicos de los participantes y alertas de condiciones especiales
            </p>
          </div>
        </Link>

        {/* Widget de Historial de Entrenamientos */}
        <Link href="/dashboard/coordinator/training-history" className="block mt-8">
          <div className="bg-gradient-to-br from-indigo-900/50 via-purple-900/30 to-slate-900 border-2 border-indigo-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-500/20 group-hover:bg-indigo-500/30 rounded-xl transition-colors">
                <History size={24} className="text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase">
                  📋 HISTORIAL DE ENTRENAMIENTOS
                </h3>
                <p className="text-xs text-indigo-300">
                  Todos los entrenamientos
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Ver entrenamientos activos, próximos y completados de tu organización
            </p>
          </div>
        </Link>
      </div>

      {/* Modal de Declarados */}
      {showDeclaradosModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Users className="text-amber-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Declarados - Pendientes de Pago</h2>
                  <p className="text-sm text-slate-400">Nivel {visionInfo?.level || 'Avanzado'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeclaradosModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-400" size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingDeclarados ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-amber-400" size={32} />
                </div>
              ) : declaradosList.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400">No hay participantes pendientes de pago</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {declaradosList.map((participante: any) => (
                    <div
                      key={participante.id}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                            <span className="text-amber-400 font-bold">
                              {participante.nombre?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{participante.nombre}</p>
                            <p className="text-sm text-slate-400">{participante.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {participante.telefono && (
                            <a
                              href={`tel:${participante.telefono}`}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="text-green-400" size={16} />
                            </a>
                          )}
                          <a
                            href={`mailto:${participante.email}`}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="text-blue-400" size={16} />
                          </a>
                        </div>
                      </div>
                      {participante.telefono && (
                        <p className="text-xs text-slate-500 mt-2 ml-13">📱 {participante.telefono}</p>
                      )}
                      {/* Información del invitador */}
                      {participante.invitador && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-400 font-medium">👤 Invitado por:</span>
                              <span className="text-xs text-white">{participante.invitador.nombre}</span>
                            </div>
                            {participante.invitador.telefono && (
                              <a
                                href={`tel:${participante.invitador.telefono}`}
                                className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={12} />
                                <span>{participante.invitador.telefono}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <p className="text-center text-sm text-slate-400">
                Total: <span className="text-amber-400 font-bold">{declaradosList.length}</span> participantes pendientes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Inscritos */}
      {showInscritosModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <GraduationCap className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Inscritos - Participantes Pagados</h2>
                  <p className="text-sm text-slate-400">Nivel {visionInfo?.level || 'Avanzado'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowInscritosModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-400" size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingInscritos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-emerald-400" size={32} />
                </div>
              ) : inscritosList.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400">No hay participantes inscritos aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inscritosList.map((participante: any) => (
                    <div
                      key={participante.id}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <span className="text-emerald-400 font-bold">
                              {participante.nombre?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{participante.nombre}</p>
                            <p className="text-sm text-slate-400">{participante.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
                            ✓ PAGADO
                          </span>
                          {participante.telefono && (
                            <a
                              href={`tel:${participante.telefono}`}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="text-green-400" size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                      {participante.telefono && (
                        <p className="text-xs text-slate-500 mt-2 ml-13">📱 {participante.telefono}</p>
                      )}
                      {/* Información del invitador */}
                      {participante.invitador && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-400 font-medium">👤 Invitado por:</span>
                              <span className="text-xs text-white">{participante.invitador.nombre}</span>
                            </div>
                            {participante.invitador.telefono && (
                              <a
                                href={`tel:${participante.invitador.telefono}`}
                                className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={12} />
                                <span>{participante.invitador.telefono}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
              <p className="text-center text-sm text-slate-400">
                Total: <span className="text-emerald-400 font-bold">{inscritosList.length}</span> participantes inscritos
              </p>
            </div>
          </div>
        </div>
      )}
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
