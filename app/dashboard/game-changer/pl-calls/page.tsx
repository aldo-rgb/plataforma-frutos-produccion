'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Users,
  Calendar,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Loader2,
  ArrowLeft,
  CalendarPlus,
  UserCheck,
  UserX,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Flag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ===== INTERFACES =====
interface PLCall {
  id: string;
  visionId: number;
  squadId: string | null;
  callType: 'ATOM' | 'GROUP';
  weekNumber: number;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  generalNotes: string | null;
  completedAt: string | null;
  vision: { id: number; nombre: string };
  squad: { id: string; name: string } | null;
  scheduledBy: { id: number; nombre: string };
  attendances: PLAttendance[];
}

interface PLAttendance {
  id: string;
  participantId: number;
  attended: boolean | null;
  rating: number | null;
  notes: string | null;
  isAtRisk: boolean;
  riskNotes: string | null;
  participant: {
    id: number;
    nombre: string;
    email: string;
    image: string | null;
    telefono: string | null;
  };
}

interface PLStats {
  vision: { id: number; nombre: string };
  currentWeek: number;
  atomStats: {
    squadId: string;
    squadName: string;
    memberCount: number;
    totalCalls: number;
    completedCalls: number;
    scheduledCalls: number;
    overallAttendanceRate: number;
    callsByWeek: Array<{
      week: number;
      hasCall: boolean;
      status: string | null;
      scheduledDate: string | null;
      scheduledTime: string | null;
    }>;
  } | null;
  groupStats: {
    totalCalls: number;
    completedCalls: number;
    scheduledCalls: number;
    totalPLParticipants: number;
    overallAttendanceRate: number;
    callsByWeek: Array<{
      week: number;
      hasCall: boolean;
      status: string | null;
    }>;
  };
  atRiskParticipants: Array<{
    id: number;
    nombre: string;
    email: string;
    lastRiskWeek: number;
    riskNotes: string | null;
  }>;
}

interface SquadInfo {
  id: string;
  name: string;
  visionId: number;
  level: string;
  members: Array<{
    userId: number;
    user: {
      id: number;
      nombre: string;
      email: string;
      image: string | null;
      telefono: string | null;
    };
  }>;
}

