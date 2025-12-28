'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, TrendingUp, Sparkles, Award, Flame, 
  ChevronUp, ChevronDown, Diamond, Phone, Zap,
  Users, Building2, Eye, Brain, Globe, Shield
} from 'lucide-react';

type RankingType = 'GLOBAL' | 'SCHOOL' | 'VISION' | 'MENTOR' | 'SCHOOL_WAR' | 'MY_MENTORADOS';
type Timeframe = 'WEEKLY' | 'MONTHLY' | 'CYCLE' | 'ALL_TIME';
type AttendanceStatus = 'PERFECT' | 'WARNING' | 'RISK';

interface RankingUser {
  position: number;
  userId: number;
  nombre: string;
  avatar: string;
  tier: string;
  rangoActual: string;
  quantumPoints: number;
  xp: number;
  nivel: number;
  hqEvidenceCount: number;
  attendanceRate: number;
  attendanceStatus: AttendanceStatus;
  streak: number;
  badges: string[];
  organization?: string;
  organizationLogo?: string;
  isOnFire: boolean;
}

interface SchoolRanking {
  position: number;
  organizationId: number;
  name: string;
  logo: string;
  brandColor?: string;
  totalStudents: number;
  avgPointsPerStudent: number;
  totalPoints: number;
  totalHQEvidences: number;
  retentionRate: number;
}

interface MentorRanking {
  position: number;
  mentorId: number;
  nombre: string;
  avatar: string;
  badges: string[];
  totalMentorados: number;
  avgPointsPerStudent: number;
  totalHQEvidences: number;
  completedCalls: number;
  completionRate: number;
  rating: number;
  totalPoints: number;
}

