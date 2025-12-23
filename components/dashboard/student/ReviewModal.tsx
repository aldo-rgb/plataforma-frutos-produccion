"use client";

import React, { useState } from 'react';
import { Star, X, CheckCircle2, Loader2, ShieldAlert, Send, MessageSquare, AlertTriangle } from 'lucide-react';

interface ReviewModalProps {
  bookingId: number;
  mentorName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({ bookingId, mentorName, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sharedResources, setSharedResources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [modoBuzon, setModoBuzon] = useState(false); // 🆕 Modo Buzón Anónimo

  const handleSubmit = async () => {
    // Limpiar errores previos
    setError("");

    // 🆕 MODO BUZÓN: Solo valida comentario
    if (modoBuzon) {
      if (comment.trim().length < 20) {
        setError('✍️ Por favor describe el problema con al menos 20 caracteres');
        return;
      }

      setSubmitting(true);
      try {
        // TODO: Crear endpoint /api/student/buzon-anonimo
        const res = await fetch('/api/student/buzon-anonimo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            bookingId, 
            mensaje: comment.trim(),
            tipo: 'QUEJA_ANONIMA'
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setShowSuccess(true);
          setTimeout(() => {
            if (onSuccess) onSuccess();
            onClose();
            // Redirigir al dashboard de sesiones
            window.location.href = '/dashboard/student/mis-sesiones';
          }, 2000);
        } else {
          setError(`❌ ${data.error || 'No se pudo enviar el reporte'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        setError("❌ Error de conexión. Por favor intenta nuevamente.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // MODO RESEÑA: Validaciones normales
    // Validación 1: Calificación
    if (rating === 0) {
      setError('⭐ Por favor selecciona una calificación');
      return;
    }

    // Validación 2: Comentario mínimo
    if (comment.trim().length < 10) {
      setError('✍️ Por favor escribe un comentario de al menos 10 caracteres');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/student/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId, 
          rating, 
          comment: comment.trim(), 
          sharedResources 
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Mostrar animación de éxito
        setShowSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
          // Redirigir al dashboard de sesiones
          window.location.href = '/dashboard/student/mis-sesiones';
        }, 2000);
      } else {
        setError(`❌ ${data.error || 'No se pudo enviar la review'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setError("❌ Error de conexión. Por favor intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  // 🆕 Función para cambiar de modo
  const toggleModoBuzon = () => {
    setModoBuzon(!modoBuzon);
    setComment(''); // Limpiar textarea
    setError(''); // Limpiar errores
    if (!modoBuzon) {
      setRating(0); // Reset rating si vamos a buzón
    }
  };

  // Si está en modo de éxito, mostrar animación
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-8 rounded-2xl text-center shadow-2xl animate-in zoom-in-95 duration-300 max-w-md">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {modoBuzon ? '¡Reporte Enviado!' : '¡Gracias por tu Reseña!'}
          </h3>
          <p className="text-green-100">
            {modoBuzon 
              ? 'El administrador revisará tu mensaje de forma confidencial'
              : 'Tu opinión ha sido publicada y ayudará a otros estudiantes'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 🆕 CONTENEDOR CON MAX-HEIGHT Y SCROLL INTERNO */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* ENCABEZADO FIJO */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {modoBuzon ? (
                <>
                  <ShieldAlert className="text-orange-400 w-6 h-6" />
                  <h2 className="text-2xl font-bold text-white">Buzón Anónimo</h2>
                </>
              ) : (
                <h2 className="text-2xl font-bold text-white">Califica tu Experiencia</h2>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-400 text-sm">
            {modoBuzon 
              ? 'Mensaje confidencial directo al Administrador'
              : `Con ${mentorName}`
            }
          </p>
        </div>

        {/* 🆕 CUERPO SCROLLABLE */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          
          {/* Alerta de Modo Buzón */}
          {modoBuzon && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-400 text-sm font-semibold mb-1">Reporte Confidencial</p>
                  <p className="text-orange-300/80 text-xs">
                    Este mensaje es 100% anónimo. Úsalo para reportar problemas graves, 
                    quejas del servicio o sugerencias privadas. El mentor NO verá esto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de Error (si existe) */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 animate-in slide-in-from-top duration-300">
              <p className="text-red-400 text-sm font-medium text-center">{error}</p>
            </div>
          )}

          {/* ESTRELLAS (Solo en modo reseña) */}
          {!modoBuzon && (
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-300 block text-center">
                ¿Cómo calificarías tu sesión?
              </label>
              <div className="flex justify-center gap-3 p-4 bg-slate-900/50 rounded-xl">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    onMouseEnter={() => setHoveredRating(num)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-all hover:scale-125 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full p-1"
                  >
                    <Star 
                      className={`w-12 h-12 transition-all duration-200 ${
                        num <= displayRating 
                          ? 'fill-amber-400 text-amber-400 drop-shadow-lg' 
                          : 'text-slate-600 hover:text-slate-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              {/* Texto descriptivo */}
              <div className="text-center h-6">
                {displayRating === 0 && <span className="text-slate-500 text-sm">👆 Selecciona tu calificación</span>}
                {displayRating === 1 && (
                  <div className="animate-in fade-in duration-200">
                    <span className="text-red-400 font-semibold text-lg">😞 Muy insatisfecho</span>
                  </div>
                )}
                {displayRating === 2 && (
                  <div className="animate-in fade-in duration-200">
                    <span className="text-orange-400 font-semibold text-lg">😕 Insatisfecho</span>
                  </div>
                )}
                {displayRating === 3 && (
                  <div className="animate-in fade-in duration-200">
                    <span className="text-yellow-400 font-semibold text-lg">😐 Neutral</span>
                  </div>
                )}
                {displayRating === 4 && (
                  <div className="animate-in fade-in duration-200">
                    <span className="text-lime-400 font-semibold text-lg">😊 Satisfecho</span>
                  </div>
                )}
                {displayRating === 5 && (
                  <div className="animate-in fade-in duration-200">
                    <span className="text-green-400 font-semibold text-lg">🎉 ¡Excelente!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHECKBOX RECURSOS (Solo en modo reseña) */}
          {!modoBuzon && (
            <label className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl cursor-pointer border border-purple-500/30 hover:border-purple-500/50 transition-all group hover:shadow-lg hover:shadow-purple-500/10">
              <input 
                type="checkbox" 
                checked={sharedResources} 
                onChange={e => setSharedResources(e.target.checked)} 
                className="w-5 h-5 mt-0.5 accent-purple-500 cursor-pointer rounded"
              />
              <div>
                <span className="text-sm text-white font-semibold block mb-1 flex items-center gap-2">
                  📚 ¿El mentor te compartió recursos?
                </span>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  Herramientas, archivos, libros o PDFs • Ayuda al mentor a ganar la insignia "Erudito"
                </span>
              </div>
            </label>
          )}

          {/* TEXTAREA COMPARTIDO */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-3 block">
              {modoBuzon 
                ? 'Describe tu situación al Administrador:'
                : 'Comparte tu experiencia'
              }
            </label>
            <textarea 
              className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none placeholder:text-slate-500" 
              placeholder={modoBuzon 
                ? "Escribe aquí tu reporte confidencial. Sé específico sobre el problema..."
                : "Cuéntanos cómo fue la sesión, qué aprendiste, y si el mentor te ayudó a alcanzar tus objetivos..."
              }
              value={comment}
              onChange={e => {
                setComment(e.target.value);
                if (error) setError("");
              }}
              rows={modoBuzon ? 6 : 5}
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-slate-500">
                {modoBuzon ? 'Mínimo 20 caracteres' : 'Mínimo 10 caracteres'}
              </p>
              <p className={`text-xs font-medium transition-colors ${
                comment.length < (modoBuzon ? 20 : 10) ? 'text-amber-400' : 'text-green-400'
              }`}>
                {comment.length}/500
              </p>
            </div>
          </div>
        </div>

        {/* PIE CON BOTONES (Fijo) */}
        <div className="p-6 border-t border-slate-700 space-y-4 flex-shrink-0">
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 border border-slate-600 hover:border-slate-500"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSubmit}
              disabled={
                submitting || 
                (modoBuzon ? comment.trim().length < 20 : (rating === 0 || comment.trim().length < 10))
              }
              className={`flex-1 font-bold text-white py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                modoBuzon
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-orange-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-purple-500/30'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : modoBuzon ? (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Reporte
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Publicar Reseña
                </>
              )}
            </button>
          </div>

          {/* TOGGLE DE MODO */}
          <div className="text-center pt-3 border-t border-slate-700/50">
            <button 
              onClick={toggleModoBuzon}
              disabled={submitting}
              className="text-xs hover:text-white underline decoration-dotted transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              {modoBuzon ? (
                <span className="text-slate-400">← Volver a Calificar la Sesión</span>
              ) : (
                <span className="text-slate-400">
                  ¿Problemas con la sesión? <span className="text-orange-400 font-semibold">Escribir al Buzón Anónimo →</span>
                </span>
              )}
            </button>
          </div>

          {/* INFO FINAL */}
          {!modoBuzon && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300 text-center flex items-center justify-center gap-2">
                <span>ℹ️</span>
                <span>Tu review será pública y ayudará a otros estudiantes a elegir al mentor ideal</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
