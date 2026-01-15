'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  History,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Atom,
  Loader2,
  Eye,
  UserCheck,
  Trophy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Entrenamiento {
  id: number;
  name: string;
  levelType: string;
  trainingStatus: string;
  estado: string;
  startDate: string | null;
  endDate: string | null;
  finishedAt: string | null;
  vision: {
    id: number;
    nombre: string;
    startDate: string | null;
    endDate: string | null;
  } | null;
  organization: {
    id: number;
    name: string;
    logoUrl: string | null;
  } | null;
  trainer: {
    id: number;
    nombre: string;
    imagen: string | null;
  } | null;
  inscritos: number;
  checkedIn: number;
  atomos: number;
}

interface Totales {
  total: number;
  activos: number;
  proximos: number;
  completados: number;
  pendientesCierre: number;
  totalInscritos: number;
  totalCheckedIn: number;
  totalAtomos: number;
}

export default function TrainingHistoryPage() {
  const router = useRouter();
  const [entrenamientos, setEntrenamientos] = useState<Entrenamiento[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntrenamientos();
  }, []);

  const fetchEntrenamientos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/coordinator/training-history');
      const data = await res.json();

      if (data.success) {
        setEntrenamientos(data.entrenamientos);
        setTotales(data.totales);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al cargar entrenamientos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'EN_CURSO':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">🟢 En Curso</Badge>;
      case 'PROXIMO':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📅 Próximo</Badge>;
      case 'COMPLETADO':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">✅ Completado</Badge>;
      case 'FINALIZADO_SIN_CERRAR':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">⚠️ Pendiente Cierre</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{estado}</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'BASIC':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Básico</Badge>;
      case 'ADVANCED':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Avanzado</Badge>;
      case 'PL':
        return <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Liderato</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{level}</Badge>;
    }
  };

  if (loading && entrenamientos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white w-fit"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Historial de Entrenamientos</h1>
              <p className="text-xs sm:text-sm text-slate-400">Entrenamientos completados de tu organización</p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Responsive */}
        {totales && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-purple-400">{totales.completados}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Completados</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-cyan-500/20 rounded-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-cyan-400">{totales.totalInscritos}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Inscritos</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-400">{totales.totalCheckedIn}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Check-ins</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-lg">
                  <Atom className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-amber-400">{totales.totalAtomos}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Átomos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Entrenamientos */}
        {error ? (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 sm:p-8 text-center">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 text-sm sm:text-base">{error}</p>
            </CardContent>
          </Card>
        ) : entrenamientos.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 sm:p-8 text-center">
              <History className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 text-sm sm:text-base">No hay entrenamientos completados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {entrenamientos.map((entrenamiento, index) => (
              <motion.div
                key={entrenamiento.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 transition-all">
                  <CardContent className="p-3 sm:p-5">
                    {/* Info Principal - Mobile First */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${
                        entrenamiento.levelType === 'BASIC' ? 'bg-cyan-500/20' :
                        entrenamiento.levelType === 'ADVANCED' ? 'bg-orange-500/20' :
                        'bg-pink-500/20'
                      }`}>
                        <GraduationCap className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          entrenamiento.levelType === 'BASIC' ? 'text-cyan-400' :
                          entrenamiento.levelType === 'ADVANCED' ? 'text-orange-400' :
                          'text-pink-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-lg font-semibold text-white truncate mb-1">
                          {entrenamiento.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getLevelBadge(entrenamiento.levelType)}
                          {getEstadoBadge(entrenamiento.estado)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Visión y Fechas */}
                    {entrenamiento.vision && (
                      <p className="text-xs sm:text-sm text-slate-400 mb-2 truncate">
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-1" />
                        {entrenamiento.vision.nombre}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {formatDate(entrenamiento.startDate)} - {formatDate(entrenamiento.endDate)}
                      </span>
                      {entrenamiento.trainer && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {entrenamiento.trainer.nombre}
                        </span>
                      )}
                    </div>

                    {/* Stats - Responsive Grid */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="text-center">
                          <p className="text-base sm:text-xl font-bold text-cyan-400">{entrenamiento.inscritos}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500">Inscritos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base sm:text-xl font-bold text-emerald-400">{entrenamiento.checkedIn}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500">Check-ins</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base sm:text-xl font-bold text-purple-400">{entrenamiento.atomos}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500">Átomos</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 hover:bg-slate-700 text-xs sm:text-sm"
                        onClick={() => {
                          if (entrenamiento.vision) {
                            router.push(`/dashboard/vision/${entrenamiento.vision.id}`);
                          }
                        }}
                        disabled={!entrenamiento.vision}
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Ver</span>
                      </Button>
                    </div>

                    {/* Barra de progreso para check-ins */}
                    {entrenamiento.inscritos > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 mb-1">
                          <span>Asistencia</span>
                          <span>{Math.round((entrenamiento.checkedIn / entrenamiento.inscritos) * 100)}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${Math.min((entrenamiento.checkedIn / entrenamiento.inscritos) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Fecha de finalización */}
                    {entrenamiento.finishedAt && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-700/50 flex items-center gap-2 text-[10px] sm:text-xs text-slate-500">
                        <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
                        Finalizado el {formatDate(entrenamiento.finishedAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
