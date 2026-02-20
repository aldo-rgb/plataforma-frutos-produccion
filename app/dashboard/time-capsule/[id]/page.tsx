'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  MessageSquare,
  User,
  Play,
  Pause,
  Unlock,
  Lock,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Volume2,
  FileText,
  Heart,
  Eye,
  Copy,
  ExternalLink,
  Settings,
  Trash2
} from 'lucide-react';

interface CapsuleMessage {
  id: number;
  senderName: string;
  senderRelation: string;
  messageType: string;
  textContent: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  isUnlocked: boolean;
  isRead: boolean;
  isFavorite: boolean;
  createdAt: string;
  Recipient: {
    id: number;
    nombre: string;
    imagen: string | null;
  };
}

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
  notifyDaysBefore: number;
  pointsPerMessage: number;
  Vision: {
    id: number;
    nombre: string;
  };
  Messages: CapsuleMessage[];
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRecipient, setFilterRecipient] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  async function loadCampaign() {
    try {
      const res = await fetch(`/api/time-capsule/campaigns/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setCampaign(data.campaign);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease() {
    if (!confirm('¿Estás seguro de liberar las cápsulas? Los participantes podrán ver sus mensajes inmediatamente.')) {
      return;
    }

    try {
      const res = await fetch(`/api/time-capsule/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RELEASE' })
      });

      if (res.ok) {
        await loadCampaign();
      }
    } catch {
      alert('Error al liberar cápsulas');
    }
  }

  async function handleToggleActive() {
    try {
      const res = await fetch(`/api/time-capsule/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_ACTIVE' })
      });

      if (res.ok) {
        await loadCampaign();
      }
    } catch {
      alert('Error al cambiar estado');
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar esta campaña? Se perderán todos los mensajes.')) {
      return;
    }

    try {
      const res = await fetch(`/api/time-capsule/campaigns/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        router.push('/dashboard/time-capsule');
      }
    } catch {
      alert('Error al eliminar');
    }
  }

  function copyPublicLink() {
    if (!campaign) return;
    const url = `${window.location.origin}/buzon/${campaign.slug}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado al portapapeles');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-amber-300">Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300">{error || 'Campaña no encontrada'}</p>
          <Link
            href="/dashboard/time-capsule"
            className="mt-4 inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const closeDate = new Date(campaign.closeDate);
  const canRelease = now > closeDate && !campaign.isReleased;

  // Obtener lista de destinatarios únicos
  const uniqueRecipients = Array.from(
    new Map(campaign.Messages.map(m => [m.Recipient.id, m.Recipient])).values()
  );

  // Filtrar mensajes
  const filteredMessages = campaign.Messages.filter(msg => {
    const matchesSearch = 
      msg.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.Recipient.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.textContent?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRecipient = !filterRecipient || msg.Recipient.id === parseInt(filterRecipient);

    return matchesSearch && matchesRecipient;
  });

  // Agrupar por destinatario
  const messagesByRecipient = filteredMessages.reduce((acc, msg) => {
    const recipientId = msg.Recipient.id;
    if (!acc[recipientId]) {
      acc[recipientId] = {
        recipient: msg.Recipient,
        messages: []
      };
    }
    acc[recipientId].messages.push(msg);
    return acc;
  }, {} as Record<number, { recipient: CapsuleMessage['Recipient']; messages: CapsuleMessage[] }>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/dashboard/time-capsule"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a campañas
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-600/20 rounded-2xl">
                <Archive className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{campaign.name}</h1>
                <p className="text-gray-400">{campaign.Vision.nombre}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(campaign.startDate).toLocaleDateString('es-MX')} - {new Date(campaign.closeDate).toLocaleDateString('es-MX')}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {campaign.Messages.length} mensajes
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Link público */}
              <button
                onClick={copyPublicLink}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
              >
                <Copy className="w-4 h-4" />
                Copiar Link
              </button>

              <a
                href={`/buzon/${campaign.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </a>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Liberar */}
              {canRelease && (
                <button
                  onClick={handleRelease}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold"
                >
                  <Unlock className="w-5 h-5" />
                  Liberar Cápsulas
                </button>
              )}

              {campaign.isReleased && (
                <span className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-xl">
                  <Unlock className="w-5 h-5" />
                  Liberado
                </span>
              )}
            </div>
          </div>

          {/* Panel de settings */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Estado de la campaña</p>
                  <p className="text-gray-400 text-sm">
                    {campaign.isActive ? 'Activa - recibiendo mensajes' : 'Inactiva - no recibe mensajes'}
                  </p>
                </div>
                <button
                  onClick={handleToggleActive}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    campaign.isActive
                      ? 'bg-gray-600 hover:bg-gray-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {campaign.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              <hr className="my-4 border-gray-700" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-400 font-medium">Zona de peligro</p>
                  <p className="text-gray-400 text-sm">Eliminar esta campaña permanentemente</p>
                </div>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500"
            />
          </div>

          <select
            value={filterRecipient}
            onChange={(e) => setFilterRecipient(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-white"
          >
            <option value="">Todos los participantes</option>
            {uniqueRecipients.map(r => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Mensajes agrupados por destinatario */}
        {Object.keys(messagesByRecipient).length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-400 mb-2">
              No hay mensajes aún
            </h2>
            <p className="text-gray-500">
              Comparte el link público para que familiares y amigos envíen mensajes
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(messagesByRecipient).map(({ recipient, messages }) => (
              <div key={recipient.id} className="bg-gray-800/30 border border-gray-700/50 rounded-2xl overflow-hidden">
                {/* Header del participante */}
                <div className="p-4 bg-gray-800/50 border-b border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{recipient.nombre}</p>
                      <p className="text-gray-400 text-sm">{messages.length} mensaje(s)</p>
                    </div>
                  </div>
                </div>

                {/* Lista de mensajes */}
                <div className="divide-y divide-gray-700/30">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-4 hover:bg-gray-800/30">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          msg.messageType === 'AUDIO' 
                            ? 'bg-purple-600/20' 
                            : msg.messageType === 'BOTH'
                            ? 'bg-cyan-600/20'
                            : 'bg-blue-600/20'
                        }`}>
                          {msg.messageType === 'AUDIO' ? (
                            <Volume2 className="w-5 h-5 text-purple-400" />
                          ) : msg.messageType === 'BOTH' ? (
                            <MessageSquare className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{msg.senderName}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-amber-400 text-sm">{msg.senderRelation}</span>
                          </div>

                          {msg.textContent && (
                            <p className="text-gray-300 text-sm line-clamp-2 mb-2">
                              {msg.textContent}
                            </p>
                          )}

                          {msg.audioUrl && (
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (playingAudioId === msg.id) {
                                    // Pausar
                                    audioRef.current?.pause();
                                    setPlayingAudioId(null);
                                  } else {
                                    // Detener el anterior si existe
                                    if (audioRef.current) {
                                      audioRef.current.pause();
                                    }
                                    // Crear nuevo audio y reproducir
                                    const audio = new Audio(msg.audioUrl!);
                                    audioRef.current = audio;
                                    audio.onended = () => setPlayingAudioId(null);
                                    audio.play();
                                    setPlayingAudioId(msg.id);
                                  }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors text-sm text-purple-300"
                              >
                                {playingAudioId === msg.id ? (
                                  <>
                                    <Pause className="w-4 h-4" />
                                    Pausar
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4" />
                                    Reproducir
                                  </>
                                )}
                              </button>
                              <span className="text-xs text-gray-500">
                                {msg.audioDuration ? `${Math.floor(msg.audioDuration / 60)}:${(msg.audioDuration % 60).toString().padStart(2, '0')}` : ''}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>
                              {new Date(msg.createdAt).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {msg.isRead && (
                              <span className="flex items-center gap-1 text-green-400">
                                <Eye className="w-3 h-3" />
                                Leído
                              </span>
                            )}
                            {msg.isFavorite && (
                              <span className="flex items-center gap-1 text-pink-400">
                                <Heart className="w-3 h-3 fill-current" />
                                Favorito
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
