'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Eye, UserCheck, XCircle, CheckCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Coordinador {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  isActive: boolean;
  createdAt: string;
  totalVisiones: number;
  totalParticipantes: number;
  Vision: Array<{
    id: number;
    nombre: string;
  }>;
}

interface Vision {
  id: number;
  nombre: string;
  coordinadorId: number | null;
  Coordinador: {
    nombre: string;
  } | null;
}

const getRolLabel = (rol: string) => {
  const labels: Record<string, { text: string; emoji: string; color: string }> = {
    'COORDINADOR': { text: 'Liderato', emoji: '🎯', color: 'from-purple-500 to-pink-500' },
    'COORDINATOR_BASIC': { text: 'Básico', emoji: '📋', color: 'from-blue-500 to-cyan-500' },
    'COORDINATOR_ADVANCED': { text: 'Avanzado', emoji: '🎪', color: 'from-green-500 to-emerald-500' },
    'TRAINER': { text: 'Trainer', emoji: '🚀', color: 'from-orange-500 to-yellow-500' }
  };
  return labels[rol] || { text: rol, emoji: '👤', color: 'from-slate-500 to-slate-600' };
};

export default function CoordinadoresPage() {
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [visionSeleccionada, setVisionSeleccionada] = useState<Vision | null>(null);
  const [formCoordinador, setFormCoordinador] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'COORDINADOR' as 'COORDINADOR' | 'COORDINATOR_BASIC' | 'COORDINATOR_ADVANCED' | 'TRAINER'
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type, message: '' });
    }, 3000);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [resCoord, resVision] = await Promise.all([
        fetch('/api/director/coordinadores'),
        fetch('/api/school-admin/visiones')
      ]);

      const dataCoord = await resCoord.json();
      const dataVision = await resVision.json();

      if (dataCoord.success) {
        setCoordinadores(dataCoord.coordinadores);
      }

      if (dataVision.success) {
        setVisiones(dataVision.visiones);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearCoordinador = async () => {
    if (!formCoordinador.nombre || !formCoordinador.email || !formCoordinador.password) {
      showNotification('error', 'Todos los campos son requeridos');
      return;
    }

    try {
      const res = await fetch('/api/director/coordinadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCoordinador)
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', 'Coordinador creado exitosamente');
        setModalCrear(false);
        setFormCoordinador({ nombre: '', email: '', password: '', rol: 'COORDINADOR' });
        cargarDatos();
      } else {
        showNotification('error', data.error || 'Error al crear coordinador');
      }
    } catch (error) {
      console.error('Error creando coordinador:', error);
      showNotification('error', 'Error al crear coordinador');
    }
  };

  const asignarCoordinador = async (coordinadorId: number) => {
    if (!visionSeleccionada) return;

    try {
      const res = await fetch(`/api/director/visiones/${visionSeleccionada.id}/coordinador`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinadorId })
      });

      const data = await res.json();

      if (data.success) {
        showNotification('success', 'Coordinador asignado exitosamente');
        setModalAsignar(false);
        setVisionSeleccionada(null);
        cargarDatos();
      } else {
        showNotification('error', data.error || 'Error al asignar coordinador');
      }
    } catch (error) {
      console.error('Error asignando coordinador:', error);
      showNotification('error', 'Error al asignar coordinador');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0 mb-6 lg:mb-10">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-3 lg:p-4 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-500 rounded-2xl lg:rounded-3xl shadow-2xl shadow-blue-500/50">
              <Users size={28} className="text-white lg:hidden" />
              <Users size={36} className="text-white hidden lg:block" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-4xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-1 lg:mb-2">
                Gestión de Coordinadores
              </h1>
              <p className="text-slate-400 text-sm lg:text-lg">Crea y asigna coordinadores a tus visiones</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <button
              onClick={() => setModalCrear(true)}
              className="w-full lg:w-auto flex items-center justify-center gap-2 lg:gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white rounded-xl lg:rounded-2xl font-bold hover:shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-[1.05] active:scale-[0.98] text-base lg:text-lg"
            >
              <Plus size={20} className="lg:hidden" />
              <Plus size={24} className="hidden lg:block" />
              <span>Nuevo Coordinador</span>
            </button>

            <Link href="/dashboard/school-admin/lideres">
              <button
                className="w-full lg:w-auto flex items-center justify-center gap-2 lg:gap-3 px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-xl lg:rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-[1.05] active:scale-[0.98] text-base lg:text-lg"
              >
                <Plus size={20} className="lg:hidden" />
                <Plus size={24} className="hidden lg:block" />
                <span>Nuevo Mentor</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-gradient-to-br from-blue-900/60 via-blue-900/40 to-slate-900 border-2 border-blue-500/40 rounded-2xl lg:rounded-3xl p-4 lg:p-6 hover:border-blue-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-blue-900/20">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2.5 lg:p-3.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl lg:rounded-2xl shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-all">
                <Users className="text-white" size={24} />
              </div>
              <span className="text-3xl lg:text-4xl font-black bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">{coordinadores.length}</span>
            </div>
            <h3 className="text-lg lg:text-xl font-black text-white mb-1">Coordinadores</h3>
            <p className="text-xs lg:text-sm text-slate-400 font-medium">Total en tu organización</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/60 via-green-900/40 to-slate-900 border-2 border-green-500/40 rounded-2xl lg:rounded-3xl p-4 lg:p-6 hover:border-green-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-green-900/20">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2.5 lg:p-3.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl lg:rounded-2xl shadow-lg shadow-green-500/50 group-hover:shadow-green-500/70 transition-all">
                <CheckCircle className="text-white" size={24} />
              </div>
              <span className="text-3xl lg:text-4xl font-black bg-gradient-to-br from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {visiones.filter(v => v.coordinadorId !== null).length}
              </span>
            </div>
            <h3 className="text-lg lg:text-xl font-black text-white mb-1">Visiones Asignadas</h3>
            <p className="text-xs lg:text-sm text-slate-400 font-medium">Con coordinador activo</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/60 via-orange-900/40 to-slate-900 border-2 border-orange-500/40 rounded-2xl lg:rounded-3xl p-4 lg:p-6 hover:border-orange-400/60 transition-all group hover:scale-[1.02] shadow-xl shadow-orange-900/20">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2.5 lg:p-3.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl lg:rounded-2xl shadow-lg shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <span className="text-3xl lg:text-4xl font-black bg-gradient-to-br from-orange-400 to-amber-400 bg-clip-text text-transparent">
                {visiones.filter(v => v.coordinadorId === null).length}
              </span>
            </div>
            <h3 className="text-lg lg:text-xl font-black text-white mb-1">Sin Asignar</h3>
            <p className="text-xs lg:text-sm text-slate-400 font-medium">Requieren coordinador</p>
          </div>
        </div>

        {/* Lista de Coordinadores */}
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border-2 border-slate-700/50 rounded-2xl lg:rounded-3xl p-4 lg:p-8 mb-6 lg:mb-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2.5 lg:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl lg:rounded-2xl shadow-lg shadow-blue-500/50">
                <Users className="text-white" size={24} />
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-white">Coordinadores</h2>
            </div>
          </div>
          
          <div className="space-y-3 lg:space-y-4">
            {coordinadores.map((coord) => (
              <div
                key={coord.id}
                className="bg-gradient-to-r from-slate-800/80 via-slate-900/60 to-slate-800/80 border-2 border-slate-700/70 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:border-blue-500/50 transition-all group hover:scale-[1.01] shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                      <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl lg:rounded-2xl shadow-lg shadow-blue-500/30">
                        <UserCheck size={20} className="text-white lg:hidden" />
                        <UserCheck size={24} className="text-white hidden lg:block" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base lg:text-xl font-bold text-white group-hover:text-blue-300 transition-colors truncate">{coord.nombre}</h3>
                          <span className={`px-2.5 py-1 bg-gradient-to-r ${getRolLabel(coord.rol).color} text-white text-[10px] lg:text-xs font-black rounded-lg shadow-lg whitespace-nowrap`}>
                            {getRolLabel(coord.rol).emoji} {getRolLabel(coord.rol).text}
                          </span>
                        </div>
                        <p className="text-xs lg:text-sm text-slate-400 truncate">{coord.email}</p>
                      </div>
                      {coord.isActive ? (
                        <span className="px-2.5 lg:px-4 py-1.5 lg:py-2 bg-emerald-500/30 text-emerald-300 text-[10px] lg:text-xs font-black rounded-lg lg:rounded-xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                          ✓ <span className="hidden sm:inline">ACTIVO</span>
                        </span>
                      ) : (
                        <span className="px-2.5 lg:px-4 py-1.5 lg:py-2 bg-red-500/30 text-red-300 text-[10px] lg:text-xs font-black rounded-lg lg:rounded-xl border-2 border-red-500/50 shadow-lg shadow-red-500/20 whitespace-nowrap">
                          ✕ <span className="hidden sm:inline">INACTIVO</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 lg:gap-6 mb-3 lg:mb-4">
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg lg:rounded-xl p-2.5 lg:p-4">
                        <p className="text-[10px] lg:text-xs text-slate-500 mb-1 lg:mb-1.5 font-semibold">Visiones Asignadas</p>
                        <p className="text-xl lg:text-2xl font-black text-white">{coord.totalVisiones}</p>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg lg:rounded-xl p-2.5 lg:p-4">
                        <p className="text-[10px] lg:text-xs text-slate-500 mb-1 lg:mb-1.5 font-semibold">Participantes</p>
                        <p className="text-xl lg:text-2xl font-black text-white">{coord.totalParticipantes}</p>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg lg:rounded-xl p-2.5 lg:p-4">
                        <p className="text-[10px] lg:text-xs text-slate-500 mb-1 lg:mb-1.5 font-semibold">Creado</p>
                        <p className="text-xs lg:text-sm font-bold text-slate-300">
                          {new Date(coord.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>

                    {coord.Vision.length > 0 && (
                      <div className="flex flex-wrap gap-2 lg:gap-3">
                        {coord.Vision.map(vision => (
                          <span
                            key={vision.id}
                            className="px-3 lg:px-4 py-1.5 lg:py-2 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 text-xs lg:text-sm font-bold rounded-lg lg:rounded-xl border-2 border-purple-500/40 shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform"
                          >
                            🎯 {vision.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {coordinadores.length === 0 && (
              <div className="text-center py-12 lg:py-16 bg-slate-900/40 rounded-xl lg:rounded-2xl border-2 border-dashed border-slate-700">
                <div className="p-4 lg:p-6 bg-slate-800/50 rounded-2xl lg:rounded-3xl w-fit mx-auto mb-4 lg:mb-6">
                  <Users size={48} className="text-slate-600 lg:hidden" />
                  <Users size={64} className="text-slate-600 hidden lg:block" />
                </div>
                <p className="text-slate-300 text-lg lg:text-xl font-bold mb-2">No hay coordinadores creados</p>
                <p className="text-slate-500 text-sm">Crea tu primer coordinador para comenzar</p>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Visiones */}
        <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border-2 border-slate-700/50 rounded-2xl lg:rounded-3xl p-4 lg:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2.5 lg:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl lg:rounded-2xl shadow-lg shadow-purple-500/50">
                <Eye className="text-white" size={24} />
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-white">Asignar Coordinadores</h2>
            </div>
          </div>
          
          <div className="space-y-3 lg:space-y-4">
            {visiones.map((vision) => (
              <div
                key={vision.id}
                className="bg-gradient-to-r from-slate-800/80 via-slate-900/60 to-slate-800/80 border-2 border-slate-700/70 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:border-purple-500/50 transition-all group hover:scale-[1.01] shadow-lg"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex-1 w-full lg:w-auto">
                    <h3 className="text-lg lg:text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">{vision.nombre}</h3>
                    {vision.Coordinador ? (
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 lg:py-3 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500/40 rounded-lg lg:rounded-xl shadow-lg shadow-emerald-500/20">
                          <div className="p-1.5 lg:p-2 bg-emerald-500/40 rounded-lg">
                            <UserCheck size={16} className="text-emerald-200 lg:hidden" />
                            <UserCheck size={20} className="text-emerald-200 hidden lg:block" />
                          </div>
                          <div>
                            <p className="text-[10px] lg:text-xs text-emerald-400 font-semibold mb-0.5">Coordinador Asignado</p>
                            <p className="text-emerald-100 font-bold text-sm lg:text-base">
                              {vision.Coordinador.nombre}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 lg:py-3 bg-gradient-to-r from-orange-500/30 to-red-500/30 border-2 border-orange-500/40 rounded-lg lg:rounded-xl shadow-lg shadow-orange-500/20">
                        <div className="p-1.5 lg:p-2 bg-orange-500/40 rounded-lg">
                          <AlertTriangle size={16} className="text-orange-200 lg:hidden" />
                          <AlertTriangle size={20} className="text-orange-200 hidden lg:block" />
                        </div>
                        <div>
                          <p className="text-[10px] lg:text-xs text-orange-400 font-semibold mb-0.5">Estado</p>
                          <p className="text-orange-100 font-bold text-sm lg:text-base">
                            Sin coordinador asignado
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setVisionSeleccionada(vision);
                      setModalAsignar(true);
                    }}
                    className="w-full lg:w-auto flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-6 py-2.5 lg:py-3.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white rounded-lg lg:rounded-xl font-bold hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-[1.05] active:scale-[0.98] text-sm lg:text-base"
                  >
                    <Edit size={18} className="lg:hidden" />
                    <Edit size={20} className="hidden lg:block" />
                    <span>{vision.Coordinador ? 'Cambiar' : 'Asignar'} Coordinador</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Crear Coordinador */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-blue-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-blue-500/20 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/50">
                <Users size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Crear Coordinador</h2>
                <p className="text-slate-400 text-sm">Nuevo miembro de tu equipo</p>
              </div>
            </div>

            <div className="space-y-5 mb-6">
              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  Tipo de Coordinador
                </label>
                <select
                  value={formCoordinador.rol}
                  onChange={(e) => setFormCoordinador({ ...formCoordinador, rol: e.target.value as any })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                >
                  <option value="COORDINADOR">Coordinador Liderato (Tu Vida)</option>
                  <option value="COORDINATOR_BASIC">Coordinador Básico (Discovery)</option>
                  <option value="COORDINATOR_ADVANCED">Coordinador Avanzado (Breakthrough)</option>
                  <option value="TRAINER">Trainer (Quantum Leap)</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {formCoordinador.rol === 'COORDINADOR' && '🎯 Tu Vida - Acceso completo a todas las funciones'}
                  {formCoordinador.rol === 'COORDINATOR_BASIC' && '📋 Logística, Pagos y Asistencia'}
                  {formCoordinador.rol === 'COORDINATOR_ADVANCED' && '🎪 Dinámicas y Staff'}
                  {formCoordinador.rol === 'TRAINER' && '🚀 Mentores, Cartas y Gamificación'}
                </p>
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formCoordinador.nombre}
                  onChange={(e) => setFormCoordinador({ ...formCoordinador, nombre: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Ej: Juan Pérez García"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formCoordinador.email}
                  onChange={(e) => setFormCoordinador({ ...formCoordinador, email: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="coordinador@ejemplo.com"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formCoordinador.password}
                  onChange={(e) => setFormCoordinador({ ...formCoordinador, password: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                  placeholder="Mínimo 8 caracteres"
                />
                <p className="text-xs text-slate-500 mt-2">El coordinador podrá cambiarla después</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={crearCoordinador}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                ✨ Crear Coordinador
              </button>
              <button
                onClick={() => {
                  setModalCrear(false);
                  setFormCoordinador({ nombre: '', email: '', password: '', rol: 'COORDINADOR' });
                }}
                className="px-6 py-4 bg-slate-700/50 border-2 border-slate-600 text-slate-300 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Coordinador */}
      {modalAsignar && visionSeleccionada && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-2 border-purple-500/30 rounded-3xl p-8 max-w-2xl w-full shadow-2xl shadow-purple-500/20 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/50">
                <UserCheck size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Asignar Coordinador</h2>
                <p className="text-slate-400">{visionSeleccionada.nombre}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {coordinadores.map((coord) => (
                <button
                  key={coord.id}
                  onClick={() => asignarCoordinador(coord.id)}
                  className="w-full p-5 bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-2 border-slate-700 rounded-2xl hover:border-purple-500/70 hover:shadow-xl hover:shadow-purple-500/30 transition-all text-left group hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl border border-purple-500/40">
                        <UserCheck size={20} className="text-purple-300" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">{coord.nombre}</h3>
                        <p className="text-sm text-slate-400">{coord.email}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-slate-500">
                            🎯 {coord.totalVisiones} visiones
                          </span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-slate-500">
                            👥 {coord.totalParticipantes} participantes
                          </span>
                        </div>
                      </div>
                    </div>
                    {visionSeleccionada.coordinadorId === coord.id && (
                      <div className="p-2.5 bg-emerald-500/30 rounded-xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/30">
                        <CheckCircle size={24} className="text-emerald-300" />
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {coordinadores.length === 0 && (
                <div className="text-center py-12 bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700">
                  <div className="p-4 bg-slate-800/50 rounded-2xl w-fit mx-auto mb-4">
                    <Users size={48} className="text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-semibold">No hay coordinadores disponibles</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setModalAsignar(false);
                setVisionSeleccionada(null);
              }}
              className="w-full px-6 py-4 bg-slate-700/50 border-2 border-slate-600 text-slate-300 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Notificación Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 lg:top-8 lg:right-8 z-[60] animate-in slide-in-from-top duration-300 max-w-[calc(100vw-2rem)] lg:max-w-none">
          <div className={`
            ${notification.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 border-emerald-400' 
              : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-500 border-red-400'
            }
            border-2 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-2xl min-w-[280px] lg:min-w-[400px] backdrop-blur-sm
          `}>
            <div className="flex items-center gap-3 lg:gap-4">
              <div className={`
                p-2 lg:p-3 rounded-lg lg:rounded-xl
                ${notification.type === 'success' 
                  ? 'bg-white/20' 
                  : 'bg-white/20'
                }
              `}>
                {notification.type === 'success' ? (
                  <>
                    <CheckCircle size={24} className="text-white lg:hidden" />
                    <CheckCircle size={28} className="text-white hidden lg:block" />
                  </>
                ) : (
                  <>
                    <XCircle size={24} className="text-white lg:hidden" />
                    <XCircle size={28} className="text-white hidden lg:block" />
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black text-base lg:text-lg mb-1">
                  {notification.type === 'success' ? '¡Éxito!' : '¡Error!'}
                </h3>
                <p className="text-white/90 font-semibold text-sm lg:text-base">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification({ ...notification, show: false })}
                className="p-1.5 lg:p-2 hover:bg-white/20 rounded-lg transition-all flex-shrink-0"
              >
                <XCircle size={18} className="text-white lg:hidden" />
                <XCircle size={20} className="text-white hidden lg:block" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
