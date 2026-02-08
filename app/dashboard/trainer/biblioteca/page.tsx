'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, Plus, Search, Filter, Edit2, Trash2, Copy,
  FileQuestion, Film, Zap, Heart, Clock, Award, Tag,
  ChevronDown, ChevronUp, X, Save, AlertCircle, Drama, Theater,
  Upload, FileText, Loader2, Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'

interface Question {
  id?: number
  questionText: string
  questionType: 'OPEN' | 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'SCALE' | 'YES_NO'
  isRequired: boolean
  options: string[]
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
}

interface Template {
  id: number
  title: string
  description: string | null
  type: 'QUESTIONNAIRE' | 'CONTENT' | 'ACTION' | 'REFLECTION'
  tags: string[]
  requiresEvidence: boolean
  evidenceType: string | null
  contentUrl: string | null
  contentTitle: string | null
  pointsReward: number
  estimatedMinutes: number | null
  usageCount: number
  createdAt: string
  Questions: Question[]
}

const typeConfig = {
  QUESTIONNAIRE: { icon: FileQuestion, label: 'Cuestionario', color: 'from-blue-500 to-cyan-500' },
  CONTENT: { icon: Film, label: 'Contenido', color: 'from-purple-500 to-pink-500' },
  ACTION: { icon: Zap, label: 'Acción', color: 'from-amber-500 to-orange-500' },
  REFLECTION: { icon: Heart, label: 'Reflexión', color: 'from-rose-500 to-red-500' }
}

