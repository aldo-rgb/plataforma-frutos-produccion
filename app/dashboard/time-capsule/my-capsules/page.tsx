'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  MailOpen, 
  Heart, 
  Play, 
  Pause, 
  Volume2,
  Clock,
  Star,
  Loader2,
  X,
  ChevronLeft
} from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';

interface CapsuleMessage {
  id: number;
  senderName: string;
  senderRelation: string | null;
  textContent: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  isRead: boolean;
  isFavorite: boolean;
  createdAt: string;
  sender: {
    id: number;
    nombre: string;
    imagen: string | null;
  } | null;
}

interface CapsuleCampaign {
  id: number;
  name: string;
  description: string;
  releaseDate: string;
  messages: CapsuleMessage[];
  totalMessages: number;
  unreadCount: number;
}

export default function MyCapsules() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CapsuleCampaign[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<CapsuleMessage | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchCapsules();
  }, []);

  async function fetchCapsules() {
    try {
      const res = await fetch('/api/time-capsule/my-capsules');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error fetching capsules:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(messageId: number) {
    try {
      await fetch('/api/time-capsule/my-capsules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action: 'READ' })
      });
      
      // Actualizar estado local
      setCampaigns(prev => prev.map(campaign => ({
        ...campaign,
        messages: campaign.messages.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ),
        unreadCount: campaign.messages.filter(
          msg => msg.id !== messageId && !msg.isRead
        ).length
      })));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }

  async function toggleFavorite(messageId: number) {
    try {
      const res = await fetch('/api/time-capsule/my-capsules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action: 'FAVORITE' })
      });
      
      const data = await res.json();
      
      // Actualizar estado local
      setCampaigns(prev => prev.map(campaign => ({
        ...campaign,
        messages: campaign.messages.map(msg => 
          msg.id === messageId ? { ...msg, isFavorite: data.isFavorite } : msg
        )
      })));

      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, isFavorite: data.isFavorite } : null);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  }

  function openMessage(message: CapsuleMessage) {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsRead(message.id);
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  const totalMessages = campaigns.reduce((acc, c) => acc + c.totalMessages, 0);
  const totalUnread = campaigns.reduce((acc, c) => acc + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <Mail className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Tu Cápsula del Tiempo está vacía
          </h2>
          <p className="text-gray-400">
            Aún no tienes mensajes desbloqueados. ¡Pronto recibirás cartas de empoderamiento!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🎁 Tu Quantum Time Capsule
        </h1>
        <div className="flex items-center gap-4 text-purple-300">
          <span className="flex items-center gap-1">
            <Mail className="w-4 h-4" />
            {totalMessages} mensaje{totalMessages !== 1 ? 's' : ''}
          </span>
          {totalUnread > 0 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4" />
              {totalUnread} sin leer
            </span>
          )}
        </div>
      </header>

      {/* Campañas y mensajes */}
      <div className="max-w-4xl mx-auto space-y-8">
        {campaigns.map((campaign) => (
          <section key={campaign.id}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold text-white">{campaign.name}</h2>
              {campaign.unreadCount > 0 && (
                <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-medium">
                  {campaign.unreadCount} nuevo{campaign.unreadCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Grid de sobres */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {campaign.messages.map((message, index) => (
                <motion.button
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openMessage(message)}
                  className={`relative p-4 rounded-xl transition-all hover:scale-105 ${
                    message.isRead
                      ? 'bg-white/5 border border-white/10'
                      : 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/50 animate-pulse'
                  }`}
                >
                  {/* Icono de sobre */}
                  <div className="flex justify-center mb-3">
                    {message.isRead ? (
                      <MailOpen className="w-10 h-10 text-gray-400" />
                    ) : (
                      <Mail className="w-10 h-10 text-purple-300" />
                    )}
                  </div>

                  {/* Remitente */}
                  <p className="text-white text-sm font-medium truncate">
                    {message.senderName}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {message.senderRelation || 'Alguien especial'}
                  </p>

                  {/* Indicadores */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {message.audioUrl && (
                      <Volume2 className="w-3 h-3 text-purple-400" />
                    )}
                    {message.isFavorite && (
                      <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
                    )}
                  </div>

                  {/* Badge nuevo */}
                  {!message.isRead && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" />
                  )}
                </motion.button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Modal de mensaje */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setSelectedMessage(null);
              setIsPlaying(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del mensaje */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {selectedMessage.sender?.imagen ? (
                      <Image
                        src={selectedMessage.sender.imagen}
                        alt={selectedMessage.senderName}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-purple-600/50 rounded-full flex items-center justify-center text-white text-lg font-medium">
                        {selectedMessage.senderName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-medium">
                        {selectedMessage.senderName}
                      </h3>
                      <p className="text-purple-300 text-sm">
                        {selectedMessage.senderRelation || 'Alguien especial'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(selectedMessage.id)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Heart 
                        className={`w-5 h-5 ${
                          selectedMessage.isFavorite 
                            ? 'text-pink-400 fill-pink-400' 
                            : 'text-gray-400'
                        }`} 
                      />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMessage(null);
                        setIsPlaying(false);
                      }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenido del mensaje */}
              <div className="p-6 space-y-4">
                {/* Texto */}
                {selectedMessage.textContent && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.textContent}
                    </p>
                  </div>
                )}

                {/* Audio */}
                {selectedMessage.audioUrl && (
                  <div className="bg-purple-600/20 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={toggleAudio}
                        className="w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="h-8 bg-white/10 rounded-lg flex items-center px-3">
                          {/* Visualización simple */}
                          <div className="flex items-end gap-0.5 h-4">
                            {[...Array(30)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 bg-purple-400 rounded-sm transition-all ${
                                  isPlaying ? 'animate-pulse' : ''
                                }`}
                                style={{ 
                                  height: `${Math.random() * 100}%`,
                                  animationDelay: `${i * 50}ms`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        {selectedMessage.audioDuration && (
                          <p className="text-purple-300 text-xs mt-1">
                            Duración: {Math.floor(selectedMessage.audioDuration / 60)}:
                            {(selectedMessage.audioDuration % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <audio
                      ref={audioRef}
                      src={selectedMessage.audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Fecha */}
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Clock className="w-4 h-4" />
                  Recibido el {new Date(selectedMessage.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
