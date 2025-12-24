'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, X, UserCheck, Bell } from 'lucide-react';
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
      // Filtrar solo notificaciones importantes que deben mostrarse como banner
      const importantNotifications = data.notifications?.filter(
        (notif: Notification) => 
          notif.type === 'MENTOR_ASSIGNMENT' && !notif.isRead
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
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-2 border-amber-500/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 duration-500"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center animate-pulse">
                <UserCheck className="text-amber-400" size={24} />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
                <Bell size={20} />
                {notification.title}
              </h3>
              <p className="text-amber-200 text-sm mb-4 leading-relaxed">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-3">
                <Link 
                  href="/dashboard/program/enroll"
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg"
                >
                  <Calendar size={18} />
                  Reagendar Llamadas
                </Link>
                
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>

            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 text-amber-400 hover:text-amber-300 transition-colors"
              title="Cerrar notificación"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
