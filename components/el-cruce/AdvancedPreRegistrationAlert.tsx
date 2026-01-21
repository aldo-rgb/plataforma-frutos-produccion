"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { io, Socket } from "socket.io-client"
import { 
  Rocket, 
  Clock, 
  CreditCard, 
  X, 
  Sparkles,
  AlertTriangle,
  Check,
  ArrowRight,
  Zap,
  Gift
} from "lucide-react"

interface PreRegistrationData {
  preRegistrationId: string
  targetProductName: string
  promoPrice: number
  regularPrice: number
  promoDeadline: string
  countdown: number // segundos restantes
}

interface Props {
  userId: string
  onPayClick?: (preRegistrationId: string) => void
}

export default function AdvancedPreRegistrationAlert({ userId, onPayClick }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [preRegistration, setPreRegistration] = useState<PreRegistrationData | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  // Cargar pre-registros existentes al montar
  useEffect(() => {
    const fetchPreRegistrations = async () => {
      try {
        const res = await fetch(`/api/el-cruce/pre-registration?userId=${userId}&status=PENDING`)
        if (res.ok) {
          const data = await res.json()
          if (data.preRegistrations && data.preRegistrations.length > 0) {
            const pr = data.preRegistrations[0]
            setPreRegistration({
              preRegistrationId: pr.id,
              targetProductName: pr.targetProduct.name,
              promoPrice: pr.promoPrice,
              regularPrice: pr.regularPrice,
              promoDeadline: pr.promoDeadline,
              countdown: pr.countdownSeconds || 0
            })
            setCountdown(pr.countdownSeconds || 0)
          }
        }
      } catch (error) {
        console.error("Error fetching pre-registrations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreRegistrations()
  }, [userId])

  // Conectar Socket.IO para recibir alertas en tiempo real
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "wss://socket.quantummatter.app"
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"]
    })

    newSocket.on("connect", () => {
      newSocket.emit("join_user_room", userId)
    })

    // Recibir alerta de pre-registro
    newSocket.on("pre_registration_alert", (data: PreRegistrationData) => {
      setPreRegistration(data)
      setCountdown(data.countdown)
      setDismissed(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [userId])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [countdown > 0])

  // Formatear countdown
  const formatCountdown = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`
    }
    return `${minutes.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`
  }, [])

  // Calcular si es urgente (menos de 2 horas)
  const isUrgent = countdown < 7200 && countdown > 0
  const isExpired = countdown <= 0 && preRegistration

  // Manejar click en pagar
  const handlePayClick = () => {
    if (preRegistration && onPayClick) {
      onPayClick(preRegistration.preRegistrationId)
    } else if (preRegistration) {
      // Navegar a página de pago
      window.location.href = `/checkout/advanced?preRegistration=${preRegistration.preRegistrationId}`
    }
  }

  if (loading || !preRegistration || dismissed) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={`relative overflow-hidden rounded-2xl ${
          isExpired 
            ? "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700"
            : isUrgent
              ? "bg-gradient-to-br from-red-900/50 to-orange-900/50 border border-red-500/50"
              : "bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/40"
        }`}
      >
        {/* Efecto de partículas */}
        {!isExpired && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-amber-400/40 rounded-full"
                initial={{ 
                  x: Math.random() * 100 + "%",
                  y: "100%",
                  opacity: 0
                }}
                animate={{
                  y: "-10%",
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.5,
                  repeat: Infinity
                }}
              />
            ))}
          </div>
        )}

        {/* Botón cerrar */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              className={`p-3 rounded-xl ${
                isExpired 
                  ? "bg-slate-700"
                  : "bg-gradient-to-br from-amber-500 to-orange-500"
              }`}
              animate={!isExpired ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isExpired ? (
                <AlertTriangle className="w-6 h-6 text-slate-400" />
              ) : (
                <Rocket className="w-6 h-6 text-white" />
              )}
            </motion.div>
            
            <div className="flex-1">
              <motion.h3 
                className={`text-xl font-bold ${isExpired ? "text-slate-400" : "text-white"}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {isExpired 
                  ? "Promoción expirada"
                  : "¡Felicidades! Has elegido transformarte"
                }
              </motion.h3>
              <p className={`text-sm ${isExpired ? "text-slate-500" : "text-amber-400/80"}`}>
                {preRegistration.targetProductName}
              </p>
            </div>
          </div>

          {!isExpired && (
            <>
              {/* Countdown */}
              <motion.div
                className={`rounded-xl p-4 mb-4 ${
                  isUrgent 
                    ? "bg-red-500/20 border border-red-500/40"
                    : "bg-black/30"
                }`}
                animate={isUrgent ? {
                  borderColor: ["rgba(239, 68, 68, 0.4)", "rgba(239, 68, 68, 0.8)", "rgba(239, 68, 68, 0.4)"]
                } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${isUrgent ? "text-red-400" : "text-amber-400"}`} />
                    <span className={`text-sm font-medium ${isUrgent ? "text-red-400" : "text-amber-400"}`}>
                      Tu precio promocional expira en:
                    </span>
                  </div>
                </div>
                
                <motion.p 
                  className={`text-3xl font-mono font-bold mt-2 ${
                    isUrgent ? "text-red-400" : "text-white"
                  }`}
                  key={countdown}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  {formatCountdown(countdown)}
                </motion.p>
              </motion.div>

              {/* Precios */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm text-slate-400 line-through">
                    Precio regular: ${preRegistration.regularPrice.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-400" />
                    <p className="text-lg text-green-400 font-bold">
                      Tu precio: ${preRegistration.promoPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-slate-500">Ahorras</p>
                  <p className="text-lg font-bold text-green-400">
                    ${(preRegistration.regularPrice - preRegistration.promoPrice).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Botón de pago */}
              <motion.button
                onClick={handlePayClick}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  isUrgent
                    ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/30"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CreditCard className="w-5 h-5" />
                PAGAR AHORA - ${preRegistration.promoPrice.toLocaleString()}
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              {/* Métodos de pago */}
              <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-500">
                <span>💳 Tarjeta</span>
                <span>•</span>
                <span>🏦 Transferencia</span>
                <span>•</span>
                <span>💰 Efectivo</span>
              </div>
            </>
          )}

          {/* Estado expirado */}
          {isExpired && (
            <div className="text-center py-4">
              <p className="text-slate-400 mb-4">
                El periodo de promoción ha terminado. Aún puedes inscribirte al precio regular.
              </p>
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-slate-500 line-through">
                  ${preRegistration.promoPrice.toLocaleString()}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-600" />
                <span className="text-xl font-bold text-white">
                  ${preRegistration.regularPrice.toLocaleString()}
                </span>
              </div>
              <button
                onClick={handlePayClick}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
              >
                Continuar al pago
              </button>
            </div>
          )}
        </div>

        {/* Barra de urgencia inferior */}
        {!isExpired && isUrgent && (
          <motion.div
            className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-[length:200%_100%]"
            animate={{ backgroundPosition: ["0% 0%", "100% 0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
