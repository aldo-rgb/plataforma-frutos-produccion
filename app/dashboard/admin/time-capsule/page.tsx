'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Clock, 
  Users, 
  MessageSquare, 
  Unlock,
  Loader2,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  Gift
} from 'lucide-react';
import Link from 'next/link';

interface Campaign {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  closeDate: string;
  releaseDate: string;
  isReleased: boolean;
  pointsPerMessage: number;
  vision: { id: number; nombre: string };
  _count: {
    messages: number;
  };
}

export default function TimeCapsuleAdminPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [releaseModalCampaign, setReleaseModalCampaign] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estado del formulario de creación
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visionId: '',
    closeDate: '',
    releaseDate: '',
    pointsPerMessage: 100
  });

  const [visions, setVisions] = useState<Array<{ id: number; nombre: string }>>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/time-capsule/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setVisions(data.visions || []);
      } else {
        setError('No tienes permisos para ver esta página');
      }
    } catch (err) {
      setError('Error al cargar campañas');
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    
    try {
      const res = await fetch('/api/time-capsule/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          visionId: parseInt(formData.visionId)
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setCampaigns(prev => [...prev, data.campaign]);
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          visionId: '',
          closeDate: '',
          releaseDate: '',
          pointsPerMessage: 100
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al crear campaña');
    } finally {
      setActionLoading(false);
    }
  }

  async function releaseCampaign(campaignId: number) {
    setActionLoading(true);
    
    try {
      const res = await fetch(`/api/time-capsule/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RELEASE' })
      });

      const data = await res.json();
      
      if (res.ok) {
        setCampaigns(prev => prev.map(c => 
          c.id === campaignId ? { ...c, isReleased: true } : c
        ));
        setReleaseModalCampaign(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al liberar cápsulas');
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteCampaign(campaignId: number) {
    if (!confirm('¿Estás seguro de eliminar esta campaña? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/time-capsule/campaigns/${campaignId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Error al eliminar campaña');
    }
  }

  function copyBuzonLink(slug: string) {
    const url = `${window.location.origin}/buzon/${slug}`;
    navigator.clipboard.writeText(url);
    alert('¡Link copiado al portapapeles!');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error && !campaigns.length) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Gift className="w-8 h-8 text-purple-400" />
              Cartas de Aprecio
            </h1>
            <p className="text-gray-400">
              Administra las campañas de cartas de empoderamiento
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Campaña
          </button>
        </div>
      </div>

      {/* Lista de campañas */}
      <div className="max-w-6xl mx-auto">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              No hay campañas creadas aún. ¡Crea la primera!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gray-900 border rounded-2xl overflow-hidden ${
                  campaign.isReleased 
                    ? 'border-green-500/30' 
                    : 'border-purple-500/30'
                }`}
              >
                {/* Status badge */}
                <div className={`px-4 py-2 ${
                  campaign.isReleased 
                    ? 'bg-green-600/20' 
                    : 'bg-purple-600/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      campaign.isReleased ? 'text-green-400' : 'text-purple-400'
                    }`}>
                      {campaign.isReleased ? '✅ Liberada' : '🔒 Activa'}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {campaign.vision.nombre}
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {campaign.name}
                  </h3>
                  {campaign.description && (
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 text-purple-400 mb-1" />
                      <p className="text-white font-medium">{campaign._count.messages}</p>
                      <p className="text-gray-400 text-xs">Mensajes</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <Calendar className="w-4 h-4 text-purple-400 mb-1" />
                      <p className="text-white font-medium text-sm">
                        {new Date(campaign.closeDate).toLocaleDateString('es-MX', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-gray-400 text-xs">Cierra</p>
                    </div>
                  </div>

                  {/* Link del buzón */}
                  <div className="flex items-center gap-2 mb-4 p-2 bg-gray-800 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={`/buzon/${campaign.slug}`}
                      className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
                    />
                    <button
                      onClick={() => copyBuzonLink(campaign.slug)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                    <Link
                      href={`/buzon/${campaign.slug}`}
                      target="_blank"
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </Link>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    {!campaign.isReleased && (
                      <>
                        <button
                          onClick={() => setReleaseModalCampaign(campaign)}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors"
                        >
                          <Unlock className="w-4 h-4" />
                          Liberar
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {campaign.isReleased && (
                      <div className="flex-1 flex items-center justify-center gap-2 bg-gray-800 text-gray-400 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        Entregada
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear campaña */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Nueva Campaña</h2>
              </div>

              <form onSubmit={createCampaign} className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Time Capsule PL3 - Oaxaca"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Descripción (opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Descripción para el buzón público"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Visión</label>
                  <select
                    required
                    value={formData.visionId}
                    onChange={(e) => setFormData({ ...formData, visionId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecciona una visión</option>
                    {visions.map((vision) => (
                      <option key={vision.id} value={vision.id}>
                        {vision.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Fecha de cierre</label>
                    <input
                      type="date"
                      required
                      value={formData.closeDate}
                      onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Fecha de liberación</label>
                    <input
                      type="date"
                      required
                      value={formData.releaseDate}
                      onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Puntos por mensaje (gamificación)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.pointsPerMessage}
                    onChange={(e) => setFormData({ ...formData, pointsPerMessage: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Crear
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal confirmar liberación */}
      <AnimatePresence>
        {releaseModalCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setReleaseModalCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Unlock className="w-8 h-8 text-green-400" />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  ¿Liberar Time Capsule?
                </h2>
                <p className="text-gray-400 mb-6">
                  Esto desbloqueará <strong className="text-white">{releaseModalCampaign._count.messages} mensajes</strong> para 
                  los participantes de <strong className="text-white">{releaseModalCampaign.name}</strong>.
                  <br /><br />
                  Esta acción no se puede deshacer.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setReleaseModalCampaign(null)}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => releaseCampaign(releaseModalCampaign.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="w-5 h-5" />
                        Liberar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-2">
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
