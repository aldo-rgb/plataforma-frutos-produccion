"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { 
  Phone, 
  Users, 
  AlertTriangle, 
  Star, 
  TrendingUp, 
  Shield,
  Clock,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  Save,
  Check,
  X,
  PhoneMissed,
  Sparkles
} from "lucide-react"

interface SquadAverage {
  squadId: string
  squadName: string
  gcId: string
  gcName: string
  avgRating: number
  totalCalls: number
  answeredCalls: number
  noAnswerCalls: number
  pendingCalls: number
  riskLevel: "green" | "yellow" | "red"
}

interface RescueParticipant {
  participantId: string
  participantName: string
  gcId: string
  gcName: string
  squadId?: string
  squadName?: string
  reason: "low_rating" | "no_answer" | "both"
  lastCallStatus?: string
  lastRating?: number
  consecutiveNoAnswer: number
  lastCallDate?: string
  trainerNotes?: string
}

interface AdvancementCandidate {
  participantId: string
  participantName: string
  gcId: string
  gcName: string
  squadId?: string
  squadName?: string
  avgRating: number
  totalCalls: number
  latestComment?: string
}

const RISK_COLORS = {
  green: { bg: "bg-green-500", text: "text-green-700", label: "Bien", emoji: "🟢" },
  yellow: { bg: "bg-yellow-500", text: "text-yellow-700", label: "Atención", emoji: "🟡" },
  red: { bg: "bg-red-500", text: "text-red-700", label: "Crítico", emoji: "🔴" }
}

