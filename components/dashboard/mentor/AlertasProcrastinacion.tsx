'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import Link from 'next/link';

interface MentorAlert {
  id: string;
  Usuario: {
    id: string;
    nombre: string;
  };
  TaskInstance: {
    id: string;
    postponeCount: number;
    Accion?: {
      texto: string;
      Meta: {
        categoria: string;
      };
    };
  };
  message: string;
  read: boolean;
  createdAt: string;
}

export default function AlertasProcrastinacion() {
  const [alerts, setAlerts] = useState<MentorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Cargar alertas no leídas
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/tasks/postpone?unreadOnly=true');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error cargando alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Marcar una alerta como leída
  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch('/api/tasks/postpone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      
      if (response.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (error) {
      console.error('Error marcando alerta como leída:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/tasks/postpone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      
      if (response.ok) {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  // Si no hay alertas, no mostrar nada
  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-slate-800 rounded w-2/3"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null; // No mostrar el widget si no hay alertas
  }

  const alertsToShow = showAll ? alerts : alerts.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-red-950/40 to-orange-950/40 border-2 border-red-600/60 rounded-xl p-5 shadow-2xl shadow-red-900/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-900/30 text-red-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-red-200 font-bold text-lg">
              ⚠️ Alertas de Procrastinación
            </h3>
            <p className="text-red-300/80 text-sm">
              {alerts.length} estudiante{alerts.length !== 1 ? 's' : ''} con 3+ reagendamientos
            </p>
          </div>
        </div>
        
        {alerts.length > 1 && (
          <button
            onClick={markAllAsRead}
            className="text-red-300 hover:text-red-100 text-xs font-semibold px-3 py-1 rounded-lg bg-red-900/20 hover:bg-red-900/40 transition-all border border-red-700/30"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {alertsToShow.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-900/50 border border-red-700/30 rounded-lg p-4 hover:bg-slate-900/70 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-200 font-bold text-sm">
                    {alert.Usuario.nombre}
                  </span>
                  <span className="px-2 py-0.5 bg-red-900/40 text-red-300 text-xs font-bold rounded">
                    {alert.TaskInstance.postponeCount}x reagendado
                  </span>
                </div>
                
                <p className="text-slate-300 text-sm leading-relaxed mb-2">
                  {alert.TaskInstance.Accion ? (
                    <>
                      <span className="font-semibold text-red-300">
                        {alert.TaskInstance.Accion.texto}
                      </span>
                      {' del área '}
                      <span className="font-semibold text-cyan-400">
                        {alert.TaskInstance.Accion.Meta.categoria}
                      </span>
                    </>
                  ) : (
                    alert.message
                  )}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <Link
                    href={`/dashboard/lideres/${alert.Usuario.id}`}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-900/20 hover:bg-purple-900/40 px-3 py-1.5 rounded-lg border border-purple-700/30 transition-all"
                  >
                    Ver Detalles del Participante →
                  </Link>
                  <p className="text-slate-500 text-xs">
                    {new Date(alert.createdAt).toLocaleString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => markAsRead(alert.id)}
                className="p-2 hover:bg-red-900/30 rounded-lg transition-colors text-red-400 hover:text-red-200"
                title="Marcar como leída"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 text-red-300 hover:text-red-100 text-sm font-semibold py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 transition-all"
        >
          {showAll ? 'Ver menos' : `Ver todas (${alerts.length})`}
        </button>
      )}
    </div>
  );
}
