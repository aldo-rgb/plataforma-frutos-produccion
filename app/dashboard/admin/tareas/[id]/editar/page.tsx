'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Save, Calendar, Clock, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

export default function EditarTareaPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tarea, setTarea] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fechaLimite: '',
    horaEvento: '',
    pointsReward: 0,
    fechaEvento: '',
    isActive: true
  });

  useEffect(() => {
    loadTarea();
  }, []);

  const loadTarea = async () => {
    try {
      const response = await fetch(`/api/admin/tareas/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTarea(data);
        
        // Inicializar el formulario con los datos existentes
        setFormData({
          fechaLimite: data.fechaLimite ? new Date(data.fechaLimite).toISOString().split('T')[0] : '',
          horaEvento: data.horaEvento || '',
          pointsReward: data.pointsReward || 0,
          fechaEvento: data.fechaEvento ? new Date(data.fechaEvento).toISOString().split('T')[0] : '',
          isActive: data.isActive
        });
      } else {
        toast.error('Error al cargar la tarea');
        router.push('/dashboard/admin/tareas');
      }
    } catch (error) {
      console.error('Error loading tarea:', error);
      toast.error('Error al cargar la tarea');
      router.push('/dashboard/admin/tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.pointsReward < 0) {
      toast.error('Los puntos no pueden ser negativos');
      return;
    }

    // Validar fecha y hora futuras si es EXTRAORDINARY
    if (tarea.type === 'EXTRAORDINARY' && formData.fechaLimite && formData.horaEvento) {
      const fechaHoraLimite = new Date(`${formData.fechaLimite}T${formData.horaEvento}`);
      const ahora = new Date();
      
      if (fechaHoraLimite <= ahora) {
        const horaActual = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        toast.error(`⚠️ La hora límite debe ser futura. Hora actual: ${horaActual}`);
        return;
      }
    }

    // Validar fecha del evento no sea en el pasado
    if (tarea.type === 'EVENT' && formData.fechaEvento) {
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

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/tareas/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaLimite: formData.fechaLimite || null,
          horaEvento: formData.horaEvento || null,
          pointsReward: formData.pointsReward,
          fechaEvento: formData.fechaEvento || null,
          isActive: formData.isActive
        })
      });

      if (response.ok) {
        toast.success('✅ Tarea actualizada exitosamente');
        router.push('/dashboard/admin/tareas');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar la tarea');
      }
    } catch (error) {
      console.error('Error updating tarea:', error);
      toast.error('Error al actualizar la tarea');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando tarea...</p>
        </div>
      </div>
    );
  }

  if (!tarea) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/admin/tareas')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Tareas
          </button>

          <h1 className="text-4xl font-bold text-white mb-2">
            Editar Tarea
          </h1>
          <p className="text-slate-400">
            Modifica los detalles de la tarea
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info de la Tarea */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-white text-xl font-bold mb-4">{tarea.titulo}</h2>
            {tarea.descripcion && (
              <p className="text-slate-400 mb-4">{tarea.descripcion}</p>
            )}
            
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-slate-500">Tipo:</span>
                <span className="ml-2 text-white font-medium">
                  {tarea.type === 'EXTRAORDINARY' ? 'Extraordinaria' : 'Evento'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Target:</span>
                <span className="ml-2 text-white font-medium">
                  {tarea.targetType === 'ALL' ? 'Todos' : tarea.targetType === 'GROUP' ? 'Grupo' : 'Individual'}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario de Edición */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              Campos Editables
            </h3>

            <div className="space-y-6">
              {/* Puntos */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Puntos de Recompensa (PC) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.pointsReward}
                    onChange={(e) => setFormData({ ...formData, pointsReward: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    min="0"
                    required
                  />
                  <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                </div>
              </div>

              {/* Fecha Límite (para EXTRAORDINARY) */}
              {tarea.type === 'EXTRAORDINARY' && (
                <>
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Fecha Límite <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.fechaLimite}
                        onChange={(e) => setFormData({ ...formData, fechaLimite: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Hora Límite <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={formData.horaEvento}
                        onChange={(e) => setFormData({ ...formData, horaEvento: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                      <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* Fecha y Hora de Evento (para EVENT) */}
              {tarea.type === 'EVENT' && (
                <>
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Fecha del Evento <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.fechaEvento}
                        onChange={(e) => setFormData({ ...formData, fechaEvento: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Hora del Evento
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={formData.horaEvento}
                        onChange={(e) => setFormData({ ...formData, horaEvento: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* Estado Activo/Inactivo */}
              <div>
                <label className="block text-white font-semibold mb-3">
                  Estado de la Tarea
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: true })}
                    className={`flex-1 p-4 rounded-xl font-medium transition-all ${
                      formData.isActive
                        ? 'bg-green-900/30 border-2 border-green-500 text-green-300'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-400'
                    }`}
                  >
                    🟢 Activa
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: false })}
                    className={`flex-1 p-4 rounded-xl font-medium transition-all ${
                      !formData.isActive
                        ? 'bg-red-900/30 border-2 border-red-500 text-red-300'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-400'
                    }`}
                  >
                    🔴 Inactiva
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/admin/tareas')}
              className="flex-1 p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
