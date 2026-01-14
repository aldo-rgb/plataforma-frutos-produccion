'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users, Ticket, AlertTriangle, Building2, GraduationCap, Activity,
  Clock, Calendar, Scan, Heart, Mic, BookOpen, Rocket, ChevronRight,
  X, Loader2, Phone, Mail, CreditCard, FileText
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import MedicalAlertsWidget from '@/components/dashboard/MedicalAlertsWidget';
import GCCallsMonitorWidget from '@/components/dashboard/GCCallsMonitorWidget';
import { ElCruceAccessWidget, TopFileModal } from '@/components/el-cruce';

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

  // Combinar todos los productos para mostrar (memoizado para evitar re-renders infinitos)
  const productos = useMemo(() => {
    if (!data) return [];
    return [
      ...data.entrenamientos.enCurso,
      ...data.entrenamientos.proximos
    ];
  }, [data]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'TRAINER') {
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

        {/* KPI Cards - Pre-registros e Inscritos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Widget Pre-registros Pendientes */}
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
                  <div className="text-amber-400 text-sm font-medium uppercase tracking-wider">Pre-registros</div>
                  <div className="text-white text-4xl font-black mt-1">{data.stats.totalPreRegistrosPendientes || 0}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                Participantes pendientes de pago
              </span>
              <span className="text-amber-400 text-xs">Click para ver →</span>
            </div>
          </div>
          
          {/* Widget Inscritos */}
          <div 
            onClick={() => openPreRegistrosModal('PAID')}
            className="bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-slate-900 border-2 border-green-500/30 rounded-2xl p-6 hover:border-green-500/50 transition-all hover:scale-105 hover:shadow-2xl h-full cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-xl transition-colors relative">
                  <GraduationCap className="text-green-400" size={32} />
                  {(data.stats.totalInscritos || 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div>
                  <div className="text-green-400 text-sm font-medium uppercase tracking-wider">Inscritos</div>
                  <div className="text-white text-4xl font-black mt-1">{data.stats.totalInscritos || 0}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                Participantes registrados y pagados
              </span>
              <span className="text-green-400 text-xs">Click para ver →</span>
            </div>
          </div>
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

        {/* Widget Monitor de Llamadas GC */}
        <div className="mt-8">
          <GCCallsMonitorWidget />
        </div>

        {/* Widget de El Atravezar */}
        <div className="mt-8">
          <ElCruceAccessWidget />
        </div>

        {/* Widget de Mis Entrenamientos Asignados */}
        <div className="mt-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="text-purple-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Mis Entrenamientos Asignados</h2>
                  <p className="text-sm text-slate-400">Solo los entrenamientos donde eres trainer</p>
                </div>
              </div>
              <div className="text-purple-400 font-bold text-lg">{productos.length}</div>
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
                  const now = new Date();
                  const hasStarted = producto.estado === 'EN_CURSO';
                  const showCountdown = countdown[producto.id];

                  return (
                    <div
                      key={producto.id}
                      className={`rounded-xl p-5 transition-all ${
                        hasStarted 
                          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-slate-900 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-slate-700/50 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          {/* Organización */}
                          {producto.Organization && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              <Building2 className="w-3 h-3" />
                              <span>{producto.Organization.name}</span>
                            </div>
                          )}
                          <h3 className="text-white font-bold text-lg mb-1">
                            {producto.name}
                          </h3>
                          {producto.Vision && (
                            <p className="text-purple-400/80 text-sm">
                              Visión: {producto.Vision.nombre}
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
                              {producto.inscritos || 0} inscritos
                            </span>
                          </div>
                          {hasStarted && (
                            <div className="flex items-center gap-2">
                              <Scan size={14} className="text-green-400" />
                              <span className="text-green-400">
                                {producto.checkedIn || 0} check-in
                              </span>
                            </div>
                          )}
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
                              onClick={() => window.location.href = `/staff/check-in/${producto.id}`}
                              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/50 rounded-lg text-purple-400 hover:text-purple-300 text-sm font-semibold transition-all"
                            >
                              <Scan size={14} />
                              Check-In
                            </button>
                          </div>
                        )}

                        {!hasStarted && !showCountdown && (
                          <button
                            onClick={() => window.location.href = `/staff/check-in/${producto.id}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-600/20 to-slate-700/20 hover:from-purple-500/20 hover:to-pink-500/20 border border-slate-500/50 hover:border-purple-500/50 rounded-lg text-slate-400 hover:text-purple-400 text-sm font-semibold transition-all"
                          >
                            <Scan size={14} />
                            Check-In
                          </button>
                        )}
                      </div>
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

        {/* Ver Participantes */}
        <div className="mt-8">
          <Link href="/dashboard/coordinador/participantes" className="block h-full">
            <div className="h-full bg-gradient-to-br from-purple-900/50 to-slate-900 border-2 border-purple-500/30 rounded-2xl p-6 transition-all cursor-pointer group hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 group-hover:bg-purple-500/30 rounded-xl transition-colors">
                  <GraduationCap size={24} className="text-purple-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-sm uppercase">
                    Ver Participantes
                  </h3>
                  <p className="text-xs text-purple-300">
                    De mis entrenamientos
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-auto">
                Lista de participantes de los entrenamientos donde eres facilitador
              </p>
            </div>
          </Link>
        </div>
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
                      {preRegistrosFilter === 'PENDING' ? 'Pre-registros Pendientes' : 'Participantes Inscritos'}
                    </h3>
                    <p className={`text-xs ${preRegistrosFilter === 'PENDING' ? 'text-amber-400/70' : 'text-green-400/70'}`}>
                      {preRegistrosFilter === 'PENDING' 
                        ? 'Participantes que aún no han pagado' 
                        : 'Participantes que ya pagaron su inscripción'}
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
                  Pendientes de Pago
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
                  Ya Pagaron
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
                          
                          {/* Estado y precio */}
                          <div className="text-right flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              pr.status === 'PENDING' 
                                ? 'bg-amber-500/20 text-amber-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {pr.status === 'PENDING' ? 'Pendiente' : 'Pagado'}
                            </span>
                            {pr.promoPrice && pr.status === 'PENDING' && (
                              <div className="mt-2">
                                <p className="text-lg font-bold text-amber-400">${pr.promoPrice}</p>
                                <p className="text-xs text-slate-500 line-through">${pr.regularPrice}</p>
                              </div>
                            )}
                            {pr.paymentAmount && pr.status === 'PAID' && (
                              <div className="mt-2 flex items-center gap-1 text-green-400">
                                <CreditCard className="w-3 h-3" />
                                <span className="text-sm font-medium">${pr.paymentAmount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
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

                        {/* Deadline de promo */}
                        {pr.promoDeadline && pr.status === 'PENDING' && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-400/70">
                              Promo válida hasta: {new Date(pr.promoDeadline).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
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
    </div>
  );
}
