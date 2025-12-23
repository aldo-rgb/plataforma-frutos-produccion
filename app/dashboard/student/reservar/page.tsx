"use client";
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, UserCircle, Award, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import ResumenReservas from '@/components/dashboard/student/ResumenReservas';

export default function BookingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<{ time: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Control de acceso
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  // Mentor asignado
  const [mentorId, setMentorId] = useState<number | null>(null);
  const [mentorName, setMentorName] = useState<string>('');
  const [mentorDetails, setMentorDetails] = useState<any>(null);

  // Modales de confirmación y notificación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // Reservas recientes (con ventana de gracia de 1 hora)
  const [misReservas, setMisReservas] = useState<any[]>([]);

  // Verificar que solo PARTICIPANTE pueda acceder y obtener su mentor asignado
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        
        console.log('🔍 DEBUG - Datos del usuario:', data);
        console.log('🔍 DEBUG - Rol del usuario:', data.user?.rol);
        
        if (data.user?.rol === 'PARTICIPANTE') {
          setHasAccess(true);
          
          // Obtener el mentor asignado directamente del perfil
          if (data.user.assignedMentorId && data.user.assignedMentor) {
            setMentorId(data.user.assignedMentorId);
            setMentorName(data.user.assignedMentor.nombre || 'Mentor');
            // Cargar detalles completos del mentor
            loadMentorDetails(data.user.assignedMentorId);
          }
        } else {
          console.log('❌ DEBUG - Acceso denegado. Rol:', data.user?.rol);
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error verificando acceso:', error);
        setHasAccess(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAccess();
  }, []); 

  // Cargar detalles del mentor
  const loadMentorDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/student/mentor-details?mentorId=${id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('📋 Datos del mentor recibidos:', data);
        // El API devuelve { success: true, mentor: {...} }
        if (data.success && data.mentor) {
          setMentorDetails(data.mentor);
        } else {
          setMentorDetails(data);
        }
      }
    } catch (error) {
      console.error("Error cargando mentor", error);
    }
  };

  // Cargar huecos cuando cambia la fecha o se obtiene el mentorId
  useEffect(() => {
    if (mentorId) {
      loadSlots();
      loadMisReservas();
    }
  }, [selectedDate, mentorId]);

  const loadSlots = async () => {
    if (!mentorId) return;
    setLoading(true);
    // 🔥 Agregar type=DISCIPLINE para consultar el nuevo calendario
    const res = await fetch(`/api/student/booking/slots?date=${selectedDate}&mentorId=${mentorId}&type=DISCIPLINE`);
    const data = await res.json();
    setSlots(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  // Cargar reservas recientes (últimas 24 horas para mostrar ventana de gracia)
  const loadMisReservas = async () => {
    try {
      const res = await fetch('/api/student/booking/recent');
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        setMisReservas(data.bookings);
      }
    } catch (error) {
      console.error('Error cargando reservas:', error);
    }
  };

  const handleEliminarReserva = async (id: number) => {
    try {
      const res = await fetch(`/api/student/booking/${id}`, { 
        method: 'DELETE' 
      });
      const data = await res.json();

      if (res.ok) {
        // Actualizar UI
        setMisReservas(prev => prev.filter(r => r.id !== id));
        // Recargar slots disponibles
        await loadSlots();
        // Mostrar modal de éxito
        setShowDeleteSuccessModal(true);
        setTimeout(() => setShowDeleteSuccessModal(false), 3000);
      } else {
        setErrorMessage(data.error || "No se pudo borrar. El tiempo de edición ha expirado.");
        setShowErrorModal(true);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Error de conexión. Intenta nuevamente.");
      setShowErrorModal(true);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) return;

    // Mostrar modal de confirmación en lugar de confirm nativo
    setShowConfirmModal(true);
  };

  const confirmBooking = async () => {
    setShowConfirmModal(false);

    try {
      const res = await fetch('/api/student/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorId,
          date: selectedDate,
          time: selectedSlot,
          type: 'DISCIPLINE' // 🔥 Especificar que es una llamada de disciplina
        })
      });

      const data = await res.json();

      if (res.ok) {
        setShowSuccessModal(true);
        setSelectedSlot(null);
        // Recargar slots para reflejar el horario ocupado
        await loadSlots();
        // Recargar reservas para mostrar la nueva en el resumen
        await loadMisReservas();
      } else {
        // Mostrar modal de error con el mensaje específico
        setErrorMessage(data.error || "Ocurrió un error desconocido");
        setShowErrorModal(true);
        
        // Si el error fue "Ya ocupado" (409), recargamos los slots
        if (res.status === 409) {
          await loadSlots();
        }
      }
    } catch (error) {
      console.error("Error en reserva:", error);
      setErrorMessage("Error de conexión al servidor. Intenta nuevamente.");
      setShowErrorModal(true);
    }
  };

  // Mostrar pantalla de carga mientras verifica
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de acceso denegado si no es PARTICIPANTE
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border-2 border-red-500/30 text-center">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-slate-300 mb-6">
            Esta sección es exclusiva para <span className="font-bold text-purple-400">Participantes</span>.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no tiene mentor asignado
  if (!checkingAuth && !mentorId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border-2 border-yellow-500/30 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Sin Mentor Asignado</h2>
          <p className="text-slate-300 mb-6">
            Aún no tienes un mentor asignado. Por favor contacta al coordinador para que te asignen uno.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-purple-500/20 p-3 rounded-xl">
                  <Calendar className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirmar Reserva</h3>
                  <p className="text-sm text-slate-400">Verifica los detalles</p>
                </div>
              </div>
              
              <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">📅 Fecha y hora:</p>
                <p className="text-lg font-bold text-white mb-3">
                  {(() => {
                    // Parsear fecha correctamente para evitar problemas de zona horaria
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return format(localDate, "EEEE d 'de' MMMM", { locale: es });
                  })()}
                </p>
                <p className="text-2xl font-bold text-purple-400">{selectedSlot}</p>
                <p className="text-sm text-slate-500 mt-3">⏱️ Duración: 15 minutos</p>
              </div>

              <p className="text-slate-300 text-sm mb-6">
                ¿Confirmas tu reserva para esta llamada con <span className="font-bold text-purple-400">{mentorName}</span>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBooking}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/30"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-green-900/90 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-green-500/30 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">¡Reserva Exitosa!</h3>
              <p className="text-green-300 text-lg mb-4">Nos vemos en la llamada</p>
              
              <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">📅 Agendado para:</p>
                <p className="text-lg font-bold text-white">
                  {(() => {
                    // Parsear fecha correctamente para evitar problemas de zona horaria
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return format(localDate, "EEEE d 'de' MMMM", { locale: es });
                  })()}
                </p>
                <p className="text-xl font-bold text-green-400 mt-2">{selectedSlot}</p>
              </div>

              <p className="text-slate-300 text-sm mb-6">
                Recibirás un recordatorio antes de la llamada. ¡No faltes! 💪
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-red-900/90 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">No se pudo reservar</h3>
              <p className="text-red-300 text-sm mb-6">{errorMessage}</p>

              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-white mb-8">📅 Agendar Llamada Semanal</h1>

      {/* Tarjeta del Mentor Asignado */}
      {mentorDetails ? (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl border border-purple-500/30 shadow-xl mb-8 flex items-center gap-6 animate-fadeIn">
          {/* Foto del Mentor */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 shadow-lg">
              {mentorDetails.profileImage ? (
                <img 
                  src={mentorDetails.profileImage} 
                  alt={mentorDetails.nombre} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-slate-600 flex items-center justify-center">
                  <UserCircle className="w-16 h-16 text-slate-400" />
                </div>
              )}
            </div>
            {/* Badge de Experiencia */}
            {mentorDetails.experienceYears > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-slate-900 flex items-center gap-1">
                <Award className="w-3 h-3" />
                {mentorDetails.experienceYears} años
              </div>
            )}
          </div>

          {/* Detalles */}
          <div>
            <h2 className="text-sm text-purple-400 font-bold tracking-wider uppercase mb-1">
              Tu Mentor Asignado
            </h2>
            <h3 className="text-2xl font-bold text-white mb-2">{mentorDetails.nombre}</h3>
            <p className="text-slate-300 flex items-center gap-2">
              <span className="bg-slate-700/50 px-3 py-1 rounded-lg text-sm">
                {mentorDetails.jobTitle || "Experto de la plataforma"}
              </span>
            </p>
            {mentorDetails.bioShort && (
              <p className="text-slate-400 text-sm mt-2 italic">
                "{mentorDetails.bioShort}"
              </p>
            )}
          </div>
        </div>
      ) : (
        // Skeleton loading
        <div className="bg-slate-800 h-36 rounded-2xl mb-8 animate-pulse"></div>
      )}

      <p className="text-slate-400 mb-8">
        Selecciona un hueco disponible con tu mentor <span className="font-bold text-purple-400">{mentorName}</span>. 
        Recuerda que la llamada dura 15 minutos exactos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: Selector de Fecha */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit">
          <label className="block text-slate-300 font-bold mb-4">1. Elige el Día</label>
          <input 
            type="date" 
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlot(null); // Reset slot al cambiar día
            }}
            className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-4">
            Solo se muestran días donde tu mentor ha habilitado disponibilidad.
          </p>
        </div>

        {/* COLUMNA 2: Grid de Horarios */}
        <div className="md:col-span-2">
          <label className="block text-slate-300 font-bold mb-4">2. Elige la Hora (15 min)</label>
          
          {loading ? (
            <div className="text-slate-500 animate-pulse">Buscando espacios libres...</div>
          ) : slots.length === 0 ? (
            <div className="p-8 bg-slate-800/50 rounded-xl border border-dashed border-slate-600 text-center text-slate-400">
              😴 No hay horarios disponibles para este día. Prueba otra fecha.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`py-3 px-2 rounded-lg font-medium transition-all text-sm border ${
                    selectedSlot === slot.time
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-purple-500/50 hover:bg-slate-750'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}

          {/* COLUMNA 3 (Implicit): Botón de Acción */}
          {selectedSlot && (
            <div className="mt-8 pt-8 border-t border-slate-800 animate-fadeIn">
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-purple-500/30">
                <div>
                  <p className="text-sm text-slate-400">Resumen de Reserva:</p>
                  <p className="text-lg font-bold text-white">
                    {(() => {
                      // Parsear fecha correctamente para evitar problemas de zona horaria
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      const localDate = new Date(year, month - 1, day);
                      return format(localDate, "EEEE d 'de' MMMM", { locale: es });
                    })()} — {selectedSlot}
                  </p>
                </div>
                <button 
                  onClick={handleBooking}
                  className="bg-white text-slate-900 hover:bg-slate-200 px-6 py-3 rounded-lg font-bold shadow-lg transition-colors"
                >
                  Confirmar Reserva
                </button>
              </div>
            </div>
          )}

          {/* SECCIÓN: Resumen de Reservas Recientes (Ventana de Gracia) */}
          <ResumenReservas 
            reservas={misReservas} 
            onEliminar={handleEliminarReserva}
          />
        </div>

        {/* MODAL DE ÉXITO - HORARIO LIBERADO */}
        {showDeleteSuccessModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">¡Horario Liberado!</h3>
              <p className="text-green-50 text-lg mb-2">
                La reserva ha sido eliminada exitosamente
              </p>
              <p className="text-green-100 text-sm">
                Ahora puedes seleccionar un nuevo horario disponible
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
