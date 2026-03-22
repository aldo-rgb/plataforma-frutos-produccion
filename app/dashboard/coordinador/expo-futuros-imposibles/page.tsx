'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Rocket, Filter, Users, Store, ClipboardList, Star, 
  ChevronDown, Search, Eye, ArrowLeft, Building2,
  TrendingUp, Award, UserCheck, Printer, QrCode, UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface Vision {
  id: number;
  nombre: string;
}

interface ExpoParticipant {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  profileImage?: string;
  businessName?: string;
  businessCategory?: string;
  expoRegistrations: number;
  referredVisitors: number; // Invitados registrados con su link
  avgRating: number | null;
  totalRatings: number;
  lastRating?: {
    score: number;
    comment: string;
    ratedAt: string;
    ratedBy: string;
  };
}

interface ExpoStats {
  totalParticipants: number;
  totalBusinesses: number;
  totalRegistrations: number;
  totalReferredVisitors: number; // Total de invitados registrados
  avgRating: number;
  participantsWithRating: number;
}

export default function ExpoFuturosImposiblesPage() {
  const { data: session } = useSession();
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [selectedVision, setSelectedVision] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ExpoParticipant[]>([]);
  const [stats, setStats] = useState<ExpoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<'all' | 'rated' | 'unrated'>('all');

  // Cargar visiones disponibles
  useEffect(() => {
    fetchVisiones();
  }, []);

  // Cargar datos cuando se selecciona una visión
  useEffect(() => {
    if (selectedVision) {
      fetchExpoData(selectedVision);
    }
  }, [selectedVision]);

  const fetchVisiones = async () => {
    try {
      const res = await fetch('/api/coordinador/visiones');
      if (res.ok) {
        const data = await res.json();
        setVisiones(data.visiones || []);
        
        // Priorizar la visión con producto PL activo (recomendada para Expo)
        if (data.expoRecommendedVisionId) {
          setSelectedVision(data.expoRecommendedVisionId);
        } else if (data.visiones?.length > 0) {
          // Si no hay recomendada, seleccionar la primera
          setSelectedVision(data.visiones[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching visiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpoData = async (visionId: number) => {
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/coordinador/expo-futuros-imposibles?visionId=${visionId}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching expo data:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Filtrar participantes
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = filterRating === 'all' ||
                         (filterRating === 'rated' && p.avgRating !== null) ||
                         (filterRating === 'unrated' && p.avgRating === null);
    
    return matchesSearch && matchesRating;
  });

  const getRatingColor = (rating: number | null) => {
    if (rating === null) return 'text-slate-500';
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 3.5) return 'text-yellow-400';
    if (rating >= 2.5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRatingBg = (rating: number | null) => {
    if (rating === null) return 'bg-slate-800/50';
    if (rating >= 4.5) return 'bg-green-500/20';
    if (rating >= 3.5) return 'bg-yellow-500/20';
    if (rating >= 2.5) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/coordinador"
              className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                <Rocket className="text-purple-400" />
                Expo de Futuros Imposibles
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Gestiona y califica los negocios de tus participantes
              </p>
            </div>
          </div>

          {/* Botón Imprimir QRs y Selector de Visión */}
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/coordinador/expo-futuros-imposibles/print-qrs${selectedVision ? `?visionId=${selectedVision}` : ''}`}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white px-4 py-3 rounded-xl font-semibold shadow-lg transition-all border-2 border-orange-400/30 min-w-[140px] h-[50px]"
            >
              <QrCode size={20} />
              <span className="hidden md:inline">Imprimir QRs</span>
            </Link>
            
            <div className="relative">
              <select
                value={selectedVision || ''}
                onChange={(e) => setSelectedVision(Number(e.target.value))}
                className="appearance-none bg-slate-800/80 border-2 border-purple-500/30 rounded-xl px-4 py-3 pr-10 text-white font-medium focus:border-purple-500/50 focus:outline-none cursor-pointer min-w-[200px] h-[50px]"
              >
                {visiones.map(vision => (
                  <option key={vision.id} value={vision.id}>
                    {vision.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={20} />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-blue-400" size={20} />
                <span className="text-slate-400 text-sm">Participantes</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalParticipants}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="text-purple-400" size={20} />
                <span className="text-slate-400 text-sm">Negocios</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalBusinesses}</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="text-cyan-400" size={20} />
                <span className="text-slate-400 text-sm">Registros Expo</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalRegistrations}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="text-orange-400" size={20} />
                <span className="text-slate-400 text-sm">Invitados</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalReferredVisitors || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/40 to-slate-900 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="text-yellow-400" size={20} />
                <span className="text-slate-400 text-sm">Calif. Promedio</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="text-green-400" size={20} />
                <span className="text-slate-400 text-sm">Calificados</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.participantsWithRating}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, negocio o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterRating('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterRating === 'all' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterRating('rated')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterRating === 'rated' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Calificados
            </button>
            <button
              onClick={() => setFilterRating('unrated')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterRating === 'unrated' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Sin Calificar
            </button>
          </div>
        </div>

        {/* Participants List */}
        {loadingParticipants ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400"></div>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700">
            <Rocket className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400">No se encontraron participantes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParticipants.map((participant) => (
              <div 
                key={participant.id}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700 hover:border-purple-500/50 rounded-xl p-5 transition-all group"
              >
                {/* Header con avatar y nombre */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0">
                    {participant.profileImage ? (
                      <img src={participant.profileImage} alt={participant.nombre} className="w-full h-full object-cover" />
                    ) : (
                      participant.nombre.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {participant.nombre}
                    </h3>
                    <p className="text-slate-400 text-sm truncate">{participant.email}</p>
                  </div>
                  
                  {/* Rating Badge */}
                  <div className={`px-3 py-1 rounded-full ${getRatingBg(participant.avgRating)}`}>
                    <div className="flex items-center gap-1">
                      <Star className={getRatingColor(participant.avgRating)} size={14} fill="currentColor" />
                      <span className={`font-bold text-sm ${getRatingColor(participant.avgRating)}`}>
                        {participant.avgRating !== null ? participant.avgRating.toFixed(1) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                {participant.businessName ? (
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="text-purple-400" size={16} />
                      <span className="text-white font-medium text-sm">{participant.businessName}</span>
                    </div>
                    {participant.businessCategory && (
                      <span className="text-slate-400 text-xs">{participant.businessCategory}</span>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="text-red-400 text-sm">⚠️</span>
                      </div>
                      <div>
                        <span className="text-red-300 font-medium text-sm">Sin negocio configurado</span>
                        <p className="text-red-400/70 text-xs">Este participante no ha registrado su negocio</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className="text-cyan-400 font-bold">{participant.expoRegistrations}</p>
                    <p className="text-slate-500 text-xs">Registros</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className="text-orange-400 font-bold">{participant.referredVisitors || 0}</p>
                    <p className="text-slate-500 text-xs">Invitados</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className="text-yellow-400 font-bold">{participant.totalRatings}</p>
                    <p className="text-slate-500 text-xs">Calificaciones</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                    <p className={`font-bold ${getRatingColor(participant.avgRating)}`}>
                      {participant.avgRating !== null ? participant.avgRating.toFixed(1) : '-'}
                    </p>
                    <p className="text-slate-500 text-xs">Promedio</p>
                  </div>
                </div>

                {/* Last Rating */}
                {participant.lastRating && (
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-slate-500 text-xs mb-1">Última calificación:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            size={12} 
                            className={star <= participant.lastRating!.score ? 'text-yellow-400' : 'text-slate-600'} 
                            fill={star <= participant.lastRating!.score ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      <span className="text-slate-400 text-xs">
                        por {participant.lastRating.ratedBy}
                      </span>
                    </div>
                    {participant.lastRating.comment && (
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2 italic">
                        "{participant.lastRating.comment}"
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <Link
                    href={`/dashboard/coordinador/expo-futuros-imposibles/${participant.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg py-2 transition-colors"
                  >
                    <Eye size={16} />
                    <span className="text-sm font-medium">Ver Detalles</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
