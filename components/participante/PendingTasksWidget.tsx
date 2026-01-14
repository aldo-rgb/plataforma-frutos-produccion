'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Clock, Award, AlertTriangle, ChevronRight,
  FileQuestion, Film, Zap, Heart, X, Send, CheckCircle
} from 'lucide-react'

interface Question {
  id: number
  text: string
  type: 'OPEN' | 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'SCALE' | 'YES_NO'
  isRequired: boolean
  options: string[]
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
}

interface Task {
  submissionId: number
  missionId: number
  title: string
  description: string | null
  type: 'QUESTIONNAIRE' | 'CONTENT' | 'ACTION' | 'REFLECTION'
  dueAt: string | null
  pointsReward: number
  estimatedMinutes: number | null
  requiresEvidence: boolean
  evidenceType: string | null
  visionName: string
  trainerName: string | null
  isUrgent: boolean
  questions: Question[]
}

const typeConfig = {
  QUESTIONNAIRE: { icon: FileQuestion, label: 'Cuestionario', color: 'from-blue-500 to-cyan-500', emoji: '📋' },
  CONTENT: { icon: Film, label: 'Contenido', color: 'from-purple-500 to-pink-500', emoji: '🎬' },
  ACTION: { icon: Zap, label: 'Acción', color: 'from-amber-500 to-orange-500', emoji: '⚡' },
  REFLECTION: { icon: Heart, label: 'Reflexión', color: 'from-rose-500 to-red-500', emoji: '💭' }
}

