'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Plus, Search, Music, Zap, Theater,
  X, Save, Loader2, Image as ImageIcon, Upload,
  Star, Disc3, Edit2, Trash2, Moon, User, ChevronDown
} from 'lucide-react'
import Image from 'next/image'

// Interfaces
interface MetamorfosisBase {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  isSystemDefault: boolean
  _count?: { Assignments: number }
}

interface MetamorfosisTransform {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  isSystemDefault: boolean
  _count?: { Assignments: number }
}

interface MetamorfosisSong {
  id: number
  title: string
  artist: string | null
  spotifyUrl: string | null
  previewUrl: string | null
  imageUrl: string | null
  isSystemDefault: boolean
  _count?: { Assignments: number }
}

interface MetamorfosisCunaSong {
  id: number
  title: string
  artist: string | null
  spotifyUrl: string | null
  previewUrl: string | null
  imageUrl: string | null
  isSystemDefault: boolean
  _count?: { Assignments: number }
}

type ElementType = 'base' | 'transform' | 'song' | 'cunaSong'

export default function AdminSaltosCuanticosPage() {
  // States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Elements
  const [bases, setBases] = useState<MetamorfosisBase[]>([])
  const [transforms, setTransforms] = useState<MetamorfosisTransform[]>([])
  const [songs, setSongs] = useState<MetamorfosisSong[]>([])
  const [cunaSongs, setCunaSongs] = useState<MetamorfosisCunaSong[]>([])
  
  // Active tab
  const [activeTab, setActiveTab] = useState<ElementType>('base')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // Form states
  const [formName, setFormName] = useState('')
  const [formArtist, setFormArtist] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formSpotifyUrl, setFormSpotifyUrl] = useState('')
  const [formPreviewUrl, setFormPreviewUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  
  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Toast notification
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  })

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
  }

  // Fetch all elements
  const fetchElements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/saltos-cuanticos')
      if (res.ok) {
        const data = await res.json()
        setBases(data.bases || [])
        setTransforms(data.transforms || [])
        setSongs(data.songs || [])
        setCunaSongs(data.cunaSongs || [])
      }
    } catch (error) {
      console.error('Error fetching elements:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchElements()
  }, [fetchElements])

  // Reset form
  const resetForm = () => {
    setFormName('')
    setFormArtist('')
    setFormDescription('')
    setFormImageUrl('')
    setFormSpotifyUrl('')
    setFormPreviewUrl('')
    setEditingItem(null)
  }

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', activeTab)

      const res = await fetch('/api/admin/saltos-cuanticos/upload-image', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setFormImageUrl(data.imageUrl)
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al subir imagen', 'error')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Error al subir imagen', 'error')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Upload audio
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAudio(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', activeTab)

      const res = await fetch('/api/admin/saltos-cuanticos/upload-audio', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setFormPreviewUrl(data.audioUrl)
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al subir audio', 'error')
      }
    } catch (error) {
      console.error('Error uploading audio:', error)
      showToast('Error al subir audio', 'error')
    } finally {
      setUploadingAudio(false)
      if (audioInputRef.current) {
        audioInputRef.current.value = ''
      }
    }
  }

  // Open add modal
  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  // Open edit modal
  const openEditModal = (item: any) => {
    setEditingItem(item)
    setFormName(item.name || item.title || '')
    setFormArtist(item.artist || '')
    setFormDescription(item.description || '')
    setFormImageUrl(item.imageUrl || '')
    setFormSpotifyUrl(item.spotifyUrl || '')
    setFormPreviewUrl(item.previewUrl || '')
    setShowAddModal(true)
  }

  // Save element
  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('El nombre es requerido', 'error')
      return
    }

    setSaving(true)
    try {
      const isEdit = !!editingItem
      const method = isEdit ? 'PUT' : 'POST'
      
      let endpoint = '/api/admin/saltos-cuanticos/'
      let body: Record<string, any> = {
        isSystemDefault: true
      }

      switch (activeTab) {
        case 'base':
          endpoint += isEdit ? `bases/${editingItem.id}` : 'bases'
          body.name = formName.trim()
          body.description = formDescription.trim() || null
          body.imageUrl = formImageUrl.trim() || null
          break
        case 'transform':
          endpoint += isEdit ? `transforms/${editingItem.id}` : 'transforms'
          body.name = formName.trim()
          body.description = formDescription.trim() || null
          body.imageUrl = formImageUrl.trim() || null
          break
        case 'song':
          endpoint += isEdit ? `songs/${editingItem.id}` : 'songs'
          body.title = formName.trim()
          body.artist = formArtist.trim() || null
          body.spotifyUrl = formSpotifyUrl.trim() || null
          body.previewUrl = formPreviewUrl.trim() || null
          body.imageUrl = formImageUrl.trim() || null
          break
        case 'cunaSong':
          endpoint += isEdit ? `cuna-songs/${editingItem.id}` : 'cuna-songs'
          body.title = formName.trim()
          body.artist = formArtist.trim() || null
          body.spotifyUrl = formSpotifyUrl.trim() || null
          body.previewUrl = formPreviewUrl.trim() || null
          body.imageUrl = formImageUrl.trim() || null
          break
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setShowAddModal(false)
        resetForm()
        fetchElements()
        showToast(isEdit ? 'Elemento actualizado' : 'Elemento creado', 'success')
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al guardar', 'error')
      }
    } catch (error) {
      console.error('Error saving:', error)
      showToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete element
  const handleDelete = async (item: any) => {
    const confirmMsg = `¿Eliminar "${item.name || item.title}"? Esta acción no se puede deshacer.`
    if (!confirm(confirmMsg)) return

    try {
      let endpoint = '/api/admin/saltos-cuanticos/'
      switch (activeTab) {
        case 'base':
          endpoint += `bases/${item.id}`
          break
        case 'transform':
          endpoint += `transforms/${item.id}`
          break
        case 'song':
          endpoint += `songs/${item.id}`
          break
        case 'cunaSong':
          endpoint += `cuna-songs/${item.id}`
          break
      }

      const res = await fetch(endpoint, { method: 'DELETE' })
      
      if (res.ok) {
        fetchElements()
        showToast('Elemento eliminado', 'success')
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al eliminar', 'error')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      showToast('Error al eliminar', 'error')
    }
  }

  // Get current items based on tab
  const getCurrentItems = () => {
    const query = searchQuery.toLowerCase()
    switch (activeTab) {
      case 'base':
        return bases.filter(b => 
          b.name.toLowerCase().includes(query) ||
          (b.description && b.description.toLowerCase().includes(query))
        )
      case 'transform':
        return transforms.filter(t => 
          t.name.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
        )
      case 'song':
        return songs.filter(s => 
          s.title.toLowerCase().includes(query) ||
          (s.artist && s.artist.toLowerCase().includes(query))
        )
      case 'cunaSong':
        return cunaSongs.filter(s => 
          s.title.toLowerCase().includes(query) ||
          (s.artist && s.artist.toLowerCase().includes(query))
        )
      default:
        return []
    }
  }

  // Tab config
  const tabs = [
    { id: 'base' as ElementType, label: 'Personajes Base', icon: User, color: 'cyan', count: bases.length },
    { id: 'transform' as ElementType, label: 'Transformaciones', icon: Star, color: 'fuchsia', count: transforms.length },
    { id: 'song' as ElementType, label: 'Canciones', icon: Music, color: 'green', count: songs.length },
    { id: 'cunaSong' as ElementType, label: 'Canciones de Cuna', icon: Moon, color: 'indigo', count: cunaSongs.length },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin" />
          <p className="text-purple-300">Cargando Saltos Cuánticos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
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
              flex items-center gap-3
              ${toast.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20' 
                : 'bg-red-500/20 border-red-500/50 shadow-red-500/20'
              }
            `}>
              <div className={`
                p-2 rounded-full
                ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}
              `}>
                {toast.type === 'success' ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <X className="w-5 h-5 text-white" />
                )}
              </div>
              <span className={`font-semibold ${toast.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                {toast.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl">
            <Theater className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">
              🎭 SALTOS CUÁNTICOS
            </h1>
            <p className="text-slate-400">Gestiona los elementos predeterminados del sistema</p>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-purple-500/20">
          <p className="text-sm text-slate-300">
            <Sparkles className="w-4 h-4 inline mr-2 text-yellow-400" />
            Los elementos que agregues aquí estarán disponibles para <strong className="text-white">todos los entrenadores</strong> como opciones predeterminadas. 
            Los entrenadores también pueden agregar sus propios elementos personalizados.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  isActive 
                    ? `bg-${tab.color}-500/20 border border-${tab.color}-500/50 text-white`
                    : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? `text-${tab.color}-400` : ''}`} />
                <span className="font-medium">{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive ? `bg-${tab.color}-500/30` : 'bg-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search and Add */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar elementos..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-fuchsia-500 focus:outline-none"
          />
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl text-white font-medium hover:from-fuchsia-500 hover:to-purple-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          Agregar {activeTab === 'base' ? 'Personaje' : activeTab === 'transform' ? 'Transformación' : activeTab === 'song' ? 'Canción' : 'Canción de Cuna'}
        </button>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getCurrentItems().map((item: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden hover:border-fuchsia-500/50 transition-all group"
            >
              {/* Image */}
              <div className="relative h-40 bg-gradient-to-br from-slate-700 to-slate-800">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name || item.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {activeTab === 'base' && <User className="w-16 h-16 text-slate-600" />}
                    {activeTab === 'transform' && <Star className="w-16 h-16 text-slate-600" />}
                    {activeTab === 'song' && <Disc3 className="w-16 h-16 text-slate-600" />}
                    {activeTab === 'cunaSong' && <Moon className="w-16 h-16 text-slate-600" />}
                  </div>
                )}
                
                {/* System badge */}
                {item.isSystemDefault && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 rounded-lg text-xs font-medium text-black">
                    ⭐ Sistema
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-3 bg-blue-500 rounded-xl hover:bg-blue-400 transition-colors"
                  >
                    <Edit2 className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-3 bg-red-500 rounded-xl hover:bg-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-white truncate">
                  {item.name || item.title}
                </h3>
                {item.artist && (
                  <p className="text-sm text-slate-400 truncate">{item.artist}</p>
                )}
                {item.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-2 text-xs text-slate-500">
                  {item._count?.Assignments || 0} asignaciones
                </div>
              </div>
            </motion.div>
          ))}

          {getCurrentItems().length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-slate-500 mb-4">
                {activeTab === 'base' && <User className="w-16 h-16 mx-auto opacity-50" />}
                {activeTab === 'transform' && <Star className="w-16 h-16 mx-auto opacity-50" />}
                {activeTab === 'song' && <Music className="w-16 h-16 mx-auto opacity-50" />}
                {activeTab === 'cunaSong' && <Moon className="w-16 h-16 mx-auto opacity-50" />}
              </div>
              <p className="text-slate-400">No hay elementos en esta categoría</p>
              <button
                onClick={openAddModal}
                className="mt-4 text-fuchsia-400 hover:text-fuchsia-300"
              >
                + Agregar el primero
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700/50"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-fuchsia-600/20 via-purple-600/20 to-indigo-600/20 px-6 py-5 border-b border-slate-700/50">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      activeTab === 'base' ? 'bg-cyan-500/20' :
                      activeTab === 'transform' ? 'bg-fuchsia-500/20' :
                      activeTab === 'song' ? 'bg-green-500/20' : 'bg-indigo-500/20'
                    }`}>
                      {activeTab === 'base' && <User className="w-6 h-6 text-cyan-400" />}
                      {activeTab === 'transform' && <Star className="w-6 h-6 text-fuchsia-400" />}
                      {activeTab === 'song' && <Music className="w-6 h-6 text-green-400" />}
                      {activeTab === 'cunaSong' && <Moon className="w-6 h-6 text-indigo-400" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {editingItem ? 'Editar' : 'Nuevo'} {
                          activeTab === 'base' ? 'Personaje Base' :
                          activeTab === 'transform' ? 'Transformación' :
                          activeTab === 'song' ? 'Canción' : 'Canción de Cuna'
                        }
                      </h3>
                      <p className="text-sm text-slate-400">
                        {activeTab === 'base' ? 'Estado inicial del participante' :
                         activeTab === 'transform' ? 'La estrella a la que se transformará' :
                         activeTab === 'song' ? 'El detonador de la metamorfosis' : 'Para el cierre emocional'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Image */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      📸 Imagen
                    </label>
                    
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    {/* Upload area */}
                    {formImageUrl ? (
                      <div className="space-y-3">
                        <div className="relative aspect-square bg-slate-700/50 rounded-2xl overflow-hidden border border-slate-600/50 group">
                          <Image
                            src={formImageUrl}
                            alt="Preview"
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white text-sm font-medium hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all"
                          >
                            {uploadingImage ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            Cambiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormImageUrl('')}
                            className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full aspect-square border-2 border-dashed border-slate-600 rounded-2xl hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all group"
                      >
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 group-hover:text-fuchsia-400">
                          {uploadingImage ? (
                            <>
                              <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin" />
                              </div>
                              <span className="text-sm font-medium">Subiendo imagen...</span>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-2xl bg-slate-700/50 group-hover:bg-fuchsia-500/20 flex items-center justify-center transition-colors">
                                <Upload className="w-8 h-8" />
                              </div>
                              <div className="text-center">
                                <span className="text-sm font-medium block">Subir imagen</span>
                                <span className="text-xs text-slate-500">JPG, PNG, WebP (máx. 5MB)</span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    )}
                    
                    {/* URL manual option */}
                    <details className="mt-3 group">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 flex items-center gap-1">
                        <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        Ingresar URL manualmente
                      </summary>
                      <input
                        type="url"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full mt-2 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:border-fuchsia-500 focus:outline-none"
                      />
                    </details>
                  </div>

                  {/* Right Column - Form Fields */}
                  <div className="space-y-4">
                    {/* Name/Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        {activeTab === 'song' || activeTab === 'cunaSong' ? '🎵 Título' : '✨ Nombre'} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={activeTab === 'base' ? 'Ej: Mimo, Estatua, Robot...' : 
                                   activeTab === 'transform' ? 'Ej: Ricky Martin, Shakira...' :
                                   'Ej: Livin\' la Vida Loca...'}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Artist (only for songs) */}
                    {(activeTab === 'song' || activeTab === 'cunaSong') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          🎤 Artista
                        </label>
                        <input
                          type="text"
                          value={formArtist}
                          onChange={(e) => setFormArtist(e.target.value)}
                          placeholder="Ej: Ricky Martin"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    )}

                    {/* Description (only for base/transform) */}
                    {(activeTab === 'base' || activeTab === 'transform') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          📝 Descripción
                        </label>
                        <textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Descripción opcional del personaje..."
                          rows={4}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all resize-none"
                        />
                      </div>
                    )}

                    {/* Spotify URLs (only for songs) */}
                    {(activeTab === 'song' || activeTab === 'cunaSong') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                              URL de Spotify
                            </span>
                          </label>
                          <input
                            type="url"
                            value={formSpotifyUrl}
                            onChange={(e) => setFormSpotifyUrl(e.target.value)}
                            placeholder="https://open.spotify.com/track/..."
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            🔊 Preview (MP3)
                          </label>
                          
                          {/* Audio Preview Player */}
                          {formPreviewUrl && (
                            <div className="mb-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600">
                              <audio 
                                src={formPreviewUrl} 
                                controls 
                                className="w-full h-10"
                                style={{ filter: 'hue-rotate(280deg)' }}
                              />
                              <button
                                type="button"
                                onClick={() => setFormPreviewUrl('')}
                                className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                🗑️ Eliminar audio
                              </button>
                            </div>
                          )}

                          {/* Upload Button */}
                          <div className="flex gap-2">
                            <input
                              ref={audioInputRef}
                              type="file"
                              accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/m4a,.mp3,.wav,.m4a,.ogg,.webm"
                              onChange={handleAudioUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => audioInputRef.current?.click()}
                              disabled={uploadingAudio}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                            >
                              {uploadingAudio ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Subir MP3
                                </>
                              )}
                            </button>
                          </div>

                          {/* Manual URL Accordion */}
                          <details className="mt-3">
                            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                              ↳ O ingresar URL manualmente
                            </summary>
                            <input
                              type="url"
                              value={formPreviewUrl}
                              onChange={(e) => setFormPreviewUrl(e.target.value)}
                              placeholder="https://..."
                              className="mt-2 w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 focus:outline-none transition-all"
                            />
                          </details>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700/50 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 rounded-xl text-white font-semibold shadow-lg shadow-fuchsia-500/25 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {editingItem ? 'Guardar Cambios' : 'Crear Elemento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
