// Dashboard del Trainer - Lista de Bitácoras de Participantes
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  FileText,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import Link from 'next/link';

interface Participant {
  user: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
    telefono: string | null;
  };
  vision: {
    id: number;
    nombre: string;
  };
  enrollment: {
    level: string;
    paymentStatus: string;
  };
  questionnaire: any;
  hasCompletedQuestionnaire: boolean;
  hasSuicideRisk: boolean;
}

interface Stats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  withSuicideRisk: number;
}

export default function TrainerBitacorasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'risk'>('all');

  useEffect(() => {
    if (status === 'authenticated') {
      loadParticipants();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const loadParticipants = async () => {
    try {
      const response = await fetch('/api/trainer/bitacoras');
      const result = await response.json();
      
      if (result.participants) {
        setParticipants(result.participants);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    // Search filter
    const matchesSearch = 
      p.user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchesFilter = true;
    if (filter === 'completed') matchesFilter = p.hasCompletedQuestionnaire;
    if (filter === 'pending') matchesFilter = !p.hasCompletedQuestionnaire;
    if (filter === 'risk') matchesFilter = p.hasSuicideRisk;
    
    return matchesSearch && matchesFilter;
  });

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-gray-400">Cargando participantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Bitácoras de Participantes
          </h1>
          <p className="text-gray-400">
            Visualiza el panorama de vida de tus participantes de Avanzado
          </p>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  <p className="text-xs text-gray-400">Completadas</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                  <p className="text-xs text-gray-400">En progreso</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.pending}</p>
                  <p className="text-xs text-gray-400">Pendientes</p>
                </div>
              </div>
            </div>

            {stats.withSuicideRisk > 0 && (
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <LifeBuoy className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{stats.withSuicideRisk}</p>
                    <p className="text-xs text-red-400">Atención especial</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar participante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 outline-none"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'completed', label: 'Completadas' },
              { id: 'pending', label: 'Pendientes' },
              { id: 'risk', label: 'Atención', icon: LifeBuoy },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                  ${filter === f.id
                    ? f.id === 'risk'
                      ? 'bg-red-500 text-white'
                      : 'bg-purple-500 text-white'
                    : 'bg-slate-800/50 text-gray-400 border border-slate-700 hover:bg-slate-700'
                  }
                `}
              >
                {f.icon && <f.icon className="w-4 h-4" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Participants list */}
        <div className="space-y-3">
          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No se encontraron participantes</p>
            </div>
          ) : (
            filteredParticipants.map((participant, index) => (
              <motion.div
                key={participant.user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/dashboard/trainer/bitacoras/${participant.user.id}`}>
                  <div className={`
                    bg-slate-800/50 rounded-xl p-4 border transition-all cursor-pointer
                    hover:shadow-lg hover:border-purple-500/50
                    ${participant.hasSuicideRisk 
                      ? 'border-red-500/50 bg-red-500/5' 
                      : 'border-slate-700'
                    }
                  `}>
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        {participant.user.imagen ? (
                          <img
                            src={participant.user.imagen}
                            alt={participant.user.nombre}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {participant.user.nombre.charAt(0)}
                          </div>
                        )}
                        
                        {/* Status badge */}
                        <div className={`
                          absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800 flex items-center justify-center
                          ${participant.hasCompletedQuestionnaire 
                            ? 'bg-green-500' 
                            : participant.questionnaire?.status === 'IN_PROGRESS'
                              ? 'bg-amber-500'
                              : 'bg-gray-500'
                          }
                        `}>
                          {participant.hasCompletedQuestionnaire ? (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          ) : participant.questionnaire?.status === 'IN_PROGRESS' ? (
                            <Clock className="w-3 h-3 text-white" />
                          ) : (
                            <FileText className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate">
                            {participant.user.nombre}
                          </h3>
                          {participant.hasSuicideRisk && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full flex items-center gap-1">
                              <LifeBuoy className="w-3 h-3" />
                              Atención
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{participant.user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">{participant.vision.nombre}</p>
                      </div>

                      {/* Status text */}
                      <div className="text-right">
                        <span className={`
                          text-sm font-medium
                          ${participant.hasCompletedQuestionnaire 
                            ? 'text-green-400' 
                            : participant.questionnaire?.status === 'IN_PROGRESS'
                              ? 'text-amber-400'
                              : 'text-gray-500'
                          }
                        `}>
                          {participant.hasCompletedQuestionnaire 
                            ? 'Completada' 
                            : participant.questionnaire?.status === 'IN_PROGRESS'
                              ? `Dim. ${participant.questionnaire.currentDimension}/5`
                              : 'Sin iniciar'
                          }
                        </span>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
