// lib/socket-client.ts
// Cliente Socket.IO para emitir eventos desde el servidor al socket externo
import { io, Socket } from "socket.io-client"

let socketClient: Socket | null = null
let isConnecting = false

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "wss://socket.quantummatter.app"

// Obtener o crear conexión al servidor socket externo
const getSocketClient = (): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socketClient?.connected) {
      return resolve(socketClient)
    }

    if (isConnecting) {
      // Esperar a que se conecte
      const checkConnection = setInterval(() => {
        if (socketClient?.connected) {
          clearInterval(checkConnection)
          resolve(socketClient)
        }
      }, 100)
      
      // Timeout después de 5 segundos
      setTimeout(() => {
        clearInterval(checkConnection)
        reject(new Error("Timeout conectando al socket"))
      }, 5000)
      return
    }

    isConnecting = true
    console.log(`🔌 Conectando al servidor socket: ${SOCKET_URL}`)

    socketClient = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000
    })

    socketClient.on("connect", () => {
      console.log(`✅ Conectado al servidor socket: ${socketClient?.id}`)
      isConnecting = false
      resolve(socketClient!)
    })

    socketClient.on("connect_error", (error) => {
      console.error(`❌ Error conectando al socket:`, error.message)
      isConnecting = false
      reject(error)
    })

    socketClient.on("disconnect", (reason) => {
      console.log(`🔌 Desconectado del socket: ${reason}`)
    })
  })
}

// =====================================================
// EL CRUCE - Funciones de emisión al servidor externo
// =====================================================

// Emitir cuando alguien cruza (para pantalla gigante)
export const emitCrossingToExternal = async (sessionId: string, data: {
  participantId: number
  participantName: string
  participantImage?: string | null
  crossedCount: number
  totalParticipants: number
  timestamp: number
}) => {
  try {
    const socket = await getSocketClient()
    
    // Unirse a la sala primero (por si acaso)
    socket.emit("join_crossing_session", sessionId)
    
    // Emitir el evento de cruce
    socket.emit("broadcast_crossing", {
      sessionId,
      event: "participant_crossed",
      data
    })
    
    console.log(`🌟 CRUCE emitido: ${data.participantName} en sesión ${sessionId}`)
    return true
  } catch (error) {
    console.error("Error emitiendo cruce:", error)
    return false
  }
}

// Emitir actualización de contadores
export const emitCrossingStatsToExternal = async (sessionId: string, data: {
  crossedCount: number
  totalParticipants: number
  remainingCount: number
  percentageCrossed: number
}) => {
  try {
    const socket = await getSocketClient()
    
    socket.emit("broadcast_crossing", {
      sessionId,
      event: "crossing_stats_update",
      data
    })
    
    return true
  } catch (error) {
    console.error("Error emitiendo stats:", error)
    return false
  }
}

// Emitir alerta de pre-registro al usuario
export const emitPreRegistrationAlertToExternal = async (userId: string, data: {
  preRegistrationId: string
  targetProductName: string
  promoPrice: number
  regularPrice: number
  promoDeadline: string
  countdown: number
}) => {
  try {
    const socket = await getSocketClient()
    
    socket.emit("broadcast_to_user", {
      userId,
      event: "pre_registration_alert",
      data
    })
    
    console.log(`🔔 Alerta de pre-registro emitida a usuario ${userId}`)
    return true
  } catch (error) {
    console.error("Error emitiendo alerta:", error)
    return false
  }
}
