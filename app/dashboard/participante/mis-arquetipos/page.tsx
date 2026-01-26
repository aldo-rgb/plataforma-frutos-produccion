'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, ChevronRight, Heart, Check, Play, 
  Volume2, VolumeX, X, Loader2, Drama, Gift
} from 'lucide-react'
import Image from 'next/image'
import confetti from 'canvas-confetti'

interface ArchetypeAssignment {
  id: number
  status: 'SENT' | 'VIEWED' | 'ACCEPTED' | 'TRANSFORMED'
  customNote: string | null
  createdAt: string
  Archetype: {
    id: number
    name: string
    category: string
    maneraSerTag: string
    maneraSerLabel: string
    scriptFeedback: string
    imageUrl: string | null
  }
  AssignedBy: {
    id: number
    nombre: string
  }
}

const categoryGradients: Record<string, string> = {
  VICTIMA_DRAMA: 'from-blue-600 via-indigo-600 to-purple-700',
  NINO_BERRINCHUDO: 'from-red-500 via-orange-500 to-amber-500',
  MASCARA_DUREZA_EGO: 'from-amber-500 via-yellow-500 to-orange-500',
  SALVADORES_MARTIRES: 'from-pink-500 via-rose-500 to-red-500',
  INVISIBLES_SOLITARIOS: 'from-purple-600 via-violet-600 to-indigo-600',
  MASCARA_SOCIAL: 'from-teal-500 via-cyan-500 to-blue-500',
  CUSTOM: 'from-emerald-500 via-green-500 to-teal-500'
}

