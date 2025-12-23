'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Calendar, Zap, Users, User, Globe, Eye, CheckCircle, Clock, XCircle, Trash2, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

interface AdminTask {
  id: number;
  type: 'EXTRAORDINARY' | 'EVENT';
  titulo: string;
  descripcion: string;
  pointsReward: number;
  targetType: 'USER' | 'GROUP' | 'ALL';
  targetId: number | null;
  requiereEvidencia: boolean;
  isActive: boolean;
  fechaLimite: string | null;
  fechaEvento: string | null;
  horaEvento: string | null;
  lugar: string | null;
  createdAt: string;
  Creator: {
    nombre: string;
    email: string;
  };
  _count: {
    Submissions: number;
  };
  stats: {
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    expiredSubmissions?: number;
  };
}

export default function AdminTareasPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tareas, setTareas] = useState<AdminTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'EXTRAORDINARY' | 'EVENT'>('all');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; tareaId: number | null }>({ 
    show: false, 
    tareaId: null 
  });

  useEffect(() => {
    loadTareas();
  }, [filter]);

  const loadTareas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      
      const response = await fetch(`/api/admin/tareas?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Tareas recibidas:', data);
        setTareas(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error al cargar tareas:', response.status, errorData);
        toast.error(`Error al cargar tareas: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error loading tareas:', error);
      toast.error('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  // Función helper para formatear fechas sin problema de timezone
  const formatDateSafe = (dateString: string): string => {
    if (!dateString) return '';
    try {
      // Si viene de Prisma como ISO string (2025-12-21T00:00:00.000Z)
      // Extraer solo la parte de la fecha YYYY-MM-DD
      const fechaSolo = dateString.split('T')[0];
      
      // Convertir a formato que JS interpreta como local (YYYY/MM/DD)
      const date = new Date(fechaSolo.replace(/-/g, '/'));
      return date.toLocaleDateString('es-MX');
    } catch {
      return 'Fecha inválida';
    }
  };

  // Función para verificar si una tarea ha expirado
  const haExpirado = (tarea: AdminTask): boolean => {
    const ahora = new Date();

    if (tarea.type === 'EXTRAORDINARY' && tarea.fechaLimite) {
      // Extraer solo la fecha sin timezone issues
      const fechaSolo = tarea.fechaLimite.split('T')[0];
      const fechaBase = new Date(fechaSolo.replace(/-/g, '/'));
      
      if (tarea.horaEvento) {
        const [horas, minutos] = tarea.horaEvento.split(':');
        fechaBase.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      } else {
        fechaBase.setHours(23, 59, 59, 999);
      }
      
      console.log('🔍 haExpirado check:', {
        titulo: tarea.titulo,
        fechaBase: fechaBase.toLocaleString('es-MX'),
        ahora: ahora.toLocaleString('es-MX'),
        haExpirado: fechaBase <= ahora
      });
      
      return fechaBase <= ahora;
      
    } else if (tarea.type === 'EVENT' && tarea.fechaEvento) {
      const fechaSolo = tarea.fechaEvento.split('T')[0];
      const fechaBase = new Date(fechaSolo.replace(/-/g, '/'));
      
      if (tarea.horaEvento) {
        const [horas, minutos] = tarea.horaEvento.split(':');
        fechaBase.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      } else {
        fechaBase.setHours(23, 59, 59, 999);
      }
      
      return fechaBase <= ahora;
    }

    return false;
  };

  const handleDelete = async (id: number) => {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;

    if (haExpirado(tarea)) {
      toast.error('⚠️ No puedes eliminar una tarea o evento que ya ha expirado o pasado');
      return;
    }

    setDeleteModal({ show: true, tareaId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.tareaId) return;

    try {
      const response = await fetch(`/api/admin/tareas/${deleteModal.tareaId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('✅ Tarea eliminada');
        setDeleteModal({ show: false, tareaId: null });
        loadTareas();
      } else {
        toast.error('Error al eliminar la tarea');
      }
    } catch (error) {
      console.error('Error deleting tarea:', error);
      toast.error('Error al eliminar la tarea');
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/tareas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(`✅ Tarea ${!isActive ? 'activada' : 'desactivada'}`);
        loadTareas();
      } else {
        toast.error('Error al actualizar la tarea');
      }
    } catch (error) {
      console.error('Error toggling tarea:', error);
      toast.error('Error al actualizar la tarea');
    }
  };

  const getTargetBadge = (task: AdminTask) => {
    switch (task.targetType) {
      case 'ALL':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-900/30 border border-indigo-600 rounded-full text-xs text-indigo-300">
            <Globe className="w-3 h-3" />
            Todos
          </div>
        );
      case 'GROUP':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-600 rounded-full text-xs text-blue-300">
            <Users className="w-3 h-3" />
            Grupo
          </div>
        );
      case 'USER':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-900/30 border border-purple-600 rounded-full text-xs text-purple-300">
            <User className="w-3 h-3" />
            Individual
          </div>
        );
    }
  };

  const getTypeBadge = (type: 'EXTRAORDINARY' | 'EVENT') => {
    if (type === 'EVENT') {
      return (
        <div className="flex items-center gap-1 px-3 py-1 bg-purple-900/30 border border-purple-500 rounded-full text-xs font-bold text-purple-300">
          <Calendar className="w-3 h-3" />
          EVENTO
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-3 py-1 bg-amber-900/30 border border-amber-500 rounded-full text-xs font-bold text-amber-300">
        <Zap className="w-3 h-3" />
        EXTRAORDINARIA
      </div>
    );
  };

  const filteredTareas = filter === 'all' 
    ? tareas 
    : tareas.filter(t => t.type === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                🎯 Gestor de Misiones y Eventos
              </h1>
              <p className="text-slate-400">
                Administra tareas extraordinarias y eventos para tu equipo
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/admin/tareas/nueva')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5" />
              Nueva Tarea/Evento
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Todas ({tareas.length})
            </button>
            <button
              onClick={() => setFilter('EXTRAORDINARY')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                filter === 'EXTRAORDINARY'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              Extraordinarias ({tareas.filter(t => t.type === 'EXTRAORDINARY').length})
            </button>
            <button
              onClick={() => setFilter('EVENT')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                filter === 'EVENT'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Eventos ({tareas.filter(t => t.type === 'EVENT').length})
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-slate-400">Cargando tareas...</span>
          </div>
        ) : filteredTareas.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-white text-xl font-bold mb-2">No hay tareas creadas</h3>
            <p className="text-slate-400 mb-6">Crea tu primera misión o evento</p>
            <button
              onClick={() => router.push('/dashboard/admin/tareas/nueva')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Crear Tarea
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTareas.map((tarea) => (
              <div
                key={tarea.id}
                className={`bg-slate-900/50 border-2 rounded-2xl p-6 transition-all hover:shadow-lg ${
                  tarea.type === 'EVENT'
                    ? 'border-purple-800 hover:border-purple-600'
                    : 'border-amber-800 hover:border-amber-600'
                } ${!tarea.isActive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeBadge(tarea.type)}
                      {getTargetBadge(tarea)}
                      {!tarea.isActive && (
                        <div className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded-full">
                          Inactiva
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-white text-xl font-bold mb-1">{tarea.titulo}</h3>
                    
                    {tarea.descripcion && (
                      <p className="text-slate-400 text-sm mb-3">{tarea.descripcion}</p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Zap className="w-4 h-4" />
                        <span className="font-bold">{tarea.pointsReward} PC</span>
                      </div>
                      
                      {tarea.type === 'EVENT' && tarea.fechaEvento && (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Calendar className="w-4 h-4" />
                          {formatDateSafe(tarea.fechaEvento)}
                          {tarea.horaEvento && ` - ${tarea.horaEvento}`}
                        </div>
                      )}

                      {tarea.type === 'EXTRAORDINARY' && tarea.fechaLimite && (
                        <div className="flex items-center gap-1 text-orange-400">
                          <Clock className="w-4 h-4" />
                          Límite: {formatDateSafe(tarea.fechaLimite)}
                          {tarea.horaEvento && ` - ${tarea.horaEvento}`}
                        </div>
                      )}

                      {tarea.requiereEvidencia && (
                        <div className="flex items-center gap-1 text-indigo-400">
                          <Eye className="w-4 h-4" />
                          Requiere evidencia
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!haExpirado(tarea) && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/dashboard/admin/tareas/${tarea.id}/editar`)}
                        className="p-2 bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(tarea.id)}
                        className="p-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{tarea.stats.totalSubmissions}</div>
                    <div className="text-xs text-slate-400">Participantes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{tarea.stats.pendingSubmissions}</div>
                    <div className="text-xs text-slate-400">Pendientes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{tarea.stats.approvedSubmissions}</div>
                    <div className="text-xs text-slate-400">Completadas</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    Creada por: <span className="text-slate-400">{tarea.Creator.nombre}</span>
                  </div>
                  <div>
                    {new Date(tarea.createdAt).toLocaleDateString('es-MX')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {deleteModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-500/50 rounded-2xl max-w-md w-full shadow-2xl shadow-red-500/20 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold">¿Eliminar Tarea?</h3>
                    <p className="text-red-100 text-sm">Esta acción es irreversible</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-4">
                  <p className="text-red-200 text-sm font-medium mb-3">
                    Esta acción NO se puede deshacer y eliminará:
                  </p>
                  <ul className="space-y-2 text-red-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>La tarea completa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>Todas las submissions asociadas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>El historial de participación</span>
                    </li>
                  </ul>
                </div>

                <p className="text-slate-300 text-sm text-center mb-6">
                  ¿Estás seguro de que deseas continuar?
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, tareaId: null })}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
