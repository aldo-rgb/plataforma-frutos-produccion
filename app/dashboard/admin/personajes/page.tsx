'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, Filter, Edit2, Trash2, Sparkles, Plus,
  Drama, Crown, Ghost, Heart, Angry, Frown,
  ChevronDown, X, Save, Eye, Loader2, Image as ImageIcon, Upload,
  CheckCircle, AlertTriangle, BarChart3
} from 'lucide-react'
import Image from 'next/image'

interface Archetype {
  id: number
  name: string
  category: string
  maneraSerTag: string
  maneraSerLabel: string
  scriptFeedback: string
  description: string | null
  imageUrl: string | null
  isSystemDefault: boolean
  isActive: boolean
  _count: { Assignments: number }
}

const categoryConfig: Record<string, { icon: any; label: string; color: string; gradient: string }> = {
  VICTIMA_DRAMA: { 
    icon: Frown, 
    label: 'Víctima / Drama', 
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-600'
  },
  NINO_BERRINCHUDO: { 
    icon: Angry, 
    label: 'Niño Berrinchudo', 
    color: 'text-red-400',
    gradient: 'from-red-500 to-orange-600'
  },
  MASCARA_DUREZA_EGO: { 
    icon: Crown, 
    label: 'Máscara Dureza / Ego', 
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-yellow-600'
  },
  SALVADORES_MARTIRES: { 
    icon: Heart, 
    label: 'Salvadores / Mártires', 
    color: 'text-pink-400',
    gradient: 'from-pink-500 to-rose-600'
  },
  INVISIBLES_SOLITARIOS: { 
    icon: Ghost, 
    label: 'Invisibles / Solitarios', 
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-violet-600'
  },
  MASCARA_SOCIAL: { 
    icon: Drama, 
    label: 'Máscara Social', 
    color: 'text-teal-400',
    gradient: 'from-teal-500 to-cyan-600'
  },
  CUSTOM: { 
    icon: Sparkles, 
    label: 'Personalizado', 
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-green-600'
  }
}

