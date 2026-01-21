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
  hasWizard?: boolean // Si tiene carta wizard completada
  keywords?: string[] // Palabras clave extraídas del wizard
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
//         OPCIÓN 2: ORBE DE PIEDRA / CRISTAL ROTO
// ═══════════════════════════════════════════════════════════════

// Helper para limpiar texto que puede venir como JSON array
const cleanGoalText = (text: string | undefined): string => {
  if (!text) return 'Mi gran sueño'
  // Si parece ser un JSON array, parsearlo y tomar el primer elemento
  if (text.startsWith('[') && text.includes('"')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0]
      }
    } catch {
      // Si falla el parse, limpiar manualmente
      return text.replace(/[\[\]"]/g, '').split(',')[0].trim()
    }
  }
  return text
}

const ShadowAvatar = ({ participant, index, total }: { participant: Participant; index: number; total: number }) => {
  const [isNearRift, setIsNearRift] = useState(false)
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0)
  
  // Para shadow (sin wizard) solo mostrar texto limpio, sin rotación
  const displayText = cleanGoalText(participant.saltoQuantico)
  
  // Keywords solo se usan si tiene wizard
  const keywords = participant.hasWizard && participant.keywords && participant.keywords.length > 0
    ? participant.keywords
    : [displayText]
  
  // Rotar keywords cada 2-3 segundos (SOLO si tiene wizard con múltiples keywords)
  useEffect(() => {
    if (!participant.hasWizard || keywords.length <= 1) return
    const interval = setInterval(() => {
      setCurrentKeywordIndex(prev => (prev + 1) % keywords.length)
    }, 2000 + Math.random() * 1000)
    return () => clearInterval(interval)
  }, [keywords.length, participant.hasWizard])
  
  // Generador de números pseudo-aleatorios con más entropía (igual que LightAvatar)
  const seed = (participant.id * 7919 + index * 6271) % 100000
  const random = (n: number) => {
    const x = Math.sin(seed + n * 1000) * 10000
    return x - Math.floor(x)
  }
  
  // Posiciones iniciales MUY dispersas usando diferentes zonas
  const zones = [
    { x: [5, 28], y: [8, 30] },     // Arriba izquierda
    { x: [30, 55], y: [5, 28] },    // Arriba centro
    { x: [58, 85], y: [10, 35] },   // Arriba derecha
    { x: [8, 32], y: [35, 58] },    // Centro izquierda
    { x: [35, 62], y: [32, 55] },   // Centro
    { x: [60, 88], y: [38, 60] },   // Centro derecha
    { x: [5, 30], y: [62, 85] },    // Abajo izquierda
    { x: [32, 58], y: [58, 82] },   // Abajo centro
    { x: [55, 85], y: [65, 88] },   // Abajo derecha
  ]
  
  // Asignar zona basada en el ID del participante
  const zoneIndex = (participant.id * 5 + index * 3) % zones.length
  const zone = zones[zoneIndex]
  
  // Posición dentro de la zona asignada
  const startX = zone.x[0] + random(1) * (zone.x[1] - zone.x[0])
  const startY = zone.y[0] + random(2) * (zone.y[1] - zone.y[0])
  
  // Trayectorias aleatorias usando funciones trigonométricas
  const phase1 = random(10) * Math.PI * 2
  const phase2 = random(11) * Math.PI * 2
  const amplitude = 35 + random(12) * 50 // 35-85px (un poco menos que luz)
  
  const waypoints = {
    x: [
      0,
      Math.cos(phase1) * amplitude,
      Math.sin(phase1 + 1.2) * amplitude * 0.75,
      Math.cos(phase1 + 2.8) * amplitude * 1.1,
      Math.sin(phase1 + 4.3) * amplitude * 0.6,
      Math.cos(phase1 + 5.7) * amplitude * 0.85,
      0
    ],
    y: [
      0,
      Math.sin(phase2) * amplitude * 0.65,
      Math.cos(phase2 + 1.5) * amplitude * 0.9,
      Math.sin(phase2 + 3) * amplitude * 0.8,
      Math.cos(phase2 + 4.5) * amplitude,
      Math.sin(phase2 + 6) * amplitude * 0.7,
      0
    ]
  }
  
  // Duración diferente para cada orbe (más lento, son pesados)
  const moveDuration = 18 + random(30) * 12 // 18-30 segundos
  
  // Detectar cercanía a la grieta basado en posición
  useEffect(() => {
    const interval = setInterval(() => {
      // Aproximación: considerar cerca si está en zona derecha
      const nearRift = startX > 50 || random(100) > 0.7
      setIsNearRift(nearRift)
    }, 2000)
    return () => clearInterval(interval)
  }, [startX])
  
  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${startX}%`, top: `${startY}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: waypoints.x,
        y: waypoints.y,
      }}
      transition={{ 
        opacity: { duration: 1, delay: index * 0.15 },
        scale: { duration: 0.8, delay: index * 0.15 },
        x: { duration: moveDuration, repeat: Infinity, ease: "easeInOut", delay: random(50) * 3 },
        y: { duration: moveDuration * (0.85 + random(51) * 0.3), repeat: Infinity, ease: "easeInOut", delay: random(52) * 3 },
      }}
    >
      {/* ════════ ORBE DE PIEDRA/CRISTAL ATRAPADO ════════ */}
      <motion.div
        className="relative"
        animate={{
          rotate: [0, 3, -3, 2, 0],
          scale: [1, 1.02, 0.98, 1.01, 1],
        }}
        transition={{
          duration: moveDuration * 0.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Sombra pesada debajo */}
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-black/30 rounded-full blur-md"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        {/* ═══ AURA DE ILUMINACIÓN CUANDO SE ACERCA A LA GRIETA ═══ */}
        <motion.div
          className="absolute -inset-3 rounded-full pointer-events-none"
          animate={{
            opacity: isNearRift ? 0.6 : 0,
            scale: isNearRift ? 1.2 : 1,
          }}
          transition={{ duration: 0.8 }}
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(168,85,247,0.2) 50%, transparent 70%)',
            boxShadow: isNearRift ? '0 0 30px rgba(139,92,246,0.5)' : 'none',
          }}
        />

        {/* ═══ ORBE DE PIEDRA PRINCIPAL ═══ */}
        <motion.div 
          className="relative w-24 h-24"
          animate={{
            filter: isNearRift 
              ? 'brightness(1.3) saturate(1.2)' 
              : 'brightness(1) saturate(1)',
          }}
          transition={{ duration: 0.8 }}
        >
          {/* Capa exterior: Roca/Piedra agrietada */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse at 30% 20%, #64748b 0%, transparent 50%),
                radial-gradient(ellipse at 70% 80%, #475569 0%, transparent 50%),
                radial-gradient(circle, #334155 0%, #1e293b 60%, #0f172a 100%)
              `,
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), inset 0 -10px 20px rgba(0,0,0,0.5)',
            }}
          />
          
          {/* Grietas que brillan cuando se acerca */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`crackGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isNearRift ? "#8b5cf6" : "#0f172a"} />
                <stop offset="50%" stopColor={isNearRift ? "#a855f7" : "#1e293b"} />
                <stop offset="100%" stopColor={isNearRift ? "#8b5cf6" : "#0f172a"} />
              </linearGradient>
            </defs>
            <motion.path
              d="M50 15 L48 30 L45 35 M50 15 L55 28 L58 40"
              stroke={`url(#crackGrad-${index})`}
              strokeWidth={isNearRift ? 3 : 2}
              fill="none"
              animate={{ opacity: isNearRift ? [0.7, 1, 0.7] : [0.4, 0.6, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.path
              d="M85 50 L70 48 L65 45 M85 50 L72 55 L60 58"
              stroke={`url(#crackGrad-${index})`}
              strokeWidth={isNearRift ? 3 : 2}
              fill="none"
              animate={{ opacity: isNearRift ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.path
              d="M50 85 L52 70 L55 65 M50 85 L45 72 L42 60"
              stroke={`url(#crackGrad-${index})`}
              strokeWidth={isNearRift ? 3 : 2}
              fill="none"
              animate={{ opacity: isNearRift ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.5 }}
            />
          </svg>
          
          {/* ═══ FOTO ATRAPADA EN EL CENTRO ═══ */}
          <motion.div 
            className="absolute inset-4 rounded-full overflow-hidden"
            animate={{
              filter: isNearRift 
                ? 'grayscale(40%) brightness(0.85)' 
                : 'grayscale(80%) brightness(0.65)',
            }}
            transition={{ duration: 0.8 }}
          >
            {/* Cristal semi-transparente sobre la foto */}
            <div 
              className="absolute inset-0 z-10 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(100,116,139,0.15) 0%, rgba(30,41,59,0.35) 100%)',
              }}
            />
            
            {/* Foto */}
            {participant.image ? (
              <img 
                src={participant.image} 
                alt={participant.name}
                className="w-full h-full object-cover rounded-full"
                style={{ 
                  filter: 'contrast(1.1)',
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-600">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Viñeta suave */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: 'inset 0 0 15px 5px rgba(15,23,42,0.5)',
              }}
            />
          </motion.div>
          
          {/* Reflejo sutil */}
          <div 
            className="absolute top-2 left-4 w-8 h-4 bg-slate-400/10 rounded-full blur-sm"
            style={{ transform: 'rotate(-30deg)' }}
          />
        </motion.div>
        
        {/* ═══ TEXTO DE META (KEYWORDS ROTATIVAS SI TIENE WIZARD) ═══ */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <AnimatePresence mode="wait">
            <motion.p 
              key={currentKeywordIndex}
              className="text-[10px] font-semibold italic text-center max-w-[100px] truncate uppercase"
              initial={{ opacity: 0, y: 5 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                color: isNearRift ? '#a78bfa' : '#94a3b8',
              }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.4 }}
            >
              {participant.hasWizard ? keywords[currentKeywordIndex] : `"${keywords[0]}"`}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Nombre */}
      <motion.p 
        className="text-xs mt-12 font-bold text-center max-w-[90px] truncate"
        animate={{
          color: isNearRift ? '#c4b5fd' : '#cbd5e1',
        }}
        transition={{ duration: 0.5 }}
      >
        {participant.name.split(' ')[0]}
      </motion.p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
//                    LADO DERECHO: LA LUZ
//              "El Mundo de la Posibilidad"
//         OPCIÓN 2: COMETA DE LUZ / ORBE BRILLANTE
// ═══════════════════════════════════════════════════════════════

const LightAvatar = ({ participant, index, total }: { participant: Participant; index: number; total: number }) => {
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0)
  
  // Limpiar saltoQuantico si viene como JSON
  const cleanSalto = cleanGoalText(participant.saltoQuantico)
  
  // Keywords del wizard para rotación, o solo el saltoQuantico limpio
  const keywords = participant.hasWizard && participant.keywords && participant.keywords.length > 0
    ? participant.keywords
    : [cleanSalto]
  
  // Rotar keywords más rápido (energía positiva!) - SOLO si tiene wizard con múltiples keywords
  useEffect(() => {
    if (!participant.hasWizard || keywords.length <= 1) return
    const interval = setInterval(() => {
      setCurrentKeywordIndex(prev => (prev + 1) % keywords.length)
    }, 1500 + Math.random() * 500) // 1.5-2 segundos
    return () => clearInterval(interval)
  }, [keywords.length, participant.hasWizard])
  
  // Generador de números pseudo-aleatorios con más entropía
  const seed = (participant.id * 7919 + index * 6271) % 100000
  const random = (n: number) => {
    const x = Math.sin(seed + n * 1000) * 10000
    return x - Math.floor(x)
  }
  
  // Posiciones iniciales MUY dispersas usando diferentes zonas
  // Dividir el espacio en zonas y distribuir aleatoriamente
  const zones = [
    { x: [5, 30], y: [10, 35] },    // Arriba izquierda
    { x: [35, 65], y: [5, 30] },    // Arriba centro
    { x: [60, 85], y: [15, 40] },   // Arriba derecha
    { x: [10, 35], y: [40, 65] },   // Centro izquierda
    { x: [40, 70], y: [35, 60] },   // Centro
    { x: [55, 85], y: [45, 70] },   // Centro derecha
    { x: [5, 35], y: [65, 85] },    // Abajo izquierda
    { x: [30, 60], y: [60, 85] },   // Abajo centro
    { x: [55, 85], y: [70, 90] },   // Abajo derecha
  ]
  
  // Asignar zona basada en el ID del participante (más random)
  const zoneIndex = (participant.id * 3 + index * 7) % zones.length
  const zone = zones[zoneIndex]
  
  // Posición dentro de la zona asignada
  const startX = zone.x[0] + random(1) * (zone.x[1] - zone.x[0])
  const startY = zone.y[0] + random(2) * (zone.y[1] - zone.y[0])
  
  // Trayectorias completamente diferentes para cada orbe
  // Usar funciones trigonométricas con diferentes fases
  const phase1 = random(10) * Math.PI * 2
  const phase2 = random(11) * Math.PI * 2
  const amplitude = 40 + random(12) * 60 // 40-100px
  
  const waypoints = {
    x: [
      0,
      Math.cos(phase1) * amplitude,
      Math.sin(phase1 + 1) * amplitude * 0.8,
      Math.cos(phase1 + 2.5) * amplitude * 1.1,
      Math.sin(phase1 + 4) * amplitude * 0.6,
      Math.cos(phase1 + 5.5) * amplitude * 0.9,
      0
    ],
    y: [
      0,
      Math.sin(phase2) * amplitude * 0.7,
      Math.cos(phase2 + 1.3) * amplitude,
      Math.sin(phase2 + 2.8) * amplitude * 0.85,
      Math.cos(phase2 + 4.2) * amplitude * 1.05,
      Math.sin(phase2 + 5.8) * amplitude * 0.75,
      0
    ]
  }
  
  // Duración diferente para cada orbe
  const moveDuration = 15 + random(30) * 10 // 15-25 segundos
  
  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${startX}%`, top: `${startY}%` }}
      initial={{ opacity: 0, scale: 0, x: 50 + random(40) * 100 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        x: waypoints.x,
        y: waypoints.y,
      }}
      transition={{ 
        opacity: { duration: 0.8, delay: index * 0.15 },
        scale: { duration: 0.8, delay: index * 0.15, type: "spring" },
        x: { duration: moveDuration, repeat: Infinity, ease: "easeInOut", delay: random(50) * 3 },
        y: { duration: moveDuration * (0.9 + random(51) * 0.3), repeat: Infinity, ease: "easeInOut", delay: random(52) * 3 },
      }}
    >
      {/* ════════ COMETA DE LUZ ════════ */}
      <motion.div
        className="relative"
        // Rotación suave mientras se mueve
        animate={{
          rotate: [0, 5, -4, 6, -3, 0],
          scale: [1, 1.03, 0.98, 1.02, 1],
        }}
        transition={{
          duration: moveDuration * 0.7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* ═══ ESTELA DE LUZ (cola del cometa) ═══ */}
        <motion.div
          className="absolute -left-24 top-1/2 -translate-y-1/2"
          animate={{
            scaleX: [0.7, 1, 0.8, 1.1, 0.7],
            opacity: [0.6, 0.9, 0.7, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Cola principal - gradiente largo */}
          <div 
            className="w-28 h-12 rounded-l-full"
            style={{
              background: `linear-gradient(to right, 
                transparent 0%, 
                rgba(251,191,36,0.1) 10%,
                rgba(251,191,36,0.2) 30%,
                rgba(253,224,71,0.4) 60%,
                rgba(254,240,138,0.7) 85%,
                rgba(255,255,255,0.9) 100%
              )`,
              filter: 'blur(4px)',
            }}
          />
          
          {/* Estelas secundarias */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-l-full"
              style={{
                width: `${60 - i * 15}px`,
                height: `${6 - i}px`,
                top: `${50 + (i - 1) * 18}%`,
                right: 0,
                background: `linear-gradient(to right, transparent, rgba(251,191,36,${0.2 + i * 0.1}))`,
                filter: 'blur(2px)',
              }}
              animate={{
                scaleX: [0.6, 1.2, 0.6],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>

        {/* ═══ PARTÍCULAS DE ENERGÍA ALREDEDOR ═══ */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: i % 3 === 0 ? '#fef3c7' : i % 3 === 1 ? '#fcd34d' : '#f59e0b',
              left: `${50 + Math.cos(i * 0.785) * 50}%`,
              top: `${50 + Math.sin(i * 0.785) * 50}%`,
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
              x: [0, Math.cos(i * 0.785) * 20],
              y: [0, Math.sin(i * 0.785) * 20],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}

        {/* ═══ ORBE BRILLANTE PRINCIPAL ═══ */}
        <div className="relative w-24 h-24">
          {/* Aura exterior pulsante */}
          <motion.div 
            className="absolute -inset-6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(254,243,199,0.6) 0%, rgba(251,191,36,0.3) 40%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Anillo de energía */}
          <motion.div 
            className="absolute -inset-3 rounded-full border-2 border-amber-300/40"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.7, 0.3],
              rotate: 360,
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              opacity: { duration: 2, repeat: Infinity },
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            }}
          />
          
          {/* Núcleo brillante exterior */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 70%, rgba(254,240,138,0.8) 0%, transparent 40%),
                radial-gradient(circle, #fef3c7 0%, #fcd34d 30%, #f59e0b 60%, #d97706 100%)
              `,
              boxShadow: '0 0 40px rgba(251,191,36,0.8), 0 0 80px rgba(251,191,36,0.4), inset 0 0 30px rgba(255,255,255,0.5)',
            }}
            animate={{
              boxShadow: [
                '0 0 40px rgba(251,191,36,0.8), 0 0 80px rgba(251,191,36,0.4), inset 0 0 30px rgba(255,255,255,0.5)',
                '0 0 60px rgba(251,191,36,1), 0 0 100px rgba(251,191,36,0.6), inset 0 0 40px rgba(255,255,255,0.7)',
                '0 0 40px rgba(251,191,36,0.8), 0 0 80px rgba(251,191,36,0.4), inset 0 0 30px rgba(255,255,255,0.5)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* ═══ FOTO COMO NÚCLEO DEL COMETA ═══ */}
          <div className="absolute inset-3 rounded-full overflow-hidden shadow-inner">
            {/* Foto vibrante y brillante */}
            {participant.image ? (
              <img 
                src={participant.image} 
                alt={participant.name}
                className="w-full h-full object-cover rounded-full"
                style={{ 
                  filter: 'brightness(1.2) saturate(1.3) contrast(1.05)',
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                <span className="text-3xl font-bold text-amber-800">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Brillo sobre la foto */}
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
              }}
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          {/* Destello superior (reflejo de luz) */}
          <motion.div 
            className="absolute top-1 left-4 w-6 h-3 bg-white/60 rounded-full blur-sm"
            style={{ transform: 'rotate(-30deg)' }}
            animate={{
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        
        {/* ═══ BANNER DE META MANIFESTADA (KEYWORDS ROTATIVAS) ═══ */}
        <motion.div
          className="absolute -top-20 left-1/2 -translate-x-1/2"
          animate={{
            y: [0, -5, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Glow detrás */}
          <motion.div 
            className="absolute inset-0 bg-amber-400/50 blur-lg rounded-full scale-150"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 px-3 py-2 rounded-xl shadow-lg shadow-amber-500/50 border border-yellow-300/50 overflow-hidden min-w-[120px] max-w-[180px]">
            <AnimatePresence mode="wait">
              <motion.p 
                key={currentKeywordIndex}
                className="text-[10px] font-bold text-slate-900 text-center leading-tight whitespace-pre-wrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {keywords[currentKeywordIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
          
          {/* Sparkles */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-yellow-300"
              style={{
                top: `${-5 + i * 10}px`,
                left: `${-10 + i * 50}px`,
              }}
              animate={{ scale: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            >
              <Sparkles className="w-3 h-3" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      
      {/* Nombre brillante */}
      <p 
        className="text-sm text-amber-200 mt-4 font-bold text-center max-w-[90px] truncate"
        style={{ textShadow: '0 0 8px rgba(251,191,36,0.6)' }}
      >
        {participant.name.split(' ')[0]}
      </p>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
//                    ANIMACIÓN DE CRUCE
//              El momento del "Salto Cuántico"
//         OPCIÓN 2: PIEDRA EXPLOTA → COMETA DE LUZ
// ═══════════════════════════════════════════════════════════════

const CrossingAnimation = ({ 
  participant, 
  onComplete 
}: { 
  participant: Participant
  onComplete: () => void 
}) => {
  const [phase, setPhase] = useState<'approach' | 'explode' | 'flash' | 'emerge' | 'celebrate'>('approach')
  
  useEffect(() => {
    // Secuencia de animación: Piedra se acerca → Explota → Flash → Cometa emerge → Celebración
    const timers = [
      setTimeout(() => setPhase('explode'), 2000),
      setTimeout(() => setPhase('flash'), 2500),
      setTimeout(() => setPhase('emerge'), 3000),
      setTimeout(() => setPhase('celebrate'), 4000),
      setTimeout(() => onComplete(), 6000),
    ]
    
    return () => timers.forEach(clearTimeout)
  }, [onComplete])
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Flash blanco/dorado en el momento del cruce */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,1) 0%, rgba(251,191,36,0.8) 30%, transparent 70%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      
      {/* ═══ FASE 1: ORBE DE PIEDRA ACERCÁNDOSE ═══ */}
      {(phase === 'approach' || phase === 'explode') && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          initial={{ left: '15%' }}
          animate={{
            left: phase === 'approach' ? '45%' : '50%',
          }}
          transition={{
            duration: phase === 'approach' ? 2 : 0.5,
            ease: 'easeInOut',
          }}
        >
          <motion.div
            className="relative w-32 h-32"
            animate={{
              rotate: phase === 'approach' ? [0, 5, -5, 3, 0] : 0,
              scale: phase === 'explode' ? [1, 1.3, 0] : 1,
            }}
            transition={{
              rotate: { duration: 3, repeat: Infinity },
              scale: { duration: 0.5, ease: 'easeOut' },
            }}
          >
            {/* Orbe de piedra oscura */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: `
                  radial-gradient(ellipse at 30% 20%, #64748b 0%, transparent 50%),
                  radial-gradient(ellipse at 70% 80%, #475569 0%, transparent 50%),
                  radial-gradient(circle, #334155 0%, #1e293b 60%, #0f172a 100%)
                `,
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)',
              }}
            />
            
            {/* Grietas brillando (presión interna) */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <motion.path
                d="M50 10 L48 30 L42 45 L50 50 L58 45 L52 30 Z"
                fill="none"
                stroke="rgba(251,191,36,0.8)"
                strokeWidth="2"
                animate={{
                  opacity: phase === 'approach' ? [0.2, 0.8, 0.2] : 1,
                  strokeWidth: phase === 'explode' ? 4 : 2,
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.path
                d="M90 50 L70 48 L55 42 L50 50 L55 58 L70 52 Z"
                fill="none"
                stroke="rgba(251,191,36,0.6)"
                strokeWidth="2"
                animate={{
                  opacity: phase === 'approach' ? [0.1, 0.6, 0.1] : 1,
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
              <motion.path
                d="M50 90 L52 70 L58 55 L50 50 L42 55 L48 70 Z"
                fill="none"
                stroke="rgba(251,191,36,0.7)"
                strokeWidth="2"
                animate={{
                  opacity: phase === 'approach' ? [0.15, 0.7, 0.15] : 1,
                }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
              />
            </svg>
            
            {/* Foto atrapada (apenas visible) */}
            <div className="absolute inset-6 rounded-full overflow-hidden">
              {participant.image ? (
                <img 
                  src={participant.image} 
                  alt={participant.name}
                  className="w-full h-full object-cover rounded-full"
                  style={{ filter: 'grayscale(100%) brightness(0.3)' }}
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <span className="text-3xl font-bold text-slate-600">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/60" />
            </div>
          </motion.div>
          
          {/* Fragmentos de piedra explotando */}
          {phase === 'explode' && (
            <>
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 w-6 h-6 rounded-md"
                  style={{
                    background: `linear-gradient(135deg, #475569 0%, #1e293b 100%)`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{
                    x: Math.cos(i * 22.5 * Math.PI / 180) * (120 + Math.random() * 80),
                    y: Math.sin(i * 22.5 * Math.PI / 180) * (120 + Math.random() * 80),
                    opacity: 0,
                    rotate: 720,
                    scale: 0,
                  }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              ))}
              
              {/* Partículas doradas emergiendo */}
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={`gold-${i}`}
                  className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full"
                  style={{
                    background: i % 2 === 0 ? '#fcd34d' : '#fbbf24',
                    boxShadow: '0 0 10px rgba(251,191,36,0.8)',
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(i * 15 * Math.PI / 180) * (60 + Math.random() * 40),
                    y: Math.sin(i * 15 * Math.PI / 180) * (60 + Math.random() * 40),
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
      
      {/* ═══ FASE 2: COMETA DE LUZ EMERGIENDO ═══ */}
      {(phase === 'emerge' || phase === 'celebrate') && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          initial={{ left: '50%', scale: 0 }}
          animate={{
            left: phase === 'emerge' ? '60%' : '70%',
            scale: phase === 'celebrate' ? 1.1 : 1,
          }}
          transition={{
            duration: 1,
            ease: 'easeOut',
          }}
        >
          <motion.div
            className="relative"
            animate={{
              y: phase === 'celebrate' ? [0, -15, 0] : 0,
            }}
            transition={{ duration: 0.6, repeat: phase === 'celebrate' ? 3 : 0 }}
          >
            {/* Estela del cometa */}
            <motion.div
              className="absolute -left-32 top-1/2 -translate-y-1/2 w-40 h-16"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                background: 'linear-gradient(to right, transparent 0%, rgba(251,191,36,0.2) 30%, rgba(253,224,71,0.5) 70%, rgba(255,255,255,0.8) 100%)',
                filter: 'blur(8px)',
                transformOrigin: 'right',
              }}
            />
            
            {/* Orbe brillante principal */}
            <motion.div
              className="relative w-32 h-32"
              animate={{
                boxShadow: [
                  '0 0 40px rgba(251,191,36,0.8)',
                  '0 0 80px rgba(251,191,36,1)',
                  '0 0 40px rgba(251,191,36,0.8)',
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ borderRadius: '50%' }}
            >
              {/* Aura exterior */}
              <motion.div 
                className="absolute -inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(254,243,199,0.6) 0%, rgba(251,191,36,0.3) 50%, transparent 70%)',
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              
              {/* Núcleo brillante */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `
                    radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.9) 0%, transparent 50%),
                    radial-gradient(circle, #fef3c7 0%, #fcd34d 30%, #f59e0b 60%, #d97706 100%)
                  `,
                  boxShadow: 'inset 0 0 30px rgba(255,255,255,0.5)',
                }}
              />
              
              {/* Foto vibrante */}
              <div className="absolute inset-4 rounded-full overflow-hidden shadow-lg">
                {participant.image ? (
                  <img 
                    src={participant.image} 
                    alt={participant.name}
                    className="w-full h-full object-cover rounded-full"
                    style={{ filter: 'brightness(1.2) saturate(1.3)' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-amber-800">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  }}
                />
              </div>
            </motion.div>
            
            {/* Partículas de energía */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: '#fcd34d',
                  left: `${50 + Math.cos(i * 0.785) * 60}%`,
                  top: `${50 + Math.sin(i * 0.785) * 60}%`,
                }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
      
      {/* ═══ CELEBRACIÓN: META MANIFESTADA ═══ */}
      {phase === 'celebrate' && (
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2"
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'backOut' }}
        >
          {/* Estrellas de fuegos artificiales */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2"
              initial={{ scale: 0 }}
              animate={{
                x: Math.cos(i * 30 * Math.PI / 180) * 100,
                y: Math.sin(i * 30 * Math.PI / 180) * 100,
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.5, delay: 0.2 }}
            >
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}
          
          {/* Banner de la meta */}
          <motion.div
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 px-8 py-4 rounded-2xl shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(251,191,36,0.8)' }}
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                '0 0 40px rgba(251,191,36,0.6)',
                '0 0 60px rgba(251,191,36,1)',
                '0 0 40px rgba(251,191,36,0.6)',
              ]
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <p className="text-2xl font-black text-slate-900 uppercase tracking-wider">
              {participant.saltoQuantico || '¡SALTO CUÁNTICO!'}
            </p>
          </motion.div>
        </motion.div>
      )}
      
      {/* Nombre del participante */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <motion.p
          className="text-4xl font-black drop-shadow-2xl"
          animate={{
            color: (phase === 'emerge' || phase === 'celebrate') ? '#fbbf24' : '#94a3b8',
            textShadow: (phase === 'emerge' || phase === 'celebrate') 
              ? '0 0 20px rgba(251,191,36,0.8)' 
              : 'none',
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
  
  // Cola de participantes que deben cruzar con animación al inicio
  const [initialCrossingQueue, setInitialCrossingQueue] = useState<Participant[]>([])
  const [isInitialCrossingActive, setIsInitialCrossingActive] = useState(false)
  
  // Cargar datos iniciales
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Obtener sesión (usar query param, no ruta dinámica)
        // IMPORTANTE: credentials: 'include' para enviar cookies de sesión
        const res = await fetch(`/api/el-cruce/session?sessionId=${sessionId}`, {
          credentials: 'include'
        })
        console.log('📡 Respuesta API:', res.status, res.ok)
        if (res.ok) {
          const data = await res.json()
          console.log('📊 Datos recibidos:', {
            session: data.session?.id,
            waitingCount: data.participants?.waiting?.length,
            crossedCount: data.participants?.crossed?.length
          })
          
          // DEBUG: Verificar imágenes
          console.log('🖼️ Imágenes waiting:', data.participants?.waiting?.map((p: any) => ({
            id: p.id, name: p.name, hasImage: !!p.image
          })))
          console.log('🖼️ Imágenes crossed:', data.participants?.crossed?.map((p: any) => ({
            id: p.id, name: p.name, hasImage: !!p.image
          })))
          
          setSessionData(data.session)
          
          // Los participantes vienen en data.participants (no en session)
          const participants = data.participants || {}
          
          // waiting = lado izquierdo (PROBABILIDAD - no han dado el salto)
          const pending = (participants.waiting || []).map((p: any) => ({
            id: p.id,
            name: p.name || 'Participante',
            image: p.image,
            saltoQuantico: p.saltoQuantico || 'Mi meta pendiente...',
            hasWizard: p.hasWizard || false,
            keywords: p.keywords || [],
            status: 'waiting'
          }))
          
          // crossed = los que ya tienen PL pagado - estos deben hacer la animación de cruce
          const crossed = (participants.crossed || []).map((p: any) => ({
            id: p.id,
            name: p.name || 'Participante',
            image: p.image,
            saltoQuantico: p.saltoQuantico || 'Mi meta manifestada',
            hasWizard: p.hasWizard || false,
            keywords: p.keywords || [],
            status: 'crossed'
          }))
          
          // TODOS empiezan en pendientes (lado izquierdo)
          // Los que ya cruzaron van a la cola de animación inicial
          setPendingParticipants([...pending, ...crossed])
          setCrossedParticipants([]) // Empezar vacío, se llenarán con las animaciones
          
          // Si hay usuarios que ya cruzaron, ponerlos en la cola de animación
          if (crossed.length > 0) {
            setInitialCrossingQueue(crossed)
            setIsInitialCrossingActive(true)
          }
          
          // Calcular stats (considerando que los crossed aún no han animado)
          const total = pending.length + crossed.length
          setStats({
            crossedCount: 0, // Empezar en 0, se actualizará con cada animación
            totalParticipants: total,
            remainingCount: total,
            percentageCrossed: 0
          })
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error('❌ Error del API:', res.status, errorData)
        }
      } catch (error) {
        console.error('❌ Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSession()
  }, [sessionId])
  
  // Procesar cola de cruces iniciales uno por uno
  useEffect(() => {
    if (!isInitialCrossingActive || initialCrossingQueue.length === 0 || crossingParticipant) {
      return
    }
    
    // Esperar un poco antes de iniciar el primer cruce para que se vea la escena
    const delay = initialCrossingQueue.length === (stats.totalParticipants - pendingParticipants.length + initialCrossingQueue.length) 
      ? 2000 // Primera animación: esperar 2 segundos
      : 500  // Siguientes: esperar medio segundo entre cada una
    
    const timer = setTimeout(() => {
      const [nextToCross, ...remaining] = initialCrossingQueue
      setInitialCrossingQueue(remaining)
      setCrossingParticipant(nextToCross)
      
      // Reproducir sonido
      if (!muted && crossSoundRef.current) {
        crossSoundRef.current.currentTime = 0
        crossSoundRef.current.play().catch(() => {})
      }
    }, delay)
    
    return () => clearTimeout(timer)
  }, [isInitialCrossingActive, initialCrossingQueue, crossingParticipant, muted, stats.totalParticipants, pendingParticipants.length])
  
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
      
      // Actualizar estadísticas
      setStats(prev => {
        const newCrossedCount = prev.crossedCount + 1
        return {
          ...prev,
          crossedCount: newCrossedCount,
          remainingCount: prev.remainingCount - 1,
          percentageCrossed: prev.totalParticipants > 0 
            ? Math.round((newCrossedCount / prev.totalParticipants) * 100) 
            : 0
        }
      })
      
      setCrossingParticipant(null)
      
      // Si ya no hay más en la cola inicial, marcar como completado
      if (initialCrossingQueue.length === 0) {
        setIsInitialCrossingActive(false)
      }
    }
  }, [crossingParticipant, initialCrossingQueue.length])
  
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
          <ShadowAvatar key={p.id} participant={p} index={i} total={pendingParticipants.length} />
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
        
        {/* ═══ ESTELA DE LUZ PRINCIPAL - Onda que empuja los orbes ═══ */}
        <motion.div
          className="absolute w-[200%] h-24 pointer-events-none z-20"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%,
              rgba(251,191,36,0.03) 20%,
              rgba(253,224,71,0.1) 35%,
              rgba(254,240,138,0.25) 45%,
              rgba(255,255,255,0.5) 50%,
              rgba(254,240,138,0.25) 55%,
              rgba(253,224,71,0.1) 65%,
              rgba(251,191,36,0.03) 80%,
              transparent 100%
            )`,
            filter: 'blur(12px)',
          }}
          initial={{ x: '100%', y: '20%', rotate: -3 }}
          animate={{
            x: ['-100%', '100%'],
            y: ['20%', '60%', '40%', '70%', '20%'],
            rotate: [-3, 3, -2, 4, -3],
          }}
          transition={{
            x: { duration: 8, repeat: Infinity, ease: "linear" },
            y: { duration: 16, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 12, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        
        {/* Segunda estela más suave */}
        <motion.div
          className="absolute w-[150%] h-16 pointer-events-none z-20"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%,
              rgba(251,191,36,0.05) 30%,
              rgba(255,255,255,0.3) 50%,
              rgba(251,191,36,0.05) 70%,
              transparent 100%
            )`,
            filter: 'blur(16px)',
          }}
          initial={{ x: '100%', y: '50%', rotate: 2 }}
          animate={{
            x: ['-80%', '100%'],
            y: ['50%', '25%', '55%', '15%', '50%'],
            rotate: [2, -4, 3, -2, 2],
          }}
          transition={{
            x: { duration: 10, repeat: Infinity, ease: "linear", delay: 3 },
            y: { duration: 18, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        
        {/* Tercera estela diagonal suave */}
        <motion.div
          className="absolute w-[120%] h-12 pointer-events-none z-20"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%,
              rgba(253,224,71,0.1) 40%,
              rgba(255,255,255,0.35) 50%,
              rgba(253,224,71,0.1) 60%,
              transparent 100%
            )`,
            filter: 'blur(10px)',
          }}
          initial={{ x: '100%', y: '35%', rotate: -5 }}
          animate={{
            x: ['-60%', '100%'],
            y: ['35%', '75%', '25%', '65%', '35%'],
            rotate: [-5, 8, -3, 5, -5],
          }}
          transition={{
            x: { duration: 7, repeat: Infinity, ease: "linear", delay: 5 },
            y: { duration: 12, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 9, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        
        {/* Destellos de impacto suaves */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`flash-${i}`}
            className="absolute w-6 h-6 rounded-full pointer-events-none"
            style={{
              left: `${20 + i * 20}%`,
              top: `${25 + (i % 2) * 35}%`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(251,191,36,0.2) 50%, transparent 70%)',
              filter: 'blur(6px)',
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 1.5 + 1,
              ease: "easeOut",
            }}
          />
        ))}
        
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
          <LightAvatar key={p.id} participant={p} index={i} total={crossedParticipants.length} />
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
            <p className="text-slate-400 text-xs uppercase tracking-wider">Razonando</p>
            <p className="text-2xl font-black text-slate-300">{stats.remainingCount}</p>
          </div>
          
          <div className="h-12 w-px bg-violet-500/30" />
          
          <div className="text-center">
            <p className="text-violet-400 text-xs uppercase tracking-wider">Han dado el salto</p>
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
