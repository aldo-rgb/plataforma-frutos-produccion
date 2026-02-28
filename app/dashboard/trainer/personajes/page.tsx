'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Plus, Search, Filter, Edit2, Trash2, Send, Sparkles,
  Theater, Drama, Crown, Ghost, Heart, Angry, Frown, Star,
  ChevronDown, X, Save, Eye, CheckCircle, Loader2, Image as ImageIcon, Upload
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
  trainerId: number | null
  Usuario: { id: number; nombre: string } | null
  _count: { ArchetypeAssignment: number }
}

interface Assignment {
  id: number
  status: 'SENT' | 'VIEWED' | 'ACCEPTED' | 'TRANSFORMED'
  customNote: string | null
  createdAt: string
  Archetype: {
    id: number
    name: string
    category: string
    maneraSerLabel: string
    imageUrl: string | null
  }
  Participant: {
    id: number
    nombre: string
    email: string
    profileImage: string | null
  }
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

const statusConfig: Record<string, { label: string; color: string }> = {
  SENT: { label: 'Enviado', color: 'bg-blue-500' },
  VIEWED: { label: 'Visto', color: 'bg-yellow-500' },
  ACCEPTED: { label: 'Aceptado', color: 'bg-green-500' },
  TRANSFORMED: { label: 'Transformado', color: 'bg-purple-500' }
}

export default function PersonajesPage() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'galeria' | 'asignaciones'>('galeria')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null)
  const [previewArchetype, setPreviewArchetype] = useState<Archetype | null>(null)
  const [editingArchetype, setEditingArchetype] = useState<Archetype | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Archetype | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toast notification
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  })

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000)
  }

  useEffect(() => {
    fetchArchetypes()
    fetchAssignments()
  }, [])

  const fetchArchetypes = async () => {
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      
      const res = await fetch(`/api/trainer/archetypes?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        console.log('[Personajes] Arquetipos cargados:', data.archetypes?.length || 0)
        setArchetypes(data.archetypes || [])
      } else {
        console.error('[Personajes] Error en respuesta:', data.error || res.status)
        showToast(data.error || 'Error al cargar personajes', 'error')
      }
    } catch (error) {
      console.error('[Personajes] Error fetching archetypes:', error)
      showToast('Error de conexión al cargar personajes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/trainer/archetypes/assign')
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const filteredArchetypes = archetypes.filter(arch => {
    const matchesSearch = arch.name.toLowerCase().includes(search.toLowerCase()) ||
                         arch.maneraSerLabel.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !filterCategory || arch.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const groupedArchetypes = filteredArchetypes.reduce((acc, arch) => {
    const cat = arch.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(arch)
    return acc
  }, {} as Record<string, Archetype[]>)

  const handleOpenAssignModal = (archetype: Archetype) => {
    setSelectedArchetype(archetype)
    setShowAssignModal(true)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/trainer/archetypes/${deleteConfirm.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        const data = await res.json()
        if (data.deactivated) {
          showToast('Personaje desactivado (tiene asignaciones activas)', 'info')
        } else {
          showToast('Personaje eliminado', 'success')
        }
        fetchArchetypes()
        setDeleteConfirm(null)
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al eliminar', 'error')
      }
    } catch (error) {
      console.error('Error deleting archetype:', error)
      showToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className={`
              px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border
              flex items-center gap-3 min-w-[300px]
              ${toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20' 
                : toast.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 shadow-red-500/20'
                : 'bg-blue-500/20 border-blue-500/50 shadow-blue-500/20'
              }
            `}>
              <div className={`
                p-2 rounded-full flex-shrink-0
                ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}
              `}>
                {toast.type === 'success' ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : toast.type === 'error' ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </div>
              <span className={`font-semibold ${
                toast.type === 'success' ? 'text-emerald-100' : 
                toast.type === 'error' ? 'text-red-100' : 'text-blue-100'
              }`}>
                {toast.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20">
              <Theater className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Casting de Personajes</h1>
              <p className="text-slate-400">Asigna arquetipos a tus participantes para su transformación</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('galeria')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'galeria'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Drama className="w-5 h-5" />
              Galería de Personajes
            </div>
          </button>
          <button
            onClick={() => setActiveTab('asignaciones')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'asignaciones'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Mis Asignaciones
              {assignments.length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {assignments.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {activeTab === 'galeria' ? (
          <>
            {/* Barra de acciones */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar personaje..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                Crear Personaje
              </button>
            </div>

            {/* Stats por categoría */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = archetypes.filter(a => a.category === key).length
                const Icon = config.icon
                return (
                  <motion.button
                    key={key}
                    onClick={() => setFilterCategory(filterCategory === key ? '' : key)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border transition-all ${
                      filterCategory === key
                        ? `bg-gradient-to-br ${config.gradient} border-white/20 shadow-lg`
                        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${filterCategory === key ? 'text-white' : config.color}`} />
                    <p className={`text-lg font-bold ${filterCategory === key ? 'text-white' : 'text-white'}`}>{count}</p>
                    <p className={`text-xs ${filterCategory === key ? 'text-white/80' : 'text-slate-500'} truncate`}>
                      {config.label.split('/')[0]}
                    </p>
                  </motion.button>
                )
              })}
            </div>

            {/* Galería de personajes */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : Object.keys(groupedArchetypes).length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Theater className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay personajes</h3>
                <p className="text-slate-400 mb-6">Crea tu primer personaje o carga los predefinidos</p>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedArchetypes).map(([category, archs]) => {
                  const config = categoryConfig[category] || categoryConfig.CUSTOM
                  const Icon = config.icon
                  
                  return (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{config.label}</h2>
                        <span className="px-2 py-1 bg-slate-800 rounded-full text-sm text-slate-400">
                          {archs.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {archs.map((archetype) => (
                          <ArchetypeCard
                            key={archetype.id}
                            archetype={archetype}
                            onPreview={() => setPreviewArchetype(archetype)}
                            onAssign={() => handleOpenAssignModal(archetype)}
                            onEdit={() => setEditingArchetype(archetype)}
                            onDelete={() => setDeleteConfirm(archetype)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* Tab de Asignaciones */
          <AssignmentsTab 
            assignments={assignments} 
            onRefresh={fetchAssignments}
          />
        )}
      </div>

      {/* Modal de Preview */}
      <AnimatePresence>
        {previewArchetype && (
          <ArchetypePreviewModal
            archetype={previewArchetype}
            onClose={() => setPreviewArchetype(null)}
            onAssign={() => {
              setPreviewArchetype(null)
              handleOpenAssignModal(previewArchetype)
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Crear */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateArchetypeModal
            onClose={() => setShowCreateModal(false)}
            showToast={showToast}
            onCreated={() => {
              setShowCreateModal(false)
              fetchArchetypes()
              showToast('Personaje creado exitosamente', 'success')
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Asignar */}
      <AnimatePresence>
        {showAssignModal && selectedArchetype && (
          <AssignArchetypeModal
            archetype={selectedArchetype}
            showToast={showToast}
            onClose={() => {
              setShowAssignModal(false)
              setSelectedArchetype(null)
            }}
            onAssigned={() => {
              setShowAssignModal(false)
              setSelectedArchetype(null)
              fetchAssignments()
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Editar */}
      <AnimatePresence>
        {editingArchetype && (
          <EditArchetypeModal
            archetype={editingArchetype}
            onClose={() => setEditingArchetype(null)}
            onUpdated={() => {
              setEditingArchetype(null)
              fetchArchetypes()
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Eliminación */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-red-500/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Eliminar Personaje</h3>
                  <p className="text-slate-400 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <p className="text-slate-300 mb-2">
                ¿Estás seguro de eliminar <strong className="text-white">{deleteConfirm.name}</strong>?
              </p>

              {deleteConfirm._count.ArchetypeAssignment > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <p className="text-amber-400 text-sm">
                    ⚠️ Este personaje tiene {deleteConfirm._count.ArchetypeAssignment} asignaciones.
                    Será desactivado en lugar de eliminado.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
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
  )
}

// Componente de tarjeta de arquetipo (estilo coleccionable)
function ArchetypeCard({ 
  archetype, 
  onPreview,
  onAssign,
  onEdit,
  onDelete
}: { 
  archetype: Archetype
  onPreview: () => void
  onAssign: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const config = categoryConfig[archetype.category] || categoryConfig.CUSTOM
  const isOwner = !archetype.isSystemDefault // Si no es del sistema, el trainer lo creó

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      className="group relative"
    >
      {/* Card frame con efecto holográfico */}
      <div className={`relative bg-gradient-to-br ${config.gradient} p-[2px] rounded-2xl overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />
        
        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          {/* Imagen del personaje */}
          <div className="aspect-[3/4] relative bg-gradient-to-br from-slate-800 to-slate-900">
            {archetype.imageUrl ? (
              <Image
                src={archetype.imageUrl}
                alt={archetype.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Drama className={`w-16 h-16 ${config.color} opacity-50`} />
              </div>
            )}
            
            {/* Overlay con acciones */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={onPreview}
                    className="flex-1 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Ver
                  </button>
                  <button
                    onClick={onAssign}
                    className="flex-1 py-2 bg-purple-500/80 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-purple-500 transition-colors"
                  >
                    <Send className="w-4 h-4 inline mr-1" />
                    Asignar
                  </button>
                </div>
                {/* Botones de editar/eliminar solo para personajes propios */}
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={onEdit}
                      className="flex-1 py-2 bg-blue-500/80 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-blue-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={onDelete}
                      className="flex-1 py-2 bg-red-500/80 backdrop-blur-sm rounded-lg text-white text-sm font-medium hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Badge si es del sistema */}
            {archetype.isSystemDefault && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/90 rounded-full">
                <Star className="w-3 h-3 text-white inline" />
              </div>
            )}
          </div>

          {/* Info del personaje */}
          <div className="p-3">
            <h3 className="font-bold text-white truncate">{archetype.name}</h3>
            <p className="text-xs text-slate-400 truncate">{archetype.maneraSerLabel}</p>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${config.color}`}>
                {archetype.maneraSerTag}
              </span>
              <span className="text-xs text-slate-500">
                {archetype._count.ArchetypeAssignment} asignados
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Modal de preview del arquetipo
function ArchetypePreviewModal({ 
  archetype, 
  onClose,
  onAssign
}: { 
  archetype: Archetype
  onClose: () => void
  onAssign: () => void
}) {
  const config = categoryConfig[archetype.category] || categoryConfig.CUSTOM

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header con imagen */}
        <div className={`relative h-64 bg-gradient-to-br ${config.gradient}`}>
          {archetype.imageUrl ? (
            <Image
              src={archetype.imageUrl}
              alt={archetype.name}
              fill
              className="object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Drama className="w-24 h-24 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 rounded-full text-white hover:bg-black/50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 bg-white/20 rounded-full text-sm text-white`}>
                {config.label}
              </span>
              {archetype.isSystemDefault && (
                <span className="px-3 py-1 bg-amber-500/80 rounded-full text-sm text-white flex items-center gap-1">
                  <Star className="w-3 h-3" /> Predefinido
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white">{archetype.name}</h2>
            <p className="text-white/80">{archetype.maneraSerLabel}</p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Manera de Ser
            </h3>
            <span className={`inline-block px-4 py-2 rounded-lg bg-gradient-to-r ${config.gradient} text-white font-medium`}>
              {archetype.maneraSerTag}
            </span>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Script de Feedback
            </h3>
            <div className="p-4 bg-slate-800/50 rounded-xl text-slate-300 whitespace-pre-wrap leading-relaxed">
              {archetype.scriptFeedback}
            </div>
          </div>

          {archetype.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Descripción para el Trainer
              </h3>
              <p className="text-slate-400">{archetype.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{archetype._count.ArchetypeAssignment} veces asignado</span>
            {archetype.Usuario && (
              <span>Creado por: {archetype.Usuario.nombre}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={onAssign}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Asignar a Participantes
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Modal para editar arquetipo existente
function EditArchetypeModal({ 
  archetype,
  onClose, 
  onUpdated 
}: { 
  archetype: Archetype
  onClose: () => void
  onUpdated: () => void
}) {
  const [form, setForm] = useState({
    name: archetype.name,
    category: archetype.category || 'CUSTOM',
    maneraSerTag: archetype.maneraSerTag || '',
    maneraSerLabel: archetype.maneraSerLabel || '',
    scriptFeedback: archetype.scriptFeedback || '',
    description: archetype.description || '',
    imageUrl: archetype.imageUrl || ''
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'archetype')

      const response = await fetch('/api/trainer/archetypes/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al subir imagen')
      }

      const data = await response.json()
      setForm(prev => ({ ...prev, imageUrl: data.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/trainer/archetypes/${archetype.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          maneraSerTag: form.maneraSerTag || null,
          maneraSerLabel: form.maneraSerLabel || null,
          scriptFeedback: form.scriptFeedback || null,
          description: form.description || null,
          imageUrl: form.imageUrl || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al actualizar personaje')
      }

      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Editar Personaje</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Imagen del Personaje
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-gray-700 overflow-hidden flex items-center justify-center">
                  {form.imageUrl ? (
                    <img 
                      src={form.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Subiendo...' : 'Cambiar Imagen'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Personaje *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: El Explorador"
                required
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="CUSTOM">Personalizado</option>
                <option value="ARQUETIPO">Arquetipo</option>
                <option value="ELEMENTAL">Elemental</option>
              </select>
            </div>

            {/* Manera de Ser Tag */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Etiqueta (Tag)
              </label>
              <input
                type="text"
                value={form.maneraSerTag}
                onChange={(e) => setForm(prev => ({ ...prev, maneraSerTag: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: explorador"
              />
            </div>

            {/* Manera de Ser Label */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Manera de Ser
              </label>
              <input
                type="text"
                value={form.maneraSerLabel}
                onChange={(e) => setForm(prev => ({ ...prev, maneraSerLabel: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: Curioso y aventurero"
              />
            </div>

            {/* Script Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Script de Feedback
              </label>
              <textarea
                value={form.scriptFeedback}
                onChange={(e) => setForm(prev => ({ ...prev, scriptFeedback: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Texto para feedback automático..."
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Descripción del personaje..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Modal para crear nuevo arquetipo
function CreateArchetypeModal({ 
  onClose, 
  onCreated,
  showToast
}: { 
  onClose: () => void
  onCreated: () => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'CUSTOM',
    maneraSerTag: '',
    maneraSerLabel: '',
    scriptFeedback: '',
    description: '',
    imageUrl: ''
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Subir a Cloudinary
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/trainer/archetypes/upload-image', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({ ...prev, imageUrl: data.imageUrl }))
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al subir la imagen', 'error')
        setImagePreview(null)
      }
    } catch (error) {
      console.error('Error uploading:', error)
      showToast('Error al subir la imagen', 'error')
      setImagePreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.maneraSerTag || !form.maneraSerLabel || !form.scriptFeedback) {
      showToast('Completa todos los campos requeridos', 'error')
      return
    }


    setSaving(true)
    try {
      const res = await fetch('/api/trainer/archetypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        onCreated()
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al crear el personaje', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error al crear el personaje', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Crear Nuevo Personaje</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Nombre del Personaje *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: La Llorona, Hulk, etc."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
            >
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Manera de Ser (Tag) *</label>
              <input
                type="text"
                value={form.maneraSerTag}
                onChange={(e) => setForm({ ...form, maneraSerTag: e.target.value })}
                placeholder="Ej: VICTIMA, IRA"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Label Descriptivo *</label>
              <input
                type="text"
                value={form.maneraSerLabel}
                onChange={(e) => setForm({ ...form, maneraSerLabel: e.target.value })}
                placeholder="Ej: Víctima / Sufrimiento"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Script de Feedback *</label>
            <textarea
              value={form.scriptFeedback}
              onChange={(e) => setForm({ ...form, scriptFeedback: e.target.value })}
              placeholder="El texto que verá el participante cuando se le asigne este personaje..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Descripción (Solo para ti)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Notas sobre cuándo usar este personaje..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Imagen del Personaje</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {imagePreview || form.imageUrl ? (
              <div className="relative w-full aspect-[3/4] max-w-[200px] rounded-xl overflow-hidden bg-slate-800 border-2 border-purple-500/50">
                <Image
                  src={imagePreview || form.imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null)
                    setForm(prev => ({ ...prev, imageUrl: '' }))
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-purple-500/50 transition-colors flex flex-col items-center gap-2 text-slate-400 hover:text-purple-400"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span>Haz clic para subir imagen</span>
                    <span className="text-xs text-slate-500">JPG, PNG, WebP o GIF (máx 5MB)</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Crear Personaje
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Modal para asignar arquetipo a participantes
function AssignArchetypeModal({ 
  archetype,
  onClose, 
  onAssigned,
  showToast
}: { 
  archetype: Archetype
  onClose: () => void
  onAssigned: () => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
  const [participants, setParticipants] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customNote, setCustomNote] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchParticipants()
  }, [])

  const fetchParticipants = async () => {
    try {
      // Obtener participantes del trainer actual
      const res = await fetch('/api/trainer/participants')
      if (res.ok) {
        const data = await res.json()
        setParticipants(data.participants || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredParticipants = participants.filter(p => 
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleParticipant = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleAssign = async () => {
    if (selectedIds.length === 0) {
      showToast('Selecciona al menos un participante', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/trainer/archetypes/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archetypeId: archetype.id,
          participantIds: selectedIds,
          customNote: customNote || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        showToast(data.message, 'success')
        onAssigned()
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al asignar', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error al asignar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const config = categoryConfig[archetype.category] || categoryConfig.CUSTOM

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${config.gradient}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 overflow-hidden">
                {archetype.imageUrl ? (
                  <Image
                    src={archetype.imageUrl}
                    alt={archetype.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Drama className="w-8 h-8 text-white/50" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Asignar: {archetype.name}</h2>
                <p className="text-white/70">{archetype.maneraSerLabel}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar participante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          {selectedIds.length > 0 && (
            <p className="mt-2 text-sm text-purple-400">
              {selectedIds.length} participante(s) seleccionado(s)
            </p>
          )}
        </div>

        {/* Lista de participantes */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No se encontraron participantes
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParticipants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleParticipant(p.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedIds.includes(p.id)
                      ? 'bg-purple-500/20 border-2 border-purple-500'
                      : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                    {p.profileImage ? (
                      <Image
                        src={p.profileImage}
                        alt={p.nombre}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium">
                        {p.nombre?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{p.nombre}</p>
                    <p className="text-sm text-slate-400">{p.email}</p>
                  </div>
                  {selectedIds.includes(p.id) && (
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nota personalizada */}
        <div className="p-4 border-t border-slate-800">
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Nota personalizada (opcional)
          </label>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Mensaje adicional para los participantes..."
            rows={2}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || selectedIds.length === 0}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Asignar a {selectedIds.length || '...'} participante(s)
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Tab de asignaciones
function AssignmentsTab({ 
  assignments,
  onRefresh
}: { 
  assignments: Assignment[]
  onRefresh: () => void
}) {
  const [changingAssignment, setChangingAssignment] = useState<Assignment | null>(null)
  const [archetypes, setArchetypes] = useState<Archetype[]>([])
  const [loadingArchetypes, setLoadingArchetypes] = useState(false)
  const [selectedNewArchetype, setSelectedNewArchetype] = useState<number | null>(null)
  const [changing, setChanging] = useState(false)
  const [searchArchetype, setSearchArchetype] = useState('')

  const groupedByStatus = assignments.reduce((acc, a) => {
    if (!acc[a.status]) acc[a.status] = []
    acc[a.status].push(a)
    return acc
  }, {} as Record<string, Assignment[]>)

  const handleOpenChangeModal = async (assignment: Assignment) => {
    setChangingAssignment(assignment)
    setSelectedNewArchetype(null)
    setSearchArchetype('')
    setLoadingArchetypes(true)
    
    try {
      const res = await fetch('/api/trainer/archetypes')
      if (res.ok) {
        const data = await res.json()
        setArchetypes(data.archetypes || [])
      }
    } catch (error) {
      console.error('Error fetching archetypes:', error)
    } finally {
      setLoadingArchetypes(false)
    }
  }

  const handleChangeArchetype = async () => {
    if (!changingAssignment || !selectedNewArchetype) return

    setChanging(true)
    try {
      const res = await fetch('/api/trainer/archetypes/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: changingAssignment.id,
          newArchetypeId: selectedNewArchetype
        })
      })

      if (res.ok) {
        setChangingAssignment(null)
        onRefresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Error al cambiar personaje')
      }
    } catch (error) {
      console.error('Error changing archetype:', error)
      alert('Error al cambiar personaje')
    } finally {
      setChanging(false)
    }
  }

  const filteredArchetypes = archetypes.filter(arch => 
    arch.id !== changingAssignment?.Archetype.id &&
    (arch.name.toLowerCase().includes(searchArchetype.toLowerCase()) ||
     arch.maneraSerLabel.toLowerCase().includes(searchArchetype.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = groupedByStatus[status]?.length || 0
          return (
            <div
              key={status}
              className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-sm text-slate-400">{config.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lista de asignaciones */}
      {assignments.length === 0 ? (
        <div className="text-center py-16">
          <Send className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Sin asignaciones</h3>
          <p className="text-slate-400">Aún no has asignado personajes a ningún participante</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => {
            const statusCfg = statusConfig[assignment.status]
            const catConfig = categoryConfig[assignment.Archetype.category] || categoryConfig.CUSTOM

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar del participante */}
                  <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                    {assignment.Participant.profileImage ? (
                      <Image
                        src={assignment.Participant.profileImage}
                        alt={assignment.Participant.nombre}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium text-lg">
                        {assignment.Participant.nombre?.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">
                        {assignment.Participant.nombre}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span className={catConfig.color}>{assignment.Archetype.name}</span>
                      <span>•</span>
                      <span>{new Date(assignment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Botón Cambiar */}
                  <button
                    onClick={() => handleOpenChangeModal(assignment)}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Cambiar
                  </button>

                  {/* Imagen del arquetipo */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${catConfig.gradient} overflow-hidden flex-shrink-0`}>
                    {assignment.Archetype.imageUrl ? (
                      <Image
                        src={assignment.Archetype.imageUrl}
                        alt={assignment.Archetype.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Drama className="w-6 h-6 text-white/50" />
                      </div>
                    )}
                  </div>
                </div>

                {assignment.customNote && (
                  <p className="mt-3 text-sm text-slate-400 italic pl-16">
                    "{assignment.customNote}"
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal de Cambiar Personaje */}
      <AnimatePresence>
        {changingAssignment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setChangingAssignment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-6 max-w-2xl w-full border border-purple-500/30 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Cambiar Personaje</h3>
                  <p className="text-slate-400 text-sm">
                    Participante: <span className="text-purple-300">{changingAssignment.Participant.nombre}</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    Personaje actual: {changingAssignment.Archetype.name}
                  </p>
                </div>
                <button
                  onClick={() => setChangingAssignment(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Buscador */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar personaje..."
                  value={searchArchetype}
                  onChange={(e) => setSearchArchetype(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>

              {/* Lista de arquetipos */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
                {loadingArchetypes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : filteredArchetypes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No se encontraron personajes
                  </div>
                ) : (
                  filteredArchetypes.map((arch) => {
                    const catConfig = categoryConfig[arch.category] || categoryConfig.CUSTOM
                    const isSelected = selectedNewArchetype === arch.id

                    return (
                      <div
                        key={arch.id}
                        onClick={() => setSelectedNewArchetype(arch.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${catConfig.gradient} overflow-hidden flex-shrink-0`}>
                            {arch.imageUrl ? (
                              <Image
                                src={arch.imageUrl}
                                alt={arch.name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Drama className="w-5 h-5 text-white/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{arch.name}</p>
                            <p className="text-xs text-slate-400 truncate">{arch.maneraSerLabel}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setChangingAssignment(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangeArchetype}
                  disabled={!selectedNewArchetype || changing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Cambiar Personaje
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
