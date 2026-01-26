'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ParticipantInfo {
  odId: number;
  odName: string;
  odImage?: string | null;
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
const DEFAULT_CALL_DAYS = [2, 4, 8, 10];

export default function PostEntrenoScheduleModal({
  isOpen,
  onClose,
  squadId,
  squadName,
  members,
  trainingEndDate: propTrainingEndDate,
  onScheduled
}: PostEntrenoScheduleModalProps) {
  const [step, setStep] = useState<'days' | 'schedules' | 'success'>('days');
  const [selectedDays, setSelectedDays] = useState<number[]>(DEFAULT_CALL_DAYS);
  const [participantTimes, setParticipantTimes] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainingEndDate, setTrainingEndDate] = useState<Date | null>(propTrainingEndDate || null);
  const [loadingVision, setLoadingVision] = useState(false);
  const [occupiedSlotsByDate, setOccupiedSlotsByDate] = useState<Record<string, string[]>>({});
  const [scheduledCount, setScheduledCount] = useState(0);
  const [alreadyScheduledIds, setAlreadyScheduledIds] = useState<Set<number>>(new Set());
  const [editingParticipants, setEditingParticipants] = useState<Set<number>>(new Set()); // IDs de participantes que se están editando
  const [scheduledTimes, setScheduledTimes] = useState<Record<number, string>>({}); // Horarios actuales de los ya agendados

  // Inicializar horarios por defecto para cada participante
  useEffect(() => {
    const defaults: Record<number, string> = {};
    members.forEach((m, idx) => {
      // Asignar horarios escalonados: 7:00, 7:10, 7:20, etc.
      const baseHour = 7;
      const minutes = (idx * 10) % 60;
      const hour = baseHour + Math.floor((idx * 10) / 60);
      defaults[m.odId] = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    });
    setParticipantTimes(defaults);
  }, [members]);

  // Cargar fecha de fin del entrenamiento
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
        // Guardar IDs de participantes que ya tienen llamadas agendadas
        if (data.scheduledParticipants) {
          setAlreadyScheduledIds(new Set(data.scheduledParticipants));
        }
        // Guardar horarios actuales de los ya agendados
        if (data.callsByParticipant) {
          const times: Record<number, string> = {};
          for (const [participantId, calls] of Object.entries(data.callsByParticipant)) {
            const callsArray = calls as any[];
            if (callsArray.length > 0) {
              times[parseInt(participantId)] = callsArray[0].scheduledTime;
            }
          }
          setScheduledTimes(times);
        }
      }
    } catch (err) {
      console.error('Error fetching training end date:', err);
    } finally {
      setLoadingVision(false);
    }
  };

  // Calcular las fechas basadas en los días seleccionados
  const callDates = useMemo(() => {
    if (!trainingEndDate) return [];
    const endDate = new Date(trainingEndDate);
    endDate.setHours(0, 0, 0, 0);
    
    return selectedDays.map((dayOffset, index) => {
      const callDate = new Date(endDate);
      callDate.setDate(callDate.getDate() + dayOffset);
      return {
        dayOffset,
        date: callDate,
        label: `Llamada ${index + 1}`
      };
    });
  }, [trainingEndDate, selectedDays]);

  // Formatear fecha
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

  // Generar calendario de 15 días
  const calendarDays = useMemo(() => {
    if (!trainingEndDate) return [];
    const endDate = new Date(trainingEndDate);
    endDate.setHours(0, 0, 0, 0);
    
    const days = [];
    for (let i = 1; i <= 15; i++) {
      const date = new Date(endDate);
      date.setDate(date.getDate() + i);
      days.push({
        dayOffset: i,
        date,
        dayName: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()],
        dayNum: date.getDate(),
        isSelected: selectedDays.includes(i)
      });
    }
    return days;
  }, [trainingEndDate, selectedDays]);

  // Toggle día en el calendario
  const toggleDay = (dayOffset: number) => {
    if (selectedDays.includes(dayOffset)) {
      // Quitar el día
      setSelectedDays(prev => prev.filter(d => d !== dayOffset).sort((a, b) => a - b));
    } else {
      // Agregar el día (máximo 4)
      if (selectedDays.length < 4) {
        setSelectedDays(prev => [...prev, dayOffset].sort((a, b) => a - b));
      }
    }
  };

  // Opciones de horarios (6:00 AM - 9:00 AM cada 10 min)
  const timeOptions: string[] = useMemo(() => {
    const times: string[] = [];
    for (let h = 6; h <= 9; h++) {
      for (let m = 0; m < 60; m += 10) {
        if (h === 9 && m > 0) break;
        times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return times;
  }, []);

  // Verificar si un horario está ocupado en alguna de las fechas
  // Excluir el horario del participante que se está editando
  const isTimeOccupied = (time: string, excludeParticipantId?: number): boolean => {
    for (const call of callDates) {
      const dateKey = call.date.toISOString().split('T')[0];
      const occupiedTimes = occupiedSlotsByDate[dateKey] || [];
      if (occupiedTimes.includes(time)) {
        // Si es el horario actual del participante que se está editando, no está ocupado para él
        if (excludeParticipantId && scheduledTimes[excludeParticipantId] === time) {
          continue;
        }
        return true;
      }
    }
    return false;
  };

  // Participantes pendientes (no agendados O que están siendo editados)
  const pendingMembers = useMemo(() => {
    return members.filter(m => !alreadyScheduledIds.has(m.odId) || editingParticipants.has(m.odId));
  }, [members, alreadyScheduledIds, editingParticipants]);

  // Participantes ya agendados que NO se están editando
  const scheduledMembers = useMemo(() => {
    return members.filter(m => alreadyScheduledIds.has(m.odId) && !editingParticipants.has(m.odId));
  }, [members, alreadyScheduledIds, editingParticipants]);

  // Toggle edición de un participante
  const toggleEditParticipant = (participantId: number) => {
    setEditingParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
        // Copiar el horario actual al formulario de edición
        if (scheduledTimes[participantId]) {
          setParticipantTimes(prevTimes => ({
            ...prevTimes,
            [participantId]: scheduledTimes[participantId]
          }));
        }
      }
      return newSet;
    });
  };

  // Guardar todas las llamadas
  const handleSaveAll = async () => {
    if (selectedDays.length !== 4) {
      setError('Debes seleccionar exactamente 4 días');
      return;
    }

    if (!trainingEndDate) {
      setError('No se pudo obtener la fecha de fin del entrenamiento');
      return;
    }

    if (pendingMembers.length === 0) {
      setError('Todos los participantes ya están agendados');
      return;
    }

    setSaving(true);
    setError(null);
    setScheduledCount(0);

    let successCount = 0;
    let lastError = null;

    // Guardar solo para participantes PENDIENTES
    for (const member of pendingMembers) {
      const time = participantTimes[member.odId] || '07:00';
      
      try {
        const res = await fetch('/api/gc-calls/post-entreno/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: member.odId,
            squadId,
            trainingEndDate: trainingEndDate.toISOString(),
            calls: callDates.map(call => ({
              dayOffset: call.dayOffset,
              date: call.date.toISOString(),
              time
            }))
          })
        });
        
        const data = await res.json();
        
        if (data.success) {
          successCount++;
          setScheduledCount(successCount);
        } else {
          lastError = data.error;
        }
      } catch (err) {
        console.error('Error saving schedule for', member.odName, err);
        lastError = 'Error de conexión';
      }
    }

    setSaving(false);

    if (successCount === pendingMembers.length) {
      setStep('success');
      setTimeout(() => {
        onScheduled?.();
        onClose();
      }, 2000);
    } else if (successCount > 0) {
      setError(`Se agendaron ${successCount} de ${pendingMembers.length} participantes. ${lastError || ''}`);
    } else {
      setError(lastError || 'Error al guardar las llamadas');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900/20 border border-emerald-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-emerald-500/10">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <CalendarPlus className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Llamadas Post-Entreno</h3>
                <p className="text-xs text-slate-400">{squadName} • {members.length} participantes</p>
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
            <span className={`px-3 py-1.5 rounded-lg ${step === 'days' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-500'}`}>
              1. Seleccionar Días
            </span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className={`px-3 py-1.5 rounded-lg ${step === 'schedules' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-500'}`}>
              2. Asignar Horarios
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {loadingVision && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              <span className="ml-2 text-slate-400">Cargando calendario...</span>
            </div>
          )}

          {!loadingVision && !trainingEndDate && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <p className="text-sm text-amber-400">
                  No se pudo obtener la fecha de fin del entrenamiento.
                </p>
              </div>
            </div>
          )}

          {/* PASO 1: Seleccionar días en calendario */}
          {step === 'days' && !loadingVision && trainingEndDate && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-300">
                  Selecciona <span className="text-emerald-400 font-bold">4 días</span> para las llamadas de seguimiento
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Los mismos días aplicarán para todos los participantes
                </p>
              </div>

              {/* Calendario visual */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Días después del entrenamiento</span>
                  <span className="text-xs text-emerald-400 font-medium">{selectedDays.length}/4 seleccionados</span>
                </div>
                
                {/* Grid de días */}
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {calendarDays.map((day) => (
                    <button
                      key={day.dayOffset}
                      onClick={() => toggleDay(day.dayOffset)}
                      disabled={!day.isSelected && selectedDays.length >= 4}
                      className={`
                        relative p-2 rounded-xl text-center transition-all
                        ${day.isSelected 
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                          : selectedDays.length >= 4
                            ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105'
                        }
                      `}
                    >
                      <div className="text-[10px] opacity-70">{day.dayName}</div>
                      <div className="text-lg font-bold">{day.dayNum}</div>
                      <div className="text-[10px] opacity-70">Día {day.dayOffset}</div>
                      {day.isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen de días seleccionados */}
              {selectedDays.length > 0 && (
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 mb-2 font-medium">Días seleccionados:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDays.map((dayOffset, idx) => {
                      const dayInfo = calendarDays.find(d => d.dayOffset === dayOffset);
                      return (
                        <div key={dayOffset} className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded-lg">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-white">
                            {dayInfo ? formatDate(dayInfo.date) : `Día ${dayOffset}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep('schedules')}
                disabled={selectedDays.length !== 4}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
              >
                Continuar a Asignar Horarios
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* PASO 2: Asignar horarios a cada participante */}
          {step === 'schedules' && !loadingVision && trainingEndDate && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setStep('days')}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Cambiar días
                </button>
                <div className="text-xs text-slate-500">
                  Llamadas: {selectedDays.map((d, i) => calendarDays.find(c => c.dayOffset === d)?.date).filter(Boolean).map(d => formatDate(d!)).join(' • ')}
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-slate-300">
                  Asigna el horario para cada participante
                </p>
              </div>

              {/* Participantes ya agendados (con opción de editar) */}
              {scheduledMembers.length > 0 && (
                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30 mb-3">
                  <p className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Ya agendados ({scheduledMembers.length})
                  </p>
                  <div className="space-y-2">
                    {scheduledMembers.map(member => (
                      <div key={member.odId} className="flex items-center justify-between bg-emerald-500/20 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-emerald-300">{member.odName}</span>
                          <span className="text-xs text-emerald-400/70">
                            {scheduledTimes[member.odId] ? formatTime(scheduledTimes[member.odId]) : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleEditParticipant(member.odId)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded hover:bg-emerald-500/20"
                        >
                          <Pencil className="w-3 h-3" />
                          Cambiar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de participantes PENDIENTES o EN EDICIÓN con selector de hora */}
              {pendingMembers.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {pendingMembers.map((member, idx) => {
                    const isEditing = editingParticipants.has(member.odId);
                    return (
                      <div 
                        key={member.odId}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isEditing 
                            ? 'bg-amber-500/10 border-amber-500/30' 
                            : 'bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/30'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
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
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-slate-600">
                          {idx + 1}
                        </div>
                      </div>

                      {/* Nombre */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {member.odName}
                          {isEditing && (
                            <span className="ml-2 text-xs text-amber-400">(editando)</span>
                          )}
                        </p>
                      </div>

                      {/* Selector de hora */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <select
                          value={participantTimes[member.odId] || '07:00'}
                          onChange={(e) => setParticipantTimes(prev => ({
                            ...prev,
                            [member.odId]: e.target.value
                          }))}
                          className={`border text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                            isEditing ? 'bg-amber-900/50 border-amber-500/50' : 'bg-slate-700 border-slate-600'
                          }`}
                        >
                          {timeOptions.map(time => {
                            const occupied = isTimeOccupied(time, isEditing ? member.odId : undefined);
                            return (
                              <option 
                                key={time} 
                                value={time}
                                disabled={occupied}
                              >
                                {formatTime(time)}{occupied ? ' ⚠️' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {isEditing && (
                          <button
                            onClick={() => toggleEditParticipant(member.odId)}
                            className="text-xs text-slate-400 hover:text-white px-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-white font-medium">¡Todos agendados!</p>
                  <p className="text-sm text-slate-400 mt-1">Todos los participantes ya tienen sus llamadas programadas</p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {pendingMembers.length > 0 && (
                <Button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Agendando... ({scheduledCount}/{pendingMembers.length})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Agendar {pendingMembers.length} Participante{pendingMembers.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* ÉXITO */}
          {step === 'success' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                ¡Agendados!
              </h4>
              <p className="text-sm text-slate-400 mb-6">
                Se agendaron las 4 llamadas para {scheduledCount} participante{scheduledCount !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {selectedDays.map((dayOffset, idx) => {
                  const dayInfo = calendarDays.find(d => d.dayOffset === dayOffset);
                  return (
                    <div key={dayOffset} className="bg-emerald-500/20 px-3 py-1.5 rounded-lg">
                      <span className="text-sm text-emerald-400">
                        {dayInfo ? formatDate(dayInfo.date) : `Día ${dayOffset}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full border-slate-700"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
