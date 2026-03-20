'use client';

import { useState, useEffect } from 'react';
import { Bug, Clock, CheckCircle, AlertCircle, Trash2, Eye, ExternalLink, MessageSquare, RefreshCw, Filter, X } from 'lucide-react';
import Image from 'next/image';

interface BugReport {
  id: string;
  description: string;
  screenshotUrl: string | null;
  userName: string;
  userEmail: string | null;
  userId: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Clock,
  },
  in_progress: {
    label: 'En Progreso',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: RefreshCw,
  },
  resolved: {
    label: 'Resuelto',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle,
  },
  dismissed: {
    label: 'Descartado',
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    icon: X,
  },
};

export default function BugReportsAdminPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/bug-reports');
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      
      if (res.ok) {
        setReports(prev => prev.map(r => 
          r.id === id 
            ? { ...r, status: status as any, resolvedAt: status === 'resolved' ? new Date().toISOString() : r.resolvedAt } 
            : r
        ));
        if (selectedReport?.id === id) {
          setSelectedReport(prev => prev ? { ...prev, status: status as any } : null);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes }),
      });
      
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
        if (selectedReport?.id === id) {
          setSelectedReport(prev => prev ? { ...prev, notes } : null);
        }
        setEditingNotes(null);
      }
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este reporte?')) return;
    
    try {
      const res = await fetch(`/api/bug-reports?id=${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
        if (selectedReport?.id === id) {
          setSelectedReport(null);
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const filteredReports = filterStatus === 'all' 
    ? reports 
    : reports.filter(r => r.status === filterStatus);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300">
          <RefreshCw className="animate-spin" />
          <span>Cargando reportes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Bug className="text-amber-400" size={24} />
              </div>
              Reportes de Errores
              <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                BETA
              </span>
            </h1>
            <p className="text-slate-400 mt-1">
              {reports.length} reportes totales • {reports.filter(r => r.status === 'pending').length} pendientes
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={16} className="text-slate-500" />
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all' 
                ? 'bg-slate-700 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todos ({reports.length})
          </button>
          {Object.entries(statusConfig).map(([key, config]) => {
            const count = reports.filter(r => r.status === key).length;
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === key 
                    ? config.color + ' border' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon size={14} />
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de reportes */}
          <div className="lg:col-span-2 space-y-4">
            {filteredReports.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                <Bug className="mx-auto text-slate-600 mb-3" size={48} />
                <p className="text-slate-400">No hay reportes {filterStatus !== 'all' ? 'con este estado' : ''}</p>
              </div>
            ) : (
              filteredReports.map(report => {
                const config = statusConfig[report.status];
                const Icon = config.icon;
                
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`bg-slate-800/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-800 border ${
                      selectedReport?.id === report.id 
                        ? 'border-amber-500/50' 
                        : 'border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.color}`}>
                            <Icon size={12} />
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(report.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-white text-sm line-clamp-2 mb-2">
                          {report.description}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-bold">
                              {report.userName?.charAt(0)}
                            </div>
                            {report.userName}
                          </span>
                          {report.screenshotUrl && (
                            <span className="flex items-center gap-1 text-blue-400">
                              <Eye size={12} />
                              Con captura
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {report.screenshotUrl && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-700">
                          <Image
                            src={report.screenshotUrl}
                            alt="Screenshot"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel de detalles */}
          <div className="lg:col-span-1">
            {selectedReport ? (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Detalles del Reporte</h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Captura de pantalla */}
                {selectedReport.screenshotUrl && (
                  <a
                    href={selectedReport.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-4 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500/50 transition-colors"
                  >
                    <Image
                      src={selectedReport.screenshotUrl}
                      alt="Screenshot"
                      width={400}
                      height={225}
                      className="w-full h-auto"
                    />
                    <div className="p-2 bg-slate-700/50 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                      <ExternalLink size={12} />
                      Ver imagen completa
                    </div>
                  </a>
                )}

                {/* Descripción */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-400 mb-1 uppercase">Descripción</h4>
                  <p className="text-sm text-white whitespace-pre-wrap bg-slate-700/30 p-3 rounded-lg">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Info del usuario */}
                <div className="mb-4 space-y-2">
                  <h4 className="text-xs font-medium text-slate-400 uppercase">Usuario</h4>
                  <div className="text-sm text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold">
                      {selectedReport.userName?.charAt(0)}
                    </div>
                    <span>{selectedReport.userName}</span>
                  </div>
                  {selectedReport.userEmail && (
                    <p className="text-xs text-slate-500 ml-8">{selectedReport.userEmail}</p>
                  )}
                </div>

                {/* Página */}
                {selectedReport.pageUrl && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-400 mb-1 uppercase">Página</h4>
                    <p className="text-xs text-blue-400 truncate">{selectedReport.pageUrl}</p>
                  </div>
                )}

                {/* Fechas */}
                <div className="mb-4 text-xs text-slate-500 space-y-1">
                  <p>Creado: {formatDate(selectedReport.createdAt)}</p>
                  {selectedReport.resolvedAt && (
                    <p>Resuelto: {formatDate(selectedReport.resolvedAt)}</p>
                  )}
                </div>

                {/* Cambiar estado */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase">Cambiar Estado</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => updateStatus(selectedReport.id, key)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                            selectedReport.status === key 
                              ? config.color 
                              : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <Icon size={12} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notas */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase flex items-center gap-1">
                    <MessageSquare size={12} />
                    Notas Internas
                  </h4>
                  {editingNotes === selectedReport.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white resize-none focus:outline-none focus:border-amber-500"
                        rows={3}
                        placeholder="Agregar notas..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateNotes(selectedReport.id, notesText)}
                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNotes(selectedReport.id);
                        setNotesText(selectedReport.notes || '');
                      }}
                      className="w-full p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg text-sm text-left text-slate-400 hover:text-white transition-colors"
                    >
                      {selectedReport.notes || 'Clic para agregar notas...'}
                    </button>
                  )}
                </div>

                {/* Acciones */}
                <button
                  onClick={() => deleteReport(selectedReport.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar Reporte
                </button>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700/50">
                <Eye className="mx-auto text-slate-600 mb-3" size={32} />
                <p className="text-slate-400 text-sm">Selecciona un reporte para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
