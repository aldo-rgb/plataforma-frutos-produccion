'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, XCircle, User, Calendar, Image as ImageIcon,
  Loader2, AlertCircle, Eye, Clock, Target, Zap, Trophy, ArrowLeft
} from 'lucide-react';

interface Submission {
  id: number;
  status: string;
  evidenciaUrl: string | null;
  comentario: string | null;
  submittedAt: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    vision: string;
  };
  tarea: {
    id: number;
    type: string;
    titulo: string;
    descripcion: string | null;
    pointsReward: number;
    fechaLimite: string | null;
    horaEvento: string | null;
    requiereEvidencia: boolean;
    isMultiDay: boolean;
    diaNumero: number | null;
    duracionDias: number | null;
  };
}

export default function RevisionTareasExtraordinariasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionSeleccionada, setSubmissionSeleccionada] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '', type: 'success' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol && !['ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(session.user.rol)) {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      loadSubmissionsPendientes();
    }
  }, [status, session]);

  const loadSubmissionsPendientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/submissions/pending');
      const data = await response.json();

      if (response.ok && data.success) {
        setSubmissions(data.submissions || []);
      } else {
        mostrarToast('Error', data.error || 'No se pudieron cargar las evidencias', 'error');
      }
    } catch (error) {
      console.error('Error al cargar evidencias:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!submissionSeleccionada) return;

    if (!confirm(`¿Aprobar evidencia de ${submissionSeleccionada.usuario.nombre}?`)) return;

    setProcesando(true);
    try {
      const response = await fetch('/api/admin/submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submissionSeleccionada.id,
          action: 'approve',
          feedback: 'Aprobado por administración'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        mostrarToast(
          '✅ Aprobado',
          `${submissionSeleccionada.usuario.nombre} ganó ${data.pointsAwarded} PC${data.multiDayBonus ? ` + ${data.multiDayBonus} PC bonus multi-día` : ''}`,
          'success'
        );
        setSubmissionSeleccionada(null);
        loadSubmissionsPendientes();
      } else {
        mostrarToast('Error', data.error || 'Error al aprobar', 'error');
      }
    } catch (error) {
      console.error('Error al aprobar:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!submissionSeleccionada) return;

    if (!feedback.trim()) {
      alert('Por favor proporciona un motivo del rechazo');
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch('/api/admin/submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submissionSeleccionada.id,
          action: 'reject',
          feedback
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        mostrarToast(
          '❌ Rechazado',
          `Evidencia de ${submissionSeleccionada.usuario.nombre} fue rechazada`,
          'success'
        );
        setShowRechazarModal(false);
        setSubmissionSeleccionada(null);
        setFeedback('');
        loadSubmissionsPendientes();
      } else {
        mostrarToast('Error', data.error || 'Error al rechazar', 'error');
      }
    } catch (error) {
      console.error('Error al rechazar:', error);
      mostrarToast('Error', 'Error de conexión', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const mostrarToast = (title: string, description: string, type: 'success' | 'error') => {
    setToastMessage({ title, description, type });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Zap className="w-10 h-10 text-amber-400" />
            Revisión de Evidencias
          </h1>
          <p className="text-slate-400">
            Tareas Extraordinarias y Eventos - {submissions.length} pendientes
          </p>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            toastMessage.type === 'success' ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'
          } border-2`}>
            <h3 className="font-bold text-white">{toastMessage.title}</h3>
            <p className="text-sm text-slate-200">{toastMessage.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Submissions */}
          <div className="lg:col-span-1 space-y-4">
            {submissions.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">¡Todo revisado!</h3>
                <p className="text-slate-400">No hay evidencias pendientes</p>
              </div>
            ) : (
              submissions.map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => setSubmissionSeleccionada(submission)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    submissionSeleccionada?.id === submission.id
                      ? 'bg-indigo-900/30 border-indigo-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      {submission.tarea.type === 'EVENT' ? (
                        <Calendar className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Zap className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-sm">{submission.tarea.titulo}</h3>
                      {submission.tarea.isMultiDay && (
                        <span className="text-xs text-purple-400">
                          🗓️ Día {submission.tarea.diaNumero}/{submission.tarea.duracionDias}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="w-4 h-4" />
                      <span>{submission.usuario.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Target className="w-4 h-4" />
                      <span>{submission.usuario.vision}</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400">
                      <Trophy className="w-4 h-4" />
                      <span>{submission.tarea.pointsReward} PC</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel de Revisión */}
          <div className="lg:col-span-2">
            {submissionSeleccionada ? (
              <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl overflow-hidden">
                {/* Información de la Tarea */}
                <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {submissionSeleccionada.tarea.titulo}
                      </h2>
                      {submissionSeleccionada.tarea.isMultiDay && (
                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm font-semibold">
                            Misión Multi-Día: Día {submissionSeleccionada.tarea.diaNumero} de {submissionSeleccionada.tarea.duracionDias}
                          </span>
                        </div>
                      )}
                      <p className="text-slate-400 text-sm">
                        {submissionSeleccionada.tarea.descripcion}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                        <span className="text-amber-400 font-bold text-lg">
                          {submissionSeleccionada.tarea.pointsReward} PC
                        </span>
                      </div>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-xs font-semibold ${
                        submissionSeleccionada.tarea.type === 'EVENT'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {submissionSeleccionada.tarea.type === 'EVENT' ? '📅 Evento' : '⚡ Extraordinaria'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4" />
                      <span>{submissionSeleccionada.usuario.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Target className="w-4 h-4" />
                      <span>{submissionSeleccionada.usuario.vision}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(submissionSeleccionada.submittedAt).toLocaleString('es-MX')}</span>
                    </div>
                  </div>
                </div>

                {/* Evidencia Fotográfica */}
                {submissionSeleccionada.evidenciaUrl && (
                  <div className="p-6 border-b border-slate-700">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Evidencia Fotográfica
                    </h3>
                    <img
                      src={submissionSeleccionada.evidenciaUrl}
                      alt="Evidencia"
                      className="w-full rounded-lg max-h-96 object-contain bg-slate-900"
                    />
                  </div>
                )}

                {/* Comentario del Usuario */}
                {submissionSeleccionada.comentario && (
                  <div className="p-6 border-b border-slate-700">
                    <h3 className="text-white font-bold mb-2">Comentario del Usuario:</h3>
                    <p className="text-slate-300 bg-slate-900/50 p-3 rounded-lg">
                      {submissionSeleccionada.comentario}
                    </p>
                  </div>
                )}

                {/* Botones de Acción */}
                <div className="p-6 bg-slate-900/30">
                  <div className="flex gap-4">
                    <button
                      onClick={handleAprobar}
                      disabled={procesando}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {procesando ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Aprobar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRechazarModal(true)}
                      disabled={procesando}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-12 text-center">
                <Eye className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">
                  Selecciona una evidencia
                </h3>
                <p className="text-slate-500">
                  Haz clic en una evidencia de la lista para revisarla
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Rechazo */}
        {showRechazarModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border-2 border-red-500/50 rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
                Motivo del Rechazo
              </h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explica por qué rechazas esta evidencia..."
                className="w-full h-32 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
              />
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => {
                    setShowRechazarModal(false);
                    setFeedback('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRechazar}
                  disabled={procesando || !feedback.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {procesando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirmar Rechazo'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
