'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Calendar, User, MessageSquare, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface ReporteAnonimo {
  id: number;
  bookingId: number;
  mensaje: string;
  createdAt: string;
  nombreMentor?: string;
  nombreParticipante?: string;
  fechaSesion?: string;
}

export default function ReportesAnonimosPage() {
  const [reportes, setReportes] = useState<ReporteAnonimo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarReportes = async () => {
    try {
      setCargando(true);
      setError(null);
      
      const response = await fetch('/api/student/buzon-anonimo');
      
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
                <h1 className="text-4xl font-bold text-white mb-2">Buzón Anónimo</h1>
                <p className="text-orange-100">
                  Reportes confidenciales de participantes
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
        {!cargando && !error && reportes.length === 0 && (
          <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-12 text-center">
            <CheckCircle className="text-emerald-500 mx-auto mb-4" size={64} />
            <h3 className="text-white font-bold text-2xl mb-2">
              Sin reportes pendientes
            </h3>
            <p className="text-slate-400">
              No hay reportes anónimos en este momento. Esto es bueno 🎉
            </p>
          </div>
        )}

        {/* Lista de Reportes */}
        {!cargando && !error && reportes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                {reportes.length} {reportes.length === 1 ? 'Reporte' : 'Reportes'}
              </h2>
            </div>

            {reportes.map((reporte) => (
              <div
                key={reporte.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800/70 transition-all"
              >
                {/* Header del Reporte */}
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-700">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-orange-600/20 p-3 rounded-lg">
                      <ShieldAlert className="text-orange-500" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-orange-600/30 text-orange-300 px-3 py-1 rounded-full text-xs font-bold">
                          ANÓNIMO
                        </span>
                        <span className="text-slate-400 text-sm">
                          Booking #{reporte.bookingId}
                        </span>
                      </div>
                      
                      {/* Info de la Sesión */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        {reporte.nombreMentor && (
                          <div className="flex items-center gap-2">
                            <User className="text-purple-400" size={16} />
                            <span className="text-slate-300 text-sm">
                              Mentor: {reporte.nombreMentor}
                            </span>
                          </div>
                        )}
                        
                        {reporte.nombreParticipante && (
                          <div className="flex items-center gap-2">
                            <User className="text-blue-400" size={16} />
                            <span className="text-slate-300 text-sm">
                              Participante: {reporte.nombreParticipante}
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
                    <h4 className="text-white font-semibold">Mensaje del Participante:</h4>
                  </div>
                  <p className="text-slate-300 leading-relaxed pl-8">
                    {reporte.mensaje}
                  </p>
                </div>

                {/* Footer con Fecha de Sesión */}
                {reporte.fechaSesion && (
                  <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-2 text-sm text-slate-400">
                    <Calendar size={14} />
                    <span>Sesión programada: {reporte.fechaSesion}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 bg-slate-800/30 rounded-xl p-6 border border-slate-700">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <ShieldAlert className="text-orange-500" size={20} />
            Acerca del Buzón Anónimo
          </h3>
          <div className="text-slate-400 text-sm space-y-2">
            <p>
              • Los reportes son <strong>completamente anónimos</strong>. El sistema no revela quién envió el mensaje.
            </p>
            <p>
              • Los participantes usan este canal para reportar problemas sensibles o situaciones incómodas.
            </p>
            <p>
              • Es tu responsabilidad como administrador investigar y tomar acción cuando sea necesario.
            </p>
            <p>
              • <strong>Respeta la confidencialidad</strong>: nunca reveles que recibiste un reporte anónimo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
