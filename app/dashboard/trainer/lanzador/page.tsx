'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, Search, Calendar, Clock, Target, Users, Award,
  BookOpen, ChevronRight, Filter, Zap, CheckCircle, AlertCircle,
  X, Play, Pause, Eye, RefreshCw
} from 'lucide-react'

interface Vision {
  id: number
  nombre: string
  organizacion: string
  isActive: boolean
  productos: { id: number; name: string; levelType: string }[]
}

interface Template {
  id: number
  title: string
  description: string | null
  type: 'QUESTIONNAIRE' | 'CONTENT' | 'ACTION' | 'REFLECTION'
  tags: string[]
  pointsReward: number
  estimatedMinutes: number | null
}

interface Mission {
  id: number
  title: string
  description: string | null
  type: string
  status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'COMPLETED'
  releaseAt: string
  dueAt: string | null
  bonusPoints: number
  template: { title: string; type: string } | null
  vision: { name: string } | null
  squad: { name: string } | null
  _count: { submissions: number }
  submittedCount: number
  totalParticipants: number
}

const typeConfig = {
  QUESTIONNAIRE: { icon: '📋', label: 'Cuestionario', color: 'bg-blue-500' },
  CONTENT: { icon: '🎬', label: 'Contenido', color: 'bg-purple-500' },
  ACTION: { icon: '⚡', label: 'Acción', color: 'bg-amber-500' },
  REFLECTION: { icon: '💭', label: 'Reflexión', color: 'bg-rose-500' }
}

const statusConfig = {
  SCHEDULED: { label: 'Programada', color: 'bg-slate-500', icon: Clock },
  ACTIVE: { label: 'Activa', color: 'bg-green-500', icon: Play },
  EXPIRED: { label: 'Vencida', color: 'bg-red-500', icon: AlertCircle },
  COMPLETED: { label: 'Completada', color: 'bg-blue-500', icon: CheckCircle }
}

