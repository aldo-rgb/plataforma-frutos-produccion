'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// TIPOS
// ==========================================

type TribePollCategory = 
  | 'LOGO' | 'SHIRT' | 'COMMUNITY' | 'FOOD' | 'GRADUATION' 
  | 'MUSIC' | 'RECOGNITION' | 'BAPTISM' | 'FAREWELL' | 'TRANSPORT' | 'GENERAL';

type PollStatus = 'PENDING' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';

interface PollOption {
  id: number;
  optionText: string;
  description?: string;
  imageUrl?: string;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
  voters: { id: number; nombre: string; photoUrl?: string }[];
}

interface Poll {
  id: number;
  title: string;
  description?: string;
  category: TribePollCategory;
  status: PollStatus;
  quorumPercentage: number;
  currentQuorum: number;
  quorumMet: boolean;
  totalVotes: number;
  totalEligible: number;
  startsAt?: string;
  endsAt?: string;
  options: PollOption[];
  userVote?: { optionId: number; votedAt: string };
  canVote: boolean;
  canManage: boolean;
}

interface ChatMessage {
  id: number;
  content: string;
  isEdited: boolean;
  isPinned: boolean;
  createdAt: string;
  user: {
    id: number;
    nombre: string;
    apellido?: string;
    photoUrl?: string;
  };
  replyTo?: {
    id: number;
    user: { id: number; nombre: string };
    content?: string;
  };
  reactions: {
    emoji: string;
    count: number;
    hasReacted: boolean;
  }[];
}

// ==========================================
// PROPS DEL COMPONENTE
// ==========================================

interface TribePollWidgetProps {
  userId: number;
  visionId: number;
  category: TribePollCategory;
  captainType?: string;
  onPollCreated?: (poll: Poll) => void;
  onVoteCast?: (pollId: number, optionId: number) => void;
  className?: string;
}

// ==========================================
// ICONOS Y HELPERS
// ==========================================

const categoryLabels: Record<TribePollCategory, string> = {
  LOGO: 'Logo de Tribu',
  SHIRT: 'Diseño de Playera',
  COMMUNITY: 'Servicio Comunitario',
  FOOD: 'Convivio/Comida',
  GRADUATION: 'Graduación',
  MUSIC: 'Música/Ambiente',
  RECOGNITION: 'Reconocimientos',
  BAPTISM: 'Bautizo',
  FAREWELL: 'Despedida',
  TRANSPORT: 'Transporte',
  GENERAL: 'General'
};

const categoryEmojis: Record<TribePollCategory, string> = {
  LOGO: '🎨',
  SHIRT: '👕',
  COMMUNITY: '🌍',
  FOOD: '🍕',
  GRADUATION: '🎓',
  MUSIC: '🎵',
  RECOGNITION: '🏆',
  BAPTISM: '💧',
  FAREWELL: '👋',
  TRANSPORT: '🚐',
  GENERAL: '📋'
};

