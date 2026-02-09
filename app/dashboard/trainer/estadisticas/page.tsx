'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Trophy, Users, Calendar, TrendingUp, Award,
  CheckCircle2, Target, Loader2, ArrowLeft, Flag
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface PLWeekendResult {
  id: number;
  productId: number;
  weekendNumber: number;
  totalParticipants: number;
  totalEnrolled: number;
  expectedEnrollments: number;
  percentage: number;
  finishedAt: string;
  Product?: {
    id: number;
    name: string;
  };
}

interface TrainerStats {
  totalProductos: number;
  productosCompletados: number;
  productosEnCurso: number;
  totalParticipantes: number;
  totalEnrollados: number;
  promedioPercentage: number;
  plWeekendResults: PLWeekendResult[];
  productosDetalle: Array<{
    id: number;
    name: string;
    levelType: string;
    status: string;
    finishedAt: string | null;
    weekends: PLWeekendResult[];
  }>;
}

export default function TrainerEstadisticasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TrainerStats | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    fetchStats();
  }, [status, session]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/trainer/estadisticas');
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-slate-400">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/trainer"
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="text-cyan-400" />
              Mis Estadísticas
            </h1>
            <p className="text-slate-400">Tu historial y métricas como trainer</p>
          </div>
        </div>

        {stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Trophy className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-slate-400 text-sm">Productos</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalProductos}</p>
                <p className="text-xs text-slate-500 mt-1">Total asignados</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-slate-400 text-sm">Completados</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.productosCompletados}</p>
                <p className="text-xs text-slate-500 mt-1">Entrenamientos</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border border-cyan-500/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-slate-400 text-sm">Participantes</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalParticipantes}</p>
                <p className="text-xs text-slate-500 mt-1">Total entrenados</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-500/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-slate-400 text-sm">Promedio</span>
                </div>
                <p className={`text-3xl font-bold ${
                  stats.promedioPercentage >= 80 ? 'text-emerald-400' :
                  stats.promedioPercentage >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {stats.promedioPercentage}%
                </p>
                <p className="text-xs text-slate-500 mt-1">Meta de enrollados</p>
              </motion.div>
            </div>

            {/* PL Weekend Results */}
            {stats.plWeekendResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 mb-8"
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Flag className="text-orange-400" />
                  Historial de Fines de Semana (Liderato)
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 text-sm font-medium">Producto</th>
                        <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Fin de Semana</th>
                        <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Participantes</th>
                        <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Enrollados</th>
                        <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Meta</th>
                        <th className="text-center py-3 px-4 text-slate-400 text-sm font-medium">Resultado</th>
                        <th className="text-right py-3 px-4 text-slate-400 text-sm font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.plWeekendResults.map((result) => (
                        <tr key={result.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-white text-sm">
                            {result.Product?.name || `Producto ${result.productId}`}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-bold">
                              {result.weekendNumber}/3
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300 text-sm">
                            {result.totalParticipants}
                          </td>
                          <td className="py-3 px-4 text-center text-green-400 text-sm font-medium">
                            {result.totalEnrolled}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400 text-sm">
                            {result.expectedEnrollments}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                              result.percentage >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                              result.percentage >= 50 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {result.percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 text-xs">
                            {new Date(result.finishedAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Productos Detalle */}
            {stats.productosDetalle.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6"
              >
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="text-purple-400" />
                  Detalle de Productos
                </h2>
                
                <div className="space-y-3">
                  {stats.productosDetalle.map((producto) => (
                    <div
                      key={producto.id}
                      className={`p-4 rounded-lg border ${
                        producto.status === 'COMPLETED' 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-slate-800/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-white font-medium">{producto.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              producto.levelType === 'BASIC' ? 'bg-blue-500/20 text-blue-400' :
                              producto.levelType === 'ADVANCED' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {producto.levelType}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              producto.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                              producto.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-slate-600/50 text-slate-400'
                            }`}>
                              {producto.status === 'COMPLETED' ? 'Completado' :
                               producto.status === 'IN_PROGRESS' ? 'En Curso' : producto.status}
                            </span>
                          </div>
                        </div>
                        
                        {producto.finishedAt && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Finalizado</p>
                            <p className="text-sm text-slate-300">
                              {new Date(producto.finishedAt).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Weekends para PL */}
                      {producto.weekends.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3].map((num) => {
                              const weekend = producto.weekends.find(w => w.weekendNumber === num);
                              return (
                                <div
                                  key={num}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                    weekend 
                                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
                                      : 'bg-slate-700/30 border border-slate-600/30 text-slate-500'
                                  }`}
                                >
                                  <span>FDS {num}</span>
                                  {weekend && (
                                    <>
                                      <span className="font-bold">{weekend.percentage}%</span>
                                      <CheckCircle2 size={12} />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {stats.totalProductos === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Sin estadísticas aún</h3>
                <p className="text-slate-400">
                  Las estadísticas aparecerán cuando tengas productos asignados
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No se pudieron cargar las estadísticas</p>
          </div>
        )}
      </div>
    </div>
  );
}
