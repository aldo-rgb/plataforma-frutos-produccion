'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Eye, Calendar, Zap, User, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface Submission {
  id: number;
  evidenciaUrl: string | null;
  comentario: string | null;
  submittedAt: string;
  Usuario: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  AdminTask: {
    id: number;
    type: 'EXTRAORDINARY' | 'EVENT';
    titulo: string;
    descripcion: string;
    pointsReward: number;
    fechaLimite: string | null;
    fechaEvento: string | null;
  };
}

export default function RevisionEvidenciasWidget() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    action: '' as 'approve' | 'reject',
    feedback: ''
  });
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadSubmissions();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadSubmissions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await fetch('/api/mentor/submissions/pending');
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (submission: Submission, action: 'approve' | 'reject') => {
    setSelectedSubmission(submission);
    setReviewForm({ action, feedback: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSubmission(null);
    setReviewForm({ action: '', feedback: '' });
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission) return;

    if (reviewForm.action === 'reject' && !reviewForm.feedback.trim()) {
      toast.error('Debes proporcionar feedback al rechazar');
      return;
    }

    setReviewing(true);

    try {
      const response = await fetch('/api/mentor/submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          action: reviewForm.action,
          feedback: reviewForm.feedback
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (reviewForm.action === 'approve') {
          toast.success('✅ Evidencia aprobada - Puntos otorgados');
        } else {
          toast.success('📧 Evidencia rechazada - Usuario notificado para reenviar');
        }
        closeModal();
        loadSubmissions();
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
                Tareas extraordinarias y eventos pendientes
              </p>
            </div>
            {submissions.length > 0 && (
              <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold">
                {submissions.length} Pendientes
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-slate-300 text-lg font-semibold">¡Todo revisado!</p>
              <p className="text-slate-500 text-sm mt-2">
                No hay evidencias pendientes de revisión
              </p>
            </div>
          ) : (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  submission.AdminTask.type === 'EVENT'
                    ? 'bg-purple-900/20 border-purple-700'
                    : 'bg-amber-900/20 border-amber-700'
                }`}
              >
                {/* Usuario y Tarea */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {submission.AdminTask.type === 'EVENT' ? (
                        <Calendar className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Zap className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="text-white font-bold">
                        {submission.AdminTask.titulo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <User className="w-3 h-3" />
                      {submission.Usuario.nombre} {submission.Usuario.apellido}
                    </div>
                    {submission.AdminTask.descripcion && (
                      <p className="text-xs text-slate-500 mt-1">
                        {submission.AdminTask.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold text-sm">
                      +{submission.AdminTask.pointsReward} PC
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(submission.submittedAt).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                </div>

                {/* Evidencia */}
                {submission.evidenciaUrl && (
                  <div className="mb-3">
                    <button
                      onClick={() => window.open(submission.evidenciaUrl!, '_blank')}
                      className="w-full h-32 bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all group relative"
                    >
                      <img
                        src={submission.evidenciaUrl}
                        alt="Evidencia"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Comentario del usuario */}
                {submission.comentario && (
                  <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Comentario:</p>
                    <p className="text-sm text-white">{submission.comentario}</p>
                  </div>
                )}

                {/* Botones de Acción */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openReviewModal(submission, 'approve')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => openReviewModal(submission, 'reject')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Revisión */}
      {showModal && selectedSubmission && (
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
                {selectedSubmission.Usuario.nombre} {selectedSubmission.Usuario.apellido} - {selectedSubmission.AdminTask.titulo}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Evidencia */}
              {selectedSubmission.evidenciaUrl && (
                <div>
                  <label className="block text-white font-semibold mb-2">Evidencia:</label>
                  <img
                    src={selectedSubmission.evidenciaUrl}
                    alt="Evidencia"
                    className="w-full rounded-xl border border-slate-700"
                  />
                </div>
              )}

              {/* Comentario del usuario */}
              {selectedSubmission.comentario && (
                <div>
                  <label className="block text-white font-semibold mb-2">Comentario del participante:</label>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-white">{selectedSubmission.comentario}</p>
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

              {/* Info de Puntos */}
              {reviewForm.action === 'approve' && (
                <div className="p-4 bg-amber-900/20 border border-amber-700 rounded-xl">
                  <p className="text-amber-400 font-bold text-center">
                    Se otorgarán <span className="text-2xl">{selectedSubmission.AdminTask.pointsReward}</span> Puntos Cuánticos
                  </p>
                </div>
              )}
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
