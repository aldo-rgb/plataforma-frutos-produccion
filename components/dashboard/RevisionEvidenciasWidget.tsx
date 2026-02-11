'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Eye, Calendar, Zap, User, Image as ImageIcon, FileText, Target } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

// Interface unificada para todas las evidencias
interface EvidenciaUnificada {
  id: number | string;
  tipo: 'CARTA' | 'EXTRAORDINARIA';
  submissionId?: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  metaTitulo: string;
  categoria: string;
  accionTexto: string;
  fotoUrl: string | null;
  descripcion: string | null;
  fechaSubida: string;
  tiempoRelativo: string;
  pointsReward?: number;
}

export default function RevisionEvidenciasWidget() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [evidencias, setEvidencias] = useState<EvidenciaUnificada[]>([]);
  const [selectedEvidencia, setSelectedEvidencia] = useState<EvidenciaUnificada | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    action: '' as 'approve' | 'reject',
    feedback: ''
  });
  const [reviewing, setReviewing] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEvidencias();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadEvidencias, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar TODAS las evidencias (CARTA + Extraordinarias)
  const loadEvidencias = async () => {
    try {
      const response = await fetch('/api/mentor/validacion-evidencias');
      if (response.ok) {
        const data = await response.json();
        setEvidencias(data.evidencias || []);
      } else {
        console.error('Error loading evidencias:', await response.text());
      }
    } catch (error) {
      console.error('Error loading evidencias:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para obtener URL de imagen correcta
  const getImageUrl = (fotoUrl: string | null): string => {
    if (!fotoUrl) return '';
    // Si ya es una URL completa de Supabase, usarla directamente
    if (fotoUrl.startsWith('http')) return fotoUrl;
    // Si es una ruta local, intentar con el endpoint de API
    if (fotoUrl.startsWith('/evidencias/')) {
      return `/api/evidencias/image?path=${encodeURIComponent(fotoUrl)}`;
    }
    return fotoUrl;
  };

  const openReviewModal = (evidencia: EvidenciaUnificada, action: 'approve' | 'reject') => {
    setSelectedEvidencia(evidencia);
    setReviewForm({ action, feedback: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvidencia(null);
    setReviewForm({ action: '', feedback: '' });
  };

  const handleSubmitReview = async () => {
    if (!selectedEvidencia) return;

    if (reviewForm.action === 'reject' && !reviewForm.feedback.trim()) {
      toast.error('Debes proporcionar feedback al rechazar');
      return;
    }

    setReviewing(true);

    try {
      let response;
      
      if (selectedEvidencia.tipo === 'EXTRAORDINARIA' && selectedEvidencia.submissionId) {
        // Aprobar/rechazar tarea extraordinaria
        response = await fetch(`/api/admin/submissions/${selectedEvidencia.submissionId}/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: reviewForm.action === 'approve' ? 'APPROVED' : 'REJECTED',
            feedback: reviewForm.feedback
          })
        });
      } else {
        // Aprobar/rechazar evidencia de CARTA
        const endpoint = reviewForm.action === 'approve' 
          ? `/api/mentor/evidencia/${selectedEvidencia.id}/aprobar`
          : `/api/mentor/evidencia/${selectedEvidencia.id}/rechazar`;
        
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedback: reviewForm.feedback
          })
        });
      }

      if (response.ok) {
        if (reviewForm.action === 'approve') {
          toast.success(`✅ ¡Evidencia aprobada! - ${selectedEvidencia.usuarioNombre} ganó puntos`);
        } else {
          toast.success('📧 Evidencia rechazada - Usuario notificado para reenviar');
        }
        closeModal();
        loadEvidencias();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al revisar evidencia');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Error al revisar evidencia');
    } finally {
      setReviewing(false);
    }
  };

  // Helper para obtener el color según el tipo
  const getTipoColor = (tipo: string, categoria?: string) => {
    if (tipo === 'EXTRAORDINARIA') {
      if (categoria === 'EVENTO') return { bg: 'bg-purple-900/20', border: 'border-purple-700', text: 'text-purple-400' };
      return { bg: 'bg-amber-900/20', border: 'border-amber-700', text: 'text-amber-400' };
    }
    // CARTA - colores según categoría
    switch (categoria) {
      case 'ESPIRITUAL': return { bg: 'bg-indigo-900/20', border: 'border-indigo-700', text: 'text-indigo-400' };
      case 'PERSONAL': return { bg: 'bg-green-900/20', border: 'border-green-700', text: 'text-green-400' };
      case 'FAMILIAR': return { bg: 'bg-rose-900/20', border: 'border-rose-700', text: 'text-rose-400' };
      case 'PROFESIONAL': return { bg: 'bg-blue-900/20', border: 'border-blue-700', text: 'text-blue-400' };
      case 'FINANCIERO': return { bg: 'bg-emerald-900/20', border: 'border-emerald-700', text: 'text-emerald-400' };
      default: return { bg: 'bg-slate-900/20', border: 'border-slate-700', text: 'text-slate-400' };
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="ml-3 text-slate-400">Cargando evidencias...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                📸 Revisión de Evidencias
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Carta F.R.U.T.O.S. y tareas extraordinarias
              </p>
            </div>
            {evidencias.length > 0 && (
              <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold">
                {evidencias.length} Pendientes
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {evidencias.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-slate-300 text-lg font-semibold">¡Todo revisado!</p>
              <p className="text-slate-500 text-sm mt-2">
                No hay evidencias pendientes de revisión
              </p>
            </div>
          ) : (
            evidencias.map((evidencia) => {
              const colors = getTipoColor(evidencia.tipo, evidencia.categoria);
              const imageUrl = getImageUrl(evidencia.fotoUrl);
              
              return (
                <div
                  key={evidencia.id}
                  className={`p-4 rounded-xl border-2 transition-all ${colors.bg} ${colors.border}`}
                >
                  {/* Usuario y Tipo */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {evidencia.tipo === 'EXTRAORDINARIA' ? (
                          evidencia.categoria === 'EVENTO' ? (
                            <Calendar className={`w-4 h-4 ${colors.text}`} />
                          ) : (
                            <Zap className={`w-4 h-4 ${colors.text}`} />
                          )
                        ) : (
                          <Target className={`w-4 h-4 ${colors.text}`} />
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {evidencia.tipo === 'CARTA' ? 'CARTA' : evidencia.categoria}
                        </span>
                        <span className="text-white font-bold text-sm truncate">
                          {evidencia.metaTitulo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <User className="w-3 h-3" />
                        {evidencia.usuarioNombre}
                      </div>
                      {evidencia.accionTexto && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {evidencia.accionTexto}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">
                        {evidencia.tiempoRelativo}
                      </div>
                    </div>
                  </div>

                  {/* Evidencia Imagen */}
                  {imageUrl && !imageError[String(evidencia.id)] && (
                    <div className="mb-3">
                      <button
                        onClick={() => window.open(imageUrl, '_blank')}
                        className="w-full h-32 bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all group relative"
                      >
                        <img
                          src={imageUrl}
                          alt="Evidencia"
                          className="w-full h-full object-cover"
                          onError={() => setImageError(prev => ({ ...prev, [String(evidencia.id)]: true }))}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Si no hay imagen o error */}
                  {(!imageUrl || imageError[String(evidencia.id)]) && (
                    <div className="mb-3 h-20 bg-slate-800 rounded-lg flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">Sin imagen disponible</p>
                      </div>
                    </div>
                  )}

                  {/* Descripción */}
                  {evidencia.descripcion && (
                    <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Comentario:</p>
                      <p className="text-sm text-white line-clamp-2">{evidencia.descripcion}</p>
                    </div>
                  )}

                  {/* Botones de Acción */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openReviewModal(evidencia, 'approve')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => openReviewModal(evidencia, 'reject')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Revisión */}
      {showModal && selectedEvidencia && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`px-6 py-4 border-b border-slate-700 ${
              reviewForm.action === 'approve' ? 'bg-green-900/20' : 'bg-red-900/20'
            }`}>
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                {reviewForm.action === 'approve' ? (
                  <>
                    <CheckCircle className="text-green-400" />
                    Aprobar Evidencia
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-400" />
                    Rechazar Evidencia
                  </>
                )}
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                {selectedEvidencia.usuarioNombre} - {selectedEvidencia.metaTitulo}
              </p>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                selectedEvidencia.tipo === 'CARTA' 
                  ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-700'
                  : 'bg-amber-900/50 text-amber-400 border border-amber-700'
              }`}>
                {selectedEvidencia.tipo === 'CARTA' ? '📋 Carta F.R.U.T.O.S.' : '⚡ Tarea Extraordinaria'}
              </span>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Evidencia */}
              {selectedEvidencia.fotoUrl && (
                <div>
                  <label className="block text-white font-semibold mb-2">Evidencia:</label>
                  <img
                    src={getImageUrl(selectedEvidencia.fotoUrl)}
                    alt="Evidencia"
                    className="w-full rounded-xl border border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Acción/Descripción */}
              <div>
                <label className="block text-white font-semibold mb-2">Acción a cumplir:</label>
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-white">{selectedEvidencia.accionTexto}</p>
                </div>
              </div>

              {/* Comentario del usuario */}
              {selectedEvidencia.descripcion && (
                <div>
                  <label className="block text-white font-semibold mb-2">Comentario del participante:</label>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-white">{selectedEvidencia.descripcion}</p>
                  </div>
                </div>
              )}

              {/* Feedback del Mentor */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  {reviewForm.action === 'approve' ? 'Felicitaciones (opcional):' : 'Feedback (requerido):'}
                  {reviewForm.action === 'reject' && <span className="text-red-400 ml-1">*</span>}
                </label>
                <textarea
                  value={reviewForm.feedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                  placeholder={
                    reviewForm.action === 'approve'
                      ? 'Ej: ¡Excelente trabajo! Sigue así...'
                      : 'Explica por qué no cumple con los requisitos...'
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex gap-3">
              <button
                onClick={closeModal}
                disabled={reviewing}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewing || (reviewForm.action === 'reject' && !reviewForm.feedback.trim())}
                className={`flex-1 px-6 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  reviewForm.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {reviewing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    {reviewForm.action === 'approve' ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Aprobar y Otorgar Puntos
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        Rechazar y Enviar Feedback
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
