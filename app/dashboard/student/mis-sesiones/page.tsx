'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Star, CheckCircle, AlertCircle, Loader2, Video, ExternalLink, Trash2, X } from 'lucide-react';
import ReviewModal from '@/components/dashboard/student/ReviewModal';

interface Sesion {
  id: number;
  mentorName: string;
  mentorImage: string;
  serviceName: string;
  fecha: string;
  hora: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';
  precio: number;
  hasReview: boolean;
  perfilMentorId: number;
  enlaceVideoLlamada?: string;
  tipoVideoLlamada?: string;
}

export default function MisSesionesPage() {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'TODAS' | 'COMPLETADA' | 'PENDIENTE_REVIEW'>('TODAS');
  const [reviewModal, setReviewModal] = useState<{ 
    show: boolean; 
    solicitudId: number; 
    mentorName: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ 
    show: boolean; 
    sesionId: number; 
    mentorName: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSesiones();
  }, []);

  const loadSesiones = async () => {
    try {
      const res = await fetch('/api/student/mis-sesiones');
      const data = await res.json();
      
      if (data.success && data.sesiones) {
        setSesiones(data.sesiones);
      }
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSesion = async () => {
    if (!deleteModal) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/student/sesiones/${deleteModal.sesionId}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Eliminar de la UI inmediatamente
        setSesiones(prev => prev.filter(s => s.id !== deleteModal.sesionId));
        setDeleteModal(null);
      } else {
        alert(data.error || 'No se pudo cancelar la sesión');
      }
    } catch (error) {
      console.error('Error al cancelar sesión:', error);
      alert('Error de conexión. Intenta nuevamente.');
    } finally {
      setDeleting(false);
    }
  };

  const sesionesFiltradas = sesiones.filter(s => {
    if (filtro === 'TODAS') return true;
    if (filtro === 'COMPLETADA') return s.estado === 'COMPLETADA';
    if (filtro === 'PENDIENTE_REVIEW') return s.estado === 'COMPLETADA' && !s.hasReview;
    return true;
  });

  const getEstadoBadge = (estado: string) => {
    const badges = {
      PENDIENTE: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-4 h-4" />, text: 'Pendiente' },
      CONFIRMADA: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: <CheckCircle className="w-4 h-4" />, text: 'Confirmada' },
      COMPLETADA: { color: 'bg-green-500/10 text-green-400 border-green-500/30', icon: <CheckCircle className="w-4 h-4" />, text: 'Completada' },
      CANCELADA: { color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: <AlertCircle className="w-4 h-4" />, text: 'Cancelada' },
    };
    return badges[estado as keyof typeof badges] || badges.PENDIENTE;
  };

  const sesionesCompletadasSinReview = sesiones.filter(s => s.estado === 'COMPLETADA' && !s.hasReview).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando tus sesiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mis Sesiones de Mentoría</h1>
          <p className="text-slate-400">Gestiona tus sesiones y deja reseñas para tus mentores</p>
        </div>

        {/* Alerta de sesiones pendientes de review */}
        {sesionesCompletadasSinReview > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Star className="w-6 h-6 text-purple-400" />
            <div className="flex-1">
              <p className="text-white font-medium">
                Tienes {sesionesCompletadasSinReview} sesión{sesionesCompletadasSinReview > 1 ? 'es' : ''} sin calificar
              </p>
              <p className="text-slate-400 text-sm">
                Ayuda a otros estudiantes compartiendo tu experiencia
              </p>
            </div>
            <button
              onClick={() => setFiltro('PENDIENTE_REVIEW')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Calificar
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFiltro('TODAS')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filtro === 'TODAS'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Todas ({sesiones.length})
          </button>
          <button
            onClick={() => setFiltro('COMPLETADA')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filtro === 'COMPLETADA'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Completadas ({sesiones.filter(s => s.estado === 'COMPLETADA').length})
          </button>
          <button
            onClick={() => setFiltro('PENDIENTE_REVIEW')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filtro === 'PENDIENTE_REVIEW'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Sin calificar ({sesionesCompletadasSinReview})
          </button>
        </div>

        {/* Lista de sesiones */}
        {sesionesFiltradas.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">
              {filtro === 'PENDIENTE_REVIEW' ? 'No hay sesiones sin calificar' : 'No tienes sesiones'}
            </h3>
            <p className="text-slate-500">
              {filtro === 'PENDIENTE_REVIEW' 
                ? '¡Excelente! Ya calificaste todas tus sesiones'
                : 'Reserva tu primera sesión con un mentor'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sesionesFiltradas.map((sesion) => {
              const estadoBadge = getEstadoBadge(sesion.estado);
              
              return (
                <div
                  key={sesion.id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    
                    {/* Avatar del mentor */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                        {sesion.mentorImage ? (
                          <img 
                            src={sesion.mentorImage} 
                            alt={sesion.mentorName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          sesion.mentorName.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    {/* Info de la sesión */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">
                          {sesion.mentorName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${estadoBadge.color}`}>
                          {estadoBadge.icon}
                          {estadoBadge.text}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-sm mb-2">{sesion.serviceName}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {sesion.fecha}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {sesion.hora}
                        </div>
                      </div>

                      {/* Enlace de videollamada para sesiones confirmadas */}
                      {sesion.enlaceVideoLlamada && (
                        <div className="mt-3">
                          {sesion.estado === 'CONFIRMADA' ? (
                            <a
                              href={sesion.enlaceVideoLlamada}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105"
                            >
                              <Video className="w-4 h-4" />
                              <span>Unirse a la sesión ({sesion.tipoVideoLlamada || 'Zoom'})</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : sesion.estado === 'COMPLETADA' ? (
                            <button
                              disabled
                              className="inline-flex items-center gap-2 bg-slate-700 text-slate-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed opacity-60"
                            >
                              <Video className="w-4 h-4" />
                              <span>Sesión finalizada</span>
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Botón de review o cancelar */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {/* Botón de cancelar - Solo para PENDIENTE */}
                      {sesion.estado === 'PENDIENTE' && (
                        <button
                          onClick={() => setDeleteModal({ 
                            show: true, 
                            sesionId: sesion.id, 
                            mentorName: sesion.mentorName 
                          })}
                          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-slate-700 hover:border-red-500/30"
                          title="Cancelar solicitud"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}

                      {/* Botón de review - Solo para COMPLETADA */}
                      {sesion.estado === 'COMPLETADA' && (
                        sesion.hasReview ? (
                          <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Calificada</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewModal({ 
                              show: true, 
                              solicitudId: sesion.id, 
                              mentorName: sesion.mentorName 
                            })}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-105"
                          >
                            <Star className="w-5 h-5" />
                            Calificar
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de review */}
      {reviewModal?.show && (
        <ReviewModal
          bookingId={reviewModal.solicitudId}
          mentorName={reviewModal.mentorName}
          onClose={() => setReviewModal(null)}
          onSuccess={() => {
            setReviewModal(null);
            loadSesiones();
          }}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteModal?.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Cancelar Sesión</h2>
                    <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModal(null)}
                  className="text-white/80 hover:text-white transition-colors"
                  disabled={deleting}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-slate-300 mb-4">
                ¿Estás seguro de que deseas cancelar tu sesión con{' '}
                <span className="font-bold text-white">{deleteModal.mentorName}</span>?
              </p>
              <p className="text-sm text-slate-400">
                Esta solicitud será eliminada permanentemente y no se realizará ningún cargo.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-slate-900/50 p-6 flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSesion}
                disabled={deleting}
                className="flex-1 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Eliminar Sesión
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
