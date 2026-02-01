'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Scale,
  Camera,
  Upload,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  X,
  Clock,
  User,
  FileText,
  Eye,
  Filter
} from 'lucide-react';

interface TribeMember {
  id: number;
  nombre: string;
  image: string | null;
}

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
  resolvedBy?: {
    id: number;
    nombre: string;
  };
  resolution?: string;
  resolvedAt?: string;
}

interface ContextGuardianWidgetProps {
  visionId: number;
  visionName: string;
  isGuardian: boolean;
}

const BREACH_TYPES = {
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

export default function ContextGuardianWidget({ visionId, visionName, isGuardian }: ContextGuardianWidgetProps) {
  const [reports, setReports] = useState<BreachReport[]>([]);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form state
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [breachType, setBreachType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // View report modal
  const [viewingReport, setViewingReport] = useState<BreachReport | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams({ visionId: visionId.toString() });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const res = await fetch(`/api/context-guardian/reports?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setReports(data.reports);
        setTribeMembers(data.tribeMembers);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [visionId, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'IDENTITY_LAB');
      formData.append('folder', 'guardian-reports');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      
      const data = await res.json();
      if (data.secure_url) {
        setEvidenceUrls(prev => [...prev, data.secure_url]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedMember || !breachType || !description.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/context-guardian/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visionId,
          reportedUserId: selectedMember,
          breachType,
          description,
          severity,
          evidenceUrls
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('✅ Reporte enviado exitosamente. El coordinador será notificado.');
        // Reset form
        setSelectedMember(null);
        setBreachType('');
        setDescription('');
        setSeverity('MEDIUM');
        setEvidenceUrls([]);
        setShowForm(false);
        fetchReports();
      } else {
        alert(data.error || 'Error al enviar reporte');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error al enviar reporte');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de nuevo reporte */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl">
            <Scale className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">El Libro de la Ley</h2>
            <p className="text-emerald-300/80 text-sm">Reportes del Guardián del Contexto</p>
          </div>
        </div>
        
        {isGuardian && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
              showForm 
                ? 'bg-gray-700 text-gray-300' 
                : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600'
            }`}
          >
            {showForm ? (
              <>
                <X className="w-5 h-5" />
                Cancelar
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                Nuevo Reporte
              </>
            )}
          </button>
        )}
      </div>

      {/* Formulario de nuevo reporte */}
      {showForm && isGuardian && (
        <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-2xl border border-emerald-500/30 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Crear Reporte de Situación
          </h3>

          <div className="space-y-4">
            {/* Seleccionar miembro */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                ¿A quién reportas? *
              </label>
              <select
                value={selectedMember || ''}
                onChange={(e) => setSelectedMember(parseInt(e.target.value) || null)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="">Selecciona un miembro...</option>
                {tribeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de quiebre */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Tipo de situación *
              </label>
              <select
                value={breachType}
                onChange={(e) => setBreachType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="">Selecciona el tipo...</option>
                {Object.entries(BREACH_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severidad */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Nivel de gravedad
              </label>
              <div className="flex gap-2">
                {Object.entries(SEVERITY_LABELS).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setSeverity(key as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      severity === key 
                        ? color + ' font-semibold'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Descripción detallada *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe lo que sucedió con el mayor detalle posible..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Evidencia fotográfica */}
            <div>
              <label className="block text-sm font-medium text-emerald-300 mb-2">
                Evidencia fotográfica (opcional)
              </label>
              
              <div className="flex flex-wrap gap-3 mb-3">
                {evidenceUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-700">
                      <Image
                        src={url}
                        alt={`Evidencia ${index + 1}`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeEvidence(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                
                {/* Botón de subir */}
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-600 hover:border-emerald-500 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-gray-500" />
                      <span className="text-xs text-gray-500 mt-1">Subir</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Botón enviar */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedMember || !breachType || !description.trim()}
              className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Reporte al Coordinador
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Filtrar:</span>
        <div className="flex gap-2">
          {['all', 'PENDING', 'UNDER_REVIEW', 'RESOLVED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                statusFilter === status
                  ? 'bg-emerald-500/20 text-emerald-400'
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
          <div className="text-center py-12 text-gray-400">
            <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay reportes {statusFilter !== 'all' ? `con estado "${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS]?.label}"` : ''}</p>
          </div>
        ) : (
          reports.map((report) => {
            const StatusIcon = STATUS_LABELS[report.status].icon;
            return (
              <div
                key={report.id}
                className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-emerald-500/30 transition-colors cursor-pointer"
                onClick={() => setViewingReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                      {report.reportedUser.image ? (
                        <Image
                          src={report.reportedUser.image}
                          alt={report.reportedUser.nombre}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-2 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{report.reportedUser.nombre}</p>
                      <p className="text-sm text-gray-400">
                        {BREACH_TYPES[report.breachType as keyof typeof BREACH_TYPES] || report.breachType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs border ${SEVERITY_LABELS[report.severity].color}`}>
                      {SEVERITY_LABELS[report.severity].label}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${STATUS_LABELS[report.status].color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {STATUS_LABELS[report.status].label}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-300 mt-3 line-clamp-2">{report.description}</p>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>
                    Reportado por: {report.reportedBy.nombre}
                  </span>
                  <span>
                    {new Date(report.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {report.evidenceUrls.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {report.evidenceUrls.slice(0, 3).map((url, idx) => (
                      <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={url}
                          alt={`Evidencia ${idx + 1}`}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {report.evidenceUrls.length > 3 && (
                      <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                        +{report.evidenceUrls.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de ver reporte */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-700 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Detalle del Reporte</h2>
                <p className="text-sm text-gray-400 mt-1">ID: {viewingReport.id}</p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info del reportado */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden">
                  {viewingReport.reportedUser.image ? (
                    <Image
                      src={viewingReport.reportedUser.image}
                      alt={viewingReport.reportedUser.nombre}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-full h-full p-4 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{viewingReport.reportedUser.nombre}</p>
                  <p className="text-gray-400">Persona reportada</p>
                </div>
              </div>

              {/* Tipo y severidad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Tipo de situación</p>
                  <p className="font-semibold text-white">
                    {BREACH_TYPES[viewingReport.breachType as keyof typeof BREACH_TYPES] || viewingReport.breachType}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Severidad</p>
                  <span className={`inline-block px-3 py-1 rounded-lg border ${SEVERITY_LABELS[viewingReport.severity].color}`}>
                    {SEVERITY_LABELS[viewingReport.severity].label}
                  </span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Descripción</p>
                <p className="text-white bg-gray-800 rounded-xl p-4">{viewingReport.description}</p>
              </div>

              {/* Evidencias */}
              {viewingReport.evidenceUrls.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Evidencia fotográfica</p>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingReport.evidenceUrls.map((url, idx) => (
                      <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-gray-800">
                        <Image
                          src={url}
                          alt={`Evidencia ${idx + 1}`}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status y resolución */}
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">Estado actual</p>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-lg ${STATUS_LABELS[viewingReport.status].color}`}>
                    {(() => {
                      const StatusIcon = STATUS_LABELS[viewingReport.status].icon;
                      return <StatusIcon className="w-4 h-4" />;
                    })()}
                    {STATUS_LABELS[viewingReport.status].label}
                  </span>
                </div>
                
                {viewingReport.resolution && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Resolución</p>
                    <p className="text-white">{viewingReport.resolution}</p>
                    {viewingReport.resolvedBy && (
                      <p className="text-xs text-gray-500 mt-2">
                        Resuelto por: {viewingReport.resolvedBy.nombre} el{' '}
                        {new Date(viewingReport.resolvedAt || '').toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Reportado por: {viewingReport.reportedBy.nombre}</span>
                <span>
                  {new Date(viewingReport.createdAt).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
