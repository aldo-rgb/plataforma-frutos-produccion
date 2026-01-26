'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Check, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarPlus,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ParticipantInfo {
  odId: number;
  odName: string;
  odImage?: string | null;
}

interface CallSchedule {
  dayOffset: number;
  date: Date;
  time: string;
  label: string;
}

interface PostEntrenoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  squadId: string;
  squadName: string;
  members: ParticipantInfo[];
  trainingEndDate?: Date;
  onScheduled?: () => void;
}

// Días por defecto después del entrenamiento
const DEFAULT_CALL_DAYS = [6, 8, 12, 14];

export default function PostEntrenoScheduleModal({
  isOpen,
  onClose,
  squadId,
  squadName,
  members,
  trainingEndDate: propTrainingEndDate,
  onScheduled
}: PostEntrenoScheduleModalProps) {
  const [step, setStep] = useState<'participant' | 'schedule' | 'confirm' | 'success'>('participant');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantInfo | null>(null);
  const [callDays, setCallDays] = useState<number[]>(DEFAULT_CALL_DAYS);
  const [callTime, setCallTime] = useState<string>('07:00'); // Default 7:00 AM
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledParticipants, setScheduledParticipants] = useState<Set<number>>(new Set());
  const [trainingEndDate, setTrainingEndDate] = useState<Date | null>(propTrainingEndDate || null);
  const [loadingVision, setLoadingVision] = useState(false);
  const [occupiedSlotsByDate, setOccupiedSlotsByDate] = useState<Record<string, string[]>>({});

  // Cargar fecha de fin del entrenamiento si no viene como prop
  useEffect(() => {
    if (!propTrainingEndDate && squadId) {
      fetchTrainingEndDate();
    }
  }, [squadId, propTrainingEndDate]);

  const fetchTrainingEndDate = async () => {
    try {
      setLoadingVision(true);
      const res = await fetch(`/api/gc-calls/post-entreno/schedule?squadId=${squadId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.trainingEndDate) {
          setTrainingEndDate(new Date(data.trainingEndDate));
        }
        if (data.occupiedSlotsByDate) {
          setOccupiedSlotsByDate(data.occupiedSlotsByDate);
        }
        if (data.scheduledParticipants) {
          setScheduledParticipants(new Set(data.scheduledParticipants));
        }
      }
    } catch (err) {
      console.error('Error fetching training end date:', err);
    } finally {
      setLoadingVision(false);
    }
  };

  // Calcular las fechas de las llamadas basadas en el día de fin y los offsets
  const calculateCallDates = (): CallSchedule[] => {
    if (!trainingEndDate) return [];
    
    const endDate = new Date(trainingEndDate);
    endDate.setHours(0, 0, 0, 0);
    
    return callDays.map((dayOffset, index) => {
      const callDate = new Date(endDate);
      callDate.setDate(callDate.getDate() + dayOffset);
      
      const weekNum = dayOffset <= 4 ? 1 : 2;
      const callNum = index + 1;
      
      return {
        dayOffset,
        date: callDate,
        time: callTime,
        label: `Llamada ${callNum} (Semana ${weekNum})`
      };
    });
  };

  const callDates = calculateCallDates();

  // Auto-seleccionar primer horario disponible cuando cambian los días o se selecciona participante
  useEffect(() => {
    if (step === 'schedule' && callDates.length > 0) {
      // Generar todas las opciones de tiempo
      const times: string[] = [];
      for (let h = 6; h <= 9; h++) {
        for (let m = 0; m < 60; m += 10) {
          if (h === 9 && m > 0) break;
          times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      
      // Encontrar el primer horario disponible
      const firstAvailable = times.find(time => {
        for (const call of callDates) {
          const dateKey = call.date.toISOString().split('T')[0];
          const occupiedTimes = occupiedSlotsByDate[dateKey] || [];
          if (occupiedTimes.includes(time)) {
            return false;
          }
        }
        return true;
      });
      
      if (firstAvailable && firstAvailable !== callTime) {
        // Verificar si el horario actual está ocupado
        const currentIsOccupied = callDates.some(call => {
          const dateKey = call.date.toISOString().split('T')[0];
          return (occupiedSlotsByDate[dateKey] || []).includes(callTime);
        });
        
        if (currentIsOccupied) {
          setCallTime(firstAvailable);
        }
      }
    }
  }, [step, callDates, occupiedSlotsByDate]);

  // Formatear fecha para mostrar
  const formatDate = (date: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Formatear hora
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Cambiar día de una llamada
  const handleDayChange = (index: number, newDay: number) => {
    const newDays = [...callDays];
    newDays[index] = newDay;
    // Ordenar los días
    newDays.sort((a, b) => a - b);
    setCallDays(newDays);
  };

  // Guardar las llamadas para un participante
  const handleSaveSchedule = async () => {
    if (!selectedParticipant) {
      setError('No hay participante seleccionado');
      return;
    }
    
    if (!trainingEndDate) {
      setError('No se pudo obtener la fecha de fin del entrenamiento');
      return;
    }
    
    if (callDates.length === 0) {
      setError('No hay llamadas configuradas');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    console.log('📅 Enviando datos:', {
      participantId: selectedParticipant.odId,
      squadId,
      trainingEndDate: trainingEndDate.toISOString(),
      calls: callDates.map(call => ({
        dayOffset: call.dayOffset,
        date: call.date.toISOString(),
        time: callTime
      }))
    });
    
    try {
      const res = await fetch('/api/gc-calls/post-entreno/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedParticipant.odId,
          squadId,
          trainingEndDate: trainingEndDate.toISOString(),
          calls: callDates.map(call => ({
            dayOffset: call.dayOffset,
            date: call.date.toISOString(),
            time: callTime
          }))
        })
      });
      
      const data = await res.json();
      console.log('📅 Respuesta:', data);
      
      if (data.success) {
        setScheduledParticipants(prev => new Set([...prev, selectedParticipant.odId]));
        setStep('success');
        
        // Después de 1.5 segundos, volver a la lista o cerrar
        setTimeout(() => {
          if (scheduledParticipants.size + 1 < members.length) {
            // Hay más participantes por agendar
            setSelectedParticipant(null);
            setStep('participant');
            // Recargar slots ocupados
            fetchTrainingEndDate();
          } else {
            // Todos agendados
            onScheduled?.();
            onClose();
          }
        }, 1500);
      } else {
        setError(data.error || 'Error al guardar las llamadas');
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  // Opciones de días disponibles (1-15)
  const dayOptions = Array.from({ length: 15 }, (_, i) => i + 1);

  // Verificar si un horario está ocupado en alguna de las fechas programadas
  const isTimeOccupied = (time: string): boolean => {
    for (const call of callDates) {
      const dateKey = call.date.toISOString().split('T')[0];
      const occupiedTimes = occupiedSlotsByDate[dateKey] || [];
      if (occupiedTimes.includes(time)) {
        return true;
      }
    }
    return false;
  };

  // Opciones de horarios (6:00 AM - 9:00 AM cada 10 min)
  const allTimeOptions: string[] = [];
  for (let h = 6; h <= 9; h++) {
    for (let m = 0; m < 60; m += 10) {
      if (h === 9 && m > 0) break; // Solo hasta 9:00 AM
      allTimeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900/20 border border-emerald-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-emerald-500/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <CalendarPlus className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Llamadas Post-Entreno</h3>
                <p className="text-xs text-slate-400">{squadName} • 4 llamadas en 15 días</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="px-5 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded ${step === 'participant' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}>
              1. Participante
            </span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className={`px-2 py-1 rounded ${step === 'schedule' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}>
              2. Horario
            </span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className={`px-2 py-1 rounded ${step === 'confirm' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}`}>
              3. Confirmar
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {/* PASO 1: Seleccionar participante */}
          {step === 'participant' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300 mb-4">
                Selecciona un participante para agendar sus 4 llamadas de seguimiento:
              </p>
              
              <div className="space-y-2">
                {members.map((member, index) => {
                  const isScheduled = scheduledParticipants.has(member.odId);
                  return (
                    <button
                      key={`participant-${member.odId || index}`}
                      onClick={() => {
                        if (!isScheduled) {
                          setSelectedParticipant(member);
                          setStep('schedule');
                        }
                      }}
                      disabled={isScheduled}
                      className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                        isScheduled
                          ? 'bg-emerald-500/10 border border-emerald-500/30 cursor-default'
                          : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {member.odImage ? (
                          <img 
                            src={member.odImage} 
                            alt={member.odName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                            {member.odName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{member.odName}</p>
                        </div>
                      </div>
                      {isScheduled ? (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Agendado
                        </span>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {scheduledParticipants.size > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-sm text-emerald-400">
                    ✅ {scheduledParticipants.size} de {members.length} participantes agendados
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: Configurar horario */}
          {step === 'schedule' && selectedParticipant && (
            <div className="space-y-4">
              {/* Loading o error si no hay trainingEndDate */}
              {loadingVision && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="ml-2 text-slate-400">Cargando fechas...</span>
                </div>
              )}
              
              {!loadingVision && !trainingEndDate && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <p className="text-sm text-amber-400">
                      No se pudo obtener la fecha de fin del entrenamiento. El átomo puede no tener una visión asignada.
                    </p>
                  </div>
                </div>
              )}

              {!loadingVision && trainingEndDate && (
                <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                {selectedParticipant.odImage ? (
                  <img 
                    src={selectedParticipant.odImage} 
                    alt={selectedParticipant.odName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                    {selectedParticipant.odName?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{selectedParticipant.odName}</p>
                  <p className="text-xs text-slate-400">Configurando 4 llamadas</p>
                </div>
              </div>

              {/* Hora de las llamadas */}
              <div>
                <label className="text-sm text-slate-300 block mb-2">
                  Hora para todas las llamadas:
                </label>
                <select
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
                >
                  {allTimeOptions.map(time => {
                    const occupied = isTimeOccupied(time);
                    return (
                      <option 
                        key={time} 
                        value={time}
                        disabled={occupied}
                        className={occupied ? 'text-slate-500' : ''}
                      >
                        {formatTime(time)}{occupied ? ' (ocupado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Días de las llamadas */}
              <div>
                <label className="text-sm text-slate-300 block mb-2">
                  Días de las llamadas (después del entrenamiento):
                </label>
                <div className="space-y-2">
                  {callDays.map((day, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index < 2 ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <select
                          value={day}
                          onChange={(e) => handleDayChange(index, parseInt(e.target.value))}
                          className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white text-sm"
                        >
                          {dayOptions.map(d => (
                            <option key={d} value={d}>Día {d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">
                          {callDates[index] ? formatDate(callDates[index].date) : 'Cargando...'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {callDates[index]?.label || `Llamada ${index + 1}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedParticipant(null);
                    setStep('participant');
                  }}
                  className="flex-1 border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Atrás
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={!trainingEndDate || callDates.length === 0}
                >
                  Revisar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
                </>
              )}
            </div>
          )}

          {/* PASO 3: Confirmar */}
          {step === 'confirm' && selectedParticipant && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-sm text-emerald-400 font-medium mb-2">
                  Resumen de llamadas para {selectedParticipant.odName}:
                </p>
                <div className="space-y-2">
                  {callDates.map((call, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{call.label}</span>
                      <span className="text-white font-medium">
                        {formatDate(call.date)} • {formatTime(call.time)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('schedule')}
                  className="flex-1 border-slate-700"
                  disabled={saving}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Modificar
                </Button>
                <Button
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ÉXITO */}
          {step === 'success' && selectedParticipant && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">
                ¡Llamadas Agendadas!
              </h4>
              <p className="text-sm text-slate-400">
                Se agendaron 4 llamadas para {selectedParticipant.odName}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'participant' && (
          <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full border-slate-700"
            >
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
