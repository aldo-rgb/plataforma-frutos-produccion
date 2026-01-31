'use client';

import { useState, useEffect } from 'react';
import { Crown, Vote, X, ArrowRight, Shield, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CaptaincyNotification {
  id: number;
  type: 'CAPTAINCY_NOMINATION';
  title: string;
  message: string;
  roleType: string;
  visionId: number;
  visionName: string;
  assignmentId: number;
  createdAt: string;
}

interface PendingPoll {
  id: number;
  type: 'PENDING_VOTE';
  title: string;
  message: string;
  category: string;
  visionId: number;
  visionName: string;
  optionsCount: number;
  votesCount: number;
  endDate: string | null;
  createdAt: string;
}

// Mapeo de roleType a nombres amigables
const roleNames: Record<string, string> = {
  'CONTRIBUTION_BASIC': 'Capitán de Contribución Básicos',
  'CONTRIBUTION_ADVANCED': 'Capitán de Contribución Avanzados',
  'DISCIPLINE': 'Capitán de Disciplina',
  'COMMUNITY_SERVICE': 'Capitán de Comunitaria',
  'IDENTITY': 'Capitán de Identidad',
  'LOGISTICS': 'Capitán de Logística'
};

// Mapeo de categorías de votación
const pollCategoryNames: Record<string, string> = {
  'LOGO': 'Logo de la Tribu',
  'PLAYERA': 'Diseño de Playera',
  'COMUNITARIA': 'Proyecto Comunitario',
  'GENERAL': 'Votación General'
};

export default function TribeNotificationsWidget() {
  const [captaincyNotifications, setCaptaincyNotifications] = useState<CaptaincyNotification[]>([]);
  const [pendingPolls, setPendingPolls] = useState<PendingPoll[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/tribe');
      if (!response.ok) return;
      
      const data = await response.json();
      
      if (data.success) {
        setCaptaincyNotifications(data.captaincyNotifications || []);
        setPendingPolls(data.pendingPolls || []);
      }
    } catch (error) {
      console.error('Error al obtener notificaciones de tribu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissCaptaincyNotification = async (id: number) => {
    setDismissedIds(prev => new Set(prev).add(`captaincy-${id}`));
    
    // Marcar como leída en el backend
    try {
      await fetch('/api/notifications/tribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  const dismissPoll = (id: number) => {
    // Solo dismiss local (no marcar como leída porque aún debe votar)
    setDismissedIds(prev => new Set(prev).add(`poll-${id}`));
  };

  // Filtrar notificaciones dismisseadas
  const visibleCaptaincyNotifications = captaincyNotifications.filter(
    notif => !dismissedIds.has(`captaincy-${notif.id}`)
  );

  const visiblePendingPolls = pendingPolls.filter(
    poll => !dismissedIds.has(`poll-${poll.id}`)
  );

  if (isLoading || (visibleCaptaincyNotifications.length === 0 && visiblePendingPolls.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Notificaciones de Capitanías */}
      {visibleCaptaincyNotifications.map((notification) => (
        <div
          key={`captaincy-${notification.id}`}
          className="border-2 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/50"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse bg-amber-500/20">
                <Crown className="text-amber-400" size={24} />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-amber-300">
                <Sparkles size={18} />
                {notification.title}
              </h3>
              <p className="text-amber-100/80 text-sm mb-1">
                {notification.message}
              </p>
              <p className="text-amber-200/60 text-xs flex items-center gap-1">
                <Shield size={12} />
                {notification.visionName}
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/dashboard/legacy-vision-builder"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold rounded-lg transition-all text-sm"
                >
                  <ArrowRight size={16} />
                  Ver Detalles
                </Link>
              </div>
            </div>
            
            <button
              onClick={() => dismissCaptaincyNotification(notification.id)}
              className="flex-shrink-0 p-1 hover:bg-amber-500/20 rounded-full transition-colors"
              aria-label="Cerrar notificación"
            >
              <X size={20} className="text-amber-400/60" />
            </button>
          </div>
        </div>
      ))}

      {/* Votaciones Pendientes */}
      {visiblePendingPolls.map((poll) => (
        <div
          key={`poll-${poll.id}`}
          className="border-2 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500/50"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse bg-purple-500/20">
                <Vote className="text-purple-400" size={24} />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-purple-300">
                <Sparkles size={18} />
                {poll.title}
              </h3>
              <p className="text-purple-100/80 text-sm mb-1">
                {poll.message}
              </p>
              <div className="flex items-center gap-3 text-xs text-purple-200/60">
                <span className="flex items-center gap-1">
                  <Shield size={12} />
                  {poll.visionName}
                </span>
                <span className="px-2 py-0.5 bg-purple-500/20 rounded-full">
                  {pollCategoryNames[poll.category] || poll.category}
                </span>
                {poll.endDate && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Clock size={12} />
                    Termina: {new Date(poll.endDate).toLocaleDateString('es-MX', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                )}
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/dashboard/legacy-forge"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all text-sm"
                >
                  <Vote size={16} />
                  Votar Ahora
                </Link>
                <span className="text-xs text-purple-300/60">
                  {poll.optionsCount} opciones • {poll.votesCount} votos
                </span>
              </div>
            </div>
            
            <button
              onClick={() => dismissPoll(poll.id)}
              className="flex-shrink-0 p-1 hover:bg-purple-500/20 rounded-full transition-colors"
              aria-label="Cerrar notificación"
            >
              <X size={20} className="text-purple-400/60" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
