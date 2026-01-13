'use client';

import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Users, 
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  TrendingUp,
  User,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CallAttempt {
  id: string;
  participantId: number;
  completed: boolean;
  potentialRating: number | null;
  notes: string | null;
  attemptNumber: number;
  trainingDay: number;
  attemptedAt: string;
  participant: {
    id: number;
    nombre: string;
    imagen: string | null;
  };
}

interface GameChanger {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface AtomData {
  id: string;
  name: string;
  level: string;
  gameChanger: GameChanger;
  membersCount: number;
  attempts: CallAttempt[];
  stats: {
    totalCalls: number;
    completedCalls: number;
    missedCalls: number;
    avgRating: number;
  };
}

interface RiskUser {
  id: number;
  nombre: string;
  imagen: string | null;
  rating: number;
  gcName: string;
  atomName: string;
  attemptedAt: string;
}

interface UserNotes {
  id: number;
  nombre: string;
  imagen: string | null;
  notes: {
    note: string;
    rating: number | null;
    date: string;
    completed: boolean;
    trainingDay: number;
  }[];
}

export default function GCCallsMonitorWidget() {
  const [atoms, setAtoms] = useState<AtomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAtom, setExpandedAtom] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'risk'>('today');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedUserNotes, setSelectedUserNotes] = useState<UserNotes | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/coordinator/gc-calls-monitor?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAtoms(data.atoms || []);
        }
      }
    } catch (error) {
      console.error('Error loading GC calls data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-slate-500 text-xs">Sin calificar</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? rating <= 2
                  ? 'text-red-400 fill-red-400'
                  : rating <= 3
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-emerald-400 fill-emerald-400'
                : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const totalStats = atoms.reduce(
    (acc, atom) => ({
      totalCalls: acc.totalCalls + atom.stats.totalCalls,
      completedCalls: acc.completedCalls + atom.stats.completedCalls,
      missedCalls: acc.missedCalls + atom.stats.missedCalls,
    }),
    { totalCalls: 0, completedCalls: 0, missedCalls: 0 }
  );

  // Obtener usuarios en riesgo (calificación ≤ 2)
  const riskUsers: RiskUser[] = atoms.flatMap(atom => 
    atom.attempts
      .filter(attempt => attempt.potentialRating !== null && attempt.potentialRating <= 2)
      .map(attempt => ({
        id: attempt.participant.id,
        nombre: attempt.participant.nombre,
        imagen: attempt.participant.imagen,
        rating: attempt.potentialRating!,
        gcName: atom.gameChanger.nombre,
        atomName: atom.name,
        attemptedAt: attempt.attemptedAt,
      }))
  );

  // Eliminar duplicados por participante (quedarse con el rating más bajo)
  const uniqueRiskUsers = riskUsers.reduce((acc, user) => {
    const existing = acc.find(u => u.id === user.id);
    if (!existing || existing.rating > user.rating) {
      return [...acc.filter(u => u.id !== user.id), user];
    }
    return acc;
  }, [] as RiskUser[]);

  // Función para obtener todas las notas de un participante
  const getUserNotes = (participantId: number): UserNotes | null => {
    const allAttempts = atoms.flatMap(atom => 
      atom.attempts.filter(a => a.participant.id === participantId)
    );
    
    if (allAttempts.length === 0) return null;
    
    const participant = allAttempts[0].participant;
    const notesWithData = allAttempts
      .filter(a => a.notes)
      .map(a => ({
        note: a.notes!,
        rating: a.potentialRating,
        date: a.attemptedAt,
        completed: a.completed,
        trainingDay: a.trainingDay,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return {
      id: participant.id,
      nombre: participant.nombre,
      imagen: participant.imagen,
      notes: notesWithData,
    };
  };

  const handleShowUserNotes = (participantId: number) => {
    const userNotes = getUserNotes(participantId);
    if (userNotes && userNotes.notes.length > 0) {
      setSelectedUserNotes(userNotes);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900/20 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900/20 border-indigo-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
              <Phone className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base text-white">Monitor de Llamadas GC</CardTitle>
              <p className="text-xs text-slate-400">Seguimiento de llamadas por átomo</p>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            {[
              { key: 'today', label: 'Hoy' },
              { key: 'all', label: 'Todas' },
              { key: 'risk', label: 'Riesgo' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === f.key
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats generales */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-400" />
              <span className="text-lg font-bold text-white">{totalStats.totalCalls}</span>
            </div>
            <p className="text-xs text-slate-400">Total llamadas</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-400">{totalStats.completedCalls}</span>
            </div>
            <p className="text-xs text-slate-400">Realizadas</p>
          </div>
          <button 
            onClick={() => setShowRiskModal(true)}
            className="bg-slate-800/50 rounded-xl p-3 border border-red-500/20 hover:bg-red-500/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-lg font-bold text-red-400">{uniqueRiskUsers.length}</span>
            </div>
            <p className="text-xs text-slate-400">En Riesgo</p>
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {atoms.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/30 rounded-xl">
            <Phone className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay registros de llamadas</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {atoms.map((atom) => {
              const isExpanded = expandedAtom === atom.id;
              const completionRate = atom.stats.totalCalls > 0
                ? Math.round((atom.stats.completedCalls / atom.stats.totalCalls) * 100)
                : 0;

              return (
                <div
                  key={atom.id}
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
                >
                  {/* Header del átomo */}
                  <button
                    onClick={() => setExpandedAtom(isExpanded ? null : atom.id)}
                    className="w-full p-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {atom.gameChanger.imagen ? (
                        <img
                          src={atom.gameChanger.imagen}
                          alt={atom.gameChanger.nombre}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {atom.gameChanger.nombre?.charAt(0) || 'G'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{atom.gameChanger.nombre}</p>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                            {atom.name}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            {atom.membersCount} participantes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Mini stats */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400">{atom.stats.completedCalls}✓</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-red-400">{atom.stats.missedCalls}✗</span>
                      </div>
                      
                      {/* Rating promedio */}
                      {atom.stats.avgRating > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded-lg">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-white">{atom.stats.avgRating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Indicador de riesgo */}
                      {atom.stats.avgRating > 0 && atom.stats.avgRating <= 2 && (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Detalle de llamadas - Agrupado por participante */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 p-3 bg-slate-800/30">
                      {atom.attempts.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-3">
                          No hay registros de llamadas
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {/* Agrupar intentos por participante */}
                          {(() => {
                            // Agrupar por participante y obtener el último intento de cada uno
                            const participantMap = new Map<number, typeof atom.attempts>();
                            atom.attempts.forEach(attempt => {
                              const existing = participantMap.get(attempt.participant.id) || [];
                              existing.push(attempt);
                              participantMap.set(attempt.participant.id, existing);
                            });
                            
                            // Convertir a array y ordenar por fecha más reciente
                            const groupedParticipants = Array.from(participantMap.entries()).map(([id, attempts]) => {
                              // Ordenar intentos por fecha (más reciente primero)
                              attempts.sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
                              const latestAttempt = attempts[0];
                              const lastNote = attempts.find(a => a.notes)?.notes || null;
                              const totalAttempts = attempts.length;
                              const completedAttempts = attempts.filter(a => a.completed).length;
                              // Obtener el rating más reciente que tenga valor
                              const latestRating = attempts.find(a => a.potentialRating !== null)?.potentialRating || null;
                              
                              return {
                                participantId: id,
                                participant: latestAttempt.participant,
                                latestAttempt,
                                lastNote,
                                totalAttempts,
                                completedAttempts,
                                latestRating,
                                allAttempts: attempts,
                              };
                            });
                            
                            return groupedParticipants.map((group) => (
                              <button
                                key={group.participantId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowUserNotes(group.participantId);
                                }}
                                className={`w-full text-left p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${
                                  group.latestAttempt.completed
                                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                                    : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {group.participant.imagen ? (
                                      <img
                                        src={group.participant.imagen}
                                        alt={group.participant.nombre}
                                        className="w-7 h-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                        {group.participant.nombre?.charAt(0) || '?'}
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-white">
                                        {group.participant.nombre}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        {group.completedAttempts}/{group.totalAttempts} llamadas • Último: {formatDate(group.latestAttempt.attemptedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center gap-1">
                                      {group.latestAttempt.completed ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                      )}
                                      <span className={`text-xs ${group.latestAttempt.completed ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {group.latestAttempt.completed ? 'Realizada' : 'No contestó'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Rating y último comentario */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                                    {renderStars(group.latestRating)}
                                  </div>
                                  {group.lastNote && (
                                    <div className="flex items-center gap-1 text-xs text-slate-400 max-w-[60%]">
                                      <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{group.lastNote}</span>
                                    </div>
                                  )}
                                </div>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal de usuarios en riesgo */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-red-500/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Usuarios en Riesgo</h3>
                  <p className="text-xs text-slate-400">Calificación de 2 estrellas o menos</p>
                </div>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Lista de usuarios */}
            <div className="max-h-[400px] overflow-y-auto p-4">
              {uniqueRiskUsers.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-emerald-400 font-medium">¡Sin usuarios en riesgo!</p>
                  <p className="text-sm text-slate-400 mt-1">Todos los participantes tienen buena calificación</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uniqueRiskUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 bg-slate-800/50 rounded-xl border border-red-500/20"
                    >
                      <div className="flex items-center gap-3">
                        {user.imagen ? (
                          <img
                            src={user.imagen}
                            alt={user.nombre}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/30"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                            {user.nombre?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{user.nombre}</p>
                          <p className="text-xs text-slate-400">{user.atomName} • {user.gcName}</p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-lg">
                          <Star className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                          <span className="text-sm font-bold text-red-400">{user.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/30">
              <button
                onClick={() => setShowRiskModal(false)}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de notas del usuario */}
      {selectedUserNotes && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-3">
                {selectedUserNotes.imagen ? (
                  <img
                    src={selectedUserNotes.imagen}
                    alt={selectedUserNotes.nombre}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                    {selectedUserNotes.nombre?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedUserNotes.nombre}</h3>
                  <p className="text-xs text-slate-400">{selectedUserNotes.notes.length} comentario(s)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserNotes(null)}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Lista de notas */}
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {selectedUserNotes.notes.map((note, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${
                    note.completed 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {note.completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-xs text-slate-400">Día {note.trainingDay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= note.rating!
                                  ? note.rating! <= 2
                                    ? 'text-red-400 fill-red-400'
                                    : note.rating! <= 3
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-emerald-400 fill-emerald-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {formatDate(note.date)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-white">{note.note}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/30">
              <button
                onClick={() => setSelectedUserNotes(null)}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
