'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, RefreshCw, Heart, Flame, Timer } from 'lucide-react';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  profileImage: string | null;
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

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export default function WidgetDisciplinaV2() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    cargarParticipantes();
    // Actualizar reloj cada segundo
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cargarParticipantes = async () => {
    try {
      const res = await fetch('/api/mentor/disciplina/participantes');
      const data = await res.json();
      
      if (data.success) {
        setParticipantes(data.participantes);
      }
    } catch (error) {
      console.error('Error cargando participantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarStrike = async (bookingId: number, participanteId: number) => {
    if (!confirm('¿Estás seguro de registrar una falta? Esto agregará un strike al estudiante.')) {
      return;
    }

    setProcesando(bookingId);

    try {
      const res = await fetch('/api/mentor/disciplina/strike', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (data.success) {
        if (data.suspended) {
          alert(`⚠️ ESTUDIANTE SUSPENDIDO\n\nEl estudiante ha alcanzado ${data.totalStrikes}/${data.maxStrikes} faltas.\nTodas sus sesiones futuras han sido canceladas.`);
        } else {
          alert(`Strike registrado. Total: ${data.totalStrikes}/${data.maxStrikes}`);
        }
        await cargarParticipantes();
      } else {
        alert(data.error || 'Error al registrar strike');
      }
    } catch (error) {
      console.error('Error registrando strike:', error);
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
      console.error('Error marcando asistencia:', error);
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
            {participantes.length} Total
          </span>
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
            const countdown = tieneLlamadaHoy ? calcularCountdown(participante.llamadaHoy!.scheduledAt) : null;
            const vidasRestantes = participante.enrollment.maxMissedAllowed - participante.enrollment.missedCallsCount;
            const enPeligro = vidasRestantes <= 1;

            return (
              <div 
                key={participante.id} 
                className={`p-4 transition-all ${
                  tieneLlamadaHoy 
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
                      <h4 className="font-bold text-gray-200 text-sm truncate">{participante.nombre}</h4>
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

                      {/* Próxima llamada */}
                      {tieneLlamadaHoy ? (
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
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => marcarAsistencia(participante.llamadaHoy!.id)}
                        disabled={procesando === participante.llamadaHoy!.id}
                        className="px-3 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1"
                        title="Confirmar Asistencia"
                      >
                        <CheckCircle size={14} />
                        Asistió
                      </button>
                      <button 
                        onClick={() => registrarStrike(participante.llamadaHoy!.id, participante.id)}
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
                    <div className={`text-xs font-bold px-3 py-2 rounded-full ${
                      participante.llamadaHoy!.attendanceStatus === 'PRESENT' 
                        ? 'text-green-500 bg-green-900/20 border border-green-500/30' 
                        : 'text-red-500 bg-red-900/20 border border-red-500/30'
                    }`}>
                      {participante.llamadaHoy!.attendanceStatus === 'PRESENT' ? '✓ ASISTIÓ' : '✗ FALTÓ'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
