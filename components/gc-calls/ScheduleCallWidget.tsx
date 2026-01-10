'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GameChanger {
  id: number;
  nombre: string;
  imagen?: string;
}

interface AvailableSlot {
  time: string;
  availabilityId: string;
}

interface BookedCall {
  id: string;
  date: string;
  time: string;
  endTime: string;
  gameChanger: string;
  status: string;
}

interface ScheduleCallWidgetProps {
  gameChangerId?: number;
  squadId?: string;
  visionId?: number;
}

export default function ScheduleCallWidget({ 
  gameChangerId, 
  squadId,
  visionId 
}: ScheduleCallWidgetProps) {
  const { data: session } = useSession();
  
  const [step, setStep] = useState<'info' | 'date' | 'time' | 'confirm' | 'success'>('info');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [bookedCalls, setBookedCalls] = useState<BookedCall[]>([]);
  const [gcInfo, setGCInfo] = useState<GameChanger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar próximos 7 días
  const getNextDays = () => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Cargar información del GC y citas existentes
  useEffect(() => {
    if (gameChangerId) {
      loadGCInfo();
      loadBookedCalls();
    }
  }, [gameChangerId]);

  const loadGCInfo = async () => {
    try {
      // Por ahora, obtener info básica del GC
      // En producción esto vendría de una API
      setGCInfo({
        id: gameChangerId!,
        nombre: 'Tu Game Changer',
      });
    } catch (err) {
      console.error('Error loading GC info:', err);
    }
  };

  const loadBookedCalls = async () => {
    try {
      // Cargar citas ya agendadas del participante
      // TODO: Implementar API endpoint
    } catch (err) {
      console.error('Error loading booked calls:', err);
    }
  };

  // Cargar slots disponibles para una fecha
  const loadAvailableSlots = async (date: Date) => {
    setLoading(true);
    setError(null);
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      const params = new URLSearchParams({
        gameChangerId: gameChangerId!.toString(),
        date: dateStr,
        ...(squadId && { squadId }),
      });

      const res = await fetch(`/api/gc-calls/slots?${params}`);
      const data = await res.json();

      if (data.success) {
        setAvailableSlots(data.availableSlots || []);
      } else {
        setError(data.error || 'Error al cargar horarios');
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
      setError('Error de conexión');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar fecha
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    loadAvailableSlots(date);
    setStep('time');
  };

  // Seleccionar slot
  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('confirm');
  };

  // Confirmar cita
  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gc-calls/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: selectedSlot.availabilityId,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedSlot.time,
          squadId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || 'Error al agendar');
      }
    } catch (err) {
      console.error('Error booking call:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Formatear hora
  const formatTime = (time: string) => {
    const [hours, mins] = time.split(':');
    const h = parseInt(hours);
    return `${h}:${mins} AM`;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-purple-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Phone className="w-5 h-5 text-purple-400" />
          Agendar Llamada con Game Changer
        </CardTitle>
        <CardDescription className="text-white/60">
          Programa tu llamada de seguimiento (10 minutos)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step: Info */}
        {step === 'info' && (
          <div className="space-y-4">
            {gcInfo && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {gcInfo.imagen ? (
                    <img src={gcInfo.imagen} alt={gcInfo.nombre} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{gcInfo.nombre}</p>
                  <p className="text-sm text-white/60">Tu Game Changer</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2 text-sm text-white/70">
              <p>📞 Duración: 10 minutos</p>
              <p>🕐 Horario: 5:00 AM - 10:00 AM</p>
              <p>📱 Te llamarán al número registrado</p>
            </div>

            <Button 
              onClick={() => setStep('date')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Seleccionar Fecha
            </Button>
          </div>
        )}

        {/* Step: Date Selection */}
        {step === 'date' && (
          <div className="space-y-4">
            <button 
              onClick={() => setStep('info')}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>

            <p className="text-white/80 text-sm">Selecciona una fecha:</p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {getNextDays().map((date, i) => (
                <button
                  key={i}
                  onClick={() => handleDateSelect(date)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedDate?.toDateString() === date.toDateString()
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <span className="block text-xs uppercase">
                    {date.toLocaleDateString('es-MX', { weekday: 'short' })}
                  </span>
                  <span className="block text-lg font-bold">{date.getDate()}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Time Selection */}
        {step === 'time' && (
          <div className="space-y-4">
            <button 
              onClick={() => setStep('date')}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Cambiar fecha
            </button>

            <div className="flex items-center justify-between">
              <p className="text-white/80 text-sm">
                {selectedDate && formatDate(selectedDate)}
              </p>
            </div>

            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                <p className="text-white/60 text-sm mt-2">Cargando horarios...</p>
              </div>
            ) : error ? (
              <div className="py-4 text-center text-red-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-8 text-center text-white/60">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay horarios disponibles para esta fecha</p>
                <button 
                  onClick={() => setStep('date')}
                  className="mt-2 text-purple-400 text-sm hover:underline"
                >
                  Elegir otra fecha
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {availableSlots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => handleSlotSelect(slot)}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      selectedSlot?.time === slot.time
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {formatTime(slot.time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <button 
              onClick={() => setStep('time')}
              className="flex items-center gap-1 text-sm text-white/60 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Cambiar horario
            </button>

            <div className="p-4 rounded-lg bg-white/10 border border-white/20 space-y-3">
              <h4 className="text-white font-medium">Confirmar cita</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Fecha:</span>
                  <span className="text-white">{selectedDate && formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Hora:</span>
                  <span className="text-white">{selectedSlot && formatTime(selectedSlot.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Duración:</span>
                  <span className="text-white">10 minutos</span>
                </div>
                {gcInfo && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Game Changer:</span>
                    <span className="text-white">{gcInfo.nombre}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button 
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Cita
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h4 className="text-white font-medium text-lg">¡Cita Agendada!</h4>
              <p className="text-white/60 text-sm mt-1">
                {selectedDate && formatDate(selectedDate)} a las {selectedSlot && formatTime(selectedSlot.time)}
              </p>
            </div>
            <p className="text-white/70 text-sm">
              Tu Game Changer te llamará en el horario agendado. 
              Asegúrate de tener tu teléfono disponible.
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setStep('info');
                setSelectedDate(null);
                setSelectedSlot(null);
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Agendar otra llamada
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
