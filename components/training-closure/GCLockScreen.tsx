'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, User, Calendar, Clock, Check, ChevronRight, AlertCircle } from 'lucide-react';

interface Participant {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  callAssigned?: {
    date: string;
    time: string;
  } | null;
}

interface GCLockScreenProps {
  productId: number;
  productName: string;
  participants: Participant[];
  onUnlock: () => void;
  onClose: () => void;
}

// Opciones de días para llamadas (Día 2, 3, 4 post-entrenamiento)
const CALL_DAYS = [
  { label: 'Día 2', daysFromNow: 2 },
  { label: 'Día 3', daysFromNow: 3 },
  { label: 'Día 4', daysFromNow: 4 }
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function GCLockScreen({
  productId,
  productName,
  participants: initialParticipants,
  onUnlock,
  onClose
}: GCLockScreenProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Calcular progreso
  const assignedCount = participants.filter(p => p.callAssigned).length;
  const totalCount = participants.length;
  const progress = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;

  // Verificar si está completo
  useEffect(() => {
    if (progress === 100 && !isUnlocked) {
      // Haptic feedback fuerte
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200, 100, 300]);
      }
      
      // Pequeño delay para la animación
      setTimeout(() => {
        setIsUnlocked(true);
      }, 500);
    }
  }, [progress, isUnlocked]);

  const getDateForDay = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const handleAssignCall = async () => {
    if (!selectedParticipant || selectedDay === null || !selectedTime) return;

    setSavingAssignment(true);

    try {
      const callDate = getDateForDay(selectedDay);
      
      const res = await fetch('/api/gc/assign-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          participantId: selectedParticipant.id,
          callDate: callDate.toISOString(),
          callTime: selectedTime
        })
      });

      if (res.ok) {
        // Actualizar estado local
        setParticipants(prev => prev.map(p => 
          p.id === selectedParticipant.id 
            ? { ...p, callAssigned: { date: callDate.toISOString(), time: selectedTime } }
            : p
        ));

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

        // Limpiar selección
        setSelectedParticipant(null);
        setSelectedDay(null);
        setSelectedTime(null);
      } else {
        const error = await res.json();
        alert(error.error || 'Error al asignar llamada');
      }
    } catch (error) {
      console.error('Error assigning call:', error);
      alert('Error al asignar llamada');
    } finally {
      setSavingAssignment(false);
    }
  };

  // Pantalla de desbloqueo exitoso
  if (isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          {/* Candado que se rompe */}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            className="relative mb-8"
          >
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Lock className="w-32 h-32 text-slate-600" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="relative"
            >
              <Unlock className="w-32 h-32 text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.5)]" />
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-3xl font-bold text-white mb-4"
          >
            ¡DESBLOQUEADO!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-slate-400 mb-8"
          >
            Todas las llamadas han sido asignadas
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onUnlock}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white font-bold text-lg flex items-center gap-2 mx-auto shadow-lg shadow-green-500/30"
          >
            Continuar a la Encuesta
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col"
    >
      {/* Header con candado y progreso */}
      <div className="flex-shrink-0 p-6 text-center">
        {/* Candado con anillo de progreso */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          {/* Anillo de progreso SVG */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="58"
              stroke="rgba(100, 116, 139, 0.3)"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="58"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 364' }}
              animate={{ strokeDasharray: `${progress * 3.64} 364` }}
              transition={{ duration: 0.5 }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Candado en el centro */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                scale: progress === 100 ? [1, 1.2, 1] : 1,
                rotate: progress === 100 ? [0, -10, 10, 0] : 0
              }}
            >
              <Lock className={`w-12 h-12 ${progress === 100 ? 'text-green-400' : 'text-red-400'}`} />
            </motion.div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Misión Finalizada</h2>
        <p className="text-slate-400 text-sm mb-2">{productName}</p>
        
        <div className="flex items-center justify-center gap-2 text-amber-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Completa tus asignaciones para continuar</span>
        </div>

        <div className="mt-4 text-center">
          <span className="text-3xl font-bold text-white">{assignedCount}</span>
          <span className="text-slate-400 text-lg">/{totalCount}</span>
          <p className="text-slate-500 text-sm">llamadas asignadas</p>
        </div>
      </div>

      {/* Lista de participantes */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3 max-w-md mx-auto">
          {participants.map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !participant.callAssigned && setSelectedParticipant(participant)}
              className={`p-4 rounded-2xl border-2 transition-all ${
                participant.callAssigned
                  ? 'bg-green-500/10 border-green-500/30 cursor-default'
                  : selectedParticipant?.id === participant.id
                  ? 'bg-purple-500/20 border-purple-500/50 cursor-pointer'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-purple-500/30 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  participant.callAssigned
                    ? 'bg-green-500/20'
                    : 'bg-slate-700/50'
                }`}>
                  {participant.callAssigned ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{participant.nombre}</p>
                  {participant.callAssigned ? (
                    <p className="text-green-400 text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(participant.callAssigned.date).toLocaleDateString('es-MX', { 
                        weekday: 'short', day: 'numeric', month: 'short' 
                      })} - {participant.callAssigned.time}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">Sin asignar</p>
                  )}
                </div>

                {!participant.callAssigned && (
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal de asignación */}
      <AnimatePresence>
        {selectedParticipant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-60 flex items-end justify-center"
            onClick={() => setSelectedParticipant(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 rounded-t-3xl p-6 border-t-2 border-purple-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
              
              <h3 className="text-lg font-bold text-white mb-1">Asignar Llamada</h3>
              <p className="text-purple-400 mb-4">{selectedParticipant.nombre}</p>

              {/* Selector de día */}
              <p className="text-slate-400 text-sm mb-2">Selecciona el día</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {CALL_DAYS.map((day) => {
                  const date = getDateForDay(day.daysFromNow);
                  return (
                    <motion.button
                      key={day.daysFromNow}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDay(day.daysFromNow)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        selectedDay === day.daysFromNow
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-800/50 border-slate-700/50 hover:border-purple-500/30'
                      }`}
                    >
                      <p className={`font-bold ${selectedDay === day.daysFromNow ? 'text-purple-400' : 'text-white'}`}>
                        {day.label}
                      </p>
                      <p className="text-slate-400 text-xs">{formatDate(date)}</p>
                    </motion.button>
                  );
                })}
              </div>

              {/* Selector de hora */}
              <p className="text-slate-400 text-sm mb-2">Selecciona la hora</p>
              <div className="grid grid-cols-4 gap-2 mb-6 max-h-32 overflow-y-auto">
                {TIME_SLOTS.map((time) => (
                  <motion.button
                    key={time}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTime(time)}
                    className={`p-2 rounded-lg border transition-all text-sm ${
                      selectedTime === time
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-slate-800/50 border-slate-700/50 text-white hover:border-purple-500/30'
                    }`}
                  >
                    {time}
                  </motion.button>
                ))}
              </div>

              {/* Botón de confirmar */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAssignCall}
                disabled={selectedDay === null || !selectedTime || savingAssignment}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingAssignment ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    Asignar Llamada
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
