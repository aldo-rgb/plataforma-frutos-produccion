'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, Eye, ChevronDown, ChevronUp, Trophy, Zap, Target, Star, CheckCircle2, XCircle, FileText, Award, ScrollText, Heart, Brain, Briefcase, UserCheck, Shield, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  profileImageUrl?: string | null;
  puntosCultivo: number;
  puntosQuantum: number;
  xp: number;
  racha: number;
  tier: string;
  ranking: number;
  condecoraciones?: string[];
  // Carta de objetivos
  cartaId?: number | null;
  cartaEstado?: string | null;
  cartaAutorizada?: boolean;
  tieneCarta?: boolean;
  // Quiz Médico
  quizMedicoCompletado?: boolean;
  quizMedicoAlerta?: boolean;
  // Quiz Avanzado
  quizAvanzadoCompletado?: boolean;
  quizAvanzadoEstado?: string | null;
  // Futuro Imposible (Negocio)
  tieneNegocio?: boolean;
  negocioStatus?: string | null;
  negocioNombre?: string | null;
  // Game Changer
  gameChangerId?: number | null;
  gameChangerNombre?: string | null;
  tieneGameChanger?: boolean;
  // Mentor
  mentorId?: number | null;
  mentorNombre?: string | null;
  tieneMentor?: boolean;
  // Capitanías
  capitanias?: { roleType: string; status: string }[];
  tieneCapitanias?: boolean;
}

interface VisionConParticipantes {
  visionId: number;
  visionNombre: string;
  participantes: Participante[];
}

