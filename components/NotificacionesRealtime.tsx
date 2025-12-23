// components/NotificacionesRealtime.tsx
'use client';

import { useState, useCallback } from 'react';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';
import { Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Notificacion {
  id: string;
  tipo: 'success' | 'error' | 'info';
  titulo: string;
  mensaje: string;
  timestamp: Date;
}

export default function NotificacionesRealtime() {
  const { data: session } = useSession();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [mostrarPanel, setMostrarPanel] = useState(false);
  const { isConnected } = useSocket(session?.user?.id?.toString());

  // Escuchar evidencia aprobada
  useSocketEvent('evidencia_aprobada', useCallback((data: any) => {
    const nuevaNotif: Notificacion = {
      id: Date.now().toString(),
      tipo: 'success',
      titulo: '✅ Evidencia Aprobada',
      mensaje: data.mensaje || 'Tu evidencia fue aprobada por tu mentor',
      timestamp: new Date()
    };
    setNotificaciones(prev => [nuevaNotif, ...prev].slice(0, 10));
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== nuevaNotif.id));
    }, 5000);
  }, []));

  // Escuchar evidencia rechazada
  useSocketEvent('evidencia_rechazada', useCallback((data: any) => {
    const nuevaNotif: Notificacion = {
      id: Date.now().toString(),
      tipo: 'error',
      titulo: '❌ Evidencia Rechazada',
      mensaje: data.mensaje || 'Tu evidencia necesita correcciones',
      timestamp: new Date()
    };
    setNotificaciones(prev => [nuevaNotif, ...prev].slice(0, 10));
    
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== nuevaNotif.id));
    }, 5000);
  }, []));

  // Escuchar nueva tarea (para estudiantes)
  useSocketEvent('nueva_tarea', useCallback((data: any) => {
    const nuevaNotif: Notificacion = {
      id: Date.now().toString(),
      tipo: 'info',
      titulo: '📋 Nueva Tarea',
      mensaje: data.mensaje || 'Tienes una nueva tarea asignada',
      timestamp: new Date()
    };
    setNotificaciones(prev => [nuevaNotif, ...prev].slice(0, 10));
    
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== nuevaNotif.id));
    }, 5000);
  }, []));

  // Para mentores: nueva evidencia
  useSocketEvent('nueva_evidencia', useCallback((data: any) => {
    const nuevaNotif: Notificacion = {
      id: Date.now().toString(),
      tipo: 'info',
      titulo: '📸 Nueva Evidencia',
      mensaje: `${data.estudianteNombre} subió una evidencia`,
      timestamp: new Date()
    };
    setNotificaciones(prev => [nuevaNotif, ...prev].slice(0, 10));
    
    setTimeout(() => {
      setNotificaciones(prev => prev.filter(n => n.id !== nuevaNotif.id));
    }, 5000);
  }, []));

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-400" />;
    }
  };

  if (!session?.user) return null;

  return (
    <>
      {/* Botón de notificaciones */}
      <button
        onClick={() => setMostrarPanel(!mostrarPanel)}
        className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-400" />
        {notificaciones.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {notificaciones.length}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {mostrarPanel && (
        <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-white">Notificaciones</h3>
            {isConnected && (
              <span className="text-xs text-green-400">● En vivo</span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No hay notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notif.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white mb-1">
                        {notif.titulo}
                      </p>
                      <p className="text-xs text-slate-400">
                        {notif.mensaje}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {notif.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast notifications (notificaciones flotantes) */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notificaciones.slice(0, 3).map((notif) => (
          <div
            key={notif.id}
            className={`bg-slate-900 border rounded-lg shadow-xl p-4 w-80 animate-slideInRight ${
              notif.tipo === 'success' ? 'border-green-500/30' :
              notif.tipo === 'error' ? 'border-red-500/30' :
              'border-blue-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {getIcon(notif.tipo)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white mb-1">
                  {notif.titulo}
                </p>
                <p className="text-xs text-slate-400">
                  {notif.mensaje}
                </p>
              </div>
              <button
                onClick={() => setNotificaciones(prev => prev.filter(n => n.id !== notif.id))}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
