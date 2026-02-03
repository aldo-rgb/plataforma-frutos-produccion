'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  ExternalLink,
  Calendar,
  Mail,
  User,
  AlertCircle,
  Dumbbell
} from 'lucide-react';

interface Application {
  id: number;
  status: string;
  titulo: string;
  especialidad: string;
  biografiaCompleta: string;
  experienciaAnios: number;
  logros: string[];
  expertiseTags: string[];
  videoIntroUrl: string | null;
  documentosUrls: string[];
  createdAt: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
    rol: string;
    Organization?: {
      id: number;
      name: string;
    } | null;
  };
  reviewedByUser: {
    nombre: string;
  } | null;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function TrainerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [appToApprove, setAppToApprove] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/trainer-applications`);
      const data = await response.json();
      if (data.success) {
        // Filtrar por status
        const filtered = data.applications.filter((app: Application) => app.status === filter);
        setApplications(filtered);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setAppToApprove(id);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!appToApprove) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/trainer-applications/${appToApprove}/approve`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        showToast('Aplicación de trainer aprobada exitosamente. El usuario ya puede acceder a su panel de entrenador.', 'success');
        fetchApplications();
        setSelectedApp(null);
        setShowApproveModal(false);
        setAppToApprove(null);
      } else {
        showToast(data.error || 'Error al aprobar aplicación', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al aprobar aplicación', 'error');
      setShowApproveModal(false);
      setAppToApprove(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      showToast('Debes proporcionar una razón de rechazo', 'error');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/trainer-applications/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Aplicación rechazada exitosamente', 'success');
        fetchApplications();
        setSelectedApp(null);
        setShowRejectModal(false);
        setRejectionReason('');
      } else {
        showToast(data.error || 'Error al rechazar aplicación', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al rechazar aplicación', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Dumbbell className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Solicitudes de Entrenador</h1>
          </div>
          <p className="text-slate-400">Revisa y aprueba aplicaciones para certificación de entrenadores (Quantum Leap)</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {status === 'PENDING' && '⏳ Pendientes'}
              {status === 'APPROVED' && '✅ Aprobadas'}
              {status === 'REJECTED' && '❌ Rechazadas'}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4">Cargando aplicaciones...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
            <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No hay aplicaciones de entrenador en este estado</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <img
                      src={app.usuario.imagen || '/default-avatar.png'}
                      alt={app.usuario.nombre}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{app.usuario.nombre}</h3>
                      <p className="text-orange-400 font-medium mb-2">{app.titulo}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm">
                          {app.especialidad}
                        </span>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                          {app.experienciaAnios} años exp.
                        </span>
                        {app.usuario.rol && (
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            Rol actual: {app.usuario.rol}
                          </span>
                        )}
                        {app.usuario.Organization && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                            {app.usuario.Organization.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {app.usuario.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {filter === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setShowRejectModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        disabled={processing}
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleApprove(app.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        disabled={processing}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Aprobar
                      </button>
                    </div>
                  )}
                </div>

                {/* Detalles */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <details className="cursor-pointer">
                    <summary className="text-orange-400 font-medium hover:text-orange-300">
                      Ver detalles completos
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">Biografía Completa:</h4>
                        <p className="text-slate-300 text-sm">{app.biografiaCompleta}</p>
                      </div>

                      {app.logros && app.logros.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Logros:</h4>
                          <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                            {app.logros.map((logro, i) => (
                              <li key={i}>{logro}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {app.expertiseTags && app.expertiseTags.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Habilidades:</h4>
                          <div className="flex flex-wrap gap-2">
                            {app.expertiseTags.map((tag, i) => (
                              <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {app.videoIntroUrl && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Video de Introducción:</h4>
                          <a
                            href={app.videoIntroUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ver video
                          </a>
                        </div>
                      )}

                      {app.documentosUrls && app.documentosUrls.length > 0 && (
                        <div>
                          <h4 className="text-white font-medium mb-2">Documentos:</h4>
                          <div className="space-y-2">
                            {app.documentosUrls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                              >
                                <Download className="w-4 h-4" />
                                Documento {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Aprobación */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-green-500/30 rounded-xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-green-500/20 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3 text-center">
              Aprobar Entrenador
            </h3>
            
            <p className="text-slate-300 text-center mb-6 leading-relaxed">
              ¿Estás seguro de aprobar esta aplicación de entrenador?
            </p>
            
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700/50">
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Se creará el perfil de entrenador completo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Si es <strong className="text-white">SCHOOL_ADMIN</strong>, mantendrá su rol y se le agregará <strong className="text-orange-400">esEntrenador</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>El usuario obtendrá acceso al panel de entrenador</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Podrá usar las herramientas de Quantum Leap</span>
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setAppToApprove(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={confirmApprove}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processing}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  'Aprobar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Rechazar Aplicación</h3>
            <p className="text-slate-400 mb-4">
              Proporciona una razón detallada del rechazo. Esto se enviará al solicitante.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: La experiencia demostrada no cumple con los estándares mínimos requeridos..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none mb-4"
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedApp(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium"
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Procesando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border backdrop-blur-sm animate-in slide-in-from-top-2 duration-300 ${
              toast.type === 'success' 
                ? 'bg-green-900/90 border-green-600 text-green-100' 
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-600 text-red-100'
                : 'bg-blue-900/90 border-blue-600 text-blue-100'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.type === 'info' && <FileText className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
