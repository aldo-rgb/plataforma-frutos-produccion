'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Zap, Users, User, Globe, Loader2, CheckCircle, ArrowLeft, Clock, MapPin, Image, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  vision: string;
}

interface MisionQuantum {
  title: string;
  description: string;
  points_reward: number;
  evidence_requirement: string;
  vibe: string;
}

export default function NuevaTareaAdminPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para QUANTUM Generator
  const [showQuantumModal, setShowQuantumModal] = useState(false);
  const [showVibeSelector, setShowVibeSelector] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<'energia' | 'conexion' | 'viralidad' | null>(null);
  const [quantumMisiones, setQuantumMisiones] = useState<MisionQuantum[]>([]);
  const [loadingQuantum, setLoadingQuantum] = useState(false);

  const [formData, setFormData] = useState({
    type: 'EXTRAORDINARY' as 'EXTRAORDINARY' | 'EVENT',
    titulo: '',
    descripcion: '',
    pointsReward: 100,
    targetType: 'ALL' as 'USER' | 'GROUP' | 'ALL',
    targetId: null as number | null,
    requiereEvidencia: true,
    fechaLimite: '',
    fechaEvento: '',
    horaEvento: '',
    lugar: '',
    // QPC Engine fields
    rewardLogic: 'STANDARD' as 'STANDARD' | 'RACE' | 'GROUP_ALL' | 'GROUP_THRESHOLD' | 'STRICT_DEADLINE',
    raceLimit: 3,
    strictDeadline: false
  });

  useEffect(() => {
    if (formData.targetType === 'USER') {
      loadUsuarios();
    }
  }, [formData.targetType]);

  const loadUsuarios = async () => {
    try {
      setLoadingUsuarios(true);
      const response = await fetch('/api/usuarios');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Usuarios cargados:', data);
      
      // El API devuelve { usuarios: [...] }
      const usuariosArray = data.usuarios || data;
      const usuariosFiltrados = Array.isArray(usuariosArray) 
        ? usuariosArray.filter((u: Usuario) => u.id !== 0) 
        : [];
      
      setUsuarios(usuariosFiltrados);
      console.log('Usuarios establecidos:', usuariosFiltrados.length);
      
    } catch (error) {
      console.error('Error loading usuarios:', error);
      toast.error('Error al cargar usuarios: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      setUsuarios([]);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Función para generar misiones con QUANTUM
  const handleGenerarConQuantum = () => {
    setShowVibeSelector(true);
  };

  const handleSelectVibe = async (vibe: 'energia' | 'conexion' | 'viralidad') => {
    setSelectedVibe(vibe);
    setShowVibeSelector(false);
    setLoadingQuantum(true);

    try {
      const response = await fetch('/api/quantum/generar-misiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe })
      });

      if (response.ok) {
        const data = await response.json();
        setQuantumMisiones(data.misiones);
        setShowQuantumModal(true);
        toast.success('🧠 QUANTUM generó 3 misiones épicas');
      } else {
        toast.error('Error al generar misiones');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error conectando con QUANTUM');
    } finally {
      setLoadingQuantum(false);
    }
  };

  const handleSelectMision = (mision: MisionQuantum) => {
    setFormData({
      ...formData,
      titulo: mision.title,
      descripcion: mision.description,
      pointsReward: mision.points_reward,
      requiereEvidencia: true,
      targetType: 'ALL' // Misiones de equipo son para todos por defecto
    });
    setShowQuantumModal(false);
    toast.success('✨ Misión aplicada al formulario');
  };

  const handleRegenerarMisiones = async () => {
    if (!selectedVibe) return;
    setLoadingQuantum(true);
    
    try {
      const response = await fetch('/api/quantum/generar-misiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: selectedVibe })
      });

      if (response.ok) {
        const data = await response.json();
        setQuantumMisiones(data.misiones);
        toast.success('🔄 Nuevas misiones generadas');
      }
    } catch (error) {
      toast.error('Error al regenerar misiones');
    } finally {
      setLoadingQuantum(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.titulo.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (formData.targetType === 'USER' && !formData.targetId) {
      toast.error('Debes seleccionar un usuario');
      return;
    }

    if (formData.type === 'EVENT' && !formData.fechaEvento) {
      toast.error('La fecha del evento es requerida');
      return;
    }

    // Validar que la fecha del evento no sea en el pasado
    if (formData.type === 'EVENT' && formData.fechaEvento) {
      const fechaEvento = new Date(formData.fechaEvento);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaEvento < hoy) {
        toast.error('⚠️ La fecha del evento no puede ser anterior a hoy');
        return;
      }
      
      // Si tiene hora, validar fecha+hora completa
      if (formData.horaEvento) {
        const fechaHoraEvento = new Date(`${formData.fechaEvento}T${formData.horaEvento}`);
        const ahora = new Date();
        
        if (fechaHoraEvento <= ahora) {
          const horaActual = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
          toast.error(`⚠️ La hora del evento debe ser futura. Hora actual: ${horaActual}`);
          return;
        }
      }
    }

    // NUEVA VALIDACIÓN: Misiones Flash requieren fecha Y hora límite
    if (formData.type === 'EXTRAORDINARY') {
      if (!formData.fechaLimite) {
        toast.error('⚠️ Las Misiones Flash requieren fecha límite obligatoria');
        return;
      }
      if (!formData.horaEvento) {
        toast.error('⚠️ Las Misiones Flash requieren hora límite obligatoria');
        return;
      }

      // Validar que fecha y hora no sean en el pasado
      const fechaHoraLimite = new Date(`${formData.fechaLimite}T${formData.horaEvento}`);
      const ahora = new Date();
      
      if (fechaHoraLimite <= ahora) {
        const horaActual = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        toast.error(`⚠️ La hora límite debe ser futura. Hora actual: ${horaActual}`);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`✅ ${formData.type === 'EVENT' ? 'Evento' : 'Tarea'} creada exitosamente`);
        router.push('/dashboard/admin/tareas');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al crear la tarea');
      }
    } catch (error) {
      console.error('Error creating tarea:', error);
      toast.error('Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => 
    `${u.nombre} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">
            🚀 Crear Misión o Evento
          </h1>
          <p className="text-slate-400">
            Crea tareas extraordinarias o eventos para motivar a tu equipo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Principal */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            {/* Selector de Tipo */}
            <div>
              <label className="block text-white font-semibold mb-3">Tipo de Tarea</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXTRAORDINARY' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.type === 'EXTRAORDINARY'
                      ? 'bg-amber-900/30 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800/50 border-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  <Zap className={`w-8 h-8 mx-auto mb-2 ${
                    formData.type === 'EXTRAORDINARY' ? 'text-amber-400' : 'text-slate-400'
                  }`} />
                  <h3 className="text-white font-bold">Tarea Extraordinaria</h3>
                  <p className="text-xs text-slate-400 mt-1">Misión especial con recompensa</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EVENT' })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.type === 'EVENT'
                      ? 'bg-purple-900/30 border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50'
                  }`}
                >
                  <Calendar className={`w-8 h-8 mx-auto mb-2 ${
                    formData.type === 'EVENT' ? 'text-purple-400' : 'text-slate-400'
                  }`} />
                  <h3 className="text-white font-bold">Evento</h3>
                  <p className="text-xs text-slate-400 mt-1">Actividad grupal programada</p>
                </button>
              </div>
            </div>

            {/* Título con Botón QUANTUM */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-white font-semibold">
                  Título <span className="text-red-400">*</span>
                </label>
                {formData.type === 'EXTRAORDINARY' && (
                  <button
                    type="button"
                    onClick={handleGenerarConQuantum}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generar con QUANTUM
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder={formData.type === 'EVENT' ? 'Ej: Taller de Liderazgo' : 'Ej: Completar módulo avanzado'}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                maxLength={100}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-white font-semibold mb-2">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe los detalles de la tarea o evento..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                maxLength={500}
              />
            </div>

            {/* Puntos Cuánticos */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Recompensa en Puntos Cuánticos
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.pointsReward}
                  onChange={(e) => setFormData({ ...formData, pointsReward: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="50"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">
                  PC
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mayor recompensa = Mayor motivación
              </p>
            </div>

            {/* 🎯 QPC ENGINE - Sistema de Recompensas Condicionales */}
            {formData.type === 'EXTRAORDINARY' && (
              <div className="space-y-4 p-5 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-2 border-purple-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-white font-bold text-lg">Sistema de Recompensas</h3>
                    <p className="text-sm text-slate-400">Define cómo se otorgan los Puntos Cuánticos</p>
                  </div>
                </div>

                {/* Selector de Tipo de Recompensa */}
                <div>
                  <label className="block text-white font-semibold mb-3">Tipo de Recompensa</label>
                  <select
                    value={formData.rewardLogic}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      rewardLogic: e.target.value as any,
                      // Reset condicional fields
                      raceLimit: e.target.value === 'RACE' ? 3 : formData.raceLimit,
                      strictDeadline: e.target.value === 'STRICT_DEADLINE' ? true : false
                    })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="STANDARD">⚡️ Estándar - Todos ganan puntos</option>
                    <option value="RACE">🏁 Carrera - Solo los primeros X ganan puntos completos</option>
                    <option value="GROUP_ALL">👥 Grupo Completo - Todos deben completar</option>
                    <option value="GROUP_THRESHOLD">📊 Umbral Grupal - Un % del grupo debe completar</option>
                    <option value="STRICT_DEADLINE">⏰ Puntualidad Estricta - 0 puntos si entrega tarde</option>
                  </select>
                  
                  {/* Descripción de cada modo */}
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    {formData.rewardLogic === 'STANDARD' && (
                      <p className="text-sm text-slate-300">
                        ✅ Todos los que completen la misión recibirán <span className="text-amber-400 font-bold">{formData.pointsReward} PC</span>
                      </p>
                    )}
                    {formData.rewardLogic === 'RACE' && (
                      <p className="text-sm text-slate-300">
                        🔥 Solo los primeros en completar ganan puntos completos. Los demás reciben 10% como premio de consolación.
                      </p>
                    )}
                    {formData.rewardLogic === 'GROUP_ALL' && (
                      <p className="text-sm text-slate-300">
                        🤝 Nadie recibe puntos hasta que TODO el grupo complete la misión. Fomenta trabajo en equipo.
                      </p>
                    )}
                    {formData.rewardLogic === 'GROUP_THRESHOLD' && (
                      <p className="text-sm text-slate-300">
                        📈 Se requiere que el 70% del grupo complete para desbloquear puntos para todos.
                      </p>
                    )}
                    {formData.rewardLogic === 'STRICT_DEADLINE' && (
                      <p className="text-sm text-slate-300">
                        ⚠️ Modo Wizard: Si entregas tarde, NO recibes puntos. La disciplina es clave.
                      </p>
                    )}
                  </div>
                </div>

                {/* Cupo de Ganadores (solo para RACE) */}
                {formData.rewardLogic === 'RACE' && (
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Cupo de Ganadores
                    </label>
                    <input
                      type="number"
                      value={formData.raceLimit}
                      onChange={(e) => setFormData({ ...formData, raceLimit: parseInt(e.target.value) || 3 })}
                      min="1"
                      max="20"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Solo los primeros {formData.raceLimit} en entregar evidencia recibirán {formData.pointsReward} PC
                    </p>
                  </div>
                )}

                {/* Advertencia para STRICT_DEADLINE */}
                {formData.rewardLogic === 'STRICT_DEADLINE' && (
                  <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <Clock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-300 font-semibold text-sm">Modo de Alta Disciplina</p>
                      <p className="text-xs text-red-200/80 mt-1">
                        Las entregas tardías NO recibirán puntos, incluso si se aprueban. Este modo es ideal para cultivar puntualidad extrema.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selector de Target */}
            <div>
              <label className="block text-white font-semibold mb-3">¿Para quién es esta tarea?</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, targetType: 'ALL', targetId: null })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    formData.targetType === 'ALL'
                      ? 'bg-indigo-900/30 border-indigo-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'
                  }`}
                >
                  <Globe className={`w-6 h-6 mx-auto mb-1 ${
                    formData.targetType === 'ALL' ? 'text-indigo-400' : 'text-slate-400'
                  }`} />
                  <p className="text-white text-sm font-medium">Todos</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, targetType: 'GROUP', targetId: null })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    formData.targetType === 'GROUP'
                      ? 'bg-indigo-900/30 border-indigo-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'
                  }`}
                >
                  <Users className={`w-6 h-6 mx-auto mb-1 ${
                    formData.targetType === 'GROUP' ? 'text-indigo-400' : 'text-slate-400'
                  }`} />
                  <p className="text-white text-sm font-medium">Grupo</p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, targetType: 'USER', targetId: null })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    formData.targetType === 'USER'
                      ? 'bg-indigo-900/30 border-indigo-500'
                      : 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50'
                  }`}
                >
                  <User className={`w-6 h-6 mx-auto mb-1 ${
                    formData.targetType === 'USER' ? 'text-indigo-400' : 'text-slate-400'
                  }`} />
                  <p className="text-white text-sm font-medium">Usuario</p>
                </button>
              </div>
            </div>

            {/* Selector de Usuario (si targetType es USER) */}
            {formData.targetType === 'USER' && (
              <div>
                <label className="block text-white font-semibold mb-2">
                  Seleccionar Usuario <span className="text-red-400">*</span>
                </label>
                
                {loadingUsuarios ? (
                  <div className="flex items-center justify-center py-8 bg-slate-800 rounded-xl">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="ml-2 text-slate-400">Cargando usuarios...</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o email..."
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 mb-3"
                    />
                    
                    <div className="max-h-64 overflow-y-auto bg-slate-800 rounded-xl border border-slate-700">
                      {usuariosFiltrados.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          No se encontraron usuarios
                        </div>
                      ) : (
                        usuariosFiltrados.map((usuario) => (
                          <button
                            key={usuario.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, targetId: usuario.id })}
                            className={`w-full text-left px-4 py-3 border-b border-slate-700 last:border-b-0 transition-colors ${
                              formData.targetId === usuario.id
                                ? 'bg-indigo-900/30'
                                : 'hover:bg-slate-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">
                                  {usuario.nombre}
                                </p>
                                <p className="text-xs text-slate-400">{usuario.email}</p>
                              </div>
                              {formData.targetId === usuario.id && (
                                <CheckCircle className="w-5 h-5 text-indigo-400" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Selector de Grupo (si targetType es GROUP) */}
            {formData.targetType === 'GROUP' && (
              <div>
                <label className="block text-white font-semibold mb-2">
                  Seleccionar Visión/Grupo
                </label>
                <select
                  value={formData.targetId || ''}
                  onChange={(e) => setFormData({ ...formData, targetId: parseInt(e.target.value) || null })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Seleccionar visión...</option>
                  <option value="1">Visión Empresarial</option>
                  <option value="2">Visión Liderazgo</option>
                  <option value="3">Visión Salud</option>
                  <option value="4">Visión Finanzas</option>
                </select>
              </div>
            )}

            {/* Fechas y Ubicación (específico para EVENTOS) */}
            {formData.type === 'EVENT' && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Detalles del Evento
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Fecha del Evento <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.fechaEvento}
                      onChange={(e) => setFormData({ ...formData, fechaEvento: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Hora <Clock className="w-4 h-4 inline ml-1 text-slate-400" />
                    </label>
                    <input
                      type="time"
                      value={formData.horaEvento}
                      onChange={(e) => setFormData({ ...formData, horaEvento: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">
                    Lugar <MapPin className="w-4 h-4 inline ml-1 text-slate-400" />
                  </label>
                  <input
                    type="text"
                    value={formData.lugar}
                    onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                    placeholder="Ej: Auditorio Principal, Sala de Juntas, Link de Zoom"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Fecha Límite (para tareas extraordinarias) - AHORA OBLIGATORIO */}
            {formData.type === 'EXTRAORDINARY' && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  ⏳ Misión Flash - Configuración de Caducidad
                </h3>

                {/* Warning Box */}
                <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">⚠️</div>
                    <div className="flex-1">
                      <h4 className="text-red-400 font-bold mb-2">ADVERTENCIA CRÍTICA</h4>
                      <p className="text-red-300 text-sm leading-relaxed">
                        Esta es una <span className="font-bold">Misión Flash</span>. Los usuarios que no completen antes de la fecha/hora límite 
                        <span className="font-bold text-amber-400"> NO ganarán los {formData.pointsReward} PC disponibles</span>. 
                        La misión será marcada como <span className="font-mono bg-red-950 px-1">EXPIRED</span> y no podrán subir evidencia.
                      </p>
                      <p className="text-amber-400 text-xs mt-2 font-bold">
                        💀 No hay segunda oportunidad. La toma o la pierde para siempre.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Fecha Límite <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.fechaLimite}
                      onChange={(e) => setFormData({ ...formData, fechaLimite: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Hora Límite <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.horaEvento}
                      onChange={(e) => setFormData({ ...formData, horaEvento: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <p className="text-xs text-amber-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Después de esta fecha/hora, la misión se bloqueará automáticamente
                </p>
              </div>
            )}

            {/* Toggle de Evidencia */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex items-center gap-3">
                <Image className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-white font-semibold">Requiere Evidencia Fotográfica</p>
                  <p className="text-xs text-slate-400">El usuario deberá subir una foto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, requiereEvidencia: !formData.requiereEvidencia })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.requiereEvidencia ? 'bg-indigo-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.requiereEvidencia ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Crear {formData.type === 'EVENT' ? 'Evento' : 'Tarea'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal de Selección de Vibe */}
        {showVibeSelector && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-3xl w-full shadow-2xl shadow-purple-500/20 p-8">
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-400" />
                Selecciona el Vibe de la Misión
              </h2>
              <p className="text-slate-400 mb-6">
                QUANTUM generará 3 misiones épicas según la energía que quieras inyectar al equipo
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Energía Alta */}
                <button
                  type="button"
                  onClick={() => handleSelectVibe('energia')}
                  disabled={loadingQuantum}
                  className="group p-6 bg-gradient-to-br from-red-900/30 to-orange-900/30 border-2 border-red-500/50 hover:border-red-400 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-5xl mb-3">🔥</div>
                  <h3 className="text-white font-bold text-lg mb-2">Energía Alta</h3>
                  <p className="text-slate-300 text-sm mb-3">
                    Competencia / Intensidad
                  </p>
                  <p className="text-slate-400 text-xs">
                    Retos físicos, velocidad, quién lo hace primero
                  </p>
                </button>

                {/* Conexión Profunda */}
                <button
                  type="button"
                  onClick={() => handleSelectVibe('conexion')}
                  disabled={loadingQuantum}
                  className="group p-6 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 hover:border-blue-400 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-5xl mb-3">🤝</div>
                  <h3 className="text-white font-bold text-lg mb-2">Conexión Profunda</h3>
                  <p className="text-slate-300 text-sm mb-3">
                    Vulnerabilidad / Unión
                  </p>
                  <p className="text-slate-400 text-xs">
                    Historias, gratitud, conocerse mejor
                  </p>
                </button>

                {/* Viralidad */}
                <button
                  type="button"
                  onClick={() => handleSelectVibe('viralidad')}
                  disabled={loadingQuantum}
                  className="group p-6 bg-gradient-to-br from-green-900/30 to-yellow-900/30 border-2 border-green-500/50 hover:border-green-400 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-5xl mb-3">🚀</div>
                  <h3 className="text-white font-bold text-lg mb-2">Viralidad</h3>
                  <p className="text-slate-300 text-sm mb-3">
                    Diversión / Creatividad
                  </p>
                  <p className="text-slate-400 text-xs">
                    Fotos locas, memes, romper el hielo
                  </p>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVibeSelector(false)}
                  disabled={loadingQuantum}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>

              {loadingQuantum && (
                <div className="mt-4 flex items-center justify-center gap-3 text-purple-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>QUANTUM está generando misiones épicas...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Misiones Generadas */}
        {showQuantumModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-indigo-500/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-500/20 p-8">
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-indigo-400" />
                🧠 Misiones Sugeridas por QUANTUM
              </h2>
              <p className="text-slate-400 mb-6">
                Selecciona una misión para auto-completar el formulario
              </p>

              <div className="grid gap-4 mb-6">
                {quantumMisiones.map((mision, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectMision(mision)}
                    className="group text-left p-6 rounded-xl bg-slate-800/50 border-2 border-slate-600 hover:border-indigo-500 hover:bg-slate-750 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-indigo-400 text-lg group-hover:text-indigo-300">
                        Opción {String.fromCharCode(65 + index)}: {mision.title}
                      </h4>
                      <span className="bg-yellow-600/20 text-yellow-400 text-sm px-3 py-1 rounded-lg border border-yellow-600/30 font-bold">
                        💎 {mision.points_reward} PC
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                      {mision.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 uppercase tracking-wide">
                      <span className="flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        {mision.evidence_requirement}
                      </span>
                      <span>•</span>
                      <span className="text-indigo-400">
                        Vibe: {mision.vibe === 'energia' ? '🔥 Energía' : mision.vibe === 'conexion' ? '🤝 Conexión' : '🚀 Viralidad'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowQuantumModal(false)}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegenerarMisiones}
                  disabled={loadingQuantum}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingQuantum ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      🔄 Regenerar Ideas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
