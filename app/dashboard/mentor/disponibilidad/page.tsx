'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, AlertCircle, CheckCircle, Loader2, X, Save, Plane, User, Briefcase, Heart, Globe, Lock, Info } from 'lucide-react';
import { getUserTimeZone } from '@/utils/timezone';

interface BloqueHorario {
  id: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

interface Excepcion {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  descripcion?: string;
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Horas disponibles de 12 AM a 11 PM (24 horas completas)
const HORAS_DISPONIBLES = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

// Configuración visual de los motivos
const MOTIVOS_CONFIG = [
  { id: 'Vacaciones', label: 'Vacaciones', icon: Plane, color: 'text-orange-400', border: 'border-orange-500', bg: 'bg-orange-500/10' },
  { id: 'Personal', label: 'Asunto Personal', icon: User, color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/10' },
  { id: 'Médico', label: 'Salud / Médico', icon: Heart, color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/10' },
  { id: 'Conferencia', label: 'Conferencia', icon: Briefcase, color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-500/10' },
];

export default function DisponibilidadMentorPage() {
  const [pestana, setPestana] = useState<'semanal' | 'excepciones'>('semanal');
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Estados para grilla selectora
  const [diaSeleccionado, setDiaSeleccionado] = useState(1); // 1 = Lunes
  const [horariosSeleccionados, setHorariosSeleccionados] = useState<{ [key: number]: string[] }>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  });
  
  // NUEVO: Estado para bloqueos de disciplina
  const [bloqueosDisciplina, setBloqueosDisciplina] = useState<string[]>([]);

  // Estado para nueva excepción
  const [nuevaExcepcion, setNuevaExcepcion] = useState({
    fechaInicio: '',
    fechaFin: '',
    motivo: 'Vacaciones',
    descripcion: ''
  });

  const [modalConfirmacion, setModalConfirmacion] = useState<{
    show: boolean;
    tipo: 'eliminar' | 'excepcion';
    data?: any;
    conflictos?: any[];
  } | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [pestana]);

  // NUEVO: Cargar bloqueos de disciplina al cambiar de día
  useEffect(() => {
    cargarBloqueosDisciplina();
  }, [diaSeleccionado]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (pestana === 'semanal') {
        const res = await fetch('/api/mentor/disponibilidad/semanal');
        const data = await res.json();
        if (data.success) {
          setBloques(data.disponibilidad);
          // Convertir bloques a formato de horarios seleccionados
          const horariosMap: { [key: number]: string[] } = {
            0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
          };
          
          data.disponibilidad.forEach((bloque: BloqueHorario) => {
            // Extraer todas las horas del bloque
            const horaInicioNum = parseInt(bloque.horaInicio.split(':')[0]);
            const horaFinNum = parseInt(bloque.horaFin.split(':')[0]);
            
            for (let h = horaInicioNum; h < horaFinNum; h++) {
              const horaStr = `${String(h).padStart(2, '0')}:00`;
              if (HORAS_DISPONIBLES.includes(horaStr) && !horariosMap[bloque.diaSemana].includes(horaStr)) {
                horariosMap[bloque.diaSemana].push(horaStr);
              }
            }
          });
          
          setHorariosSeleccionados(horariosMap);
        }
      } else {
        const res = await fetch('/api/mentor/disponibilidad/excepciones');
        const data = await res.json();
        if (data.success) {
          setExcepciones(data.excepciones);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarBloqueosDisciplina = async () => {
    try {
      const res = await fetch(`/api/mentor/disciplina/horarios?dia=${diaSeleccionado}`);
      const data = await res.json();
      
      if (data.success && data.horarios) {
        setBloqueosDisciplina(data.horarios);
      } else {
        setBloqueosDisciplina([]);
      }
    } catch (error) {
      console.error('Error cargando bloqueos de disciplina:', error);
      setBloqueosDisciplina([]);
    }
  };

  const mostrarMensaje = (tipo: 'success' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const toggleHora = (hora: string) => {
    // SEGURIDAD: Si es hora de disciplina, NO hacer nada
    if (bloqueosDisciplina.includes(hora)) {
      mostrarMensaje('error', '🔒 Esta hora está reservada para Llamadas de Disciplina');
      return;
    }
    
    const horasDelDia = horariosSeleccionados[diaSeleccionado] || [];
    if (horasDelDia.includes(hora)) {
      // Si ya está, la quitamos
      setHorariosSeleccionados({
        ...horariosSeleccionados,
        [diaSeleccionado]: horasDelDia.filter(h => h !== hora)
      });
    } else {
      // Si no está, la agregamos
      setHorariosSeleccionados({
        ...horariosSeleccionados,
        [diaSeleccionado]: [...horasDelDia, hora].sort()
      });
    }
  };

  const guardarDia = async () => {
    setProcesando(true);
    try {
      const horasDelDia = horariosSeleccionados[diaSeleccionado] || [];

      // Primero eliminar bloques existentes del día
      const bloquesDelDia = bloques.filter(b => b.diaSemana === diaSeleccionado);
      for (const bloque of bloquesDelDia) {
        await fetch(`/api/mentor/disponibilidad/semanal?id=${bloque.id}`, {
          method: 'DELETE'
        });
      }

      // Si no hay horas seleccionadas, solo mostrar mensaje y salir
      if (horasDelDia.length === 0) {
        mostrarMensaje('success', `✅ ${DIAS_SEMANA[diaSeleccionado]} marcado como no disponible`);
        cargarDatos();
        setProcesando(false);
        return;
      }

      // Agrupar horas consecutivas en bloques
      const horasOrdenadas = [...horasDelDia].sort();
      const bloquesNuevos: { horaInicio: string; horaFin: string }[] = [];
      let bloqueActual = { horaInicio: horasOrdenadas[0], horaFin: '' };

      for (let i = 0; i < horasOrdenadas.length; i++) {
        const horaActual = parseInt(horasOrdenadas[i].split(':')[0]);
        const horaSiguiente = i < horasOrdenadas.length - 1 ? parseInt(horasOrdenadas[i + 1].split(':')[0]) : null;

        if (horaSiguiente === null || horaSiguiente !== horaActual + 1) {
          // Fin del bloque
          bloqueActual.horaFin = `${String(horaActual + 1).padStart(2, '0')}:00`;
          bloquesNuevos.push(bloqueActual);
          if (horaSiguiente !== null) {
            bloqueActual = { horaInicio: horasOrdenadas[i + 1], horaFin: '' };
          }
        }
      }

      // Crear los nuevos bloques
      for (const bloque of bloquesNuevos) {
        const res = await fetch('/api/mentor/disponibilidad/semanal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            diaSemana: diaSeleccionado,
            horaInicio: bloque.horaInicio,
            horaFin: bloque.horaFin
          })
        });

        const data = await res.json();
        if (!res.ok && res.status === 409) {
          // Hay conflictos
          mostrarMensaje('error', data.error);
          setProcesando(false);
          return;
        }
      }

      mostrarMensaje('success', `✅ Horario de ${DIAS_SEMANA[diaSeleccionado]} actualizado correctamente`);
      cargarDatos();
    } catch (error) {
      mostrarMensaje('error', 'Error de conexión');
    } finally {
      setProcesando(false);
    }
  };

  const agregarExcepcion = async (cancelarSesiones = false) => {
    setProcesando(true);
    try {
      const res = await fetch('/api/mentor/disponibilidad/excepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevaExcepcion, cancelarSesiones })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        mostrarMensaje('success', `✅ Bloqueo agregado. ${data.sesionesAfectadas} sesión(es) cancelada(s)`);
        setModalConfirmacion(null);
        cargarDatos();
        setNuevaExcepcion({ fechaInicio: '', fechaFin: '', motivo: 'Vacaciones', descripcion: '' });
      } else if (res.status === 409 && data.requireConfirmation) {
        // Mostrar modal de confirmación
        setModalConfirmacion({
          show: true,
          tipo: 'excepcion',
          conflictos: data.sesionesAfectadas
        });
      } else {
        mostrarMensaje('error', data.error || 'Error al agregar bloqueo');
      }
    } catch (error) {
      mostrarMensaje('error', 'Error de conexión');
    } finally {
      setProcesando(false);
    }
  };

  const eliminarExcepcion = async (id: number) => {
    setProcesando(true);
    try {
      const res = await fetch(`/api/mentor/disponibilidad/excepciones?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok && data.success) {
        mostrarMensaje('success', '✅ Bloqueo eliminado correctamente');
        cargarDatos();
      } else {
        mostrarMensaje('error', data.error || 'Error al eliminar bloqueo');
      }
    } catch (error) {
      mostrarMensaje('error', 'Error de conexión');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Mensajes */}
        {mensaje && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slideDown ${
            mensaje.tipo === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {mensaje.tipo === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {mensaje.texto}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Gestión de Disponibilidad</h1>
          <p className="text-slate-400">Configura tu horario habitual y días no laborales</p>
        </div>

        {/* Pestañas */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setPestana('semanal')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              pestana === 'semanal'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horario Habitual
            </div>
          </button>
          <button
            onClick={() => setPestana('excepciones')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              pestana === 'excepciones'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Días Bloqueados
            </div>
          </button>
        </div>

        {/* Contenido de Horario Semanal */}
        {pestana === 'semanal' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Configura tu Semana</h2>
              <p className="text-slate-400">Selecciona un día y haz clic en las horas que quieres trabajar</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Cargando disponibilidad...</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* COLUMNA IZQUIERDA: DÍAS */}
                <div className="w-full lg:w-1/4 flex flex-col gap-2">
                  {DIAS_SEMANA.map((dia, index) => {
                    const horasDelDia = horariosSeleccionados[index] || [];
                    return (
                      <button
                        key={index}
                        onClick={() => setDiaSeleccionado(index)}
                        className={`p-4 rounded-xl text-left font-medium transition-all flex justify-between items-center ${
                          diaSeleccionado === index 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105' 
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700'
                        }`}
                      >
                        <span>{dia}</span>
                        {horasDelDia.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                              {horasDelDia.length}h
                            </span>
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* COLUMNA DERECHA: GRILLA DE HORAS */}
                <div className="flex-1 bg-slate-900 p-6 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="text-purple-400 w-6 h-6" /> 
                      Horas para {DIAS_SEMANA[diaSeleccionado]}
                    </h3>
                    <span className="text-sm text-slate-400 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                      {horariosSeleccionados[diaSeleccionado]?.length || 0} horas seleccionadas
                    </span>
                  </div>

                  {/* Leyenda de colores */}
                  <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-red-900/50 rounded border border-red-900"></div>
                      <span>Disciplina (Bloqueado)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-green-500/20 rounded border border-green-500"></div>
                      <span>Disponible</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-slate-800 rounded border border-slate-700"></div>
                      <span>Libre</span>
                    </div>
                  </div>

                  {/* Alerta de bloqueos */}
                  {bloqueosDisciplina.length > 0 && (
                    <div className="mb-4 p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex items-start gap-2">
                      <Info className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-red-300">
                        <strong>{bloqueosDisciplina.length} hora(s)</strong> reservadas para Llamadas de Disciplina y no pueden modificarse.
                      </p>
                    </div>
                  )}

                  {/* Grilla de Horas */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
                    {HORAS_DISPONIBLES.map(hora => {
                      const estaBloqueada = bloqueosDisciplina.includes(hora);
                      const estaSeleccionada = horariosSeleccionados[diaSeleccionado]?.includes(hora);
                      
                      let claseBase = "py-3 px-2 rounded-lg text-sm font-bold border-2 transition-all transform hover:scale-105 disabled:cursor-not-allowed flex items-center justify-center gap-1 ";
                      
                      if (estaBloqueada) {
                        claseBase += "bg-red-900/20 border-red-900/50 text-red-400 opacity-80 cursor-not-allowed";
                      } else if (estaSeleccionada) {
                        claseBase += "bg-green-500/20 border-green-500 text-green-400 shadow-lg shadow-green-500/20";
                      } else {
                        claseBase += "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300";
                      }
                      
                      return (
                        <button
                          key={hora}
                          onClick={() => toggleHora(hora)}
                          disabled={procesando || estaBloqueada}
                          className={claseBase}
                          title={estaBloqueada ? 'Reservado para Llamada de Disciplina' : 'Clic para activar/desactivar'}
                        >
                          {estaBloqueada && <Lock size={12} />}
                          <span>{hora}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Botón de Guardar */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setHorariosSeleccionados({
                          ...horariosSeleccionados,
                          [diaSeleccionado]: []
                        });
                      }}
                      disabled={procesando}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Limpiar
                    </button>
                    <button
                      onClick={guardarDia}
                      disabled={procesando}
                      className="bg-white hover:bg-gray-100 text-black px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                    >
                      {procesando ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Guardar {DIAS_SEMANA[diaSeleccionado]}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contenido de Excepciones */}
        {pestana === 'excepciones' && (
          <div className="space-y-8">
            
            {/* 1. TARJETA DE CREACIÓN */}
            <div className="bg-[#0f111a] p-6 rounded-2xl border border-gray-800 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Calendar className="text-purple-400 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Bloquear Fechas</h3>
                  <p className="text-gray-400 text-sm">Selecciona los días que no estarás disponible</p>
                </div>
              </div>

              {/* SELECTOR DE MOTIVOS (TIPO TARJETAS) */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-300 mb-3 block">¿Cuál es el motivo?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {MOTIVOS_CONFIG.map((opcion) => {
                    const Icon = opcion.icon;
                    const isSelected = nuevaExcepcion.motivo === opcion.id;
                    return (
                      <button
                        key={opcion.id}
                        onClick={() => setNuevaExcepcion({ ...nuevaExcepcion, motivo: opcion.id })}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                          isSelected 
                            ? `${opcion.bg} ${opcion.border} border-2` 
                            : 'bg-[#1a1d2d] border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <Icon className={`${opcion.color}`} size={20} />
                        <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {opcion.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* INPUTS DE FECHA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Desde el día</label>
                  <input 
                    type="date" 
                    value={nuevaExcepcion.fechaInicio}
                    onChange={(e) => setNuevaExcepcion({ ...nuevaExcepcion, fechaInicio: e.target.value })}
                    className="w-full bg-[#1a1d2d] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Hasta el día</label>
                  <input 
                    type="date" 
                    value={nuevaExcepcion.fechaFin}
                    onChange={(e) => setNuevaExcepcion({ ...nuevaExcepcion, fechaFin: e.target.value })}
                    className="w-full bg-[#1a1d2d] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* INPUT DE NOTA OPCIONAL */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 mb-2 block">Nota interna (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Viaje familiar a la playa..."
                  value={nuevaExcepcion.descripcion}
                  onChange={(e) => setNuevaExcepcion({ ...nuevaExcepcion, descripcion: e.target.value })}
                  className="w-full bg-[#1a1d2d] border border-gray-700 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* BOTÓN DE ACCIÓN */}
              <button 
                onClick={() => agregarExcepcion(false)}
                disabled={procesando || !nuevaExcepcion.fechaInicio || !nuevaExcepcion.fechaFin}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {procesando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Plus size={20} /> 
                    Agregar Bloqueo al Calendario
                  </>
                )}
              </button>
            </div>

            {/* 2. LISTA DE BLOQUEOS EXISTENTES */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 pl-1">📅 Tus Días Bloqueados</h3>
              
              {loading ? (
                <div className="text-center py-12 bg-[#1a1d2d] rounded-xl border border-gray-800">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Cargando bloqueos...</p>
                </div>
              ) : excepciones.length === 0 ? (
                <div className="text-center p-8 bg-[#1a1d2d] rounded-xl border border-gray-800 border-dashed">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                  <p className="text-gray-500">No tienes días bloqueados. Tu agenda está totalmente abierta.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {excepciones.map((bloque) => {
                    // Buscar estilo del motivo
                    const estilo = MOTIVOS_CONFIG.find(m => m.id === bloque.motivo) || MOTIVOS_CONFIG[0];
                    const Icon = estilo.icon;

                    return (
                      <div key={bloque.id} className="bg-[#1a1d2d] p-4 rounded-xl border border-gray-800 flex justify-between items-center group hover:border-gray-600 transition-all">
                        <div className="flex items-center gap-4">
                          {/* Icono grande con fondo */}
                          <div className={`w-12 h-12 rounded-full ${estilo.bg} flex items-center justify-center border ${estilo.border} border-opacity-30`}>
                            <Icon className={estilo.color} size={20} />
                          </div>
                          
                          <div>
                            <h4 className="text-white font-bold text-lg flex items-center gap-2">
                              {bloque.descripcion || estilo.label}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300 font-mono">
                                {new Date(bloque.fechaInicio).toLocaleDateString('es-ES')}
                              </span>
                              <span>hasta</span>
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300 font-mono">
                                {new Date(bloque.fechaFin).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => eliminarExcepcion(bloque.id)}
                          disabled={procesando}
                          className="p-3 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar bloqueo"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Conflictos */}
      {modalConfirmacion?.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {modalConfirmacion.tipo === 'eliminar' ? '⚠️ Sesiones Afectadas' : '⚠️ Conflicto Detectado'}
                  </h3>
                  <p className="text-slate-400 text-sm">Hay sesiones confirmadas</p>
                </div>
              </div>
              <button
                onClick={() => setModalConfirmacion(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm mb-3">
                Las siguientes sesiones están programadas en este horario:
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {modalConfirmacion.conflictos?.map((conflicto, i) => (
                  <div key={i} className="bg-slate-800 rounded p-2 text-sm">
                    <p className="text-white font-medium">{conflicto.estudiante}</p>
                    <p className="text-slate-400">{new Date(conflicto.fecha).toLocaleString('es-ES')}</p>
                  </div>
                ))}
              </div>
            </div>

            {modalConfirmacion.tipo === 'eliminar' ? (
              <p className="text-slate-300 text-sm mb-6">
                Por favor, reprograma o cancela estas sesiones antes de modificar tu horario base.
              </p>
            ) : (
              <p className="text-slate-300 text-sm mb-6">
                ¿Deseas cancelar estas sesiones automáticamente y notificar a los estudiantes?
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalConfirmacion(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
              >
                {modalConfirmacion.tipo === 'eliminar' ? 'Entendido' : 'Cancelar'}
              </button>
              {modalConfirmacion.tipo === 'excepcion' && (
                <button
                  onClick={() => agregarExcepcion(true)}
                  disabled={procesando}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {procesando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Sí, cancelar sesiones'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
