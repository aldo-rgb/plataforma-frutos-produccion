'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  AlertTriangle, 
  Clock, 
  Send, 
  ChevronRight, 
  X,
  Star,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface PendingRecipient {
  id: number;
  nombre: string;
  imagen: string | null;
  level: number;
}

interface CampaignWithPending {
  campaignId: number;
  campaignName: string;
  closeDate: string;
  daysRemaining: number;
  pointsPerMessage: number;
  pendingRecipients: PendingRecipient[];
}

interface WidgetProps {
  className?: string;
  onClose?: () => void;
}

export default function CapsuleMissionWidget({ className = '', onClose }: WidgetProps) {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignWithPending[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/time-capsule/messages');
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        }
      } catch (err) {
        console.error('Error fetching pending messages:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, []);

  // No mostrar si no hay campañas pendientes
  const totalPending = campaigns.reduce(
    (acc, c) => acc + c.pendingRecipients.length, 
    0
  );

  if (loading) {
    return null; // No mostrar mientras carga
  }

  if (totalPending === 0 || !visible) {
    return null;
  }

  // Encontrar la campaña más urgente (menos días restantes)
  const mostUrgent = campaigns.reduce(
    (a, b) => (a.daysRemaining < b.daysRemaining ? a : b),
    campaigns[0]
  );

  const isUrgent = mostUrgent.daysRemaining <= 5;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative ${className}`}
      >
        {/* Banner principal */}
        <div
          className={`rounded-2xl overflow-hidden ${
            isUrgent
              ? 'bg-gradient-to-r from-red-600 to-orange-600'
              : 'bg-gradient-to-r from-purple-600 to-pink-600'
          }`}
        >
          {/* Botón cerrar */}
          {onClose && (
            <button
              onClick={() => {
                setVisible(false);
                onClose();
              }}
              className="absolute top-2 right-2 p-1 bg-black/20 rounded-full hover:bg-black/40 transition-colors z-10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Header del widget */}
          <div 
            className="p-4 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isUrgent ? 'bg-red-500/30' : 'bg-white/20'}`}>
                {isUrgent ? (
                  <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
                ) : (
                  <Gift className="w-6 h-6 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">
                    {isUrgent ? '⚠️ ACCIÓN REQUERIDA' : '🎁 Quantum Time Capsule'}
                  </h3>
                  {totalPending > 0 && (
                    <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs text-white font-medium">
                      {totalPending} pendiente{totalPending > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm">
                  {isUrgent 
                    ? `¡Solo quedan ${mostUrgent.daysRemaining} días! Envía mensajes a tu equipo.`
                    : 'Envía mensajes de empoderamiento a tu equipo'
                  }
                </p>
              </div>

              <ChevronRight 
                className={`w-5 h-5 text-white/70 transition-transform ${expanded ? 'rotate-90' : ''}`} 
              />
            </div>

            {/* Puntos disponibles */}
            <div className="mt-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-white/90 text-sm">
                Gana hasta <strong>{totalPending * (mostUrgent?.pointsPerMessage || 100)} puntos</strong> enviando mensajes
              </span>
            </div>
          </div>

          {/* Lista expandida */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.campaignId}
                      className="bg-black/20 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-sm">
                          {campaign.campaignName}
                        </span>
                        <div className="flex items-center gap-1 text-white/70 text-xs">
                          <Clock className="w-3 h-3" />
                          {campaign.daysRemaining} días
                        </div>
                      </div>

                      {/* Lista de personas pendientes */}
                      <div className="space-y-2">
                        {campaign.pendingRecipients.slice(0, 3).map((person) => (
                          <Link
                            key={person.id}
                            href={`/dashboard/time-capsule/send?recipient=${person.id}&campaign=${campaign.campaignId}`}
                            className="flex items-center gap-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            {person.imagen ? (
                              <Image
                                src={person.imagen}
                                alt={person.nombre}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-purple-500/50 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {person.nombre.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <span className="text-white text-sm">{person.nombre}</span>
                              <span className="text-white/50 text-xs ml-2">
                                (Nivel {person.level})
                              </span>
                            </div>
                            <Send className="w-4 h-4 text-white/50" />
                          </Link>
                        ))}

                        {campaign.pendingRecipients.length > 3 && (
                          <Link
                            href={`/dashboard/time-capsule?campaign=${campaign.campaignId}`}
                            className="block text-center text-white/70 hover:text-white text-sm py-2"
                          >
                            Ver {campaign.pendingRecipients.length - 3} más...
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
