'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Vote, Users, Clock, CheckCircle, Trophy, Filter, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import Image from 'next/image';

interface PollOption {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  _count: {
    votes: number;
  };
  votes?: { weight: number }[];
}

interface Poll {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  quorumPercentage: number;
  showResultsBeforeEnd: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  options: PollOption[];
  vision: {
    id: number;
    nombre: string;
  };
  createdBy: {
    id: number;
    nombre: string;
  };
  _count: {
    votes: number;
    chatMessages: number;
  };
  hasVoted?: boolean;
}

const categoryLabels: Record<string, string> = {
  'GENERAL': 'General',
  'IDENTITY': 'Identidad',
  'COMMUNITY_SERVICE': 'Servicio Comunitario',
  'LOGISTICS': 'Logística',
  'DISCIPLINE': 'Disciplina',
  'CONTRIBUTION': 'Contribución'
};

const statusLabels: Record<string, string> = {
  'PENDING': 'Pendiente',
  'ACTIVE': 'En Votación',
  'CLOSED': 'Finalizada',
  'CANCELLED': 'Cancelada'
};

const statusColors: Record<string, string> = {
  'PENDING': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'ACTIVE': 'bg-green-500/20 text-green-300 border-green-500/30',
  'CLOSED': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'CANCELLED': 'bg-red-500/20 text-red-300 border-red-500/30'
};

