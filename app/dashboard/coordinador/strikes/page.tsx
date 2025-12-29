'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Phone, CheckCircle, XCircle, Clock, Plus, FileText, Eye, User, Calendar } from 'lucide-react';

interface Participante {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  mentor: string | null;
  mentorId: number | null;
  llamadasPerdidas: number;
  llamadasCompletadas: number;
  totalStrikes: number;
  vidasExtra: number;
  statusLlamada: string;
  proximaLlamada: string | null;
  haIniciado: boolean;
  cartaEstado: string | null;
}

interface TareaExtraordinaria {
  id: number;
  titulo: string;
  descripcion: string | null;
  pointsReward: number;
  createdAt: string;
  Creator: {
    id: number;
    nombre: string;
  };
  Submissions: Array<{
    id: number;
    status: string;
    evidenciaUrl: string | null;
    comentario: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    feedbackMentor: string | null;
    Usuario: {
      id: number;
      nombre: string;
      email: string;
    };
    Reviewer: {
      nombre: string;
    } | null;
  }>;
}

export default function StrikesPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [tareas, setTareas] = useState<TareaExtraordinaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'con_strikes' | 'sin_llamada' | 'sin_iniciar'>('todos');
  const [modalTarea, setModalTarea] = useState(false);
  const [modalRevisar, setModalRevisar] = useState(false);
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState<Participante | null>(null);
  const [submissionSeleccionada, setSubmissionSeleccionada] = useState<any>(null);
  const [formTarea, setFormTarea] = useState({
    titulo: '',
    descripcion: '',
    puntos: 1
  });
  const [formRevision, setFormRevision] = useState({
    aprobado: true,
    comentarios: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [resParticipantes, resTareas] = await Promise.all([
        fetch('/api/coordinador/strikes'),
        fetch('/api/coordinador/tareas-extraordinarias')
      ]);

      const dataParticipantes = await resParticipantes.json();
      const dataTareas = await resTareas.json();

      if (dataParticipantes.success) {
        setParticipantes(dataParticipantes.participantes);
      }

      if (dataTareas.success) {
        setTareas(dataTareas.tareas);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const participantesFiltrados = participantes.filter(p => {
    if (filtro === 'con_strikes') return p.totalStrikes > 0;
    if (filtro === 'sin_llamada') return p.statusLlamada === 'NO_AGENDADA';
    if (filtro === 'sin_iniciar') return !p.haIniciado;
    return true;
  });

  const crearTarea = async () => {
    if (!participanteSeleccionado) return;

    try {
      const res = await fetch('/api/coordinador/tareas-extraordinarias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: participanteSeleccionado.id,
          ...formTarea
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Tarea extraordinaria asignada exitosamente');
        setModalTarea(false);
        setFormTarea({ titulo: '', descripcion: '', puntos: 1 });
        setParticipanteSeleccionado(null);
        cargarDatos();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error creando tarea:', error);
      alert('Error al crear tarea');
    }
  };

  const revisarTarea = async () => {
    if (!submissionSeleccionada) return;

    try {
      const res = await fetch(`/api/coordinador/tareas-extraordinarias/${submissionSeleccionada.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formRevision)
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        setModalRevisar(false);
        setFormRevision({ aprobado: true, comentarios: '' });
        setSubmissionSeleccionada(null);
        cargarDatos();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error revisando tarea:', error);
      alert('Error al revisar tarea');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NO_AGENDADA': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'AGENDADA': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'COMPLETADA': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'PERDIDA': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NO_AGENDADA': return 'Sin Agendar';
      case 'AGENDADA': return 'Agendada';
      case 'COMPLETADA': return 'Completada';
      case 'PERDIDA': return 'Perdida';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 via-orange-500 to-red-500 rounded-3xl shadow-2xl shadow-red-500/50">
                <Shield size={40} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">
                  Gestión de Strikes
                </h1>
                <p className="text-slate-400 text-lg">Administrar vidas extra y seguimiento de llamadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-900/60 via-blue-900/40 to-slate-900 border-2 border-blue-500/40 rounded-3xl p-6 hover:border-blue-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-blue-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-all">
                <User className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">{participantes.length}</span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Participantes</h3>
            <p className="text-sm text-slate-400 font-medium">Total en el sistema</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/60 via-orange-900/40 to-slate-900 border-2 border-orange-500/40 rounded-3xl p-6 hover:border-orange-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-orange-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all">
                <AlertTriangle className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent">
                {participantes.filter(p => p.totalStrikes > 0).length}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Con Strikes</h3>
            <p className="text-sm text-slate-400 font-medium">Necesitan atención</p>
          </div>

          <div className="bg-gradient-to-br from-red-900/60 via-red-900/40 to-slate-900 border-2 border-red-500/40 rounded-3xl p-6 hover:border-red-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-red-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl shadow-lg shadow-red-500/50 group-hover:shadow-red-500/70 transition-all">
                <Phone className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-red-400 to-rose-400 bg-clip-text text-transparent">
                {participantes.filter(p => p.statusLlamada === 'NO_AGENDADA').length}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Sin Llamada</h3>
            <p className="text-sm text-slate-400 font-medium">Por agendar</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/60 via-purple-900/40 to-slate-900 border-2 border-purple-500/40 rounded-3xl p-6 hover:border-purple-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-purple-900/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/50 group-hover:shadow-purple-500/70 transition-all">
                <XCircle className="text-white" size={28} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {participantes.filter(p => !p.haIniciado).length}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mb-1">Sin Iniciar</h3>
            <p className="text-sm text-slate-400 font-medium">No han comenzado</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] ${
              filtro === 'todos'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-xl shadow-yellow-500/50'
                : 'bg-slate-800/80 border-2 border-slate-700 text-slate-300 hover:border-yellow-500/50 hover:text-white'
            }`}
          >
            ✨ Todos ({participantes.length})
          </button>
          <button
            onClick={() => setFiltro('con_strikes')}
            className={`px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] ${
              filtro === 'con_strikes'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/50'
                : 'bg-slate-800/80 border-2 border-slate-700 text-slate-300 hover:border-orange-500/50 hover:text-white'
            }`}
          >
            ⚠️ Con Strikes ({participantes.filter(p => p.totalStrikes > 0).length})
          </button>
          <button
            onClick={() => setFiltro('sin_llamada')}
            className={`px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] ${
              filtro === 'sin_llamada'
                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/50'
                : 'bg-slate-800/80 border-2 border-slate-700 text-slate-300 hover:border-red-500/50 hover:text-white'
            }`}
          >
            📞 Sin Llamada ({participantes.filter(p => p.statusLlamada === 'NO_AGENDADA').length})
          </button>
          <button
            onClick={() => setFiltro('sin_iniciar')}
            className={`px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.98] ${
              filtro === 'sin_iniciar'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/50'
                : 'bg-slate-800/80 border-2 border-slate-700 text-slate-300 hover:border-purple-500/50 hover:text-white'
            }`}
          >
            🚫 Sin Iniciar ({participantes.filter(p => !p.haIniciado).length})
          </button>
        </div>

        {/* Widget: Tareas Extraordinarias Pendientes de Revisión */}
        {tareas.filter(t => t.Submissions.some(s => s.status === 'PENDING')).length > 0 && (
          <div className="bg-gradient-to-br from-orange-900/40 via-yellow-900/30 to-orange-900/40 border-2 border-orange-600/40 rounded-3xl p-6 mb-8 shadow-2xl shadow-orange-500/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl shadow-lg shadow-orange-500/50">
                  <FileText className="text-white" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Tareas Extraordinarias Pendientes</h2>
                  <p className="text-orange-200/80 text-sm font-medium">
                    {tareas.filter(t => t.Submissions.some(s => s.status === 'PENDING')).length} tareas requieren tu revisión
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tareas
                .filter(t => t.Submissions.some(s => s.status === 'PENDING'))
                .slice(0, 4)
                .map(tarea => {
                  const submission = tarea.Submissions.find(s => s.status === 'PENDING');
                  return (
                    <div
                      key={tarea.id}
                      className="bg-slate-900/60 border border-orange-600/30 rounded-xl p-5 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer"
                      onClick={() => {
                        setSubmissionSeleccionada(submission);
                        setModalRevisar(true);
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-white mb-1">{tarea.titulo}</h3>
                          <p className="text-sm text-orange-300 font-semibold">
                            👤 {submission?.Usuario.nombre}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-lg border border-yellow-500/30">
                          ⏳ PENDIENTE
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                        {tarea.descripcion || 'Sin descripción'}
                      </p>

                      {submission?.evidenciaUrl && (
                        <div className="flex items-center gap-2 text-xs text-green-300 font-medium">
                          <CheckCircle size={14} />
                          Evidencia enviada
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                        <span>📅 {new Date(tarea.createdAt).toLocaleDateString('es-MX')}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubmissionSeleccionada(submission);
                            setModalRevisar(true);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold rounded-lg transition-all text-xs"
                        >
                          <Eye size={12} className="inline mr-1" />
                          Revisar
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Lista de Participantes */}
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border-2 border-slate-700/50 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/50">
              <User className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-black text-white">Participantes</h2>
          </div>
          
          <div className="space-y-4">
            {participantesFiltrados.map((participante) => (
              <div
                key={participante.id}
                className="bg-gradient-to-r from-slate-800/80 via-slate-900/60 to-slate-800/80 border-2 border-slate-700/70 rounded-2xl p-6 hover:border-purple-500/50 transition-all group hover:scale-[1.01] shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/30">
                        <User size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{participante.nombre}</h3>
                        <p className="text-sm text-slate-400">{participante.email}</p>
                      </div>
                      {participante.rol === 'GAMECHANGER' && (
                        <span className="px-4 py-2 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-200 text-xs font-black rounded-xl border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/20">
                          ⚡ GAME CHANGER
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {/* Mentor */}
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">👤 Mentor</p>
                        <p className="text-sm font-bold text-slate-200">
                          {participante.mentor || 'Sin asignar'}
                        </p>
                      </div>

                      {/* Strikes */}
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">⚠️ Strikes / 💚 Vidas</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-black ${
                            participante.totalStrikes >= 3 ? 'text-red-400' :
                            participante.totalStrikes >= 2 ? 'text-orange-400' :
                            participante.totalStrikes >= 1 ? 'text-yellow-400' :
                            'text-emerald-400'
                          }`}>
                            {participante.totalStrikes}
                          </span>
                          <span className="text-slate-500 font-bold">/</span>
                          <span className="text-emerald-400 font-black text-2xl">
                            {participante.vidasExtra}
                          </span>
                        </div>
                      </div>

                      {/* Status Llamada */}
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">📞 Status</p>
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-black border-2 ${getStatusColor(participante.statusLlamada)}`}>
                          {getStatusLabel(participante.statusLlamada)}
                        </span>
                      </div>

                      {/* Llamadas */}
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-1.5 font-semibold">📊 Llamadas</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-emerald-500/20 rounded">
                              <CheckCircle size={14} className="text-emerald-400" />
                            </div>
                            <span className="text-lg font-black text-emerald-300">
                              {participante.llamadasCompletadas}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-red-500/20 rounded">
                              <XCircle size={14} className="text-red-400" />
                            </div>
                            <span className="text-lg font-black text-red-300">
                              {participante.llamadasPerdidas}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional */}
                    <div className="flex items-center gap-4 text-sm flex-wrap mt-3">
                      {participante.proximaLlamada && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                          <Calendar size={14} className="text-blue-400" />
                          <span className="text-blue-300 font-semibold">
                            Próxima: {new Date(participante.proximaLlamada).toLocaleDateString('es-MX')}
                          </span>
                        </div>
                      )}
                      {!participante.haIniciado && (
                        <span className="px-4 py-1.5 bg-red-500/30 text-red-200 text-xs font-black rounded-xl border-2 border-red-500/50 shadow-lg shadow-red-500/20">
                          🚫 NO HA INICIADO PROGRAMA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <button
                    onClick={() => {
                      setParticipanteSeleccionado(participante);
                      setModalTarea(true);
                    }}
                    className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-[1.05] active:scale-[0.98]"
                  >
                    <Plus size={20} />
                    Asignar Tarea
                  </button>
                </div>
              </div>
            ))}

            {participantesFiltrados.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700">
                <div className="p-6 bg-slate-800/50 rounded-3xl w-fit mx-auto mb-6">
                  <AlertTriangle size={64} className="text-slate-600 mx-auto" />
                </div>
                <p className="text-slate-300 text-xl font-bold mb-2">No hay participantes con este filtro</p>
                <p className="text-slate-500 text-sm">Intenta cambiar los filtros de búsqueda</p>
              </div>
            )}
          </div>
        </div>

        {/* Tareas Extraordinarias Pendientes */}
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border-2 border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg shadow-orange-500/50">
              <FileText className="text-white" size={28} />
            </div>
            <h2 className="text-3xl font-black text-white">Tareas Extraordinarias Pendientes</h2>
          </div>
          
          <div className="space-y-4">
            {tareas
              .filter(t => t.TaskSubmissions.length > 0 && t.TaskSubmissions[0].status === 'SUBMITTED')
              .map((tarea) => {
                const submission = tarea.TaskSubmissions[0];
                return (
                  <div
                    key={tarea.id}
                    className="bg-gradient-to-r from-slate-800/80 via-slate-900/60 to-slate-800/80 border-2 border-slate-700/70 rounded-2xl p-6 hover:border-orange-500/50 transition-all group hover:scale-[1.01] shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors">{tarea.titulo}</h3>
                        <p className="text-sm text-slate-400 mb-4">{tarea.descripcion}</p>
                        
                        <div className="flex items-center gap-4 text-sm mb-4 flex-wrap">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                            <User size={16} className="text-purple-400" />
                            <span className="text-purple-200 font-semibold">{tarea.Usuario.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg">
                            <Clock size={16} className="text-slate-400" />
                            <span className="text-slate-300 font-semibold">
                              {new Date(submission.createdAt).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        </div>

                        {submission.notes && (
                          <div className="bg-slate-900/80 border-2 border-slate-700/70 rounded-xl p-4 mb-3">
                            <p className="text-sm text-slate-300"><strong className="text-slate-200">💬 Notas:</strong> {submission.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {submission.evidenceUrl && (
                          <a
                            href={submission.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-500/50 transition-all hover:scale-[1.05] active:scale-[0.98]"
                          >
                            <Eye size={20} />
                            Ver Evidencia
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSubmissionSeleccionada(submission);
                            setModalRevisar(true);
                          }}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-emerald-500/50 transition-all hover:scale-[1.05] active:scale-[0.98]"
                        >
                          <FileText size={20} />
                          Revisar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {tareas.filter(t => t.TaskSubmissions.length > 0 && t.TaskSubmissions[0].status === 'SUBMITTED').length === 0 && (
              <div className="text-center py-12">
                <FileText size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No hay tareas pendientes de revisión</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Crear Tarea */}
      {modalTarea && participanteSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-purple-500/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl shadow-purple-500/20 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/50">
                <Plus size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Asignar Tarea Extraordinaria</h2>
                <p className="text-slate-400">{participanteSeleccionado.nombre}</p>
              </div>
            </div>

            <div className="space-y-5 mb-6">
              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  Título de la Tarea
                </label>
                <input
                  type="text"
                  value={formTarea.titulo}
                  onChange={(e) => setFormTarea({ ...formTarea, titulo: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="Ej: Crear video sobre tu progreso"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                  Descripción
                </label>
                <textarea
                  value={formTarea.descripcion}
                  onChange={(e) => setFormTarea({ ...formTarea, descripcion: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all h-32 resize-none"
                  placeholder="Describe qué debe hacer el participante para recuperar una vida extra..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  Puntos (opcional)
                </label>
                <input
                  type="number"
                  value={formTarea.puntos}
                  onChange={(e) => setFormTarea({ ...formTarea, puntos: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={crearTarea}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                ✨ Asignar Tarea
              </button>
              <button
                onClick={() => {
                  setModalTarea(false);
                  setParticipanteSeleccionado(null);
                  setFormTarea({ titulo: '', descripcion: '', puntos: 1 });
                }}
                className="px-6 py-4 bg-slate-700/50 border-2 border-slate-600 text-slate-300 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Revisar Tarea */}
      {modalRevisar && submissionSeleccionada && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-emerald-500/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl shadow-emerald-500/20 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/50">
                <FileText size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Revisar Tarea Extraordinaria</h2>
                <p className="text-slate-400">Aprobar o rechazar la entrega</p>
              </div>
            </div>

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                  ¿Aprobar esta tarea?
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFormRevision({ ...formRevision, aprobado: true })}
                    className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      formRevision.aprobado
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/50 border-2 border-emerald-400'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-emerald-500/50'
                    }`}
                  >
                    ✓ Aprobar (Otorgar Vida Extra)
                  </button>
                  <button
                    onClick={() => setFormRevision({ ...formRevision, aprobado: false })}
                    className={`flex-1 px-6 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      !formRevision.aprobado
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-xl shadow-red-500/50 border-2 border-red-400'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-red-500/50'
                    }`}
                  >
                    ✗ Rechazar
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                  Comentarios {!formRevision.aprobado && <span className="text-red-400 text-xs">(requerido para rechazo)</span>}
                </label>
                <textarea
                  value={formRevision.comentarios}
                  onChange={(e) => setFormRevision({ ...formRevision, comentarios: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all h-32 resize-none"
                  placeholder="Escribe tus comentarios sobre la tarea..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={revisarTarea}
                className={`flex-1 px-6 py-4 rounded-xl font-bold hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  formRevision.aprobado
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-500 text-white shadow-lg shadow-red-500/50'
                }`}
              >
                {formRevision.aprobado ? '✅ Aprobar y Otorgar Vida' : '❌ Rechazar Tarea'}
              </button>
              <button
                onClick={() => {
                  setModalRevisar(false);
                  setSubmissionSeleccionada(null);
                  setFormRevision({ aprobado: true, comentarios: '' });
                }}
                className="px-6 py-4 bg-slate-700/50 border-2 border-slate-600 text-slate-300 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