// ===== COMPONENTE PRINCIPAL =====
export default function PLCallsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PLStats | null>(null);
  const [calls, setCalls] = useState<PLCall[]>([]);
  const [squad, setSquad] = useState<SquadInfo | null>(null);
  const [visionId, setVisionId] = useState<number | null>(null);

  // Estados de modales
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [showCallDetailModal, setShowCallDetailModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<PLCall | null>(null);

  // Estados del formulario nueva llamada
  const [newCallForm, setNewCallForm] = useState({
    weekNumber: 1,
    scheduledDate: '',
    scheduledTime: '10:00',
    duration: 30
  });
  const [creatingCall, setCreatingCall] = useState(false);

  // Estados para registro de asistencia
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState<Record<number, {
    attended: boolean | null;
    rating: number | null;
    notes: string;
    isAtRisk: boolean;
    riskNotes: string;
  }>>({});

  // Estado para acción en llamada
  const [processingAction, setProcessingAction] = useState(false);

  // ===== EFECTOS =====
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchPLData();
    }
  }, [session]);

  // ===== FUNCIONES DE FETCH =====
  const fetchPLData = async () => {
    try {
      setLoading(true);

      // 1. Obtener el squad PL del GC
      const squadRes = await fetch('/api/gc-calls/my-stats');
      const squadData = await squadRes.json();

      if (!squadData.success) {
        setLoading(false);
        return;
      }

      // Buscar squad PL en los datos
      const squadsRes = await fetch('/api/game-changer/squads');
      const squadsData = await squadsRes.json();

      const plSquad = squadsData.squads?.find((s: any) => s.level === 'PL');

      if (!plSquad) {
        setLoading(false);
        return;
      }

      setSquad(plSquad);
      setVisionId(plSquad.visionId);

      // 2. Obtener estadísticas PL
      const statsRes = await fetch(`/api/pl-calls/stats?visionId=${plSquad.visionId}`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // 3. Obtener llamadas PL del squad
      const callsRes = await fetch(`/api/pl-calls?visionId=${plSquad.visionId}&squadId=${plSquad.id}`);
      const callsData = await callsRes.json();
      setCalls(callsData.calls || []);

      // Establecer semana por defecto para nueva llamada
      if (statsData.currentWeek) {
        setNewCallForm(prev => ({ ...prev, weekNumber: statsData.currentWeek + 1 }));
      }

    } catch (error) {
      console.error('Error fetching PL data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNCIONES DE LLAMADAS =====
  const createNewCall = async () => {
    if (!squad || !visionId) return;

    try {
      setCreatingCall(true);

      const res = await fetch('/api/pl-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId,
          squadId: squad.id,
          callType: 'ATOM',
          weekNumber: newCallForm.weekNumber,
          scheduledDate: newCallForm.scheduledDate,
          scheduledTime: newCallForm.scheduledTime,
          duration: newCallForm.duration
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowNewCallModal(false);
        fetchPLData();
        setNewCallForm({
          weekNumber: (stats?.currentWeek || 0) + 1,
          scheduledDate: '',
          scheduledTime: '10:00',
          duration: 30
        });
      } else {
        alert(data.error || 'Error al crear la llamada');
      }
    } catch (error) {
      console.error('Error creating call:', error);
      alert('Error al crear la llamada');
    } finally {
      setCreatingCall(false);
    }
  };

  const updateCallStatus = async (callId: string, action: string, extras?: any) => {
    try {
      setProcessingAction(true);

      const res = await fetch(`/api/pl-calls/${callId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extras })
      });

      if (res.ok) {
        fetchPLData();
        if (selectedCall?.id === callId) {
          const updatedCall = await res.json();
          setSelectedCall(updatedCall.call);
        }
      }
    } catch (error) {
      console.error('Error updating call:', error);
    } finally {
      setProcessingAction(false);
    }
  };

  const saveAttendance = async () => {
    if (!selectedCall) return;

    try {
      setSavingAttendance(true);

      const attendances = Object.entries(attendanceChanges).map(([participantId, data]) => ({
        participantId: parseInt(participantId),
        ...data
      }));

      const res = await fetch(`/api/pl-calls/${selectedCall.id}/attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances })
      });

      if (res.ok) {
        fetchPLData();
        setShowCallDetailModal(false);
        setAttendanceChanges({});
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSavingAttendance(false);
    }
  };

  const openCallDetail = (call: PLCall) => {
    setSelectedCall(call);
    // Inicializar cambios de asistencia con valores actuales
    const initialChanges: Record<number, any> = {};
    call.attendances.forEach(att => {
      initialChanges[att.participantId] = {
        attended: att.attended,
        rating: att.rating,
        notes: att.notes || '',
        isAtRisk: att.isAtRisk,
        riskNotes: att.riskNotes || ''
      };
    });
    setAttendanceChanges(initialChanges);
    setShowCallDetailModal(true);
  };

  // ===== RENDER HELPERS =====
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      SCHEDULED: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Calendar, label: 'Programada' },
      IN_PROGRESS: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: PhoneCall, label: 'En Progreso' },
      COMPLETED: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2, label: 'Completada' },
      CANCELLED: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: X, label: 'Cancelada' },
      NO_SHOW: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: UserX, label: 'No se presentaron' }
    };
    const config = configs[status] || configs.SCHEDULED;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-yellow-950/20 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  // ===== NO PL SQUAD =====
  if (!squad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-yellow-950/20 to-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard/game-changer" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>

          <Card className="bg-slate-900/50 border-yellow-500/30">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-yellow-500/50 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No tienes un átomo de Liderato</h2>
              <p className="text-slate-400 mb-6">
                Para gestionar llamadas PL, primero necesitas ser asignado como Game Changer de un grupo de Liderato.
              </p>
              <Link href="/dashboard/game-changer/squads?level=PL">
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Átomo PL
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-yellow-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard/game-changer" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Phone className="text-yellow-400" />
              Llamadas de Liderato
            </h1>
            <p className="text-yellow-400/80 mt-1">
              Átomo: {squad.name} • {stats?.vision?.nombre}
            </p>
          </div>

          <Button
            onClick={() => setShowNewCallModal(true)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Agendar Llamada
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Semana Actual</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats?.currentWeek || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Llamadas Completadas</p>
                  <p className="text-3xl font-bold text-green-400">
                    {stats?.atomStats?.completedCalls || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Miembros del Átomo</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {stats?.atomStats?.memberCount || squad.members?.length || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Tasa de Asistencia</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {stats?.atomStats?.overallAttendanceRate || 0}%
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* At Risk Participants */}
        {stats?.atRiskParticipants && stats.atRiskParticipants.length > 0 && (
          <Card className="bg-red-900/20 border-red-500/30 mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Participantes en Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.atRiskParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-red-500/20">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                      {p.nombre.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{p.nombre}</p>
                      <p className="text-xs text-red-400">Semana {p.lastRiskWeek}</p>
                    </div>
                    <Flag className="w-4 h-4 text-red-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Progress */}
        <Card className="bg-slate-900/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Progreso por Semana</CardTitle>
            <CardDescription>Llamadas programadas y completadas de tu átomo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(week => {
                const weekData = stats?.atomStats?.callsByWeek?.find(w => w.week === week);
                const hasCall = weekData?.hasCall;
                const status = weekData?.status;
                const isCurrentWeek = week === stats?.currentWeek;
                const isPastWeek = week < (stats?.currentWeek || 0);

                let bgColor = 'bg-slate-800';
                let borderColor = 'border-slate-700';
                let textColor = 'text-slate-500';

                if (isCurrentWeek) {
                  borderColor = 'border-yellow-500';
                  bgColor = 'bg-yellow-500/10';
                }

                if (status === 'COMPLETED') {
                  bgColor = 'bg-green-500/20';
                  borderColor = 'border-green-500/50';
                  textColor = 'text-green-400';
                } else if (status === 'SCHEDULED') {
                  bgColor = 'bg-blue-500/20';
                  borderColor = 'border-blue-500/50';
                  textColor = 'text-blue-400';
                } else if (isPastWeek && !hasCall) {
                  bgColor = 'bg-red-500/10';
                  borderColor = 'border-red-500/30';
                  textColor = 'text-red-400';
                }

                return (
                  <div
                    key={week}
                    className={`${bgColor} ${borderColor} border rounded-lg p-3 text-center transition-all hover:scale-105`}
                  >
                    <p className="text-xs text-slate-400 mb-1">Sem</p>
                    <p className={`text-lg font-bold ${textColor}`}>{week}</p>
                    {status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mt-1" />}
                    {status === 'SCHEDULED' && <Calendar className="w-4 h-4 text-blue-400 mx-auto mt-1" />}
                    {isPastWeek && !hasCall && <X className="w-4 h-4 text-red-400 mx-auto mt-1" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Calls List */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-yellow-400" />
              Mis Llamadas PL
            </CardTitle>
            <CardDescription>Historial y próximas llamadas de tu átomo</CardDescription>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No tienes llamadas registradas aún</p>
                <Button onClick={() => setShowNewCallModal(true)} className="bg-yellow-600 hover:bg-yellow-700">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Agendar Primera Llamada
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {calls.map(call => (
                  <div
                    key={call.id}
                    onClick={() => openCallDetail(call)}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-yellow-500/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-yellow-400">{call.weekNumber}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Semana {call.weekNumber}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(call.scheduledDate).toLocaleDateString('es-MX', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })} • {call.scheduledTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">
                          {call.attendances.filter(a => a.attended).length}/{call.attendances.length} asistieron
                        </p>
                      </div>
                      {getStatusBadge(call.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== MODAL: Nueva Llamada ===== */}
      {showNewCallModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-yellow-500/30 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarPlus className="text-yellow-400" />
                Agendar Llamada PL
              </h3>
              <button onClick={() => setShowNewCallModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Semana</label>
                <select
                  value={newCallForm.weekNumber}
                  onChange={(e) => setNewCallForm(prev => ({ ...prev, weekNumber: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(week => (
                    <option key={week} value={week}>
                      Semana {week} {week === stats?.currentWeek ? '(Actual)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Fecha</label>
                <input
                  type="date"
                  value={newCallForm.scheduledDate}
                  onChange={(e) => setNewCallForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Hora</label>
                <input
                  type="time"
                  value={newCallForm.scheduledTime}
                  onChange={(e) => setNewCallForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Duración (minutos)</label>
                <select
                  value={newCallForm.duration}
                  onChange={(e) => setNewCallForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowNewCallModal(false)}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                Cancelar
              </Button>
              <Button
                onClick={createNewCall}
                disabled={creatingCall || !newCallForm.scheduledDate}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {creatingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agendar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Detalle de Llamada ===== */}
      {showCallDetailModal && selectedCall && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl border border-yellow-500/30 max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Phone className="text-yellow-400" />
                  Llamada Semana {selectedCall.weekNumber}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {new Date(selectedCall.scheduledDate).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })} • {selectedCall.scheduledTime}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedCall.status)}
                <button onClick={() => setShowCallDetailModal(false)} className="text-slate-400 hover:text-white ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Acciones de estado */}
            {selectedCall.status === 'SCHEDULED' && (
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={() => updateCallStatus(selectedCall.id, 'start')}
                  disabled={processingAction}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Iniciar Llamada
                </Button>
                <Button
                  onClick={() => updateCallStatus(selectedCall.id, 'cancel', { cancelReason: 'Cancelada por el GC' })}
                  disabled={processingAction}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            )}

            {selectedCall.status === 'IN_PROGRESS' && (
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={() => updateCallStatus(selectedCall.id, 'complete')}
                  disabled={processingAction}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Completar Llamada
                </Button>
                <Button
                  onClick={() => updateCallStatus(selectedCall.id, 'no_show')}
                  disabled={processingAction}
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Nadie se presentó
                </Button>
              </div>
            )}

            {/* Lista de asistencia */}
            <div className="space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-400" />
                Registro de Asistencia ({selectedCall.attendances.length} participantes)
              </h4>

              {selectedCall.attendances.map(att => {
                const changes = attendanceChanges[att.participantId] || {
                  attended: att.attended,
                  rating: att.rating,
                  notes: att.notes || '',
                  isAtRisk: att.isAtRisk,
                  riskNotes: att.riskNotes || ''
                };

                return (
                  <div key={att.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {att.participant.image ? (
                          <img
                            src={att.participant.image}
                            alt={att.participant.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold">
                            {att.participant.nombre.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{att.participant.nombre}</p>
                          <p className="text-xs text-slate-400">{att.participant.telefono || 'Sin teléfono'}</p>
                        </div>
                      </div>

                      {/* Botones de asistencia */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAttendanceChanges(prev => ({
                            ...prev,
                            [att.participantId]: { ...changes, attended: true }
                          }))}
                          className={`p-2 rounded-lg transition-all ${
                            changes.attended === true
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-green-500/20'
                          }`}
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setAttendanceChanges(prev => ({
                            ...prev,
                            [att.participantId]: { ...changes, attended: false }
                          }))}
                          className={`p-2 rounded-lg transition-all ${
                            changes.attended === false
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-red-500/20'
                          }`}
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Rating y notas (solo si asistió) */}
                    {changes.attended === true && (
                      <div className="space-y-3 mt-3 pt-3 border-t border-slate-700">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Rating</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => setAttendanceChanges(prev => ({
                                  ...prev,
                                  [att.participantId]: { ...changes, rating: star }
                                }))}
                                className={`p-1 ${
                                  (changes.rating || 0) >= star ? 'text-yellow-400' : 'text-slate-600'
                                }`}
                              >
                                <Star className="w-5 h-5 fill-current" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Notas</label>
                          <textarea
                            value={changes.notes}
                            onChange={(e) => setAttendanceChanges(prev => ({
                              ...prev,
                              [att.participantId]: { ...changes, notes: e.target.value }
                            }))}
                            placeholder="Observaciones de la llamada..."
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500 resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Marcar en riesgo */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAttendanceChanges(prev => ({
                              ...prev,
                              [att.participantId]: { ...changes, isAtRisk: !changes.isAtRisk }
                            }))}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                              changes.isAtRisk
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-slate-700 text-slate-400 hover:bg-red-500/10'
                            }`}
                          >
                            <Flag className="w-4 h-4" />
                            {changes.isAtRisk ? 'En Riesgo' : 'Marcar en Riesgo'}
                          </button>
                        </div>

                        {changes.isAtRisk && (
                          <div>
                            <label className="block text-xs text-red-400 mb-1">Razón del riesgo</label>
                            <input
                              type="text"
                              value={changes.riskNotes}
                              onChange={(e) => setAttendanceChanges(prev => ({
                                ...prev,
                                [att.participantId]: { ...changes, riskNotes: e.target.value }
                              }))}
                              placeholder="¿Por qué está en riesgo?"
                              className="w-full px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-red-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón guardar */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCallDetailModal(false)}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                Cerrar
              </Button>
              <Button
                onClick={saveAttendance}
                disabled={savingAttendance}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {savingAttendance ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Guardar Asistencia
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
