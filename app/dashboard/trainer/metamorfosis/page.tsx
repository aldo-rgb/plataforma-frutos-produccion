'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Plus, Search, Filter, Music, User, Zap, Theater,
  ChevronDown, X, Save, Eye, CheckCircle, Loader2, Image as ImageIcon,
  Play, Pause, Volume2, VolumeX, Settings, Users, Send, Tv, ArrowRight,
  Star, Crown, Mic2, Disc3, Radio, ListMusic, RefreshCw, Edit2, Trash2, Moon
} from 'lucide-react'
import Image from 'next/image'

// Interfaces
interface MetamorfosisBase {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  isSystemDefault: boolean
}

interface MetamorfosisTransform {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  isSystemDefault: boolean
}

interface MetamorfosisSong {
  id: number
  title: string
  artist: string | null
  spotifyUrl: string | null
  previewUrl: string | null
  imageUrl: string | null
  isSystemDefault: boolean
}

interface MetamorfosisCunaSong {
  id: number
  title: string
  artist: string | null
  spotifyUrl: string | null
  previewUrl: string | null
  imageUrl: string | null
  isSystemDefault: boolean
}

interface MetamorfosisAssignment {
  id: number
  participantId: number
  includeBase: boolean
  constructedPhrase: string
  customNote: string | null
  status: 'SENT' | 'VIEWED' | 'PERFORMED' | 'COMPLETED'
  createdAt: string
  Base: MetamorfosisBase | null
  Transform: MetamorfosisTransform
  Song: MetamorfosisSong
  CunaSong: MetamorfosisCunaSong | null
  Participant: {
    id: number
    nombre: string
    imagen: string | null
  }
}

interface Participant {
  id: number
  nombre: string
  imagen: string | null
  email?: string
}

// Datos predefinidos del sistema (se cargarán desde la BD)
const DEFAULT_BASES = [
  'Mimo',
  'Estatua',
  'Robot',
  'Marioneta',
  'Zombi',
  'Momia',
  'Maniquí',
  'Muñeco de Cera'
]

