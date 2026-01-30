'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Ticket, AlertTriangle, Building2, GraduationCap, Activity,
  Clock, Calendar, Scan, Heart, Mic, BookOpen, Rocket, ChevronRight,
  X, Loader2, Phone, Mail, CreditCard, FileText, CheckCircle, Flag,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import MedicalAlertsWidget from '@/components/dashboard/MedicalAlertsWidget';
import GCCallsMonitorWidget from '@/components/dashboard/GCCallsMonitorWidget';
import { ElCruceAccessWidget, TopFileModal } from '@/components/el-cruce';
import { TrainerSurveyModal } from '@/components/training-closure';
import VisionHistoryWidget from '@/components/widgets/VisionHistoryWidget';

interface PreRegistro {
  id: string;
  status: string;
  scannedAt: string;
  promoPrice: number | null;
  regularPrice: number | null;
  promoDeadline: string | null;
  paidAt: string | null;
  paymentAmount: number | null;
  paymentMethod: string | null;
  user: {
    id: number;
    nombre: string;
    email: string;
    telefono: string | null;
    imagen: string | null;
  };
  currentProduct: { id: number; name: string; levelType: string } | null;
  targetProduct: { id: number; name: string; levelType: string } | null;
  scannedBy: { id: number; nombre: string } | null;
  gameChanger: { id: number; nombre: string; imagen: string | null } | null;
}

interface Entrenamiento {
  id: number;
  name: string;
  description?: string;
  levelType: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  maxCapacity?: number;
  currentEnrollment?: number;
  visionId?: number;
  estado: string;
  inscritos: number;
  checkedIn: number;
  declarados?: number;
  preRegistrosPendientes?: number;
  participantesPagados?: number;
  Vision?: { id: number; nombre: string; };
  Organization?: { id: number; name: string; logo?: string; };
}

interface TrainerData {
  trainer: { id: number; nombre: string; };
  entrenamientos: {
    enCurso: Entrenamiento[];
    proximos: Entrenamiento[];
    finalizados: Entrenamiento[];
  };
  stats: {
    totalAsignados: number;
    enCurso: number;
    proximos: number;
    finalizados: number;
    totalPreRegistrosPendientes?: number;
    totalParticipantesPagados?: number;
    totalInscritos?: number;
    // Nuevos stats
    totalInscritosVision?: number;
    totalDeclarados?: number;
    totalConfirmadosAvanzado?: number;
    // Info del nivel del trainer
    trainerLevel?: 'BASIC' | 'ADVANCED' | 'PL' | null;
    isBasicTrainer?: boolean;
    isAdvancedTrainer?: boolean;
    isPLTrainer?: boolean;
  };
}

