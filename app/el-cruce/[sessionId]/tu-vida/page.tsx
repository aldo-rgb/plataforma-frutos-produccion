"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { io, Socket } from "socket.io-client"
import { Users, Crown, Volume2, VolumeX, Sparkles, Star, Zap } from "lucide-react"

interface Participant {
  id: number
  name: string
  image?: string | null
  gender?: 'M' | 'F' | null
  saltoQuantico?: string // Meta principal del Wizard v2
  status?: string
}

interface CrossingStats {
  crossedCount: number
  totalParticipants: number
  remainingCount: number
  percentageCrossed: number
}

// ═══════════════════════════════════════════════════════════════
//                    LADO IZQUIERDO: LA SOMBRA
//              "El Mundo de la Probabilidad"
// ═══════════════════════════════════════════════════════════════

const ShadowAvatar = ({ participant, index }: { participant: Participant; index: number }) => {
  const seed = index * 1000
  const random = (n: number) => ((seed + n) * 9301 + 49297) % 233280 / 233280
  
  // Posición en el lado izquierdo (0-45% del ancho)
  const startX = 5 + random(1) * 35
  const startY = 15 + random(2) * 70
  
  // Movimiento lento y pesado (caminando en círculos - overthinking)
  const circleRadius = 2 + random(3) * 3
  
  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${startX}%`, top: `${startY}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        x: [0, circleRadius * 10, 0, -circleRadius * 10, 0],
        y: [0, -circleRadius * 5, circleRadius * 5, -circleRadius * 5, 0],
        opacity: 1,
        scale: 1,
      }}
      transition={{
        x: { duration: 15 + random(4) * 10, repeat: Infinity, ease: "easeInOut" },
        y: { duration: 12 + random(5) * 8, repeat: Infinity, ease: "easeInOut" },
        opacity: { duration: 1, delay: index * 0.3 },
        scale: { duration: 0.8, delay: index * 0.3 },
      }}
    >
      {/* Avatar cabizabajo */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -3, 0], // Ligero movimiento de respiración pesada
          rotate: [-5, 0, -5], // Cabeza agachada
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Aura de incertidumbre */}
        <motion.div 
          className="absolute -inset-6 bg-slate-600/20 rounded-full blur-2xl"
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* El avatar gris/translúcido */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-slate-600/30 shadow-2xl relative overflow-hidden">
          {participant.image ? (
            <img 
              src={participant.image} 
              alt={participant.name}
              className="w-full h-full rounded-full object-cover grayscale opacity-50 filter brightness-50"
            />
          ) : (
            <span className="text-3xl font-bold text-slate-500/70">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          )}
          
          {/* Overlay de tristeza */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/50 rounded-full" />
        </div>
      </motion.div>
      
      {/* Globo de pensamiento con la meta (carga mental) */}
      <motion.div
        className="absolute -top-16 left-1/2 -translate-x-1/2"
        animate={{
          y: [0, -3, 0],
          opacity: [0.6, 0.9, 0.6],
          scale: [0.95, 1.02, 0.95],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Burbuja de pensamiento temblorosa */}
        <motion.div
          className="relative bg-slate-800/90 border border-slate-600/50 rounded-2xl px-3 py-2 shadow-xl"
          animate={{
            borderColor: ["rgba(100,116,139,0.3)", "rgba(100,116,139,0.6)", "rgba(100,116,139,0.3)"],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-xs text-slate-400 font-medium max-w-[120px] text-center leading-tight italic">
            "{participant.saltoQuantico || 'Mi sueño...'}"
          </p>
          
          {/* Puntos de conexión del globo */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-2 h-2 bg-slate-700 rounded-full" />
            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full mt-0.5" />
          </div>
        </motion.div>
      </motion.div>
      
      {/* Nombre con efecto de peso */}
      <motion.p 
        className="text-sm text-slate-500 mt-3 font-medium text-center max-w-[100px] truncate"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        {participant.name.split(' ')[0]}
      </motion.p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
//                    LADO DERECHO: LA LUZ
//              "El Mundo de la Posibilidad"
// ═══════════════════════════════════════════════════════════════

const LightAvatar = ({ participant, index }: { participant: Participant; index: number }) => {
  const seed = (index + 100) * 1000
  const random = (n: number) => ((seed + n) * 9301 + 49297) % 233280 / 233280
  
  // Posición en el lado derecho (55-95% del ancho)
  const startX = 55 + random(1) * 35
  const startY = 15 + random(2) * 70
  
  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${startX}%`, top: `${startY}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: index * 0.2 }}
    >
      {/* Avatar brillante en pose de poder */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -8, 0], // Saltando de alegría
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Aura dorada brillante */}
        <motion.div 
          className="absolute -inset-8 bg-gradient-to-r from-amber-500/30 via-yellow-400/40 to-orange-500/30 rounded-full blur-2xl"
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        {/* Estela de luz */}
        <motion.div
          className="absolute -inset-4 bg-gradient-to-t from-amber-400/20 to-transparent rounded-full"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            y: [0, 10, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* El avatar con color completo y brillo */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-400 p-1 shadow-2xl shadow-amber-500/50">
          <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            {participant.image ? (
              <img 
                src={participant.image} 
                alt={participant.name}
                className="w-full h-full rounded-full object-cover brightness-110 saturate-110"
              />
            ) : (
              <span className="text-3xl font-bold text-white drop-shadow-lg">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        {/* Corona o estrella de logro */}
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          animate={{
            y: [0, -3, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Crown className="w-6 h-6 text-yellow-300 drop-shadow-lg" />
        </motion.div>
      </motion.div>
      
      {/* Meta manifestada - texto dorado flotando */}
      <motion.div
        className="absolute -top-20 left-1/2 -translate-x-1/2"
        animate={{
          y: [0, -5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="relative"
          animate={{
            filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Resplandor detrás del texto */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/50 via-yellow-300/60 to-orange-400/50 blur-xl rounded-full" />
          
          <div className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 px-4 py-2 rounded-full shadow-lg shadow-amber-500/50">
            <p className="text-sm font-black text-slate-900 max-w-[140px] text-center uppercase tracking-wide">
              {participant.saltoQuantico || '¡LO LOGRÉ!'}
            </p>
          </div>
          
          {/* Destellos */}
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: 360, scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Nombre con gloria */}
      <motion.p 
        className="text-base text-amber-300 mt-3 font-bold text-center max-w-[120px] truncate drop-shadow-lg"
        animate={{ 
          textShadow: ["0 0 10px rgba(251,191,36,0.5)", "0 0 20px rgba(251,191,36,0.8)", "0 0 10px rgba(251,191,36,0.5)"]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {participant.name.split(' ')[0]}
      </motion.p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
//                    ANIMACIÓN DE CRUCE
//              El momento del "Salto Cuántico"
// ═══════════════════════════════════════════════════════════════

const CrossingAnimation = ({ 
  participant, 
  onComplete 
}: { 
  participant: Participant
  onComplete: () => void 
}) => {
  const [phase, setPhase] = useState<'run' | 'jump' | 'flash' | 'transform' | 'celebrate'>('run')
  
  useEffect(() => {
    // Secuencia de animación
    const timers = [
      setTimeout(() => setPhase('jump'), 1500),
      setTimeout(() => setPhase('flash'), 2500),
      setTimeout(() => setPhase('transform'), 3000),
      setTimeout(() => setPhase('celebrate'), 3800),
      setTimeout(() => onComplete(), 5500),
    ]
    
    return () => timers.forEach(clearTimeout)
  }, [onComplete])
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Flash blanco en el momento del cruce */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      
      {/* El avatar corriendo y saltando */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        initial={{ left: '20%' }}
        animate={{
          left: phase === 'run' ? '40%' : 
                phase === 'jump' ? '50%' : 
                phase === 'flash' ? '50%' :
                phase === 'transform' ? '60%' : '70%',
          y: phase === 'jump' ? -100 : 0,
          scale: phase === 'flash' ? 1.5 : phase === 'celebrate' ? 1.2 : 1,
        }}
        transition={{
          duration: phase === 'run' ? 1.5 : phase === 'jump' ? 1 : 0.5,
          ease: phase === 'jump' ? 'easeOut' : 'easeInOut',
        }}
      >
        {/* Versión gris (antes del flash) */}
        {(phase === 'run' || phase === 'jump') && (
          <motion.div
            className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center border-4 border-slate-500 shadow-2xl overflow-hidden"
            animate={{
              rotate: phase === 'run' ? [0, -10, 10, -10, 0] : 0,
            }}
            transition={{ duration: 0.3, repeat: Infinity }}
          >
            {participant.image ? (
              <img 
                src={participant.image} 
                alt={participant.name}
                className="w-full h-full rounded-full object-cover grayscale"
              />
            ) : (
              <span className="text-5xl font-bold text-slate-400">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            )}
          </motion.div>
        )}
        
        {/* Efecto de cáscara rompiéndose */}
        {phase === 'transform' && (
          <motion.div
            className="relative"
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
          >
            {/* Fragmentos de la cáscara gris */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg"
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: Math.cos(i * 45 * Math.PI / 180) * 150,
                  y: Math.sin(i * 45 * Math.PI / 180) * 150,
                  opacity: 0,
                  rotate: 360,
                  scale: 0,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            ))}
            
            {/* Avatar dorado emergiendo */}
            <motion.div
              className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-400 p-1 shadow-2xl shadow-amber-500/50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                {participant.image ? (
                  <img 
                    src={participant.image} 
                    alt={participant.name}
                    className="w-full h-full rounded-full object-cover brightness-110"
                  />
                ) : (
                  <span className="text-5xl font-bold text-white drop-shadow-lg">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Celebración final */}
        {phase === 'celebrate' && (
          <motion.div
            className="relative"
            animate={{
              y: [0, -20, 0],
            }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            {/* Avatar brillante celebrando */}
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-400 p-1 shadow-2xl shadow-amber-500/50">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                {participant.image ? (
                  <img 
                    src={participant.image} 
                    alt={participant.name}
                    className="w-full h-full rounded-full object-cover brightness-110"
                  />
                ) : (
                  <span className="text-5xl font-bold text-white drop-shadow-lg">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            
            {/* Corona */}
            <motion.div
              className="absolute -top-6 left-1/2 -translate-x-1/2"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <Crown className="w-12 h-12 text-yellow-300 drop-shadow-lg" />
            </motion.div>
            
            {/* Meta explotando como fuegos artificiales */}
            <motion.div
              className="absolute -top-32 left-1/2 -translate-x-1/2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'backOut' }}
            >
              <div className="relative">
                {/* Estrellas de fuegos artificiales */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2"
                    initial={{ scale: 0 }}
                    animate={{
                      x: Math.cos(i * 30 * Math.PI / 180) * 80,
                      y: Math.sin(i * 30 * Math.PI / 180) * 80,
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                  >
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                ))}
                
                {/* Texto de la meta */}
                <motion.div
                  className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 px-6 py-3 rounded-full shadow-2xl shadow-amber-500/50"
                  animate={{
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      "0 0 20px rgba(251,191,36,0.5)",
                      "0 0 40px rgba(251,191,36,0.8)",
                      "0 0 20px rgba(251,191,36,0.5)"
                    ]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <p className="text-xl font-black text-slate-900 uppercase tracking-wider">
                    {participant.saltoQuantico || '¡SALTO CUÁNTICO!'}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
      
      {/* Nombre del participante */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <motion.p
          className="text-4xl font-black text-white drop-shadow-2xl"
          animate={{
            color: phase === 'celebrate' ? '#fbbf24' : '#ffffff',
          }}
        >
          {participant.name}
        </motion.p>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//                    GRIETA DE ENERGÍA CENTRAL
// ═══════════════════════════════════════════════════════════════

const EnergyRift = () => {
  return (
    <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-24 z-20 overflow-hidden">
      {/* Grieta principal con energía */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-violet-500/80 to-purple-500/0"
        style={{
          clipPath: 'polygon(30% 0%, 70% 0%, 60% 20%, 75% 40%, 55% 50%, 80% 60%, 50% 80%, 65% 100%, 35% 100%, 50% 80%, 20% 60%, 45% 50%, 25% 40%, 40% 20%)',
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Rayos de energía */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 bg-gradient-to-b from-transparent via-violet-400 to-transparent"
          style={{
            left: `${30 + i * 10}%`,
            height: '100%',
          }}
          animate={{
            opacity: [0, 1, 0],
            scaleY: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.2,
            repeat: Infinity,
          }}
        />
      ))}
      
      {/* Partículas flotando hacia arriba */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-violet-400 rounded-full"
          style={{
            left: `${20 + Math.random() * 60}%`,
            bottom: `-${Math.random() * 10}%`,
          }}
          animate={{
            y: [0, '-110vh'],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: i * 0.3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
      
      {/* Texto central */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <p className="text-violet-300 font-black text-lg tracking-widest uppercase vertical-text"
           style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          SALTO CUÁNTICO
        </p>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//                    COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function ElAtravesarTuVidaPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)
  const [pendingParticipants, setPendingParticipants] = useState<Participant[]>([])
  const [crossedParticipants, setCrossedParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<CrossingStats>({
    crossedCount: 0,
    totalParticipants: 0,
    remainingCount: 0,
    percentageCrossed: 0
  })
  const [crossingParticipant, setCrossingParticipant] = useState<Participant | null>(null)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const crossSoundRef = useRef<HTMLAudioElement | null>(null)
  
  // Cargar datos iniciales
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Obtener sesión (usar query param, no ruta dinámica)
        const res = await fetch(`/api/el-cruce/session?sessionId=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setSessionData(data.session)
          
          // Los participantes vienen en data.participants (no en session)
          const participants = data.participants || {}
          
          // waiting = lado izquierdo (PROBABILIDAD - no han cruzado)
          const pending = (participants.waiting || []).map((p: any) => ({
            id: p.id,
            name: p.name || 'Participante',
            image: p.image,
            saltoQuantico: p.saltoQuantico || 'Mi meta pendiente...',
            status: 'waiting'
          }))
          
          // crossed = lado derecho (POSIBILIDAD - ya cruzaron)
          const crossed = (participants.crossed || []).map((p: any) => ({
            id: p.id,
            name: p.name || 'Participante',
            image: p.image,
            saltoQuantico: p.saltoQuantico || 'Mi meta manifestada',
            status: 'crossed'
          }))
          
          setPendingParticipants(pending)
          setCrossedParticipants(crossed)
          
          // Calcular stats
          const total = pending.length + crossed.length
          setStats({
            crossedCount: crossed.length,
            totalParticipants: total,
            remainingCount: pending.length,
            percentageCrossed: total > 0 ? Math.round((crossed.length / total) * 100) : 0
          })
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSession()
  }, [sessionId])
  
  // Conectar a WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'wss://socket.quantummatter.app'
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      query: { sessionId }
    })
    
    newSocket.on('connect', () => {
      console.log('🔌 Conectado a WebSocket - Tu Vida')
      newSocket.emit('join-session', sessionId)
    })
    
    newSocket.on('participant-crossed', (data: { participant: Participant }) => {
      // Iniciar animación de cruce
      setCrossingParticipant(data.participant)
      
      // Reproducir sonido
      if (!muted && crossSoundRef.current) {
        crossSoundRef.current.currentTime = 0
        crossSoundRef.current.play().catch(() => {})
      }
    })
    
    newSocket.on('stats-updated', (newStats: CrossingStats) => {
      setStats(newStats)
    })
    
    setSocket(newSocket)
    
    return () => {
      newSocket.disconnect()
    }
  }, [sessionId, muted])
  
  // Manejar fin de animación de cruce
  const handleCrossingComplete = useCallback(() => {
    if (crossingParticipant) {
      // Mover de pendientes a cruzados
      setPendingParticipants(prev => prev.filter(p => p.id !== crossingParticipant.id))
      setCrossedParticipants(prev => [...prev, crossingParticipant])
      setCrossingParticipant(null)
    }
  }, [crossingParticipant])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap className="w-16 h-16 text-violet-500" />
          <p className="text-violet-400 text-xl font-bold">Preparando El Atravesar...</p>
        </motion.div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Audio de fondo épico */}
      <audio ref={audioRef} loop>
        <source src="/sounds/epic-ambient.mp3" type="audio/mpeg" />
      </audio>
      
      {/* Sonido de cruce */}
      <audio ref={crossSoundRef}>
        <source src="/sounds/quantum-jump.mp3" type="audio/mpeg" />
      </audio>
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*              LADO IZQUIERDO: LA SOMBRA                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="absolute left-0 top-0 bottom-0 w-1/2 overflow-hidden">
        {/* Fondo con atmósfera oscura */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />
        
        {/* Efecto de neblina */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-slate-800/30 via-transparent to-slate-700/20"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        {/* Lluvia ligera */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-8 bg-gradient-to-b from-transparent via-slate-400 to-transparent"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 10}%`,
              }}
              animate={{
                y: ['0vh', '110vh'],
              }}
              transition={{
                duration: 1 + Math.random(),
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
        
        {/* Título del lado */}
        <div className="absolute top-8 left-8 z-30">
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">El Mundo de la</p>
            <h2 className="text-slate-400 text-3xl font-black">PROBABILIDAD</h2>
          </motion.div>
        </div>
        
        {/* Avatares en la sombra */}
        {pendingParticipants.map((p, i) => (
          <ShadowAvatar key={p.id} participant={p} index={i} />
        ))}
      </div>
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*              GRIETA DE ENERGÍA CENTRAL                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <EnergyRift />
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*              LADO DERECHO: LA LUZ                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
        {/* Fondo con atmósfera dorada/luminosa */}
        <div className="absolute inset-0 bg-gradient-to-bl from-amber-900/30 via-orange-950/20 to-slate-950" />
        
        {/* Efecto de amanecer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-yellow-400/5"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        
        {/* Partículas de energía subiendo */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-amber-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: `-5%`,
              }}
              animate={{
                y: [0, '-110vh'],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                delay: Math.random() * 5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
        
        {/* Título del lado */}
        <div className="absolute top-8 right-8 z-30 text-right">
          <motion.div
            animate={{ 
              opacity: [0.7, 1, 0.7],
              textShadow: ["0 0 20px rgba(251,191,36,0.3)", "0 0 40px rgba(251,191,36,0.6)", "0 0 20px rgba(251,191,36,0.3)"]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <p className="text-amber-600 text-sm font-bold uppercase tracking-widest mb-1">El Mundo de la</p>
            <h2 className="text-amber-400 text-3xl font-black">POSIBILIDAD</h2>
          </motion.div>
        </div>
        
        {/* Avatares en la luz */}
        {crossedParticipants.map((p, i) => (
          <LightAvatar key={p.id} participant={p} index={i} />
        ))}
      </div>
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*              ESTADÍSTICAS                               */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <motion.div
          className="bg-slate-900/80 backdrop-blur-xl border border-violet-500/30 rounded-2xl px-8 py-4 flex items-center gap-8"
          animate={{
            borderColor: ["rgba(139,92,246,0.3)", "rgba(139,92,246,0.6)", "rgba(139,92,246,0.3)"],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Esperando</p>
            <p className="text-2xl font-black text-slate-300">{stats.remainingCount}</p>
          </div>
          
          <div className="h-12 w-px bg-violet-500/30" />
          
          <div className="text-center">
            <p className="text-violet-400 text-xs uppercase tracking-wider">Han Cruzado</p>
            <p className="text-3xl font-black text-violet-300">{stats.crossedCount}</p>
          </div>
          
          <div className="h-12 w-px bg-violet-500/30" />
          
          <div className="text-center">
            <motion.p
              className="text-amber-400 text-4xl font-black"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {stats.percentageCrossed}%
            </motion.p>
            <p className="text-amber-600 text-xs uppercase tracking-wider">Tu Vida</p>
          </div>
        </motion.div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*              CONTROLES                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="absolute top-4 right-4 z-30 flex gap-2">
        <button
          onClick={() => setMuted(!muted)}
          className="p-3 bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700 hover:bg-slate-700/80 transition-colors"
        >
          {muted ? (
            <VolumeX className="w-5 h-5 text-slate-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-violet-400" />
          )}
        </button>
      </div>
      
      {/* ═══════════════════════════════════════════════════════ */}
      {/*              ANIMACIÓN DE CRUCE                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {crossingParticipant && (
          <CrossingAnimation 
            participant={crossingParticipant} 
            onComplete={handleCrossingComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
