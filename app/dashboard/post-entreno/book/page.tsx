'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Phone,
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AvailableSlot {
  time: string;
  availabilityId: string;
}

interface GCInfo {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface ExistingBooking {
  id: string;
  date: string;
  time: string;
  status: string;
}

const REQUIRED_POST_ENTRENO_CALLS = 2; // Llamadas post-entreno requeridas

export default function BookPostEntrenoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gc, setGC] = useState<GCInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [allBooked, setAllBooked] = useState(false); // Solo true cuando se completan las 2 llamadas
  const [justBooked, setJustBooked] = useState(false); // Para feedback visual al agendar

  useEffect(() => {
    fetchGCInfo();
  }, []);

  const fetchGCInfo = async () => {
    try {
      const res = await fetch('/api/gc-calls/my-gc');
      const data = await res.json();

      if (data.success && data.hasGC) {
        setGC(data.gameChanger);
        // Buscar si ya tiene una llamada agendada
        fetchExistingBooking();
        // Cargar slots para la fecha actual
        fetchSlots(data.gameChanger.id, selectedDate);
      } else {
        setError('No tienes un Game Changer asignado');
      }
    } catch (err) {
      console.error('Error fetching GC info:', err);
      setError('Error al cargar información');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingBooking = async () => {
    try {
      const res = await fetch('/api/gc-calls/my-post-entreno-all');
      const data = await res.json();
      
      if (data.success && data.bookings) {
        setExistingBookings(data.bookings);
        // Si ya tiene las 2 llamadas requeridas, mostrar pantalla de completado
        if (data.bookings.length >= REQUIRED_POST_ENTRENO_CALLS) {
          setAllBooked(true);
        }
      }
    } catch (err) {
      console.error('Error fetching existing bookings:', err);
    }
  };

  const fetchSlots = useCallback(async (gcId: number, date: Date) => {
    setLoadingSlots(true);
    setError(null);
    
    try {
      const dateStr = date.toISOString().split('T')[0];
      const res = await fetch(`/api/gc-calls/slots?gameChangerId=${gcId}&date=${dateStr}`);
      const data = await res.json();

      if (data.success) {
        // Filtrar slots que NO estén en horario de staff (7:00-9:30)
        const postEntrenoSlots = (data.availableSlots || []).filter((slot: AvailableSlot) => {
          const hour = parseInt(slot.time.split(':')[0]);
          return hour < 7 || hour >= 10; // Fuera del rango 7:00-9:59
        });
        setAvailableSlots(postEntrenoSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (gc) {
      fetchSlots(gc.id, selectedDate);
    }
  }, [gc, selectedDate, fetchSlots]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    
    // No permitir fechas en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate >= today) {
      setSelectedDate(newDate);
    }
  };

  const handleBookSlot = async (slot: AvailableSlot) => {
    if (!gc) return;
    
    setBooking(true);
    setError(null);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch('/api/gc-calls/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: slot.availabilityId,
          date: dateStr,
          time: slot.time,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Actualizar la lista de bookings
        const newBooking = {
          id: data.booking?.id || data.slot?.id,
          date: dateStr,
          time: slot.time,
          status: 'SCHEDULED',
        };
        const updatedBookings = [...existingBookings, newBooking];
        setExistingBookings(updatedBookings);
        
        // Si ya tiene las 2 llamadas requeridas, mostrar pantalla final
        if (updatedBookings.length >= REQUIRED_POST_ENTRENO_CALLS) {
          setAllBooked(true);
        } else {
          // Feedback visual y avanzar al siguiente día
          setJustBooked(true);
          setTimeout(() => {
            setJustBooked(false);
            // Mover al siguiente día
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            setSelectedDate(nextDate);
          }, 1200);
        }
      } else {
        setError(data.error || 'Error al agendar');
      }
    } catch (err) {
      console.error('Error booking slot:', err);
      setError('Error de conexión');
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  
  // Verificar si el día seleccionado ya tiene una llamada agendada
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const hasBookingOnSelectedDate = existingBookings.some(b => b.date === selectedDateStr);
  
  // Verificar cuántas llamadas faltan
  const remainingCalls = REQUIRED_POST_ENTRENO_CALLS - existingBookings.length;
  const hasCompletedAll = existingBookings.length >= REQUIRED_POST_ENTRENO_CALLS;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Pantalla final cuando se completan las 2 llamadas
  if (allBooked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-green-500/30 rounded-2xl p-8 text-center max-w-md"
        >
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">¡Llamadas Agendadas!</h2>
          <p className="text-slate-400 mb-4">
            Tus llamadas post-entreno han sido programadas exitosamente.
          </p>
          
          {/* Mostrar las 2 fechas agendadas */}
          <div className="space-y-3 mt-6">
            {existingBookings.map((booking, idx) => (
              <div key={booking.id} className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-xs text-green-400 mb-1">Llamada {idx + 1}</p>
                <p className="text-lg text-white font-medium">
                  {new Date(booking.date + 'T12:00:00').toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })} a las {booking.time}
                </p>
              </div>
            ))}
          </div>
          
          <Link href="/dashboard">
            <Button className="mt-6 bg-green-600 hover:bg-green-700 text-white">
              Ir al Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Agendar Llamada Post-Entreno</h1>
                <p className="text-gray-400 text-sm">Selecciona fecha y hora para tu llamada</p>
              </div>
            </div>

            {/* GC Info */}
            {gc && (
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                {gc.imagen ? (
                  <img src={gc.imagen} alt={gc.nombre} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{gc.nombre}</p>
                  <p className="text-xs text-slate-400">Tu Game Changer</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Bookings Alert */}
        {existingBookings.length > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-300">
                    {existingBookings.length === 1 
                      ? '¡Primera llamada agendada! Falta 1 más'
                      : `Llamadas agendadas (${existingBookings.length}/${REQUIRED_POST_ENTRENO_CALLS})`
                    }
                  </p>
                  <div className="mt-2 space-y-1">
                    {existingBookings.map((booking, idx) => (
                      <p key={booking.id} className="text-xs text-amber-400/70">
                        {idx + 1}. {new Date(booking.date + 'T12:00:00').toLocaleDateString('es-MX', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })} a las {booking.time}
                      </p>
                    ))}
                  </div>
                  {remainingCalls > 0 && (
                    <p className="text-xs text-amber-300 mt-2 font-medium">
                      👉 Selecciona otro día para tu {existingBookings.length === 0 ? 'primera' : 'segunda'} llamada
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Selection */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Selecciona la fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => changeDate(-1)}
                disabled={isToday}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10 min-w-[200px] justify-center">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span className="font-medium text-white capitalize">
                  {isToday ? 'Hoy' : ''} {formatDate(selectedDate)}
                </span>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => changeDate(1)}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Horarios disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay horarios disponibles para esta fecha</p>
                <p className="text-sm text-slate-500 mt-1">Intenta seleccionar otro día</p>
              </div>
            ) : hasCompletedAll ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-400 font-medium">¡Ya tienes tus {REQUIRED_POST_ENTRENO_CALLS} llamadas agendadas!</p>
                <p className="text-sm text-slate-400 mt-1">Has completado tu agenda post-entreno</p>
                <Link href="/dashboard">
                  <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                    Ir al Dashboard
                  </Button>
                </Link>
              </div>
            ) : justBooked ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="mb-4"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                </motion.div>
                <p className="text-green-400 font-medium">¡Primera llamada agendada!</p>
                <p className="text-sm text-amber-400 mt-2">Seleccionando siguiente día...</p>
              </div>
            ) : hasBookingOnSelectedDate ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-amber-400 font-medium">Ya tienes una llamada este día</p>
                <p className="text-sm text-slate-400 mt-1">Selecciona otro día para tu segunda llamada</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableSlots.map((slot) => (
                  <motion.button
                    key={slot.time}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBookSlot(slot)}
                    disabled={booking}
                    className={`p-3 rounded-xl text-center transition-all bg-slate-800 text-white hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-700 ${booking ? 'opacity-50' : ''}`}
                  >
                    <span className="text-lg font-mono font-bold">{slot.time}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