export default function PendingTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [counts, setCounts] = useState({ pending: 0, submitted: 0, reviewed: 0 })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/participante/mis-tareas')
      const data = await res.json()

      if (data.success) {
        setTasks(data.pendingTasks)
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskCompleted = () => {
    setSelectedTask(null)
    fetchTasks()
  }

  const urgentTasks = tasks.filter(t => t.isUrgent)
  const normalTasks = tasks.filter(t => !t.isUrgent)

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="h-20 bg-slate-700 rounded" />
          <div className="h-20 bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Mis Tareas</h3>
                <p className="text-sm text-slate-400">
                  {counts.pending} pendiente{counts.pending !== 1 ? 's' : ''} •{' '}
                  {counts.submitted} en revisión
                </p>
              </div>
            </div>
            {counts.pending > 0 && (
              <div className="px-3 py-1 bg-amber-500 text-white text-sm font-bold rounded-full">
                {counts.pending}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">¡Todo al día!</p>
              <p className="text-sm text-slate-500">No tienes tareas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tareas urgentes */}
              {urgentTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    URGENTES - Vencen pronto
                  </p>
                  {urgentTasks.map((task) => (
                    <TaskCard
                      key={task.submissionId}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      isUrgent
                    />
                  ))}
                </div>
              )}

              {/* Tareas normales */}
              {normalTasks.length > 0 && (
                <div className="space-y-2">
                  {urgentTasks.length > 0 && (
                    <p className="text-xs font-medium text-slate-500 mt-4">
                      OTRAS TAREAS
                    </p>
                  )}
                  {normalTasks.slice(0, 3).map((task) => (
                    <TaskCard
                      key={task.submissionId}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                  {normalTasks.length > 3 && (
                    <button className="w-full py-2 text-sm text-amber-400 hover:text-amber-300 transition-colors">
                      Ver {normalTasks.length - 3} tarea{normalTasks.length - 3 !== 1 ? 's' : ''} más
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de tarea */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onComplete={handleTaskCompleted}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Componente de tarjeta de tarea
function TaskCard({
  task,
  onClick,
  isUrgent = false
}: {
  task: Task
  onClick: () => void
  isUrgent?: boolean
}) {
  const type = typeConfig[task.type]
  const Icon = type.icon

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full p-3 rounded-xl text-left transition-all ${
        isUrgent
          ? 'bg-red-500/10 border border-red-500/30 hover:border-red-500/50'
          : 'bg-slate-700/50 border border-slate-600 hover:border-slate-500'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-gradient-to-br ${type.color} rounded-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{task.title}</h4>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>{type.label}</span>
            {task.estimatedMinutes && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </span>
            )}
            <span className="flex items-center gap-0.5 text-amber-400">
              <Award className="w-3 h-3" />
              {task.pointsReward}pts
            </span>
          </div>
        </div>

        {task.dueAt && (
          <div className={`text-xs ${isUrgent ? 'text-red-400' : 'text-slate-500'}`}>
            {new Date(task.dueAt).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short'
            })}
          </div>
        )}

        <ChevronRight className="w-4 h-4 text-slate-500" />
      </div>
    </motion.button>
  )
}

// Modal para completar tarea
function TaskModal({
  task,
  onClose,
  onComplete
}: {
  task: Task
  onClose: () => void
  onComplete: () => void
}) {
  const [evidenceText, setEvidenceText] = useState('')
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const type = typeConfig[task.type]
  const Icon = type.icon

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const formattedAnswers = task.questions.map(q => ({
        questionId: q.id,
        answerText: answers[q.id]?.toString() || '',
        selectedOptions: Array.isArray(answers[q.id]) ? answers[q.id] : []
      }))

      const res = await fetch('/api/participante/mis-tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: task.submissionId,
          evidenceText: task.requiresEvidence ? evidenceText : undefined,
          answers: task.type === 'QUESTIONNAIRE' ? formattedAnswers : undefined
        })
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onComplete()
        }, 2000)
      } else {
        setError(data.error || 'Error al enviar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
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
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          /* Estado de éxito */
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">¡Misión Enviada!</h3>
            <p className="text-slate-400">
              Tu entrenador revisará tu trabajo pronto
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full">
              <Award className="w-5 h-5" />
              +{task.pointsReward} puntos potenciales
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`p-6 bg-gradient-to-r ${type.color}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-sm text-white/70">{type.label}</span>
                    <h2 className="text-xl font-bold text-white">{task.title}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex items-center gap-4 mt-4 text-sm text-white/80">
                <span>{task.visionName}</span>
                {task.estimatedMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {task.estimatedMinutes} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {task.pointsReward} pts
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  {error}
                </div>
              )}

              {task.description && (
                <div className="p-4 bg-slate-800 rounded-xl">
                  <p className="text-slate-300">{task.description}</p>
                </div>
              )}

              {/* Preguntas de cuestionario */}
              {task.type === 'QUESTIONNAIRE' && task.questions.length > 0 && (
                <div className="space-y-4">
                  {task.questions.map((q, i) => (
                    <div key={q.id} className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {i + 1}. {q.text}
                        {q.isRequired && <span className="text-red-400 ml-1">*</span>}
                      </label>

                      {q.type === 'OPEN' && (
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Tu respuesta..."
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                        />
                      )}

                      {q.type === 'YES_NO' && (
                        <div className="flex gap-3">
                          {['Sí', 'No'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, opt)}
                              className={`flex-1 py-3 rounded-xl border transition-all ${
                                answers[q.id] === opt
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {q.type === 'SCALE' && (
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={q.scaleMin || 1}
                            max={q.scaleMax || 10}
                            value={answers[q.id] || q.scaleMin || 1}
                            onChange={(e) => handleAnswerChange(q.id, parseInt(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>{q.scaleMinLabel || q.scaleMin || 1}</span>
                            <span className="text-amber-400 font-bold">
                              {answers[q.id] || q.scaleMin || 1}
                            </span>
                            <span>{q.scaleMaxLabel || q.scaleMax || 10}</span>
                          </div>
                        </div>
                      )}

                      {q.type === 'MULTIPLE_CHOICE' && q.options.length > 0 && (
                        <div className="space-y-2">
                          {q.options.map((opt, j) => (
                            <button
                              key={j}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, opt)}
                              className={`w-full p-3 text-left rounded-xl border transition-all ${
                                answers[q.id] === opt
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Campo de evidencia */}
              {task.requiresEvidence && task.type !== 'QUESTIONNAIRE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tu entrega / reflexión
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <textarea
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    placeholder={
                      task.type === 'CONTENT'
                        ? '¿Qué aprendiste del contenido?'
                        : task.type === 'ACTION'
                        ? 'Describe cómo completaste la acción...'
                        : 'Comparte tu reflexión...'
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Misión
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
