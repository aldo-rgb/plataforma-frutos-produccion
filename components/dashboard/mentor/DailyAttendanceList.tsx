"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Student {
  id: number;
  nombre: string;
  disciplineSubAsStudent?: {
    missedCallsCount: number;
  };
}

interface TimeSlot {
  time: string;
  student?: Student;
  status: 'FREE' | 'PENDING' | 'ATTENDED' | 'MISSED';
  callLogId?: number;
}

interface DailyAttendanceListProps {
  mentorId: number;
}

// Modal de confirmación
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'success' | 'danger';
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Header con gradiente */}
        <div className={`p-6 rounded-t-2xl border-b border-slate-700 ${
          type === 'success' 
            ? 'bg-gradient-to-r from-green-900/30 to-slate-900' 
            : 'bg-gradient-to-r from-red-900/30 to-slate-900'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${
              type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {type === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
              <p className="text-sm text-slate-300">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
              type === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de resultado
interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

function ResultModal({ isOpen, onClose, type, title, message }: ResultModalProps) {
  if (!isOpen) return null;

  const colors = {
    success: {
      gradient: 'from-green-900/30 to-slate-900',
      iconBg: 'bg-green-500/20',
      icon: <CheckCircle className="w-8 h-8 text-green-400" />,
      button: 'bg-green-600 hover:bg-green-700'
    },
    error: {
      gradient: 'from-red-900/30 to-slate-900',
      iconBg: 'bg-red-500/20',
      icon: <XCircle className="w-8 h-8 text-red-400" />,
      button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      gradient: 'from-orange-900/30 to-slate-900',
      iconBg: 'bg-orange-500/20',
      icon: <AlertTriangle className="w-8 h-8 text-orange-400" />,
      button: 'bg-orange-600 hover:bg-orange-700'
    }
  };

  const style = colors[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className={`p-8 rounded-2xl bg-gradient-to-br ${style.gradient}`}>
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`p-4 rounded-full ${style.iconBg}`}>
              {style.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-300">{message}</p>
            </div>
            <button
              onClick={onClose}
              className={`w-full px-6 py-3 ${style.button} text-white rounded-xl font-medium transition-colors mt-2`}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DailyAttendanceList({ mentorId }: DailyAttendanceListProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState("");
  
  // Estados para modales
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    slotIndex: number;
    status: 'ATTENDED' | 'MISSED';
    studentName: string;
  }>({
    isOpen: false,
    slotIndex: -1,
    status: 'ATTENDED',
    studentName: ''
  });

  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    const now = new Date();
    setTodayDate(format(now, "EEEE d 'de' MMMM", { locale: es }));
    loadTodayAgenda();
  }, [mentorId]);

  const loadTodayAgenda = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mentor/daily-agenda?mentorId=${mentorId}`, { cache: 'no-store' });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Transformar datos del API al formato del componente
        const transformedSlots: TimeSlot[] = data.map((item: any) => ({
          time: item.time,
          student: item.studentId ? {
            id: item.studentId,
            nombre: item.studentName,
            disciplineSubAsStudent: {
              missedCallsCount: 3 - item.livesLeft
            }
          } : undefined,
          status: item.status,
          callLogId: item.logId
        }));
        setSlots(transformedSlots);
      } else {
        setSlots([]);
      }
    } catch (error) {
      console.error("Error cargando agenda", error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (index: number, status: 'ATTENDED' | 'MISSED') => {
    const slot = slots[index];
    if (!slot.student) return;

    // Abrir modal de confirmación
    setConfirmModal({
      isOpen: true,
      slotIndex: index,
      status,
      studentName: slot.student.nombre
    });
  };

  const confirmMark = async () => {
    const { slotIndex, status, studentName } = confirmModal;
    const slot = slots[slotIndex];
    if (!slot.student) return;

    // 1. Optimistic UI - Actualizar visualmente de inmediato
    const previousSlots = [...slots]; // Backup por si falla
    const newSlots = [...slots];
    newSlots[slotIndex].status = status;
    
    // Si marcamos falta, bajar una vida visualmente
    if (status === 'MISSED' && slot.student.disciplineSubAsStudent) {
      const currentMissed = slot.student.disciplineSubAsStudent.missedCallsCount || 0;
      newSlots[slotIndex].student!.disciplineSubAsStudent!.missedCallsCount = currentMissed + 1;
    }
    setSlots(newSlots);
    setProcessing(slot.time);

    try {
      // 2. Llamada al Backend
      const res = await fetch('/api/mentor/daily-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId,
          studentId: slot.student.id,
          status,
          dateStr: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error("Error al guardar");
      }

      const data = await res.json();
      
      // 3. Mostrar resultado
      if (status === 'MISSED') {
        const missedCount = (slot.student.disciplineSubAsStudent?.missedCallsCount || 0) + 1;
        const livesLeft = 3 - missedCount;
        
        if (missedCount >= 3) {
          // Suspendido
          setResultModal({
            isOpen: true,
            type: 'warning',
            title: '🚨 Alumno Suspendido',
            message: `${studentName} ha sido suspendido por acumular 3 faltas consecutivas. Su suscripción ha terminado automáticamente.`
          });
        } else {
          // Falta registrada
          setResultModal({
            isOpen: true,
            type: 'error',
            title: '💔 Falta Registrada',
            message: `Se ha restado una vida a ${studentName}. Vidas restantes: ${livesLeft}/3`
          });
        }
        // Recargar agenda para actualizar vidas
        await loadTodayAgenda();
      } else {
        // Asistencia confirmada
        setResultModal({
          isOpen: true,
          type: 'success',
          title: '✅ Asistencia Confirmada',
          message: `${studentName} ha sido marcado como presente. ¡Excelente disciplina!`
        });
      }

    } catch (error) {
      console.error('Error al registrar asistencia:', error);
      // Revertir cambios optimistas
      setSlots(previousSlots);
      setResultModal({
        isOpen: true,
        type: 'error',
        title: '❌ Error de Conexión',
        message: 'No se guardó el cambio. Verifica tu conexión e intenta nuevamente.'
      });
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden animate-pulse">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Cargando agenda del Club 5 AM...</p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Sin Agenda Configurada</h3>
          <p className="text-slate-400 text-sm mb-4">
            No tienes una ventana de disponibilidad activa para llamadas de disciplina.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/mentor/horarios'}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Configurar Horarios
          </button>
        </div>
      </div>
    );
  }

  const totalSlots = slots.length;
  const attendedCount = slots.filter(s => s.status === 'ATTENDED').length;
  const missedCount = slots.filter(s => s.status === 'MISSED').length;
  const pendingCount = slots.filter(s => s.status === 'PENDING').length;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-orange-900/30 to-slate-900 p-6 border-b border-slate-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
              <span className="text-3xl">🌅</span> Checklist Mañanero
            </h2>
            <p className="text-slate-300 capitalize text-sm">{todayDate}</p>
          </div>
          <button
            onClick={loadTodayAgenda}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-slate-400 mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
          </div>
          <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30">
            <div className="text-xs text-green-400 mb-1">Asistieron</div>
            <div className="text-2xl font-bold text-green-400">{attendedCount}</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
            <div className="text-xs text-red-400 mb-1">Faltaron</div>
            <div className="text-2xl font-bold text-red-400">{missedCount}</div>
          </div>
        </div>
      </div>

      {/* Lista de Turnos */}
      <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
        {slots.map((slot, index) => {
          const livesLeft = slot.student?.disciplineSubAsStudent 
            ? 3 - slot.student.disciplineSubAsStudent.missedCallsCount 
            : 3;

          return (
            <div 
              key={index} 
              className={`p-4 flex items-center justify-between transition-colors ${
                slot.status === 'MISSED' ? 'bg-red-900/10' : 
                slot.status === 'ATTENDED' ? 'bg-green-900/10' : 
                slot.status === 'FREE' ? 'bg-slate-900/20' :
                'hover:bg-slate-700/30'
              }`}
            >
              {/* Columna Izq: Hora y Alumno */}
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-slate-300 font-mono font-bold px-3 py-2 rounded-lg text-sm border border-slate-700 min-w-[70px] text-center">
                  {slot.time}
                </div>
                
                {slot.status === 'FREE' ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                    <span className="italic text-sm">Espacio Libre</span>
                  </div>
                ) : (
                  <div>
                    <p className={`font-bold ${
                      slot.status === 'MISSED' ? 'text-red-400 line-through' : 
                      slot.status === 'ATTENDED' ? 'text-green-400' : 'text-white'
                    }`}>
                      {slot.student?.nombre}
                    </p>
                    {/* Corazones de vida */}
                    <div className="flex gap-1 mt-1">
                      {[...Array(3)].map((_, i) => (
                        <span 
                          key={i} 
                          className={`text-sm ${i < livesLeft ? 'text-red-500' : 'text-slate-700'}`}
                        >
                          {i < livesLeft ? '❤️' : '💔'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Columna Der: Acciones */}
              {slot.status === 'FREE' ? (
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                  <span className="w-2 h-2 bg-slate-700 rounded-full"></span>
                </div>
              ) : slot.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleMark(index, 'ATTENDED')}
                    disabled={processing === slot.time}
                    className="p-3 bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Marcar Asistencia"
                  >
                    {processing === slot.time ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle className="w-6 h-6" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleMark(index, 'MISSED')}
                    disabled={processing === slot.time}
                    className="p-3 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Marcar Falta"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                // Estado Final (Ya calificado)
                <div className={`px-4 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 ${
                  slot.status === 'ATTENDED' 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {slot.status === 'ATTENDED' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      ASISTIÓ
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      FALTÓ
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer de Resumen */}
      <div className="bg-slate-950/50 p-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span>Cierra asistencia antes de las 9:00 AM</span>
          </div>
          <div className="text-slate-500">
            {attendedCount + missedCount} / {slots.filter(s => s.status !== 'FREE').length} registrados
          </div>
        </div>
      </div>

      {/* Modales */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmMark}
        title={confirmModal.status === 'ATTENDED' ? '✅ Confirmar Asistencia' : '⚠️ Registrar Falta'}
        message={
          confirmModal.status === 'ATTENDED'
            ? `¿Confirmar que ${confirmModal.studentName} asistió a la llamada?`
            : `¿Seguro que ${confirmModal.studentName} FALTÓ? Se le restará una vida (❤️ → 💔)`
        }
        confirmText={confirmModal.status === 'ATTENDED' ? 'Sí, Asistió' : 'Sí, Faltó'}
        cancelText="Cancelar"
        type={confirmModal.status === 'ATTENDED' ? 'success' : 'danger'}
      />

      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={() => setResultModal({ ...resultModal, isOpen: false })}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
      />
    </div>
  );
}