export default function MisParticipantesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visiones, setVisiones] = useState<VisionConParticipantes[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVision, setExpandedVision] = useState<number | null>(null);

  // Roles de coordinador permitidos
  const COORDINATOR_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol && !COORDINATOR_ROLES.includes(session.user.rol)) {
      router.push('/dashboard');
    } else if (session?.user?.rol) {
      fetchParticipantes();
    }
  }, [status, session]);

  const fetchParticipantes = async () => {
    try {
      const res = await fetch('/api/coordinador/mis-participantes');
      const result = await res.json();
      if (res.ok && result.success) {
        setVisiones(result.visiones);
        // Auto-expandir la primera visión si hay datos
        if (result.visiones.length > 0) {
          setExpandedVision(result.visiones[0].visionId);
        }
      }
    } catch (error) {
      console.error('Error fetching participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVision = (visionId: number) => {
    setExpandedVision(expandedVision === visionId ? null : visionId);
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'Bronce': 'text-orange-600',
      'Plata': 'text-slate-400',
      'Oro': 'text-yellow-400',
      'Platino': 'text-cyan-400',
      'Diamante': 'text-blue-400'
    };
    return colors[tier] || 'text-slate-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <GraduationCap size={32} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Mis Participantes</h1>
              <p className="text-slate-400">Listado completo organizado por visión</p>
            </div>
          </div>
        </div>

        {/* Visiones */}
        {visiones.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <GraduationCap size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay participantes</h3>
            <p className="text-slate-500">Aún no hay participantes inscritos en tus visiones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visiones.map((vision) => (
              <div
                key={vision.visionId}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden"
              >
                {/* Vision Header */}
                <button
                  onClick={() => toggleVision(vision.visionId)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-800/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/20 rounded-xl">
                      <Users size={24} className="text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white">{vision.visionNombre}</h3>
                      <p className="text-slate-400">
                        {vision.participantes.length} participante{vision.participantes.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {expandedVision === vision.visionId ? (
                    <ChevronUp size={24} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={24} className="text-slate-400" />
                  )}
                </button>

                {/* Participantes List */}
                {expandedVision === vision.visionId && (
                  <div className="border-t border-slate-700 p-6 space-y-3">
                    {vision.participantes.map((participante, index) => (
                      <div
                        key={participante.id}
                        className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            {/* Foto de perfil */}
                            <div className="relative">
                              {participante.profileImageUrl ? (
                                <img
                                  src={participante.profileImageUrl}
                                  alt={participante.nombre}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/50"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-2xl font-bold text-white">
                                    {participante.nombre.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              {/* Badge de ranking */}
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-900 border-2 border-cyan-500 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-cyan-400">#{index + 1}</span>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-lg font-bold text-white mb-1">
                                {participante.nombre}
                              </h4>
                              <p className="text-sm text-slate-400">{participante.email}</p>
                              
                              {/* Condecoraciones */}
                              {participante.condecoraciones && participante.condecoraciones.length > 0 && (
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {participante.condecoraciones.slice(0, 3).map((cond, idx) => (
                                    <div
                                      key={idx}
                                      className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg"
                                      title={cond}
                                    >
                                      <Award size={14} className="inline-block text-yellow-400 mr-1" />
                                      <span className="text-xs font-bold text-yellow-400">{cond}</span>
                                    </div>
                                  ))}
                                  {participante.condecoraciones.length > 3 && (
                                    <div className="flex items-center justify-center px-2 py-1 bg-slate-800 rounded-lg border border-slate-600">
                                      <span className="text-xs font-bold text-slate-400">+{participante.condecoraciones.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {participante.cartaAutorizada && (
                              <Link
                                href={`/dashboard/coordinador/carta/${participante.id}`}
                                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 rounded-lg font-bold transition-all flex items-center gap-2"
                                title="Ver Carta"
                              >
                                <ScrollText size={18} />
                                Ver Carta
                              </Link>
                            )}
                            
                            <Link
                              href={`/dashboard/coordinador/condecoraciones?userId=${participante.id}&nombre=${encodeURIComponent(participante.nombre)}`}
                              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 rounded-lg font-bold transition-all flex items-center gap-2"
                              title="Asignar Condecoraciones"
                            >
                              <Award size={18} />
                              Condecoraciones
                            </Link>
                            
                            <Link
                              href={`/dashboard/coordinador/participante/${participante.id}`}
                              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                              <Eye size={18} />
                              Ver Perfil
                            </Link>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Trophy size={16} className={getTierColor(participante.tier)} />
                              <span className="text-xs text-slate-400">Tier</span>
                            </div>
                            <p className={`text-lg font-bold ${getTierColor(participante.tier)}`}>
                              {participante.tier}
                            </p>
                          </div>

                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Zap size={16} className="text-yellow-400" />
                              <span className="text-xs text-slate-400">XP</span>
                            </div>
                            <p className="text-lg font-bold text-white">
                              {participante.xp.toLocaleString()}
                            </p>
                          </div>

                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Target size={16} className="text-purple-400" />
                              <span className="text-xs text-slate-400">Quantum</span>
                            </div>
                            <p className="text-lg font-bold text-purple-300">
                              {participante.puntosQuantum}
                            </p>
                          </div>

                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Star size={16} className="text-orange-400" />
                              <span className="text-xs text-slate-400">Racha</span>
                            </div>
                            <p className="text-lg font-bold text-orange-300">
                              {participante.racha} días
                            </p>
                          </div>
                        </div>

                        {/* Indicadores de Progreso */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          {/* Quiz Médico */}
                          <div className={`rounded-lg p-3 border ${participante.quizMedicoCompletado ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Heart size={16} className={participante.quizMedicoCompletado ? 'text-green-400' : 'text-slate-500'} />
                              <span className="text-xs text-slate-400">Quiz Médico</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {participante.quizMedicoCompletado ? (
                                <>
                                  <CheckCircle2 size={14} className="text-green-400" />
                                  <span className="text-sm font-bold text-green-400">Completado</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-500" />
                                  <span className="text-sm font-bold text-slate-500">Pendiente</span>
                                </>
                              )}
                              {participante.quizMedicoAlerta && (
                                <AlertTriangle size={14} className="text-yellow-400 ml-1" title="Tiene alertas médicas" />
                              )}
                            </div>
                          </div>

                          {/* Quiz Avanzado */}
                          <div className={`rounded-lg p-3 border ${participante.quizAvanzadoCompletado ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Brain size={16} className={participante.quizAvanzadoCompletado ? 'text-purple-400' : 'text-slate-500'} />
                              <span className="text-xs text-slate-400">Quiz Avanzado</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {participante.quizAvanzadoCompletado ? (
                                <>
                                  <CheckCircle2 size={14} className="text-purple-400" />
                                  <span className="text-sm font-bold text-purple-400">Completado</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-500" />
                                  <span className="text-sm font-bold text-slate-500">Pendiente</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Carta de Objetivos */}
                          <div className={`rounded-lg p-3 border ${participante.tieneCarta ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <ScrollText size={16} className={participante.tieneCarta ? 'text-cyan-400' : 'text-slate-500'} />
                              <span className="text-xs text-slate-400">Carta Objetivos</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {participante.tieneCarta ? (
                                <>
                                  <CheckCircle2 size={14} className="text-cyan-400" />
                                  <span className="text-sm font-bold text-cyan-400">{participante.cartaEstado || 'Creada'}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-500" />
                                  <span className="text-sm font-bold text-slate-500">Pendiente</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Futuro Imposible (Negocio) */}
                          <div className={`rounded-lg p-3 border ${participante.tieneNegocio ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Briefcase size={16} className={participante.tieneNegocio ? 'text-amber-400' : 'text-slate-500'} />
                              <span className="text-xs text-slate-400">Futuro Imposible</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {participante.tieneNegocio ? (
                                <>
                                  <CheckCircle2 size={14} className="text-amber-400" />
                                  <span className="text-sm font-bold text-amber-400">{participante.negocioStatus || 'Activo'}</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-500" />
                                  <span className="text-sm font-bold text-slate-500">Sin Negocio</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Game Changer Asignado */}
                          <div className={`rounded-lg p-3 border ${participante.tieneGameChanger ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <UserCheck size={16} className={participante.tieneGameChanger ? 'text-blue-400' : 'text-slate-500'} />
                              <span className="text-xs text-slate-400">Game Changer</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {participante.tieneGameChanger ? (
                                <>
                                  <CheckCircle2 size={14} className="text-blue-400" />
                                  <span className="text-sm font-bold text-blue-400 truncate" title={participante.gameChangerNombre || ''}>
                                    {participante.gameChangerNombre?.split(' ')[0] || 'Asignado'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-500" />
                                  <span className="text-sm font-bold text-slate-500">Sin Asignar</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Mentor Asignado */}
                          <div className={`rounded-lg p-3 border ${participante.tieneMentor ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <GraduationCap size={16} className={participante.tieneMentor ? 'text-emerald-400' : 'text-slate-500'} />
                              <span className="text-xs text-slate-400">Mentor</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {participante.tieneMentor ? (
                                <>
                                  <CheckCircle2 size={14} className="text-emerald-400" />
                                  <span className="text-sm font-bold text-emerald-400 truncate" title={participante.mentorNombre || ''}>
                                    {participante.mentorNombre?.split(' ')[0] || 'Asignado'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-slate-500" />
                                  <span className="text-sm font-bold text-slate-500">Sin Asignar</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Capitanías */}
                        {participante.tieneCapitanias && participante.capitanias && participante.capitanias.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <Shield size={16} className="text-purple-400" />
                            <span className="text-xs text-slate-400">Capitanías:</span>
                            {participante.capitanias.map((cap, idx) => (
                              <span key={idx} className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-bold text-purple-400">
                                {cap.roleType}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
