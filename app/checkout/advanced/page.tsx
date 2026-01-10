"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  CreditCard, 
  Building2, 
  Banknote, 
  Clock, 
  Check, 
  Shield, 
  ArrowLeft,
  Loader2,
  Rocket,
  Gift,
  AlertTriangle,
  Sparkles
} from "lucide-react"

type PaymentMethod = "card" | "transfer" | "cash"

interface PreRegistrationDetails {
  id: string
  user: {
    id: number
    nombre: string
    email: string
  }
  targetProduct: {
    id: number
    name: string
    startDate?: string
  }
  promoPrice: number
  regularPrice: number
  promoDeadline: string
  status: string
  countdownSeconds: number
}

function AdvancedCheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const preRegistrationId = searchParams?.get("preRegistration") || ""

  const [loading, setLoading] = useState(true)
  const [preReg, setPreReg] = useState<PreRegistrationDetails | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  // Cargar datos del pre-registro
  useEffect(() => {
    const fetchPreReg = async () => {
      if (!preRegistrationId) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/el-cruce/pre-registration?userId=me&status=PENDING`)
        if (res.ok) {
          const data = await res.json()
          const found = data.preRegistrations?.find((pr: any) => pr.id === preRegistrationId)
          if (found) {
            setPreReg(found)
            setCountdown(found.countdownSeconds || 0)
          }
        }
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreReg()
  }, [preRegistrationId])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return

    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [countdown > 0])

  // Formatear countdown
  const formatCountdown = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: secs.toString().padStart(2, "0")
    }
  }, [])

  // Precio actual (promo o regular según countdown)
  const currentPrice = countdown > 0 ? preReg?.promoPrice : preReg?.regularPrice
  const isPromoActive = countdown > 0

  // Procesar pago
  const handlePayment = async () => {
    if (!preReg) return

    setProcessing(true)
    
    try {
      // Aquí iría la integración real con Stripe/PayPal/etc.
      // Por ahora simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Marcar como pagado
      const res = await fetch("/api/el-cruce/pre-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preRegistrationId: preReg.id,
          status: "PAID",
          paymentAmount: currentPrice,
          paymentMethod
        })
      })

      if (res.ok) {
        setSuccess(true)
      }
    } catch (error) {
      console.error("Error en pago:", error)
    } finally {
      setProcessing(false)
    }
  }

  const time = formatCountdown(countdown)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (!preReg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Pre-registro no encontrado</h1>
        <p className="text-slate-400 mb-6">El enlace puede haber expirado o ser inválido.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-slate-800 text-white rounded-xl"
        >
          Volver al Dashboard
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900/30 to-emerald-900/30 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6"
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2 text-center"
        >
          ¡Pago Exitoso!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-green-400 text-lg mb-6 text-center"
        >
          Tu lugar en {preReg.targetProduct.name} está confirmado
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-4" />
          <p className="text-slate-400 text-center max-w-md">
            Recibirás un correo con los detalles de tu inscripción.
            ¡Prepárate para el siguiente nivel de tu transformación!
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => router.push("/dashboard")}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold"
        >
          Ir a mi Dashboard
        </motion.button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header con countdown */}
      {isPromoActive && (
        <motion.div
          className="bg-gradient-to-r from-amber-600 to-orange-600 py-3 px-4"
          initial={{ y: -50 }}
          animate={{ y: 0 }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <Clock className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Precio promocional expira en:</span>
            <div className="flex items-center gap-1">
              <div className="bg-black/30 px-2 py-1 rounded text-white font-mono font-bold">
                {time.hours}
              </div>
              <span className="text-white">:</span>
              <div className="bg-black/30 px-2 py-1 rounded text-white font-mono font-bold">
                {time.minutes}
              </div>
              <span className="text-white">:</span>
              <div className="bg-black/30 px-2 py-1 rounded text-white font-mono font-bold">
                {time.seconds}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Formulario de pago */}
          <div className="md:col-span-3 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                Método de Pago
              </h2>

              <div className="space-y-3">
                {/* Tarjeta */}
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === "card"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    paymentMethod === "card" ? "bg-amber-500" : "bg-slate-800"
                  }`}>
                    <CreditCard className={`w-5 h-5 ${
                      paymentMethod === "card" ? "text-white" : "text-slate-400"
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className={`font-medium ${
                      paymentMethod === "card" ? "text-white" : "text-slate-300"
                    }`}>
                      Tarjeta de Crédito/Débito
                    </p>
                    <p className="text-sm text-slate-500">Visa, Mastercard, Amex</p>
                  </div>
                  {paymentMethod === "card" && (
                    <Check className="w-5 h-5 text-amber-400" />
                  )}
                </button>

                {/* Transferencia */}
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === "transfer"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    paymentMethod === "transfer" ? "bg-amber-500" : "bg-slate-800"
                  }`}>
                    <Building2 className={`w-5 h-5 ${
                      paymentMethod === "transfer" ? "text-white" : "text-slate-400"
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className={`font-medium ${
                      paymentMethod === "transfer" ? "text-white" : "text-slate-300"
                    }`}>
                      Transferencia Bancaria
                    </p>
                    <p className="text-sm text-slate-500">SPEI - Recibe datos al continuar</p>
                  </div>
                  {paymentMethod === "transfer" && (
                    <Check className="w-5 h-5 text-amber-400" />
                  )}
                </button>

                {/* Efectivo */}
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    paymentMethod === "cash"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    paymentMethod === "cash" ? "bg-amber-500" : "bg-slate-800"
                  }`}>
                    <Banknote className={`w-5 h-5 ${
                      paymentMethod === "cash" ? "text-white" : "text-slate-400"
                    }`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className={`font-medium ${
                      paymentMethod === "cash" ? "text-white" : "text-slate-300"
                    }`}>
                      Efectivo
                    </p>
                    <p className="text-sm text-slate-500">Paga en OXXO o 7-Eleven</p>
                  </div>
                  {paymentMethod === "cash" && (
                    <Check className="w-5 h-5 text-amber-400" />
                  )}
                </button>
              </div>

              {/* Formulario de tarjeta */}
              {paymentMethod === "card" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Número de tarjeta
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Vencimiento
                      </label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Seguridad */}
            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <Shield className="w-5 h-5" />
              <span>Pago seguro con encriptación SSL de 256 bits</span>
            </div>
          </div>

          {/* Resumen de compra */}
          <div className="md:col-span-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{preReg.targetProduct.name}</h3>
                  <p className="text-sm text-slate-400">Pre-registro confirmado</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-400">
                  <span>Precio regular</span>
                  <span className={isPromoActive ? "line-through" : ""}>
                    ${preReg.regularPrice.toLocaleString()}
                  </span>
                </div>
                
                {isPromoActive && (
                  <div className="flex justify-between text-green-400">
                    <span className="flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      Descuento promocional
                    </span>
                    <span>-${(preReg.regularPrice - preReg.promoPrice).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4 mb-6">
                <div className="flex justify-between items-end">
                  <span className="text-white font-medium">Total a pagar</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">
                      ${currentPrice?.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">MXN</p>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pagar ${currentPrice?.toLocaleString()}
                  </>
                )}
              </motion.button>

              <p className="text-xs text-slate-500 text-center mt-4">
                Al continuar aceptas los términos y condiciones del servicio
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrapper con Suspense
export default function AdvancedCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    }>
      <AdvancedCheckoutContent />
    </Suspense>
  )
}
