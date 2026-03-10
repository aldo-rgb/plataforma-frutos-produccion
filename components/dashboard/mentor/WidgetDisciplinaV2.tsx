'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, RefreshCw, Heart, Flame, Timer, Shield, X, History, Calendar } from 'lucide-react';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  profileImage: string | null;
  rol: 'PARTICIPANTE' | 'GAMECHANGER';
  enrollment: {
    id: number;
    missedCallsCount: number;
    maxMissedAllowed: number;
    totalWeeks: number;
  };
  proximaLlamada: {
    id: number;
    scheduledAt: string;
    weekNumber: number;
    attendanceStatus: string;
    status: string;
  } | null;
  llamadaHoy: {
    id: number;
    scheduledAt: string;
    weekNumber: number;
    attendanceStatus: string;
    status: string;
  } | null;
}

interface LlamadaHistorial {
  id: number;
  scheduledAt: string;
  weekNumber: number;
  status: string;
  attendanceStatus: string;
  completedAt: string | null;
  notes: string | null;
}

interface HorarioReservado {
  dayOfWeek: number;
  dayName: string;
  time: string;
}

interface ProximaLlamadaHistorial {
  id: number;
  scheduledAt: string;
  weekNumber: number;
}

interface HistorialModal {
  show: boolean;
  participante: Participante | null;
  llamadas: LlamadaHistorial[];
  horariosReservados: HorarioReservado[];
  proximaLlamada: ProximaLlamadaHistorial | null;
  loading: boolean;
}

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

interface StrikeAlert {
  show: boolean;
  type: 'success' | 'suspended';
  totalStrikes: number;
  maxStrikes: number;
}

interface ConfirmModal {
  show: boolean;
  bookingId: number | null;
  participanteId: number | null;
  participanteNombre: string;
}

interface ChangeStatusModal {
  show: boolean;
  bookingId: number | null;
  participanteId: number | null;
  participanteNombre: string;
  currentStatus: 'PRESENT' | 'MISSED' | null;
}

