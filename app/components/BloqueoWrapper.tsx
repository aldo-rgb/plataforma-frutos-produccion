'use client';

import { useEffect, useState } from 'react';
import BloqueoNotification from './BloqueoNotification';

interface EstadoBloqueo {
  estado: 'ACTIVO' | 'BLOQUEADO' | 'BLOQUEADO_DEFINITIVO';
  llamadasPerdidas: number;
  vidaExtraUsada: boolean;
  mensaje: string;
  mostrarContactoCoordinador: boolean;
  coordinador: {
    nombre: string;
    email: string;
    telefono: string;
  } | null;
  tareaPendiente: any;
}

interface BloqueoWrapperProps {
  children: React.ReactNode;
  rol: string;
}

export default function BloqueoWrapper({ children, rol }: BloqueoWrapperProps) {
  const [estadoBloqueo, setEstadoBloqueo] = useState<EstadoBloqueo | null>(null);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo verificar si es PARTICIPANTE o GAMECHANGER
    if (!['PARTICIPANTE', 'GAMECHANGER'].includes(rol)) {
      setLoading(false);
      return;
    }

    verificarEstado();
    
    // Verificar cada 30 segundos
    const interval = setInterval(verificarEstado, 30000);
    
    return () => clearInterval(interval);
  }, [rol]);

  const verificarEstado = async () => {
    try {
      const response = await fetch('/api/participante/status-bloqueo');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEstadoBloqueo(data);
          
          // Mostrar notificación si está bloqueado
          if (data.estado !== 'ACTIVO' && data.mostrarContactoCoordinador) {
            setMostrarNotificacion(true);
          }
        }
      }
    } catch (error) {
      console.error('Error verificando estado de bloqueo:', error);
    } finally {
      setLoading(false);
    }
  };

  const estaBlooqueado = estadoBloqueo && estadoBloqueo.estado !== 'ACTIVO';

  // Mostrar loading solo en la primera carga
  if (loading && ['PARTICIPANTE', 'GAMECHANGER'].includes(rol)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {/* Aplicar escala de grises si está bloqueado */}
      <div className={estaBlooqueado ? 'grayscale pointer-events-none' : ''}>
        {children}
      </div>

      {/* Overlay interactivo para mostrar notificación */}
      {estaBlooqueado && (
        <div 
          className="fixed inset-0 z-40 pointer-events-auto"
          style={{ isolation: 'isolate' }}
        >
          {/* Permitir interacción solo con la notificación */}
        </div>
      )}

      {/* Notificación de bloqueo */}
      {mostrarNotificacion && estadoBloqueo && estadoBloqueo.estado !== 'ACTIVO' && (
        <BloqueoNotification
          estado={estadoBloqueo.estado}
          llamadasPerdidas={estadoBloqueo.llamadasPerdidas}
          mensaje={estadoBloqueo.mensaje}
          coordinador={estadoBloqueo.coordinador}
          onClose={estadoBloqueo.estado === 'BLOQUEADO_DEFINITIVO' ? undefined : () => setMostrarNotificacion(false)}
        />
      )}

      {/* Banner fijo en la parte superior si está bloqueado */}
      {estaBlooqueado && !mostrarNotificacion && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4 shadow-lg cursor-pointer hover:bg-red-700 transition-colors pointer-events-auto"
          onClick={() => setMostrarNotificacion(true)}
          style={{ isolation: 'isolate' }}
        >
          <div className="flex items-center justify-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <span className="font-semibold">
              {estadoBloqueo?.estado === 'BLOQUEADO_DEFINITIVO' 
                ? '⛔ Cuenta bloqueada definitivamente - Click para más información' 
                : '⚠️ Cuenta suspendida - Click para recuperar acceso'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
