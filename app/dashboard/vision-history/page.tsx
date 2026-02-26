'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Calendar, Users, Building2, ChevronRight, ArrowLeft,
  Trophy, Star, Clock, CheckCircle2, MapPin, Loader2,
  GraduationCap, Mic, Award, TrendingUp, ClipboardList, Camera
} from 'lucide-react';
import Link from 'next/link';
import { TrainerSurveyModal } from '@/components/training-closure';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
}

interface Product {
  id: number;
  name: string;
  levelType: string;
  startDate: string | null;
  endDate: string | null;
  trainingStatus: string;
  surveyCompleted?: boolean;
}

interface AtomoMember {
  id: number;
  nombre: string;
  imagen: string | null;
  email: string;
}

interface Atomo {
  id: string;
  name: string;
  level: string;
  membersCount: number;
  members?: AtomoMember[];
}

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  organization: Organization | null;
  totalParticipantes: number;
  assignedAt: string;
  role: string;
  level?: string;
  levels?: string[];
  products?: Product[];
  atomos?: Atomo[];
  totalAtomos?: number;
}

interface HistoryData {
  user: {
    id: number;
    nombre: string;
    rol: string;
  };
  stats: {
    total: number;
    activas: number;
    finalizadas: number;
    totalParticipantes: number;
    roles: string[];
  };
  visiones: Vision[];
}