export default function AdminPersonajesPage() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Modals
  const [editingArchetype, setEditingArchetype] = useState<Archetype | null>(null)
  const [previewArchetype, setPreviewArchetype] = useState<Archetype | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Archetype | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Form state
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'CUSTOM',
    maneraSerTag: '',
    maneraSerLabel: '',
    scriptFeedback: '',
    description: '',
    imageUrl: ''
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchArchetypes()
  }, [])

  const fetchArchetypes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/archetypes')
      if (res.ok) {
        const data = await res.json()
        setArchetypes(data.archetypes)
      }
    } catch (error) {
      console.error('Error fetching archetypes:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditForm({
      name: '',
      category: 'CUSTOM',
      maneraSerTag: '',
      maneraSerLabel: '',
      scriptFeedback: '',
      description: '',
      imageUrl: ''
    })
  }

  const handleEdit = (archetype: Archetype) => {
    setEditingArchetype(archetype)
    setEditForm({
      name: archetype.name,
      category: archetype.category,
      maneraSerTag: archetype.maneraSerTag,
      maneraSerLabel: archetype.maneraSerLabel,
      scriptFeedback: archetype.scriptFeedback,
      description: archetype.description || '',
      imageUrl: archetype.imageUrl || ''
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG, WebP o GIF')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede ser mayor a 5MB')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/archetypes/upload-image', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setEditForm(prev => ({ ...prev, imageUrl: data.imageUrl }))
      } else {
        const error = await res.json()
        alert(error.error || 'Error al subir imagen')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!editingArchetype) return

    try {
      setSaving(true)
      const res = await fetch(`/api/admin/archetypes/${editingArchetype.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (res.ok) {
        await fetchArchetypes()
        setEditingArchetype(null)
        resetForm()
      } else {
        const error = await res.json()
        alert(error.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error saving archetype:', error)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!editForm.name || !editForm.maneraSerTag || !editForm.maneraSerLabel || !editForm.scriptFeedback) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/admin/archetypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (res.ok) {
        await fetchArchetypes()
        setShowCreateModal(false)
        resetForm()
      } else {
        const error = await res.json()
        alert(error.error || 'Error al crear')
      }
    } catch (error) {
      console.error('Error creating archetype:', error)
      alert('Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/admin/archetypes/${deleteConfirm.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.deactivated) {
          alert('El personaje fue desactivado porque tiene asignaciones activas')
        }
        await fetchArchetypes()
        setDeleteConfirm(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting archetype:', error)
      alert('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = async (archetype: Archetype) => {
    try {
      const res = await fetch(`/api/admin/archetypes/${archetype.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !archetype.isActive })
      })

      if (res.ok) {
        await fetchArchetypes()
      }
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  // Filtrar arquetipos
  const filteredArchetypes = archetypes.filter(arch => {
    if (!showInactive && !arch.isActive) return false
    if (selectedCategory && arch.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        arch.name.toLowerCase().includes(q) ||
        arch.maneraSerLabel.toLowerCase().includes(q)
      )
    }
    return true
  })

  const categories = Object.keys(categoryConfig)

  // Stats
  const stats = {
    total: archetypes.length,
    active: archetypes.filter(a => a.isActive).length,
    inactive: archetypes.filter(a => !a.isActive).length,
    withAssignments: archetypes.filter(a => a._count.Assignments > 0).length,
    totalAssignments: archetypes.reduce((sum, a) => sum + a._count.Assignments, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  // Form modal content (used for both create and edit)
  const FormContent = ({ isCreate = false }: { isCreate?: boolean }) => (
    <div className="space-y-4">
      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Imagen
        </label>
        <div className="flex items-start gap-4">
          <div className="w-32 h-32 bg-[#0a0a1a] rounded-xl overflow-hidden flex-shrink-0">
            {editForm.imageUrl ? (
              <Image
                src={editForm.imageUrl}
                alt="Preview"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-600" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Subir imagen
            </button>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG, WebP o GIF. Máx 5MB
            </p>
            <input
              type="text"
              placeholder="O pega URL de imagen"
              value={editForm.imageUrl}
              onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
              className="mt-2 w-full px-3 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nombre del Personaje *
        </label>
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: El Rebelde"
          className="w-full px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Categoría *
        </label>
        <select
          value={editForm.category}
          onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
          className="w-full px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{categoryConfig[cat].label}</option>
          ))}
        </select>
      </div>

      {/* Manera de Ser Label */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Etiqueta "Manera de Ser" *
        </label>
        <input
          type="text"
          value={editForm.maneraSerLabel}
          onChange={(e) => setEditForm(prev => ({ ...prev, maneraSerLabel: e.target.value }))}
          placeholder="Ej: El que siempre busca aprobación"
          className="w-full px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Manera de Ser Tag */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tag técnico *
        </label>
        <input
          type="text"
          value={editForm.maneraSerTag}
          onChange={(e) => setEditForm(prev => ({ ...prev, maneraSerTag: e.target.value }))}
          placeholder="Ej: buscador_aprobacion"
          className="w-full px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Descripción
        </label>
        <textarea
          value={editForm.description}
          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          placeholder="Descripción breve del personaje..."
          className="w-full px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* Script Feedback */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Script de Feedback *
        </label>
        <textarea
          value={editForm.scriptFeedback}
          onChange={(e) => setEditForm(prev => ({ ...prev, scriptFeedback: e.target.value }))}
          rows={4}
          placeholder="Texto que se mostrará como feedback del personaje..."
          className="w-full px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Personajes del Sistema
            </h1>
            <p className="text-gray-400">
              Administra los arquetipos globales que ven todos los trainers
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Nuevo Personaje
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Drama className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-gray-400">Total Sistema</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
                <p className="text-xs text-gray-400">Activos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inactive}</p>
                <p className="text-xs text-gray-400">Inactivos</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.withAssignments}</p>
                <p className="text-xs text-gray-400">Con asignaciones</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalAssignments}</p>
                <p className="text-xs text-gray-400">Asignaciones</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/10 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o etiqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Category filter */}
            <div className="relative">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="appearance-none px-4 py-2 pr-10 bg-[#0a0a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryConfig[cat].label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Show inactive toggle */}
            <label className="flex items-center gap-2 px-4 py-2 bg-[#0a0a1a] border border-white/10 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-white text-sm">Mostrar inactivos</span>
            </label>
          </div>
        </div>

        {/* Archetypes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredArchetypes.map(archetype => {
            const catConfig = categoryConfig[archetype.category] || categoryConfig.CUSTOM
            const Icon = catConfig.icon

            return (
              <motion.div
                key={archetype.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#1a1a2e] rounded-xl border overflow-hidden ${
                  archetype.isActive ? 'border-white/10' : 'border-red-500/30 opacity-60'
                }`}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gradient-to-br from-cyan-900/30 to-blue-900/30">
                  {archetype.imageUrl ? (
                    <Image
                      src={archetype.imageUrl}
                      alt={archetype.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className={`w-20 h-20 ${catConfig.color} opacity-50`} />
                    </div>
                  )}

                  {/* System badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-cyan-500/80 rounded text-xs text-white font-medium">
                    Sistema
                  </div>

                  {/* Status badge */}
                  {!archetype.isActive && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/80 rounded text-xs text-white font-medium">
                      Inactivo
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPreviewArchetype(archetype)}
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => handleEdit(archetype)}
                      className="p-2 bg-blue-500/80 rounded-lg hover:bg-blue-500 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(archetype)}
                      className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${catConfig.color}`} />
                      <span className="text-xs text-gray-400">{catConfig.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {archetype._count.Assignments} asig.
                    </span>
                  </div>
                  
                  <h3 className="text-white font-semibold mb-1 truncate">{archetype.name}</h3>
                  <p className="text-sm text-cyan-400 truncate">{archetype.maneraSerLabel}</p>

                  {/* Toggle active */}
                  <button
                    onClick={() => toggleActive(archetype)}
                    className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      archetype.isActive
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {archetype.isActive ? 'Activo' : 'Activar'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredArchetypes.length === 0 && (
          <div className="text-center py-12">
            <Drama className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No se encontraron personajes del sistema</p>
          </div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Nuevo Personaje del Sistema</h2>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-sm text-cyan-400 mt-1">
                    Este personaje estará disponible para todos los trainers
                  </p>
                </div>

                <div className="p-6">
                  <FormContent isCreate={true} />
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || !editForm.name || !editForm.maneraSerLabel || !editForm.maneraSerTag || !editForm.scriptFeedback}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Crear Personaje
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingArchetype && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => setEditingArchetype(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Editar Personaje del Sistema</h2>
                    <button
                      onClick={() => setEditingArchetype(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <FormContent />
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingArchetype(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editForm.name || !editForm.maneraSerLabel}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar Cambios
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Modal */}
        <AnimatePresence>
          {previewArchetype && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => setPreviewArchetype(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a2e] rounded-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gradient-to-br from-cyan-900/30 to-blue-900/30">
                  {previewArchetype.imageUrl ? (
                    <Image
                      src={previewArchetype.imageUrl}
                      alt={previewArchetype.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Drama className="w-32 h-32 text-cyan-400/30" />
                    </div>
                  )}
                  <button
                    onClick={() => setPreviewArchetype(null)}
                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const catConfig = categoryConfig[previewArchetype.category] || categoryConfig.CUSTOM
                      const Icon = catConfig.icon
                      return (
                        <>
                          <Icon className={`w-5 h-5 ${catConfig.color}`} />
                          <span className="text-sm text-gray-400">{catConfig.label}</span>
                        </>
                      )
                    })()}
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-2">{previewArchetype.name}</h2>
                  <p className="text-cyan-400 mb-4">{previewArchetype.maneraSerLabel}</p>

                  {previewArchetype.description && (
                    <p className="text-gray-300 mb-4">{previewArchetype.description}</p>
                  )}

                  <div className="bg-[#0a0a1a] rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Script de Feedback</h4>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {previewArchetype.scriptFeedback}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{previewArchetype._count.Assignments} asignaciones</span>
                    <span className="text-cyan-400">Personaje del Sistema</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a2e] rounded-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Eliminar Personaje del Sistema</h3>
                    <p className="text-gray-400 text-sm">Esta acción afectará a todos los trainers</p>
                  </div>
                </div>

                <p className="text-gray-300 mb-2">
                  ¿Estás seguro de eliminar <strong className="text-white">{deleteConfirm.name}</strong>?
                </p>

                {deleteConfirm._count.Assignments > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                    <p className="text-amber-400 text-sm">
                      ⚠️ Este personaje tiene {deleteConfirm._count.Assignments} asignaciones activas.
                      Será desactivado en lugar de eliminado para preservar el historial.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Eliminar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