export default function LanzadorPage() {
  const [visiones, setVisiones] = useState<Vision[]>([])
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTemplate, setSearchTemplate] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [view, setView] = useState<'launch' | 'missions'>('launch')

  useEffect(() => {
    fetchVisiones()
  }, [])

  useEffect(() => {
    if (selectedVision) {
      fetchTemplates()
      fetchMissions()
    }
  }, [selectedVision, filterStatus])

  const fetchVisiones = async () => {
    try {
      const res = await fetch('/api/trainer/lanzador/visiones-activas')
      const data = await res.json()
      if (data.success && data.visiones) {
        setVisiones(data.visiones)
        if (data.visiones.length > 0) {
          setSelectedVision(data.visiones[0])
        }
      } else {
        setVisiones([])
      }
    } catch (error) {
      console.error('Error fetching visiones:', error)
      setVisiones([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTemplate) params.set('search', searchTemplate)
      if (filterType) params.set('type', filterType)

      const res = await fetch(`/api/trainer/biblioteca?${params}`)
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchMissions = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedVision) params.set('visionId', selectedVision.id.toString())
      if (filterStatus) params.set('status', filterStatus)

      const res = await fetch(`/api/trainer/lanzador?${params}`)
      const data = await res.json()
      if (data.success) {
        setMissions(data.missions)
      }
    } catch (error) {
      console.error('Error fetching missions:', error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedVision) {
        fetchTemplates()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTemplate, filterType])

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setShowLaunchModal(true)
  }

  const handleMissionLaunched = () => {
    setShowLaunchModal(false)
    setSelectedTemplate(null)
    fetchMissions()
    setView('missions')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (visiones.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-2xl mx-auto text-center py-16">
          <Rocket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Sin Visiones Activas</h2>
          <p className="text-slate-400">
            No tienes visiones activas asignadas. Contacta al administrador para que te asigne como entrenador.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">El Lanzador de Tareas</h1>
              <p className="text-slate-400">Lanza tareas en vivo a tus participantes</p>
            </div>
          </div>
        </motion.div>

        {/* Selector de Visión */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-slate-300">
            <Target className="w-5 h-5" />
            <span>Visión:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {visiones.map(vision => (
              <button
                key={vision.id}
                onClick={() => setSelectedVision(vision)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  selectedVision?.id === vision.id
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {vision.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          <button
            onClick={() => setView('launch')}
            className={`pb-3 px-1 font-medium transition-colors ${
              view === 'launch'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Lanzar Tarea
            </span>
          </button>
          <button
            onClick={() => setView('missions')}
            className={`pb-3 px-1 font-medium transition-colors ${
              view === 'missions'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Tareas Activas ({missions.filter(m => m.status === 'ACTIVE').length})
            </span>
          </button>
        </div>

        {view === 'launch' ? (
          /* Vista de Lanzar */
          <div className="space-y-6">
            {/* Barra de búsqueda de plantillas */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en tu biblioteca..."
                  value={searchTemplate}
                  onChange={(e) => setSearchTemplate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Todos los tipos</option>
                <option value="QUESTIONNAIRE">Cuestionario</option>
                <option value="CONTENT">Contenido</option>
                <option value="ACTION">Acción</option>
                <option value="REFLECTION">Reflexión</option>
              </select>
              <a
                href="/dashboard/trainer/biblioteca"
                className="flex items-center gap-2 px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                Ir a Biblioteca
              </a>
            </div>

            {/* Grid de plantillas */}
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  {searchTemplate || filterType
                    ? 'No hay plantillas que coincidan con tu búsqueda'
                    : 'Tu biblioteca está vacía. Crea plantillas primero.'}
                </p>
                <a
                  href="/dashboard/trainer/biblioteca"
                  className="inline-flex items-center gap-2 mt-4 text-amber-400 hover:text-amber-300"
                >
                  <BookOpen className="w-4 h-4" />
                  Crear en Biblioteca
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const type = typeConfig[template.type as keyof typeof typeConfig]
                  return (
                    <motion.button
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectTemplate(template)}
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-left hover:border-amber-500/50 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{type?.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                            {template.title}
                          </h3>
                          <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                            {template.description || 'Sin descripción'}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className={`px-2 py-0.5 rounded-full ${type?.color} text-white`}>
                              {type?.label}
                            </span>
                            <span className="flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {template.pointsReward}pts
                            </span>
                          </div>
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Vista de Misiones */
          <div className="space-y-6">
            {/* Filtros */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Filter className="w-4 h-4" />
                Estado:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus('')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filterStatus === '' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Todas
                </button>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filterStatus === key ? `${config.color} text-white` : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchMissions}
                className="ml-auto p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de misiones */}
            {missions.length === 0 ? (
              <div className="text-center py-12">
                <Rocket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay misiones para esta visión</p>
                <button
                  onClick={() => setView('launch')}
                  className="inline-flex items-center gap-2 mt-4 text-amber-400 hover:text-amber-300"
                >
                  <Rocket className="w-4 h-4" />
                  Lanzar primera misión
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {missions.map((mission) => {
                  const type = typeConfig[mission.type as keyof typeof typeConfig]
                  const status = statusConfig[mission.status]
                  const StatusIcon = status.icon
                  const progress = mission.totalParticipants > 0
                    ? Math.round((mission.submittedCount / mission.totalParticipants) * 100)
                    : 0

                  return (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">{type?.icon}</span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white truncate">
                              {mission.title}
                            </h3>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </div>

                          {mission.description && (
                            <p className="text-sm text-slate-400 line-clamp-1 mb-2">
                              {mission.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {mission.vision?.name || 'Sin visión'}
                              {mission.squad && ` → ${mission.squad.name}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(mission.releaseAt).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {mission.dueAt && (
                              <span className="flex items-center gap-1 text-amber-400">
                                <Clock className="w-4 h-4" />
                                Vence: {new Date(mission.dueAt).toLocaleDateString('es-MX', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                            {mission.bonusPoints > 0 && (
                              <span className="flex items-center gap-1 text-green-400">
                                <Award className="w-4 h-4" />
                                +{mission.bonusPoints} bonus
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progreso */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            {mission.submittedCount}/{mission.totalParticipants}
                          </div>
                          <p className="text-xs text-slate-400">entregas</p>
                          <div className="w-24 h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{progress}%</p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de lanzamiento */}
      <AnimatePresence>
        {showLaunchModal && selectedTemplate && selectedVision && (
          <LaunchModal
            template={selectedTemplate}
            vision={selectedVision}
            onClose={() => {
              setShowLaunchModal(false)
              setSelectedTemplate(null)
            }}
            onLaunched={handleMissionLaunched}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Modal de lanzamiento de misión
function LaunchModal({
  template,
  vision,
  onClose,
  onLaunched
}: {
  template: Template
  vision: Vision
  onClose: () => void
  onLaunched: () => void
}) {
  const [formData, setFormData] = useState({
    customTitle: template.title,
    customDescription: template.description || '',
    targetType: 'vision' as 'vision' | 'squad',
    squadId: '',
    releaseType: 'immediate' as 'immediate' | 'scheduled',
    releaseAt: '',
    hasDueDate: false,
    dueAt: '',
    bonusPoints: 0
  })
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')
  const [participantCount, setParticipantCount] = useState<number | null>(null)
  const [participantLevel, setParticipantLevel] = useState('')

  const type = typeConfig[template.type as keyof typeof typeConfig]

  // Obtener conteo de participantes al montar
  useEffect(() => {
    const fetchParticipantCount = async () => {
      try {
        const res = await fetch(`/api/trainer/lanzador/participantes-count?visionId=${vision.id}`)
        const data = await res.json()
        if (data.success) {
          setParticipantCount(data.count)
          setParticipantLevel(data.level)
        }
      } catch (err) {
        console.error('Error fetching participant count:', err)
      }
    }
    fetchParticipantCount()
  }, [vision.id])

  const handleLaunch = async () => {
    if (formData.releaseType === 'scheduled' && !formData.releaseAt) {
      setError('Selecciona la fecha de lanzamiento')
      return
    }

    setLaunching(true)
    setError('')

    try {
      const res = await fetch('/api/trainer/lanzador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          visionId: vision.id,
          squadId: formData.targetType === 'squad' ? formData.squadId : undefined,
          customTitle: formData.customTitle !== template.title ? formData.customTitle : undefined,
          customDescription: formData.customDescription !== template.description ? formData.customDescription : undefined,
          releaseAt: formData.releaseType === 'scheduled' ? formData.releaseAt : undefined,
          dueAt: formData.hasDueDate ? formData.dueAt : undefined,
          bonusPoints: formData.bonusPoints > 0 ? formData.bonusPoints : undefined
        })
      })

      const data = await res.json()

      if (data.success) {
        onLaunched()
      } else {
        setError(data.error || 'Error al lanzar la misión')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Lanzar Tarea</h2>
              <p className="text-sm text-slate-400">
                {type?.icon} {template.title}
              </p>
            </div>
            <button onClick={onClose} className="ml-auto p-2 hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Título personalizado */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título de la misión
            </label>
            <input
              type="text"
              value={formData.customTitle}
              onChange={(e) => setFormData({ ...formData, customTitle: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Instrucciones adicionales
            </label>
            <textarea
              value={formData.customDescription}
              onChange={(e) => setFormData({ ...formData, customDescription: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Destino */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ¿A quién va dirigida?
            </label>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetType: 'vision' })}
                className={`p-3 rounded-xl border transition-all ${
                  formData.targetType === 'vision'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Users className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm">Toda la visión</p>
                <p className="text-xs opacity-70">{vision.nombre}</p>
                {participantCount !== null && (
                  <p className="text-xs mt-1 font-medium">
                    {participantCount} participante{participantCount !== 1 ? 's' : ''}
                    {participantLevel && <span className="opacity-70"> ({participantLevel})</span>}
                  </p>
                )}
              </button>
            </div>
          </div>

          {/* Momento de lanzamiento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ¿Cuándo se lanza?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, releaseType: 'immediate' })}
                className={`p-3 rounded-xl border transition-all ${
                  formData.releaseType === 'immediate'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Zap className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm">¡Ahora mismo!</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, releaseType: 'scheduled' })}
                className={`p-3 rounded-xl border transition-all ${
                  formData.releaseType === 'scheduled'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm">Programar</p>
              </button>
            </div>

            {formData.releaseType === 'scheduled' && (
              <input
                type="datetime-local"
                value={formData.releaseAt}
                onChange={(e) => setFormData({ ...formData, releaseAt: e.target.value })}
                className="mt-3 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            )}
          </div>

          {/* Fecha límite */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={formData.hasDueDate}
                onChange={(e) => setFormData({ ...formData, hasDueDate: e.target.checked })}
                className="rounded"
              />
              Establecer fecha límite de entrega
            </label>
            {formData.hasDueDate && (
              <input
                type="datetime-local"
                value={formData.dueAt}
                onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                className="mt-2 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleLaunch}
            disabled={launching || (formData.targetType === 'squad' && !formData.squadId)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all disabled:opacity-50"
          >
            {launching ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Lanzando...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                {formData.releaseType === 'immediate' ? '¡Lanzar Ahora!' : 'Programar Misión'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
