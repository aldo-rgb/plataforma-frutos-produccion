'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, Loader2, PhoneOff, Zap } from 'lucide-react';

interface MentorAsignado {
  id: number;
  nombre: string;
  profileImage?: string;
  imagen?: string;
  email: string;
}

interface Slot {
  dayOfWeek: number;
  time: string;
}

interface DisponibilidadMentor {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface SlotsDisponibles {
  [key: number]: string[];
}

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ProgramEnrollPage() {
  const [mentorAsignado, setMentorAsignado] = useState<MentorAsignado | null>(null);
  const [disponibilidadMentor, setDisponibilidadMentor] = useState<DisponibilidadMentor[]>([]);
  const [slotsDisponibles, setSlotsDisponibles] = useState<SlotsDisponibles>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slots seleccionados
  const [slot1, setSlot1] = useState<Slot>({ dayOfWeek: -1, time: '' });
  const [slot2, setSlot2] = useState<Slot>({ dayOfWeek: -1, time: '' });

  useEffect(() => {
    cargarMentorAsignado();
  }, []);

  const cargarMentorAsignado = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Error al cargar perfil');
      
      const data = await response.json();
      
      // Verificar que tenga mentor asignado (el API retorna data.user.assignedMentorId)
      if (!data.user?.assignedMentorId) {
        setError('No tienes un mentor asignado. Contacta al coordinador.');
        setIsLoading(false);
        return;
      }

      // Obtener datos del mentor
      const mentorResponse = await fetch(`/api/usuarios`);
      if (!mentorResponse.ok) throw new Error('Error al cargar mentor');
      
      const mentorData = await mentorResponse.json();
      const mentor = mentorData.usuarios.find((u: any) => u.id === data.user.assignedMentorId);
      
      if (!mentor) {
        setError('No se pudo cargar la información de tu mentor.');
        setIsLoading(false);
        return;
      }

      setMentorAsignado(mentor);

      // Cargar slots disponibles (excluye los ya reservados)
      const slotsResponse = await fetch(`/api/mentor/slots-disponibles?mentorId=${data.user.assignedMentorId}`);
      if (!slotsResponse.ok) throw new Error('Error al cargar slots disponibles');
      
      const slotsData = await slotsResponse.json();
      setDisponibilidadMentor(slotsData.disponibilidad || []);
      setSlotsDisponibles(slotsData.slotsDisponibles || {});

      // Auto-seleccionar primeros slots disponibles si existen
      const diasDisponibles = Object.keys(slotsData.slotsDisponibles || {}).map(Number).sort();
      if (diasDisponibles.length >= 2) {
        const dia1 = diasDisponibles[0];
        const dia2 = diasDisponibles[1];
        const horarios1 = slotsData.slotsDisponibles[dia1];
        const horarios2 = slotsData.slotsDisponibles[dia2];
        
        if (horarios1?.length > 0 && horarios2?.length > 0) {
          setSlot1({ dayOfWeek: dia1, time: horarios1[0] });
          setSlot2({ dayOfWeek: dia2, time: horarios2[0] });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar información del mentor');
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener días disponibles
  const getDiasDisponibles = (): number[] => {
    return Object.keys(slotsDisponibles).map(Number).sort();
  };

  // Obtener horarios disponibles para un día específico
  const getHorariosDisponibles = (dayOfWeek: number): string[] => {
    return slotsDisponibles[dayOfWeek] || [];
  };

  const handleEnroll = async () => {
    if (!mentorAsignado) {
      setError('No tienes un mentor asignado');
      return;
    }

    // Validar que los días sean diferentes
    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      setError('⚠️ Debes seleccionar días diferentes para cada sesión semanal');
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      const response = await fetch('/api/program/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorAsignado.id,
          slot1,
          slot2,
          totalWeeks: 17
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al inscribirse al programa');
        return;
      }

      setSuccess(true);

      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);

    } catch (error) {
      console.error('Error al inscribirse:', error);
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-green-500/30 rounded-2xl p-8 max-w-md text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
            <CheckCircle2 className="text-green-400" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">¡Inscripción Exitosa!</h2>
          <p className="text-slate-300 mb-2">
            Te has inscrito al Programa Intensivo de 17 Semanas.
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Se han generado 34 sesiones programadas (2 por semana).
          </p>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
              <PhoneOff className="text-green-400" size={20} />
              <span>3 Oportunidades</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Sistema de seguimiento activado
            </p>
          </div>
          <p className="text-slate-500 text-sm">
            Serás redirigido al dashboard en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
            <Calendar className="text-purple-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Programa Intensivo 17 Semanas
          </h1>
          <p className="text-slate-400">
            Inscríbete al programa de disciplina con llamadas semanales programadas
          </p>
        </div>

        {/* Características del Programa */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="text-purple-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1">34 Sesiones</h3>
            <p className="text-slate-500 text-sm">17 semanas · 2 llamadas/semana</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <PhoneOff className="text-orange-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1">3 Oportunidades</h3>
            <p className="text-slate-500 text-sm">Llamadas que puedes perder</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="text-blue-400" size={24} />
            </div>
            <h3 className="text-white font-bold mb-1">Horario Fijo</h3>
            <p className="text-slate-500 text-sm">Mismos días y horas cada semana</p>
          </div>
        </div>

        {/* Mentor Asignado */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" size={24} />
            Tu Mentor Asignado
          </h2>
          
          {mentorAsignado ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
              <img
                src={mentorAsignado.profileImage || mentorAsignado.imagen || '/default-avatar.png'}
                alt={mentorAsignado.nombre}
                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
              />
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">{mentorAsignado.nombre}</h3>
                <p className="text-slate-400 text-sm">{mentorAsignado.email}</p>
              </div>
              <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 size={16} />
                Asignado
              </div>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
              <AlertTriangle className="text-yellow-400 mx-auto mb-2" size={32} />
              <p className="text-yellow-300">No tienes un mentor asignado</p>
              <p className="text-slate-400 text-sm mt-1">Contacta al administrador</p>
            </div>
          )}
        </div>

        {/* Selección de Horarios */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Selecciona tus Horarios Semanales</h2>
          <p className="text-slate-400 text-sm mb-6">
            Elige 2 días diferentes con horarios fijos para tus 34 sesiones programadas
          </p>

          {/* Selector Visual de Horarios */}
          <div className="space-y-8">
            {/* Slot 1 */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <div className="w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                Primera Sesión Semanal
              </h3>

              {/* Días */}
              <div>
                <label className="block text-slate-400 text-sm mb-3">Selecciona el día</label>
                <div className="grid grid-cols-7 gap-2">
                  {getDiasDisponibles().map((dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => {
                        const horariosDisponibles = getHorariosDisponibles(dayIndex);
                        setSlot1({ 
                          dayOfWeek: dayIndex, 
                          time: horariosDisponibles[0] || '' 
                        });
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${slot1.dayOfWeek === dayIndex 
                          ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/50' 
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-purple-500/50 hover:text-white'
                        }
                      `}
                    >
                      <div className="text-xs font-medium">{DIAS_SEMANA_CORTO[dayIndex]}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{DIAS_SEMANA[dayIndex]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Horarios */}
              {slot1.dayOfWeek !== -1 && (
                <div>
                  <label className="block text-slate-400 text-sm mb-3">Selecciona la hora</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {getHorariosDisponibles(slot1.dayOfWeek).map((hora) => (
                      <button
                        key={hora}
                        onClick={() => setSlot1({ ...slot1, time: hora })}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${slot1.time === hora 
                            ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/50' 
                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-purple-500/50 hover:text-white'
                          }
                        `}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-sm font-semibold">{hora}</div>
                      </button>
                    ))}
                  </div>
                  {getHorariosDisponibles(slot1.dayOfWeek).length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No hay horarios disponibles para este día
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Slot 2 */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                Segunda Sesión Semanal
              </h3>

              {/* Días */}
              <div>
                <label className="block text-slate-400 text-sm mb-3">Selecciona el día</label>
                <div className="grid grid-cols-7 gap-2">
                  {getDiasDisponibles().map((dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => {
                        const horariosDisponibles = getHorariosDisponibles(dayIndex);
                        setSlot2({ 
                          dayOfWeek: dayIndex, 
                          time: horariosDisponibles[0] || '' 
                        });
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${slot2.dayOfWeek === dayIndex 
                          ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/50' 
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-blue-500/50 hover:text-white'
                        }
                      `}
                    >
                      <div className="text-xs font-medium">{DIAS_SEMANA_CORTO[dayIndex]}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{DIAS_SEMANA[dayIndex]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Horarios */}
              {slot2.dayOfWeek !== -1 && (
                <div>
                  <label className="block text-slate-400 text-sm mb-3">Selecciona la hora</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {getHorariosDisponibles(slot2.dayOfWeek).map((hora) => (
                      <button
                        key={hora}
                        onClick={() => setSlot2({ ...slot2, time: hora })}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${slot2.time === hora 
                            ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/50' 
                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-white'
                          }
                        `}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-sm font-semibold">{hora}</div>
                      </button>
                    ))}
                  </div>
                  {getHorariosDisponibles(slot2.dayOfWeek).length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No hay horarios disponibles para este día
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warning si son el mismo día */}
          {slot1.dayOfWeek !== -1 && slot2.dayOfWeek !== -1 && slot1.dayOfWeek === slot2.dayOfWeek && (
            <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="text-yellow-400 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-300 font-semibold text-sm">Días duplicados</p>
                <p className="text-yellow-400/80 text-xs mt-1">
                  Debes seleccionar días diferentes para cada sesión semanal
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Resumen de tu Inscripción</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Mentor:</span>
              <span className="text-white font-semibold">
                {mentorAsignado?.nombre || 'No asignado'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Primera sesión semanal:</span>
              <span className="text-white font-semibold">
                {slot1.dayOfWeek !== -1 && slot1.time 
                  ? `${DIAS_SEMANA[slot1.dayOfWeek]} a las ${slot1.time}`
                  : 'No seleccionado'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Segunda sesión semanal:</span>
              <span className="text-white font-semibold">
                {slot2.dayOfWeek !== -1 && slot2.time 
                  ? `${DIAS_SEMANA[slot2.dayOfWeek]} a las ${slot2.time}`
                  : 'No seleccionado'
                }
              </span>
            </div>
            
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total de sesiones:</span>
                <span className="text-white font-bold">34 sesiones</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-slate-400">Duración del programa:</span>
                <span className="text-white font-bold">17 semanas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-0.5" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Botón de Inscripción */}
        <button
          onClick={handleEnroll}
          disabled={
            isEnrolling || 
            !mentorAsignado || 
            slot1.dayOfWeek === -1 || 
            slot2.dayOfWeek === -1 || 
            !slot1.time || 
            !slot2.time || 
            slot1.dayOfWeek === slot2.dayOfWeek
          }
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnrolling ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Inscribiendo al Programa...
            </>
          ) : (
            <>
              <CheckCircle2 size={24} />
              Confirmar Inscripción
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-xs mt-4">
          Al inscribirte, aceptas comprometerte a asistir a las 34 sesiones programadas
        </p>
      </div>
    </div>
  );
}
