// lib/socket.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocketIO = async (httpServer: HTTPServer) => {
  if (io) {
    console.log('Socket.IO ya está inicializado');
    return io;
  }

  console.log('🔌 Inicializando Socket.IO (modo standalone)...');

  // Inicializar Socket.IO sin Redis (para desarrollo)
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
  });

  // Manejar conexiones
  io.on('connection', (socket) => {
    console.log(`🔗 Usuario conectado: ${socket.id}`);

    // Unirse a sala personal (para notificaciones privadas)
    socket.on('join_user_room', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`👤 Usuario ${userId} se unió a su sala personal`);
    });

    // Unirse a sala de mentor (para ver estudiantes)
    socket.on('join_mentor_room', (mentorId: string) => {
      socket.join(`mentor:${mentorId}`);
      console.log(`👨‍🏫 Mentor ${mentorId} se unió a su sala`);
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`❌ Usuario desconectado: ${socket.id}`);
    });
  });

  console.log('✅ Socket.IO inicializado correctamente');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado');
  }
  return io;
};

// Funciones de utilidad para emitir eventos
export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToMentor = (mentorId: string, event: string, data: any) => {
  if (io) {
    io.to(`mentor:${mentorId}`).emit(event, data);
  }
};

export const emitGlobal = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};
