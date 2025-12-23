'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, Star, DollarSign, Award } from 'lucide-react';

interface Mentor {
  id: number;
  usuarioId: number;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    imagen: string | null;
  };
  nivel: 'JUNIOR' | 'SENIOR' | 'MASTER';
  titulo: string | null;
  especialidad: string;
  especialidadesSecundarias: string[];
  experienciaAnios: number;
  totalSesiones: number;
  calificacionPromedio: number;
  totalResenas: number;
  disponible: boolean;
  destacado: boolean;
  comisionMentor: number;
  comisionPlataforma: number;
  precioBase: number;
  totalSolicitudes: number;
  servicios: any[];
}

export default function AdminMentoresPage() {
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [mentorAEliminar, setMentorAEliminar] = useState<Mentor | null>(null);

  useEffect(() => {
    cargarMentores();
  }, []);

  const cargarMentores = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/mentores');
      const data = await res.json();

      if (data.success) {
        setMentores(data.mentores);
      } else {
        setError(data.error || 'Error al cargar mentores');
      }
    } catch (err) {
      setError('Error de conexión al cargar mentores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDisponibilidad = async (mentor: Mentor) => {
    try {
      const res = await fetch(`/api/admin/mentores/${mentor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponible: !mentor.disponible }),
      });

      const data = await res.json();

      if (data.success) {
        cargarMentores();
      } else {
        alert(data.error || 'Error al actualizar');
      }
    } catch (err) {
      alert('Error al actualizar disponibilidad');
      console.error(err);
    }
  };

  const toggleDestacado = async (mentor: Mentor) => {
    try {
      const res = await fetch(`/api/admin/mentores/${mentor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destacado: !mentor.destacado }),
      });

      const data = await res.json();

      if (data.success) {
        cargarMentores();
      } else {
        alert(data.error || 'Error al actualizar');
      }
    } catch (err) {
      alert('Error al actualizar destacado');
      console.error(err);
    }
  };

  const confirmarEliminar = (mentor: Mentor) => {
    setMentorAEliminar(mentor);
    setShowModal(true);
  };

  const eliminarMentor = async () => {
    if (!mentorAEliminar) return;

    try {
      const res = await fetch(`/api/admin/mentores/${mentorAEliminar.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('Mentor eliminado exitosamente');
        cargarMentores();
        setShowModal(false);
        setMentorAEliminar(null);
      } else {
        alert(data.mensaje || data.error || 'Error al eliminar');
        setShowModal(false);
      }
    } catch (err) {
      alert('Error al eliminar mentor');
      console.error(err);
    }
  };

  const getBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'MASTER':
        return 'bg-purple-500';
      case 'SENIOR':
        return 'bg-blue-500';
      case 'JUNIOR':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando mentores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="text-purple-400" size={40} />
              Gestión de Mentores
            </h1>
            <p className="text-slate-400">
              Panel maestro de administración de mentores
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard/admin/asignaciones"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50"
            >
              <Users size={20} />
              Asignar Mentores
            </a>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Mentores</p>
              <p className="text-3xl font-bold text-white">{mentores.length}</p>
            </div>
            <Users className="text-purple-400" size={32} />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Disponibles</p>
              <p className="text-3xl font-bold text-green-400">
                {mentores.filter((m) => m.disponible).length}
              </p>
            </div>
            <Eye className="text-green-400" size={32} />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Destacados</p>
              <p className="text-3xl font-bold text-amber-400">
                {mentores.filter((m) => m.destacado).length}
              </p>
            </div>
            <Award className="text-amber-400" size={32} />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Sesiones</p>
              <p className="text-3xl font-bold text-blue-400">
                {mentores.reduce((sum, m) => sum + m.totalSolicitudes, 0)}
              </p>
            </div>
            <DollarSign className="text-blue-400" size={32} />
          </div>
        </div>
      </div>

      {/* Tabla de mentores */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Mentor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Tarifa Base
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {mentores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <Users size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-lg">No hay mentores registrados</p>
                      <p className="text-sm mt-2">
                        Comienza agregando tu primer mentor usando el botón de arriba
                      </p>
                    </td>
                  </tr>
                ) : (
                  mentores.map((mentor) => (
                    <tr
                      key={mentor.id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Mentor (Foto + Nombre) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={mentor.usuario.imagen || '/default-avatar.png'}
                            alt={mentor.usuario.nombre}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-600"
                          />
                          <div>
                            <p className="text-white font-semibold">
                              {mentor.usuario.nombre}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {mentor.titulo || 'Sin título'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Nivel */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`${getBadgeColor(
                            mentor.nivel
                          )} text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit`}
                        >
                          <Award size={14} />
                          {mentor.nivel}
                        </span>
                      </td>

                      {/* Especialidad */}
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">
                          {mentor.especialidad}
                        </p>
                        {mentor.especialidadesSecundarias.length > 0 && (
                          <p className="text-slate-400 text-xs mt-1">
                            +{mentor.especialidadesSecundarias.length} más
                          </p>
                        )}
                      </td>

                      {/* Tarifa Base */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className={`font-bold ${mentor.precioBase > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(mentor.precioBase || 0).toLocaleString()}
                        </p>
                        <p className="text-slate-400 text-xs">por sesión</p>
                      </td>

                      {/* Comisión */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-white">
                            <span className="font-semibold">{mentor.comisionPlataforma}%</span>{' '}
                            <span className="text-slate-400">Plataforma</span>
                          </p>
                          <p className="text-slate-400">
                            {mentor.comisionMentor}% Mentor
                          </p>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-amber-500 fill-amber-500" />
                          <span className="text-white font-semibold">
                            {mentor.calificacionPromedio.toFixed(1)}
                          </span>
                          <span className="text-slate-400 text-sm">
                            ({mentor.totalResenas})
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1">
                          {mentor.totalSolicitudes} sesiones
                        </p>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                              mentor.disponible
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {mentor.disponible ? (
                              <>
                                <Eye size={12} /> Activo
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} /> Inactivo
                              </>
                            )}
                          </span>

                          {mentor.destacado && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Award size={12} /> Destacado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acción: Ver Perfil */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <a
                          href={`/dashboard/admin/mentores/${mentor.id}`}
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-semibold"
                          title="Ver perfil completo"
                        >
                          <Eye size={16} />
                          Ver Perfil
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showModal && mentorAEliminar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trash2 className="text-red-400" />
              Confirmar Eliminación
            </h3>

            <p className="text-slate-300 mb-6">
              ¿Estás seguro que deseas eliminar a{' '}
              <span className="font-bold text-white">
                {mentorAEliminar.usuario.nombre}
              </span>
              ?
            </p>

            {mentorAEliminar.totalSolicitudes > 0 && (
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 mb-6">
                <p className="text-amber-400 text-sm">
                  <strong>⚠️ Advertencia:</strong> Este mentor tiene{' '}
                  {mentorAEliminar.totalSolicitudes} solicitudes asociadas.
                  Considera desactivarlo en lugar de eliminarlo.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setMentorAEliminar(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarMentor}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
