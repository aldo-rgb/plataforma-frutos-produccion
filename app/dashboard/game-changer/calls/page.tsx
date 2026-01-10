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
  PhoneMissed
} from "lucide-react"

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
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  ANSWERED: { label: "Contestada", color: "bg-green-100 text-green-800", icon: Phone },
  NO_ANSWER: { label: "No contestó", color: "bg-red-100 text-red-800", icon: PhoneMissed },
  WRONG_NUMBER: { label: "Número equivocado", color: "bg-orange-100 text-orange-800", icon: PhoneOff },
  CANCELLED: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: X },
  RESCHEDULED: { label: "Reagendada", color: "bg-blue-100 text-blue-800", icon: RefreshCw }
}

export default function GCCallsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calls, setCalls] = useState<CallSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<CallSlot | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Mis Llamadas de Seguimiento</h1>
                <p className="text-gray-500">Agenda y registro de llamadas con participantes</p>
              </div>
            </div>
            <button 
              onClick={fetchCalls}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-medium">
                {isToday ? "Hoy - " : ""}
                {selectedDate.toLocaleDateString("es-MX", { 
                  weekday: "long", 
                  day: "numeric", 
                  month: "long" 
                })}
              </span>
            </div>
            <button 
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Ir a hoy
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.answered}</p>
                <p className="text-sm text-gray-500">Contestadas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <PhoneMissed className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.noAnswer}</p>
                <p className="text-sm text-gray-500">No contestaron</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pendientes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calls List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">
              {isToday ? "Agenda de hoy" : isPast ? "Llamadas pasadas" : "Llamadas programadas"}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay llamadas programadas para este día</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => {
                const statusConfig = STATUS_CONFIG[call.status]
                const StatusIcon = statusConfig.icon
                const isPending = call.status === "PENDING"
                const isLowRating = call.potentialRating !== null && call.potentialRating <= 2

                return (
                  <div 
                    key={call.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      isPending && isToday ? "bg-yellow-50/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Time */}
                        <div className="text-center min-w-[80px]">
                          <p className="text-lg font-bold text-gray-800">
                            {formatTime(call.scheduledAt)}
                          </p>
                          <p className="text-xs text-gray-500">10 min</p>
                        </div>

                        {/* Participant Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                            {call.participant.nombre?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {call.participant.nombre}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
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

                      <div className="flex items-center gap-4">
                        {/* Status Badge */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig.label}
                        </div>

                        {/* Rating */}
                        {call.potentialRating !== null && (
                          <div className={`flex items-center gap-1 ${isLowRating ? "text-red-500" : "text-yellow-500"}`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= call.potentialRating! 
                                    ? "fill-current" 
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Alert for low rating or no answer */}
                        {(isLowRating || call.status === "NO_ANSWER") && (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        )}

                        {/* Actions */}
                        <button
                          onClick={() => openLogModal(call)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            isPending
                              ? "bg-purple-600 text-white hover:bg-purple-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {isPending ? "Registrar llamada" : "Editar"}
                        </button>
                      </div>
                    </div>

                    {/* Comments Preview */}
                    {(call.comments || call.trainerNotes) && (
                      <div className="mt-3 ml-[96px] flex gap-4">
                        {call.comments && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MessageSquare className="w-4 h-4 mt-0.5 text-gray-400" />
                            <span className="line-clamp-1">{call.comments}</span>
                          </div>
                        )}
                        {call.trainerNotes && (
                          <div className="flex items-start gap-2 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">
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
        </div>

        {/* Log Modal */}
        {showLogModal && selectedCall && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">Registrar Llamada</h3>
                  <button 
                    onClick={() => setShowLogModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{selectedCall.participant.nombre}</span>
                  <span>•</span>
                  <span>{formatTime(selectedCall.scheduledAt)}</span>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado de la llamada
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "ANSWERED", label: "Contestada", icon: Phone },
                      { value: "NO_ANSWER", label: "No contestó", icon: PhoneMissed },
                      { value: "WRONG_NUMBER", label: "Número equivocado", icon: PhoneOff },
                      { value: "RESCHEDULED", label: "Reagendada", icon: RefreshCw }
                    ].map((option) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          onClick={() => setLogForm({ ...logForm, status: option.value as CallSlot["status"] })}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            logForm.status === option.value
                              ? "border-purple-500 bg-purple-50 text-purple-700"
                              : "border-gray-200 hover:border-gray-300"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Potencial del participante
                    </label>
                    <div className="flex items-center gap-2">
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
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {logForm.potentialRating <= 2 && "⚠️ Se notificará al trainer para intervención"}
                      {logForm.potentialRating === 3 && "Regular - seguimiento normal"}
                      {logForm.potentialRating >= 4 && "🌟 Candidato para Avanzado"}
                    </p>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios
                  </label>
                  <textarea
                    value={logForm.comments}
                    onChange={(e) => setLogForm({ ...logForm, comments: e.target.value })}
                    placeholder="Notas sobre la llamada..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveLog}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
