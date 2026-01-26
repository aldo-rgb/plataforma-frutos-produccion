'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Calendar, 
  User, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  Building2,
  Filter,
  Clock,
  XCircle,
  Eye,
  Save
} from 'lucide-react';

interface ReporteAnonimoVision {
  id: number;
  organizationName: string;
  reporterNombre: string;
  reporterEmail: string;
  reportedUserNombre: string | null;
  reportedUserEmail: string | null;
  reportedUserRol: string | null;
  tipoReportado: string;
  mensaje: string;
  categoria: string;
  estado: string;
  notaInterna: string | null;
  revisadoPorNombre: string | null;
  revisadoAt: string | null;
  createdAt: string;
}

const CATEGORIAS = {
  QUEJA: { label: 'Queja', color: 'orange' },
  SUGERENCIA: { label: 'Sugerencia', color: 'blue' },
  ACOSO: { label: 'Acoso', color: 'red' },
  DISCRIMINACION: { label: 'Discriminación', color: 'purple' },
  OTRO: { label: 'Otro', color: 'slate' }
};

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'yellow', icon: Clock },
  EN_REVISION: { label: 'En Revisión', color: 'blue', icon: Eye },
  RESUELTO: { label: 'Resuelto', color: 'green', icon: CheckCircle },
  RECHAZADO: { label: 'Rechazado', color: 'red', icon: XCircle }
};

const TIPOS_REPORTADO = {
  TRAINER: 'Entrenador',
  COORDINADOR: 'Coordinador',
  GAME_CHANGER: 'Game Changer',
  MENTOR: 'Mentor',
  GENERAL: 'General'
};

