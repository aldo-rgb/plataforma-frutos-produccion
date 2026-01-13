'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Phone, 
  Clock, 
  User, 
  CheckCircle2,
  Loader2,
  Calendar,
  CalendarPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GCInfo {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface PostEntrenoCall {
  id: string;
  date: string;
  time: string;
  status: string;
}

interface TrainingInfo {
  currentDay: number | null;
  totalDays: number;
  isStaffCallDay: boolean;
  staffCallDays: number[];
  level: string;
}

export default function GCCallWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasGC, setHasGC] = useState(false);
  const [gc, setGC] = useState<GCInfo | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Estado para Post-Entreno
  const [postEntrenoCall, setPostEntrenoCall] = useState<PostEntrenoCall | null>(null);
  const [hasPostEntrenoAvailability, setHasPostEntrenoAvailability] = useState(false);
  
  // Estado para información de entrenamiento
  const [trainingInfo, setTrainingInfo] = useState<TrainingInfo | null>(null);

  useEffect(() => {
    fetchGCInfo();
  }, []);

  const fetchGCInfo = async () => {
    try {
      const res = await fetch('/api/gc-calls/my-gc');
      const data = await res.json();

      if (data.success) {
        setHasGC(data.hasGC);
        setGC(data.gameChanger || null);
        setSelectedTime(data.myScheduledTime || null);
        setTrainingInfo(data.trainingInfo || null);
        
        // Si tiene GC, cargar llamadas post-entreno
        if (data.hasGC && data.gameChanger) {
          fetchPostEntrenoInfo(data.gameChanger.id);
        }
      }
    } catch (err) {
      console.error('Error fetching GC info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostEntrenoInfo = async (gcId: number) => {
    try {
      // Buscar si hay una llamada post-entreno agendada
      const res = await fetch(`/api/gc-calls/my-post-entreno?gameChangerId=${gcId}`);
      const data = await res.json();
      
      if (data.success) {
        setPostEntrenoCall(data.nextCall || null);
        setHasPostEntrenoAvailability(data.hasAvailability || false);
      }
    } catch (err) {
      console.error('Error fetching post-entreno info:', err);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      </motion.div>
    );
  }

  if (!hasGC) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <Phone className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Horario de Llamada</h3>
            <p className="text-xs text-slate-400">Con tu Staff</p>
          </div>
        </div>

        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-2">
            <User className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-xs text-slate-400">
            Aún no eliges Staff
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <Phone className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">Horario de Llamada</h3>
            <p className="text-xs text-slate-400">Con tu Staff</p>
          </div>
        </div>

        {/* GC Info + Time */}
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
          {gc?.imagen ? (
            <img
              src={gc.imagen}
              alt={gc.nombre}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{gc?.nombre}</p>
            <p className="text-xs text-slate-400">Tu Game Changer</p>
          </div>
        </div>

        {/* Selected Time or Info - SOLO si es día de llamada de staff */}
        <div className="mt-4">
          {trainingInfo && trainingInfo.currentDay !== null && trainingInfo.currentDay >= 1 && trainingInfo.currentDay <= trainingInfo.totalDays ? (
            // Estamos dentro del período de entrenamiento
            trainingInfo.isStaffCallDay ? (
              // Es día de llamada de staff
              selectedTime ? (
                <div className="flex items-center justify-center p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-xs text-green-400">Día {trainingInfo.currentDay} - Tu llamada</p>
                      <p className="text-lg font-mono font-bold text-white">{selectedTime}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                  <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Día {trainingInfo.currentDay} - Llamada de tu staff</p>
                  <p className="text-sm font-medium text-amber-300">entre 6 AM y 10 AM</p>
                </div>
              )
            ) : (
              // Es día 1 (llegada) - no hay llamada de staff
              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl text-center">
                <User className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-blue-400">Día {trainingInfo.currentDay} de {trainingInfo.totalDays}</p>
                <p className="text-sm font-medium text-white">
                  {trainingInfo.currentDay === 1 
                    ? '¡Bienvenido al entrenamiento!' 
                    : 'Sin llamada de staff programada'}
                </p>
              </div>
            )
          ) : trainingInfo && trainingInfo.currentDay !== null && trainingInfo.currentDay > trainingInfo.totalDays ? (
            // Entrenamiento terminó - mostrar solo Post-Entreno
            <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl text-center">
              <CheckCircle2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-purple-400">Entrenamiento completado</p>
              <p className="text-sm font-medium text-white">¡Agenda tu llamada Post-Entreno!</p>
            </div>
          ) : (
            // Entrenamiento no ha empezado o sin info
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
              <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Pendiente de iniciar entrenamiento</p>
            </div>
          )}
        </div>

        {/* Sección Post-Entreno */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Llamada Post-Entreno</span>
          </div>
          
          {postEntrenoCall ? (
            // Tiene llamada agendada
            <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400">Próxima llamada</p>
                  <p className="text-sm font-medium text-white">
                    {(() => {
                      // Parsear fecha correctamente para evitar problemas de timezone
                      const [year, month, day] = postEntrenoCall.date.split('-').map(Number);
                      const localDate = new Date(year, month - 1, day);
                      return localDate.toLocaleDateString('es-MX', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      });
                    })()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-amber-300">{postEntrenoCall.time}</p>
                </div>
              </div>
            </div>
          ) : hasPostEntrenoAvailability ? (
            // GC tiene disponibilidad pero no hay llamada agendada
            <Button
              onClick={() => router.push('/dashboard/post-entreno/book')}
              variant="outline"
              className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Agendar Llamada
            </Button>
          ) : (
            // GC no ha configurado disponibilidad para post-entreno
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
              <Calendar className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-400">Sin horarios disponibles</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