export default function CoordinatorCallsDashboard() {
  const params = useParams()
  const visionId = Number(params?.id) || 0

  const [activeTab, setActiveTab] = useState<"squads" | "rescue" | "advancement">("squads")
  const [loading, setLoading] = useState(true)
  const [level, setLevel] = useState<"BASIC" | "ADVANCED">("BASIC")
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0]
  })

  const [squadAverages, setSquadAverages] = useState<SquadAverage[]>([])
  const [rescueList, setRescueList] = useState<RescueParticipant[]>([])
  const [advancementCandidates, setAdvancementCandidates] = useState<AdvancementCandidate[]>([])

  const [expandedSquad, setExpandedSquad] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<RescueParticipant | null>(null)
  const [interventionNote, setInterventionNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  const fetchDashboard = useCallback(async () => {
    if (!visionId) return
    
    setLoading(true)
    try {
      const res = await fetch(
        `/api/gc-calls/dashboard?visionId=${visionId}&level=${level}&from=${dateRange.from}&to=${dateRange.to}`
      )
      if (res.ok) {
        const data = await res.json()
        setSquadAverages(data.squadAverages || [])
        setRescueList(data.rescueList || [])
        setAdvancementCandidates(data.advancementCandidates || [])
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setLoading(false)
    }
  }, [visionId, level, dateRange])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleSaveIntervention = async () => {
    if (!selectedParticipant || !interventionNote.trim()) return
    
    setSavingNote(true)
    try {
      const res = await fetch("/api/gc-calls/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: selectedParticipant.participantId,
          visionId,
          level,
          trainerNotes: interventionNote
        })
      })

      if (res.ok) {
        setSelectedParticipant(null)
        setInterventionNote("")
        fetchDashboard()
      }
    } catch (error) {
      console.error("Error saving intervention:", error)
    } finally {
      setSavingNote(false)
    }
  }

  const stats = {
    totalSquads: squadAverages.length,
    greenSquads: squadAverages.filter(s => s.riskLevel === "green").length,
    yellowSquads: squadAverages.filter(s => s.riskLevel === "yellow").length,
    redSquads: squadAverages.filter(s => s.riskLevel === "red").length,
    rescueCount: rescueList.length,
    advancementCount: advancementCandidates.length
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard de Llamadas GC</h1>
                <p className="text-gray-500">Seguimiento y semaforización de equipos</p>
              </div>
            </div>
            <button 
              onClick={fetchDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filtros:</span>
            </div>
            
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as "BASIC" | "ADVANCED")}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="BASIC">Básico</option>
              <option value="ADVANCED">Avanzado</option>
            </select>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Squads</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalSquads}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2 mb-1">
              <span>🟢</span>
              <span className="text-sm text-green-700">Bien</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.greenSquads}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200 bg-yellow-50/50">
            <div className="flex items-center gap-2 mb-1">
              <span>🟡</span>
              <span className="text-sm text-yellow-700">Atención</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{stats.yellowSquads}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50/50">
            <div className="flex items-center gap-2 mb-1">
              <span>🔴</span>
              <span className="text-sm text-red-700">Crítico</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.redSquads}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200 bg-orange-50/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-700">Rescate</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{stats.rescueCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-purple-700">Avanzado</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats.advancementCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("squads")}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === "squads"
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Semaforización de Squads
              </div>
            </button>
            <button
              onClick={() => setActiveTab("rescue")}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === "rescue"
                  ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Lista de Rescate
                {stats.rescueCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                    {stats.rescueCount}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("advancement")}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === "advancement"
                  ? "text-green-600 border-b-2 border-green-600 bg-green-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Avance a Avanzado
                {stats.advancementCount > 0 && (
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                    {stats.advancementCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="p-6">
              {/* Squads Tab */}
              {activeTab === "squads" && (
                <div className="space-y-4">
                  {squadAverages.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No hay datos de squads para mostrar</p>
                    </div>
                  ) : (
                    squadAverages.map((squad) => {
                      const riskConfig = RISK_COLORS[squad.riskLevel]
                      const isExpanded = expandedSquad === squad.squadId

                      return (
                        <div key={squad.squadId} className="border border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedSquad(isExpanded ? null : squad.squadId)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-4 h-4 rounded-full ${riskConfig.bg}`} />
                              <div className="text-left">
                                <p className="font-semibold text-gray-800">{squad.squadName}</p>
                                <p className="text-sm text-gray-500">GC: {squad.gcName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-lg font-bold text-gray-800">
                                  {squad.avgRating.toFixed(1)}
                                </p>
                                <p className="text-xs text-gray-500">Rating prom.</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-green-600">{squad.answeredCalls}</p>
                                <p className="text-xs text-gray-500">Contestadas</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-red-600">{squad.noAnswerCalls}</p>
                                <p className="text-xs text-gray-500">No contestó</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-yellow-600">{squad.pendingCalls}</p>
                                <p className="text-xs text-gray-500">Pendientes</p>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50">
                              <p className="text-sm text-gray-600">
                                Detalles del squad próximamente...
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Rescue Tab */}
              {activeTab === "rescue" && (
                <div className="space-y-4">
                  {rescueList.length === 0 ? (
                    <div className="text-center py-12">
                      <Check className="w-12 h-12 text-green-300 mx-auto mb-3" />
                      <p className="text-gray-500">¡Excelente! No hay participantes en riesgo</p>
                    </div>
                  ) : (
                    rescueList.map((participant) => (
                      <div 
                        key={participant.participantId}
                        className="border border-orange-200 rounded-xl p-4 bg-orange-50/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {participant.participantName}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>GC: {participant.gcName}</span>
                                {participant.squadName && (
                                  <>
                                    <span>•</span>
                                    <span>{participant.squadName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Reason badges */}
                            <div className="flex gap-2">
                              {(participant.reason === "low_rating" || participant.reason === "both") && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                  <Star className="w-3 h-3" />
                                  Rating bajo ({participant.lastRating})
                                </span>
                              )}
                              {(participant.reason === "no_answer" || participant.reason === "both") && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                  <PhoneMissed className="w-3 h-3" />
                                  {participant.consecutiveNoAnswer}x no contestó
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setSelectedParticipant(participant)
                                setInterventionNote(participant.trainerNotes || "")
                              }}
                              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Intervenir
                            </button>
                          </div>
                        </div>

                        {participant.trainerNotes && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                            <p className="text-sm text-purple-700">
                              <strong>Nota del trainer:</strong> {participant.trainerNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Advancement Tab */}
              {activeTab === "advancement" && (
                <div className="space-y-4">
                  {advancementCandidates.length === 0 ? (
                    <div className="text-center py-12">
                      <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Aún no hay candidatos identificados para avanzado</p>
                    </div>
                  ) : (
                    advancementCandidates.map((candidate) => (
                      <div 
                        key={candidate.participantId}
                        className="border border-green-200 rounded-xl p-4 bg-green-50/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white">
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {candidate.participantName}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>GC: {candidate.gcName}</span>
                                {candidate.squadName && (
                                  <>
                                    <span>•</span>
                                    <span>{candidate.squadName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                {renderStars(Math.round(candidate.avgRating))}
                                <span className="ml-2 font-bold text-green-600">
                                  {candidate.avgRating.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {candidate.totalCalls} llamadas
                              </p>
                            </div>

                            <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                              <Eye className="w-4 h-4" />
                              Ver perfil
                            </button>
                          </div>
                        </div>

                        {candidate.latestComment && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-green-100">
                            <p className="text-sm text-gray-600">
                              <strong>Último comentario:</strong> &quot;{candidate.latestComment}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Intervention Modal */}
        {selectedParticipant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-800">Nota de Intervención</h3>
                  <button 
                    onClick={() => setSelectedParticipant(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{selectedParticipant.participantName}</span>
                  <span>•</span>
                  <span>GC: {selectedParticipant.gcName}</span>
                </div>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas para el GC y seguimiento
                </label>
                <textarea
                  value={interventionNote}
                  onChange={(e) => setInterventionNote(e.target.value)}
                  placeholder="Escribe instrucciones o notas para el seguimiento de este participante..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Esta nota será visible para el GC asignado en su panel de llamadas.
                </p>
              </div>

              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveIntervention}
                  disabled={savingNote || !interventionNote.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingNote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar nota
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
