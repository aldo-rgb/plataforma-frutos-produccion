'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive,
  Plus,
  Calendar,
  Users,
  MessageSquare,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
  Settings,
  Unlock,
  Lock,
  ChevronRight
} from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: string;
  closeDate: string;
  releaseDate: string | null;
  isActive: boolean;
  isReleased: boolean;
  Vision: {
    id: number;
    nombre: string;
  };
  _count: {
    Messages: number;
  };
}

interface Vision {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

export default function TimeCapsulePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newCampaign, setNewCampaign] = useState({
    visionId: '',
    name: '',
    slug: '',
    description: '',
    startDate: '',
    closeDate: '',
    notifyDaysBefore: 5,
    pointsPerMessage: 100
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Cargar campañas
      const campaignsRes = await fetch('/api/time-capsule/campaigns');
      const campaignsData = await campaignsRes.json();

      if (!campaignsRes.ok) {
        setError(campaignsData.error);
        return;
      }

      setCampaigns(campaignsData.campaigns);

      // Cargar visiones disponibles
      const visionesRes = await fetch('/api/coordinador/visiones');
      const visionesData = await visionesRes.json();

      if (visionesRes.ok) {
        setVisiones(visionesData.visiones || []);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign() {
    if (!newCampaign.visionId || !newCampaign.name || !newCampaign.slug) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/time-capsule/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          visionId: parseInt(newCampaign.visionId)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al crear campaña');
        return;
      }

      // Recargar datos
      await loadData();
      setShowCreateModal(false);
      setNewCampaign({
        visionId: '',
        name: '',
        slug: '',
        description: '',
        startDate: '',
        closeDate: '',
        notifyDaysBefore: 5,
        pointsPerMessage: 100
      });
    } catch {
      alert('Error de conexión');
    } finally {
      setCreating(false);
    }
  }

  async function handleReleaseCampaign(campaignId: number) {
    if (!confirm('¿Estás seguro de liberar las cápsulas? Los participantes podrán ver sus mensajes.')) {
      return;
    }

    try {
      const res = await fetch(`/api/time-capsule/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RELEASE' })
      });

      if (res.ok) {
        await loadData();
      }
    } catch {
      alert('Error al liberar cápsulas');
    }
  }

  const getStatusBadge = (campaign: Campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const closeDate = new Date(campaign.closeDate);

    if (campaign.isReleased) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
          <CheckCircle className="w-3 h-3" />
          Liberado
        </span>
      );
    }

    if (!campaign.isActive) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
          <Pause className="w-3 h-3" />
          Inactivo
        </span>
      );
    }

    if (now < startDate) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
          <Clock className="w-3 h-3" />
          Próximo
        </span>
      );
    }

    if (now >= startDate && now <= closeDate) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse">
          <Play className="w-3 h-3" />
          Recibiendo
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
        <Lock className="w-3 h-3" />
        Cerrado
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-amber-300">Cargando Time Capsule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-600/20 rounded-2xl">
                <Archive className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Quantum Time Capsule</h1>
                <p className="text-gray-400">Gestiona los buzones de mensajes para visiones</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Campaña
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Grid de campañas */}
        {campaigns.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-400 mb-2">
              No hay campañas de Time Capsule
            </h2>
            <p className="text-gray-500 mb-6">
              Crea tu primera campaña para que familiares y amigos envíen mensajes a los participantes
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors"
            >
              Crear Primera Campaña
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const now = new Date();
              const closeDate = new Date(campaign.closeDate);
              const canRelease = now > closeDate && !campaign.isReleased;

              return (
                <div
                  key={campaign.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all group"
                >
                  {/* Header con estado */}
                  <div className="p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(campaign)}
                      <span className="text-xs text-gray-400">
                        ID: {campaign.id}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">
                      {campaign.Vision.nombre}
                    </p>

                    {campaign.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(campaign.startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          {' - '}
                          {new Date(campaign.closeDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>{campaign._count.Messages} mensajes recibidos</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Slug:</span>
                        <code className="bg-gray-700/50 px-2 py-0.5 rounded text-amber-400">
                          /buzon/{campaign.slug}
                        </code>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/time-capsule/${campaign.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>

                      {canRelease && (
                        <button
                          onClick={() => handleReleaseCampaign(campaign.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          <Unlock className="w-4 h-4" />
                          Liberar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal crear campaña */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Nueva Campaña Time Capsule</h2>
                <p className="text-gray-400 text-sm">Crea un buzón para recibir mensajes</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Visión */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Visión *
                  </label>
                  <select
                    value={newCampaign.visionId}
                    onChange={(e) => {
                      const vision = visiones.find(v => v.id === parseInt(e.target.value));
                      setNewCampaign(prev => ({
                        ...prev,
                        visionId: e.target.value,
                        name: vision ? `Buzón ${vision.nombre}` : '',
                        slug: vision ? vision.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : ''
                      }));
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                  >
                    <option value="">Selecciona una visión</option>
                    {visiones.map(vision => (
                      <option key={vision.id} value={vision.id}>
                        {vision.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nombre de la campaña *
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Buzón Vision 25"
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Slug (URL) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">/buzon/</span>
                    <input
                      type="text"
                      value={newCampaign.slug}
                      onChange={(e) => setNewCampaign(prev => ({ 
                        ...prev, 
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                      }))}
                      placeholder="vision-25"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mensaje para los familiares..."
                    rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white resize-none"
                  />
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Fecha inicio *
                    </label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Fecha cierre *
                    </label>
                    <input
                      type="date"
                      value={newCampaign.closeDate}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, closeDate: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Configuración */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Días notificación
                    </label>
                    <input
                      type="number"
                      value={newCampaign.notifyDaysBefore}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, notifyDaysBefore: parseInt(e.target.value) || 5 }))}
                      min={1}
                      max={30}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Puntos por mensaje
                    </label>
                    <input
                      type="number"
                      value={newCampaign.pointsPerMessage}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, pointsPerMessage: parseInt(e.target.value) || 100 }))}
                      min={0}
                      step={50}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={creating || !newCampaign.visionId || !newCampaign.name || !newCampaign.slug || !newCampaign.startDate || !newCampaign.closeDate}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Crear Campaña
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