export default function QuantumLeaderboardPage() {
  const [rankingType, setRankingType] = useState<RankingType>('GLOBAL');
  const [timeframe, setTimeframe] = useState<Timeframe>('ALL_TIME');
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [visiones, setVisiones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<any>(null);

  // Cargar permisos primero
  useEffect(() => {
    loadPermissions();
  }, []);

  // Cargar ranking cuando cambian los filtros
  useEffect(() => {
    if (permissions) {
      loadRanking();
    }
  }, [rankingType, timeframe, selectedEntity, permissions]);

  const loadPermissions = async () => {
    try {
      const res = await fetch('/api/ranking/permissions');
      if (res.ok) {
        const data = await res.json();
        console.log('🔐 Permisos cargados:', data);
        setPermissions(data);
        setOrganizations(data.availableSchools || []);
        setVisiones(data.availableVisions || []);
        
        // Pre-seleccionar solo si NO es mentor y tiene una organización específica
        // Los mentores deben ver el global general sin filtro de escuela
        if (data.userOrganizationId && data.availableSchools.length > 0 && rankingType === 'SCHOOL') {
          setSelectedEntity(data.userOrganizationId);
        }
        if (data.userVisionId && rankingType === 'VISION') {
          setSelectedEntity(data.userVisionId);
        }
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const loadRanking = async () => {
    try {
      setLoading(true);
      
      // Si es MY_MENTORADOS, cargar directamente desde el endpoint de mentorados
      if (rankingType === 'MY_MENTORADOS') {
        const res = await fetch('/api/mentor/mentorados');
        if (!res.ok) throw new Error('Error al cargar mentorados');
        const data = await res.json();
        setRanking(data.mentorados || []);
        setLoading(false);
        return;
      }

      // Si es VISION o SCHOOL y no hay entityId seleccionado, no cargar
      if ((rankingType === 'VISION' || rankingType === 'SCHOOL') && !selectedEntity) {
        setRanking([]);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        type: rankingType,
        timeframe,
        ...(selectedEntity && { entityId: selectedEntity.toString() })
      });

      const res = await fetch(`/api/rankings/advanced?${params}`);
      if (!res.ok) throw new Error('Error al cargar ranking');
      
      const data = await res.json();
      setRanking(data.ranking || []);
    } catch (error) {
      console.error('Error loading ranking:', error);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'NEON': return 'from-cyan-500 via-purple-500 to-pink-500';
      case 'GOLD': return 'from-yellow-400 via-yellow-500 to-orange-500';
      case 'BLUE': return 'from-blue-400 via-blue-500 to-indigo-500';
      default: return 'from-slate-400 via-slate-500 to-slate-600';
    }
  };

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Trophy className="text-yellow-400" size={24} />;
    if (position === 2) return <Trophy className="text-slate-300" size={22} />;
    if (position === 3) return <Trophy className="text-orange-400" size={20} />;
    return <span className="text-slate-400 font-bold text-lg">#{position}</span>;
  };

  const getAttendanceIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'PERFECT': return <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />;
      case 'WARNING': return <div className="w-3 h-3 rounded-full bg-yellow-500" />;
      case 'RISK': return <div className="w-3 h-3 rounded-full bg-red-500" />;
      default: return <div className="w-3 h-3 rounded-full bg-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-2 flex items-center gap-3">
            <Sparkles className="text-yellow-400" size={36} />
            Quantum Matter Leaderboard 360°
          </h1>
          <p className="text-slate-400 text-lg">
            Visualiza el rendimiento desde todas las dimensiones del ecosistema
          </p>
        </div>

        {/* Control Center */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 mb-8">
          
          {/* Tabs de Dimensión */}
          <div className="mb-6">
            <p className="text-slate-400 text-sm mb-3 font-semibold">Dimensión Principal</p>
            <div className="flex flex-wrap gap-2">
              {permissions?.canViewGlobal && (
                <button
                  onClick={() => {
                    setRankingType('GLOBAL');
                    setSelectedEntity(permissions.userOrganizationId || null);
                  }}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                    ${rankingType === 'GLOBAL'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  <Globe size={18} />
                  Global
                </button>
              )}

              {permissions?.canViewSchool && (
                <button
                  onClick={() => setRankingType('SCHOOL')}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                    ${rankingType === 'SCHOOL'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  <Building2 size={18} />
                  Por Escuela
                </button>
              )}

              {permissions?.canViewSchoolWar && (
                <button
                  onClick={() => setRankingType('SCHOOL_WAR')}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                    ${rankingType === 'SCHOOL_WAR'
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  <Shield size={18} />
                  Entrelazamiento de Escuelas
                </button>
              )}

              {permissions?.canViewVision && (
                <button
                  onClick={() => setRankingType('VISION')}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                    ${rankingType === 'VISION'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  <Eye size={18} />
                  Por Visión
                </button>
              )}

              {permissions?.canViewMentors && (
                <button
                  onClick={() => {
                    setRankingType('MENTOR');
                    setSelectedEntity(null);
                  }}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                    ${rankingType === 'MENTOR'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  <Brain size={18} />
                  Top Mentores
                </button>
              )}

              {permissions?.role === 'MENTOR' && (
                <button
                  onClick={() => {
                    setRankingType('MY_MENTORADOS');
                    setSelectedEntity(null);
                  }}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2
                    ${rankingType === 'MY_MENTORADOS'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  <Users size={18} />
                  Mis Mentorados
                </button>
              )}
            </div>
          </div>

          {/* Selector de Entidad (si aplica) */}
          {(rankingType === 'SCHOOL' || rankingType === 'VISION') && (
            <div className="mb-6">
              <p className="text-slate-400 text-sm mb-3 font-semibold">
                {rankingType === 'SCHOOL' ? 'Seleccionar Escuela' : 'Seleccionar Visión'}
              </p>
              <select
                value={selectedEntity || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null;
                  console.log('🎯 Seleccionando entidad:', value);
                  setSelectedEntity(value);
                }}
                className="w-full md:w-auto px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value="">Seleccionar...</option>
                {rankingType === 'SCHOOL' && organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
                {rankingType === 'VISION' && visiones.map(vision => (
                  <option key={vision.id} value={vision.id}>{vision.nombre}</option>
                ))}
              </select>
              {rankingType === 'SCHOOL' && organizations.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">No hay escuelas disponibles</p>
              )}
              {rankingType === 'VISION' && visiones.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">No hay visiones disponibles</p>
              )}
            </div>
          )}

          {/* Selector de Periodo */}
          <div>
            <p className="text-slate-400 text-sm mb-3 font-semibold">Periodo de Tiempo</p>
            <div className="flex flex-wrap gap-2">
              {['WEEKLY', 'MONTHLY', 'CYCLE', 'ALL_TIME'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf as Timeframe)}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all
                    ${timeframe === tf
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }
                  `}
                >
                  {tf === 'WEEKLY' && 'Semanal'}
                  {tf === 'MONTHLY' && 'Mensual'}
                  {tf === 'CYCLE' && 'Ciclo Completo'}
                  {tf === 'ALL_TIME' && 'Histórico'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mensaje informativo para mentores en Global */}
        {rankingType === 'GLOBAL' && permissions?.availableSchools?.length === 0 && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Brain className="text-purple-400 mt-0.5" size={20} />
              <div>
                <p className="text-purple-200 font-semibold mb-1">Vista Global de Mentor</p>
                <p className="text-slate-300 text-sm">
                  Estás viendo el ranking global de todos los participantes. 
                  Usa el filtro "Por Visión" para monitorear el desempeño de tus mentorados en cada visión.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje: Selecciona una visión */}
        {rankingType === 'VISION' && !selectedEntity && !loading && (
          <div className="mb-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-6 text-center">
            <Eye className="text-blue-400 mx-auto mb-3" size={40} />
            <p className="text-blue-200 font-semibold mb-2">Selecciona una Visión</p>
            <p className="text-slate-300 text-sm">
              Por favor selecciona una visión del menú desplegable para ver el ranking de participantes.
            </p>
          </div>
        )}

        {/* Mensaje: Selecciona una escuela */}
        {rankingType === 'SCHOOL' && !selectedEntity && !loading && (
          <div className="mb-6 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-500/30 rounded-lg p-6 text-center">
            <Building2 className="text-cyan-400 mx-auto mb-3" size={40} />
            <p className="text-cyan-200 font-semibold mb-2">Selecciona una Escuela</p>
            <p className="text-slate-300 text-sm">
              Por favor selecciona una institución del menú desplegable para ver su ranking.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Cargando ranking...</p>
          </div>
        )}

        {/* Podio Top 3 */}
        {!loading && ranking.length >= 3 && rankingType !== 'SCHOOL_WAR' && rankingType !== 'MENTOR' && rankingType !== 'MY_MENTORADOS' && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 rounded-xl p-4 flex flex-col items-center transform translate-y-4">
              <Trophy className="text-slate-300 mb-2" size={32} />
              <img
                src={ranking[1]?.avatar}
                alt={ranking[1]?.nombre}
                className={`
                  w-20 h-20 rounded-full object-cover mb-2 border-4 
                  bg-gradient-to-br ${getTierColor(ranking[1]?.tier)}
                  p-1
                `}
              />
              <p className="text-white font-bold text-center">{ranking[1]?.nombre}</p>
              <p className="text-slate-400 text-sm">{ranking[1]?.rangoActual}</p>
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500 mt-2">
                {ranking[1]?.quantumPoints} PC
              </p>
            </div>

            {/* 1st Place */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-400 rounded-xl p-4 flex flex-col items-center shadow-2xl shadow-yellow-500/20">
              <Trophy className="text-yellow-400 mb-2 animate-pulse" size={40} />
              <img
                src={ranking[0]?.avatar}
                alt={ranking[0]?.nombre}
                className={`
                  w-24 h-24 rounded-full object-cover mb-2 border-4 
                  bg-gradient-to-br ${getTierColor(ranking[0]?.tier)}
                  p-1
                `}
              />
              <p className="text-white font-bold text-lg text-center">{ranking[0]?.nombre}</p>
              <p className="text-yellow-400 text-sm">{ranking[0]?.rangoActual}</p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mt-2">
                {ranking[0]?.quantumPoints} PC
              </p>
            </div>

            {/* 3rd Place */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-orange-600 rounded-xl p-4 flex flex-col items-center transform translate-y-4">
              <Trophy className="text-orange-400 mb-2" size={28} />
              <img
                src={ranking[2]?.avatar}
                alt={ranking[2]?.nombre}
                className={`
                  w-20 h-20 rounded-full object-cover mb-2 border-4 
                  bg-gradient-to-br ${getTierColor(ranking[2]?.tier)}
                  p-1
                `}
              />
              <p className="text-white font-bold text-center">{ranking[2]?.nombre}</p>
              <p className="text-slate-400 text-sm">{ranking[2]?.rangoActual}</p>
              <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mt-2">
                {ranking[2]?.quantumPoints} PC
              </p>
            </div>
          </div>
        )}

        {/* Tabla de Ranking */}
        {!loading && ranking.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
            
            {/* Ranking de Usuarios */}
            {(rankingType === 'GLOBAL' || rankingType === 'SCHOOL' || rankingType === 'VISION') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">#</th>
                      <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Usuario</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">
                        <Diamond size={16} className="inline mr-1" />
                        HQ
                      </th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">
                        <Phone size={16} className="inline mr-1" />
                        Asistencia
                      </th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">
                        <Zap size={16} className="inline mr-1" />
                        XP
                      </th>
                      <th className="px-4 py-3 text-right text-slate-400 text-sm font-semibold">
                        <Sparkles size={16} className="inline mr-1" />
                        PC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((user: RankingUser) => (
                      <React.Fragment key={user.userId}>
                        <tr 
                          className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
                        >
                          <td className="px-4 py-4 text-center">
                            {getMedalIcon(user.position)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  src={user.avatar}
                                  alt={user.nombre}
                                  className={`
                                    w-12 h-12 rounded-full object-cover border-2
                                    bg-gradient-to-br ${getTierColor(user.tier)}
                                    p-0.5
                                  `}
                                />
                                {user.isOnFire && (
                                  <Flame 
                                    className="absolute -top-1 -right-1 text-orange-500 animate-pulse" 
                                    size={16} 
                                  />
                                )}
                              </div>
                              <div>
                                <p className="text-white font-bold">{user.nombre}</p>
                                <p className="text-slate-400 text-xs">{user.rangoActual}</p>
                                {user.badges && user.badges.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {user.badges.slice(0, 3).map((badge, idx) => (
                                      <span key={idx} className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">
                                        {badge}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Diamond className="text-blue-400" size={16} />
                              <span className="text-white font-bold">{user.hqEvidenceCount}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {getAttendanceIcon(user.attendanceStatus)}
                              <span className={`
                                font-bold text-sm
                                ${user.attendanceStatus === 'PERFECT' ? 'text-green-400' : ''}
                                ${user.attendanceStatus === 'WARNING' ? 'text-yellow-400' : ''}
                                ${user.attendanceStatus === 'RISK' ? 'text-red-400' : ''}
                              `}>
                                {user.attendanceRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-white font-bold">{(user.xp || 0).toLocaleString()}</span>
                              <span className="text-slate-400 text-xs">Nv. {user.nivel || 0}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                              {user.quantumPoints}
                            </span>
                          </td>
                        </tr>
                        
                        {/* Player Card Expandida */}
                        {expandedUser === user.userId && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-slate-800/50">
                              <div className="grid grid-cols-4 gap-4">
                                <div className="text-center">
                                  <p className="text-slate-400 text-xs mb-1">Nivel</p>
                                  <p className="text-white font-bold text-lg">{user.nivel}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-400 text-xs mb-1">Racha</p>
                                  <p className="text-white font-bold text-lg">{user.streak} días</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-400 text-xs mb-1">Tier</p>
                                  <p className={`font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r ${getTierColor(user.tier)}`}>
                                    {user.tier}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-400 text-xs mb-1">Organización</p>
                                  <p className="text-white font-bold text-sm">{user.organization || 'N/A'}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ranking Guerra de Escuelas */}
            {rankingType === 'SCHOOL_WAR' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">#</th>
                      <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Escuela</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">Estudiantes</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">Promedio PC</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">
                        <Diamond size={16} className="inline mr-1" />
                        Evidencias HQ
                      </th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">Retención</th>
                      <th className="px-4 py-3 text-right text-slate-400 text-sm font-semibold">Total PC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((school: SchoolRanking) => (
                      <tr key={school.organizationId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 text-center">
                          {getMedalIcon(school.position)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {school.logo && (
                              <img
                                src={school.logo}
                                alt={school.name}
                                className="w-12 h-12 rounded-lg object-cover border-2 border-slate-700"
                              />
                            )}
                            <p className="text-white font-bold">{school.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-white font-bold">
                          <Users size={16} className="inline mr-1 text-slate-400" />
                          {school.totalStudents}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
                            {school.avgPointsPerStudent}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-white font-bold">
                          {school.totalHQEvidences}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-green-400 font-bold">{school.retentionRate}%</span>
                        </td>
                        <td className="px-4 py-4 text-right text-slate-300 font-bold text-lg">
                          {(school.totalPoints || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ranking de Mentores */}
            {rankingType === 'MENTOR' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">#</th>
                      <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Mentor</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">Mentorados</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">Promedio PC</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">
                        <Diamond size={16} className="inline mr-1" />
                        HQ
                      </th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">Llamadas</th>
                      <th className="px-4 py-3 text-center text-slate-400 text-sm font-semibold">% Cumplimiento</th>
                      <th className="px-4 py-3 text-right text-slate-400 text-sm font-semibold">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((mentor: MentorRanking, index: number) => (
                      <tr key={mentor.mentorId || `mentor-${index}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 text-center">
                          {getMedalIcon(mentor.position)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={mentor.avatar}
                              alt={mentor.nombre}
                              className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                            />
                            <div>
                              <p className="text-white font-bold">{mentor.nombre}</p>
                              {mentor.badges && mentor.badges.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  <Award className="text-yellow-400" size={14} />
                                  <span className="text-xs text-slate-400">{mentor.badges.length} badges</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-white font-bold">
                          {mentor.totalMentorados}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                            {mentor.avgPointsPerStudent}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-white font-bold">
                          {mentor.totalHQEvidences}
                        </td>
                        <td className="px-4 py-4 text-center text-white font-bold">
                          {mentor.completedCalls}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`
                            font-bold text-lg
                            ${mentor.completionRate >= 90 ? 'text-green-400' : ''}
                            ${mentor.completionRate >= 70 && mentor.completionRate < 90 ? 'text-yellow-400' : ''}
                            ${mentor.completionRate < 70 ? 'text-red-400' : ''}
                          `}>
                            {mentor.completionRate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-yellow-400 text-lg">★</span>
                            <span className="text-white font-bold">{mentor.rating ? mentor.rating.toFixed(1) : 'N/A'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TABLA: MIS MENTORADOS */}
        {!loading && rankingType === 'MY_MENTORADOS' && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
            {ranking.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-b border-slate-700">
                      <th className="px-4 py-4 text-left text-slate-300 font-bold text-sm uppercase tracking-wider">
                        Mentorado
                      </th>
                      <th className="px-4 py-4 text-center text-slate-300 font-bold text-sm uppercase tracking-wider">
                        Visión
                      </th>
                      <th className="px-4 py-4 text-center text-slate-300 font-bold text-sm uppercase tracking-wider">
                        Escuela
                      </th>
                      <th className="px-4 py-4 text-center text-slate-300 font-bold text-sm uppercase tracking-wider">
                        Puntos Cuánticos
                      </th>
                      <th className="px-4 py-4 text-center text-slate-300 font-bold text-sm uppercase tracking-wider">
                        Nivel
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ranking.map((mentorado: any, index: number) => (
                      <tr 
                        key={mentorado.id || index}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {mentorado.avatar || mentorado.profileImage ? (
                              <img
                                src={mentorado.avatar || mentorado.profileImage}
                                alt={mentorado.nombre}
                                className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold border-2 border-green-500">
                                {mentorado.nombre?.charAt(0) || '?'}
                              </div>
                            )}
                            <div>
                              <p className="text-white font-bold">{mentorado.nombre}</p>
                              <p className="text-slate-400 text-xs">{mentorado.rangoActual || 'Sin rango'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {mentorado.vision ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {mentorado.vision}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm italic">Pendiente asignar</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {mentorado.school ? (
                            <div className="flex items-center justify-center gap-2">
                              {mentorado.schoolLogo && (
                                <img 
                                  src={mentorado.schoolLogo} 
                                  alt={mentorado.school}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              )}
                              <span className="text-slate-300 text-sm font-medium">{mentorado.school}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm italic">Sin institución</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                              {mentorado.quantumPoints || 0}
                            </span>
                            <span className="text-xs text-slate-500">PC</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="text-blue-400" size={16} />
                            <span className="text-white font-bold text-lg">{mentorado.nivel || 1}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && ranking.length === 0 && (
          <div className="text-center py-20">
            <Trophy className="text-slate-600 mx-auto mb-4" size={64} />
            <p className="text-slate-400 text-lg">
              No hay datos disponibles para esta configuración
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Intenta cambiar los filtros de búsqueda
            </p>
          </div>
        )}

      </div>
    </div>
  );
}