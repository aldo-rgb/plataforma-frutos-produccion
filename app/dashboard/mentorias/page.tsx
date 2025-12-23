'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Star, Award, Briefcase, X, Check, AlertCircle, Info } from 'lucide-react';
import { generarSlotsHorarios, esDiaDisponible, formatearHora12, obtenerNombreDia, POLITICA_SESION, type TimeSlot } from '@/utils/horarios';

interface Mentor {
  id: number;
  usuarioId: number;
  nombre: string;
  imagen: string;
  nivel: 'JUNIOR' | 'SENIOR' | 'MASTER';
  titulo: string | null;
  especialidad: string;
  especialidadesSecundarias: string[];
  biografia: string | null;
  biografiaCorta: string | null;
  biografiaCompleta: string | null;
  logros: string[];
  badges: string[];
  experienciaAnios: number;
  totalSesiones: number;
  calificacionPromedio: number;
  totalResenas: number;
  destacado: boolean;
  precioBase: number;
  servicios: Servicio[];
  horarioInicio?: string;
  horarioFin?: string;
  diasDisponibles?: number[];
}

interface Servicio {
  id: number;
  tipo: string;
  nombre: string;
  descripcion: string | null;
  duracionHoras: number;
  precioTotal: number;
}

export default function MentoriasPage() {
  const router = useRouter();
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('TODOS');
  const [mentorSeleccionado, setMentorSeleccionado] = useState<Mentor | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modoHeroe, setModoHeroe] = useState(false); // Modo un solo mentor
  
  // Estado del formulario de solicitud
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [fechaSolicitada, setFechaSolicitada] = useState('');
  const [horaSolicitada, setHoraSolicitada] = useState('');
  const [horariosDisponibles, setHorariosDisponibles] = useState<TimeSlot[]>([]);
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadMentores();
  }, []);

  // Generar horarios disponibles cuando cambie la fecha
  useEffect(() => {
    if (!fechaSolicitada || !mentorSeleccionado) {
      setHorariosDisponibles([]);
      setHoraSolicitada('');
      return;
    }

    // Cargar slots reales desde el API (considera reservas y excepciones)
    const cargarSlotsDisponibles = async () => {
      try {
        // Extraer año y mes de la fecha seleccionada
        const fecha = new Date(fechaSolicitada);
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        
        const res = await fetch(`/api/mentor/disponibilidad/slots?mentorId=${mentorSeleccionado.usuarioId}&mes=${mes}&tipo=MENTORSHIP`);
        const data = await res.json();
        
        if (data.success && Array.isArray(data.slots)) {
          // Filtrar solo los slots del día seleccionado
          const diaSeleccionado = fechaSolicitada; // YYYY-MM-DD
          const slotsDelDia = data.slots.filter((slot: any) => {
            const fechaSlot = slot.fecha.split('T')[0]; // Extraer solo la fecha
            return fechaSlot === diaSeleccionado;
          });
          
          // Convertir al formato TimeSlot esperado (inicio, fin, display)
          const slots: TimeSlot[] = slotsDelDia.map((slot: any) => {
            const horaInicio = slot.hora; // "11:00"
            const [hora, min] = horaInicio.split(':').map(Number);
            const horaFin = `${String(hora + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}`; // +1 hora
            
            return {
              inicio: horaInicio,
              fin: horaFin,
              display: `${horaInicio} - ${horaFin}`
            };
          });
          
          setHorariosDisponibles(slots);
        } else {
          // Si no hay slots disponibles, mostrar array vacío
          setHorariosDisponibles([]);
        }
      } catch (error) {
        console.error('Error cargando slots disponibles:', error);
        setHorariosDisponibles([]);
      }
    };

    cargarSlotsDisponibles();
    setHoraSolicitada(''); // Resetear selección
  }, [fechaSolicitada, mentorSeleccionado]);

  const loadMentores = async () => {
    try {
      const res = await fetch('/api/mentorias/mentores');
      const data = await res.json();
      if (data.mentores) {
        setMentores(data.mentores);
        
        // 🔥 LÓGICA DE MODO HÉROE: Si solo hay 1 mentor, activar vista directa
        if (data.mentores.length === 1) {
          setModoHeroe(true);
          setMentorSeleccionado(data.mentores[0]);
          setServicioSeleccionado(data.mentores[0].servicios[0] || null);
        }
      }
    } catch (error) {
      console.error('Error al cargar mentores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNivelBadge = (nivel: string) => {
    const badges = {
      JUNIOR: { color: 'bg-blue-500', text: 'Junior Mentor' },
      SENIOR: { color: 'bg-purple-500', text: 'Senior Mentor' },
      MASTER: { color: 'bg-amber-500', text: 'Master Mentor' },
    };
    return badges[nivel as keyof typeof badges] || badges.JUNIOR;
  };

  const getBadgeStyles = (badgeName: string) => {
    const badgeStyles: { [key: string]: { bg: string; icon: string; border: string } } = {
      'Flash': { bg: 'bg-yellow-500', icon: '⚡', border: 'border-yellow-400' },
      'Inquebrantable': { bg: 'bg-red-500', icon: '🛡️', border: 'border-red-400' },
      'Club 5 AM': { bg: 'bg-orange-500', icon: '☀️', border: 'border-orange-400' },
      'Zen Master': { bg: 'bg-green-500', icon: '🧘', border: 'border-green-400' },
    };
    return badgeStyles[badgeName] || { bg: 'bg-slate-500', icon: '🏆', border: 'border-slate-400' };
  };

  const mentoresFiltrados = mentores.filter((m) => {
    if (filtro === 'TODOS') return true;
    return m.nivel === filtro;
  });

  const abrirModal = (mentor: Mentor) => {
    setMentorSeleccionado(mentor);
    setServicioSeleccionado(mentor.servicios[0] || null);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setMentorSeleccionado(null);
    setServicioSeleccionado(null);
    setFechaSolicitada('');
    setHoraSolicitada('');
    setNotas('');
  };

  const solicitarMentoria = async () => {
    if (!mentorSeleccionado || !servicioSeleccionado) return;

    setProcesando(true);
    try {
      // Proceder directamente con la solicitud (sin restricción de sesiones activas)
      const res = await fetch('/api/mentorias/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perfilMentorId: mentorSeleccionado.id,
          servicioId: servicioSeleccionado.id,
          fechaSolicitada,
          horaSolicitada,
          notas,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          cerrarModal();
          setShowSuccess(false);
          // Redirigir a mis sesiones después de crear la solicitud
          router.push('/dashboard/student/mis-sesiones');
        }, 2000);
      } else {
        // Manejar errores específicos con mensajes mejorados
        if (data.code === 'MISSING_DATETIME') {
          alert('⚠️ Por favor selecciona una fecha y hora específica para tu sesión.');
        } else if (data.code === 'MENTOR_SLOT_TAKEN') {
          alert(`❌ ${data.error}\n\n💡 ${data.suggestion || 'Intenta con otro horario'}`);
          // Recargar horarios disponibles
          setFechaSolicitada('');
          setHoraSolicitada('');
        } else if (data.code === 'STUDENT_TIME_CONFLICT') {
          alert(`⚠️ ${data.error}\n\n💡 ${data.suggestion || 'Elige otro horario'}`);
        } else {
          alert('Error al procesar solicitud: ' + (data.error || 'Error desconocido'));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // 🎯 MODO HÉROE: Vista directa para UN solo mentor
  if (modoHeroe && mentorSeleccionado) {
    const badge = getNivelBadge(mentorSeleccionado.nivel);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            {/* Botón Ver Mis Llamadas */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => router.push('/dashboard/student/mis-sesiones')}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/50"
              >
                <Calendar size={20} />
                Ver Mis Llamadas Agendadas
              </button>
            </div>
            
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">
                Mentoría Especializada con {mentorSeleccionado.nombre}
              </h1>
              {mentorSeleccionado.titulo && (
                <p className="text-purple-400 text-xl mb-2">
                  {mentorSeleccionado.titulo}
                </p>
              )}
              <p className="text-slate-400 text-lg">
                Reserva tu sesión en minutos
              </p>
            </div>
          </div>

          {/* Grid 2 Columnas */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* COLUMNA IZQUIERDA: Perfil del Mentor */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
              
              {/* Foto Grande */}
              <div className="relative mb-6">
                <img
                  src={mentorSeleccionado.imagen || '/default-avatar.png'}
                  alt={mentorSeleccionado.nombre}
                  className="w-full h-64 object-cover rounded-xl shadow-2xl"
                />
                <div className="absolute top-4 right-4">
                  <span className={`${badge.color} text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg`}>
                    <Award size={16} />
                    {badge.text}
                  </span>
                </div>
                {mentorSeleccionado.destacado && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                      <Award size={16} />
                      DESTACADO
                    </span>
                  </div>
                )}
              </div>

              {/* Info del Mentor */}
              <h2 className="text-3xl font-bold text-white mb-2">
                {mentorSeleccionado.nombre}
              </h2>
              <p className="text-purple-400 text-lg font-medium mb-4">
                {mentorSeleccionado.especialidad}
              </p>

              {/* Badges personalizados */}
              {mentorSeleccionado.badges && mentorSeleccionado.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {mentorSeleccionado.badges.map((badge, index) => {
                    const style = getBadgeStyles(badge);
                    return (
                      <span
                        key={index}
                        className={`${style.bg} text-white text-sm font-bold px-4 py-2 rounded-full border ${style.border} shadow-lg flex items-center gap-2`}
                      >
                        <span className="text-lg">{style.icon}</span>
                        {badge}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Tags de especialidades secundarias */}
              {mentorSeleccionado.especialidadesSecundarias && mentorSeleccionado.especialidadesSecundarias.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {mentorSeleccionado.especialidadesSecundarias.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-slate-700 text-slate-300 text-sm px-3 py-1 rounded-full border border-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Calificación */}
              <div className="flex items-center gap-2 mb-6">
                {[1,2,3,4,5].map((i) => (
                  <Star 
                    key={i} 
                    size={20} 
                    className="text-amber-500 fill-amber-500" 
                  />
                ))}
                <span className="text-white font-bold ml-2">
                  {mentorSeleccionado.calificacionPromedio.toFixed(1)}/5
                </span>
                <span className="text-slate-400">
                  ({mentorSeleccionado.totalResenas} reseñas)
                </span>
              </div>

              {/* Biografía Completa (prioridad) o Biografía corta */}
              {(mentorSeleccionado.biografiaCompleta || mentorSeleccionado.biografiaCorta || mentorSeleccionado.biografia) && (
                <div className="mb-6">
                  <h3 className="text-white font-bold mb-3 text-lg">Acerca de mí</h3>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {mentorSeleccionado.biografiaCompleta || mentorSeleccionado.biografiaCorta || mentorSeleccionado.biografia}
                  </p>
                </div>
              )}

              {/* Logros Destacados (dinámicos desde DB) */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-lg">
                  <Award size={20} className="text-amber-400" />
                  Logros Destacados
                </h3>
                <div className="space-y-3 text-slate-300">
                  {/* Logros personalizados desde DB */}
                  {mentorSeleccionado.logros && mentorSeleccionado.logros.length > 0 ? (
                    mentorSeleccionado.logros.map((logro, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-purple-400 mt-1">✓</span>
                        <span>{logro}</span>
                      </div>
                    ))
                  ) : (
                    /* Logros por defecto si no hay en DB */
                    <>
                      <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-purple-400" />
                        <span>{mentorSeleccionado.experienciaAnios} años de experiencia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award size={16} className="text-amber-400" />
                        <span>+{mentorSeleccionado.totalSesiones || mentorSeleccionado.totalResenas} sesiones exitosas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-blue-400" />
                        <span>Rating {mentorSeleccionado.calificacionPromedio.toFixed(1)}/5</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: Formulario de Reserva */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar size={24} className="text-purple-400" />
                Reserva tu Sesión
              </h2>

              {/* Selector de Servicio */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Selecciona un servicio
                </label>
                <div className="space-y-3">
                  {mentorSeleccionado.servicios.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => setServicioSeleccionado(servicio)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        servicioSeleccionado?.id === servicio.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-white">{servicio.nombre}</span>
                        <span className="text-xl font-bold text-purple-400">
                          ${servicio.precioTotal.toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        {servicio.descripcion || 'Sin descripción'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} />
                        <span>{servicio.duracionHoras} hora{servicio.duracionHoras > 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Elige Fecha y Hora
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="date"
                      value={fechaSolicitada}
                      onChange={(e) => setFechaSolicitada(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="time"
                      value={horaSolicitada}
                      onChange={(e) => setHoraSolicitada(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  ¿Que tema te interesa compartir?
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="¿En qué te gustaría enfocarte?"
                />
              </div>

              {/* Resumen de Pago */}
              {servicioSeleccionado && (
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Total a Pagar</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-slate-300 text-sm">{servicioSeleccionado.nombre}</p>
                      <p className="text-slate-400 text-xs">{servicioSeleccionado.duracionHoras}h de mentoría</p>
                    </div>
                    <span className="text-4xl font-bold text-purple-400">
                      ${servicioSeleccionado.precioTotal.toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
              )}

              {/* Botón de Pago - 🛡️ VALIDACIÓN: Requiere fecha y hora */}
              <button
                onClick={solicitarMentoria}
                disabled={procesando || !servicioSeleccionado || !fechaSolicitada || !horaSolicitada}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg shadow-purple-900/50"
              >
                {procesando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check size={24} />
                    Pagar y Agendar
                  </>
                )}
              </button>
              
              {/* Mensaje de ayuda si falta fecha/hora */}
              {servicioSeleccionado && (!fechaSolicitada || !horaSolicitada) && (
                <p className="text-center text-amber-400 text-sm mt-2 flex items-center justify-center gap-2">
                  <AlertCircle size={16} />
                  Selecciona fecha y hora para continuar
                </p>
              )}

              {/* Garantía */}
              <p className="text-center text-slate-400 text-xs mt-4">
                🔒 Pago seguro • Reembolso garantizado • Confirmación inmediata
              </p>
            </div>

          </div>

        </div>

        {/* Animación de Éxito (reutilizada) */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-8 text-center shadow-2xl animate-bounce-slow">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={40} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
              <p className="text-green-100">
                {mentorSeleccionado.nombre} se pondrá en contacto contigo pronto
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 📋 MODO CATÁLOGO: Vista para múltiples mentores

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              👋 Encuentra a tu Mentor Ideal
            </h1>
            <p className="text-slate-400 text-lg">
              Conecta con expertos que te llevarán al siguiente nivel
            </p>
          </div>
          
          {/* Botón Ver Mis Llamadas */}
          <button
            onClick={() => router.push('/dashboard/student/mis-sesiones')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/50 whitespace-nowrap"
          >
            <Calendar size={20} />
            Mis Llamadas Agendadas
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-3">
          {['TODOS', 'JUNIOR', 'SENIOR', 'MASTER'].map((nivel) => (
            <button
              key={nivel}
              onClick={() => setFiltro(nivel)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filtro === nivel
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {nivel === 'TODOS' ? 'Todos' : nivel.charAt(0) + nivel.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Mentores */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentoresFiltrados.map((mentor) => {
          const badge = getNivelBadge(mentor.nivel);
          return (
            <div
              key={mentor.id}
              className={`bg-slate-800 rounded-xl border overflow-hidden hover:border-purple-500 transition-all hover:shadow-xl hover:shadow-purple-900/20 ${
                mentor.destacado 
                  ? 'border-amber-500 ring-2 ring-amber-500/30' 
                  : 'border-slate-700'
              }`}
            >
              {/* Header con foto */}
              <div className="relative h-40 bg-gradient-to-br from-purple-600 to-blue-600">
                {/* Badge destacado */}
                {mentor.destacado && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Award size={12} />
                      DESTACADO
                    </span>
                  </div>
                )}
                
                <div className="absolute -bottom-12 left-6">
                  <img
                    src={mentor.imagen || '/default-avatar.png'}
                    alt={mentor.nombre}
                    className="w-24 h-24 rounded-full border-4 border-slate-800 object-cover shadow-xl"
                  />
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`${badge.color} text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1`}>
                    <Award size={12} />
                    {badge.text}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="pt-16 px-6 pb-6">
                <h3 className="text-xl font-bold text-white mb-1">{mentor.nombre}</h3>
                
                {/* Título profesional */}
                {mentor.titulo && (
                  <p className="text-slate-400 text-sm mb-2 italic">{mentor.titulo}</p>
                )}
                
                <p className="text-purple-400 text-sm font-medium mb-3">{mentor.especialidad}</p>

                {/* Biografía corta */}
                {mentor.biografiaCorta && (
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                    {mentor.biografiaCorta}
                  </p>
                )}

                {/* Badges personalizados */}
                {mentor.badges && mentor.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {mentor.badges.map((badge, index) => {
                      const style = getBadgeStyles(badge);
                      return (
                        <span
                          key={index}
                          className={`${style.bg} text-white text-xs font-bold px-3 py-1 rounded-full border ${style.border} shadow-md flex items-center gap-1`}
                        >
                          <span>{style.icon}</span>
                          {badge}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Tags de especialidades secundarias */}
                {mentor.especialidadesSecundarias && mentor.especialidadesSecundarias.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mentor.especialidadesSecundarias.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="bg-slate-700/50 text-slate-300 text-xs px-2 py-1 rounded-full border border-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {mentor.especialidadesSecundarias.length > 2 && (
                      <span className="text-slate-400 text-xs py-1">
                        +{mentor.especialidadesSecundarias.length - 2} más
                      </span>
                    )}
                  </div>
                )}

                {/* Stats mejorados */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-900/50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <Briefcase size={12} />
                      Experiencia
                    </div>
                    <div className="text-white font-bold">{mentor.experienciaAnios} años</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      Rating
                    </div>
                    <div className="text-white font-bold">
                      {mentor.calificacionPromedio.toFixed(1)}
                      <span className="text-slate-400 text-xs ml-1">
                        ({mentor.totalResenas})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Precio desde */}
                <div className="mb-4 p-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-lg">
                  <p className="text-slate-400 text-xs mb-1">Precio desde</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-purple-400">
                      ${mentor.precioBase.toLocaleString('es-MX')}
                    </span>
                    <span className="text-slate-400 text-sm">/ sesión</span>
                  </div>
                </div>

                {/* Botón llamativo */}
                <button
                  onClick={() => abrirModal(mentor)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/50"
                >
                  <Calendar size={18} />
                  Ver Perfil Completo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado vacío */}
      {mentoresFiltrados.length === 0 && (
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-slate-400 text-lg">No hay mentores disponibles con este filtro</p>
        </div>
      )}

      {/* Modal de Configuración */}
      {showModal && mentorSeleccionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            
            {/* Header del Modal */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-start z-10">
              <div className="flex items-center gap-4">
                <img
                  src={mentorSeleccionado.imagen}
                  alt={mentorSeleccionado.nombre}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">{mentorSeleccionado.nombre}</h2>
                  <p className="text-purple-400">{mentorSeleccionado.especialidad}</p>
                </div>
              </div>
              <button
                onClick={cerrarModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body del Modal */}
            <div className="p-6 space-y-6">
              
              {/* Selector de Servicio */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3">
                  Tipo de Servicio
                </label>
                <div className="space-y-3">
                  {mentorSeleccionado.servicios.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => setServicioSeleccionado(servicio)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        servicioSeleccionado?.id === servicio.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-white">{servicio.nombre}</span>
                        <span className="text-xl font-bold text-purple-400">
                          ${servicio.precioTotal.toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        {servicio.descripcion || 'Sin descripción'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} />
                        <span>{servicio.duracionHoras} hora{servicio.duracionHoras > 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Fecha Preferida
                  </label>
                  <input
                    type="date"
                    value={fechaSolicitada}
                    onChange={(e) => setFechaSolicitada(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  />
                  {fechaSolicitada && mentorSeleccionado && (
                    <p className="text-xs text-slate-400 mt-1">
                      {obtenerNombreDia(new Date(fechaSolicitada + 'T00:00:00'))}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Horario Disponible
                  </label>
                  {!fechaSolicitada ? (
                    <div className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Selecciona una fecha primero
                    </div>
                  ) : horariosDisponibles.length === 0 ? (
                    <div className="w-full bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Este día no está disponible
                    </div>
                  ) : (
                    <select
                      value={horaSolicitada}
                      onChange={(e) => setHoraSolicitada(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Selecciona un horario</option>
                      {horariosDisponibles.map((slot) => (
                        <option key={slot.inicio} value={slot.inicio}>
                          {formatearHora12(slot.inicio)} - {formatearHora12(slot.fin)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Política de Tiempo */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-300 mb-1">
                      Política de Tiempo de Sesión
                    </h4>
                    <p className="text-xs text-blue-200/80 leading-relaxed">
                      {POLITICA_SESION.mensaje}
                    </p>
                    <div className="mt-2 text-xs text-blue-300 font-medium">
                      ⏱️ Duración: {POLITICA_SESION.duracionSesion} min de sesión - Maximo {POLITICA_SESION.tiempoEspera} min de demora
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas adicionales */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  ¿Que tema te interesa compartir?
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Ej: Me gustaría enfocarme en estrategias de crecimiento..."
                />
              </div>

              {/* Resumen de Pago */}
              {servicioSeleccionado && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Resumen de Pago</h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                      <span>Servicio:</span>
                      <span className="font-medium">{servicioSeleccionado.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duración:</span>
                      <span className="font-medium">{servicioSeleccionado.duracionHoras}h</span>
                    </div>
                    <div className="border-t border-slate-700 pt-3 mt-3"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">Total a Pagar:</span>
                      <span className="text-3xl font-bold text-purple-400">
                        ${servicioSeleccionado.precioTotal.toLocaleString('es-MX')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones - 🛡️ VALIDACIÓN: Requiere fecha y hora */}
              <div className="flex gap-3">
                <button
                  onClick={cerrarModal}
                  disabled={procesando}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={solicitarMentoria}
                  disabled={procesando || !servicioSeleccionado || !fechaSolicitada || !horaSolicitada}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {procesando ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Confirmar y Pagar
                    </>
                  )}
                </button>
              </div>
              
              {/* Mensaje de ayuda si falta fecha/hora */}
              {servicioSeleccionado && (!fechaSolicitada || !horaSolicitada) && (
                <p className="text-center text-amber-400 text-sm mt-2 flex items-center justify-center gap-2">
                  <AlertCircle size={16} />
                  Selecciona fecha y hora para continuar
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Animación de Éxito */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-8 text-center shadow-2xl animate-bounce-slow">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
            <p className="text-green-100">
              El mentor se pondrá en contacto contigo pronto
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
