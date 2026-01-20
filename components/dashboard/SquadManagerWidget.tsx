'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Calendar, 
  UserPlus, 
  Sparkles,
  Phone,
  Star,
  X,
  Check,
  MessageSquare,
  CalendarPlus,
  RefreshCw,
  CheckCircle2,
  Pencil,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PostEntrenoScheduleModal from './PostEntrenoScheduleModal';

interface Squad {
  id: string;
  name: string;
  level: string;
  membersCount: number;
  maxSize: number;
  members?: SquadMember[];
}

interface SquadMember {
  id: string;
  odId: number;
  user: {
    id: number;
    nombre: string;
    imagen: string | null;
    email: string;
    telefono?: string | null;
  };
  joinedAt: string;
  scheduledTime?: string | null;
  assignedByGC?: boolean;
  enrollment?: {
    id: number;
    attendanceStatus: string | null;
    level: string;
  } | null;
  nextCall?: {
    scheduledDate: string;
    scheduledTime: string;
  } | null;
}

interface AvailableSlot {
  time: string;
  isOccupied: boolean;
  participantName?: string;
}

interface SquadStats {
  totalSquads: number;
  totalMembers: number;
  membersWithoutCall: number;
  todayCalls: number;
  completedToday: number;
}

interface CallLogForm {
  participantId: number;
  participantName: string;
  completed: boolean | null;
  rating: number;
  notes: string;
}

interface TodayCallStatus {
  status: 'completed' | 'pending_retry' | null;
  attempts: number;
  lastAttempt?: string;
  rating?: number | null;
}

interface TrainingInfo {
  currentDay: number | null;
  totalDays: number;
  isStaffCallDay: boolean;
  staffCallDays: number[];
  level: string;
  showInDashboard?: boolean;
}

