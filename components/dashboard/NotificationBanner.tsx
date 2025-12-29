'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, X, UserCheck, Bell, Sparkles, User } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/unread');
      if (!response.ok) return;
      
      const data = await response.json();
      // Filtrar notificaciones importantes que deben mostrarse como banner
      const importantNotifications = data.notifications?.filter(
        (notif: Notification) => 
          (notif.type === 'MENTOR_ASSIGNMENT' || notif.type === 'AVATAR_RENEWAL_REMINDER') && !notif.isRead
      ) || [];
      
      setNotifications(importantNotifications);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNotification = async (id: number) => {
    setDismissedIds([...dismissedIds, id]);
    
    // Marcar como leída en el backend
    try {
      await fetch(`/api/notifications/${id}/mark-read`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const visibleNotifications = notifications.filter(
    notif => !dismissedIds.includes(notif.id)
  );

  if (isLoading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {visibleNotifications.map((notification) => {
        const isAvatarNotification = notification.type === 'AVATAR_RENEWAL_REMINDER';
        const isMentorNotification = notification.type === 'MENTOR_ASSIGNMENT';

        return (
          <div
            key={notification.id}
            className={`border-2 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500 ${
              isAvatarNotification
                ? 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-purple-500/50'
                : 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center animate-pulse ${
                  isAvatarNotification ? 'bg-purple-500/20' : 'bg-amber-500/20'
                }`}>
                  {isAvatarNotification ? (
                    <Sparkles className={isAvatarNotification ? 'text-purple-400' : 'text-amber-400'} size={24} />
                  ) : (
                    <UserCheck className="text-amber-400" size={24} />
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${
                  isAvatarNotification ? 'text-purple-300' : 'text-amber-300'
                }`}>
                  <Bell size={20} />
                  {notification.title}
                </h3>
                <p className={`text-sm mb-4 leading-relaxed ${
                  isAvatarNotification ? 'text-purple-200' : 'text-amber-200'
                }`}>
                  {notification.message}
                </p>
                
                <div className="flex items-center gap-3">
                  {isAvatarNotification ? (
                    <Link 
                      href="/dashboard/perfil-completo"
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      <User size={18} />
                      Ir a Mi Perfil
                    </Link>
                  ) : (
                    <Link 
                      href="/dashboard/program/enroll"
                      className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg"
                    >
                      <Calendar size={18} />
                      Reagendar Llamadas
                    </Link>
                  )}
                  
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className={`text-xs underline transition-colors ${
                      isAvatarNotification 
                        ? 'text-purple-400 hover:text-purple-300'
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    Entendido
                  </button>
                </div>
              </div>

              <button
                onClick={() => dismissNotification(notification.id)}
                className={`flex-shrink-0 transition-colors ${
                  isAvatarNotification
                    ? 'text-purple-400 hover:text-purple-300'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
                title="Cerrar notificación"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