const DEFAULT_TRANSFORMS = [
  'Ricky Martin',
  'Shakira',
  'Luis Miguel',
  'Gloria Trevi',
  'Bad Bunny',
  'Thalía',
  'Juan Gabriel',
  'Selena',
  'Alejandra Guzmán',
  'Marc Anthony'
]

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  SENT: { label: 'Enviado', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  VIEWED: { label: 'Visto', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  PERFORMED: { label: 'Ejecutado', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  COMPLETED: { label: 'Completado', color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
}

export default function MetamorfosisPage() {
  // Estados principales
  const [activeTab, setActiveTab] = useState<'constructor' | 'asignaciones' | 'biblioteca'>('constructor')
  const [loading, setLoading] = useState(true)
  
  // Datos cargados de la BD
  const [bases, setBases] = useState<MetamorfosisBase[]>([])
  const [transforms, setTransforms] = useState<MetamorfosisTransform[]>([])
  const [songs, setSongs] = useState<MetamorfosisSong[]>([])
  const [cunaSongs, setCunaSongs] = useState<MetamorfosisCunaSong[]>([])
  const [assignments, setAssignments] = useState<MetamorfosisAssignment[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  
  // Estados del constructor
  const [includeBase, setIncludeBase] = useState(true)
  const [selectedBase, setSelectedBase] = useState<MetamorfosisBase | null>(null)
  const [selectedTransform, setSelectedTransform] = useState<MetamorfosisTransform | null>(null)
  const [selectedSong, setSelectedSong] = useState<MetamorfosisSong | null>(null)
  const [selectedCunaSong, setSelectedCunaSong] = useState<MetamorfosisCunaSong | null>(null)
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([])
  const [customNote, setCustomNote] = useState('')
  
  // Estados de modales
  const [showSelectBase, setShowSelectBase] = useState(false)
  const [showSelectTransform, setShowSelectTransform] = useState(false)
  const [showSelectSong, setShowSelectSong] = useState(false)
  const [showSelectCunaSong, setShowSelectCunaSong] = useState(false)
  const [showSelectParticipant, setShowSelectParticipant] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showAddModal, setShowAddModal] = useState<'base' | 'transform' | 'song' | 'cunaSong' | null>(null)
  
  // Estados de creación
  const [newItemName, setNewItemName] = useState('')
  const [newItemArtist, setNewItemArtist] = useState('')
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Búsqueda
  const [searchBase, setSearchBase] = useState('')
  const [searchTransform, setSearchTransform] = useState('')
  const [searchSong, setSearchSong] = useState('')
  const [searchCunaSong, setSearchCunaSong] = useState('')
  const [searchParticipant, setSearchParticipant] = useState('')

  // Audio preview
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingSongId, setPlayingSongId] = useState<number | null>(null)

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Estado para editar asignación
  const [editingAssignment, setEditingAssignment] = useState<MetamorfosisAssignment | null>(null)
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchElements(),
        fetchAssignments(),
        fetchParticipants()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchElements = async () => {
    try {
      const res = await fetch('/api/trainer/metamorfosis')
      if (res.ok) {
        const data = await res.json()
        setBases(data.bases || [])
        setTransforms(data.transforms || [])
        setSongs(data.songs || [])
        setCunaSongs(data.cunaSongs || [])
      }
    } catch (error) {
      console.error('Error fetching elements:', error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/trainer/metamorfosis/assignments')
      if (res.ok) {
        const data = await res.json()
        setAssignments(data || [])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const fetchParticipants = async () => {
    try {
      // Obtener participantes de los entrenamientos activos del trainer
      const res = await fetch('/api/trainer/participants')
      if (res.ok) {
        const data = await res.json()
        setParticipants(data.participants || [])
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  // Construir la frase de metamorfosis
  const constructedPhrase = () => {
    if (!selectedTransform || !selectedSong) return ''
    
    let phrase = ''
    if (includeBase && selectedBase) {
      phrase = `${selectedBase.name} → ${selectedTransform.name} | 🎵 ${selectedSong.title}`
    } else {
      phrase = `${selectedTransform.name} | 🎵 ${selectedSong.title}`
    }
    
    if (selectedCunaSong) {
      phrase += ` | 🌙 ${selectedCunaSong.title}`
    }
    
    return phrase
  }

  // Crear nuevo elemento
  const handleCreateElement = async () => {
    if (!showAddModal || !newItemName.trim()) return
    
    setCreating(true)
    try {
      let endpoint = ''
      let body: Record<string, string> = { name: newItemName.trim() }
      
      switch (showAddModal) {
        case 'base':
          endpoint = '/api/trainer/metamorfosis/bases'
          break
        case 'transform':
          endpoint = '/api/trainer/metamorfosis/transforms'
          break
        case 'song':
          endpoint = '/api/trainer/metamorfosis/songs'
          body = { title: newItemName.trim(), artist: newItemArtist.trim() }
          break
        case 'cunaSong':
          endpoint = '/api/trainer/metamorfosis/cuna-songs'
          body = { title: newItemName.trim(), artist: newItemArtist.trim() }
          break
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        fetchElements()
        setShowAddModal(null)
        setNewItemName('')
        setNewItemArtist('')
      } else {
        const error = await res.json()
        alert(error.error || 'Error al crear elemento')
      }
    } catch (error) {
      console.error('Error creating element:', error)
      showToast('Error al crear elemento', 'error')
    } finally {
      setCreating(false)
    }
  }

  // Eliminar elemento personalizado
  const handleDeleteElement = async (type: 'base' | 'transform' | 'song' | 'cunaSong', id: number, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return
    
    try {
      let endpoint = ''
      switch (type) {
        case 'base':
          endpoint = `/api/trainer/metamorfosis/bases/${id}`
          break
        case 'transform':
          endpoint = `/api/trainer/metamorfosis/transforms/${id}`
          break
        case 'song':
          endpoint = `/api/trainer/metamorfosis/songs/${id}`
          break
        case 'cunaSong':
          endpoint = `/api/trainer/metamorfosis/cuna-songs/${id}`
          break
      }
      
      const res = await fetch(endpoint, { method: 'DELETE' })
      
      if (res.ok) {
        showToast('Elemento eliminado', 'success')
        fetchElements()
      } else {
        const error = await res.json()
        showToast(error.error || 'Error al eliminar', 'error')
      }
    } catch (error) {
      console.error('Error deleting element:', error)
      showToast('Error al eliminar elemento', 'error')
    }
  }

  // Enviar asignación a múltiples participantes
  const handleSendAssignment = async () => {
    if (!selectedTransform || !selectedSong || selectedParticipants.length === 0) {
      showToast('Selecciona transformación, canción y al menos un participante', 'warning')
      return
    }
    
    if (includeBase && !selectedBase) {
      showToast('Selecciona un personaje base o desactiva el modo completo', 'warning')
      return
    }
    
    setSending(true)
    try {
      // Si estamos editando, eliminar la asignación anterior primero
      if (editingAssignment) {
        await fetch(`/api/trainer/metamorfosis/assignments/${editingAssignment.id}`, {
          method: 'DELETE'
        })
      }

      // Enviar a todos los participantes seleccionados
      const results = await Promise.all(
        selectedParticipants.map(participant =>
          fetch('/api/trainer/metamorfosis/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participantId: participant.id,
              baseId: includeBase ? selectedBase?.id : null,
              transformId: selectedTransform.id,
              songId: selectedSong.id,
              cunaSongId: selectedCunaSong?.id || null,
              includeBase,
              customNote: customNote.trim() || null
            })
          })
        )
      )
      
      const allOk = results.every(res => res.ok)
      
      if (allOk) {
        // Limpiar selecciones
        setSelectedBase(null)
        setSelectedTransform(null)
        setSelectedSong(null)
        setSelectedCunaSong(null)
        setSelectedParticipants([])
        setCustomNote('')
        setShowPreview(false)
        setEditingAssignment(null) // Limpiar modo edición
        
        // Recargar asignaciones
        fetchAssignments()
        
        const msg = editingAssignment 
          ? '¡Metamorfosis actualizada!' 
          : `¡Metamorfosis asignada a ${selectedParticipants.length} participante(s)!`
        showToast(msg, 'success')
      } else {
        showToast('Algunas asignaciones fallaron. Revisa la lista.', 'error')
        fetchAssignments()
      }
    } catch (error) {
      console.error('Error sending assignment:', error)
      showToast('Error al enviar asignación', 'error')
    } finally {
      setSending(false)
    }
  }

  // Eliminar asignación
  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta asignación?')) return
    
    setDeletingAssignmentId(assignmentId)
    try {
      const res = await fetch(`/api/trainer/metamorfosis/assignments/${assignmentId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error('Error al eliminar')
      
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      showToast('Asignación eliminada', 'success')
    } catch (error) {
      console.error('Error deleting assignment:', error)
      showToast('Error al eliminar asignación', 'error')
    } finally {
      setDeletingAssignmentId(null)
    }
  }

  // Editar asignación (cargar en el constructor)
  const handleEditAssignment = (assignment: MetamorfosisAssignment) => {
    // Cargar datos en el constructor
    setIncludeBase(assignment.includeBase)
    setSelectedBase(assignment.Base)
    setSelectedTransform(assignment.Transform)
    setSelectedSong(assignment.Song)
    setSelectedCunaSong(assignment.CunaSong)
    setCustomNote(assignment.customNote || '')
    
    // Buscar el participante
    const participant = participants.find(p => p.id === assignment.participantId)
    if (participant) {
      setSelectedParticipants([participant])
    }
    
    // Guardar referencia de la asignación que estamos editando
    setEditingAssignment(assignment)
    
    // Cambiar a la pestaña del constructor
    setActiveTab('constructor')
    showToast('Edita los campos y envía de nuevo', 'warning')
  }

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingAssignment(null)
    setSelectedBase(null)
    setSelectedTransform(null)
    setSelectedSong(null)
    setSelectedCunaSong(null)
    setSelectedParticipants([])
    setCustomNote('')
    setIncludeBase(true)
  }

  // Audio controls
  const togglePlaySong = (song: MetamorfosisSong) => {
    if (!song.previewUrl) return
    
    if (playingSongId === song.id && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      setPlayingSongId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.src = song.previewUrl
        audioRef.current.play()
        setIsPlaying(true)
        setPlayingSongId(song.id)
      }
    }
  }

  // Filtros
  const filteredBases = bases.filter(b => 
    b.name.toLowerCase().includes(searchBase.toLowerCase())
  )
  
  const filteredTransforms = transforms.filter(t => 
    t.name.toLowerCase().includes(searchTransform.toLowerCase())
  )
  
  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchSong.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(searchSong.toLowerCase()))
  )
  
  const filteredParticipants = participants.filter(p => 
    p.nombre.toLowerCase().includes(searchParticipant.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <p className="text-purple-300">Cargando Saltos Cuánticos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-4 md:p-8">
      {/* Audio element for previews */}
      <audio 
        ref={audioRef} 
        onEnded={() => { setIsPlaying(false); setPlayingSongId(null) }}
        className="hidden"
      />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30">
              <Theater className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎭 SALTOS CUÁNTICOS
              </h1>
              <p className="text-purple-300/70">Salto Cuántico</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl w-fit">
            {[
              { id: 'constructor', label: 'Constructor', icon: Sparkles },
              { id: 'asignaciones', label: 'Asignaciones', icon: Users },
              { id: 'biblioteca', label: 'Biblioteca', icon: ListMusic }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg'
                    : 'text-purple-300/70 hover:text-purple-200 hover:bg-slate-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Constructor Tab */}
        {activeTab === 'constructor' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Banner Modo Edición */}
            {editingAssignment && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-amber-300 font-medium">Editando asignación de {editingAssignment.Participant.nombre}</p>
                    <p className="text-amber-400/70 text-sm">Modifica los campos y presiona "Actualizar Salto"</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors text-sm"
                >
                  Cancelar edición
                </button>
              </motion.div>
            )}

            {/* Toggle Modo */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Modo de Salto</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${!includeBase ? 'text-purple-400 font-medium' : 'text-slate-400'}`}>
                    Modo Directo
                  </span>
                  <button
                    onClick={() => setIncludeBase(!includeBase)}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      includeBase ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      includeBase ? 'translate-x-8' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className={`text-sm ${includeBase ? 'text-purple-400 font-medium' : 'text-slate-400'}`}>
                    Modo Completo
                  </span>
                </div>
              </div>
              
              <p className="text-purple-300/60 text-sm">
                {includeBase 
                  ? '🎭 Modo Completo: El participante inicia como un personaje base y se transforma explosivamente'
                  : '⚡ Modo Directo: El participante canaliza directamente a su transformación sin personaje base'
                }
              </p>
            </div>

            {/* Constructor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Base (si aplica) */}
              {includeBase && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Personaje Base</h3>
                  </div>
                  
                  {selectedBase ? (
                    <div className="relative p-4 bg-slate-700/50 rounded-xl">
                      <button
                        onClick={() => setSelectedBase(null)}
                        className="absolute top-2 right-2 p-1 bg-slate-600/50 rounded-full hover:bg-red-500/50"
                      >
                        <X className="w-4 h-4 text-slate-300" />
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{selectedBase.name}</p>
                          <p className="text-xs text-blue-300">Personaje Base</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSelectBase(true)}
                      className="w-full p-6 border-2 border-dashed border-blue-500/30 rounded-xl hover:border-blue-400/50 hover:bg-blue-500/5 transition-all group"
                    >
                      <div className="flex flex-col items-center gap-2 text-blue-400 group-hover:text-blue-300">
                        <Plus className="w-8 h-8" />
                        <span className="text-sm">Seleccionar Base</span>
                      </div>
                    </button>
                  )}
                </motion.div>
              )}

              {/* Transformación */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-fuchsia-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-fuchsia-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Transformación</h3>
                </div>
                
                {selectedTransform ? (
                  <div className="relative p-4 bg-slate-700/50 rounded-xl">
                    <button
                      onClick={() => setSelectedTransform(null)}
                      className="absolute top-2 right-2 p-1 bg-slate-600/50 rounded-full hover:bg-red-500/50"
                    >
                      <X className="w-4 h-4 text-slate-300" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{selectedTransform.name}</p>
                        <p className="text-xs text-fuchsia-300">Transformación</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSelectTransform(true)}
                    className="w-full p-6 border-2 border-dashed border-fuchsia-500/30 rounded-xl hover:border-fuchsia-400/50 hover:bg-fuchsia-500/5 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-2 text-fuchsia-400 group-hover:text-fuchsia-300">
                      <Plus className="w-8 h-8" />
                      <span className="text-sm">Seleccionar Transformación</span>
                    </div>
                  </button>
                )}
              </motion.div>

              {/* Canción */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Music className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Canción Detonador</h3>
                </div>
                
                {selectedSong ? (
                  <div className="relative p-4 bg-slate-700/50 rounded-xl">
                    <button
                      onClick={() => setSelectedSong(null)}
                      className="absolute top-2 right-2 p-1 bg-slate-600/50 rounded-full hover:bg-red-500/50"
                    >
                      <X className="w-4 h-4 text-slate-300" />
                    </button>
                    <div className="flex items-center gap-3">
                      {selectedSong.imageUrl ? (
                        <Image
                          src={selectedSong.imageUrl}
                          alt={selectedSong.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <Disc3 className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{selectedSong.title}</p>
                        <p className="text-xs text-green-300 truncate">{selectedSong.artist || 'Artista'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSelectSong(true)}
                    className="w-full p-6 border-2 border-dashed border-green-500/30 rounded-xl hover:border-green-400/50 hover:bg-green-500/5 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-2 text-green-400 group-hover:text-green-300">
                      <Plus className="w-8 h-8" />
                      <span className="text-sm">Seleccionar Canción</span>
                    </div>
                  </button>
                )}
              </motion.div>

              {/* Canción de Cuna */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Moon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Canción de Cuna</h3>
                  <span className="text-xs text-slate-400">(Opcional)</span>
                </div>
                
                {selectedCunaSong ? (
                  <div className="relative p-4 bg-slate-700/50 rounded-xl">
                    <button
                      onClick={() => setSelectedCunaSong(null)}
                      className="absolute top-2 right-2 p-1 bg-slate-600/50 rounded-full hover:bg-red-500/50"
                    >
                      <X className="w-4 h-4 text-slate-300" />
                    </button>
                    <div className="flex items-center gap-3">
                      {selectedCunaSong.imageUrl ? (
                        <Image
                          src={selectedCunaSong.imageUrl}
                          alt={selectedCunaSong.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Moon className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{selectedCunaSong.title}</p>
                        <p className="text-xs text-indigo-300 truncate">{selectedCunaSong.artist || 'Artista'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSelectCunaSong(true)}
                    className="w-full p-6 border-2 border-dashed border-indigo-500/30 rounded-xl hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-2 text-indigo-400 group-hover:text-indigo-300">
                      <Plus className="w-8 h-8" />
                      <span className="text-sm">Seleccionar Canción de Cuna</span>
                    </div>
                  </button>
                )}
              </motion.div>
            </div>

            {/* Participantes */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Asignar a Participante</h3>
                {selectedParticipants.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                    {selectedParticipants.length} seleccionado(s)
                  </span>
                )}
              </div>
              
              {/* Lista de participantes seleccionados */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedParticipants.map(participant => (
                    <div key={participant.id} className="relative p-2 bg-slate-700/50 rounded-xl flex items-center gap-2">
                      <button
                        onClick={() => setSelectedParticipants(prev => prev.filter(p => p.id !== participant.id))}
                        className="absolute -top-1 -right-1 p-0.5 bg-red-500/80 rounded-full hover:bg-red-500"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      {participant.imagen ? (
                        <Image
                          src={participant.imagen}
                          alt={participant.nombre}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-white pr-2">{participant.nombre}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Botón para agregar más participantes */}
              <button
                onClick={() => setShowSelectParticipant(true)}
                className="p-4 border-2 border-dashed border-amber-500/30 rounded-xl hover:border-amber-400/50 hover:bg-amber-500/5 transition-all group w-full"
              >
                <div className="flex items-center justify-center gap-3 text-amber-400 group-hover:text-amber-300">
                  <Plus className="w-6 h-6" />
                  <span>{selectedParticipants.length > 0 ? 'Agregar más participantes' : 'Seleccionar Participante'}</span>
                </div>
              </button>
            </div>

            {/* Nota personalizada */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Edit2 className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Nota Personalizada (Opcional)</h3>
              </div>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Agrega una nota especial para el participante..."
                className="w-full p-4 bg-slate-700/50 border border-purple-500/20 rounded-xl text-white placeholder-slate-400 focus:border-purple-400 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Preview y Acciones */}
            {(selectedTransform && selectedSong) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-6 border border-fuchsia-500/30"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Tv className="w-5 h-5 text-fuchsia-400" />
                  <h3 className="text-lg font-semibold text-white">Vista Previa de la Metamorfosis</h3>
                </div>
                
                <div className="bg-black/30 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-4 text-center">
                    {includeBase && selectedBase && (
                      <>
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-2">
                            <User className="w-8 h-8 text-white" />
                          </div>
                          <span className="text-blue-300 font-medium">{selectedBase.name}</span>
                          <span className="text-xs text-blue-400/60">Base</span>
                        </div>
                        <ArrowRight className="w-8 h-8 text-fuchsia-400 animate-pulse" />
                      </>
                    )}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-fuchsia-500/30">
                        <Star className="w-10 h-10 text-white" />
                      </div>
                      <span className="text-fuchsia-300 font-bold text-lg">{selectedTransform.name}</span>
                      <span className="text-xs text-fuchsia-400/60">Transformación</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-green-500/10 rounded-xl">
                    <Disc3 className="w-6 h-6 text-green-400 animate-spin" style={{ animationDuration: '3s' }} />
                    <div className="text-center">
                      <p className="text-green-300 font-medium">🎵 {selectedSong.title}</p>
                      {selectedSong.artist && <p className="text-xs text-green-400/60">{selectedSong.artist}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowPreview(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Vista Pantalla Grande</span>
                  </button>
                  {editingAssignment && (
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5" />
                      <span>Cancelar</span>
                    </button>
                  )}
                  <button
                    onClick={handleSendAssignment}
                    disabled={selectedParticipants.length === 0 || sending}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 ${
                      editingAssignment 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/30'
                        : 'bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500 shadow-fuchsia-500/30'
                    } text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {editingAssignment ? <RefreshCw className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                        <span>{editingAssignment ? 'Actualizar Salto' : `Asignar a ${selectedParticipants.length > 0 ? `${selectedParticipants.length} participante(s)` : 'Participante'}`}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Asignaciones Tab */}
        {activeTab === 'asignaciones' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {assignments.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-purple-500/20">
                <Theater className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
                <p className="text-purple-300/70">No hay asignaciones de saltos aún</p>
                <button
                  onClick={() => setActiveTab('constructor')}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-xl hover:from-fuchsia-400 hover:to-purple-500"
                >
                  Crear Primer Salto
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {assignments.map(assignment => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {assignment.Participant.imagen ? (
                          <Image
                            src={assignment.Participant.imagen}
                            alt={assignment.Participant.nombre}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{assignment.Participant.nombre}</p>
                          <p className="text-xs text-purple-300/60">
                            {new Date(assignment.createdAt).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm ${statusConfig[assignment.status].bgColor} ${statusConfig[assignment.status].color}`}>
                          {statusConfig[assignment.status].label}
                        </div>
                        {/* Botones de acción */}
                        <button
                          onClick={() => handleEditAssignment(assignment)}
                          className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 hover:text-purple-300"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={deletingAssignmentId === assignment.id}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300 disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingAssignmentId === assignment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-black/20 rounded-xl p-4">
                      <p className="text-lg text-white">{assignment.constructedPhrase}</p>
                      {assignment.customNote && (
                        <p className="text-sm text-purple-300/70 mt-2 italic">"{assignment.customNote}"</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Biblioteca Tab */}
        {activeTab === 'biblioteca' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Bases */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Personajes Base ({bases.length})</h3>
                </div>
                <button
                  onClick={() => setShowAddModal('base')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bases.map(base => (
                  <div
                    key={base.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                      base.isSystemDefault
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {base.name}
                    {!base.isSystemDefault && (
                      <>
                        <span className="text-xs ml-1 text-blue-400">✓</span>
                        <button
                          onClick={() => handleDeleteElement('base', base.id, base.name)}
                          className="ml-1 p-0.5 hover:bg-red-500/30 rounded text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Transformaciones */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-fuchsia-400" />
                  <h3 className="text-lg font-semibold text-white">Transformaciones ({transforms.length})</h3>
                </div>
                <button
                  onClick={() => setShowAddModal('transform')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-400 rounded-lg text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {transforms.map(transform => (
                  <div
                    key={transform.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                      transform.isSystemDefault
                        ? 'bg-fuchsia-500/20 text-fuchsia-300'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {transform.name}
                    {!transform.isSystemDefault && (
                      <>
                        <span className="text-xs ml-1 text-fuchsia-400">✓</span>
                        <button
                          onClick={() => handleDeleteElement('transform', transform.id, transform.name)}
                          className="ml-1 p-0.5 hover:bg-red-500/30 rounded text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Canciones */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Canciones Detonador ({songs.length})</h3>
                </div>
                <button
                  onClick={() => setShowAddModal('song')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
              <div className="grid gap-2">
                {songs.map(song => (
                  <div
                    key={song.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      song.isSystemDefault
                        ? 'bg-green-500/10'
                        : 'bg-slate-700/30'
                    }`}
                  >
                    <Disc3 className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-white text-sm">{song.title}</p>
                      {song.artist && <p className="text-xs text-green-300/60">{song.artist}</p>}
                    </div>
                    {!song.isSystemDefault && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-400">Personalizado</span>
                        <button
                          onClick={() => handleDeleteElement('song', song.id, song.title)}
                          className="p-1 hover:bg-red-500/30 rounded text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Canciones de Cuna */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">Canciones de Cuna ({cunaSongs.length})</h3>
                </div>
                <button
                  onClick={() => setShowAddModal('cunaSong')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
              <div className="grid gap-2">
                {cunaSongs.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No hay canciones de cuna registradas</p>
                ) : (
                  cunaSongs.map(song => (
                    <div
                      key={song.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        song.isSystemDefault
                          ? 'bg-indigo-500/10'
                          : 'bg-slate-700/30'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <div className="flex-1">
                        <p className="text-white text-sm">{song.title}</p>
                        {song.artist && <p className="text-xs text-indigo-300/60">{song.artist}</p>}
                      </div>
                      {!song.isSystemDefault && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-indigo-400">Personalizado</span>
                          <button
                            onClick={() => handleDeleteElement('cunaSong', song.id, song.title)}
                            className="p-1 hover:bg-red-500/30 rounded text-red-400 hover:text-red-300"
                            title="Eliminar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal: Seleccionar Base */}
      <AnimatePresence>
        {showSelectBase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSelectBase(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Seleccionar Personaje Base</h3>
                <button onClick={() => setShowSelectBase(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchBase}
                  onChange={(e) => setSearchBase(e.target.value)}
                  placeholder="Buscar base..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredBases.map(base => (
                  <button
                    key={base.id}
                    onClick={() => {
                      setSelectedBase(base)
                      setShowSelectBase(false)
                    }}
                    className="w-full p-3 bg-slate-700/50 hover:bg-blue-500/20 rounded-xl text-left transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{base.name}</p>
                      <p className="text-xs text-slate-400">{base.isSystemDefault ? 'Sistema' : 'Personalizado'}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setShowSelectBase(false)
                  setShowAddModal('base')
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-500/30 rounded-xl text-blue-400 hover:border-blue-400 hover:bg-blue-500/5"
              >
                <Plus className="w-5 h-5" />
                Crear Nuevo Base
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Seleccionar Transformación */}
      <AnimatePresence>
        {showSelectTransform && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSelectTransform(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Seleccionar Transformación</h3>
                <button onClick={() => setShowSelectTransform(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTransform}
                  onChange={(e) => setSearchTransform(e.target.value)}
                  placeholder="Buscar transformación..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredTransforms.map(transform => (
                  <button
                    key={transform.id}
                    onClick={() => {
                      setSelectedTransform(transform)
                      setShowSelectTransform(false)
                    }}
                    className="w-full p-3 bg-slate-700/50 hover:bg-fuchsia-500/20 rounded-xl text-left transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{transform.name}</p>
                      <p className="text-xs text-slate-400">{transform.isSystemDefault ? 'Sistema' : 'Personalizado'}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setShowSelectTransform(false)
                  setShowAddModal('transform')
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-fuchsia-500/30 rounded-xl text-fuchsia-400 hover:border-fuchsia-400 hover:bg-fuchsia-500/5"
              >
                <Plus className="w-5 h-5" />
                Crear Nueva Transformación
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Seleccionar Canción */}
      <AnimatePresence>
        {showSelectSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSelectSong(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Seleccionar Canción</h3>
                <button onClick={() => setShowSelectSong(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchSong}
                  onChange={(e) => setSearchSong(e.target.value)}
                  placeholder="Buscar canción o artista..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => {
                      setSelectedSong(song)
                      setShowSelectSong(false)
                    }}
                    className="w-full p-3 bg-slate-700/50 hover:bg-green-500/20 rounded-xl text-left transition-colors flex items-center gap-3"
                  >
                    {song.imageUrl ? (
                      <Image
                        src={song.imageUrl}
                        alt={song.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{song.title}</p>
                      <p className="text-xs text-slate-400 truncate">{song.artist || 'Artista desconocido'}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setShowSelectSong(false)
                  setShowAddModal('song')
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-green-500/30 rounded-xl text-green-400 hover:border-green-400 hover:bg-green-500/5"
              >
                <Plus className="w-5 h-5" />
                Agregar Nueva Canción
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Seleccionar Canción de Cuna */}
      <AnimatePresence>
        {showSelectCunaSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSelectCunaSong(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Seleccionar Canción de Cuna</h3>
                <button onClick={() => setShowSelectCunaSong(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchCunaSong}
                  onChange={(e) => setSearchCunaSong(e.target.value)}
                  placeholder="Buscar canción de cuna..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {cunaSongs
                  .filter(song => 
                    song.title.toLowerCase().includes(searchCunaSong.toLowerCase()) ||
                    (song.artist && song.artist.toLowerCase().includes(searchCunaSong.toLowerCase()))
                  )
                  .map(song => (
                  <button
                    key={song.id}
                    onClick={() => {
                      setSelectedCunaSong(song)
                      setShowSelectCunaSong(false)
                    }}
                    className="w-full p-3 bg-slate-700/50 hover:bg-indigo-500/20 rounded-xl text-left transition-colors flex items-center gap-3"
                  >
                    {song.imageUrl ? (
                      <Image
                        src={song.imageUrl}
                        alt={song.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Moon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{song.title}</p>
                      <p className="text-xs text-slate-400 truncate">{song.artist || 'Artista desconocido'}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setShowSelectCunaSong(false)
                  setShowAddModal('cunaSong')
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-indigo-500/30 rounded-xl text-indigo-400 hover:border-indigo-400 hover:bg-indigo-500/5"
              >
                <Plus className="w-5 h-5" />
                Agregar Nueva Canción de Cuna
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Seleccionar Participante */}
      <AnimatePresence>
        {showSelectParticipant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSelectParticipant(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Seleccionar Participantes</h3>
                <button onClick={() => setShowSelectParticipant(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              {selectedParticipants.length > 0 && (
                <div className="mb-3 p-2 bg-amber-500/10 rounded-lg">
                  <p className="text-amber-400 text-sm">{selectedParticipants.length} participante(s) seleccionado(s)</p>
                </div>
              )}
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchParticipant}
                  onChange={(e) => setSearchParticipant(e.target.value)}
                  placeholder="Buscar participante..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay participantes disponibles</p>
                    <p className="text-xs mt-1">Asegúrate de tener entrenamientos activos</p>
                  </div>
                ) : (
                  filteredParticipants.map(participant => {
                    const isSelected = selectedParticipants.some(p => p.id === participant.id)
                    return (
                      <button
                        key={participant.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedParticipants(prev => prev.filter(p => p.id !== participant.id))
                          } else {
                            setSelectedParticipants(prev => [...prev, participant])
                          }
                        }}
                        className={`w-full p-3 rounded-xl text-left transition-colors flex items-center gap-3 ${
                          isSelected 
                            ? 'bg-amber-500/30 border-2 border-amber-500' 
                            : 'bg-slate-700/50 hover:bg-amber-500/20 border-2 border-transparent'
                        }`}
                      >
                        {participant.imagen ? (
                          <Image
                            src={participant.imagen}
                            alt={participant.nombre}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-white font-medium">{participant.nombre}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-amber-400" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
              
              <button
                onClick={() => setShowSelectParticipant(false)}
                className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all"
              >
                Confirmar ({selectedParticipants.length} seleccionados)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Agregar Nuevo Elemento */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {showAddModal === 'base' && 'Nuevo Personaje Base'}
                  {showAddModal === 'transform' && 'Nueva Transformación'}
                  {showAddModal === 'song' && 'Nueva Canción'}
                </h3>
                <button onClick={() => setShowAddModal(null)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {showAddModal === 'song' ? 'Título' : 'Nombre'}
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={showAddModal === 'song' ? 'Ej: Livin la Vida Loca' : 'Ej: Shakira'}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                  />
                </div>
                
                {showAddModal === 'song' && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Artista</label>
                    <input
                      type="text"
                      value={newItemArtist}
                      onChange={(e) => setNewItemArtist(e.target.value)}
                      placeholder="Ej: Ricky Martin"
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400"
                    />
                  </div>
                )}
                
                <button
                  onClick={handleCreateElement}
                  disabled={!newItemName.trim() || creating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-xl hover:from-fuchsia-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Vista Pantalla Grande (Preview) */}
      <AnimatePresence>
        {showPreview && selectedTransform && selectedSong && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Strobe effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900 via-purple-900 to-indigo-900 animate-pulse" style={{ animationDuration: '0.5s' }} />
              
              {/* Close button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full z-10"
              >
                <X className="w-8 h-8 text-white" />
              </button>
              
              {/* Content */}
              <div className="relative z-10 text-center max-w-4xl">
                {includeBase && selectedBase && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <p className="text-4xl text-blue-300 font-light mb-2">De</p>
                    <p className="text-6xl md:text-8xl font-bold text-blue-400">{selectedBase.name}</p>
                  </motion.div>
                )}
                
                {includeBase && selectedBase && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="mb-8"
                  >
                    <ArrowRight className="w-16 h-16 text-fuchsia-400 mx-auto animate-pulse" />
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: includeBase ? 0.8 : 0.2, type: 'spring' }}
                  className="mb-12"
                >
                  <p className="text-4xl text-fuchsia-300 font-light mb-2">
                    {includeBase ? 'A' : 'Canaliza a'}
                  </p>
                  <p className="text-7xl md:text-9xl font-black bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    {selectedTransform.name}
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: includeBase ? 1.2 : 0.6 }}
                  className="flex items-center justify-center gap-4 p-6 bg-black/50 rounded-2xl backdrop-blur-sm"
                >
                  <Disc3 className="w-12 h-12 text-green-400 animate-spin" style={{ animationDuration: '2s' }} />
                  <div className="text-left">
                    <p className="text-3xl md:text-4xl font-bold text-green-400">🎵 {selectedSong.title}</p>
                    {selectedSong.artist && (
                      <p className="text-xl text-green-300/70">{selectedSong.artist}</p>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-sm border ${
              toast.type === 'success' 
                ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                : toast.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}>
              {toast.type === 'success' && (
                <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center">
                  <X className="w-6 h-6 text-red-400" />
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="w-10 h-10 bg-amber-500/30 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
              )}
              <p className="font-medium text-lg">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
