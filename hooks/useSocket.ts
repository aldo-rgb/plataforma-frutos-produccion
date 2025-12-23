// hooks/useSocket.ts - Hook para usar Socket.IO en el cliente
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const useSocket = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState('N/A');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Crear conexión socket solo una vez
    if (!socket) {
      socket = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('✅ Conectado a Socket.IO');
        setIsConnected(true);
        setTransport(socket?.io.engine.transport.name || 'N/A');

        // Unirse a sala de usuario si está autenticado
        if (userId) {
          socket?.emit('join_user_room', userId);
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ Desconectado de Socket.IO');
        setIsConnected(false);
      });

      socket.io.engine.on('upgrade', (transport) => {
        setTransport(transport.name);
      });
    } else if (userId && isConnected) {
      // Si ya existe el socket y hay userId, unirse a la sala
      socket.emit('join_user_room', userId);
    }

    return () => {
      // NO cerrar el socket aquí para mantener la conexión persistente
    };
  }, [userId, isConnected]);

  return {
    socket,
    isConnected,
    transport,
  };
};

// Hook para escuchar eventos específicos
export const useSocketEvent = (event: string, handler: (data: any) => void) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on(event, handler);

      return () => {
        socket.off(event, handler);
      };
    }
  }, [socket, event, handler]);
};
