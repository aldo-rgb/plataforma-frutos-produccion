"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Zap, 
  Play, 
  Pause, 
  StopCircle, 
  QrCode, 
  Monitor,
  Users,
  Settings,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Crown,
  Rocket
} from "lucide-react"

interface CrossingSession {
  id: string
  productId: number
  targetLevel: string
  status: string
  totalParticipants: number
  crossedCount: number
  startedAt?: string
  product: {
    id: number
    name: string
    levelType: string
  }
}

interface Product {
  id: number
  name: string
  levelType: string
  startDate?: string
  endDate?: string
}

interface Props {
  currentProductId: number
  products: Product[]
}

export default function ElCruceControlWidget({ currentProductId, products }: Props) {
  const [session, setSession] = useState<CrossingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  
  // Setup state
  const [targetLevel, setTargetLevel] = useState<"ADVANCED" | "PL">("ADVANCED")
  const [targetProductId, setTargetProductId] = useState<number | null>(null)

  // Buscar sesión activa
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/el-cruce/session?productId=${currentProductId}`)
        if (res.ok) {
          const data = await res.json()
          setSession(data.session)
        }
      } catch (error) {
        console.error("Error fetching session:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
    
    // Polling cada 5 segundos si hay sesión activa
    const interval = setInterval(() => {
      if (session?.status === "ACTIVE") {
        fetchSession()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [currentProductId, session?.status])

  // Crear nueva sesión
  const handleCreateSession = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/el-cruce/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: currentProductId,
          targetLevel,
          targetProductId
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
        setShowSetup(false)
      }
    } catch (error) {
      console.error("Error creating session:", error)
    } finally {
      setCreating(false)
    }
  }

  // Cambiar estado de sesión
  const handleChangeStatus = async (newStatus: string) => {
    if (!session) return

    try {
      const res = await fetch("/api/el-cruce/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          status: newStatus
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
      }
    } catch (error) {
      console.error("Error updating session:", error)
    }
  }

  // Copiar URL
  const copyUrl = (type: "display" | "staff") => {
    if (!session) return
    
    const baseUrl = window.location.origin
    const url = type === "display" 
      ? `${baseUrl}/el-cruce/${session.id}`
      : `${baseUrl}/staff/scan/${session.id}`
    
    navigator.clipboard.writeText(url)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // Productos ADVANCED y PL disponibles
  const advancedProducts = products.filter(p => p.levelType === "ADVANCED")
  const plProducts = products.filter(p => p.levelType === "PL")
  const targetProducts = targetLevel === "ADVANCED" ? advancedProducts : plProducts

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-amber-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">El Cruce</h3>
            <p className="text-xs text-amber-400/60">Pre-registro en tiempo real</p>
          </div>
        </div>
        
        {session && (
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            session.status === "ACTIVE" 
              ? "bg-green-500/20 text-green-400 animate-pulse" 
              : session.status === "PAUSED"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-slate-700 text-slate-400"
          }`}>
            {session.status === "ACTIVE" ? "🔴 EN VIVO" : 
             session.status === "PAUSED" ? "⏸️ PAUSADO" :
             session.status === "WAITING" ? "⏳ LISTO" : session.status}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        {!session ? (
          // No hay sesión - Mostrar botón de crear
          <AnimatePresence mode="wait">
            {showSetup ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-amber-400/80 mb-2">
                    Nivel destino
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTargetLevel("ADVANCED")}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        targetLevel === "ADVANCED"
                          ? "bg-purple-500/30 border-2 border-purple-500 text-purple-300"
                          : "bg-slate-800 border-2 border-transparent text-slate-400"
                      }`}
                    >
                      <Rocket className="w-4 h-4" />
                      Avanzado
                    </button>
                    <button
                      onClick={() => setTargetLevel("PL")}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        targetLevel === "PL"
                          ? "bg-amber-500/30 border-2 border-amber-500 text-amber-300"
                          : "bg-slate-800 border-2 border-transparent text-slate-400"
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      Liderato
                    </button>
                  </div>
                </div>

                {targetProducts.length > 0 && (
                  <div>
                    <label className="block text-sm text-amber-400/80 mb-2">
                      Producto específico (opcional)
                    </label>
                    <select
                      value={targetProductId || ""}
                      onChange={(e) => setTargetProductId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Auto-detectar próximo</option>
                      {targetProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSetup(false)}
                    className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateSession}
                    disabled={creating}
                    className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Crear Sesión
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSetup(true)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                <Zap className="w-5 h-5" />
                Iniciar El Cruce
              </motion.button>
            )}
          </AnimatePresence>
        ) : (
          // Sesión activa - Mostrar controles
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-3xl font-bold text-amber-400">{session.crossedCount}</p>
                <p className="text-xs text-slate-400">Cruzaron</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-3xl font-bold text-slate-400">{session.totalParticipants - session.crossedCount}</p>
                <p className="text-xs text-slate-400">Restantes</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="relative">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${session.totalParticipants > 0 
                      ? (session.crossedCount / session.totalParticipants) * 100 
                      : 0}%` 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-center text-slate-500 mt-1">
                {session.totalParticipants > 0 
                  ? Math.round((session.crossedCount / session.totalParticipants) * 100)
                  : 0}% completado
              </p>
            </div>

            {/* Controles de sesión */}
            <div className="flex gap-2">
              {session.status === "WAITING" && (
                <button
                  onClick={() => handleChangeStatus("ACTIVE")}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Iniciar
                </button>
              )}
              
              {session.status === "ACTIVE" && (
                  <button
                    onClick={() => handleChangeStatus("COMPLETED")}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    Terminar
                  </button>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500">Enlaces rápidos</p>
              
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-500" />
                <span className="flex-1 text-sm text-slate-400 truncate">
                  Pantalla gigante
                </span>
                <button
                  onClick={() => copyUrl("display")}
                  className="p-1.5 hover:bg-slate-800 rounded"
                >
                  {copied === "display" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <a
                  href={`/el-cruce/${session.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-slate-800 rounded"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-slate-500" />
                <span className="flex-1 text-sm text-slate-400 truncate">
                  App Staff (escaneo)
                </span>
                <button
                  onClick={() => copyUrl("staff")}
                  className="p-1.5 hover:bg-slate-800 rounded"
                >
                  {copied === "staff" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
                <a
                  href={`/staff/scan/${session.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-slate-800 rounded"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
