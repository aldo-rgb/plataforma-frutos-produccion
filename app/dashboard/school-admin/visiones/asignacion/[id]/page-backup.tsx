'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, UserPlus, Trash2, AlertTriangle } from 'lucide-react';

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  rol: string;
  isActive: boolean;
  PerfilMentor?: {
    precioDisciplina?: number;
    precioBase?: number;
  };
  CallAvailability?: Array<{
    availableSlots: number;
    bookedSlots: number;
  }>;
}

interface MentorAsignado {
  id: number;
  visionId: number;
  mentorId: number;
  assignedAt: Date;
  precioDisciplina: number;
  precioBase: number;
  esLider: boolean;
  costoTotal: number;
  Usuario_VisionMentor_mentorIdToUsuario: Mentor;
}

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  organizationId: number;
  Organization?: {
    name: string;
  };
}

interface CicloInfo {
  semanas: number;
  llamadasDisciplina: number;
  diasTotales: number;
}

export default function AsignacionMentoresPage() {
  const params = useParams();
  const router = useRouter();
  const visionId = parseInt(params.id as string);

  const [vision, setVision] = useState<Vision | null>(null);
  const [cicloInfo, setCicloInfo] = useState<CicloInfo | null>(null);
  const [mentoresAsignados, setMentoresAsignados] = useState<MentorAsignado[]>([]);
  const [mentoresDisponibles, setMentoresDisponibles] = useState<Mentor[]>([]);
  const [lideresDisponibles, setLideresDisponibles] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [mentorToRemove, setMentorToRemove] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);

  useEffect(() => {
    if (visionId) {
      fetchData();
    }
  }, [visionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener detalles de la visión
      const visionRes = await fetch(`/api/school-admin/visiones/${visionId}`);
      if (visionRes.ok) {
        const data = await visionRes.json();
        setVision(data.vision);
        setCicloInfo(data.cicloInfo);
        setMentoresAsignados(data.mentoresAsignados || []);
      }

      // Obtener mentores disponibles
      const mentoresRes = await fetch(`/api/school-admin/visiones/${visionId}/mentores`);
      if (mentoresRes.ok) {
        const data = await mentoresRes.json();
        setMentoresAsignados(data.mentoresAsignados || []);
        setMentoresDisponibles(data.mentoresDisponibles || []);
        setLideresDisponibles(data.lideresDisponibles || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarMentor = async (mentorId: number) => {
    setAssigning(mentorId);
    try {
      const response = await fetch(`/api/school-admin/visiones/${visionId}/mentores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al asignar mentor');
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      alert('Error al asignar mentor');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoverMentor = async () => {
    if (!mentorToRemove) return;

    setRemoving(true);
    try {
      const response = await fetch(`/api/school-admin/visiones/${visionId}/mentores`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: mentorToRemove }),
      });

      if (response.ok) {
        await fetchData();
        setShowRemoveModal(false);
        setMentorToRemove(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al remover mentor');
      }
    } catch (error) {
      console.error('Error removing mentor:', error);
      alert('Error al remover mentor');
    } finally {
      setRemoving(false);
    }
  };

  const calculateSlotStatus = (mentor: Mentor) => {
    const availability = mentor.CallAvailability?.[0];
    if (!availability) return { available: 0, total: 0, percentage: 0 };

    const total = availability.availableSlots;
    const booked = availability.bookedSlots;
    const available = total - booked;
    const percentage = total > 0 ? (available / total) * 100 : 0;

    return { available, total, percentage };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const costoTotalMentores = mentoresAsignados.reduce((acc, m) => acc + (m.costoTotal || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/school-admin/visiones/${visionId}`)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a la visión
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-3">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Asignación de Mentores</h1>
                <p className="text-gray-600">{vision?.nombre}</p>
              </div>
            </div>

            {/* Resumen del ciclo */}
            {cicloInfo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-purple-600 font-medium">Duración del Ciclo</p>
                  <p className="text-2xl font-bold text-purple-700">{cicloInfo.semanas} semanas</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium">Llamadas de Disciplina</p>
                  <p className="text-2xl font-bold text-blue-700">{cicloInfo.llamadasDisciplina} llamadas</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-indigo-600 font-medium">Costo Total de Mentores</p>
                  <p className="text-2xl font-bold text-indigo-700">{formatCurrency(costoTotalMentores)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mentores Asignados */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Mentores Asignados</h2>

          {mentoresAsignados.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay mentores asignados</p>
              <p className="text-gray-400 text-sm">Asigna mentores desde las secciones de abajo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mentoresAsignados.map((mentor) => {
                const usuario = mentor.Usuario_VisionMentor_mentorIdToUsuario;
                const esLider = usuario?.rol === 'LIDER';
                const slotStatus = calculateSlotStatus(usuario);

                return (
                  <div
                    key={mentor.id}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                          {usuario?.nombre?.charAt(0) || 'M'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-gray-800">{usuario?.nombre}</h3>
                            {esLider ? (
                              <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full">
                                👑 Mentor Privado
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full">
                                🎓 Mentor
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm">{usuario?.email}</p>

                          {/* Estadísticas */}
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-gray-500">Llamadas</p>
                              <p className="text-lg font-bold text-purple-600">
                                {esLider ? 'N/A' : `${cicloInfo?.llamadasDisciplina || 0}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Precio/Llamada</p>
                              <p className="text-lg font-bold text-indigo-600">
                                {esLider ? 'Sin costo' : formatCurrency(mentor.precioDisciplina)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Costo Total</p>
                              <p className="text-lg font-bold text-blue-600">
                                {esLider ? '$0.00 MXN' : formatCurrency(mentor.costoTotal)}
                              </p>
                            </div>
                          </div>

                          {/* Disponibilidad de slots */}
                          {!esLider && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">Disponibilidad</span>
                                <span className="font-semibold text-gray-700">
                                  {slotStatus.available} / {slotStatus.total} espacios
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    slotStatus.percentage > 50
                                      ? 'bg-green-500'
                                      : slotStatus.percentage > 20
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${slotStatus.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setMentorToRemove(mentor.mentorId);
                          setShowRemoveModal(true);
                        }}
                        className="ml-4 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mentores Disponibles */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Mentores Profesionales Disponibles</h2>

          {mentoresDisponibles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No hay mentores profesionales disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mentoresDisponibles.map((mentor) => {
                const slotStatus = calculateSlotStatus(mentor);
                const isAssigning = assigning === mentor.id;

                return (
                  <div
                    key={mentor.id}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                        {mentor.nombre?.charAt(0) || 'M'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{mentor.nombre}</h4>
                        <p className="text-sm text-gray-600">{mentor.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Disponibilidad: {slotStatus.available}/{slotStatus.total} espacios
                        </p>
                      </div>
                      <button
                        onClick={() => handleAsignarMentor(mentor.id)}
                        disabled={isAssigning}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {isAssigning ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          </span>
                        ) : (
                          <UserPlus className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Líderes Disponibles */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Líderes / Mentores Privados Disponibles</h2>
          <p className="text-sm text-gray-600 mb-4">
            Los mentores privados no tienen costo adicional y no consumen espacios de disponibilidad
          </p>

          {lideresDisponibles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No hay mentores privados disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lideresDisponibles.map((lider) => {
                const isAssigning = assigning === lider.id;

                return (
                  <div
                    key={lider.id}
                    className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
                        {lider.nombre?.charAt(0) || 'L'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800">{lider.nombre}</h4>
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                            👑 Privado
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{lider.email}</p>
                        <p className="text-xs text-green-600 font-semibold mt-1">Sin costo adicional</p>
                      </div>
                      <button
                        onClick={() => handleAsignarMentor(lider.id)}
                        disabled={isAssigning}
                        className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {isAssigning ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          </span>
                        ) : (
                          <UserPlus className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Confirmar Eliminación</h3>
            </div>

            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas remover este mentor de la visión? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setMentorToRemove(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={removing}
              >
                Cancelar
              </button>
              <button
                onClick={handleRemoverMentor}
                disabled={removing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {removing ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
