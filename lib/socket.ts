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
    
    // =====================================================
    // EL CRUCE - Eventos Real-Time
    // =====================================================
    
    // Unirse a sala de sesión de "El Cruce" (pantalla gigante + staff)
    socket.on('join_crossing_session', (sessionId: string) => {
      socket.join(`crossing:${sessionId}`);
      console.log(`🌟 Socket ${socket.id} se unió a sesión El Cruce: ${sessionId}`);
    });
    
    // Staff se une como escaneador
    socket.on('join_crossing_staff', (data: { sessionId: string, staffId: string }) => {
      socket.join(`crossing:${data.sessionId}`);
      socket.join(`crossing_staff:${data.sessionId}`);
      console.log(`📱 Staff ${data.staffId} listo para escanear en sesión: ${data.sessionId}`);
    });
    
    // Pantalla gigante se une
    socket.on('join_crossing_display', (sessionId: string) => {
      socket.join(`crossing:${sessionId}`);
      socket.join(`crossing_display:${sessionId}`);
      console.log(`🖥️ Pantalla gigante conectada a sesión: ${sessionId}`);
    });
    
    // Salir de sesión
    socket.on('leave_crossing_session', (sessionId: string) => {
      socket.leave(`crossing:${sessionId}`);
      socket.leave(`crossing_staff:${sessionId}`);
      socket.leave(`crossing_display:${sessionId}`);
      console.log(`👋 Socket ${socket.id} salió de sesión El Cruce: ${sessionId}`);
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

// =====================================================
// EL CRUCE - Funciones de emisión específicas
// =====================================================

// Emitir cuando alguien cruza (para pantalla gigante)
export const emitCrossing = (sessionId: string, data: {
  participantId: number
  participantName: string
  participantImage?: string | null
  crossedCount: number
  totalParticipants: number
  timestamp: number
}) => {
  if (io) {
    // Evento principal a toda la sesión
    io.to(`crossing:${sessionId}`).emit('participant_crossed', data);
    console.log(`🌟 CRUCE: ${data.participantName} cruzó en sesión ${sessionId}`);
  }
};

// Emitir actualización de contadores
export const emitCrossingStats = (sessionId: string, data: {
  crossedCount: number
  totalParticipants: number
  remainingCount: number
  percentageCrossed: number
}) => {
  if (io) {
    io.to(`crossing:${sessionId}`).emit('crossing_stats_update', data);
  }
};

// Emitir cambio de estado de sesión
export const emitCrossingSessionStatus = (sessionId: string, status: string) => {
  if (io) {
    io.to(`crossing:${sessionId}`).emit('crossing_session_status', { status });
  }
};

// Emitir al dashboard del participante que fue escaneado
export const emitPreRegistrationAlert = (userId: string, data: {
  preRegistrationId: string
  targetProductName: string
  promoPrice: number
  regularPrice: number
  promoDeadline: string
  countdown: number // segundos restantes
}) => {
  if (io) {
    io.to(`user:${userId}`).emit('pre_registration_alert', data);
    console.log(`🔔 Alerta de pre-registro enviada a usuario ${userId}`);
  }
};
