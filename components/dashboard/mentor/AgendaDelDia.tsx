'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Video, User, ExternalLink, Settings, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Sesion {
  id: string;
  idNumerico: number;
  tipo: 'DISCIPLINA' | 'MENTORIA';
  alumno: string;
  alumnoEmail: string;
  alumnoImagen: string | null;
  servicio: string;
  servicioIcono: string;
  servicioDescripcion?: string;
  hora: string;
  horaInicio: string;
  horaFin: string | null;
  duracionMinutos: number;
  link: string | null;
  status: string;
  statusLabel: string;
  notas: string | null;
  monto?: number;
  fechaCompleta: Date;
  ordenHora: number;
}

interface AgendaResponse {
  success: boolean;
  error?: string;
  sesiones: Sesion[];
  stats: {
    total: number;
    disciplina: number;
    mentorias: number;
    confirmadas: number;
    pendientes: number;
    primeraHora: string | null;
    ultimaHora: string | null;
  };
  fecha: string;
  fechaLegible: string;
}

export default function AgendaDelDia() {
  const router = useRouter();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [stats, setStats] = useState<AgendaResponse['stats'] | null>(null);
  const [fechaLegible, setFechaLegible] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarAlertaEnlace, setMostrarAlertaEnlace] = useState(false);
  const [procesando, setProcesando] = useState<number | null>(null);

  const completarSesion = async (solicitudId: number) => {
    if (!confirm('¿Confirmar que la sesión ha sido completada?')) {
      return;
    }

    setProcesando(solicitudId);
    try {
      const res = await fetch('/api/mentor/solicitudes/completar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitudId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('✅ Sesión completada exitosamente');
        // Recargar las sesiones
        window.location.reload();
      } else {
        alert(`❌ ${data.error || 'No se pudo completar la sesión'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error de conexión');
    } finally {
      setProcesando(null);
    }
  };

  useEffect(() => {
    const cargarSesiones = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/mentor/agenda-hoy');
        
        if (!response.ok) {
          throw new Error('Error al cargar la agenda');
        }
        
        const data: AgendaResponse = await response.json();
        
        console.log('📊 Datos de agenda recibidos:', data);
        console.log('🔗 Links en sesiones:', (data.sesiones || []).map(s => ({
          id: s.id,
          status: s.status,
          link: s.link
        })));
        
        if (data.success) {
          setSesiones(data.sesiones || []);
          setStats(data.stats);
          setFechaLegible(data.fechaLegible);
          
          // Verificar si hay sesiones confirmadas sin enlace
          const tieneSesionesSinEnlace = (data.sesiones || []).some(
            s => (s.status === 'CONFIRMADA' || s.status === 'CONFIRMED') && !s.link
          );
          setMostrarAlertaEnlace(tieneSesionesSinEnlace);
          
          console.log('✅ Agenda cargada:', data.stats);
          console.log('🚨 Mostrar alerta de enlace:', tieneSesionesSinEnlace);
        } else {
          throw new Error(data.error || 'Error desconocido');
        }
      } catch (err) {
        console.error('❌ Error cargando agenda:', err);
        setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda');
      } finally {
        setLoading(false);
      }
    };

    cargarSesiones();
  }, []);

  // Estado de carga
  if (loading) {
    return (
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        <p className="text-slate-400 text-sm">Cargando agenda...</p>
      </div>
    );
  }
  // CASO 1: HAY SESIONES PAGADAS
  if (sesiones.length > 0) {
    return (
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
        {/* Alerta si no tiene configurado el enlace de videollamada */}
        {mostrarAlertaEnlace && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-200 font-medium text-sm">
                Configura tu enlace de videollamada
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                Necesitas configurar Zoom/Meet/Teams en tu perfil
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/mentor/perfil')}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar
            </button>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" /> 
              Agenda del Día
            </h3>
            {fechaLegible && (
              <p className="text-xs text-slate-400 mt-1">{fechaLegible}</p>
            )}
          </div>
          
          {stats && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-full bg-purple-900/30 text-purple-300 border border-purple-800/50">
                {stats.total} {stats.total === 1 ? 'sesión' : 'sesiones'}
              </span>
              {stats.disciplina > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-orange-900/30 text-orange-300 border border-orange-800/50">
                  {stats.disciplina} disciplina
                </span>
              )}
              {stats.mentorias > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-300 border border-blue-800/50">
                  {stats.mentorias} mentoría{stats.mentorias !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {sesiones.map((sesion) => (
            <div 
              key={sesion.id} 
              className={`bg-slate-800/50 p-4 rounded-lg border-l-4 hover:bg-slate-800 transition-all duration-200 ${
                sesion.tipo === 'DISCIPLINA' ? 'border-orange-500' : 'border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Servicio */}
                  <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>{sesion.servicioIcono}</span>
                    <span className="truncate">{sesion.servicio}</span>
                  </h4>
                  
                  {/* Alumno */}
                  <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                    <User size={14} className="flex-shrink-0" />
                    <span className="truncate font-medium">{sesion.alumno}</span>
                    {sesion.monto && (
                      <span className="text-xs text-green-400 ml-auto">
                        ${sesion.monto.toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {/* Hora */}
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <div className="bg-slate-900/70 px-3 py-1.5 rounded-md flex items-center gap-2">
                      <Clock size={14} className="text-purple-400 flex-shrink-0" />
                      <span className="text-slate-200 font-medium">{sesion.hora}</span>
                      <span className="text-xs text-slate-500">
                        ({sesion.duracionMinutos} min)
                      </span>
                    </div>
                  </div>

                  {/* Notas (si existen) */}
                  {sesion.notas && (
                    <p className="text-xs text-slate-400 italic mt-2 line-clamp-2">
                      💬 {sesion.notas}
                    </p>
                  )}

                  {/* Badge de estado */}
                  <div className="mt-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      sesion.status === 'CONFIRMED' || sesion.status === 'CONFIRMADA'
                        ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
                        : sesion.status === 'COMPLETADA'
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                        : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50'
                    }`}>
                      {sesion.statusLabel}
                    </span>
                  </div>
                </div>
                
                {/* Botones de acción */}
                <div className="flex gap-2 items-center">
                  {sesion.link ? (
                    <>
                      <a 
                        href={sesion.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-all flex-shrink-0 group shadow-lg hover:shadow-purple-900/50"
                        title="Unirse a la llamada"
                      >
                        <Video size={18} className="group-hover:scale-110 transition-transform" />
                      </a>
                      
                      {/* Botón Completar solo para sesiones de mentoría confirmadas */}
                      {sesion.tipo === 'MENTORIA' && sesion.status === 'CONFIRMADA' && (
                        <button
                          onClick={() => completarSesion(sesion.idNumerico)}
                          disabled={procesando === sesion.idNumerico}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-all flex-shrink-0 group shadow-lg hover:shadow-green-900/50 flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Completar sesión"
                        >
                          {procesando === sesion.idNumerico ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle size={16} className="group-hover:scale-110 transition-transform" />
                          )}
                          <span>{procesando === sesion.idNumerico ? 'Procesando...' : 'Completar'}</span>
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer con resumen */}
        {stats && stats.primeraHora && stats.ultimaHora && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Primera sesión: {stats.primeraHora}</span>
            <span>Última sesión: {stats.ultimaHora}</span>
          </div>
        )}
      </div>
    );
  }

  // CASO 2: NO HAY SESIONES (ESTADO VACÍO)
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
        <Clock className="w-8 h-8" />
      </div>
      <h3 className="text-white font-bold text-lg mb-2">Agenda del Día</h3>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        Aquí aparecerán tus llamadas cuando tengas alumnos asignados.
      </p>
    </div>
  );
}