export default function VisionHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activas' | 'finalizadas'>('activas');
  const [expandedVision, setExpandedVision] = useState<number | null>(null);
  
  // Estado para encuesta pendiente
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchHistory();
    }
  }, [status]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/user/vision-history');
      const result = await res.json();

      if (res.ok && result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      'Game Changer': { label: 'Game Changer', color: 'from-purple-500 to-pink-500', icon: <Star className="w-3 h-3" /> },
      'GAME_CHANGER': { label: 'Game Changer', color: 'from-purple-500 to-pink-500', icon: <Star className="w-3 h-3" /> },
      'GC': { label: 'Game Changer', color: 'from-purple-500 to-pink-500', icon: <Star className="w-3 h-3" /> },
      'Trainer': { label: 'Trainer', color: 'from-orange-500 to-red-500', icon: <Mic className="w-3 h-3" /> },
      'TRAINER': { label: 'Trainer', color: 'from-orange-500 to-red-500', icon: <Mic className="w-3 h-3" /> },
      'Trainer Básico': { label: 'Trainer Básico', color: 'from-green-500 to-emerald-500', icon: <Mic className="w-3 h-3" /> },
      'BASIC_TRAINER': { label: 'Trainer Básico', color: 'from-green-500 to-emerald-500', icon: <Mic className="w-3 h-3" /> },
      'Trainer Avanzado': { label: 'Trainer Avanzado', color: 'from-yellow-500 to-orange-500', icon: <Mic className="w-3 h-3" /> },
      'ADVANCED_TRAINER': { label: 'Trainer Avanzado', color: 'from-yellow-500 to-orange-500', icon: <Mic className="w-3 h-3" /> },
      'Trainer PL': { label: 'Trainer PL', color: 'from-indigo-500 to-purple-500', icon: <Mic className="w-3 h-3" /> },
      'PL_TRAINER': { label: 'Trainer PL', color: 'from-indigo-500 to-purple-500', icon: <Mic className="w-3 h-3" /> }
    };

    const config = roleConfig[role] || { label: role, color: 'from-slate-500 to-slate-600', icon: <Users className="w-3 h-3" /> };

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${config.color} text-white`}>
        {config.icon}
        {config.label}
      </div>
    );
  };

  const getLevelBadge = (levelType: string) => {
    const levels: Record<string, { label: string; color: string }> = {
      'BASIC': { label: 'Básico', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
      'INTERMEDIATE': { label: 'Intermedio', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
      'ADVANCED': { label: 'Avanzado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
      'PL': { label: 'Liderato', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' }
    };

    const config = levels[levelType] || { label: levelType, color: 'bg-slate-500/20 text-slate-400 border-slate-500/50' };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      'COMPLETED': { label: 'Completado', color: 'bg-green-500/20 text-green-400' },
      'IN_PROGRESS': { label: 'En Progreso', color: 'bg-blue-500/20 text-blue-400' },
      'PENDING': { label: 'Pendiente', color: 'bg-slate-500/20 text-slate-400' }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-slate-500/20 text-slate-400' };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-slate-400">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">No se pudo cargar el historial</p>
      </div>
    );
  }

  // Filtrar visiones según el tab activo
  const now = new Date();
  const visionesActivas = data.visiones.filter(v => v.isActive || (v.endDate && new Date(v.endDate) > now));
  const visionesFinalizadas = data.visiones.filter(v => !v.isActive && (!v.endDate || new Date(v.endDate) <= now));
  const visiones = activeTab === 'activas' ? visionesActivas : visionesFinalizadas;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Eye className="w-6 h-6 text-purple-400" />
                Mi Historial de Visiones
              </h1>
              <p className="text-slate-400 text-sm">
                {data.user.rol === 'TRAINER' ? 'Entrenamientos impartidos' : 'Visiones donde has servido'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data.visiones.length}</p>
                <p className="text-slate-400 text-xs">Total</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{visionesActivas.length}</p>
                <p className="text-slate-400 text-xs">Activas</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-2xl p-4 border border-slate-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{visionesFinalizadas.length}</p>
                <p className="text-slate-400 text-xs">Finalizadas</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-800/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('activas')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'activas'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Activas ({visionesActivas.length})
          </button>
          <button
            onClick={() => setActiveTab('finalizadas')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'finalizadas'
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizadas ({visionesFinalizadas.length})
          </button>
        </div>

        {/* Lista de Visiones */}
        <div className="space-y-4">
          {visiones.length === 0 ? (
            <div className="text-center py-16">
              <Eye className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No tienes visiones {activeTab}</p>
            </div>
          ) : (
            visiones.map((vision, index) => (
              <motion.div
                key={vision.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  vision.isActive
                    ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-purple-500/30 hover:border-purple-500/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedVision(expandedVision === vision.id ? null : vision.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* Organización */}
                      {vision.organization && (
                        <div className="flex items-center gap-2 mb-2">
                          {vision.organization.logoUrl ? (
                            <img 
                              src={vision.organization.logoUrl} 
                              alt={vision.organization.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-4 h-4 text-slate-500" />
                          )}
                          <span className="text-slate-400 text-sm">{vision.organization.name}</span>
                        </div>
                      )}
                      
                      <h3 className="text-lg font-bold text-white mb-2">{vision.nombre}</h3>
                      
                      <div className="flex flex-wrap gap-2">
                        {getRoleBadge(vision.role)}
                        {vision.level && getLevelBadge(vision.level)}
                        {/* Mostrar niveles para GCs */}
                        {vision.levels && vision.levels.map(level => (
                          <span key={level}>{getLevelBadge(level)}</span>
                        ))}
                        {/* Mostrar cantidad de átomos */}
                        {vision.totalAtomos !== undefined && vision.totalAtomos > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50">
                            {vision.totalAtomos} {vision.totalAtomos === 1 ? 'átomo' : 'átomos'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {vision.isActive && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-green-400 text-xs font-medium">Activa</span>
                        </div>
                      )}
                      <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${
                        expandedVision === vision.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>

                  {/* Info básica */}
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(vision.startDate)}</span>
                      {vision.endDate && (
                        <>
                          <span>-</span>
                          <span>{formatDate(vision.endDate)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{vision.totalParticipantes} participantes</span>
                    </div>
                  </div>
                </div>

                {/* Contenido expandido - Para Trainers con productos */}
                <AnimatePresence>
                  {expandedVision === vision.id && vision.products && vision.products.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-700/50"
                    >
                      <div className="p-4 bg-slate-900/50">
                        <p className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Entrenamientos impartidos
                        </p>
                        <div className="space-y-2">
                          {vision.products.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <Mic className="w-4 h-4 text-orange-400" />
                                <div>
                                  <p className="text-white font-medium text-sm">{product.name}</p>
                                  <p className="text-slate-500 text-xs">
                                    {formatDate(product.startDate)} - {formatDate(product.endDate)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getLevelBadge(product.levelType)}
                                {getStatusBadge(product.trainingStatus)}
                                
                                {/* Botón de encuesta si está completado y no hizo la encuesta */}
                                {product.trainingStatus === 'COMPLETED' && !product.surveyCompleted && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProduct({ id: product.id, name: product.name });
                                      setShowSurveyModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg text-white text-xs font-medium transition-all animate-pulse"
                                  >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Encuesta
                                  </button>
                                )}
                                
                                {/* Indicador de encuesta completada */}
                                {product.trainingStatus === 'COMPLETED' && product.surveyCompleted && (
                                  <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-green-400 text-xs">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Evaluado
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Contenido expandido - Para Game Changers con átomos */}
                <AnimatePresence>
                  {expandedVision === vision.id && vision.atomos && vision.atomos.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-700/50"
                    >
                      <div className="p-4 bg-slate-900/50">
                        <p className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Mis Átomos ({vision.totalAtomos || vision.atomos.length})
                        </p>
                        <div className="space-y-4">
                          {vision.atomos.map((atomo) => (
                            <div
                              key={atomo.id}
                              className="bg-slate-800/50 rounded-xl overflow-hidden"
                            >
                              {/* Header del átomo */}
                              <div className="flex items-center justify-between p-3 border-b border-slate-700/30">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Star className="w-4 h-4 text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-white font-medium text-sm">{atomo.name}</p>
                                    <p className="text-slate-500 text-xs">
                                      {atomo.membersCount} participantes
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getLevelBadge(atomo.level)}
                                </div>
                              </div>
                              
                              {/* Lista de participantes */}
                              {atomo.members && atomo.members.length > 0 && (
                                <div className="p-3 space-y-2">
                                  {atomo.members.map((member) => (
                                    <div
                                      key={member.id}
                                      className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg"
                                    >
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        {member.imagen ? (
                                          <img
                                            src={member.imagen}
                                            alt={member.nombre}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-white text-xs font-bold">
                                            {member.nombre.charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                          {member.nombre}
                                        </p>
                                        <p className="text-slate-500 text-xs truncate">
                                          {member.email}
                                        </p>
                                      </div>
                                      {/* Botón de Álbum por participante */}
                                      <Link
                                        href={`/dashboard/game-changer/legacy-capture?visionId=${vision.id}&participantId=${member.id}&level=${atomo.level}`}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white text-xs font-medium transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                        Álbum
                                      </Link>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Mensaje si no hay participantes */}
                              {(!atomo.members || atomo.members.length === 0) && (
                                <div className="p-3">
                                  <p className="text-slate-500 text-xs text-center">
                                    Sin participantes asignados
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Mostrar niveles asignados si no hay átomos creados aún */}
                        {vision.levels && vision.levels.length > 0 && vision.atomos.length === 0 && (
                          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <p className="text-amber-400 text-sm">
                              Niveles asignados: {vision.levels.map(l => 
                                l === 'BASIC' ? 'Básico' : l === 'ADVANCED' ? 'Avanzado' : l === 'PL' ? 'Liderato' : l
                              ).join(', ')}
                            </p>
                            <p className="text-amber-300/70 text-xs mt-1">
                              Aún no has creado átomos para esta visión
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Encuesta */}
      <AnimatePresence>
        {showSurveyModal && selectedProduct && (
          <TrainerSurveyModal
            productId={selectedProduct.id}
            productName={selectedProduct.name}
            onComplete={() => {
              setShowSurveyModal(false);
              setSelectedProduct(null);
              // Recargar datos para actualizar el estado de la encuesta
              fetchHistory();
            }}
            onClose={() => {
              setShowSurveyModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
