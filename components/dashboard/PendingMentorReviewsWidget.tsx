'use client';

import { useState, useEffect } from 'react';
import { Star, X, Sparkles, MessageSquare, CheckCircle } from 'lucide-react';

interface NotificacionCalificacion {
  mentorId: number;
  mentorNombre: string;
  mentorImagen: string | null;
  mentorTitulo: string;
  mentorEspecialidad: string;
  mentorRating: number;
  perfilMentorId: number;
  visionNombre: string;
  totalSesiones: number;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  mensaje: string;
}

export default function PendingMentorReviewsWidget() {
  const [notificaciones, setNotificaciones] = useState<NotificacionCalificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mentorSeleccionado, setMentorSeleccionado] = useState<NotificacionCalificacion | null>(null);
  const [calificacion, setCalificacion] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comentario, setComentario] = useState('');
  const [sharedResources, setSharedResources] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/participante/pending-mentor-reviews');
      
      if (!res.ok) {
        // No lanzar error, simplemente no mostrar notificaciones
        console.log('No hay notificaciones pendientes o usuario no autenticado');
        setNotificaciones([]);
        return;
      }

      const data = await res.json();
      setNotificaciones(data.notificaciones || []);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (notificacion: NotificacionCalificacion) => {
    setMentorSeleccionado(notificacion);
    setCalificacion(0);
    setComentario('');
    setSharedResources(false);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setMentorSeleccionado(null);
    setCalificacion(0);
    setComentario('');
    setMostrarExito(false);
  };

  const enviarCalificacion = async () => {
    if (!mentorSeleccionado || calificacion === 0) return;

    try {
      setEnviando(true);

      const res = await fetch('/api/participante/rate-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorSeleccionado.mentorId,
          perfilMentorId: mentorSeleccionado.perfilMentorId,
          calificacion,
          comentario,
          sharedResources,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al enviar calificación');
      }

      const data = await res.json();
      console.log('✅ Calificación enviada:', data);

      // Mostrar mensaje de éxito
      setMostrarExito(true);

      // Recargar notificaciones después de 2 segundos
      setTimeout(() => {
        cargarNotificaciones();
        cerrarModal();
      }, 2000);
    } catch (error: any) {
      console.error('Error al enviar calificación:', error);
      alert(error.message || 'Error al enviar la calificación');
    } finally {
      setEnviando(false);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'ALTA':
        return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40';
      case 'MEDIA':
        return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/40';
      default:
        return 'bg-slate-800/50 border-slate-700';
    }
  };

  const getPrioridadIcon = (prioridad: string) => {
    if (prioridad === 'ALTA') {
      return <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />;
    }
    return <Star className="w-5 h-5 text-yellow-400" />;
  };

  if (loading) {
    return null; // No mostrar nada mientras carga
  }

  if (notificaciones.length === 0) {
    return null; // No hay notificaciones pendientes
  }

  return (
    <>
      {/* WIDGET DE NOTIFICACIONES */}
      <div className="space-y-4">
        {notificaciones.map((notif) => (
          <div
            key={notif.mentorId}
            className={`rounded-xl border-2 p-5 backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer ${getPrioridadColor(notif.prioridad)}`}
            onClick={() => abrirModal(notif)}
          >
            <div className="flex items-start gap-4">
              {/* Icono de prioridad */}
              <div className="flex-shrink-0 mt-1">
                {getPrioridadIcon(notif.prioridad)}
              </div>

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      ¡Califica a tu mentor!
                      {notif.prioridad === 'ALTA' && (
                        <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-500/50">
                          Ciclo completado
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1">{notif.mensaje}</p>
                  </div>

                  {/* Foto del mentor */}
                  {notif.mentorImagen && (
                    <img
                      src={notif.mentorImagen}
                      alt={notif.mentorNombre}
                      className="w-12 h-12 rounded-full border-2 border-white/20 object-cover"
                    />
                  )}
                </div>

                {/* Info del mentor */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{notif.mentorNombre}</p>
                    <p className="text-xs text-gray-400">{notif.mentorTitulo}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold">{notif.mentorRating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-400">{notif.totalSesiones} sesión(es)</p>
                  </div>
                </div>

                {/* CTA */}
                <button className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition-all shadow-lg">
                  Calificar ahora
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CALIFICACIÓN */}
      {modalAbierto && mentorSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {!mostrarExito ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {mentorSeleccionado.mentorImagen && (
                      <img
                        src={mentorSeleccionado.mentorImagen}
                        alt={mentorSeleccionado.mentorNombre}
                        className="w-16 h-16 rounded-full border-2 border-purple-500/50 object-cover"
                      />
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Califica tu experiencia
                      </h2>
                      <p className="text-sm text-gray-400">con {mentorSeleccionado.mentorNombre}</p>
                    </div>
                  </div>
                  <button
                    onClick={cerrarModal}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-6">
                  {/* Estrellas de calificación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      ¿Cómo calificarías tu experiencia? *
                    </label>
                    <div className="flex items-center justify-center gap-2 py-4">
                      {[1, 2, 3, 4, 5].map((estrella) => (
                        <button
                          key={estrella}
                          type="button"
                          onMouseEnter={() => setHoverRating(estrella)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setCalificacion(estrella)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-12 h-12 ${
                              estrella <= (hoverRating || calificacion)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {calificacion > 0 && (
                      <p className="text-center text-sm text-gray-400">
                        {calificacion === 5 && '🌟 ¡Excelente!'}
                        {calificacion === 4 && '😊 Muy bueno'}
                        {calificacion === 3 && '👍 Bueno'}
                        {calificacion === 2 && '😐 Regular'}
                        {calificacion === 1 && '😞 Necesita mejorar'}
                      </p>
                    )}
                  </div>

                  {/* Comentario opcional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cuéntanos más sobre tu experiencia (opcional)
                    </label>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="¿Qué te pareció el acompañamiento? ¿Qué aprendiste?"
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>

                  {/* Checkbox de recursos compartidos */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sharedResources}
                        onChange={(e) => setSharedResources(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-300">
                        Mi mentor compartió recursos útiles conmigo
                      </span>
                    </label>
                  </div>

                  {/* Info de sesiones */}
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-white/5">
                    <p className="text-xs text-gray-400">
                      Esta calificación se aplicará a las <span className="font-bold text-purple-400">{mentorSeleccionado.totalSesiones} sesión(es)</span> completadas con este mentor
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex gap-3">
                  <button
                    onClick={cerrarModal}
                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarCalificacion}
                    disabled={calificacion === 0 || enviando}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {enviando ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        Enviar calificación
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Mensaje de éxito */
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  ¡Gracias por tu feedback!
                </h3>
                <p className="text-gray-400 mb-6">
                  Tu calificación ayuda a mejorar la experiencia para todos
                </p>
                <div className="inline-flex items-center gap-2 text-yellow-400">
                  {[...Array(calificacion)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-current" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