export default function BibliotecaPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [hasActiveAdvanced, setHasActiveAdvanced] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null; title: string }>({ show: false, id: null, title: '' })

  useEffect(() => {
    fetchTemplates()
  }, [search, filterType, filterTag])

  // Verificar si tiene avanzado activo
  useEffect(() => {
    const checkActiveAdvanced = async () => {
      try {
        const res = await fetch('/api/trainer/has-active-advanced')
        if (res.ok) {
          const data = await res.json()
          setHasActiveAdvanced(data.hasActiveAdvanced === true)
        }
      } catch (error) {
        console.error('Error checking active advanced:', error)
      }
    }
    checkActiveAdvanced()
  }, [])

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterType) params.set('type', filterType)
      if (filterTag) params.set('tag', filterTag)

      console.log('🔄 Fetching biblioteca...')
      const res = await fetch(`/api/trainer/biblioteca?${params}`, {
        credentials: 'include'
      })
      console.log('📡 Response status:', res.status)
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error('❌ API Error:', res.status, errorData)
        return
      }
      
      const data = await res.json()
      console.log('✅ Data received:', data)

      if (data.success) {
        setTemplates(data.templates)
        setAvailableTags(data.filters?.tags || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id: number, title: string) => {
    setDeleteConfirm({ show: true, id, title })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return

    try {
      const res = await fetch(`/api/trainer/biblioteca/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    } finally {
      setDeleteConfirm({ show: false, id: null, title: '' })
    }
  }

  const handleDuplicate = async (template: Template) => {
    try {
      const res = await fetch('/api/trainer/biblioteca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          title: `${template.title} (copia)`,
          questions: template.Questions
        })
      })

      if (res.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">La Biblioteca del Entrenador</h1>
              <p className="text-slate-400">Tu arsenal de tareas listo para lanzar</p>
            </div>
          </div>
        </motion.div>

        {/* Barra de acciones */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filtro por tipo */}
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

          {/* Filtro por tag */}
          {availableTags.length > 0 && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Todas las etiquetas</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          {/* Botón Personajes (solo si tiene avanzado activo) */}
          {hasActiveAdvanced && (
            <Link
              href="/dashboard/trainer/personajes"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
              <Drama className="w-5 h-5" />
              Personajes
            </Link>
          )}

          {/* Botón Saltos Cuánticos (solo si tiene avanzado activo) */}
          {hasActiveAdvanced && (
            <Link
              href="/dashboard/trainer/metamorfosis"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-fuchsia-500/20 transition-all"
            >
              <Theater className="w-5 h-5" />
              Saltos Cuánticos
            </Link>
          )}

          {/* Botón crear */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            Nueva Plantilla
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(typeConfig).map(([type, config]) => {
            const count = templates.filter(t => t.type === type).length
            const Icon = config.icon
            return (
              <motion.div
                key={type}
                whileHover={{ scale: 1.02 }}
                className={`p-4 bg-gradient-to-br ${config.color} bg-opacity-20 rounded-xl border border-white/10`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-sm text-white/70">{config.label}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Lista de plantillas */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : templates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Tu biblioteca está vacía</h3>
            <p className="text-slate-400 mb-6">Crea tu primera plantilla de tarea</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Crear Plantilla
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => {
              const config = typeConfig[template.type]
              const Icon = config.icon
              const isExpanded = expandedId === template.id

              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  >
                    <div className={`p-3 bg-gradient-to-br ${config.color} rounded-xl`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{template.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span>{config.label}</span>
                        {template.estimatedMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {template.estimatedMinutes} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          {template.pointsReward} pts
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Usado {template.usageCount}x
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Contenido expandido */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-700"
                      >
                        <div className="p-4 space-y-4">
                          {template.description && (
                            <p className="text-slate-300">{template.description}</p>
                          )}

                          {template.type === 'CONTENT' && template.contentTitle && (
                            <div className="p-3 bg-slate-700/50 rounded-lg">
                              <p className="text-sm text-slate-400">Contenido:</p>
                              <p className="text-white font-medium">{template.contentTitle}</p>
                              {template.contentUrl && (
                                <a
                                  href={template.contentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-amber-400 hover:underline"
                                >
                                  Ver contenido
                                </a>
                              )}
                            </div>
                          )}

                          {template.type === 'QUESTIONNAIRE' && template.Questions.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-400">Preguntas ({template.Questions.length}):</p>
                              {template.Questions.map((q, i) => (
                                <div key={i} className="p-3 bg-slate-700/50 rounded-lg">
                                  <p className="text-white">{i + 1}. {q.questionText}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Tipo: {q.questionType} {q.isRequired && '• Requerida'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Botones de acción */}
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => setEditingTemplate(template)}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDuplicate(template)}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicar
                            </button>
                            <button
                              onClick={() => handleDeleteClick(template.id, template.title)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de crear/editar */}
      <AnimatePresence>
        {(showCreateModal || editingTemplate) && (
          <TemplateModal
            template={editingTemplate}
            onClose={() => {
              setShowCreateModal(false)
              setEditingTemplate(null)
            }}
            onSave={() => {
              fetchTemplates()
              setShowCreateModal(false)
              setEditingTemplate(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de confirmación de eliminación */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm({ show: false, id: null, title: '' })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Eliminar Plantilla</h3>
                  <p className="text-sm text-slate-400">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <p className="text-slate-300 mb-6">
                ¿Estás seguro de que deseas eliminar la plantilla <span className="font-semibold text-white">"{deleteConfirm.title}"</span>?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm({ show: false, id: null, title: '' })}
                  className="px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Modal de crear/editar plantilla
function TemplateModal({
  template,
  onClose,
  onSave
}: {
  template: Template | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    title: template?.title || '',
    description: template?.description || '',
    type: template?.type || 'ACTION',
    tags: template?.tags || [],
    requiresEvidence: template?.requiresEvidence ?? false,
    evidenceType: template?.evidenceType || 'text',
    contentUrl: template?.contentUrl || '',
    contentTitle: template?.contentTitle || '',
    pointsReward: template?.pointsReward ?? 50,
    estimatedMinutes: template?.estimatedMinutes ?? ''
  })
  const [questions, setQuestions] = useState<Question[]>(template?.Questions || [])
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState(template?.contentUrl || '')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState(template?.type === 'CONTENT' ? template?.contentUrl || '' : '')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      questionText: '',
      questionType: 'OPEN',
      isRequired: true,
      options: []
    }])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  const handleSubmit = async () => {
    if (!formData.title) {
      setError('El título es requerido')
      return
    }

    if (formData.tags.length === 0) {
      setError('Debes agregar al menos una etiqueta')
      return
    }

    setSaving(true)
    setError('')

    try {
      let finalPdfUrl = pdfUrl
      let finalImageUrl = imageUrl || formData.contentUrl

      // Si hay un archivo PDF nuevo, subirlo primero (para REFLECTION)
      if (pdfFile && formData.type === 'REFLECTION') {
        setUploadingPdf(true)
        const pdfFormData = new FormData()
        pdfFormData.append('file', pdfFile)
        pdfFormData.append('folder', 'templates')

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: pdfFormData
        })

        const uploadData = await uploadRes.json()
        
        if (uploadData.url) {
          finalPdfUrl = uploadData.url
        } else {
          setError('Error al subir el PDF')
          setUploadingPdf(false)
          setSaving(false)
          return
        }
        setUploadingPdf(false)
      }

      // Si hay una imagen nueva, subirla (para CONTENT)
      if (imageFile && formData.type === 'CONTENT') {
        setUploadingImage(true)
        const imgFormData = new FormData()
        imgFormData.append('file', imageFile)
        imgFormData.append('folder', 'templates')

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: imgFormData
        })

        const uploadData = await uploadRes.json()
        
        if (uploadData.url) {
          finalImageUrl = uploadData.url
        } else {
          setError('Error al subir la imagen')
          setUploadingImage(false)
          setSaving(false)
          return
        }
        setUploadingImage(false)
      }

      const url = template
        ? `/api/trainer/biblioteca/${template.id}`
        : '/api/trainer/biblioteca'

      // Determinar el contentUrl final según el tipo
      let finalContentUrl = formData.contentUrl
      if (formData.type === 'REFLECTION') {
        finalContentUrl = finalPdfUrl
      } else if (formData.type === 'CONTENT' && finalImageUrl) {
        // Si hay imagen, guardar la URL de la imagen; si también hay URL manual, usar ambas
        finalContentUrl = finalImageUrl || formData.contentUrl
      }

      const res = await fetch(url, {
        method: template ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contentUrl: finalContentUrl,
          pointsReward: formData.pointsReward === '' ? 50 : formData.pointsReward,
          estimatedMinutes: formData.estimatedMinutes === '' ? null : formData.estimatedMinutes,
          questions: formData.type === 'QUESTIONNAIRE' ? questions : undefined
        })
      })

      const data = await res.json()

      if (data.success) {
        onSave()
      } else {
        setError(data.error || 'Error al guardar')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
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
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {template ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Ver película El Guerrero Pacífico"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipo de Tarea *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(typeConfig).map(([type, config]) => {
                const Icon = config.icon
                const isSelected = formData.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type as any })}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${config.color} border-transparent`
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <p className={`text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>{config.label}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Descripción / Instrucciones
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instrucciones detalladas para el participante..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Campos específicos por tipo */}
          {formData.type === 'CONTENT' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título del Contenido
                </label>
                <input
                  type="text"
                  value={formData.contentTitle}
                  onChange={(e) => setFormData({ ...formData, contentTitle: e.target.value })}
                  placeholder="Ej: El Guerrero Pacífico"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Subida de imagen */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Imagen (opcional)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Puedes subir una imagen de portada o referencia
                </p>

                {(imageUrl || imagePreview) && !imageFile && (
                  <div className="relative mb-3">
                    <img 
                      src={imagePreview || imageUrl} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-xl border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setImagePreview(null); }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {imageFile && (
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/30 mb-3">
                    <ImageIcon className="w-8 h-8 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{imageFile.name}</p>
                      <p className="text-xs text-slate-400">{(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {!imageFile && !imageUrl && !imagePreview && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-sm text-slate-400">Haz clic para subir una imagen</span>
                    <span className="text-xs text-slate-500 mt-1">JPG, PNG, GIF (máx. 5 MB)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setError('La imagen no puede superar los 5 MB')
                            return
                          }
                          setImageFile(file)
                          setImagePreview(URL.createObjectURL(file))
                          setError('')
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL del Contenido (opcional)
                </label>
                <input
                  type="url"
                  value={formData.contentUrl}
                  onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </>
          )}

          {/* Sección de PDF para Reflexión */}
          {formData.type === 'REFLECTION' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Documento PDF (opcional)
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Puedes adjuntar un PDF con material de apoyo para la reflexión
              </p>
              
              {pdfUrl && !pdfFile && (
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
                  <FileText className="w-8 h-8 text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm text-white">PDF adjunto</p>
                    <a 
                      href={pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Ver documento
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfUrl('')}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {pdfFile && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                  <FileText className="w-8 h-8 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{pdfFile.name}</p>
                    <p className="text-xs text-slate-400">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!pdfFile && !pdfUrl && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-400">Haz clic para subir un PDF</span>
                  <span className="text-xs text-slate-500 mt-1">Máximo 10 MB</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setError('El archivo PDF no puede superar los 10 MB')
                          return
                        }
                        setPdfFile(file)
                        setError('')
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {formData.type === 'QUESTIONNAIRE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Preguntas ({questions.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="text-sm text-amber-400 hover:text-amber-300"
                >
                  + Agregar pregunta
                </button>
              </div>

              {questions.map((q, index) => (
                <div key={index} className="p-4 bg-slate-800 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-500 mt-3">{index + 1}.</span>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                        placeholder="Escribe la pregunta..."
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex gap-3">
                        <select
                          value={q.questionType}
                          onChange={(e) => handleQuestionChange(index, 'questionType', e.target.value)}
                          className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        >
                          <option value="OPEN">Respuesta abierta</option>
                          <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                          <option value="SCALE">Escala 1-10</option>
                          <option value="YES_NO">Sí/No</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-slate-400">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => handleQuestionChange(index, 'isRequired', e.target.checked)}
                            className="rounded"
                          />
                          Requerida
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(index)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {questions.length === 0 && (
                <p className="text-center text-slate-500 py-4">
                  No hay preguntas. Agrega al menos una.
                </p>
              )}
            </div>
          )}

          {/* Etiquetas */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm"
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Agregar etiqueta..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 text-sm"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploadingPdf || uploadingImage}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {uploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo imagen...
              </>
            ) : uploadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subiendo PDF...
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {template ? 'Guardar Cambios' : 'Crear Plantilla'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