export default function ReportesAnonimoVisionPage() {
  const [reportes, setReportes] = useState<ReporteAnonimoVision[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('ALL');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('ALL');
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteAnonimoVision | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [notaInterna, setNotaInterna] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarReportes = async () => {
    try {
      setCargando(true);
      setError(null);
      
      const response = await fetch('/api/vision/reporte-anonimo');
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('No tienes permisos para ver estos reportes');
        }
        throw new Error('Error al cargar los reportes');
      }
      
      const data = await response.json();
      setReportes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, []);

  const abrirModal = (reporte: ReporteAnonimoVision) => {
    setReporteSeleccionado(reporte);
    setNuevoEstado(reporte.estado);
    setNotaInterna(reporte.notaInterna || '');
  };

  const cerrarModal = () => {
    setReporteSeleccionado(null);
    setNuevoEstado('');
    setNotaInterna('');
  };

  const guardarCambios = async () => {
    if (!reporteSeleccionado) return;

    try {
      setGuardando(true);
      
      const response = await fetch('/api/vision/reporte-anonimo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporteId: reporteSeleccionado.id,
          estado: nuevoEstado,
          notaInterna
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el reporte');
      }

      await cargarReportes();
      cerrarModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar reportes
  const reportesFiltrados = reportes.filter(r => {
    if (filtroEstado !== 'ALL' && r.estado !== filtroEstado) return false;
    if (filtroCategoria !== 'ALL' && r.categoria !== filtroCategoria) return false;
    return true;
  });

  // Contar por estado
  const conteoEstados = {
    PENDIENTE: reportes.filter(r => r.estado === 'PENDIENTE').length,
    EN_REVISION: reportes.filter(r => r.estado === 'EN_REVISION').length,
    RESUELTO: reportes.filter(r => r.estado === 'RESUELTO').length,
    RECHAZADO: reportes.filter(r => r.estado === 'RECHAZADO').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
                <ShieldAlert className="text-white" size={40} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Buzón Anónimo - Visión</h1>
                <p className="text-orange-100">
                  Reportes confidenciales de participantes de visión
                </p>
              </div>
            </div>
            <button
              onClick={cargarReportes}
              disabled={cargando}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-4 text-center">
            <Clock className="text-yellow-500 mx-auto mb-2" size={24} />
            <p className="text-3xl font-bold text-yellow-500">{conteoEstados.PENDIENTE}</p>
            <p className="text-yellow-300/80 text-sm">Pendientes</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-xl p-4 text-center">
            <Eye className="text-blue-500 mx-auto mb-2" size={24} />
            <p className="text-3xl font-bold text-blue-500">{conteoEstados.EN_REVISION}</p>
            <p className="text-blue-300/80 text-sm">En Revisión</p>
          </div>
          <div className="bg-green-900/30 border border-green-600/50 rounded-xl p-4 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-2" size={24} />
            <p className="text-3xl font-bold text-green-500">{conteoEstados.RESUELTO}</p>
            <p className="text-green-300/80 text-sm">Resueltos</p>
          </div>
          <div className="bg-red-900/30 border border-red-600/50 rounded-xl p-4 text-center">
            <XCircle className="text-red-500 mx-auto mb-2" size={24} />
            <p className="text-3xl font-bold text-red-500">{conteoEstados.RECHAZADO}</p>
            <p className="text-red-300/80 text-sm">Rechazados</p>
          </div>
        </div>

        {/* Alert de Confidencialidad */}
        <div className="bg-yellow-900/30 border-2 border-yellow-600/50 rounded-xl p-6 mb-8 flex items-start gap-4">
          <AlertTriangle className="text-yellow-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-yellow-500 font-bold text-lg mb-2">
              Información Confidencial
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Estos reportes son anónimos y confidenciales. El participante no sabe que su mensaje 
              ha sido leído. Usa esta información solo para mejorar el servicio y proteger a los 
              participantes. <strong>No reveles la fuente de estos reportes.</strong>
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400" size={18} />
            <span className="text-slate-400">Filtros:</span>
          </div>
          
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_REVISION">En Revisión</option>
            <option value="RESUELTO">Resuelto</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600"
          >
            <option value="ALL">Todas las categorías</option>
            <option value="QUEJA">Queja</option>
            <option value="SUGERENCIA">Sugerencia</option>
            <option value="ACOSO">Acoso</option>
            <option value="DISCRIMINACION">Discriminación</option>
            <option value="OTRO">Otro</option>
          </select>

          <span className="text-slate-400 text-sm ml-auto">
            Mostrando {reportesFiltrados.length} de {reportes.length} reportes
          </span>
        </div>

        {/* Loading State */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="text-orange-500 animate-spin mb-4" size={48} />
            <p className="text-slate-400">Cargando reportes...</p>
          </div>
        )}

        {/* Error State */}
        {error && !cargando && (
          <div className="bg-red-900/30 border-2 border-red-600/50 rounded-xl p-8 text-center">
            <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
            <h3 className="text-red-500 font-bold text-xl mb-2">Error</h3>
            <p className="text-slate-300">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!cargando && !error && reportesFiltrados.length === 0 && (
          <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-12 text-center">
            <CheckCircle className="text-emerald-500 mx-auto mb-4" size={64} />
            <h3 className="text-white font-bold text-2xl mb-2">
              Sin reportes
            </h3>
            <p className="text-slate-400">
              {reportes.length === 0 
                ? 'No hay reportes anónimos en este momento. Esto es bueno 🎉'
                : 'No hay reportes que coincidan con los filtros seleccionados'}
            </p>
          </div>
        )}

        {/* Lista de Reportes */}
        {!cargando && !error && reportesFiltrados.length > 0 && (
          <div className="space-y-4">
            {reportesFiltrados.map((reporte) => {
              const categoriaInfo = CATEGORIAS[reporte.categoria as keyof typeof CATEGORIAS] || CATEGORIAS.OTRO;
              const estadoInfo = ESTADOS[reporte.estado as keyof typeof ESTADOS] || ESTADOS.PENDIENTE;
              const EstadoIcon = estadoInfo.icon;

              return (
                <div
                  key={reporte.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800/70 transition-all cursor-pointer"
                  onClick={() => abrirModal(reporte)}
                >
                  {/* Header del Reporte */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-700">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`bg-${categoriaInfo.color}-600/20 p-3 rounded-lg`}>
                        <ShieldAlert className={`text-${categoriaInfo.color}-500`} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`bg-${categoriaInfo.color}-600/30 text-${categoriaInfo.color}-300 px-3 py-1 rounded-full text-xs font-bold`}>
                            {categoriaInfo.label.toUpperCase()}
                          </span>
                          <span className={`bg-${estadoInfo.color}-600/30 text-${estadoInfo.color}-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                            <EstadoIcon size={12} />
                            {estadoInfo.label}
                          </span>
                          <span className="bg-slate-600/30 text-slate-300 px-3 py-1 rounded-full text-xs">
                            {TIPOS_REPORTADO[reporte.tipoReportado as keyof typeof TIPOS_REPORTADO] || reporte.tipoReportado}
                          </span>
                        </div>
                        
                        {/* Info del Reporte */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="text-indigo-400" size={16} />
                            <span className="text-slate-300 text-sm">
                              {reporte.organizationName}
                            </span>
                          </div>
                          
                          {reporte.reportedUserNombre && (
                            <div className="flex items-center gap-2">
                              <User className="text-red-400" size={16} />
                              <span className="text-slate-300 text-sm">
                                Reportado: {reporte.reportedUserNombre}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="text-emerald-400" size={16} />
                            <span className="text-slate-300 text-sm">
                              {new Date(reporte.createdAt).toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mensaje del Reporte */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <MessageSquare className="text-orange-400 flex-shrink-0" size={20} />
                      <h4 className="text-white font-semibold">Mensaje:</h4>
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-8 line-clamp-3">
                      {reporte.mensaje}
                    </p>
                  </div>

                  {/* Footer */}
                  {reporte.revisadoPorNombre && (
                    <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2 text-sm text-slate-400">
                      <User size={14} />
                      <span>Revisado por {reporte.revisadoPorNombre}</span>
                      {reporte.revisadoAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(reporte.revisadoAt).toLocaleDateString('es-MX')}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 bg-slate-800/30 rounded-xl p-6 border border-slate-700">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <ShieldAlert className="text-orange-500" size={20} />
            Acerca del Buzón Anónimo de Visión
          </h3>
          <div className="text-slate-400 text-sm space-y-2">
            <p>
              • Los reportes son <strong>anónimos</strong> aunque el sistema registra quién lo envía para evitar abuso.
            </p>
            <p>
              • Los participantes pueden reportar problemas con Entrenadores, Coordinadores, Game Changers y Mentores.
            </p>
            <p>
              • Es tu responsabilidad investigar y tomar acción cuando sea necesario.
            </p>
            <p>
              • <strong>Respeta la confidencialidad</strong>: nunca reveles que recibiste un reporte sobre alguien.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Detalle */}
      {reporteSeleccionado && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={cerrarModal}>
          <div 
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalle del Reporte</h2>
                <button
                  onClick={cerrarModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info del reporte */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">Organización</label>
                  <p className="text-white">{reporteSeleccionado.organizationName}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Categoría</label>
                  <p className="text-white">{CATEGORIAS[reporteSeleccionado.categoria as keyof typeof CATEGORIAS]?.label || reporteSeleccionado.categoria}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Tipo de Reportado</label>
                  <p className="text-white">{TIPOS_REPORTADO[reporteSeleccionado.tipoReportado as keyof typeof TIPOS_REPORTADO] || reporteSeleccionado.tipoReportado}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Fecha</label>
                  <p className="text-white">{new Date(reporteSeleccionado.createdAt).toLocaleDateString('es-MX')}</p>
                </div>
                {reporteSeleccionado.reportedUserNombre && (
                  <>
                    <div>
                      <label className="text-slate-400 text-sm">Persona Reportada</label>
                      <p className="text-white">{reporteSeleccionado.reportedUserNombre}</p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Rol</label>
                      <p className="text-white">{reporteSeleccionado.reportedUserRol}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Mensaje completo */}
              <div>
                <label className="text-slate-400 text-sm block mb-2">Mensaje Completo</label>
                <div className="bg-slate-900 rounded-lg p-4 text-slate-300 leading-relaxed">
                  {reporteSeleccionado.mensaje}
                </div>
              </div>

              {/* Reportante (oculto para proteger anonimato pero visible para admin) */}
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
                <p className="text-yellow-500 text-sm font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Información Confidencial (solo para gestión)
                </p>
                <p className="text-slate-400 text-sm">
                  Reportante: {reporteSeleccionado.reporterNombre} ({reporteSeleccionado.reporterEmail})
                </p>
              </div>

              {/* Actualizar estado */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-white font-bold mb-4">Gestión del Reporte</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-sm block mb-2">Estado</label>
                    <select
                      value={nuevoEstado}
                      onChange={(e) => setNuevoEstado(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600"
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_REVISION">En Revisión</option>
                      <option value="RESUELTO">Resuelto</option>
                      <option value="RECHAZADO">Rechazado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm block mb-2">Nota Interna (no visible para el reportante)</label>
                    <textarea
                      value={notaInterna}
                      onChange={(e) => setNotaInterna(e.target.value)}
                      placeholder="Agrega notas sobre las acciones tomadas..."
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 resize-none h-24"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={cerrarModal}
                className="px-6 py-3 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCambios}
                disabled={guardando}
                className="px-6 py-3 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Cambios
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
