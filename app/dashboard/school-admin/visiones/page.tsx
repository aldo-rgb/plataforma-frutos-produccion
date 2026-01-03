'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Search,
  Filter,
  Package,
  ArrowLeft,
  UserPlus,
  CreditCard,
  Calendar,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  organizationId: number;
  maxParticipantes: number | null;
  licensesAllocated: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    Participantes: number;
    GameChangers: number;
  };
}

export default function VisionesSchoolAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [coordinadores, setCoordinadores] = useState<Array<{ id: number; nombre: string; email: string }>>([]);
  const [loadingCoordinadores, setLoadingCoordinadores] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    maxParticipantes: 30,
    coordinadorId: '',
    startDate: '',
    endDate: '',
    forceFinanzasArea: true,
    forceRelacionesArea: true,
    forceTalentosArea: true,
    forceSaludArea: true,
    forcePazMentalArea: true,
    forceOcioArea: true,
    forceTransformationArea: true,
    transformationGuestsTarget: 4,
    forceCommunityServiceArea: true,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
    } else {
      fetchVisiones();
      fetchCredits();
      fetchCoordinadores();
    }
  }, [status, session]);

  const fetchVisiones = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/school-admin/visiones');
      const data = await res.json();

      if (data.success) {
        setVisiones(data.visiones);
      }
    } catch (error) {
      console.error('Error fetching visiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setAvailableCredits(data.stats.availableCredits || 0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchCoordinadores = async () => {
    try {
      setLoadingCoordinadores(true);
      const res = await fetch('/api/school-admin/coordinadores');
      const data = await res.json();
      if (data.success) {
        setCoordinadores(data.coordinadores || []);
      }
    } catch (error) {
      console.error('Error fetching coordinadores:', error);
    } finally {
      setLoadingCoordinadores(false);
    }
  };

  const handleCreateVision = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/school-admin/visiones/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        setFormData({ 
          nombre: '', 
          descripcion: '', 
          maxParticipantes: 30,
          coordinadorId: '',
          startDate: '',
          endDate: '',
          forceFinanzasArea: true,
          forceRelacionesArea: true,
          forceTalentosArea: true,
          forceSaludArea: true,
          forcePazMentalArea: true,
          forceOcioArea: true,
          forceTransformationArea: true,
          transformationGuestsTarget: 4,
          forceCommunityServiceArea: true,
        });
        fetchVisiones();
      } else {
        alert(data.error || 'Error al crear la visión');
      }
    } catch (error) {
      console.error('Error creating vision:', error);
      alert('Error al crear la visión');
    }
  };

  const filteredVisiones = visiones.filter((vision) =>
    vision.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/school-admin"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="text-slate-400" size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Gestión de Visiones/Grupos
              </h1>
              <p className="text-slate-400">
                Crea y gestiona visiones para tu organización
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(true);
              fetchCoordinadores();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus size={20} />
            Nueva Visión
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {visiones.length}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Visiones Activas</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="text-emerald-400" size={24} />
              <span className="text-3xl font-bold text-emerald-400">
                {availableCredits}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Licencias Disponibles</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="text-cyan-400" size={24} />
              <span className="text-3xl font-bold text-cyan-400">
                {visiones.reduce((sum, v) => sum + v._count.Participantes, 0)}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes Totales</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar visiones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Visiones Grid */}
        {filteredVisiones.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No hay visiones creadas</p>
            <p className="text-slate-500 text-sm mb-6">
              Crea tu primera visión para comenzar a gestionar participantes
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus size={20} />
              Crear Primera Visión
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVisiones.map((vision) => (
              <div
                key={vision.id}
                className="bg-slate-900/50 backdrop-blur border border-slate-700 hover:border-purple-500/50 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {vision.nombre}
                    </h3>
                    {vision.descripcion && (
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {vision.descripcion}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      vision.isActive
                        ? 'bg-green-900/20 text-green-400 border border-green-600'
                        : 'bg-gray-900/20 text-gray-400 border border-gray-600'
                    }`}
                  >
                    {vision.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Participantes:</span>
                    <span className="text-purple-400 font-semibold">
                      {vision._count.Participantes}
                      {vision.maxParticipantes && ` / ${vision.maxParticipantes}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Game Changers:</span>
                    <span className="text-cyan-400 font-semibold">
                      {vision._count.GameChangers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Licencias Asignadas:</span>
                    <span className="text-emerald-400 font-semibold">
                      {vision.licensesAllocated}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Creada:</span>
                    <span className="text-slate-400 font-medium">
                      {new Date(vision.createdAt).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/school-admin/visiones/${vision.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Vision Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Crear Nueva Visión
            </h2>

            <form onSubmit={handleCreateVision} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de la Visión *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Ej: Generación 2025-A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="Descripción de la visión..."
                />
              </div>

              {/* Selector de Coordinador */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Coordinador Asignado *
                </label>
                {loadingCoordinadores ? (
                  <div className="flex items-center justify-center py-4 bg-slate-800 border border-slate-700 rounded-lg">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="ml-2 text-slate-400">Cargando coordinadores...</span>
                  </div>
                ) : coordinadores.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ No hay coordinadores disponibles en tu organización. Necesitas crear usuarios con rol COORDINADOR primero.
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.coordinadorId}
                    onChange={(e) =>
                      setFormData({ ...formData, coordinadorId: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Selecciona un coordinador...</option>
                    {coordinadores.map((coord) => (
                      <option key={coord.id} value={coord.id}>
                        {coord.nombre} ({coord.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Máximo de Participantes
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxParticipantes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipantes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Fechas de la Visión */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Banner de información de fechas */}
              {(formData.startDate || formData.endDate) && (
                <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="text-purple-400 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h4 className="text-purple-300 font-semibold text-sm mb-2">
                        Período de la Visión
                      </h4>
                      <div className="space-y-1 text-sm">
                        {formData.startDate && (
                          <p className="text-slate-300">
                            <span className="text-slate-400">Inicio:</span>{' '}
                            <span className="font-semibold">
                              {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('es-MX', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </p>
                        )}
                        {formData.endDate && (
                          <p className="text-slate-300">
                            <span className="text-slate-400">Fin:</span>{' '}
                            <span className="font-semibold">
                              {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('es-MX', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </p>
                        )}
                        {formData.startDate && formData.endDate && (
                          <p className="text-purple-300 font-semibold mt-2">
                            Duración: {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))} días
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Separador */}
              <div className="border-t border-slate-700 my-6"></div>

              {/* Configuración de Áreas Obligatorias */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users size={20} className="text-purple-400" />
                  Áreas Obligatorias del Wizard
                </h3>
                <p className="text-slate-400 text-sm -mt-2">
                  Configura qué áreas serán obligatorias para todos los participantes de esta visión
                </p>

                {/* Área de Finanzas */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        💰 Finanzas
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Declaración y meta de abundancia financiera
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceFinanzasArea: !formData.forceFinanzasArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceFinanzasArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceFinanzasArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Relaciones */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        ❤️ Relaciones
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Construcción de vínculos genuinos y significativos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceRelacionesArea: !formData.forceRelacionesArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceRelacionesArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceRelacionesArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Talentos */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🎨 Talentos
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Desarrollo de habilidades y creatividad personal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceTalentosArea: !formData.forceTalentosArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceTalentosArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceTalentosArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Salud */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        💪 Salud
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Cuidado del bienestar físico y energía vital
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceSaludArea: !formData.forceSaludArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceSaludArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceSaludArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Paz Mental */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🧘 Paz Mental
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Cultivo de serenidad y equilibrio emocional
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forcePazMentalArea: !formData.forcePazMentalArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forcePazMentalArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forcePazMentalArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Ocio */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🎮 Ocio
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Disfrute consciente y tiempo de descanso
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceOcioArea: !formData.forceOcioArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceOcioArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceOcioArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Área de Servicio a Transformación (Invitados) */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🎯 Servicio a Transformación (Invitados)
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Los participantes deberán invitar personas al programa
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceTransformationArea: !formData.forceTransformationArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceTransformationArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceTransformationArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {formData.forceTransformationArea && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Meta de invitados efectivos *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.transformationGuestsTarget}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            transformationGuestsTarget: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-amber-400 text-xs mt-2 flex items-start gap-2">
                        <span className="text-base">⚠️</span>
                        <span>
                          Esto creará <strong>{formData.transformationGuestsTarget} tareas bloqueadas</strong> en el Wizard de todos los participantes.
                          Los primeros {Math.ceil(formData.transformationGuestsTarget / 2)} invitados deberán completarse antes de la mitad del ciclo.
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Área de Servicio Comunitario */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        🤝 Servicio Comunitario
                      </label>
                      <p className="text-slate-400 text-sm mt-1">
                        Los participantes deberán definir acciones de servicio a su comunidad
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          forceCommunityServiceArea: !formData.forceCommunityServiceArea,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.forceCommunityServiceArea
                          ? 'bg-purple-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.forceCommunityServiceArea
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.nombre.trim() ||
                    !formData.startDate ||
                    !formData.endDate ||
                    !formData.maxParticipantes
                  }
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  Crear Visión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