export default function SquadManagerWidget() {
  const [stats, setStats] = useState<SquadStats>({
    totalSquads: 0,
    totalMembers: 0,
    membersWithoutCall: 0,
    todayCalls: 0,
    completedToday: 0
  });
  const [squads, setSquads] = useState<Squad[]>([]);
  const [allMembers, setAllMembers] = useState<SquadMember[]>([]);
  const [memberSchedules, setMemberSchedules] = useState<Record<number, string>>({});
  const [todayCallStatus, setTodayCallStatus] = useState<Record<number, TodayCallStatus>>({});
  const [trainingInfo, setTrainingInfo] = useState<TrainingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para el modal de registro de llamada
  const [showCallModal, setShowCallModal] = useState(false);
  const [callForm, setCallForm] = useState<CallLogForm>({
    participantId: 0,
    participantName: '',
    completed: null,
    rating: 0,
    notes: ''
  });
  const [savingCall, setSavingCall] = useState(false);
  
  // Estado para el modal de agendar llamadas
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [assigningSchedule, setAssigningSchedule] = useState(false);

  // Estado para editar nombre del átomo
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Estado para marcar DROP
  const [markingDrop, setMarkingDrop] = useState(false);
  const [showDropConfirm, setShowDropConfirm] = useState(false);
  const [dropReason, setDropReason] = useState('');
  const [newAtomName, setNewAtomName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  // Estado para el modal de Post Entreno
  const [showPostEntrenoModal, setShowPostEntrenoModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar squads CON miembros
      const squadsRes = await fetch('/api/squads?includeMembers=true');
      if (squadsRes.ok) {
        const squadsData = await squadsRes.json();
        console.log('📦 Squads data:', squadsData);
        if (squadsData.success && squadsData.squads) {
          setSquads(squadsData.squads);
          const totalMembers = squadsData.squads.reduce((sum: number, s: Squad) => sum + s.membersCount, 0);
          
          // Combinar todos los miembros de todos los squads
          const members: SquadMember[] = [];
          squadsData.squads.forEach((squad: Squad) => {
            console.log('📦 Squad members:', squad.name, squad.members?.length, squad.members);
            if (squad.members) {
              members.push(...squad.members);
            }
          });
          console.log('📦 All members:', members.length, members);
          setAllMembers(members);
          
          setStats(prev => ({
            ...prev,
            totalSquads: squadsData.squads.length,
            totalMembers
          }));
        }
      }

      // Cargar estadísticas de llamadas del GC
      const statsRes = await fetch('/api/gc-calls/my-stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          // Guardar horarios de los participantes
          if (statsData.memberSchedules) {
            setMemberSchedules(statsData.memberSchedules);
          }
          // Guardar estado de llamadas del día
          if (statsData.todayCallStatus) {
            setTodayCallStatus(statsData.todayCallStatus);
          }
          // Guardar información del entrenamiento
          if (statsData.trainingInfo) {
            setTrainingInfo(statsData.trainingInfo);
          }
          setStats(prev => ({
            ...prev,
            membersWithoutCall: statsData.stats?.membersWithoutCall || 0,
            todayCalls: statsData.stats?.todayCalls || 0,
            completedToday: statsData.stats?.completedToday || 0
          }));
        }
      }
    } catch (error) {
      console.error('Error loading squad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const openCallModal = (member: SquadMember) => {
    setCallForm({
      participantId: member.user.id,
      participantName: member.user.nombre,
      completed: null,
      rating: 0,
      notes: ''
    });
    setShowCallModal(true);
  };

  const openScheduleModal = async () => {
    setShowScheduleModal(true);
    setSelectedMember(null);
    await loadAvailableSlots();
  };

  const openRenameModal = () => {
    if (squads.length > 0) {
      setNewAtomName(squads[0].name);
    }
    setShowRenameModal(true);
  };

  const saveAtomName = async () => {
    if (!newAtomName.trim() || squads.length === 0) return;
    
    setSavingName(true);
    try {
      console.log('🔧 Guardando nombre del átomo:', {
        squadId: squads[0].id,
        newName: newAtomName.trim(),
      });
      
      const res = await fetch(`/api/squads/${squads[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAtomName.trim() }),
      });
      
      const data = await res.json();
      console.log('🔧 Respuesta del servidor:', data);
      
      if (res.ok && data.success) {
        // Actualizar el nombre localmente
        setSquads(prev => prev.map((s, idx) => 
          idx === 0 ? { ...s, name: newAtomName.trim() } : s
        ));
        setShowRenameModal(false);
      } else {
        console.error('Error del servidor:', data.error);
        alert(data.error || 'Error al guardar el nombre');
      }
    } catch (error) {
      console.error('Error saving atom name:', error);
    } finally {
      setSavingName(false);
    }
  };

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch('/api/gc-calls/available-times');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAvailableSlots(data.availableSlots || []);
        }
      }
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleAssignSchedule = async (time: string) => {
    if (!selectedMember) return;
    
    setAssigningSchedule(true);
    try {
      const res = await fetch('/api/gc-calls/assign-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedMember.user.id,
          time: time,
        }),
      });
      
      const data = await res.json();
      console.log('📞 Assign response:', data);
      
      if (data.success) {
        // Recargar los slots y datos
        await loadAvailableSlots();
        await loadData();
        setSelectedMember(null);
      } else {
        console.error('Error:', data.error, data.details);
        alert(data.error || 'Error al asignar horario');
      }
    } catch (error) {
      console.error('Error assigning schedule:', error);
      alert('Error de conexión al asignar horario');
    } finally {
      setAssigningSchedule(false);
    }
  };

  const handleSaveCallLog = async () => {
    if (callForm.completed === null) return;
    
    setSavingCall(true);
    try {
      const res = await fetch('/api/gc-calls/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: callForm.participantId,
          completed: callForm.completed,
          potentialRating: callForm.rating || null,
          notes: callForm.notes || null,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowCallModal(false);
        loadData(); // Recargar datos
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error saving call log:', error);
    } finally {
      setSavingCall(false);
    }
  };

  // Función para marcar participante como DROP
  const handleMarkDrop = async () => {
    if (!callForm.participantId) return;
    
    // Buscar el miembro para obtener su id de SmallGroupMember
    const member = allMembers.find(m => m.user.id === callForm.participantId);
    if (!member) return;

    setMarkingDrop(true);
    try {
      const res = await fetch('/api/game-changer/mark-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          reason: dropReason || 'Abandonó el entrenamiento'
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowCallModal(false);
        setShowDropConfirm(false);
        setDropReason('');
        loadData(); // Recargar datos
      } else {
        console.error('Error:', data.error);
        alert(data.error || 'Error al marcar como DROP');
      }
    } catch (error) {
      console.error('Error marking drop:', error);
      alert('Error al marcar como DROP');
    } finally {
      setMarkingDrop(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/10 rounded w-1/2"></div>
            <div className="h-20 bg-white/10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si el entrenamiento terminó hace más de 7 días y no hay squads, no mostrar
  // PERO si no hay squads, mostrar la opción de crear uno
  if (trainingInfo && trainingInfo.showInDashboard === false && squads.length === 0) {
    return null;
  }

  // Si no hay squads, mostrar la opción de crear átomo
  if (squads.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <CardTitle className="text-lg text-white">Mi Átomo</CardTitle>
          </div>
          <CardDescription className="text-gray-400">
            Gestiona tu grupo de participantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-dashed border-indigo-500/30 rounded-lg p-6 text-center">
            <UserPlus className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-1">Crea tu primer Átomo</h4>
            <p className="text-sm text-gray-400 mb-4">
              Organiza a tus participantes en grupos pequeños para un mejor seguimiento
            </p>
            <Link href="/dashboard/game-changer/squads">
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Crear Átomo
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">
                  {squads.length > 0 ? squads[0].name : 'Mi Átomo'}
                </CardTitle>
                {squads.length > 0 && (
                  <button
                    onClick={openRenameModal}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors"
                    title="Editar nombre"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </button>
                )}
              </div>
              <CardDescription className="text-gray-400">Gestiona tus grupos y llamadas</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Banner de día de entrenamiento */}
        {trainingInfo && trainingInfo.currentDay !== null && trainingInfo.currentDay >= 1 && trainingInfo.currentDay <= trainingInfo.totalDays && (
          <div className={`rounded-lg p-3 ${
            trainingInfo.isStaffCallDay 
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' 
              : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${trainingInfo.isStaffCallDay ? 'text-amber-400' : 'text-blue-400'}`} />
                <span className="text-sm font-medium text-white">
                  Día {trainingInfo.currentDay} de {trainingInfo.totalDays}
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    trainingInfo.level === 'ADVANCED' 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {trainingInfo.level === 'ADVANCED' ? 'Avanzado' : 'Básico'}
                </Badge>
              </div>
              {trainingInfo.isStaffCallDay ? (
                <span className="text-xs text-amber-300 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Día de llamadas
                </span>
              ) : (
                <span className="text-xs text-blue-300">
                  {trainingInfo.currentDay === 1 ? 'Día de llegada' : 'Sin llamadas'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mensaje cuando entrenamiento terminó */}
        {trainingInfo && trainingInfo.currentDay !== null && trainingInfo.currentDay > trainingInfo.totalDays && (
          <div className="rounded-lg p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Entrenamiento completado</span>
              <span className="text-xs text-purple-300 ml-auto">Llamadas Post-Entreno activas</span>
            </div>
          </div>
        )}

        {/* Stats rápidas - Solo mostrar si es día de llamadas o entrenamiento terminó */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.totalMembers}</p>
            <p className="text-xs text-gray-400">Miembros</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.completedToday}</p>
            <p className="text-xs text-gray-400">Hoy ✓</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.totalMembers - stats.completedToday}</p>
            <p className="text-xs text-gray-400">Pendientes</p>
          </div>
        </div>

        {/* Lista de participantes con horario */}
        {allMembers.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Tus Participantes
            </h4>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {allMembers.map((member) => {
                const schedule = memberSchedules[member.user.id];
                const callStatus = todayCallStatus[member.user.id];
                const isCompleted = callStatus?.status === 'completed';
                const needsRetry = callStatus?.status === 'pending_retry';
                const isDrop = member.enrollment?.attendanceStatus === 'DROP';
                
                return (
                  <div 
                    key={member.id}
                    className={`rounded-lg p-3 transition-colors ${
                      isDrop 
                        ? 'bg-gray-800/50 opacity-60 grayscale border-l-2 border-gray-500' 
                        : `bg-white/5 hover:bg-white/10 ${
                            isCompleted ? 'border-l-2 border-emerald-500' : 
                            needsRetry ? 'border-l-2 border-amber-500' : ''
                          }`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {member.user.imagen ? (
                            <img 
                              src={member.user.imagen} 
                              alt={member.user.nombre}
                              className={`w-8 h-8 rounded-full object-cover ${isDrop ? 'grayscale' : ''}`}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                              {member.user.nombre?.charAt(0) || '?'}
                            </div>
                          )}
                          {/* Indicador de estado */}
                          {isDrop && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                              <X className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {isCompleted && !isDrop && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          {needsRetry && !isDrop && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <RefreshCw className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium flex items-center gap-2 ${isDrop ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {member.user.nombre}
                            {isDrop && (
                              <span className="text-xs text-gray-500 no-underline">(DROP)</span>
                            )}
                            {isCompleted && !isDrop && callStatus?.rating && (
                              <span className="flex items-center text-xs text-amber-400">
                                <Star className="w-3 h-3 mr-0.5 fill-amber-400" />
                                {callStatus.rating}
                              </span>
                            )}
                            {/* Teléfono clickable */}
                            {member.user.telefono && !isDrop && (
                              <a 
                                href={`tel:${member.user.telefono}`}
                                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors no-underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            {isDrop ? (
                              <span className="text-gray-500">Abandonó el entrenamiento</span>
                            ) : (
                              <>
                                {member.nextCall ? (
                                  <span className="text-purple-300">
                                    📅 {(() => {
                                      // Parsear la fecha sin conversión de timezone
                                      const dateStr = member.nextCall.scheduledDate.split('T')[0];
                                      const [year, month, day] = dateStr.split('-').map(Number);
                                      const date = new Date(year, month - 1, day);
                                      return date.toLocaleDateString('es-MX', { 
                                        weekday: 'short', 
                                        day: 'numeric', 
                                        month: 'short' 
                                      });
                                    })()} - {member.nextCall.scheduledTime}
                                  </span>
                                ) : schedule ? (
                                  formatTime(schedule)
                                ) : (
                                  'Sin horario'
                                )}
                                {member.user.telefono && (
                                  <a 
                                    href={`tel:${member.user.telefono}`}
                                    className="ml-2 text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {member.user.telefono}
                                  </a>
                                )}
                                {isCompleted && (
                                  <span className="text-emerald-400 ml-1">• ✓</span>
                                )}
                                {needsRetry && (
                                  <span className="text-amber-400 ml-1">• Reintentar</span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      {/* Botón registrar llamada - oculto para DROP */}
                      {!isDrop && (
                        <Button
                          size="sm"
                          onClick={() => openCallModal(member)}
                          className={`${
                            isCompleted 
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30' 
                              : needsRetry
                              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Listo
                            </>
                          ) : needsRetry ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reintentar
                            </>
                          ) : (
                            <>
                              <Phone className="w-3 h-3 mr-1" />
                              Registrar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : stats.totalSquads > 0 ? (
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin participantes</p>
            <p className="text-xs text-gray-500">Agrega miembros a tu átomo</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-dashed border-indigo-500/30 rounded-lg p-6 text-center">
            <UserPlus className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h4 className="text-white font-medium mb-1">Crea tu primer Átomo</h4>
            <p className="text-sm text-gray-400 mb-4">
              Organiza a tus participantes en grupos pequeños para un mejor seguimiento
            </p>
            <Link href="/dashboard/game-changer/squads">
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                <Users className="w-4 h-4 mr-2" />
                Crear Átomo
              </Button>
            </Link>
          </div>
        )}

        {/* Botones de acción */}
        {stats.totalSquads > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Link href="/dashboard/game-changer/squads" className="block">
              <Button variant="outline" className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs px-2">
                <UserPlus className="w-4 h-4 mr-1" />
                Miembros
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs px-2"
              onClick={openScheduleModal}
            >
              <Phone className="w-4 h-4 mr-1" />
              Agendar
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs px-2"
              onClick={() => setShowPostEntrenoModal(true)}
            >
              <CalendarPlus className="w-4 h-4 mr-1" />
              Post Entreno
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal de Renombrar Átomo */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white">Nombre del Átomo</h3>
              </div>
              <button
                onClick={() => setShowRenameModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <input
                type="text"
                value={newAtomName}
                onChange={(e) => setNewAtomName(e.target.value)}
                placeholder="Nombre de tu átomo"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                maxLength={30}
              />
              <p className="text-xs text-slate-500 mt-2">
                Máximo 30 caracteres
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameModal(false)}
                className="flex-1 border-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveAtomName}
                disabled={!newAtomName.trim() || savingName}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              >
                {savingName ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Llamada */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Registrar Llamada</h3>
                <p className="text-sm text-slate-400">{callForm.participantName}</p>
              </div>
              <button
                onClick={() => setShowCallModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* ¿Se realizó la llamada? */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  ¿Se realizó la llamada?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCallForm(prev => ({ ...prev, completed: true }))}
                    className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      callForm.completed === true
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Sí
                  </button>
                  <button
                    onClick={() => setCallForm(prev => ({ ...prev, completed: false }))}
                    className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      callForm.completed === false
                        ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    No
                  </button>
                </div>
              </div>

              {/* Calificación de potencial */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Posibilidad de avanzar
                </label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setCallForm(prev => ({ ...prev, rating: star }))}
                      className={`p-2 rounded-lg transition-all ${
                        callForm.rating >= star
                          ? 'text-amber-400'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className={`w-8 h-8 ${callForm.rating >= star ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center text-slate-500 mt-1">
                  {callForm.rating === 0 && 'Selecciona una calificación'}
                  {callForm.rating === 1 && 'Muy baja probabilidad'}
                  {callForm.rating === 2 && 'Baja probabilidad'}
                  {callForm.rating === 3 && 'Probabilidad media'}
                  {callForm.rating === 4 && 'Alta probabilidad'}
                  {callForm.rating === 5 && 'Totalmente listo para avanzar'}
                </p>
              </div>

              {/* Comentarios */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comentarios <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={callForm.notes}
                  onChange={(e) => setCallForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Escribe tus observaciones sobre la llamada (mínimo 20 palabras)..."
                  className={`w-full p-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 text-sm resize-none focus:outline-none ${
                    callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length < 20
                      ? 'border-slate-700 focus:border-amber-500/50'
                      : 'border-emerald-500/50 focus:border-emerald-500/70'
                  }`}
                  rows={4}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${
                    callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length >= 20 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length} / 20 palabras mínimo
                  </p>
                  {callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length >= 20 && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Botón para marcar como DROP */}
              {!showDropConfirm ? (
                <button
                  onClick={() => setShowDropConfirm(true)}
                  className="w-full p-3 rounded-xl flex items-center justify-center gap-2 bg-gray-800/50 text-gray-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30 border border-gray-700/50 transition-all text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  Abandonó el entrenamiento
                </button>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-3">
                  <p className="text-sm text-red-300 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ¿Confirmar que abandonó el entrenamiento?
                  </p>
                  <input
                    type="text"
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    placeholder="Razón (opcional)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowDropConfirm(false); setDropReason(''); }}
                      className="flex-1 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleMarkDrop}
                      disabled={markingDrop}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs"
                    >
                      {markingDrop ? 'Marcando...' : 'Confirmar DROP'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <Button
                onClick={() => { setShowCallModal(false); setShowDropConfirm(false); setDropReason(''); }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCallLog}
                disabled={
                  callForm.completed === null || 
                  savingCall || 
                  callForm.notes.trim().split(/\s+/).filter(w => w.length > 0).length < 20
                }
                className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCall ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendar Llamadas - Diseño Mejorado */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20 border border-purple-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-500/10 relative">
            {/* Header con gradiente */}
            <div className="p-5 border-b border-slate-800/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <CalendarPlus className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Agendar Llamadas</h3>
                    <p className="text-xs text-slate-400">Asigna horarios a tus participantes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Paso 1: Seleccionar participante */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span className="text-sm font-medium text-slate-300">Selecciona un participante</span>
                </div>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {allMembers.map((member) => {
                    const schedule = memberSchedules[member.user.id];
                    const isSelected = selectedMember?.user.id === member.user.id;
                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-lg shadow-purple-500/10'
                            : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {member.user.imagen ? (
                            <img 
                              src={member.user.imagen} 
                              alt={member.user.nombre}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-slate-700">
                              {member.user.nombre?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-sm font-medium text-white">{member.user.nombre}</span>
                        </div>
                        {schedule ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                            {formatTime(schedule)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                            Sin horario
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: Seleccionar horario */}
              {selectedMember && (
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <span className="text-sm font-medium text-slate-300">
                      Horario para <span className="text-purple-400 font-semibold">{selectedMember.user.nombre}</span>
                    </span>
                  </div>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8 bg-slate-800/30 rounded-xl">
                      <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-xs text-slate-400 mt-2">Cargando horarios...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No tienes horarios configurados</p>
                      <Link href="/dashboard/game-changer/calls">
                        <Button size="sm" className="mt-3 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30">
                          Configurar disponibilidad
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => {
                        const isCurrentUser = memberSchedules[selectedMember.user.id] === slot.time;
                        const isOccupied = slot.isOccupied && !isCurrentUser;
                        
                        return (
                          <button
                            key={slot.time}
                            onClick={() => !isOccupied && handleAssignSchedule(slot.time)}
                            disabled={isOccupied || assigningSchedule}
                            className={`p-2.5 rounded-xl text-center transition-all relative ${
                              isCurrentUser
                                ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                : isOccupied
                                ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800/50 text-white hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-500/30 border border-slate-700/50'
                            }`}
                          >
                            <p className={`text-sm font-mono font-medium ${isOccupied ? 'line-through' : ''}`}>
                              {formatTime(slot.time)}
                            </p>
                            {isOccupied && slot.participantName && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{slot.participantName}</p>
                            )}
                            {isCurrentUser && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
              <Button
                onClick={() => setShowScheduleModal(false)}
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800"
                disabled={assigningSchedule}
              >
                Cerrar
              </Button>
            </div>

            {/* Overlay de loading */}
            {assigningSchedule && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="animate-spin w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-white mt-3">Asignando horario...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Post Entreno */}
      {showPostEntrenoModal && squads.length > 0 && (
        <PostEntrenoScheduleModal
          isOpen={showPostEntrenoModal}
          onClose={() => setShowPostEntrenoModal(false)}
          squadId={squads[0]?.id}
          squadName={squads[0]?.name || 'Mi Átomo'}
          members={allMembers.map(m => ({
            odId: m.user.id,
            odName: m.user.nombre,
            odImage: m.user.imagen
          }))}
          onScheduled={() => {
            loadData(); // Recargar datos después de agendar
          }}
        />
      )}
    </Card>
  );
}
