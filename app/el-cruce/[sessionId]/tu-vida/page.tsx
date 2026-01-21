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
  const startY = 20 + random(2) * 55
  
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
      {/* ════════ NUBE DE TORMENTA (pensamiento pesado) ════════ */}
      <motion.div
        className="absolute -top-20 left-1/2 -translate-x-1/2 z-20"
        animate={{
          y: [0, -4, 0],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Forma de nube de tormenta */}
        <div className="relative">
          {/* Nubes apiladas para efecto de tormenta */}
          <motion.div 
            className="absolute -top-1 -left-2 w-8 h-5 bg-slate-700/80 rounded-full blur-sm"
            animate={{ x: [-2, 2, -2], opacity: [0.6, 0.8, 0.6] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            className="absolute -top-2 left-4 w-10 h-6 bg-slate-600/70 rounded-full blur-sm"
            animate={{ x: [2, -2, 2], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />
          <motion.div 
            className="absolute top-0 left-0 w-12 h-5 bg-slate-800/90 rounded-full blur-[2px]"
          />
          
          {/* Rayitos de tormenta ocasionales */}
          <motion.div
            className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-400/50"
            animate={{ 
              opacity: [0, 0.8, 0], 
              scaleY: [0.5, 1, 0.5],
            }}
            transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 3 + random(1) * 2 }}
          />
          
          {/* Contenedor del texto */}
          <div className="relative bg-gradient-to-b from-slate-700/95 to-slate-800/95 px-3 py-2 rounded-2xl border border-slate-600/30 shadow-2xl mt-1">
            <p className="text-[10px] text-slate-400/90 font-medium max-w-[100px] text-center leading-tight italic">
              "{participant.saltoQuantico || 'Mi sueño...'}"
            </p>
          </div>
          
          {/* Gotas de lluvia cayendo */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-2 bg-slate-500/40 rounded-full"
              style={{ left: `${20 + i * 30}%`, top: '100%' }}
              animate={{
                y: [0, 20, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeIn"
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* ════════ SILUETA DE CUERPO COMPLETO ════════ */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -2, 0],
          rotate: [-2, 2, -2], // Caminar pesado
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Aura de pesadumbre */}
        <motion.div 
          className="absolute -inset-4 bg-slate-600/15 rounded-full blur-2xl"
          animate={{
            opacity: [0.2, 0.35, 0.2],
            scale: [1, 1.15, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* ═══ SVG SILUETA ENCORVADA ═══ */}
        <svg 
          width="70" 
          height="120" 
          viewBox="0 0 70 120" 
          className="drop-shadow-2xl"
        >
          {/* Definir gradientes y filtros */}
          <defs>
            <linearGradient id={`shadowGrad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <filter id={`shadowBlur-${index}`}>
              <feGaussianBlur stdDeviation="1" />
            </filter>
            {/* Clip path para la cabeza */}
            <clipPath id={`headClip-${index}`}>
              <circle cx="35" cy="18" r="14" />
            </clipPath>
          </defs>
          
          {/* Sombra proyectada */}
          <ellipse 
            cx="35" 
            cy="118" 
            rx="20" 
            ry="4" 
            fill="rgba(0,0,0,0.3)"
            filter={`url(#shadowBlur-${index})`}
          />
          
          {/* ═══ CUERPO ENCORVADO ═══ */}
          {/* Piernas (caminando lento) */}
          <motion.path
            d="M28 85 L24 115 M28 85 Q30 100 35 115"
            stroke={`url(#shadowGrad-${index})`}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            animate={{
              d: [
                "M28 85 L24 115 M42 85 L46 115",
                "M28 85 L26 115 M42 85 L44 115",
                "M28 85 L24 115 M42 85 L46 115",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Torso encorvado */}
          <path
            d="M35 45 Q30 55 28 70 Q26 80 35 85 Q44 80 42 70 Q40 55 35 45"
            fill={`url(#shadowGrad-${index})`}
          />
          
          {/* Brazos en bolsillos */}
          <motion.path
            d="M28 55 Q20 60 18 75 M42 55 Q50 60 52 75"
            stroke={`url(#shadowGrad-${index})`}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            animate={{
              d: [
                "M28 55 Q20 60 18 75 M42 55 Q50 60 52 75",
                "M28 55 Q19 61 17 74 M42 55 Q51 61 53 74",
                "M28 55 Q20 60 18 75 M42 55 Q50 60 52 75",
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Cuello/Hombros caídos */}
          <ellipse cx="35" cy="42" rx="12" ry="6" fill={`url(#shadowGrad-${index})`} />
          
          {/* ═══ CABEZA CON FOTO (mirando abajo) ═══ */}
          <g transform="translate(0, 3) rotate(-10, 35, 18)">
            {/* Base de la cabeza */}
            <circle 
              cx="35" 
              cy="18" 
              r="15" 
              fill={`url(#shadowGrad-${index})`}
              stroke="#475569"
              strokeWidth="1"
            />
            
            {/* Foto del participante (desaturada) */}
            {participant.image && (
              <g clipPath={`url(#headClip-${index})`}>
                <image
                  href={participant.image}
                  x="21"
                  y="4"
                  width="28"
                  height="28"
                  preserveAspectRatio="xMidYMid slice"
                  style={{ filter: 'grayscale(100%) brightness(0.5)' }}
                />
                {/* Overlay oscuro */}
                <circle cx="35" cy="18" r="14" fill="rgba(30,41,59,0.4)" />
              </g>
            )}
            
            {/* Si no hay imagen, mostrar inicial */}
            {!participant.image && (
              <text
                x="35"
                y="23"
                textAnchor="middle"
                fill="#64748b"
                fontSize="14"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {participant.name.charAt(0).toUpperCase()}
              </text>
            )}
          </g>
        </svg>
      </motion.div>
      
      {/* Nombre con efecto de peso */}
      <motion.p 
        className="text-xs text-slate-500 mt-1 font-medium text-center max-w-[80px] truncate"
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
  const startY = 20 + random(2) * 55
  
  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${startX}%`, top: `${startY}%` }}
      initial={{ opacity: 0, scale: 0, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.2, type: "spring" }}
    >
      {/* ════════ META MANIFESTADA (banner dorado flotando) ════════ */}
      <motion.div
        className="absolute -top-24 left-1/2 -translate-x-1/2 z-20"
        animate={{
          y: [0, -6, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Resplandor detrás */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-amber-400/60 via-yellow-300/70 to-orange-400/60 blur-xl rounded-full scale-150"
          animate={{
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Banner de la meta */}
        <div className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 px-4 py-2 rounded-2xl shadow-lg shadow-amber-500/50 border-2 border-yellow-300/50">
          <p className="text-[11px] font-black text-slate-900 max-w-[110px] text-center uppercase tracking-wide leading-tight">
            {participant.saltoQuantico || '¡LO LOGRÉ!'}
          </p>
        </div>
        
        {/* Destellos alrededor */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${-10 + Math.sin(i * 1.57) * 25}px`,
              left: `${50 + Math.cos(i * 1.57) * 45}%`,
            }}
            animate={{ 
              rotate: 360, 
              scale: [0.6, 1.2, 0.6],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
          >
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </motion.div>
        ))}
      </motion.div>

      {/* ════════ SILUETA VICTORIOSA ════════ */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -10, 0], // Saltando/flotando de alegría
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Aura dorada brillante */}
        <motion.div 
          className="absolute -inset-8 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.2) 50%, transparent 70%)'
          }}
          animate={{
            opacity: [0.5, 0.9, 0.5],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        
        {/* Rayos de luz detrás */}
        <motion.div
          className="absolute -inset-6 opacity-30"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 h-16 bg-gradient-to-t from-amber-400 to-transparent origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
              }}
            />
          ))}
        </motion.div>
        
        {/* ═══ SVG SILUETA VICTORIOSA ═══ */}
        <svg 
          width="80" 
          height="120" 
          viewBox="0 0 80 120" 
          className="drop-shadow-2xl relative z-10"
        >
          {/* Definir gradientes */}
          <defs>
            <linearGradient id={`lightGrad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id={`lightGradBright-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id={`glow-${index}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Clip path para la cabeza */}
            <clipPath id={`headClipLight-${index}`}>
              <circle cx="40" cy="18" r="14" />
            </clipPath>
          </defs>
          
          {/* Sombra dorada proyectada */}
          <ellipse 
            cx="40" 
            cy="118" 
            rx="18" 
            ry="4" 
            fill="rgba(251,191,36,0.3)"
          />
          
          {/* ═══ CUERPO EN POSE VICTORIOSA ═══ */}
          {/* Piernas firmes (pose de poder) */}
          <motion.g
            animate={{
              y: [0, -2, 0],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M32 85 L28 115 M48 85 L52 115"
              stroke={`url(#lightGrad-${index})`}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              filter={`url(#glow-${index})`}
            />
          </motion.g>
          
          {/* Torso erguido */}
          <path
            d="M40 42 Q35 50 33 65 Q31 78 40 85 Q49 78 47 65 Q45 50 40 42"
            fill={`url(#lightGrad-${index})`}
            filter={`url(#glow-${index})`}
          />
          
          {/* ═══ BRAZOS ARRIBA (VICTORIA) ═══ */}
          <motion.g
            animate={{
              rotate: [0, 3, -3, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: '40px 55px' }}
          >
            {/* Brazo izquierdo arriba */}
            <motion.path
              d="M33 52 Q20 35 15 15"
              stroke={`url(#lightGradBright-${index})`}
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              filter={`url(#glow-${index})`}
              animate={{
                d: [
                  "M33 52 Q20 35 15 15",
                  "M33 52 Q18 33 12 12",
                  "M33 52 Q20 35 15 15",
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Mano izquierda (puño) */}
            <motion.circle 
              cx="15" 
              cy="12" 
              r="5" 
              fill={`url(#lightGradBright-${index})`}
              filter={`url(#glow-${index})`}
              animate={{ cy: [12, 9, 12] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Brazo derecho arriba */}
            <motion.path
              d="M47 52 Q60 35 65 15"
              stroke={`url(#lightGradBright-${index})`}
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              filter={`url(#glow-${index})`}
              animate={{
                d: [
                  "M47 52 Q60 35 65 15",
                  "M47 52 Q62 33 68 12",
                  "M47 52 Q60 35 65 15",
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Mano derecha (puño) */}
            <motion.circle 
              cx="65" 
              cy="12" 
              r="5" 
              fill={`url(#lightGradBright-${index})`}
              filter={`url(#glow-${index})`}
              animate={{ cy: [12, 9, 12] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.g>
          
          {/* Cuello/Hombros erguidos */}
          <ellipse 
            cx="40" 
            cy="40" 
            rx="14" 
            ry="6" 
            fill={`url(#lightGrad-${index})`}
            filter={`url(#glow-${index})`}
          />
          
          {/* ═══ CABEZA CON FOTO (mirando arriba con orgullo) ═══ */}
          <g transform="translate(0, -2) rotate(5, 40, 18)">
            {/* Círculo dorado de fondo */}
            <circle 
              cx="40" 
              cy="18" 
              r="16" 
              fill={`url(#lightGradBright-${index})`}
              stroke="#fcd34d"
              strokeWidth="2"
              filter={`url(#glow-${index})`}
            />
            
            {/* Foto del participante (a todo color y brillante) */}
            {participant.image && (
              <g clipPath={`url(#headClipLight-${index})`}>
                <image
                  href={participant.image}
                  x="26"
                  y="4"
                  width="28"
                  height="28"
                  preserveAspectRatio="xMidYMid slice"
                  style={{ filter: 'brightness(1.15) saturate(1.2)' }}
                />
              </g>
            )}
            
            {/* Si no hay imagen, mostrar inicial */}
            {!participant.image && (
              <text
                x="40"
                y="23"
                textAnchor="middle"
                fill="#78350f"
                fontSize="16"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                {participant.name.charAt(0).toUpperCase()}
              </text>
            )}
          </g>
          
          {/* Corona sobre la cabeza */}
          <motion.g
            animate={{
              y: [0, -3, 0],
              rotate: [0, 3, -3, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: '40px -5px' }}
          >
            <path
              d="M28 -2 L32 -12 L36 -5 L40 -15 L44 -5 L48 -12 L52 -2 Z"
              fill="#fcd34d"
              stroke="#f59e0b"
              strokeWidth="1"
              filter={`url(#glow-${index})`}
            />
            {/* Gemas de la corona */}
            <circle cx="40" cy="-10" r="2" fill="#ef4444" />
            <circle cx="33" cy="-7" r="1.5" fill="#3b82f6" />
            <circle cx="47" cy="-7" r="1.5" fill="#22c55e" />
          </motion.g>
        </svg>
      </motion.div>
      
      {/* Nombre con gloria */}
      <motion.p 
        className="text-sm text-amber-300 mt-2 font-bold text-center max-w-[100px] truncate"
        animate={{ 
          textShadow: ["0 0 8px rgba(251,191,36,0.5)", "0 0 16px rgba(251,191,36,0.8)", "0 0 8px rgba(251,191,36,0.5)"]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {participant.name.split(' ')[0]}
      </motion.p>
      
      {/* Partículas de celebración */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: i % 2 === 0 ? '#fcd34d' : '#f59e0b',
            left: `${30 + random(i) * 40}%`,
            top: `${20 + random(i + 5) * 60}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, (random(i + 10) - 0.5) * 40, 0],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2 + random(i + 15),
            repeat: Infinity,
            delay: random(i + 20) * 2,
            ease: "easeOut"
          }}
        />
      ))}
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
