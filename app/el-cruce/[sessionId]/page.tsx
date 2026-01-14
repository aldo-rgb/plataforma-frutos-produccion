"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { io, Socket } from "socket.io-client"
import { Users, Crown, Volume2, VolumeX, Medal, Award } from "lucide-react"

interface Participant {
  id: number
  name: string
  image?: string | null
  status?: string
}

interface CrossingStats {
  crossedCount: number
  totalParticipants: number
  remainingCount: number
  percentageCrossed: number
}

// Electrón desorientado (lado izquierdo - no han decidido)
const DisorientedElectron = ({ participant, index }: { participant: Participant; index: number }) => {
  // Usar useMemo no está disponible aquí, así que generamos valores únicos por índice
  const seed = index * 1000
  const random = (n: number) => ((seed + n) * 9301 + 49297) % 233280 / 233280
  
  // Generar trayectoria que cubra TODA la mitad izquierda de la pantalla
  const pathPoints = [
    { x: `${5 + random(1) * 40}vw`, y: `${10 + random(2) * 80}vh` },
    { x: `${5 + random(3) * 40}vw`, y: `${10 + random(4) * 80}vh` },
    { x: `${5 + random(5) * 40}vw`, y: `${10 + random(6) * 80}vh` },
    { x: `${5 + random(7) * 40}vw`, y: `${10 + random(8) * 80}vh` },
    { x: `${5 + random(9) * 40}vw`, y: `${10 + random(10) * 80}vh` },
  ]
  
  const duration = 12 + random(11) * 8 // 12-20 segundos
  const delay = index * 0.5
  
  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{ left: pathPoints[0].x, top: pathPoints[0].y }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        left: pathPoints.map(p => p.x),
        top: pathPoints.map(p => p.y),
        opacity: [0.7, 1, 0.8, 1, 0.7],
        rotate: [0, 20, -15, 25, -20, 0],
        scale: [1, 1.1, 0.95, 1.05, 1]
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Círculo con foto */}
      <motion.div
        className="relative"
        animate={{
          scale: [1, 1.2, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      >
        {/* Aura de indecisión pulsante */}
        <motion.div 
          className="absolute -inset-4 bg-slate-400/30 rounded-full blur-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.4, 1]
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border-2 border-slate-500/50 shadow-2xl relative overflow-hidden">
          {participant.image ? (
            <img 
              src={participant.image} 
              alt={participant.name}
              className="w-full h-full rounded-full object-cover grayscale opacity-70"
            />
          ) : (
            <span className="text-2xl font-bold text-slate-400">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </motion.div>
      
      {/* Nombre */}
      <motion.p 
        className="text-sm text-slate-400 mt-2 font-bold text-center max-w-[100px] truncate drop-shadow-lg"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {participant.name.split(' ')[0]}
      </motion.p>
    </motion.div>
  )
}

// Átomo - participantes que cruzaron orbitando juntos
const AtomNucleus = ({ participants }: { participants: Participant[] }) => {
  if (participants.length === 0) return null

  // Calcular posiciones en órbitas concéntricas
  const getOrbitPosition = (index: number, total: number) => {
    const orbitsCount = Math.ceil(total / 8)
    const orbit = Math.floor(index / 8)
    const positionInOrbit = index % 8
    const particlesInOrbit = Math.min(8, total - orbit * 8)
    const angle = (positionInOrbit / particlesInOrbit) * 2 * Math.PI
    const radius = 90 + orbit * 75
    
    return { radius, angle, orbit }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Núcleo central brillante */}
      <motion.div
        className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500"
        animate={{
          scale: [1, 1.15, 1],
          boxShadow: [
            "0 0 40px rgba(251, 191, 36, 0.6)",
            "0 0 80px rgba(251, 191, 36, 0.9)",
            "0 0 40px rgba(251, 191, 36, 0.6)"
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Crown className="w-12 h-12 text-white drop-shadow-lg" />
        </div>
      </motion.div>

      {/* Órbitas visuales */}
      {[1, 2, 3, 4].map((orbit) => (
        <motion.div
          key={orbit}
          className="absolute rounded-full border border-amber-500/30"
          style={{
            width: 180 + orbit * 150,
            height: 180 + orbit * 150,
          }}
          animate={{ rotate: orbit % 2 === 0 ? 360 : -360 }}
          transition={{
            duration: 30 + orbit * 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}

      {/* Participantes orbitando */}
      {participants.map((participant, index) => {
        const { radius, angle, orbit } = getOrbitPosition(index, participants.length)
        const orbitDuration = 20 + orbit * 8
        const initialRotation = (angle / (2 * Math.PI)) * 360
        
        return (
          <motion.div
            key={participant.id}
            className="absolute"
            style={{
              width: radius * 2,
              height: radius * 2,
            }}
            animate={{
              rotate: [initialRotation, initialRotation + 360]
            }}
            transition={{
              duration: orbitDuration,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <motion.div
              className="absolute flex flex-col items-center"
              style={{
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)'
              }}
              animate={{ rotate: [-initialRotation, -initialRotation - 360] }}
              transition={{
                duration: orbitDuration,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {/* Foto con medalla */}
              <div className="relative">
                {/* Brillo */}
                <motion.div
                  className="absolute -inset-2 bg-amber-400/40 rounded-full blur-md"
                  animate={{
                    opacity: [0.4, 0.7, 0.4],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center border-2 border-amber-200 shadow-lg shadow-amber-500/50 relative overflow-hidden">
                  {participant.image ? (
                    <img 
                      src={participant.image} 
                      alt={participant.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Medalla de valentía */}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center border-2 border-yellow-300 shadow-md"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Medal className="w-3 h-3 text-white" />
                </motion.div>
              </div>
              
              {/* Nombre */}
              <p className="text-[11px] text-amber-300 mt-1 font-bold text-center max-w-[70px] truncate drop-shadow-lg">
                {participant.name.split(' ')[0]}
              </p>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}

// Animación de cruce
const CrossingAnimation = ({ 
  participant, 
  onComplete 
}: { 
  participant: Participant
  onComplete: () => void 
}) => {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none left-0 top-0"
      initial={{ x: '25vw', y: '50vh', scale: 1 }}
      animate={{ 
        x: ['25vw', '50vw', '75vw'],
        y: ['50vh', '35vh', '50vh'],
        scale: [1, 2.5, 1.5]
      }}
      transition={{ 
        duration: 2, 
        ease: "easeInOut",
        times: [0, 0.5, 1]
      }}
      onAnimationComplete={onComplete}
    >
      {/* Estela de energía */}
      <motion.div
        className="absolute -inset-16 bg-gradient-to-r from-amber-500/0 via-amber-400/60 to-amber-500/0 blur-3xl"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2 }}
      />
      
      {/* Círculo brillante */}
      <motion.div
        className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 shadow-2xl shadow-amber-500/50 flex items-center justify-center relative"
        animate={{
          boxShadow: [
            "0 0 40px rgba(251, 191, 36, 0.5)",
            "0 0 100px rgba(251, 191, 36, 0.9)",
            "0 0 50px rgba(251, 191, 36, 0.5)"
          ]
        }}
        transition={{ duration: 0.5, repeat: 4 }}
      >
        {participant.image ? (
          <img 
            src={participant.image} 
            alt={participant.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-white"
          />
        ) : (
          <span className="text-5xl font-black text-white">
            {participant.name.charAt(0).toUpperCase()}
          </span>
        )}
        
        {/* Corona apareciendo */}
        <motion.div
          className="absolute -top-6 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: 10, scale: 0 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Crown className="w-10 h-10 text-yellow-300 drop-shadow-lg" />
        </motion.div>
      </motion.div>
      
      {/* Nombre grande */}
      <motion.div
        className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
        transition={{ duration: 2 }}
      >
        <span className="text-3xl font-black text-amber-300 drop-shadow-lg uppercase tracking-wide">
          ¡{participant.name}!
        </span>
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
  const [sessionData, setSessionData] = useState<any>(null)
  const [stats, setStats] = useState<CrossingStats>({
    crossedCount: 0,
    totalParticipants: 0,
    remainingCount: 0,
    percentageCrossed: 0
  })
  const [crossedParticipants, setCrossedParticipants] = useState<Participant[]>([])
  const [waitingParticipants, setWaitingParticipants] = useState<Participant[]>([])
  const [crossingParticipant, setCrossingParticipant] = useState<Participant | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [masterOrgStats, setMasterOrgStats] = useState<{
    masterOrg: { id: number; name: string; logoUrl?: string } | null;
    totalBasicGraduates: number;
    totalAdvancedGraduates: number;
    totalPLGraduates: number;
  } | null>(null)
  
  // Refs para audio
  const crossingSound = useRef<HTMLAudioElement | null>(null)
  const ambientSound = useRef<HTMLAudioElement | null>(null)
  const lastCrossedCount = useRef(0)
  const prevCrossedIds = useRef<Set<number>>(new Set())

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

  // Cargar datos de sesión y participantes
  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return
    try {
      // Agregar timestamp para evitar cache del navegador
      const res = await fetch(`/api/el-cruce/session?sessionId=${sessionId}&t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      
      if (data.session) {
        const session = data.session
        setSessionStatus(session.status)
        setSessionData(session)
        
        const crossed = data.participants?.crossed || []
        const waiting = data.participants?.waiting || []
        
        const totalCount = crossed.length + waiting.length
        const crossedCount = crossed.length
        
        const newStats = {
          crossedCount,
          totalParticipants: totalCount || session.totalParticipants || 0,
          remainingCount: waiting.length,
          percentageCrossed: totalCount > 0 
            ? Math.round((crossedCount / totalCount) * 100)
            : 0
        }
        
        // Detectar nuevo cruce
        const currentCrossedIds = new Set(crossed.map((p: Participant) => p.id))
        const newCrossed = crossed.find((p: Participant) => !prevCrossedIds.current.has(p.id))
        
        if (newCrossed && prevCrossedIds.current.size > 0) {
          playCrossingSound()
          setCrossingParticipant(newCrossed)
        }
        
        prevCrossedIds.current = currentCrossedIds
        lastCrossedCount.current = crossedCount
        
        setStats(newStats)
        setCrossedParticipants(crossed)
        setWaitingParticipants(waiting)
        
        // Guardar estadísticas de master org
        if (data.masterOrgStats) {
          setMasterOrgStats(data.masterOrgStats)
        }
      }
    } catch (err) {
      console.error("Error fetching session:", err)
    }
  }, [sessionId, playCrossingSound])

  // Polling cada 1 segundo para actualización más rápida
  useEffect(() => {
    fetchSessionData()
    const interval = setInterval(fetchSessionData, 1000)
    return () => clearInterval(interval)
  }, [fetchSessionData])

  // Conectar Socket.IO (como respaldo)
  useEffect(() => {
    if (!sessionId) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"]
    })

    newSocket.on("connect", () => {
      setConnected(true)
      newSocket.emit("join_crossing_display", sessionId)
    })

    newSocket.on("disconnect", () => {
      setConnected(false)
    })

    newSocket.on("participant_crossed", (data) => {
      playCrossingSound()
      setCrossingParticipant({
        id: data.participantId,
        name: data.participantName,
        image: data.participantImage
      })
      // Inmediatamente actualizar datos cuando alguien cruza
      fetchSessionData()
    })

    // Escuchar actualizaciones de stats también
    newSocket.on("crossing_stats", () => {
      fetchSessionData()
    })

    setSocket(newSocket)
    return () => { newSocket.disconnect() }
  }, [sessionId, playCrossingSound, fetchSessionData])

  // Cuando termina la animación de cruce
  const handleCrossingComplete = useCallback(() => {
    setCrossingParticipant(null)
  }, [])

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

  // Habilitar audio con click
  const enableAudio = () => {
    if (ambientSound.current && soundEnabled) {
      ambientSound.current.play().catch(() => {})
    }
  }

  // Obtener logo de organización
  const orgLogo = sessionData?.product?.Organization?.logoUrl
  const orgName = sessionData?.product?.Organization?.name

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative"
      onClick={enableAudio}
    >
      {/* Partículas de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-slate-600/40"
            style={{ 
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3
            }}
          />
        ))}
      </div>

      {/* Línea divisoria central con gradiente */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent" />
      
      {/* Título lado izquierdo */}
      <div className="absolute top-6 left-6 z-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Users className="w-7 h-7 text-slate-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-500">RAZONABLES</h2>
            <p className="text-slate-600 text-xs">{waitingParticipants.length} participantes</p>
          </div>
        </motion.div>
      </div>

      {/* Título lado derecho */}
      <div className="absolute top-6 right-6 text-right z-20">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 justify-end"
        >
          <div>
            <h2 className="text-xl font-bold text-amber-400">IRRAZONABLES</h2>
            <p className="text-amber-500/60 text-xs">{crossedParticipants.length} eligieron avanzar</p>
          </div>
          <Award className="w-7 h-7 text-amber-400" />
        </motion.div>
      </div>

      {/* ZONA IZQUIERDA: Electrones desorientados */}
      <div className="absolute left-0 top-0 bottom-0 w-1/2 overflow-hidden">
        {waitingParticipants.slice(0, 30).map((participant, i) => (
          <DisorientedElectron 
            key={participant.id} 
            participant={participant} 
            index={i}
          />
        ))}
      </div>

      {/* ZONA DERECHA: Átomo con participantes orbitando */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center">
        <div className="w-full h-full" style={{ maxWidth: '600px', maxHeight: '700px' }}>
          <AtomNucleus participants={crossedParticipants} />
        </div>
      </div>

      {/* Logo central - arriba del contador */}
      {orgLogo && (
        <motion.div
          className="absolute top-[15%] left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.img
            src={orgLogo}
            alt={orgName || "Logo"}
            className="h-36 w-auto mx-auto object-contain"
            style={{ imageRendering: 'auto' }}
            animate={{
              filter: [
                "drop-shadow(0 0 30px rgba(251,191,36,0.3))",
                "drop-shadow(0 0 50px rgba(251,191,36,0.5))",
                "drop-shadow(0 0 30px rgba(251,191,36,0.3))"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* Contador central */}
      <motion.div
        className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-30 pointer-events-none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Contador grande */}
        <motion.div
          className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-yellow-400 to-orange-500 drop-shadow-2xl"
          style={{ WebkitTextStroke: '1px rgba(251,191,36,0.3)' }}
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
        <div className="w-64 h-3 bg-slate-800/80 rounded-full mt-4 overflow-hidden mx-auto backdrop-blur">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentageCrossed}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-lg text-slate-500 mt-2">{stats.percentageCrossed}%</p>
      </motion.div>

      {/* Animación de cruce */}
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
            className="fixed inset-0 bg-amber-400/30 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Controles */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3 z-20">
        <button
          onClick={toggleSound}
          className={`p-2 rounded-full transition-colors ${
            soundEnabled 
              ? "bg-amber-500/20 text-amber-400" 
              : "bg-slate-800 text-slate-500"
          }`}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
          connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
          <span>{connected ? "Conectado" : "Desconectado"}</span>
        </div>
      </div>

      {/* Status de sesión */}
      <div className="absolute bottom-6 right-6 z-20">
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

      {/* Estadísticas de Master Organización */}
      {masterOrgStats && (
        <motion.div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-6 bg-slate-900/80 backdrop-blur-sm rounded-2xl px-6 py-3 border border-slate-700/50">
            {/* Básico */}
            <div className="text-center">
              <motion.div 
                className="text-2xl font-black text-blue-400"
                key={masterOrgStats.totalBasicGraduates}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {masterOrgStats.totalBasicGraduates.toLocaleString()}
              </motion.div>
              <p className="text-[10px] text-blue-400/60 uppercase tracking-wider font-semibold">Básico</p>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            {/* Avanzado */}
            <div className="text-center">
              <motion.div 
                className="text-2xl font-black text-amber-400"
                key={masterOrgStats.totalAdvancedGraduates}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {masterOrgStats.totalAdvancedGraduates.toLocaleString()}
              </motion.div>
              <p className="text-[10px] text-amber-400/60 uppercase tracking-wider font-semibold">Avanzado</p>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            {/* Liderato */}
            <div className="text-center">
              <motion.div 
                className="text-2xl font-black text-purple-400"
                key={masterOrgStats.totalPLGraduates}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {masterOrgStats.totalPLGraduates.toLocaleString()}
              </motion.div>
              <p className="text-[10px] text-purple-400/60 uppercase tracking-wider font-semibold">Liderato</p>
            </div>
          </div>
          
          {/* Nombre de la Master Org */}
          <p className="text-center text-[10px] text-slate-500 mt-1 uppercase tracking-widest">
            {masterOrgStats.masterOrg?.name || 'Red de Organizaciones'}
          </p>
        </motion.div>
      )}
    </div>
  )
}