const statusColors: Record<PollStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const statusLabels: Record<PollStatus, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'Votación Abierta',
  CLOSED: 'Finalizada',
  CANCELLED: 'Cancelada'
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function TribePollWidget({
  userId,
  visionId,
  category,
  captainType,
  onPollCreated,
  onVoteCast,
  className = ''
}: TribePollWidgetProps) {
  // Estados
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para crear encuesta
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  
  // Estados para chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Estados para acciones
  const [submitting, setSubmitting] = useState(false);
  const [userPermissions, setUserPermissions] = useState<{
    canCreate: boolean;
    canManage: boolean;
    isCaptain: boolean;
  }>({ canCreate: false, canManage: false, isCaptain: false });

  // ==========================================
  // FETCH DE DATOS
  // ==========================================

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        visionId: visionId.toString(),
        category,
        userId: userId.toString()
      });
      
      const res = await fetch(`/api/tribe-polls?${params}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setPolls(data.polls || []);
      setUserPermissions(data.userPermissions || { canCreate: false, canManage: false, isCaptain: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar encuestas');
    } finally {
      setLoading(false);
    }
  }, [userId, visionId, category]);

  const fetchPollDetails = useCallback(async (pollId: number) => {
    try {
      const params = new URLSearchParams({
        pollId: pollId.toString(),
        userId: userId.toString()
      });
      
      const res = await fetch(`/api/tribe-polls?${params}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setSelectedPoll(data.poll);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalles');
    }
  }, [userId]);

  const fetchChat = useCallback(async (pollId: number) => {
    try {
      const params = new URLSearchParams({
        pollId: pollId.toString(),
        userId: userId.toString()
      });
      
      const res = await fetch(`/api/tribe-polls/chat?${params}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setChatMessages(data.messages || []);
    } catch (err) {
      console.error('Error cargando chat:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  useEffect(() => {
    if (selectedPoll && showChat) {
      fetchChat(selectedPoll.id);
      const interval = setInterval(() => fetchChat(selectedPoll.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedPoll, showChat, fetchChat]);

  // ==========================================
  // ACCIONES
  // ==========================================

  const createPoll = async () => {
    if (!newPollTitle.trim() || newOptions.filter(o => o.trim()).length < 2) {
      setError('Se necesitan título y al menos 2 opciones');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_poll',
          userId,
          visionId,
          title: newPollTitle,
          description: newPollDescription,
          category,
          options: newOptions.filter(o => o.trim())
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreateForm(false);
      setNewPollTitle('');
      setNewPollDescription('');
      setNewOptions(['', '']);
      await fetchPolls();
      onPollCreated?.(data.poll);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear encuesta');
    } finally {
      setSubmitting(false);
    }
  };

  const castVote = async (optionId: number) => {
    if (!selectedPoll) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cast_vote',
          userId,
          pollId: selectedPoll.id,
          optionId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetchPollDetails(selectedPoll.id);
      onVoteCast?.(selectedPoll.id, optionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al votar');
    } finally {
      setSubmitting(false);
    }
  };

  const startVoting = async (pollId: number) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_voting',
          userId,
          pollId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetchPolls();
      if (selectedPoll?.id === pollId) {
        await fetchPollDetails(pollId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar votación');
    } finally {
      setSubmitting(false);
    }
  };

  const closePoll = async (pollId: number) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/tribe-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_poll',
          userId,
          pollId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetchPolls();
      if (selectedPoll?.id === pollId) {
        await fetchPollDetails(pollId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar votación');
    } finally {
      setSubmitting(false);
    }
  };

  const sendChatMessage = async () => {
    if (!selectedPoll || !chatMessage.trim()) return;

    try {
      const res = await fetch('/api/tribe-polls/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          userId,
          pollId: selectedPoll.id,
          content: chatMessage,
          replyToId: replyingTo?.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setChatMessage('');
      setReplyingTo(null);
      await fetchChat(selectedPoll.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    }
  };

  const addReaction = async (messageId: number, emoji: string) => {
    if (!selectedPoll) return;

    try {
      await fetch('/api/tribe-polls/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_reaction',
          userId,
          pollId: selectedPoll.id,
          messageId,
          emoji
        })
      });

      await fetchChat(selectedPoll.id);
    } catch (err) {
      console.error('Error agregando reacción:', err);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{categoryEmojis[category]}</span>
            <div>
              <h2 className="text-white font-bold text-lg">
                {categoryLabels[category]}
              </h2>
              <p className="text-white/70 text-sm">
                Sistema de Votaciones
              </p>
            </div>
          </div>
          
          {userPermissions.canCreate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Nueva Encuesta
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 m-4"
          >
            <div className="flex justify-between items-center">
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido Principal */}
      <div className="p-4">
        {/* Formulario de creación */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gray-50 rounded-lg"
            >
              <h3 className="font-semibold text-gray-800 mb-4">
                📋 Crear Nueva Encuesta
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={newPollTitle}
                    onChange={(e) => setNewPollTitle(e.target.value)}
                    placeholder="¿Qué quieres preguntar?"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={newPollDescription}
                    onChange={(e) => setNewPollDescription(e.target.value)}
                    placeholder="Agrega más contexto..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opciones
                  </label>
                  {newOptions.map((option, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[idx] = e.target.value;
                          setNewOptions(updated);
                        }}
                        placeholder={`Opción ${idx + 1}`}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      {newOptions.length > 2 && (
                        <button
                          onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))}
                          className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewOptions([...newOptions, ''])}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    + Agregar opción
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createPoll}
                    disabled={submitting}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '⏳ Creando...' : '✅ Crear Encuesta'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista de encuestas */}
        {!selectedPoll ? (
          <div className="space-y-3">
            {polls.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <span className="text-4xl mb-2 block">📊</span>
                <p>No hay encuestas activas</p>
                {userPermissions.canCreate && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    Crear primera encuesta
                  </button>
                )}
              </div>
            ) : (
              polls.map((poll) => (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border rounded-lg hover:border-purple-300 cursor-pointer transition-all"
                  onClick={() => {
                    setSelectedPoll(poll);
                    fetchPollDetails(poll.id);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{poll.title}</h3>
                      {poll.description && (
                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                          {poll.description}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[poll.status]}`}>
                      {statusLabels[poll.status]}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span>📊 {poll.totalVotes} votos</span>
                    <span>👥 {poll.currentQuorum}% quórum</span>
                    <span>📝 {poll.options?.length || 0} opciones</span>
                  </div>

                  {/* Barra de progreso de quórum */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          poll.quorumMet ? 'bg-green-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min(poll.currentQuorum, 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          // Vista detallada de encuesta
          <div>
            {/* Botón volver */}
            <button
              onClick={() => {
                setSelectedPoll(null);
                setShowChat(false);
              }}
              className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-800"
            >
              ← Volver a encuestas
            </button>

            {/* Detalles de la encuesta */}
            <div className="mb-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-800">{selectedPoll.title}</h3>
                <span className={`px-3 py-1 text-sm rounded-full ${statusColors[selectedPoll.status]}`}>
                  {statusLabels[selectedPoll.status]}
                </span>
              </div>
              
              {selectedPoll.description && (
                <p className="text-gray-600 mb-4">{selectedPoll.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedPoll.totalVotes}
                  </div>
                  <div className="text-xs text-gray-500">Votos</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className={`text-2xl font-bold ${
                    selectedPoll.quorumMet ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {selectedPoll.currentQuorum}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Quórum ({selectedPoll.quorumPercentage}% req.)
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-700">
                    {selectedPoll.totalEligible}
                  </div>
                  <div className="text-xs text-gray-500">Elegibles</div>
                </div>
              </div>

              {/* Opciones de votación */}
              <div className="space-y-3">
                {selectedPoll.options?.map((option) => (
                  <motion.div
                    key={option.id}
                    className={`relative p-4 border-2 rounded-xl transition-all ${
                      option.isWinner
                        ? 'border-green-500 bg-green-50'
                        : selectedPoll.userVote?.optionId === option.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {option.isWinner && <span>🏆</span>}
                          {selectedPoll.userVote?.optionId === option.id && (
                            <span className="text-purple-600">✓</span>
                          )}
                          <span className="font-medium">{option.optionText}</span>
                        </div>
                        {option.description && (
                          <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {option.percentage.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {option.voteCount} votos
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${option.percentage}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${
                          option.isWinner ? 'bg-green-500' : 'bg-purple-500'
                        }`}
                      />
                    </div>

                    {/* Botón votar */}
                    {selectedPoll.status === 'ACTIVE' &&
                     selectedPoll.canVote &&
                     !selectedPoll.userVote && (
                      <button
                        onClick={() => castVote(option.id)}
                        disabled={submitting}
                        className="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        {submitting ? '⏳ Votando...' : '🗳️ Votar'}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Ya votaste */}
              {selectedPoll.userVote && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg text-center text-purple-700">
                  ✅ Ya emitiste tu voto
                </div>
              )}

              {/* Acciones de administrador */}
              {selectedPoll.canManage && (
                <div className="mt-6 flex gap-3">
                  {selectedPoll.status === 'PENDING' && (
                    <button
                      onClick={() => startVoting(selectedPoll.id)}
                      disabled={submitting}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      🚀 Iniciar Votación
                    </button>
                  )}
                  {selectedPoll.status === 'ACTIVE' && (
                    <button
                      onClick={() => closePoll(selectedPoll.id)}
                      disabled={submitting}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      🏁 Cerrar Votación
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Toggle Chat */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span>💬</span>
              {showChat ? 'Ocultar Chat de Debate' : 'Ver Chat de Debate'}
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {chatMessages.length}
              </span>
            </button>

            {/* Chat de debate */}
            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 border rounded-lg overflow-hidden"
                >
                  {/* Mensajes */}
                  <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <span className="text-3xl">💭</span>
                        <p className="mt-2">Inicia el debate</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.user.id === userId
                              ? 'bg-purple-100 ml-8'
                              : 'bg-white mr-8'
                          } ${msg.isPinned ? 'border-2 border-yellow-400' : ''}`}
                        >
                          {msg.isPinned && (
                            <div className="text-xs text-yellow-600 mb-1">📌 Mensaje fijado</div>
                          )}
                          
                          {msg.replyTo && (
                            <div className="text-xs text-gray-500 mb-2 pl-2 border-l-2 border-gray-300">
                              Respondiendo a {msg.replyTo.user.nombre}
                            </div>
                          )}
                          
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm">
                              {msg.user.nombre.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {msg.user.nombre}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString()}
                                </span>
                                {msg.isEdited && (
                                  <span className="text-xs text-gray-400">(editado)</span>
                                )}
                              </div>
                              <p className="text-gray-700 text-sm mt-1">{msg.content}</p>
                              
                              {/* Reacciones */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {msg.reactions?.map((r, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => addReaction(msg.id, r.emoji)}
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      r.hasReacted
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  >
                                    {r.emoji} {r.count}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="text-xs text-gray-400 hover:text-gray-600 px-2"
                                >
                                  ↩️ Responder
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input de mensaje */}
                  <div className="p-3 border-t bg-white">
                    {replyingTo && (
                      <div className="mb-2 p-2 bg-gray-100 rounded flex justify-between items-center text-sm">
                        <span>Respondiendo a {replyingTo.user.nombre}</span>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                        placeholder="Escribe tu opinión..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatMessage.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
