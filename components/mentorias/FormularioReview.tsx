'use client';

import { useState } from 'react';
import { Star, Send, X, Loader2 } from 'lucide-react';

interface FormularioReviewProps {
  solicitudId: number;
  perfilMentorId: number;
  nombreMentor: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FormularioReview({
  solicitudId,
  perfilMentorId,
  nombreMentor,
  onSuccess,
  onCancel
}: FormularioReviewProps) {
  const [calificacion, setCalificacion] = useState(0);
  const [hoverCalificacion, setHoverCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [sharedResources, setSharedResources] = useState(false); // 🏅 NUEVO: Para insignia Erudito
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (calificacion === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/mentorias/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitudId,
          perfilMentorId,
          calificacion,
          comentario: comentario.trim() || null,
          sharedResources // 🏅 NUEVO: Para insignia Erudito
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar reseña');
      }

      // Éxito
      if (onSuccess) {
        onSuccess();
      } else {
        alert('¡Gracias por tu reseña!');
        window.location.reload();
      }

    } catch (error: any) {
      console.error('Error al enviar reseña:', error);
      setError(error.message || 'Error al enviar reseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Califica tu sesión</h3>
          <p className="text-slate-400 text-sm">con {nombreMentor}</p>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Estrellas de Calificación */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-3">
            ¿Cómo calificarías tu experiencia?
          </label>
          <div className="flex gap-2 justify-center items-center py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setCalificacion(star)}
                onMouseEnter={() => setHoverCalificacion(star)}
                onMouseLeave={() => setHoverCalificacion(0)}
                className="transition-all hover:scale-110"
              >
                <Star
                  size={48}
                  className={`${
                    star <= (hoverCalificacion || calificacion)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-slate-600'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {calificacion > 0 && (
            <p className="text-center text-slate-400 text-sm mt-2">
              {calificacion === 5 && '⭐ ¡Excelente!'}
              {calificacion === 4 && '😊 Muy bueno'}
              {calificacion === 3 && '👍 Bueno'}
              {calificacion === 2 && '😕 Regular'}
              {calificacion === 1 && '😞 Necesita mejorar'}
            </p>
          )}
        </div>

        {/* Comentario */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">
            Comparte tu experiencia (opcional)
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="¿Qué te gustó de la sesión? ¿Qué aprendiste?"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-slate-500 mt-1 text-right">
            {comentario.length}/500 caracteres
          </p>
        </div>

        {/* 🏅 NUEVO: Checkbox de Recursos Compartidos */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={sharedResources}
              onChange={(e) => setSharedResources(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                📚 ¿Te compartió recursos extra?
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Archivos, PDFs, links útiles, templates, etc. (Ayuda al mentor a ganar la insignia <span className="text-blue-400 font-bold">Erudito</span>)
              </p>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || calificacion === 0}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Enviando...
              </>
            ) : (
              <>
                <Send size={20} />
                Enviar Reseña
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info de Promoción Automática */}
      <div className="mt-6 bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-xs text-blue-300">
          💡 <strong>Tu reseña ayuda a los mentores:</strong> Las calificaciones positivas 
          contribuyen a que los mentores sean promovidos automáticamente de Junior a Senior 
          y de Senior a Master.
        </p>
      </div>
    </div>
  );
}