export default function TrainerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<TrainerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<{[key: number]: string}>({});
  const [medicalAlertsCount, setMedicalAlertsCount] = useState(0);
  
  // Estados para modales de pre-registros
  const [showPreRegistrosModal, setShowPreRegistrosModal] = useState(false);
  const [preRegistrosFilter, setPreRegistrosFilter] = useState<'PENDING' | 'PAID'>('PENDING');
  const [preRegistros, setPreRegistros] = useState<PreRegistro[]>([]);
  const [loadingPreRegistros, setLoadingPreRegistros] = useState(false);
  
  // Estado para TOP FILE
  const [selectedUserForTopFile, setSelectedUserForTopFile] = useState<{id: number, nombre: string} | null>(null);
  const [showTopFile, setShowTopFile] = useState(false);
  
  // Estados para finalizar entrenamiento
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [productoAFinalizar, setProductoAFinalizar] = useState<Entrenamiento | null>(null);
  const [finalizandoEntrenamiento, setFinalizandoEntrenamiento] = useState(false);
  
  // Estados para encuesta de cierre
  const [showTrainerSurvey, setShowTrainerSurvey] = useState(false);
  const [productoParaEncuesta, setProductoParaEncuesta] = useState<Entrenamiento | null>(null);

  // Combinar todos los productos para mostrar (memoizado para evitar re-renders infinitos)
  const productos = useMemo(() => {
    if (!data) return [];
    return [
      ...data.entrenamientos.enCurso,
      ...data.entrenamientos.proximos
    ];
  }, [data]);

  useEffect(() => {
    if (status === 'loading') {
      // Esperar a que la sesión cargue antes de tomar decisiones
      return;
    }
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'TRAINER' && !session?.user?.esEntrenador) {
      // Permitir acceso si rol es TRAINER o si tiene el flag esEntrenador
      router.push('/dashboard');
    } else {
      fetchMisEntrenamientos();
      fetchMedicalAlerts();
    }
  }, [status, session]);

  const fetchMisEntrenamientos = async () => {
    try {
      const res = await fetch('/api/trainer/mis-entrenamientos');
      const result = await res.json();

      if (res.ok && result.success) {
        setData(result);
      } else {
        // Si hay error pero es trainer válido, mostrar dashboard vacío
        console.error('Error API:', result.error);
        setData({
          trainer: { id: 0, nombre: session?.user?.email || 'Trainer' },
          entrenamientos: { enCurso: [], proximos: [], finalizados: [] },
          stats: { totalAsignados: 0, enCurso: 0, proximos: 0, finalizados: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching entrenamientos:', error);
      // Mostrar dashboard vacío en caso de error de red
      setData({
        trainer: { id: 0, nombre: session?.user?.email || 'Trainer' },
        entrenamientos: { enCurso: [], proximos: [], finalizados: [] },
        stats: { totalAsignados: 0, enCurso: 0, proximos: 0, finalizados: 0 }
      });
    } finally {
      setLoading(false);
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

  // Función para cargar pre-registros
  const fetchPreRegistros = async (status: 'PENDING' | 'PAID') => {
    setLoadingPreRegistros(true);
    try {
      const res = await fetch(`/api/trainer/pre-registros-lista?status=${status}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setPreRegistros(result.preRegistros);
      }
    } catch (error) {
      console.error('Error fetching pre-registros:', error);
    } finally {
      setLoadingPreRegistros(false);
    }
  };

  // Abrir modal de pre-registros
  const openPreRegistrosModal = (filter: 'PENDING' | 'PAID') => {
    setPreRegistrosFilter(filter);
    setShowPreRegistrosModal(true);
    fetchPreRegistros(filter);
  };

  // Abrir TOP FILE de un usuario
  const openTopFile = (userId: number, nombre: string) => {
    setSelectedUserForTopFile({ id: userId, nombre });
    setShowTopFile(true);
  };

  // Verificar si es el último día del entrenamiento
  const esUltimoDia = (endDate: string | undefined): boolean => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    // Comparar solo las fechas (sin hora)
    return end.toDateString() === now.toDateString();
  };

  // Abrir modal para finalizar entrenamiento
  const abrirModalFinalizar = (producto: Entrenamiento) => {
    setProductoAFinalizar(producto);
    setShowFinalizarModal(true);
  };

  // Finalizar entrenamiento
  const finalizarEntrenamiento = async () => {
    if (!productoAFinalizar) return;
    
    setFinalizandoEntrenamiento(true);
    try {
      const res = await fetch(`/api/trainer/finish-training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productoAFinalizar.id })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        // Cerrar modal de confirmación
        setShowFinalizarModal(false);
        
        // Si el API indica mostrar encuesta, abrirla
        if (result.showSurvey) {
          setProductoParaEncuesta(productoAFinalizar);
          setShowTrainerSurvey(true);
        }
        
        setProductoAFinalizar(null);
        // Recargar datos
        await fetchMisEntrenamientos();
      } else {
        alert(result.error || 'Error al finalizar entrenamiento');
      }
    } catch (error) {
      console.error('Error finalizando entrenamiento:', error);
      alert('Error al finalizar entrenamiento');
    } finally {
      setFinalizandoEntrenamiento(false);
    }
  };
  
  // Cerrar encuesta del trainer
  const handleSurveyComplete = () => {
    setShowTrainerSurvey(false);
    setProductoParaEncuesta(null);
    fetchMisEntrenamientos();
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

      // Solo actualizar si hay cambios reales para evitar re-renders innecesarios
      setCountdown(prev => {
        const prevKeys = Object.keys(prev).sort().join(',');
        const newKeys = Object.keys(newCountdowns).sort().join(',');
        const prevVals = Object.values(prev).join(',');
        const newVals = Object.values(newCountdowns).join(',');
        if (prevKeys === newKeys && prevVals === newVals) return prev;
        return newCountdowns;
      });
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
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 text-2xl">
                Trainer
              </span>
            </h1>
            <p className="text-slate-400 mt-1">🎤 TRAINER • Facilitador de Entrenamientos</p>
            <p className="text-sm text-slate-500">{data.trainer?.nombre || session?.user?.email}</p>
          </div>
        </div>

        {/* KPI Cards - Declarados y Confirmados - Solo mostrar si el trainer tiene nivel asignado */}
        {data.stats.trainerLevel && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Widget Declarados */}
          <div 
            onClick={() => openPreRegistrosModal('PENDING')}
            className="bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 hover:border-amber-500/50 transition-all hover:scale-105 hover:shadow-2xl h-full cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-xl transition-colors">
                  <Users className="text-amber-400" size={32} />
                </div>
                <div>
                  <div className="text-amber-400 text-sm font-medium uppercase tracking-wider">
                    {data.stats.isBasicTrainer ? 'Declarados' : data.stats.isAdvancedTrainer ? 'Pre-registros PL' : 'Pre-registros'}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-white text-4xl font-black">{data.stats.totalDeclarados || 0}</span>
                    <span className="text-slate-500 text-xl font-bold">/{data.stats.totalInscritosVision || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                {data.stats.isBasicTrainer 
                  ? 'Pre-registros Avanzado / Inscritos Básico'
                  : data.stats.isAdvancedTrainer 
                  ? 'Declarados / Inscritos Avanzado'
                  : 'Pre-registros / Inscritos'}
              </span>
              <span className="text-amber-400 text-xs">Click para ver →</span>
            </div>
          </div>
          
          {/* Widget Confirmados */}
          <div 
            onClick={() => openPreRegistrosModal('PAID')}
            className="bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-slate-900 border-2 border-green-500/30 rounded-2xl p-6 hover:border-green-500/50 transition-all hover:scale-105 hover:shadow-2xl h-full cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-xl transition-colors relative">
                  <GraduationCap className="text-green-400" size={32} />
                  {(data.stats.totalConfirmadosAvanzado || 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div>
                  <div className="text-green-400 text-sm font-medium uppercase tracking-wider">
                    {data.stats.isBasicTrainer ? 'Confirmados Avanzado' : data.stats.isAdvancedTrainer ? 'Inscritos Avanzado' : 'Confirmados'}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-white text-4xl font-black">{data.stats.totalConfirmadosAvanzado || 0}</span>
                    <span className="text-slate-500 text-xl font-bold">/{data.stats.totalDeclarados || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                {data.stats.isBasicTrainer 
                  ? 'Pagados Avanzado / Pre-registros'
                  : data.stats.isAdvancedTrainer 
                  ? 'Ya inscritos / Declarados'
                  : 'Confirmados / Pre-registros'}
              </span>
              <span className="text-green-400 text-xs">Click para ver →</span>
            </div>
          </div>
        </div>
        )}

        {/* Widget de Bitácoras */}
        <div className="mt-8">
          <Link
            href="/dashboard/trainer/bitacoras"
            className="block bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Bitácoras</h2>
                  <p className="text-sm text-slate-400">Expedientes y alertas de participantes</p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" size={24} />
            </div>
          </Link>
        </div>

        {/* Widget de Alertas Médicas */}
        <div className="mt-8">
          <MedicalAlertsWidget />
        </div>

        {/* Widget de Biblioteca y Lanzador de Misiones */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                <BookOpen className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Sistema de Tareas</h2>
                <p className="text-sm text-slate-400">Crea y lanza misiones para tus participantes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Biblioteca del Entrenador */}
              <Link
                href="/dashboard/trainer/biblioteca"
                className="group p-5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-amber-500/50 hover:bg-slate-700/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-all">
                    <BookOpen className="text-amber-400" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">La Biblioteca</h3>
                    <p className="text-sm text-slate-400">Crea plantillas de tareas reutilizables</p>
                  </div>
                  <ChevronRight className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" size={20} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">📋 Cuestionarios</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">🎬 Contenido</span>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">⚡ Acciones</span>
                  <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-xs rounded-full">💭 Reflexiones</span>
                </div>
              </Link>

              {/* Lanzador de Misiones */}
              <Link
                href="/dashboard/trainer/lanzador"
                className="group p-5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-red-500/50 hover:bg-slate-700/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl group-hover:from-red-500/30 group-hover:to-orange-500/30 transition-all">
                    <Rocket className="text-red-400" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors">El Lanzador</h3>
                    <p className="text-sm text-slate-400">Lanza misiones en vivo a participantes</p>
                  </div>
                  <ChevronRight className="text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" size={20} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">🚀 Lanzar ahora</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">📅 Programar</span>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">👥 Por visión</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Widget Monitor de Llamadas */}
        <div className="mt-8">
          <GCCallsMonitorWidget />
        </div>

        {/* Widget de El Atravezar */}
        <div className="mt-8">
          <ElCruceAccessWidget trainerLevel={data?.stats?.trainerLevel} />
        </div>

        {/* Widget de Historial de Visiones */}
        <div className="mt-8">
          <VisionHistoryWidget />
        </div>

        {/* Widget de Mis Entrenamientos Asignados */}
        <div className="mt-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="text-purple-400 w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-white truncate">Mis Entrenamientos Asignados</h2>
                  <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Solo los entrenamientos donde eres trainer</p>
                </div>
              </div>
              <div className="text-purple-400 font-bold text-base sm:text-lg flex-shrink-0 ml-2">{productos.length}</div>
            </div>

            {productos.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="mx-auto text-slate-600 mb-4" size={48} />
                <p className="text-slate-400">No tienes entrenamientos asignados</p>
                <p className="text-sm text-slate-500 mt-2">Los directores de escuela pueden asignarte como trainer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productos.map((producto: Entrenamiento) => {
                  const startDate = producto.startDate ? new Date(producto.startDate) : null;
                  const endDate = producto.endDate ? new Date(producto.endDate) : null;
                  const now = new Date();
                  const hasStarted = producto.estado === 'EN_CURSO';
                  const showCountdown = countdown[producto.id];
                  
                  // Determinar si es el último día del entrenamiento
                  const isLastDay = endDate && 
                    endDate.toDateString() === now.toDateString();

                  return (
                    <div
                      key={producto.id}
                      className={`rounded-xl p-4 sm:p-5 transition-all ${
                        hasStarted 
                          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-slate-900 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-slate-700/50 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          {/* Organización */}
                          {producto.Organization && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              <Building2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{producto.Organization.name}</span>
                            </div>
                          )}
                          <h3 className="text-white font-bold text-base sm:text-lg mb-1 truncate">
                            {producto.name}
                          </h3>
                          {producto.Vision && (
                            <p className="text-purple-400/80 text-sm truncate">
                              Visión: {producto.Vision.nombre}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                               producto.type === 'EXTRA_WORKSHOP' ? '✨ Taller Extra' : 
                               '📚 Entrenamiento'}
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

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-300">
                              {startDate ? new Date(startDate).toLocaleDateString('es-ES', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              }) : 'Sin fecha'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Users size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-slate-300">
                              {producto.inscritos || 0} inscritos
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Users size={14} className="text-amber-400 flex-shrink-0" />
                            <span className="text-amber-400">
                              {producto.preRegistrosPendientes || 0} declarados
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <GraduationCap size={14} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-emerald-400">
                              {producto.participantesPagados || 0} pagados
                            </span>
                          </div>
                        </div>

                        {showCountdown && !hasStarted && (
                          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 px-3 sm:px-4 py-2 rounded-lg animate-pulse self-start sm:self-auto">
                            <Clock size={16} className="text-orange-400 flex-shrink-0" />
                            <span className="text-orange-400 font-bold font-mono text-xs sm:text-sm">
                              {countdown[producto.id]}
                            </span>
                          </div>
                        )}

                        {hasStarted && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm font-semibold">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              En curso
                            </div>
                            
                            {/* Botón Finalizar - Solo visible el último día */}
                            {isLastDay && (
                              <button
                                onClick={() => abrirModalFinalizar(producto)}
                                disabled={finalizandoEntrenamiento}
                                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 hover:from-red-500/30 hover:to-orange-500/30 border border-red-500/50 rounded-lg text-red-400 hover:text-red-300 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 size={14} />
                                {finalizandoEntrenamiento ? 'Finalizando...' : 'Finalizar'}
                              </button>
                            )}
                          </div>
                        )}

                        {!hasStarted && !showCountdown && (
                          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-400 text-xs sm:text-sm self-start sm:self-auto">
                            <Calendar size={14} />
                            Próximo
                          </div>
                        )}
                      </div>

                      {/* Barra de Porcentaje de Pase - Solo para entrenamientos en curso o finalizados con check-ins */}
                      {hasStarted && producto.checkedIn > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium">📈 Porcentaje de Pase</span>
                              <span className="text-slate-400">({producto.participantesPagados || 0} pagados / {producto.checkedIn} asistieron)</span>
                            </span>
                            <span className={`font-bold ${
                              ((producto.participantesPagados || 0) / producto.checkedIn) * 100 >= 70 
                                ? 'text-emerald-400' 
                                : ((producto.participantesPagados || 0) / producto.checkedIn) * 100 >= 40 
                                  ? 'text-amber-400' 
                                  : 'text-red-400'
                            }`}>
                              {Math.round(((producto.participantesPagados || 0) / producto.checkedIn) * 100)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                ((producto.participantesPagados || 0) / producto.checkedIn) * 100 >= 70 
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                                  : ((producto.participantesPagados || 0) / producto.checkedIn) * 100 >= 40 
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                                    : 'bg-gradient-to-r from-red-500 to-orange-400'
                              }`}
                              style={{ width: `${Math.min(((producto.participantesPagados || 0) / producto.checkedIn) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
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
              Revisa los registros médicos de los participantes de tus entrenamientos
            </p>
          </div>
        </Link>
      </div>

      {/* Modal de Pre-registros */}
      <AnimatePresence>
        {showPreRegistrosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreRegistrosModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-4 border-b border-slate-700 flex items-center justify-between ${
                preRegistrosFilter === 'PENDING' 
                  ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10' 
                  : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    preRegistrosFilter === 'PENDING' 
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-500'
                  }`}>
                    {preRegistrosFilter === 'PENDING' ? (
                      <Users className="w-5 h-5 text-white" />
                    ) : (
                      <GraduationCap className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      {preRegistrosFilter === 'PENDING' ? 'Declarados - Pendientes de Pago' : 'Confirmados - Ya Pagaron'}
                    </h3>
                    <p className={`text-xs ${preRegistrosFilter === 'PENDING' ? 'text-amber-400/70' : 'text-green-400/70'}`}>
                      {preRegistrosFilter === 'PENDING' 
                        ? 'Pre-registros para avanzado' 
                        : 'Participantes inscritos en avanzado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreRegistrosModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Tabs para cambiar entre PENDING y PAID */}
              <div className="flex border-b border-slate-700">
                <button
                  onClick={() => {
                    setPreRegistrosFilter('PENDING');
                    fetchPreRegistros('PENDING');
                  }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    preRegistrosFilter === 'PENDING'
                      ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Declarados
                </button>
                <button
                  onClick={() => {
                    setPreRegistrosFilter('PAID');
                    fetchPreRegistros('PAID');
                  }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    preRegistrosFilter === 'PAID'
                      ? 'text-green-400 border-b-2 border-green-400 bg-green-500/10'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 inline mr-2" />
                  Confirmados
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[55vh]">
                {loadingPreRegistros ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  </div>
                ) : preRegistros.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                      {preRegistrosFilter === 'PENDING' ? (
                        <Users className="w-8 h-8 text-slate-500" />
                      ) : (
                        <GraduationCap className="w-8 h-8 text-slate-500" />
                      )}
                    </div>
                    <p className="text-slate-400">
                      {preRegistrosFilter === 'PENDING' 
                        ? 'No hay pre-registros pendientes' 
                        : 'No hay participantes inscritos aún'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preRegistros.map((pr) => (
                      <div 
                        key={pr.id}
                        onClick={() => openTopFile(pr.user.id, pr.user.nombre)}
                        className="p-4 rounded-xl border bg-slate-700/30 border-slate-600/30 hover:border-amber-500/30 hover:bg-slate-700/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Foto */}
                          <div className="w-14 h-14 rounded-full bg-slate-600 flex-shrink-0 overflow-hidden">
                            {pr.user.imagen ? (
                              <img 
                                src={pr.user.imagen} 
                                alt={pr.user.nombre} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl font-bold">
                                {pr.user.nombre?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                              {pr.user.nombre}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{pr.user.email}</span>
                            </div>
                            {pr.user.telefono && (
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{pr.user.telefono}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Estado */}
                          <div className="text-right flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              pr.status === 'PENDING' 
                                ? 'bg-amber-500/20 text-amber-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {pr.status === 'PENDING' ? 'Pendiente' : 'Pagado'}
                            </span>
                          </div>
                        </div>

                        {/* Game Changer */}
                        {pr.gameChanger && (
                          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-violet-500/30 flex-shrink-0 overflow-hidden">
                              {pr.gameChanger.imagen ? (
                                <img 
                                  src={pr.gameChanger.imagen} 
                                  alt={pr.gameChanger.nombre} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-violet-400 text-xs font-bold">
                                  {pr.gameChanger.nombre?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-slate-400">Game Changer:</span>
                              <span className="text-violet-400 font-medium">{pr.gameChanger.nombre}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Productos y fecha */}
                        <div className="mt-3 pt-3 border-t border-slate-600/30 flex flex-wrap items-center gap-2 text-xs">
                          {pr.currentProduct && (
                            <span className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded-full">
                              De: {pr.currentProduct.name}
                            </span>
                          )}
                          {pr.targetProduct && (
                            <span className={`px-2 py-1 rounded-full ${
                              pr.status === 'PAID' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              → {pr.targetProduct.name}
                            </span>
                          )}
                          <span className="ml-auto text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(pr.scannedAt).toLocaleDateString('es-MX', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            TOP FILE
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP FILE Modal */}
      {selectedUserForTopFile && (
        <TopFileModal
          userId={selectedUserForTopFile.id}
          userName={selectedUserForTopFile.nombre}
          isOpen={showTopFile}
          onClose={() => {
            setShowTopFile(false);
            setSelectedUserForTopFile(null);
          }}
        />
      )}

      {/* Modal de Confirmación - Finalizar Entrenamiento */}
      <AnimatePresence>
        {showFinalizarModal && productoAFinalizar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowFinalizarModal(false);
              setProductoAFinalizar(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const asistieron = productoAFinalizar.checkedIn || 0;
                const pagados = productoAFinalizar.participantesPagados || 0;
                const porcentajePase = asistieron > 0 ? Math.round((pagados / asistieron) * 100) : 0;
                
                return (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Finalizar Entrenamiento
                      </h3>
                      <p className="text-slate-400">
                        ¿Estás seguro de que deseas finalizar el entrenamiento con
                      </p>
                      <p className={`text-2xl font-bold mt-2 ${
                        porcentajePase >= 70 ? 'text-emerald-400' :
                        porcentajePase >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {porcentajePase}% de pase?
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        ({pagados} pagados de {asistieron} que asistieron)
                      </p>
                      <p className="text-lg font-semibold text-purple-400 mt-3">
                        &ldquo;{productoAFinalizar.name}&rdquo;
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-400/80 text-sm">
                          Esta acción marcará el entrenamiento como completado y no se puede deshacer.
                        </p>
                      </div>
                    </div>

                    {/* Botón para ver participantes pendientes */}
                    <button
                      onClick={() => {
                        setShowFinalizarModal(false);
                        setProductoAFinalizar(null);
                        openPreRegistrosModal('PENDING');
                      }}
                      className="w-full mb-4 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Users size={18} />
                      Ver Participantes Pendientes de Pago
                    </button>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowFinalizarModal(false);
                          setProductoAFinalizar(null);
                        }}
                        className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-semibold transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => finalizarEntrenamiento()}
                        disabled={finalizandoEntrenamiento}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {finalizandoEntrenamiento ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Finalizando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            Confirmar
                          </>
                        )}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Encuesta del Trainer */}
      <AnimatePresence>
        {showTrainerSurvey && productoParaEncuesta && (
          <TrainerSurveyModal
            productId={productoParaEncuesta.id}
            productName={productoParaEncuesta.name}
            onComplete={handleSurveyComplete}
            onClose={() => {
              setShowTrainerSurvey(false);
              setProductoParaEncuesta(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
