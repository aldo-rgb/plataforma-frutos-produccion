'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  ChevronRight, 
  Star,
  Phone,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AtomMember {
  id: string;
  odId: number;
  user: {
    id: number;
    nombre: string;
    imagen: string | null;
    email: string;
    telefono: string | null;
  };
  joinedAt: string;
}

interface AtomHistory {
  id: string;
  name: string;
  level: 'BASIC' | 'ADVANCED';
  isActive: boolean;
  createdAt: string;
  closedAt: string | null;
  vision: {
    id: number;
    nombre: string;
    startDate: string | null;
    endDate: string | null;
    advancedStartDate: string | null;
    advancedEndDate: string | null;
  } | null;
  members: AtomMember[];
  membersCount: number;
  stats: {
    totalCalls: number;
    completedCalls: number;
    avgRating: number;
  };
}

interface CallAttempt {
  id: string;
  completed: boolean;
  potentialRating: number | null;
  notes: string | null;
  trainingDay: number;
  attemptedAt: string;
}

export default function MisAtomosPage() {
  const router = useRouter();
  const [atoms, setAtoms] = useState<AtomHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAtom, setExpandedAtom] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<AtomMember | null>(null);
  const [memberCallHistory, setMemberCallHistory] = useState<CallAttempt[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

  useEffect(() => {
    loadAtoms();
  }, []);

  const loadAtoms = async () => {
    try {
      const res = await fetch('/api/gc/my-atoms-history');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAtoms(data.atoms || []);
        }
      }
    } catch (error) {
      console.error('Error loading atoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberCallHistory = async (memberId: number, atomId: string) => {
    setLoadingCalls(true);
    try {
      const res = await fetch(`/api/gc-calls/quick-log?participantId=${memberId}&squadId=${atomId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMemberCallHistory(data.attempts || []);
        }
      }
    } catch (error) {
      console.error('Error loading call history:', error);
    } finally {
      setLoadingCalls(false);
    }
  };

  const handleMemberClick = (member: AtomMember, atomId: string) => {
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setMemberCallHistory([]);
    } else {
      setSelectedMember(member);
      loadMemberCallHistory(member.user.id, atomId);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getAtomStatus = (atom: AtomHistory) => {
    if (!atom.isActive) {
      return { label: 'Finalizado', color: 'bg-slate-500/20 text-slate-300' };
    }
    
    const now = new Date();
    const vision = atom.vision;
    
    if (vision) {
      const startDate = atom.level === 'ADVANCED' 
        ? vision.advancedStartDate 
        : vision.startDate;
      const endDate = atom.level === 'ADVANCED'
        ? vision.advancedEndDate
        : vision.endDate;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (now < start) {
          return { label: 'Próximo', color: 'bg-blue-500/20 text-blue-300' };
        } else if (now >= start && now <= end) {
          return { label: 'En curso', color: 'bg-green-500/20 text-green-300' };
        } else {
          return { label: 'Completado', color: 'bg-purple-500/20 text-purple-300' };
        }
      }
    }
    
    return { label: 'Activo', color: 'bg-emerald-500/20 text-emerald-300' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-purple-400" />
              Mis Átomos
            </h1>
            <p className="text-sm text-slate-400">
              Historial de todos tus grupos de entrenamiento
            </p>
          </div>
        </div>

        {/* Lista de Átomos */}
        {atoms.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No tienes átomos registrados aún</p>
              <p className="text-sm text-slate-500 mt-1">
                Los átomos aparecerán aquí cuando seas asignado como Game Changer
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {atoms.map((atom) => {
              const status = getAtomStatus(atom);
              const isExpanded = expandedAtom === atom.id;
              
              return (
                <Card 
                  key={atom.id} 
                  className={`bg-slate-900/50 border-slate-800 transition-all ${
                    isExpanded ? 'ring-1 ring-purple-500/30' : ''
                  }`}
                >
                  <CardHeader 
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedAtom(isExpanded ? null : atom.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          atom.level === 'ADVANCED' 
                            ? 'bg-purple-500/20 border border-purple-500/30' 
                            : 'bg-indigo-500/20 border border-indigo-500/30'
                        }`}>
                          <Users className={`w-5 h-5 ${
                            atom.level === 'ADVANCED' ? 'text-purple-400' : 'text-indigo-400'
                          }`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            {atom.name}
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-slate-400">
                            {atom.level === 'ADVANCED' ? 'Avanzado' : 'Básico'} • {atom.membersCount} participantes
                            {atom.vision && ` • ${atom.vision.nombre}`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </div>
                    
                    {/* Stats del átomo */}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span className="text-white">{atom.stats.completedCalls}</span>
                        <span className="text-slate-500">llamadas</span>
                      </div>
                      {atom.stats.avgRating > 0 && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-white">{atom.stats.avgRating.toFixed(1)}</span>
                          <span className="text-slate-500">promedio</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(atom.createdAt)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Lista de miembros expandida */}
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-300 mb-3">
                          Participantes
                        </h4>
                        {atom.members.map((member) => (
                          <div key={member.id}>
                            <div 
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedMember?.id === member.id 
                                  ? 'bg-purple-500/10 border border-purple-500/30' 
                                  : 'bg-slate-800/50 hover:bg-slate-800'
                              }`}
                              onClick={() => handleMemberClick(member, atom.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {member.user.imagen ? (
                                    <img 
                                      src={member.user.imagen}
                                      alt={member.user.nombre}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                      {member.user.nombre?.charAt(0) || '?'}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-white">
                                      {member.user.nombre}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {member.user.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {member.user.telefono && (
                                    <a 
                                      href={`tel:${member.user.telefono}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  )}
                                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${
                                    selectedMember?.id === member.id ? 'rotate-90' : ''
                                  }`} />
                                </div>
                              </div>
                            </div>
                            
                            {/* Historial de llamadas del miembro */}
                            {selectedMember?.id === member.id && (
                              <div className="mt-2 ml-4 pl-4 border-l-2 border-purple-500/30">
                                <h5 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  Historial de llamadas
                                </h5>
                                {loadingCalls ? (
                                  <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cargando...
                                  </div>
                                ) : memberCallHistory.length === 0 ? (
                                  <p className="text-xs text-slate-500 py-2">
                                    Sin registro de llamadas
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {memberCallHistory.map((call) => (
                                      <div 
                                        key={call.id}
                                        className={`p-2 rounded-lg text-sm ${
                                          call.completed 
                                            ? 'bg-emerald-500/10 border border-emerald-500/20' 
                                            : 'bg-amber-500/10 border border-amber-500/20'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {call.completed ? (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                              <Clock className="w-4 h-4 text-amber-400" />
                                            )}
                                            <span className={call.completed ? 'text-emerald-300' : 'text-amber-300'}>
                                              {call.completed ? 'Completada' : 'No contestó'}
                                            </span>
                                            {call.potentialRating && (
                                              <span className="flex items-center text-amber-400">
                                                <Star className="w-3 h-3 mr-0.5 fill-amber-400" />
                                                {call.potentialRating}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-xs text-slate-500">
                                            Día {call.trainingDay}
                                          </span>
                                        </div>
                                        {call.notes && (
                                          <p className="text-xs text-slate-400 mt-1 pl-6">
                                            {call.notes}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