export default function WidgetDisciplinaV2() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  const [strikeAlert, setStrikeAlert] = useState<StrikeAlert>({ show: false, type: 'success', totalStrikes: 0, maxStrikes: 3 });
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ show: false, bookingId: null, participanteId: null, participanteNombre: '' });
  const [changeStatusModal, setChangeStatusModal] = useState<ChangeStatusModal>({ show: false, bookingId: null, participanteId: null, participanteNombre: '', currentStatus: null });
  const [historialModal, setHistorialModal] = useState<HistorialModal>({ show: false, participante: null, llamadas: [], horariosReservados: [], proximaLlamada: null, loading: false });

  useEffect(() => {
    cargarParticipantes();
    // Actualizar reloj cada segundo
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const abrirHistorial = async (participante: Participante) => {
    setHistorialModal({ show: true, participante, llamadas: [], horariosReservados: [], proximaLlamada: null, loading: true });
    
    try {
      const res = await fetch(`/api/mentor/disciplina/historial?participanteId=${participante.id}`);
      const data = await res.json();
      
      if (data.success) {
        // Actualizar participante con datos frescos del enrollment
        const updatedParticipante: Participante = {
          ...participante,
          enrollment: {
            ...participante.enrollment,
            missedCallsCount: data.enrollment.missedCallsCount,
            maxMissedAllowed: data.enrollment.maxMissedAllowed,
            totalWeeks: data.enrollment.totalWeeks
          }
        };
        setHistorialModal(prev => ({ 
          ...prev, 
          participante: updatedParticipante,
          llamadas: data.llamadas,
          horariosReservados: data.horariosReservados || [],
          proximaLlamada: data.proximaLlamada || null,
          loading: false 
        }));
      } else {
        console.error('Error cargando historial:', data.error);
        setHistorialModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistorialModal(prev => ({ ...prev, loading: false }));
    }
  };

  const calificarLlamadaHistorial = async (bookingId: number, presente: boolean) => {
    setProcesando(bookingId);
    
    try {
      if (presente) {
        const res = await fetch('/api/mentor/disciplina/asistencia', {
          method: 'POST',
          body: JSON.stringify({ bookingId, present: true }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch('/api/mentor/disciplina/strike', {
          method: 'POST',
          body: JSON.stringify({ bookingId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        
        if (data.suspended) {
          setStrikeAlert({
            show: true,
            type: 'suspended',
            totalStrikes: data.totalStrikes,
            maxStrikes: data.maxStrikes
          });
        }
      }
      
      // Recargar historial y participantes
      if (historialModal.participante) {
        abrirHistorial(historialModal.participante);
      }
      await cargarParticipantes();
    } catch (error: any) {
      alert(error.message || 'Error al calificar llamada');
    } finally {
      setProcesando(null);
    }
  };

  const cargarParticipantes = async () => {
    try {
      const res = await fetch('/api/mentor/disciplina/participantes');
      const data = await res.json();
      
      console.log('📦 [Widget] Respuesta de API:', data);
      
      if (data.success) {
        console.log('✅ [Widget] Participantes recibidos:', data.participantes?.length || 0);
        setParticipantes(data.participantes || []);
      } else {
        console.log('❌ [Widget] Error en respuesta:', data.error);
      }
    } catch (error) {
      console.log('❌ [Widget] Error cargando participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarStrike = async (bookingId: number, participanteId: number) => {
    // Encontrar el nombre del participante
    const participante = participantes.find(p => p.id === participanteId);
    
    setConfirmModal({
      show: true,
      bookingId,
      participanteId,
      participanteNombre: participante?.nombre || 'el estudiante'
    });
  };

  const confirmarStrike = async () => {
    if (!confirmModal.bookingId) return;

    setProcesando(confirmModal.bookingId);
    setConfirmModal({ show: false, bookingId: null, participanteId: null, participanteNombre: '' });

    try {
      const res = await fetch('/api/mentor/disciplina/strike', {
        method: 'POST',
        body: JSON.stringify({ bookingId: confirmModal.bookingId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        setStrikeAlert({
          show: true,
          type: data.suspended ? 'suspended' : 'success',
          totalStrikes: data.totalStrikes,
          maxStrikes: data.maxStrikes
        });
        await cargarParticipantes();
      } else {
        alert(data.error || 'Error al registrar strike');
      }
    } catch (error) {
      console.log('Error registrando strike:', error);
      alert('Error al registrar strike. Intenta nuevamente.');
    } finally {
      setProcesando(null);
    }
  };

  const marcarAsistencia = async (bookingId: number) => {
    setProcesando(bookingId);

    try {
      const res = await fetch('/api/mentor/disciplina/asistencia', {
        method: 'POST',
        body: JSON.stringify({ bookingId, present: true }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        await cargarParticipantes();
      } else {
        alert(data.error || 'Error al marcar asistencia');
      }
    } catch (error) {
      console.log('Error marcando asistencia:', error);
      alert('Error al marcar asistencia. Intenta nuevamente.');
    } finally {
      setProcesando(null);
    }
  };

  const calcularCountdown = (scheduledAt: string): CountdownTime => {
    const target = new Date(scheduledAt);
    const diff = target.getTime() - now.getTime();
    
    if (diff < 0) {
      const pastDiff = Math.abs(diff);
      return {
        hours: Math.floor(pastDiff / (1000 * 60 * 60)),
        minutes: Math.floor((pastDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((pastDiff % (1000 * 60)) / 1000),
        isPast: true
      };
    }
    
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isPast: false
    };
  };

  // Ordenar participantes: primero los que tienen llamada hoy
  const participantesOrdenados = [...participantes].sort((a, b) => {
    if (a.llamadaHoy && !b.llamadaHoy) return -1;
    if (!a.llamadaHoy && b.llamadaHoy) return 1;
    if (a.llamadaHoy && b.llamadaHoy) {
      return new Date(a.llamadaHoy.scheduledAt).getTime() - new Date(b.llamadaHoy.scheduledAt).getTime();
    }
    return a.nombre.localeCompare(b.nombre);
  });

  if (loading) {
    return (
      <div className="bg-[#0f111a] border border-gray-800 rounded-xl h-96 animate-pulse">
        <div className="p-4 bg-[#151725] h-16"></div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 bg-[#151725] flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🔥 Llamadas de Disciplina
          </h3>
          <p className="text-xs text-gray-400">
            Gestión de ciclos y strikes • {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">
            {participantes.filter(p => p.llamadaHoy && p.llamadaHoy.attendanceStatus === 'PENDING').length} Hoy
          </span>
          <span className="bg-orange-900/30 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30">
            {participantes.filter(p => p.rol === 'PARTICIPANTE').length} Participantes
          </span>
          {participantes.filter(p => p.rol === 'GAMECHANGER').length > 0 && (
            <span className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/30">
              {participantes.filter(p => p.rol === 'GAMECHANGER').length} GameChangers
            </span>
          )}
          <button
            onClick={cargarParticipantes}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* LISTA DE PARTICIPANTES */}
      <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
        {participantesOrdenados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="mx-auto mb-2 opacity-50 w-12 h-12" />
            <p className="font-medium">Sin participantes asignados</p>
            <p className="text-sm">Los estudiantes en ciclos de llamadas aparecerán aquí.</p>
          </div>
        ) : (
          participantesOrdenados.map((participante) => {
            const tieneLlamadaHoy = participante.llamadaHoy !== null;
            const llamadaPendiente = tieneLlamadaHoy && participante.llamadaHoy!.attendanceStatus === 'PENDING';
            const countdown = llamadaPendiente ? calcularCountdown(participante.llamadaHoy!.scheduledAt) : null;
            const vidasRestantes = participante.enrollment.maxMissedAllowed - participante.enrollment.missedCallsCount;
            const enPeligro = vidasRestantes <= 1;

            return (
              <div 
                key={participante.id} 
                onClick={() => abrirHistorial(participante)}
                className={`p-4 transition-all cursor-pointer ${
                  llamadaPendiente 
                    ? countdown?.isPast 
                      ? 'bg-red-900/20 border-l-4 border-red-500' 
                      : 'bg-purple-900/10 border-l-4 border-purple-500' 
                    : 'hover:bg-[#1a1d2d]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  
                  {/* INFO PARTICIPANTE */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="relative">
                      {participante.profileImage ? (
                        <img 
                          src={participante.profileImage} 
                          alt={participante.nombre} 
                          className="w-12 h-12 rounded-full border-2 border-gray-600 object-cover" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {participante.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Indicador de peligro */}
                      {enPeligro && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-[#0f111a]">
                          <AlertTriangle size={12} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-200 text-sm truncate">{participante.nombre}</h4>
                        {participante.rol === 'GAMECHANGER' && (
                          <span className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/30 font-bold uppercase">
                            GameChanger
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{participante.email}</p>
                      
                      {/* Sistema de Vidas */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1" title={`${vidasRestantes} vidas restantes de ${participante.enrollment.maxMissedAllowed}`}>
                          {[...Array(participante.enrollment.maxMissedAllowed)].map((_, i) => (
                            <Heart 
                              key={i} 
                              size={14}
                              className={i < vidasRestantes ? 'text-red-500 fill-red-500' : 'text-gray-600'} 
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-bold ${enPeligro ? 'text-red-400' : 'text-gray-400'}`}>
                          {vidasRestantes}/{participante.enrollment.maxMissedAllowed}
                        </span>
                        
                        {/* Indicador de Strikes */}
                        {participante.enrollment.missedCallsCount > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            <XCircle size={10} />
                            {participante.enrollment.missedCallsCount} {participante.enrollment.missedCallsCount === 1 ? 'falta' : 'faltas'}
                          </span>
                        )}
                      </div>

                      {/* Próxima llamada - Solo mostrar countdown si está pendiente */}
                      {llamadaPendiente ? (
                        <div className="mt-2">
                          <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg ${
                            countdown?.isPast 
                              ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                              : 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                          }`}>
                            <Timer size={12} className={countdown?.isPast ? 'animate-pulse' : ''} />
                            {countdown?.isPast ? (
                              <span className="font-bold">RETRASADO: +{String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}</span>
                            ) : (
                              <>
                                <span className="font-bold">
                                  {String(countdown?.hours).padStart(2, '0')}:{String(countdown?.minutes).padStart(2, '0')}:{String(countdown?.seconds).padStart(2, '0')}
                                </span>
                                <span>• {new Date(participante.llamadaHoy!.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                            <span>• Sem {participante.llamadaHoy!.weekNumber}</span>
                          </div>
                        </div>
                      ) : tieneLlamadaHoy && participante.llamadaHoy!.attendanceStatus === 'ATTENDED' ? (
                        <div className="mt-2 text-xs text-green-400 flex items-center gap-1 bg-green-900/20 px-2 py-1 rounded-lg border border-green-500/30">
                          <CheckCircle size={10} />
                          Asistió a las {new Date(participante.llamadaHoy!.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • Sem {participante.llamadaHoy!.weekNumber}
                        </div>
                      ) : participante.proximaLlamada ? (
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={10} />
                          Próxima: {new Date(participante.proximaLlamada.scheduledAt).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(participante.proximaLlamada.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500">
                          Sin llamadas programadas
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACCIONES */}
                  {tieneLlamadaHoy && participante.llamadaHoy!.attendanceStatus === 'PENDING' && (
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); marcarAsistencia(participante.llamadaHoy!.id); }}
                        disabled={procesando === participante.llamadaHoy!.id}
                        className="px-3 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1"
                        title="Confirmar Asistencia"
                      >
                        <CheckCircle size={14} />
                        Asistió
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); registrarStrike(participante.llamadaHoy!.id, participante.id); }}
                        disabled={procesando === participante.llamadaHoy!.id}
                        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1"
                        title="Registrar Falta (Strike)"
                      >
                        <XCircle size={14} />
                        Faltó
                      </button>
                    </div>
                  )}
                  
                  {tieneLlamadaHoy && participante.llamadaHoy!.attendanceStatus !== 'PENDING' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentStatus = participante.llamadaHoy!.attendanceStatus;
                        setChangeStatusModal({
                          show: true,
                          bookingId: participante.llamadaHoy!.id,
                          participanteId: participante.id,
                          participanteNombre: participante.nombre,
                          currentStatus: currentStatus as 'PRESENT' | 'MISSED'
                        });
                      }}
                      disabled={procesando === participante.llamadaHoy!.id}
                      className={`text-xs font-bold px-3 py-2 rounded-full cursor-pointer transition-all hover:scale-105 disabled:opacity-50 ${
                        participante.llamadaHoy!.attendanceStatus === 'PRESENT' 
                          ? 'text-green-500 bg-green-900/20 border border-green-500/30 hover:bg-green-900/40' 
                          : 'text-red-500 bg-red-900/20 border border-red-500/30 hover:bg-red-900/40'
                      }`}
                      title="Click para cambiar"
                    >
                      {participante.llamadaHoy!.attendanceStatus === 'PRESENT' ? '✓ ASISTIÓ' : '✗ FALTÓ'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE ALERTA DE STRIKE */}
      {strikeAlert.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`bg-gradient-to-br ${
            strikeAlert.type === 'suspended' 
              ? 'from-red-900/95 to-red-950/95' 
              : 'from-orange-900/95 to-orange-950/95'
          } border-2 ${
            strikeAlert.type === 'suspended' 
              ? 'border-red-500/50' 
              : 'border-orange-500/50'
          } rounded-2xl max-w-md w-full shadow-2xl transform animate-in zoom-in-95 duration-200`}>
            
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${
                    strikeAlert.type === 'suspended' 
                      ? 'bg-red-500/20 border-2 border-red-500' 
                      : 'bg-orange-500/20 border-2 border-orange-500'
                  } flex items-center justify-center`}>
                    {strikeAlert.type === 'suspended' ? (
                      <Shield className="w-6 h-6 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {strikeAlert.type === 'suspended' ? '⚠️ Estudiante Suspendido' : 'Strike Registrado'}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1">
                      {strikeAlert.type === 'suspended' 
                        ? 'Límite de faltas alcanzado' 
                        : 'Falta registrada correctamente'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStrikeAlert({ ...strikeAlert, show: false })}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Contador de Strikes */}
              <div className={`p-4 rounded-xl ${
                strikeAlert.type === 'suspended' 
                  ? 'bg-red-950/50 border border-red-500/30' 
                  : 'bg-orange-950/50 border border-orange-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-300 font-medium">Estado de Faltas</span>
                  <div className="flex gap-1">
                    {[...Array(strikeAlert.maxStrikes)].map((_, i) => (
                      <XCircle 
                        key={i}
                        size={20}
                        className={i < strikeAlert.totalStrikes 
                          ? strikeAlert.type === 'suspended' ? 'text-red-500 fill-red-500' : 'text-orange-500 fill-orange-500'
                          : 'text-gray-600'
                        } 
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-white mb-1">
                    {strikeAlert.totalStrikes}/{strikeAlert.maxStrikes}
                  </p>
                  <p className="text-xs text-gray-400">
                    {strikeAlert.type === 'suspended' 
                      ? 'Faltas máximas alcanzadas' 
                      : `${strikeAlert.maxStrikes - strikeAlert.totalStrikes} ${strikeAlert.maxStrikes - strikeAlert.totalStrikes === 1 ? 'falta restante' : 'faltas restantes'}`
                    }
                  </p>
                </div>
              </div>

              {/* Mensaje */}
              <div className={`p-4 rounded-xl ${
                strikeAlert.type === 'suspended' 
                  ? 'bg-red-500/10 border border-red-500/30' 
                  : 'bg-orange-500/10 border border-orange-500/30'
              }`}>
                {strikeAlert.type === 'suspended' ? (
                  <div className="space-y-2">
                    <p className="text-white font-bold flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      Consecuencias de la Suspensión:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-6">
                      <li>• Todas las sesiones futuras han sido canceladas</li>
                      <li>• El estudiante está suspendido del programa</li>
                      <li>• Se requiere intervención administrativa</li>
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300">
                    El strike ha sido registrado en el historial del estudiante. El estudiante ha sido notificado automáticamente.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => setStrikeAlert({ ...strikeAlert, show: false })}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  strikeAlert.type === 'suspended'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-orange-600 hover:bg-orange-500'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE STRIKE */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#1a1d2d] to-[#0f111a] border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/30">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    Registrar Falta
                  </h3>
                  <p className="text-sm text-gray-400">
                    Esta acción agregará un strike al estudiante
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-white font-medium mb-2">
                  ¿Estás seguro de registrar una falta para{' '}
                  <span className="text-red-400 font-bold">{confirmModal.participanteNombre}</span>?
                </p>
                <p className="text-sm text-gray-400">
                  Este strike quedará registrado permanentemente en el historial del estudiante y podría resultar en su suspensión del programa si alcanza el límite máximo.
                </p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                <p className="text-sm text-orange-300 font-medium flex items-center gap-2">
                  <Flame size={16} />
                  Consecuencias:
                </p>
                <ul className="text-xs text-gray-400 space-y-1 mt-2 ml-6">
                  <li>• El estudiante será notificado automáticamente</li>
                  <li>• Se incrementará su contador de faltas</li>
                  <li>• Puede resultar en suspensión si alcanza el máximo</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, bookingId: null, participanteId: null, participanteNombre: '' })}
                className="flex-1 py-3 rounded-xl font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarStrike}
                disabled={procesando !== null}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
              >
                {procesando !== null ? 'Registrando...' : 'Confirmar Strike'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CAMBIO DE ASISTENCIA */}
      {changeStatusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`bg-gradient-to-br from-[#1a1d2d] to-[#0f111a] border ${
            changeStatusModal.currentStatus === 'PRESENT' 
              ? 'border-red-500/30' 
              : 'border-green-500/30'
          } rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200`}>
            {/* Header */}
            <div className={`p-6 ${
              changeStatusModal.currentStatus === 'PRESENT'
                ? 'bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/30'
                : 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-green-500/30'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border ${
                  changeStatusModal.currentStatus === 'PRESENT'
                    ? 'bg-red-500/20 border-red-500/30'
                    : 'bg-green-500/20 border-green-500/30'
                }`}>
                  {changeStatusModal.currentStatus === 'PRESENT' ? (
                    <XCircle className="w-6 h-6 text-red-400" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {changeStatusModal.currentStatus === 'PRESENT' 
                      ? 'Cambiar a Faltó' 
                      : 'Cambiar a Asistió'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {changeStatusModal.currentStatus === 'PRESENT'
                      ? 'Esta acción registrará un strike'
                      : 'Esta acción revertirá el strike'}
                  </p>
                </div>
                <button
                  onClick={() => setChangeStatusModal({ show: false, bookingId: null, participanteId: null, participanteNombre: '', currentStatus: null })}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className={`rounded-xl p-4 ${
                changeStatusModal.currentStatus === 'PRESENT'
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-green-500/10 border border-green-500/30'
              }`}>
                <p className="text-white font-medium mb-2">
                  ¿Cambiar el estado de asistencia de{' '}
                  <span className={`font-bold ${
                    changeStatusModal.currentStatus === 'PRESENT' ? 'text-red-400' : 'text-green-400'
                  }`}>{changeStatusModal.participanteNombre}</span>?
                </p>
                <p className="text-sm text-gray-400">
                  {changeStatusModal.currentStatus === 'PRESENT'
                    ? 'El estudiante pasará de "Asistió" a "Faltó" y se le agregará un strike a su historial.'
                    : 'El estudiante pasará de "Faltó" a "Asistió" y se le revertirá el strike de su historial.'}
                </p>
              </div>

              <div className={`rounded-xl p-4 ${
                changeStatusModal.currentStatus === 'PRESENT'
                  ? 'bg-orange-500/10 border border-orange-500/30'
                  : 'bg-emerald-500/10 border border-emerald-500/30'
              }`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${
                  changeStatusModal.currentStatus === 'PRESENT' ? 'text-orange-300' : 'text-emerald-300'
                }`}>
                  {changeStatusModal.currentStatus === 'PRESENT' ? (
                    <>
                      <AlertTriangle size={16} />
                      Consecuencias:
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Resultado:
                    </>
                  )}
                </p>
                <ul className="text-xs text-gray-400 space-y-1 mt-2 ml-6">
                  {changeStatusModal.currentStatus === 'PRESENT' ? (
                    <>
                      <li>• Se registrará un strike al estudiante</li>
                      <li>• Se incrementará su contador de faltas</li>
                      <li>• Puede resultar en suspensión</li>
                    </>
                  ) : (
                    <>
                      <li>• Se eliminará el strike del estudiante</li>
                      <li>• Se reducirá su contador de faltas</li>
                      <li>• Se registrará la comisión de la llamada</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setChangeStatusModal({ show: false, bookingId: null, participanteId: null, participanteNombre: '', currentStatus: null })}
                className="flex-1 py-3 rounded-xl font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (changeStatusModal.currentStatus === 'PRESENT') {
                    registrarStrike(changeStatusModal.bookingId!, changeStatusModal.participanteId!);
                  } else {
                    marcarAsistencia(changeStatusModal.bookingId!);
                  }
                  setChangeStatusModal({ show: false, bookingId: null, participanteId: null, participanteNombre: '', currentStatus: null });
                }}
                disabled={procesando !== null}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  changeStatusModal.currentStatus === 'PRESENT'
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-500/20'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-500/20'
                }`}
              >
                {procesando !== null 
                  ? 'Procesando...' 
                  : changeStatusModal.currentStatus === 'PRESENT' 
                    ? 'Confirmar Falta' 
                    : 'Confirmar Asistencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL DE LLAMADAS */}
      {historialModal.show && historialModal.participante && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl max-h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#151725] rounded-t-2xl">
              <div className="flex items-center gap-3">
                {historialModal.participante.profileImage ? (
                  <img 
                    src={historialModal.participante.profileImage} 
                    alt={historialModal.participante.nombre} 
                    className="w-10 h-10 rounded-full border-2 border-purple-500 object-cover" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {historialModal.participante.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-white font-bold">{historialModal.participante.nombre}</h3>
                  <p className="text-xs text-gray-400">{historialModal.participante.email}</p>
                </div>
              </div>
              <button
                onClick={() => setHistorialModal({ show: false, participante: null, llamadas: [], horariosReservados: [], proximaLlamada: null, loading: false })}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Strikes Info */}
            <div className="px-4 py-3 bg-[#1a1d2d] border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Vidas restantes:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: historialModal.participante.enrollment.maxMissedAllowed }).map((_, i) => (
                      <Heart 
                        key={i} 
                        size={16} 
                        className={i < (historialModal.participante!.enrollment.maxMissedAllowed - historialModal.participante!.enrollment.missedCallsCount)
                          ? 'text-red-500 fill-red-500' 
                          : 'text-gray-600'
                        } 
                      />
                    ))}
                  </div>
                  <span className="text-gray-500 text-xs">
                    ({historialModal.participante.enrollment.maxMissedAllowed - historialModal.participante.enrollment.missedCallsCount}/{historialModal.participante.enrollment.maxMissedAllowed})
                  </span>
                </div>
                <span className="text-purple-400 text-xs font-medium">
                  {/* Mostrar semanas únicas basado en las llamadas */}
                  {(() => {
                    const numSemanas = historialModal.llamadas.length > 0 
                      ? [...new Set(historialModal.llamadas.map(l => l.weekNumber))].length 
                      : historialModal.participante!.enrollment.totalWeeks;
                    return `${numSemanas} semana${numSemanas !== 1 ? 's' : ''} totales`;
                  })()}
                </span>
              </div>
            </div>
            
            {/* Próxima Llamada y Horarios Reservados */}
            <div className="px-4 py-3 bg-[#151725] border-b border-gray-800 space-y-3">
              {/* Próxima Llamada */}
              {historialModal.proximaLlamada ? (
                <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 font-medium">Próxima llamada</p>
                    <p className="text-white font-bold">
                      {new Date(historialModal.proximaLlamada.scheduledAt).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                      {' • '}
                      {new Date(historialModal.proximaLlamada.scheduledAt).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <p className="text-xs text-gray-400">Semana {historialModal.proximaLlamada.weekNumber}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                    <Clock size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Próxima llamada</p>
                    <p className="text-gray-400">Sin llamadas programadas</p>
                  </div>
                </div>
              )}
              
              {/* Horarios Reservados */}
              {historialModal.horariosReservados.length > 0 && (
                <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl">
                  <p className="text-xs text-purple-300 font-medium mb-2 flex items-center gap-2">
                    <Calendar size={14} />
                    Horarios reservados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {historialModal.horariosReservados.map((horario, idx) => (
                      <span 
                        key={idx}
                        className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30"
                      >
                        {horario.dayName} {horario.time}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Llamadas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-3">
                <History size={16} />
                Historial de Llamadas
              </h4>

              {historialModal.loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Cargando historial...</p>
                </div>
              ) : historialModal.llamadas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin llamadas programadas</p>
                </div>
              ) : (
                historialModal.llamadas.map((llamada) => {
                  const fecha = new Date(llamada.scheduledAt);
                  const esPasada = fecha < new Date();
                  const pendiente = llamada.attendanceStatus === 'PENDING';
                  const asistio = llamada.attendanceStatus === 'PRESENT' || llamada.attendanceStatus === 'ATTENDED';
                  const falto = llamada.attendanceStatus === 'MISSED' || llamada.attendanceStatus === 'ABSENT';

                  return (
                    <div 
                      key={llamada.id}
                      className={`p-3 rounded-xl border ${
                        asistio 
                          ? 'bg-green-900/10 border-green-500/30' 
                          : falto 
                            ? 'bg-red-900/10 border-red-500/30'
                            : pendiente && esPasada
                              ? 'bg-orange-900/10 border-orange-500/30'
                              : 'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">
                              Semana {llamada.weekNumber}
                            </span>
                            {asistio && (
                              <span className="text-green-400 text-xs bg-green-500/20 px-2 py-0.5 rounded-full">
                                ✓ Asistió
                              </span>
                            )}
                            {falto && (
                              <span className="text-red-400 text-xs bg-red-500/20 px-2 py-0.5 rounded-full">
                                ✗ Faltó
                              </span>
                            )}
                            {pendiente && !esPasada && (
                              <span className="text-blue-400 text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">
                                Programada
                              </span>
                            )}
                            {pendiente && esPasada && (
                              <span className="text-orange-400 text-xs bg-orange-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                Sin calificar
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • {fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Botones de calificación para llamadas pasadas sin calificar */}
                        {pendiente && esPasada && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                calificarLlamadaHistorial(llamada.id, true);
                              }}
                              disabled={procesando === llamada.id}
                              className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/30 disabled:opacity-50"
                              title="Marcar como Asistió"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                calificarLlamadaHistorial(llamada.id, false);
                              }}
                              disabled={procesando === llamada.id}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/30 disabled:opacity-50"
                              title="Marcar como Faltó"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#151725] rounded-b-2xl">
              <button
                onClick={() => setHistorialModal({ show: false, participante: null, llamadas: [], horariosReservados: [], proximaLlamada: null, loading: false })}
                className="w-full py-2 rounded-xl font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