export default function MisArquetiposPage() {
  const [assignments, setAssignments] = useState<ArchetypeAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReveal, setActiveReveal] = useState<ArchetypeAssignment | null>(null)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/participante/mis-arquetipos?showAll=true')
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenReveal = async (assignment: ArchetypeAssignment) => {
    setActiveReveal(assignment)
    
    // Marcar como visto si es nuevo
    if (assignment.status === 'SENT') {
      try {
        await fetch('/api/participante/mis-arquetipos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: assignment.id,
            action: 'view'
          })
        })
        // Actualizar localmente
        setAssignments(prev => prev.map(a => 
          a.id === assignment.id ? { ...a, status: 'VIEWED' } : a
        ))
      } catch (error) {
        console.error('Error marking as viewed:', error)
      }
    }
  }

  const newAssignments = assignments.filter(a => a.status === 'SENT')
  const viewedAssignments = assignments.filter(a => a.status !== 'SENT')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-300 mb-4">
            <Sparkles className="w-4 h-4" />
            Tu Espejo Interior
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Descubre tu Personaje
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Tu entrenador te ha asignado un personaje que refleja patrones de comportamiento. 
            Conócelo para transformarlo.
          </p>
        </motion.div>

        {/* Nuevos (sin abrir) */}
        {newAssignments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <Gift className="w-5 h-5 text-amber-400" />
              ¡Tienes {newAssignments.length} personaje(s) nuevo(s)!
            </h2>
            
            <div className="grid gap-4">
              {newAssignments.map((assignment) => (
                <motion.button
                  key={assignment.id}
                  onClick={() => handleOpenReveal(assignment)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative p-6 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl border-2 border-purple-500/50 overflow-hidden group"
                >
                  {/* Efecto de brillo */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-purple-500/30 flex items-center justify-center animate-pulse">
                      <Gift className="w-8 h-8 text-purple-300" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold">
                        {assignment.AssignedBy.nombre} te envió un personaje
                      </p>
                      <p className="text-purple-300 text-sm">
                        Toca para descubrirlo
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-purple-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Ya vistos */}
        {viewedAssignments.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <Drama className="w-5 h-5 text-slate-400" />
              Tus Personajes
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {viewedAssignments.map((assignment) => {
                const gradient = categoryGradients[assignment.Archetype.category] || categoryGradients.CUSTOM
                
                return (
                  <motion.button
                    key={assignment.id}
                    onClick={() => handleOpenReveal(assignment)}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-1 rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden`}
                  >
                    <div className="bg-slate-900 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800">
                          {assignment.Archetype.imageUrl ? (
                            <Image
                              src={assignment.Archetype.imageUrl}
                              alt={assignment.Archetype.name}
                              width={56}
                              height={56}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient}`}>
                              <Drama className="w-6 h-6 text-white/70" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-white">{assignment.Archetype.name}</p>
                          <p className="text-sm text-slate-400">{assignment.Archetype.maneraSerLabel}</p>
                        </div>
                        {assignment.status === 'ACCEPTED' && (
                          <Check className="w-5 h-5 text-green-400" />
                        )}
                        {assignment.status === 'TRANSFORMED' && (
                          <Sparkles className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sin personajes */}
        {assignments.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Drama className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Aún no tienes personajes asignados
            </h3>
            <p className="text-slate-400">
              Tu entrenador te asignará un personaje durante el proceso
            </p>
          </motion.div>
        )}
      </div>

      {/* Modal de Revelación */}
      <AnimatePresence>
        {activeReveal && (
          <ArchetypeRevealModal
            assignment={activeReveal}
            onClose={() => setActiveReveal(null)}
            onAccept={async () => {
              try {
                await fetch('/api/participante/mis-arquetipos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    assignmentId: activeReveal.id,
                    action: 'accept'
                  })
                })
                setAssignments(prev => prev.map(a => 
                  a.id === activeReveal.id ? { ...a, status: 'ACCEPTED' } : a
                ))
                setActiveReveal(null)
              } catch (error) {
                console.error('Error:', error)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Modal de revelación dramática
function ArchetypeRevealModal({
  assignment,
  onClose,
  onAccept
}: {
  assignment: ArchetypeAssignment
  onClose: () => void
  onAccept: () => void
}) {
  const [stage, setStage] = useState<'intro' | 'reveal' | 'script'>('intro')
  const [showScript, setShowScript] = useState(false)
  const gradient = categoryGradients[assignment.Archetype.category] || categoryGradients.CUSTOM

  useEffect(() => {
    if (assignment.status !== 'SENT') {
      // Si ya fue visto, ir directo al script
      setStage('script')
      setShowScript(true)
    }
  }, [assignment.status])

  const handleReveal = () => {
    setStage('reveal')
    
    // Confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#8b5cf6']
    })

    // Después de la animación, mostrar script
    setTimeout(() => {
      setStage('script')
      setTimeout(() => setShowScript(true), 500)
    }, 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 overflow-y-auto"
    >
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        
        {/* Stage: Intro */}
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center max-w-md"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="mb-8"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center">
                  <Gift className="w-16 h-16 text-purple-400" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-4">
                {assignment.AssignedBy.nombre} te ha asignado un personaje
              </h2>
              
              <p className="text-slate-400 mb-8">
                Este personaje refleja una manera de ser que tu entrenador ha identificado. 
                Conócelo para iniciar tu transformación.
              </p>

              <motion.button
                onClick={handleReveal}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl text-lg shadow-lg shadow-purple-500/30"
              >
                Revelar mi Personaje
              </motion.button>
            </motion.div>
          )}

          {/* Stage: Reveal */}
          {stage === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, type: 'spring' }}
              className="text-center"
            >
              <div className={`w-64 h-80 mx-auto bg-gradient-to-br ${gradient} rounded-3xl p-1 shadow-2xl`}>
                <div className="w-full h-full bg-slate-900 rounded-3xl overflow-hidden flex flex-col items-center justify-center">
                  {assignment.Archetype.imageUrl ? (
                    <Image
                      src={assignment.Archetype.imageUrl}
                      alt={assignment.Archetype.name}
                      width={200}
                      height={200}
                      className="object-cover"
                    />
                  ) : (
                    <Drama className="w-24 h-24 text-white/30" />
                  )}
                  <div className="p-4 text-center">
                    <h2 className="text-2xl font-bold text-white">{assignment.Archetype.name}</h2>
                    <p className="text-slate-400">{assignment.Archetype.maneraSerLabel}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage: Script */}
          {stage === 'script' && (
            <motion.div
              key="script"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-2xl"
            >
              {/* Header con imagen */}
              <div className={`relative h-48 md:h-64 rounded-t-3xl bg-gradient-to-br ${gradient} overflow-hidden`}>
                {assignment.Archetype.imageUrl && (
                  <Image
                    src={assignment.Archetype.imageUrl}
                    alt={assignment.Archetype.name}
                    fill
                    className="object-cover opacity-60"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/30 rounded-full text-white hover:bg-black/50"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-6 left-6 right-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className={`inline-block px-3 py-1 rounded-full text-sm text-white bg-white/20 mb-2`}>
                      {assignment.Archetype.maneraSerTag}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      {assignment.Archetype.name}
                    </h2>
                    <p className="text-white/70">{assignment.Archetype.maneraSerLabel}</p>
                  </motion.div>
                </div>
              </div>

              {/* Script */}
              <div className="bg-slate-900 rounded-b-3xl p-6 md:p-8">
                <AnimatePresence>
                  {showScript && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h3 className="text-sm font-semibold text-purple-400 mb-4 uppercase tracking-wider">
                        Tu Reflejo Interior
                      </h3>
                      
                      <div className="p-6 bg-slate-800/50 rounded-2xl mb-6">
                        <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-lg">
                          {assignment.Archetype.scriptFeedback}
                        </p>
                      </div>

                      {assignment.customNote && (
                        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl mb-6">
                          <p className="text-sm text-purple-300 mb-1">Mensaje de {assignment.AssignedBy.nombre}:</p>
                          <p className="text-white italic">"{assignment.customNote}"</p>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-3">
                        {assignment.status !== 'ACCEPTED' && assignment.status !== 'TRANSFORMED' ? (
                          <button
                            onClick={onAccept}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                          >
                            <Check className="w-5 h-5" />
                            Recibido
                          </button>
                        ) : (
                          <div className="w-full py-4 bg-green-500/20 text-green-400 font-semibold rounded-xl flex items-center justify-center gap-2">
                            <Check className="w-5 h-5" />
                            Ya aceptaste este personaje
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
