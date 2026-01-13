"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Phone, 
  PhoneOff, 
  PhoneIncoming, 
  Clock, 
  User, 
  Star, 
  MessageSquare, 
  Check, 
  X, 
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  PhoneMissed,
  ArrowLeft,
  Settings
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import AvailabilityConfig from "@/components/gc-calls/AvailabilityConfig"

interface CallSlot {
  id: string
  participantId: string
  participant: {
    id: string
    nombre: string
    phone?: string
    email?: string
    image?: string
  }
  enrollment: {
    id: string
    currentTrainingDay: number
  }
  group?: {
    id: string
    name: string
  }
  vision: {
    id: number
    name: string
  }
  level: string
  trainingDay: number
  scheduledAt: string
  status: "PENDING" | "ANSWERED" | "NO_ANSWER" | "WRONG_NUMBER" | "CANCELLED" | "RESCHEDULED"
  potentialRating: number | null
  comments: string | null
  trainerNotes: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG = {
  PENDING: { label: "Pendiente", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: Clock },
  ANSWERED: { label: "Contestada", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: Phone },
  NO_ANSWER: { label: "No contestó", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: PhoneMissed },
  WRONG_NUMBER: { label: "Número equivocado", color: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: PhoneOff },
  CANCELLED: { label: "Cancelada", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: X },
  RESCHEDULED: { label: "Reagendada", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: RefreshCw }
}

export default function GCCallsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calls, setCalls] = useState<CallSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<CallSlot | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    answered: 0,
    noAnswer: 0,
    pending: 0
  })

  // Log form state
  const [logForm, setLogForm] = useState({
    status: "ANSWERED" as CallSlot["status"],
    potentialRating: 3,
    comments: ""
  })
  const [saving, setSaving] = useState(false)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const res = await fetch(`/api/gc-calls/log?date=${dateStr}`)
      if (res.ok) {
        const data = await res.json()
        setCalls(data.calls || [])
        
        // Calculate stats
        const total = data.calls?.length || 0
        const answered = data.calls?.filter((c: CallSlot) => c.status === "ANSWERED").length || 0
        const noAnswer = data.calls?.filter((c: CallSlot) => c.status === "NO_ANSWER").length || 0
        const pending = data.calls?.filter((c: CallSlot) => c.status === "PENDING").length || 0
        setStats({ total, answered, noAnswer, pending })
      }
    } catch (error) {
      console.error("Error fetching calls:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const openLogModal = (call: CallSlot) => {
    setSelectedCall(call)
    setLogForm({
      status: call.status === "PENDING" ? "ANSWERED" : call.status,
      potentialRating: call.potentialRating || 3,
      comments: call.comments || ""
    })
    setShowLogModal(true)
  }

  const handleSaveLog = async () => {
    if (!selectedCall) return
    
    setSaving(true)
    try {
      const res = await fetch("/api/gc-calls/log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedCall.id,
          status: logForm.status,
          potentialRating: logForm.status === "ANSWERED" ? logForm.potentialRating : null,
          comments: logForm.comments
        })
      })

      if (res.ok) {
        setShowLogModal(false)
        fetchCalls()
      } else {
        const data = await res.json()
        alert(data.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving log:", error)
      alert("Error al guardar la llamada")
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const isPast = selectedDate < new Date(new Date().toDateString())

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
          <CardContent className="p-4 md:p-6">
            {/* Mobile: Stack vertically, Desktop: Side by side */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Top row: Back button + Title */}
              <div className="flex items-start gap-3">
                <Link href="/dashboard/gamechanger">
                  <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 md:p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shrink-0">
                    <Phone className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg md:text-2xl font-bold text-white leading-tight">Mis Llamadas de Seguimiento</h1>
                    <p className="text-gray-400 text-xs md:text-sm">Agenda y registro de llamadas con participantes</p>
                  </div>
                </div>
              </div>
              
              {/* Action buttons - Full width on mobile */}
              <div className="flex items-center gap-2 ml-0 md:ml-auto">
                <Button 
                  onClick={() => setShowConfigModal(true)}
                  className="flex-1 md:flex-none bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={fetchCalls}
                  className="text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-2 md:gap-4">
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => changeDate(-1)}
                className="text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 rounded-lg border border-white/10 min-w-0">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-purple-400 shrink-0" />
                <span className="font-medium text-white text-sm md:text-base capitalize truncate">
                  {isToday ? "Hoy - " : ""}
                  {selectedDate.toLocaleDateString("es-MX", { 
                    weekday: "long", 
                    day: "numeric", 
                    month: "short" 
                  })}
                </span>
              </div>
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => changeDate(1)}
                className="text-gray-400 hover:text-white hover:bg-white/10 shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              {!isToday && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-purple-400 hover:text-purple-300 text-xs md:text-sm px-2"
                >
                  Hoy
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-gray-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{stats.answered}</p>
                  <p className="text-sm text-gray-400">Contestadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <PhoneMissed className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{stats.noAnswer}</p>
                  <p className="text-sm text-gray-400">No contestaron</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                  <p className="text-sm text-gray-400">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calls List */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white">
              {isToday ? "Agenda de hoy" : isPast ? "Llamadas pasadas" : "Llamadas programadas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No hay llamadas programadas para este día</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {calls.map((call) => {
                  const statusConfig = STATUS_CONFIG[call.status]
                  const StatusIcon = statusConfig.icon
                  const isPending = call.status === "PENDING"
                  const isLowRating = call.potentialRating !== null && call.potentialRating <= 2

                  return (
                    <div 
                      key={call.id}
                      className={`p-4 hover:bg-white/5 transition-colors ${
                        isPending && isToday ? "bg-yellow-500/5" : ""
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {/* Time */}
                          <div className="text-center min-w-[80px]">
                            <p className="text-lg font-bold text-white">
                              {formatTime(call.scheduledAt)}
                            </p>
                            <p className="text-xs text-gray-500">10 min</p>
                          </div>

                          {/* Participant Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                              {call.participant.nombre?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {call.participant.nombre}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span>Día {call.trainingDay}</span>
                                {call.group && (
                                  <>
                                    <span>•</span>
                                    <span>{call.group.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-[96px] md:ml-0">
                          {/* Status Badge */}
                          <Badge variant="outline" className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>

                          {/* Rating */}
                          {call.potentialRating !== null && (
                            <div className={`flex items-center gap-0.5 ${isLowRating ? "text-red-400" : "text-yellow-400"}`}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= call.potentialRating! 
                                      ? "fill-current" 
                                      : "text-gray-600"
                                  }`}
                                />
                              ))}
                            </div>
                          )}

                          {/* Alert for low rating or no answer */}
                          {(isLowRating || call.status === "NO_ANSWER") && (
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                          )}

                          {/* Actions */}
                          <Button
                            onClick={() => openLogModal(call)}
                            size="sm"
                            className={
                              isPending
                                ? "bg-purple-600 hover:bg-purple-700 text-white"
                                : "bg-white/10 hover:bg-white/20 text-white"
                            }
                          >
                            {isPending ? "Registrar" : "Editar"}
                          </Button>
                        </div>
                      </div>

                      {/* Comments Preview */}
                      {(call.comments || call.trainerNotes) && (
                        <div className="mt-3 ml-[96px] flex flex-wrap gap-3">
                          {call.comments && (
                            <div className="flex items-start gap-2 text-sm text-gray-400">
                              <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500" />
                              <span className="line-clamp-1">{call.comments}</span>
                            </div>
                          )}
                          {call.trainerNotes && (
                            <div className="flex items-start gap-2 text-sm text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
                              <AlertCircle className="w-4 h-4 mt-0.5" />
                              <span className="line-clamp-1">Nota del trainer: {call.trainerNotes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Modal */}
        {showLogModal && selectedCall && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-gray-900 border-white/10">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Registrar Llamada</CardTitle>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLogModal(false)}
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <CardDescription className="flex items-center gap-2 text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{selectedCall.participant.nombre}</span>
                  <span>•</span>
                  <span>{formatTime(selectedCall.scheduledAt)}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Estado de la llamada
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "ANSWERED", label: "Contestada", icon: Phone },
                      { value: "NO_ANSWER", label: "No contestó", icon: PhoneMissed },
                      { value: "WRONG_NUMBER", label: "Núm. equivocado", icon: PhoneOff },
                      { value: "RESCHEDULED", label: "Reagendada", icon: RefreshCw }
                    ].map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          onClick={() => setLogForm({ ...logForm, status: option.value as CallSlot["status"] })}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            logForm.status === option.value
                              ? "border-purple-500 bg-purple-500/20 text-purple-300"
                              : "border-white/10 hover:border-white/20 text-gray-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Rating (only if answered) */}
                {logForm.status === "ANSWERED" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Potencial del participante
                    </label>
                    <div className="flex items-center gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setLogForm({ ...logForm, potentialRating: star })}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= logForm.potentialRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-center text-gray-400">
                      {logForm.potentialRating <= 2 && "⚠️ Se notificará al trainer para intervención"}
                      {logForm.potentialRating === 3 && "Regular - seguimiento normal"}
                      {logForm.potentialRating >= 4 && "🌟 Candidato para Avanzado"}
                    </p>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Comentarios
                  </label>
                  <textarea
                    value={logForm.comments}
                    onChange={(e) => setLogForm({ ...logForm, comments: e.target.value })}
                    placeholder="Notas sobre la llamada..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
              </CardContent>

              <div className="p-6 border-t border-white/10 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 border-white/10 text-gray-300 hover:bg-white/10"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveLog}
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Configuración de Horarios */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-amber-400" />
                      Configurar Mis Horarios de Llamadas
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Define los bloques de tiempo en los que estarás disponible para recibir llamadas de tus participantes
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfigModal(false)}
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <AvailabilityConfig 
                    onSave={() => {
                      setShowConfigModal(false)
                      fetchCalls()
                    }}
                    onSkip={() => setShowConfigModal(false)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
