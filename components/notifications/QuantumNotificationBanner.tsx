'use client';

import { useEffect, useState } from 'react';
import { Zap, X } from 'lucide-react';
import Link from 'next/link';

interface NotificacionQuantum {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  metadata: {
    tareasCount: number;
    tareasIds: number[];
    diasPromedioRetraso: number;
  };
  createdAt: string;
}

export function QuantumNotificationBanner() {
  const [notificacion, setNotificacion] = useState<NotificacionQuantum | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchNotificacion();
  }, []);

  const fetchNotificacion = async () => {
    try {
      const res = await fetch('/api/notificaciones/quantum');
      if (!res.ok) {
        console.error('Error al cargar notificación:', res.status);
        return;
      }
      const data = await res.json();
      if (data.notificacion && !dismissed) {
        setNotificacion(data.notificacion);
        setVisible(true);
      }
    } catch (error) {
      console.error('Error fetching notificación:', error);
      // No mostrar error al usuario, simplemente no mostrar banner
    }
  };

  const marcarLeida = async () => {
    if (!notificacion) return;
    
    try {
      await fetch(`/api/notificaciones/${notificacion.id}/read`, {
        method: 'POST'
      });
      setVisible(false);
      setDismissed(true);
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  };

  if (!visible || !notificacion) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-2xl p-4 max-w-md border-2 border-amber-300">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Zap className="text-white" size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold mb-1">{notificacion.titulo}</h3>
            <p className="text-amber-50 text-sm mb-3">
              {notificacion.mensaje}
            </p>
            
            <div className="flex gap-2">
              <Link
                href="/dashboard/quantum-detector"
                className="bg-white text-amber-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-all"
                onClick={marcarLeida}
              >
                Desbloquear Ahora
              </Link>
              
              <button
                onClick={marcarLeida}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-amber-700 transition-all"
              >
                Más Tarde
              </button>
            </div>
          </div>
          
          <button
            onClick={marcarLeida}
            className="text-white hover:text-amber-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
