'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Scale,
  ArrowLeft,
  Loader2,
  CheckCircle,
  X,
  Clock,
  User,
  Eye,
  Filter,
  AlertTriangle,
  FileText,
  MessageSquare
} from 'lucide-react';

interface BreachReport {
  id: number;
  breachType: string;
  description: string;
  evidenceUrls: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reportedBy: {
    id: number;
    nombre: string;
    image: string | null;
  };
  reportedUser: {
    id: number;
    nombre: string;
    image: string | null;
  };
  vision: {
    id: number;
    nombre: string;
  };
  resolvedBy?: {
    id: number;
    nombre: string;
  };
  resolution?: string;
  resolvedAt?: string;
}

const BREACH_TYPES: Record<string, string> = {
  TARDANZA: 'Llegó tarde a actividad',
  INASISTENCIA: 'No asistió sin avisar',
  DROGAS: 'Consumo de sustancias prohibidas',
  CONFLICTO: 'Conflicto con otro miembro',
  INCUMPLIMIENTO: 'Incumplimiento de acuerdos',
  FALTA_RESPETO: 'Falta de respeto',
  OTRO: 'Otro'
};

const SEVERITY_LABELS = {
  LOW: { label: 'Baja', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  MEDIUM: { label: 'Media', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  HIGH: { label: 'Alta', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  CRITICAL: { label: 'Crítica', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
};

const STATUS_LABELS = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  UNDER_REVIEW: { label: 'En Revisión', color: 'bg-blue-500/20 text-blue-400', icon: Eye },
  RESOLVED: { label: 'Resuelto', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  DISMISSED: { label: 'Descartado', color: 'bg-gray-500/20 text-gray-400', icon: X }
};

export default function BreachReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const visionIdParam = searchParams.get('visionId');
  const reportIdParam = searchParams.get('reportId');

  const [reports, setReports] = useState<BreachReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<BreachReport | null>(null);
  const [updating, setUpdating] = useState(false);
  const [resolution, setResolution] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (visionIdParam) params.append('visionId', visionIdParam);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(`/api/context-guardian/reports?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setReports(data.reports);
        
        // Si hay reportId en URL, seleccionar ese reporte
        if (reportIdParam) {
          const report = data.reports.find((r: BreachReport) => r.id === parseInt(reportIdParam));
          if (report) setSelectedReport(report);
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [visionIdParam, statusFilter, reportIdParam]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    
    if (status === 'authenticated') {
      fetchReports();
    }
  }, [status, fetchReports, router]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedReport) return;
    
    setUpdating(true);
    try {
      const res = await fetch('/api/context-guardian/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: newStatus,
          resolution: resolution || undefined
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('✅ Reporte actualizado');
        setSelectedReport(null);
        setResolution('');
        fetchReports();
      } else {
        alert(data.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Error al actualizar reporte');
    } finally {
      setUpdating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Reportes del Guardián del Contexto</h1>
              <p className="text-white/80">Gestiona los reportes de situaciones en las tribus</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-yellow-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {reports.filter(r => r.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Eye className="w-5 h-5" />
              <span className="font-semibold">En Revisión</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {reports.filter(r => r.status === 'UNDER_REVIEW').length}
            </p>
          </div>
          <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Resueltos</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {reports.filter(r => r.status === 'RESOLVED').length}
            </p>
          </div>
          <div className="bg-red-500/20 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Críticos</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {reports.filter(r => r.severity === 'CRITICAL' && r.status !== 'RESOLVED').length}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-gray-400">Filtrar por estado:</span>
          <div className="flex gap-2">
            {['all', 'PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? 'Todos' : STATUS_LABELS[status as keyof typeof STATUS_LABELS]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de reportes */}
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Scale className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No hay reportes que mostrar</p>
            </div>
          ) : (
            reports.map((report) => {
              const StatusIcon = STATUS_LABELS[report.status].icon;
              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`bg-gray-800/50 rounded-xl border p-5 cursor-pointer transition-all hover:bg-gray-800 ${
                    report.severity === 'CRITICAL' && report.status === 'PENDING'
                      ? 'border-red-500/50 animate-pulse'
                      : 'border-gray-700 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar del reportado */}
                    <div className="w-14 h-14 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {report.reportedUser.image ? (
                        <Image
                          src={report.reportedUser.image}
                          alt={report.reportedUser.nombre}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-3 text-gray-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white text-lg">{report.reportedUser.nombre}</p>
                          <p className="text-emerald-400 text-sm">{report.vision.nombre}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-xs border font-medium ${SEVERITY_LABELS[report.severity].color}`}>
                            {SEVERITY_LABELS[report.severity].label}
                          </span>
                          <span className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${STATUS_LABELS[report.status].color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_LABELS[report.status].label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <span className="inline-block bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                          {BREACH_TYPES[report.breachType] || report.breachType}
                        </span>
                      </div>

                      <p className="text-gray-300 mt-3 line-clamp-2">{report.description}</p>

                      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Reportado por: {report.reportedBy.nombre}
                        </span>
                        <span>
                          {new Date(report.createdAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de detalle y acciones */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-700 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Gestionar Reporte #{selectedReport.id}</h2>
                <p className="text-sm text-gray-400 mt-1">{selectedReport.vision.nombre}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setResolution('');
                }}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personas involucradas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-3">Persona reportada</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                      {selectedReport.reportedUser.image ? (
                        <Image
                          src={selectedReport.reportedUser.image}
                          alt={selectedReport.reportedUser.nombre}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-2 text-gray-500" />
                      )}
                    </div>
                    <p className="font-semibold text-white">{selectedReport.reportedUser.nombre}</p>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-3">Guardián que reporta</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                      {selectedReport.reportedBy.image ? (
                        <Image
                          src={selectedReport.reportedBy.image}
                          alt={selectedReport.reportedBy.nombre}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-2 text-gray-500" />
                      )}
                    </div>
                    <p className="font-semibold text-white">{selectedReport.reportedBy.nombre}</p>
                  </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Tipo de situación</p>
                  <p className="font-semibold text-white">
                    {BREACH_TYPES[selectedReport.breachType] || selectedReport.breachType}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Severidad</p>
                  <span className={`inline-block px-3 py-1 rounded-lg border ${SEVERITY_LABELS[selectedReport.severity].color}`}>
                    {SEVERITY_LABELS[selectedReport.severity].label}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Descripción del incidente
                </p>
                <p className="text-white bg-gray-800 rounded-xl p-4">{selectedReport.description}</p>
              </div>

              {/* Evidencias */}
              {selectedReport.evidenceUrls.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Evidencia fotográfica</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedReport.evidenceUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-video rounded-xl overflow-hidden bg-gray-800 hover:opacity-80 transition-opacity"
                      >
                        <Image
                          src={url}
                          alt={`Evidencia ${idx + 1}`}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado actual */}
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-2">Estado actual</p>
                <div className="flex items-center gap-2">
                  {(() => {
                    const StatusIcon = STATUS_LABELS[selectedReport.status].icon;
                    return (
                      <span className={`flex items-center gap-2 px-4 py-2 rounded-lg ${STATUS_LABELS[selectedReport.status].color}`}>
                        <StatusIcon className="w-5 h-5" />
                        {STATUS_LABELS[selectedReport.status].label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Acciones - Solo si no está resuelto/descartado */}
              {['PENDING', 'UNDER_REVIEW'].includes(selectedReport.status) && (
                <div className="border-t border-gray-700 pt-6">
                  <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Resolución (opcional)
                  </p>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Escribe la resolución o comentarios sobre este reporte..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none mb-4"
                  />
                  
                  <div className="flex gap-3">
                    {selectedReport.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                        disabled={updating}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                        Poner en Revisión
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={updating}
                      className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      Marcar Resuelto
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('DISMISSED')}
                      disabled={updating}
                      className="py-3 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                      Descartar
                    </button>
                  </div>
                </div>
              )}

              {/* Resolución previa */}
              {selectedReport.resolution && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-sm text-green-400 mb-2">Resolución</p>
                  <p className="text-white">{selectedReport.resolution}</p>
                  {selectedReport.resolvedBy && (
                    <p className="text-xs text-gray-500 mt-2">
                      Resuelto por: {selectedReport.resolvedBy.nombre} el{' '}
                      {new Date(selectedReport.resolvedAt || '').toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