export default function VotacionesPage() {
  const { data: session } = useSession();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVision, setSelectedVision] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedPollId, setExpandedPollId] = useState<number | null>(null);
  const [visions, setVisions] = useState<{ id: number; nombre: string }[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAllPolls();
    }
  }, [session?.user?.id]);

  const fetchAllPolls = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/votaciones');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setPolls(data.polls || []);
      setVisions(data.visions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar votaciones');
    } finally {
      setLoading(false);
    }
  };

  const filteredPolls = polls.filter(poll => {
    if (selectedVision !== 'all' && poll.vision.id !== selectedVision) return false;
    if (selectedStatus !== 'all' && poll.status !== selectedStatus) return false;
    return true;
  });

  const getWinnerOption = (poll: Poll) => {
    if (poll.status !== 'CLOSED' && !poll.showResultsBeforeEnd) return null;
    
    const sortedOptions = [...poll.options].sort((a, b) => {
      const aVotes = a.votes?.reduce((sum, v) => sum + v.weight, 0) || a._count.votes;
      const bVotes = b.votes?.reduce((sum, v) => sum + v.weight, 0) || b._count.votes;
      return bVotes - aVotes;
    });
    
    return sortedOptions[0];
  };

  const calculatePercentage = (option: PollOption, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    const optionVotes = option.votes?.reduce((sum, v) => sum + v.weight, 0) || option._count.votes;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-800 rounded w-1/3"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-gray-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Vote className="text-purple-400" size={32} />
            Votaciones de la Tribu
          </h1>
          <p className="text-gray-400 mt-2">
            Consulta el historial y resultados de todas las votaciones
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={selectedVision}
              onChange={(e) => setSelectedVision(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todas las Visiones</option>
              {visions.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="ACTIVE">En Votación</option>
            <option value="CLOSED">Finalizadas</option>
            <option value="PENDING">Pendientes</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Lista de Votaciones */}
        <div className="space-y-4">
          {filteredPolls.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 rounded-xl border border-gray-800">
              <Vote size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No hay votaciones disponibles</p>
              <p className="text-gray-500 text-sm mt-2">
                {selectedStatus !== 'all' || selectedVision !== 'all' 
                  ? 'Intenta cambiar los filtros'
                  : 'Las votaciones aparecerán aquí cuando se creen'}
              </p>
            </div>
          ) : (
            filteredPolls.map((poll) => {
              const winner = getWinnerOption(poll);
              const totalVotes = poll._count.votes;
              const isExpanded = expandedPollId === poll.id;
              const canShowResults = poll.status === 'CLOSED' || poll.showResultsBeforeEnd;
              
              return (
                <div
                  key={poll.id}
                  className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
                >
                  {/* Header de la votación */}
                  <div 
                    className="p-5 cursor-pointer hover:bg-gray-800/50 transition-colors"
                    onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[poll.status]}`}>
                            {statusLabels[poll.status]}
                          </span>
                          <span className="px-3 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                            {categoryLabels[poll.category] || poll.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {poll.vision.nombre}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {poll.title}
                        </h3>
                        
                        {poll.description && (
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {poll.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {totalVotes} votos
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 size={14} />
                            {poll.options.length} opciones
                          </span>
                          {poll.endDate && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {poll.status === 'CLOSED' 
                                ? `Cerrada: ${new Date(poll.endDate).toLocaleDateString('es-MX')}`
                                : `Cierra: ${new Date(poll.endDate).toLocaleDateString('es-MX')}`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Ganador si está cerrada */}
                        {poll.status === 'CLOSED' && winner && (
                          <div className="text-right mr-4">
                            <div className="flex items-center gap-1 text-yellow-400 text-sm mb-1">
                              <Trophy size={14} />
                              Ganador
                            </div>
                            <span className="text-white font-medium">{winner.title}</span>
                          </div>
                        )}
                        
                        {isExpanded ? (
                          <ChevronUp size={24} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={24} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Detalles expandidos */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 p-5 bg-gray-900/50">
                      {canShowResults ? (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-400 mb-4">Resultados</h4>
                          {poll.options
                            .sort((a, b) => {
                              const aVotes = a._count.votes;
                              const bVotes = b._count.votes;
                              return bVotes - aVotes;
                            })
                            .map((option, idx) => {
                              const percentage = calculatePercentage(option, totalVotes);
                              const isWinner = idx === 0 && poll.status === 'CLOSED' && totalVotes > 0;
                              
                              return (
                                <div 
                                  key={option.id}
                                  className={`p-4 rounded-lg border ${
                                    isWinner 
                                      ? 'border-yellow-500/50 bg-yellow-500/10' 
                                      : 'border-gray-700 bg-gray-800/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    {option.imageUrl && (
                                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-700">
                                        <Image
                                          src={option.imageUrl}
                                          alt={option.title}
                                          width={64}
                                          height={64}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          {isWinner && (
                                            <Trophy size={16} className="text-yellow-400" />
                                          )}
                                          <span className={`font-medium ${isWinner ? 'text-yellow-300' : 'text-white'}`}>
                                            {option.title}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-lg font-bold text-white">{percentage}%</span>
                                          <span className="text-gray-500 text-sm ml-2">({option._count.votes} votos)</span>
                                        </div>
                                      </div>
                                      
                                      {option.description && (
                                        <p className="text-gray-400 text-sm mb-2">{option.description}</p>
                                      )}
                                      
                                      {/* Barra de progreso */}
                                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            isWinner ? 'bg-yellow-500' : 'bg-purple-500'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          
                          {/* Info adicional */}
                          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
                            <span>Creada por: {poll.createdBy.nombre}</span>
                            <span>Quórum requerido: {poll.quorumPercentage}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Clock size={32} className="mx-auto mb-3 text-gray-600" />
                          <p>Los resultados se mostrarán cuando finalice la votación</p>
                          {poll.hasVoted && (
                            <p className="mt-2 text-green-400 flex items-center justify-center gap-2">
                              <CheckCircle size={16} />
                              Ya emitiste tu voto
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Estadísticas generales */}
        {polls.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-purple-400">{polls.length}</div>
              <div className="text-sm text-gray-400">Total Votaciones</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-green-400">
                {polls.filter(p => p.status === 'ACTIVE').length}
              </div>
              <div className="text-sm text-gray-400">Activas</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-gray-400">
                {polls.filter(p => p.status === 'CLOSED').length}
              </div>
              <div className="text-sm text-gray-400">Finalizadas</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-blue-400">
                {polls.reduce((sum, p) => sum + p._count.votes, 0)}
              </div>
              <div className="text-sm text-gray-400">Votos Totales</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
