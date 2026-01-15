'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  TrendingUp,
  CheckCircle,
  Calendar,
  Eye,
  Award,
  Target,
  Zap,
  AlertCircle,
  Loader2,
  BookOpen,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import VisionHistoryWidget from '@/components/widgets/VisionHistoryWidget';

interface Participante {
  id: number;
  participanteId: number;
  visionId: number;
  Vision: {
    id: number;
    nombre: string;
  };
  Participante: {
    id: number;
    nombre: string;
    email: string;
    profileImage: string | null;
    completionStreak: number;
    nivelActual: number;
    lastCompletionDate: string | null;
    experienciaXP: number;
    rangoActual: string;
  };
  stats: {
    tareasCompletadas: number;
    tareasTotal: number;
    phoenixSessions: number;
    diasInactivo: number;
    porcentajeCompletado: number;
  };
}

interface Vision {
  id: number;
  gameChangerId: number;
  Vision: {
    id: number;
    nombre: string;
    descripcion: string | null;
  };
}

export default function GameChangerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVision, setSelectedVision] = useState<number | 'all'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchParticipantes();
    }
  }, [session]);

  const fetchParticipantes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/game-changer/mis-participantes');
      const data = await res.json();

      if (res.ok) {
        setParticipantes(data.participantes || []);
        setVisiones(data.visiones || []);
      }
    } catch (error) {
      console.error('Error fetching participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipantes = selectedVision === 'all'
    ? participantes
    : participantes.filter((p) => p.visionId === selectedVision);

  // Calcular estadísticas generales
  const totalParticipantes = participantes.length;
  const participantesActivos = participantes.filter((p) => p.stats.diasInactivo <= 3).length;
  const promedioCompletado = participantes.length > 0
    ? participantes.reduce((sum, p) => sum + p.stats.porcentajeCompletado, 0) / participantes.length
    : 0;
  const totalTareasCompletadas = participantes.reduce((sum, p) => sum + p.stats.tareasCompletadas, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Panel de Game Changer
          </h1>
          <p className="text-cyan-400">
            Monitorea el progreso de tus participantes asignados
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-cyan-400" size={24} />
              <span className="text-3xl font-bold text-cyan-400">
                {totalParticipantes}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes Asignados</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="text-green-400" size={24} />
              <span className="text-3xl font-bold text-green-400">
                {participantesActivos}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes Activos</p>
            <p className="text-xs text-slate-500 mt-1">Última actividad ≤ 3 días</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {promedioCompletado.toFixed(0)}%
              </span>
            </div>
            <p className="text-slate-400 text-sm">Progreso Promedio</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-amber-400" size={24} />
              <span className="text-3xl font-bold text-amber-400">
                {totalTareasCompletadas}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Tareas Completadas</p>
          </div>
        </div>

        {/* Vision History Widget */}
        <div className="mb-8">
          <VisionHistoryWidget />
        </div>

        {/* Filter by Vision */}
        {visiones.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filtrar por Visión
            </label>
            <select
              value={selectedVision}
              onChange={(e) => setSelectedVision(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas las visiones</option>
              {visiones.map((v) => (
                <option key={v.id} value={v.Vision.id}>
                  {v.Vision.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Participantes List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Mis Participantes</h2>
            <p className="text-slate-400 text-sm mt-1">
              {filteredParticipantes.length} participante(s)
            </p>
          </div>

          {filteredParticipantes.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No tienes participantes asignados</p>
              <p className="text-slate-500 text-sm">
                Contacta al director de tu visión para que te asigne participantes
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Participante
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Visión
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Nivel / Rango
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Progreso
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Racha
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredParticipantes.map((p) => {
                    const isActive = p.stats.diasInactivo <= 3;
                    const isWarning = p.stats.diasInactivo > 3 && p.stats.diasInactivo <= 7;
                    const isInactive = p.stats.diasInactivo > 7;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {p.Participante.profileImage ? (
                              <img
                                src={p.Participante.profileImage}
                                alt={p.Participante.nombre}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {p.Participante.nombre.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white">{p.Participante.nombre}</p>
                              <p className="text-xs text-slate-500">{p.Participante.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-900/20 text-cyan-400 border border-cyan-600">
                            {p.Vision.nombre}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <Award className="text-amber-400" size={14} />
                              <span className="text-sm font-bold text-white">
                                Nivel {p.Participante.nivelActual}
                              </span>
                            </div>
                            <span className="text-xs text-purple-400 font-medium">
                              {p.Participante.rangoActual}
                            </span>
                            <span className="text-xs text-slate-500">
                              {p.Participante.experienciaXP} XP
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-full bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${p.stats.porcentajeCompletado}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between w-full text-xs">
                              <span className="text-slate-400">
                                {p.stats.tareasCompletadas}/{p.stats.tareasTotal}
                              </span>
                              <span className="text-cyan-400 font-bold">
                                {p.stats.porcentajeCompletado.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <Zap className="text-amber-400" size={14} />
                              <span className="text-lg font-bold text-white">
                                {p.Participante.completionStreak}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">días</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-900/20 text-green-400 border border-green-600">
                              <CheckCircle size={14} />
                              Activo
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-900/20 text-amber-400 border border-amber-600">
                              <Clock size={14} />
                              {p.stats.diasInactivo}d sin actividad
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-600">
                              <AlertCircle size={14} />
                              Inactivo {p.stats.diasInactivo}d
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/dashboard/game-changer/participante/${p.participanteId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors text-sm"
                          >
                            <Eye size={16} />
                            Ver Evidencias
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Tips for Game Changers */}
        <div className="mt-8 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <BookOpen className="text-cyan-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Tu Rol como Game Changer</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Monitorea el progreso de tus participantes asignados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Revisa sus evidencias y proporciona feedback constructivo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Motiva a quienes estén inactivos o con bajo progreso</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Comparte tu experiencia y aprendizajes del programa</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
