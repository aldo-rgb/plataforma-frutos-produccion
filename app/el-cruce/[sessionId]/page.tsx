"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { io, Socket } from "socket.io-client"
import { Sparkles, Users, Zap, Crown, Volume2, VolumeX } from "lucide-react"

interface CrossedParticipant {
  id: number
  name: string
  image?: string | null
  timestamp: number
}

interface CrossingStats {
  crossedCount: number
  totalParticipants: number
  remainingCount: number
  percentageCrossed: number
}

// Partículas flotantes de fondo
const FloatingParticle = ({ delay, side }: { delay: number; side: "left" | "right" }) => (
  <motion.div
    className={`absolute w-2 h-2 rounded-full ${
      side === "left" ? "bg-slate-500/30" : "bg-amber-400/50"
    }`}
    initial={{ 
      x: side === "left" ? Math.random() * 400 : 800 + Math.random() * 400,
      y: Math.random() * 800,
      scale: 0,
      opacity: 0
    }}
    animate={{
      y: [null, Math.random() * 800],
      scale: [0, 1, 0],
      opacity: [0, 0.6, 0]
    }}
    transition={{
      duration: 4 + Math.random() * 3,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
)

// Silueta de participante (lado izquierdo - no cruzado)
const WaitingParticle = ({ index, total }: { index: number; total: number }) => {
  const row = Math.floor(index / 10)
  const col = index % 10
  
  return (
    <motion.div
      className="absolute w-6 h-6 rounded-full bg-slate-600/40 border border-slate-500/20"
      style={{
        left: 50 + col * 35,
        top: 150 + row * 40
      }}
      animate={{
        opacity: [0.3, 0.5, 0.3],
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration: 2,
        delay: index * 0.05,
        repeat: Infinity
      }}
    />
  )
}

// Partícula que cruza (efecto principal)
const CrossingAnimation = ({ 
  participant, 
  onComplete 
}: { 
  participant: CrossedParticipant
  onComplete: () => void 
}) => {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      initial={{ x: 200, y: 400, scale: 1 }}
      animate={{ 
        x: [200, 600, 1100],
        y: [400, 300, 400],
        scale: [1, 2, 1.2]
      }}
      transition={{ 
        duration: 1.5, 
        ease: "easeInOut",
        times: [0, 0.5, 1]
      }}
      onAnimationComplete={onComplete}
    >
      {/* Estela de energía */}
      <motion.div
        className="absolute -inset-8 bg-gradient-to-r from-amber-500/0 via-amber-400/50 to-amber-500/0 blur-xl"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.5 }}
      />
      
      {/* Círculo brillante */}
      <motion.div
        className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 shadow-2xl shadow-amber-500/50 flex items-center justify-center"
        animate={{
          boxShadow: [
            "0 0 20px rgba(251, 191, 36, 0.5)",
            "0 0 60px rgba(251, 191, 36, 0.8)",
            "0 0 30px rgba(251, 191, 36, 0.5)"
          ]
        }}
        transition={{ duration: 0.5, repeat: 3 }}
      >
        {participant.image ? (
          <img 
            src={participant.image} 
            alt={participant.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white"
          />
        ) : (
          <span className="text-2xl font-bold text-white">
            {participant.name.charAt(0)}
          </span>
        )}
      </motion.div>
      
      {/* Nombre */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
        transition={{ duration: 1.5 }}
      >
        <span className="text-lg font-bold text-amber-300 drop-shadow-lg">
          {participant.name}
        </span>
      </motion.div>
    </motion.div>
  )
}

// Partícula del lado derecho (ya cruzó)
const CrossedParticle = ({ participant, index }: { participant: CrossedParticipant; index: number }) => {
  const row = Math.floor(index / 8)
  const col = index % 8
  
  return (
    <motion.div
      className="absolute"
      style={{
        right: 100 + col * 45,
        top: 150 + row * 50
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.1
      }}
    >
      <motion.div
        className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
        animate={{
          boxShadow: [
            "0 0 10px rgba(251, 191, 36, 0.3)",
            "0 0 20px rgba(251, 191, 36, 0.5)",
            "0 0 10px rgba(251, 191, 36, 0.3)"
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {participant.image ? (
          <img 
            src={participant.image} 
            alt={participant.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-white">
            {participant.name.charAt(0)}
          </span>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function ElCrucePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params?.sessionId as string || searchParams?.get("session") || ""
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<string>("WAITING")
  const [stats, setStats] = useState<CrossingStats>({
    crossedCount: 0,
    totalParticipants: 50, // Default, se actualiza con datos reales
    remainingCount: 50,
    percentageCrossed: 0
  })
  const [crossedParticipants, setCrossedParticipants] = useState<CrossedParticipant[]>([])
  const [crossingParticipant, setCrossingParticipant] = useState<CrossedParticipant | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  // Refs para audio
  const crossingSound = useRef<HTMLAudioElement | null>(null)
  const ambientSound = useRef<HTMLAudioElement | null>(null)

  // Inicializar sonidos
  useEffect(() => {
    if (typeof window !== "undefined") {
      crossingSound.current = new Audio("/sounds/crossing-boom.mp3")
      crossingSound.current.volume = 0.8
      
      ambientSound.current = new Audio("/sounds/ambient-epic.mp3")
      ambientSound.current.loop = true
      ambientSound.current.volume = 0.3
    }
  }, [])

  // Reproducir sonido de cruce
  const playCrossingSound = useCallback(() => {
    if (soundEnabled && crossingSound.current) {
      crossingSound.current.currentTime = 0
      crossingSound.current.play().catch(() => {})
    }
  }, [soundEnabled])

  // Conectar Socket.IO
  useEffect(() => {
    if (!sessionId) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"]
    })

    newSocket.on("connect", () => {
      console.log("🔗 Pantalla conectada")
      setConnected(true)
      newSocket.emit("join_crossing_display", sessionId)
    })

    newSocket.on("disconnect", () => {
      console.log("❌ Desconectado")
      setConnected(false)
    })

    // Evento principal: alguien cruzó
    newSocket.on("participant_crossed", (data) => {
      console.log("🌟 CRUCE!", data)
      
      // Reproducir sonido
      playCrossingSound()
      
      // Mostrar animación de cruce
      setCrossingParticipant({
        id: data.participantId,
        name: data.participantName,
        image: data.participantImage,
        timestamp: data.timestamp
      })
    })

    // Actualización de stats
    newSocket.on("crossing_stats_update", (data: CrossingStats) => {
      setStats(data)
    })

    // Cambio de estado de sesión
    newSocket.on("crossing_session_status", (data) => {
      setSessionStatus(data.status)
      if (data.status === "ACTIVE" && ambientSound.current && soundEnabled) {
        ambientSound.current.play().catch(() => {})
      }
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [sessionId, playCrossingSound, soundEnabled])

  // Cuando termina la animación de cruce
  const handleCrossingComplete = useCallback(() => {
    if (crossingParticipant) {
      setCrossedParticipants(prev => [...prev, crossingParticipant])
      setCrossingParticipant(null)
    }
  }, [crossingParticipant])

  // Toggle sonido
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled)
    if (ambientSound.current) {
      if (soundEnabled) {
        ambientSound.current.pause()
      } else {
        ambientSound.current.play().catch(() => {})
      }
    }
  }

  // Habilitar audio con click (requerido por navegadores)
  const enableAudio = () => {
    if (ambientSound.current && soundEnabled) {
      ambientSound.current.play().catch(() => {})
    }
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative"
      onClick={enableAudio}
    >
      {/* Partículas de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <FloatingParticle key={`left-${i}`} delay={i * 0.3} side="left" />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <FloatingParticle key={`right-${i}`} delay={i * 0.3} side="right" />
        ))}
      </div>

      {/* Línea divisoria central con gradiente */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent" />
      
      {/* Título lado izquierdo */}
      <div className="absolute top-8 left-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Users className="w-8 h-8 text-slate-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-500">EN ESPERA</h2>
            <p className="text-slate-600 text-sm">Participantes por decidir</p>
          </div>
        </motion.div>
      </div>

      {/* Título lado derecho */}
      <div className="absolute top-8 right-8 text-right">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 justify-end"
        >
          <div>
            <h2 className="text-2xl font-bold text-amber-400">AVANZADO</h2>
            <p className="text-amber-500/60 text-sm">Eligieron transformarse</p>
          </div>
          <Crown className="w-8 h-8 text-amber-400" />
        </motion.div>
      </div>

      {/* Contador central */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <motion.div
          className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-yellow-400 to-orange-500"
          animate={{
            textShadow: [
              "0 0 20px rgba(251, 191, 36, 0.5)",
              "0 0 40px rgba(251, 191, 36, 0.8)",
              "0 0 20px rgba(251, 191, 36, 0.5)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          key={stats.crossedCount}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={stats.crossedCount}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {stats.crossedCount}
            </motion.span>
          </AnimatePresence>
        </motion.div>
        <p className="text-xl text-amber-400/80 mt-2">
          de {stats.totalParticipants} han elegido
        </p>
        
        {/* Barra de progreso */}
        <div className="w-64 h-3 bg-slate-800 rounded-full mt-4 overflow-hidden mx-auto">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentageCrossed}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-lg text-slate-500 mt-2">{stats.percentageCrossed}%</p>
      </motion.div>

      {/* Siluetas lado izquierdo (esperando) */}
      <div className="absolute left-0 top-0 bottom-0 w-1/2">
        {Array.from({ length: stats.remainingCount }).map((_, i) => (
          <WaitingParticle key={`waiting-${i}`} index={i} total={stats.remainingCount} />
        ))}
      </div>

      {/* Participantes lado derecho (cruzaron) */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2">
        {crossedParticipants.map((p, i) => (
          <CrossedParticle key={p.id} participant={p} index={i} />
        ))}
      </div>

      {/* Animación de cruce activa */}
      <AnimatePresence>
        {crossingParticipant && (
          <CrossingAnimation
            participant={crossingParticipant}
            onComplete={handleCrossingComplete}
          />
        )}
      </AnimatePresence>

      {/* Flash de luz al cruzar */}
      <AnimatePresence>
        {crossingParticipant && (
          <motion.div
            className="fixed inset-0 bg-amber-400/20 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Controles */}
      <div className="absolute bottom-8 left-8 flex items-center gap-4">
        <button
          onClick={toggleSound}
          className={`p-3 rounded-full transition-colors ${
            soundEnabled 
              ? "bg-amber-500/20 text-amber-400" 
              : "bg-slate-800 text-slate-500"
          }`}
        >
          {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-sm">{connected ? "Conectado" : "Desconectado"}</span>
        </div>
      </div>

      {/* Status de sesión */}
      <div className="absolute bottom-8 right-8">
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          sessionStatus === "ACTIVE" 
            ? "bg-green-500/20 text-green-400 animate-pulse" 
            : sessionStatus === "WAITING"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-slate-700 text-slate-400"
        }`}>
          {sessionStatus === "ACTIVE" ? "🔴 EN VIVO" : 
           sessionStatus === "WAITING" ? "⏳ Esperando inicio" : 
           sessionStatus}
        </div>
      </div>

      {/* Instrucciones cuando está esperando */}
      {sessionStatus === "WAITING" && (
        <motion.div
          className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-slate-500 text-lg">
            Haz clic en cualquier parte para habilitar el audio
          </p>
          <p className="text-slate-600 text-sm mt-2">
            La sesión iniciará cuando el coordinador lo active
          </p>
        </motion.div>
      )}
    </div>
  )
}
