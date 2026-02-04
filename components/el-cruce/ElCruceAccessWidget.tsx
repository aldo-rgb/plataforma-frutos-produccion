"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Zap, 
  Play, 
  Pause, 
  StopCircle, 
  QrCode, 
  Monitor,
  Users,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Crown,
  Rocket,
  Scan,
  Eye,
  Settings,
  ChevronDown,
  ChevronUp,
  Radio,
  History,
  X,
  Calendar,
  TrendingUp,
  Clock,
  FileText
} from "lucide-react"
import TopFileModal from "./TopFileModal"

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
    visionId?: number
  }
  targetProduct?: {
    id: number
    name: string
  }
}

interface Product {
  id: number
  name: string
  levelType: string
  startDate?: string
  endDate?: string
  visionId?: number
  trainingStatus?: string
}

// Props opcionales - el widget puede funcionar sin ellas
interface Props {
  userRole?: string
  organizationId?: number
  products?: Product[]
  currentProductId?: number
  trainerLevel?: 'BASIC' | 'ADVANCED' | 'PL' | null // Nivel asignado al trainer
}

export default function ElCruceAccessWidget({ 
  userRole: propUserRole, 
  organizationId: propOrgId,
  products: propProducts = [],
  currentProductId,
  trainerLevel: propTrainerLevel
}: Props) {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<CrossingSession[]>([])
  const [products, setProducts] = useState<Product[]>(propProducts)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Estado para historial
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Estado para participantes pendientes de cruzar
  const [showParticipantesModal, setShowParticipantesModal] = useState(false)
  const [participantesPendientes, setParticipantesPendientes] = useState<any[]>([])
  const [loadingParticipantes, setLoadingParticipantes] = useState(false)
  const [participantesCount, setParticipantesCount] = useState(0)
  
  // Estado para TOP FILE modal
  const [showTopFile, setShowTopFile] = useState(false)
  const [selectedUserForTopFile, setSelectedUserForTopFile] = useState<{ id: number; nombre: string } | null>(null)
  
  // Setup state para crear sesión
  const [selectedProductId, setSelectedProductId] = useState<number | null>(currentProductId || null)
  // Si el trainer es de ADVANCED, el destino es PL (Tu Vida)
  // Si es de BASIC, el destino es ADVANCED
  const [targetLevel, setTargetLevel] = useState<"ADVANCED" | "PL">(propTrainerLevel === 'ADVANCED' ? "PL" : "ADVANCED")
  const [targetProductId, setTargetProductId] = useState<number | null>(null)

  // Obtener rol y organizationId desde sesión o props
  const userRole = propUserRole || session?.user?.rol || ''
  const organizationId = propOrgId || session?.user?.organizationId

  // Roles que pueden crear/controlar sesiones (incluye coordinadores y trainers)
  const canControl = [
    'COORDINADOR', 
    'COORDINATOR_BASIC', 
    'COORDINATOR_ADVANCED', 
    'TRAINER',
    'ADMINISTRADOR',
    'SCHOOL_ADMIN'
  ].includes(userRole)

  // Roles que pueden escanear
  const canScan = canControl || ['GAMECHANGER', 'MENTOR'].includes(userRole)

  // Obtener productos activos si no se pasaron como prop
  useEffect(() => {
    const fetchProducts = async () => {
      if (propProducts.length > 0) return // Ya tenemos productos
      
      try {
        const res = await fetch('/api/coordinador/productos-activos')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.productos) {
            setProducts(data.productos.map((p: any) => ({
              id: p.id,
              name: p.name,
              levelType: p.levelType,
              startDate: p.startDate,
              endDate: p.endDate,
              visionId: p.visionId,
              trainingStatus: p.trainingStatus
            })))
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error)
      }
    }

    if (canControl) {
      fetchProducts()
    }
  }, [canControl, propProducts.length])

  // Buscar sesiones activas
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Buscar sesiones activas de la organización
        const url = organizationId 
          ? `/api/el-cruce/session?organizationId=${organizationId}&active=true`
          : `/api/el-cruce/session?active=true`
        
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
        }
      } catch (error) {
        console.error("Error fetching sessions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
    
    // Polling cada 10 segundos
    const interval = setInterval(fetchSessions, 10000)
    return () => clearInterval(interval)
  }, [organizationId])

  // Crear nueva sesión
  const handleCreateSession = async () => {
    if (!selectedProductId) {
      console.error("No hay producto seleccionado")
      return
    }
    
    setCreating(true)
    setCreateError(null)
    try {
      console.log("Creando sesión con:", { productId: selectedProductId, targetLevel, targetProductId })
      
      const res = await fetch("/api/el-cruce/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          targetLevel,
          targetProductId
        })
      })

      const data = await res.json()
      console.log("Respuesta del servidor:", data)

      if (res.ok) {
        setSessions(prev => [data.session, ...prev])
        setShowCreateModal(false)
        setCreateError(null)
      } else {
        console.error("Error del servidor:", data.error)
        setCreateError(data.error || "Error al crear sesión")
      }
    } catch (error) {
      console.error("Error creating session:", error)
      setCreateError("Error de conexión al crear sesión")
    } finally {
      setCreating(false)
    }
  }

  // Cambiar estado de sesión
  const handleChangeStatus = async (sessionId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/el-cruce/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          status: newStatus
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? data.session : s
        ))
      }
    } catch (error) {
      console.error("Error updating session:", error)
    }
  }

  // Copiar URL - diferente ruta según el nivel destino
  const copyUrl = (sessionId: string, type: "display" | "staff", targetLevel?: string) => {
    const baseUrl = window.location.origin
    // Si el destino es PL (Tu Vida), usar la pantalla especial
    const displayPath = targetLevel === "PL" 
      ? `${baseUrl}/el-cruce/${sessionId}/tu-vida`
      : `${baseUrl}/el-cruce/${sessionId}`
    
    const url = type === "display" 
      ? displayPath
      : `${baseUrl}/staff/scan/${sessionId}`
    
    navigator.clipboard.writeText(url)
    setCopied(`${sessionId}-${type}`)
    setTimeout(() => setCopied(null), 2000)
  }

  // Cargar historial de sesiones
  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const params = new URLSearchParams()
      if (organizationId) params.append('organizationId', String(organizationId))
      
      const res = await fetch(`/api/el-cruce/historial?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setHistoryData(data.sessions)
        }
      }
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Abrir modal de historial
  const openHistoryModal = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setShowHistoryModal(true)
    fetchHistory()
  }

  // Cargar participantes pendientes de cruzar (sin pre-registro)
  const fetchParticipantesPendientes = async () => {
    setLoadingParticipantes(true)
    try {
      const params = new URLSearchParams()
      if (organizationId) params.append('organizationId', String(organizationId))
      
      // Si hay una sesión activa, filtrar solo por su visionId
      const activeSession = sessions.find(s => ['WAITING', 'ACTIVE', 'PAUSED'].includes(s.status))
      if (activeSession?.product?.visionId) {
        params.append('visionId', String(activeSession.product.visionId))
      }
      
      const res = await fetch(`/api/el-cruce/participantes-pendientes?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setParticipantesPendientes(data.participantes || [])
        setParticipantesCount(data.stats?.sinCruzar || 0)
      }
    } catch (error) {
      console.error("Error fetching participantes pendientes:", error)
    } finally {
      setLoadingParticipantes(false)
    }
  }

  // Cargar contador de participantes pendientes al inicio
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const params = new URLSearchParams()
        if (organizationId) params.append('organizationId', String(organizationId))
        
        // Si hay una sesión activa, filtrar solo por su visionId
        const activeSession = sessions.find(s => ['WAITING', 'ACTIVE', 'PAUSED'].includes(s.status))
        if (activeSession?.product?.visionId) {
          params.append('visionId', String(activeSession.product.visionId))
        }
        
        const res = await fetch(`/api/el-cruce/participantes-pendientes?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setParticipantesCount(data.stats?.sinCruzar || 0)
        }
      } catch (error) {
        console.error("Error fetching participantes count:", error)
      }
    }
    fetchCount()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [organizationId, sessions])

  // Abrir modal de participantes pendientes
  const openParticipantesModal = () => {
    setShowParticipantesModal(true)
    fetchParticipantesPendientes()
  }

  // Abrir TOP FILE de un usuario
  const openTopFile = (userId: number, userName: string) => {
    setSelectedUserForTopFile({ id: userId, nombre: userName })
    setShowTopFile(true)
  }

  // Productos para crear sesión - solo los que están EN CURSO (IN_PROGRESS)
  // Un trainer solo puede tener un entrenamiento activo a la vez
  
  // Filtrar productos que están IN_PROGRESS (sin importar el nivel)
  // El trainer solo puede tener El Atravesar para entrenamientos activos
  const productsInProgress = products.filter(p => p.trainingStatus === 'IN_PROGRESS')
  
  // Productos por nivel (todos IN_PROGRESS)
  const basicProducts = productsInProgress.filter(p => p.levelType === 'BASIC')
  const advancedProducts = productsInProgress.filter(p => p.levelType === 'ADVANCED')
  const plProducts = productsInProgress.filter(p => p.levelType === 'PL')

  // Auto-detectar el producto en curso del trainer
  // Un trainer típicamente tiene UN producto asignado activo
  const productInProgress = productsInProgress.length > 0 ? productsInProgress[0] : null
  
  // Auto-determinar el nivel destino basado en el producto origen
  const autoTargetLevel = productInProgress?.levelType === 'BASIC' ? 'ADVANCED' : 'PL'

  // Auto-seleccionar el producto en curso cuando se carguen los productos
  useEffect(() => {
    if (!selectedProductId && productsInProgress.length > 0) {
      // Seleccionar el único/primer producto IN_PROGRESS
      setSelectedProductId(productsInProgress[0].id)
      // Actualizar el nivel destino según el producto
      const level = productsInProgress[0].levelType
      setTargetLevel(level === 'BASIC' ? 'ADVANCED' : 'PL')
    }
  }, [selectedProductId, productsInProgress])

  // Auto-seleccionar producto destino basado en la visión del producto origen
  useEffect(() => {
    if (!selectedProductId) {
      setTargetProductId(null)
      return
    }

    const selectedProduct = products.find(p => p.id === selectedProductId)
    if (!selectedProduct?.visionId) {
      setTargetProductId(null)
      return
    }

    // Buscar el producto destino de la misma visión
    const targetLevelProducts = targetLevel === "ADVANCED" ? advancedProducts : plProducts
    const sameVisionProduct = targetLevelProducts.find(p => p.visionId === selectedProduct.visionId)
    
    if (sameVisionProduct) {
      setTargetProductId(sameVisionProduct.id)
    } else {
      setTargetProductId(null)
    }
  }, [selectedProductId, targetLevel, products])

  // Productos destino filtrados por la misma visión (para mostrar en dropdown)
  const selectedProduct = products.find(p => p.id === selectedProductId)
  const targetProducts = (targetLevel === "ADVANCED" ? advancedProducts : plProducts)
    .filter(p => !selectedProduct?.visionId || p.visionId === selectedProduct.visionId)
  const targetProductSelected = targetProducts.find(p => p.id === targetProductId)

  // Sesiones activas (EN VIVO o LISTO)
  const activeSessions = sessions.filter(s => ['ACTIVE', 'WAITING', 'PAUSED'].includes(s.status))

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
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
      <div className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1"
        >
          <div className="p-2 bg-amber-500/20 rounded-lg relative">
            <Zap className="w-5 h-5 text-amber-400" />
            {activeSessions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white flex items-center gap-2">
              El Atravesar
              {activeSessions.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full animate-pulse">
                  {activeSessions.length} activa{activeSessions.length > 1 ? 's' : ''}
                </span>
              )}
              {participantesCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                  {participantesCount} sin avanzar
                </span>
              )}
            </h3>
            <p className="text-xs text-amber-400/60">
              {canScan ? 'Escanea gafetes en tiempo real' : 'Pre-registro avanzado'}
            </p>
          </div>
        </button>
        
        <div className="flex items-center gap-2">
          {/* Botón de historial - solo SCHOOL_ADMIN y TRAINER */}
          {['SCHOOL_ADMIN', 'TRAINER'].includes(userRole) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openHistoryModal();
              }}
              className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"
              title="Ver historial"
            >
              <History className="w-5 h-5 text-amber-400" />
            </button>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Contenido expandible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Sesiones activas */}
              {activeSessions.length > 0 ? (
                <div className="space-y-3">
                  {activeSessions.map(session => (
                    <div 
                      key={session.id}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                    >
                      {/* Header de sesión */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-white text-sm">
                            {session.product.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            → {session.targetProduct?.name || session.targetLevel}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.status === "ACTIVE" 
                            ? "bg-green-500/20 text-green-400" 
                            : session.status === "PAUSED"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-slate-700 text-slate-400"
                        }`}>
                          {session.status === "ACTIVE" ? (
                            <span className="flex items-center gap-1">
                              <Radio className="w-3 h-3 animate-pulse" />
                              EN VIVO
                            </span>
                          ) : session.status === "PAUSED" ? "⏸️ PAUSADO" : "⏳ LISTO"}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-bold">{session.crossedCount}</span>
                          <span className="text-slate-500 text-sm">cruzaron</span>
                        </div>
                        {session.totalParticipants > 0 && (
                          <div className="flex-1">
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                                style={{ 
                                  width: `${(session.crossedCount / session.totalParticipants) * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2">
                        {/* Botón para escanear (Staff) */}
                        {canScan && session.status === "ACTIVE" && (
                          <a
                            href={`/staff/scan/${session.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-colors"
                          >
                            <Scan className="w-4 h-4" />
                            Escanear
                          </a>
                        )}

                        {/* Botón para ver pantalla */}
                        <a
                          href={session.targetLevel === 'PL' 
                            ? `/el-cruce/${session.id}/tu-vida` 
                            : `/el-cruce/${session.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-slate-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Pantalla
                        </a>
                      </div>

                      {/* Controles para coordinadores */}
                      {canControl && (
                        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                          {/* Botones de control */}
                          <div className="flex gap-2">
                            {session.status === "WAITING" && (
                              <button
                                onClick={() => handleChangeStatus(session.id, "ACTIVE")}
                                className="flex-1 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-green-500/30"
                              >
                                <Play className="w-3 h-3" />
                                Iniciar
                              </button>
                            )}
                            
                            {session.status === "ACTIVE" && (
                                <button
                                  onClick={() => handleChangeStatus(session.id, "COMPLETED")}
                                  className="flex-1 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-red-500/30"
                                >
                                  <StopCircle className="w-3 h-3" />
                                  Terminar
                                </button>
                            )}
                          </div>

                          {/* Links para copiar */}
                          <div className="flex gap-2 text-xs">
                            <button
                              onClick={() => copyUrl(session.id, "staff", session.targetLevel)}
                              className="flex-1 py-1.5 bg-slate-800 rounded flex items-center justify-center gap-1 text-slate-400 hover:text-white transition-colors"
                            >
                              {copied === `${session.id}-staff` ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              Link Staff
                            </button>
                            <button
                              onClick={() => copyUrl(session.id, "display", session.targetLevel)}
                              className="flex-1 py-1.5 bg-slate-800 rounded flex items-center justify-center gap-1 text-slate-400 hover:text-white transition-colors"
                            >
                              {copied === `${session.id}-display` ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              Link Pantalla
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // No hay sesiones activas
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 bg-slate-800 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm mb-1">No hay sesiones activas</p>
                  <p className="text-slate-500 text-xs">
                    {canControl 
                      ? 'Crea una sesión para empezar El Atravezar'
                      : 'Espera a que un coordinador inicie El Atravezar'}
                  </p>
                </div>
              )}

              {/* Contador de participantes sin cruzar - siempre visible */}
              <button
                onClick={openParticipantesModal}
                className={`w-full p-3 rounded-xl transition-all ${
                  participantesCount > 0
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30'
                    : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      participantesCount > 0 ? 'bg-amber-500/30' : 'bg-slate-700'
                    }`}>
                      <Users className={`w-5 h-5 ${participantesCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${participantesCount > 0 ? 'text-white' : 'text-slate-400'}`}>
                        {participantesCount > 0 ? 'Participantes sin avanzar' : 'Ver participantes'}
                      </p>
                      <p className={`text-xs ${participantesCount > 0 ? 'text-amber-400/70' : 'text-slate-500'}`}>
                        {participantesCount > 0 ? 'Aún no eligen avanzar' : 'No hay participantes pendientes'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${participantesCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                      {participantesCount}
                    </span>
                    <ChevronDown className={`w-4 h-4 ${participantesCount > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
                  </div>
                </div>
              </button>

              {/* Botón crear sesión (solo coordinadores) */}
              {canControl && (
                <AnimatePresence mode="wait">
                  {showCreateModal ? (
                    <motion.div
                      key="create-form"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-5 space-y-4 border border-amber-500/40 shadow-xl shadow-amber-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-lg text-white flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <Settings className="w-4 h-4 text-white" />
                          </div>
                          Nueva Sesión de El Atravezar
                        </h4>
                        <button 
                          onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>

                      {/* Mensaje de error */}
                      {createError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 flex items-start gap-3"
                        >
                          <div className="w-6 h-6 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-3 h-3 text-red-400" />
                          </div>
                          <div>
                            <p className="text-red-300 text-sm font-medium">Error al crear sesión</p>
                            <p className="text-red-400/80 text-xs mt-0.5">{createError}</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Resumen de la sesión a crear */}
                      <div className="space-y-4">
                        {/* Producto origen (auto-detectado) */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Producto en curso</p>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${selectedProduct?.levelType === 'ADVANCED' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                              <Rocket className={`w-5 h-5 ${selectedProduct?.levelType === 'ADVANCED' ? 'text-purple-400' : 'text-blue-400'}`} />
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {selectedProduct?.name || 'No hay entrenamientos en curso'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {selectedProduct?.levelType === 'ADVANCED' ? 'Nivel Avanzado' : selectedProduct?.levelType === 'PL' ? 'Nivel Liderato' : 'Nivel Básico'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Selector solo si hay múltiples productos IN_PROGRESS */}
                          {productsInProgress.length > 1 && (
                            <select
                              value={selectedProductId || ""}
                              onChange={(e) => {
                                const newId = parseInt(e.target.value)
                                setSelectedProductId(newId)
                                const prod = products.find(p => p.id === newId)
                                if (prod) {
                                  setTargetLevel(prod.levelType === 'BASIC' ? 'ADVANCED' : 'PL')
                                }
                              }}
                              className="mt-3 w-full px-3 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              {productsInProgress.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Flecha de transición */}
                        <div className="flex justify-center">
                          <div className="flex flex-col items-center">
                            <div className="w-px h-4 bg-gradient-to-b from-slate-700 to-amber-500/50" />
                            <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-xs text-amber-400 mt-1 font-medium">El Atravesar</p>
                            <div className="w-px h-4 bg-gradient-to-b from-amber-500/50 to-slate-700" />
                          </div>
                        </div>

                        {/* Producto destino (auto-detectado) */}
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/30">
                          <p className="text-xs text-amber-600 uppercase tracking-wider mb-2">Destino</p>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                              <Crown className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {targetProductSelected?.name || (targetLevel === 'PL' ? 'Tu Vida (Liderato)' : 'Avanzado')}
                              </p>
                              <p className="text-xs text-amber-400">
                                {targetLevel === 'PL' ? 'Nivel Tu Vida' : 'Nivel Avanzado'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botones */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setShowCreateModal(false)}
                          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCreateSession}
                          disabled={creating || !selectedProductId}
                          className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30 transition-all"
                        >
                          {creating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Zap className="w-5 h-5" />
                          )}
                          Crear
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="create-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowCreateModal(true)}
                      className="w-full py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-medium flex items-center justify-center gap-2 hover:from-amber-500/30 hover:to-orange-500/30 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Crear Nuevo Breakthrough
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Historial */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <History className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Historial de El Atravezar</h3>
                    <p className="text-xs text-slate-400">Sesiones anteriores</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Contenido del historial */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-800/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <History className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400">No hay sesiones en el historial</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.map((session: any) => {
                      const percentage = session.totalParticipants > 0 
                        ? Math.round((session.crossedCount / session.totalParticipants) * 100) 
                        : 0
                      const statusColors: Record<string, string> = {
                        'COMPLETED': 'bg-green-500/20 text-green-400 border-green-500/30',
                        'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/30',
                        'ACTIVE': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                        'PAUSED': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                        'WAITING': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      }
                      const statusLabels: Record<string, string> = {
                        'COMPLETED': 'Completada',
                        'CANCELLED': 'Cancelada',
                        'ACTIVE': 'Activa',
                        'PAUSED': 'Pausada',
                        'WAITING': 'En espera',
                      }

                      return (
                        <div
                          key={session.id}
                          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-white text-sm">
                                {session.product?.name || 'Producto desconocido'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-400">
                                  {new Date(session.createdAt).toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[session.status] || 'bg-slate-600/20 text-slate-400'}`}>
                              {statusLabels[session.status] || session.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-slate-700/30 rounded-lg p-2">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Users className="w-3 h-3 text-slate-400" />
                              </div>
                              <p className="text-lg font-bold text-white">{session.totalParticipants}</p>
                              <p className="text-xs text-slate-500">Participantes</p>
                            </div>
                            <div className="bg-slate-700/30 rounded-lg p-2">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingUp className="w-3 h-3 text-green-400" />
                              </div>
                              <p className="text-lg font-bold text-green-400">{session.crossedCount}</p>
                              <p className="text-xs text-slate-500">Cruzaron</p>
                            </div>
                            <div className="bg-slate-700/30 rounded-lg p-2">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Zap className="w-3 h-3 text-amber-400" />
                              </div>
                              <p className="text-lg font-bold text-amber-400">{percentage}%</p>
                              <p className="text-xs text-slate-500">Conversión</p>
                            </div>
                          </div>

                          {session.duration && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>Duración: {session.duration}</span>
                              </div>
                              {session.creator && (
                                <span className="text-slate-500">
                                  Por: {session.creator.firstName} {session.creator.lastName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Participantes Sin Cruzar */}
      <AnimatePresence>
        {showParticipantesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowParticipantesModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-amber-500/30 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Participantes Sin Avanzar</h3>
                    <p className="text-xs text-amber-400/70">{participantesCount} aún no eligen avanzar</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowParticipantesModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {loadingParticipantes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                ) : participantesPendientes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400">Todos los participantes ya eligieron avanzar</p>
                    <p className="text-slate-500 text-sm mt-1">🎉 ¡Excelente trabajo!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participantesPendientes.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => openTopFile(p.userId, p.nombre)}
                        className="p-3 rounded-xl border bg-slate-700/30 border-slate-600/30 hover:border-amber-500/30 hover:bg-slate-700/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Foto */}
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex-shrink-0 overflow-hidden">
                            {p.imagen ? (
                              <img 
                                src={p.imagen} 
                                alt={p.nombre} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-bold">
                                {p.nombre?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate group-hover:text-amber-400 transition-colors">
                              {p.nombre}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {p.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-slate-600/50 text-slate-300 rounded-full">
                                {p.productoNombre}
                              </span>
                            </div>
                          </div>
                          
                          {/* Estado y botón TOP FILE */}
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                              Sin decidir
                            </span>
                            <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              TOP FILE
                            </span>
                          </div>
                        </div>
                        
                        {/* Teléfono para contactar */}
                        {p.telefono && (
                          <div className="mt-2 pt-2 border-t border-slate-600/30">
                            <a 
                              href={`tel:${p.telefono}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                            >
                              📞 {p.telefono}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP FILE Modal */}
      {selectedUserForTopFile && (
        <TopFileModal
          userId={selectedUserForTopFile.id}
          userName={selectedUserForTopFile.nombre}
          isOpen={showTopFile}
          onClose={() => {
            setShowTopFile(false)
            setSelectedUserForTopFile(null)
          }}
        />
      )}
    </motion.div>
  )
}
