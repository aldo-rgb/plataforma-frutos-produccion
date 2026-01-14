'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, User, Phone, Mail, Calendar, MapPin, 
  FileText, Heart, Award, TrendingUp, CheckCircle,
  Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  Building, PhoneCall, ClipboardList, Stethoscope,
  Target, BookOpen, Users, CreditCard, Eye, Star
} from 'lucide-react'

interface TopFileModalProps {
  userId: number
  userName: string
  isOpen: boolean
  onClose: () => void
}

interface TopFileData {
  usuario: {
    id: number
    nombre: string
    email: string
    apodo: string | null
    telefono: string | null
    imagen: string | null
    fechaRegistro: string
    ciudad: string | null
    pais: string | null
    rol: string
    status: string
    organizacion: { id: number; name: string; logoUrl: string | null } | null
  }
  llamadas: {
    total: number
    completadas: number
    pendientes: number
    perdidas: number
    historial: any[]
    llamadasGC?: any[]
    intentosGC?: any[]
  }
  cuestionarios: {
    total: number
    completados: number
    pendientes: number
    respuestas: any[]
  }
  preRegistros: {
    total: number
    pagados: number
    pendientes: number
    historial: any[]
  }
  quizMedico: {
    completado: boolean
    fechaCreacion?: string
    fechaFirma?: string
    tieneAlertas?: boolean
    condiciones?: any
    contactoEmergencia?: any
    vision?: { id: number; name: string }
  }
  historialProductos: {
    enrollments: any[]
    checkIns: any[]
  }
  cartaFrutos: any
  estadisticasTareas: {
    total: number
    completed: number
    pending: number
    cancelled: number
  }
  quizAvanzado: { completado: boolean; mensaje?: string }
  quizPL: { completado: boolean; mensaje?: string }
}

type SectionKey = 'llamadas' | 'cuestionarios' | 'preRegistros' | 'quizMedico' | 'historial' | 'carta' | 'tareas'

export default function TopFileModal({ userId, userName, isOpen, onClose }: TopFileModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topFile, setTopFile] = useState<TopFileData | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['llamadas', 'cuestionarios']))

  useEffect(() => {
    if (isOpen && userId) {
      fetchTopFile()
    }
  }, [isOpen, userId])

  const fetchTopFile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/el-cruce/top-file/${userId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar TOP FILE')
      }
      
      setTopFile(data.topFile)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'COMPLETED': 'bg-green-500/20 text-green-400',
      'APPROVED': 'bg-green-500/20 text-green-400',
      'PENDING': 'bg-amber-500/20 text-amber-400',
      'PAID': 'bg-blue-500/20 text-blue-400',
      'MISSED': 'bg-red-500/20 text-red-400',
      'REJECTED': 'bg-red-500/20 text-red-400',
      'CANCELLED': 'bg-slate-500/20 text-slate-400',
      'ACTIVE': 'bg-green-500/20 text-green-400',
      // Estados de GC Calls
      'NO_SHOW': 'bg-red-500/20 text-red-400',
      'ANSWERED': 'bg-green-500/20 text-green-400',
      'VOICEMAIL': 'bg-orange-500/20 text-orange-400',
      'RESCHEDULED': 'bg-purple-500/20 text-purple-400',
      'ATTEMPTED': 'bg-cyan-500/20 text-cyan-400',
      'IN_PROGRESS': 'bg-blue-500/20 text-blue-400',
      'SCHEDULED': 'bg-indigo-500/20 text-indigo-400'
    }
    return colors[status] || 'bg-slate-500/20 text-slate-400'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'COMPLETED': 'Completada',
      'APPROVED': 'Aprobada',
      'PENDING': 'Pendiente',
      'PAID': 'Pagado',
      'MISSED': 'Perdida',
      'REJECTED': 'Rechazada',
      'CANCELLED': 'Cancelada',
      'ACTIVE': 'Activo',
      // Estados de GC Calls
      'NO_SHOW': 'No contestó',
      'ANSWERED': 'Contestada',
      'VOICEMAIL': 'Buzón',
      'RESCHEDULED': 'Reagendada',
      'ATTEMPTED': 'Intento',
      'IN_PROGRESS': 'En progreso',
      'SCHEDULED': 'Agendada'
    }
    return labels[status] || status
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-500/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    TOP FILE
                    <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                      Perfil Completo
                    </span>
                  </h2>
                  <p className="text-sm text-cyan-400/70">{userName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
                <p className="text-slate-400">Extrayendo Datos TOP FILE...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 mb-2">{error}</p>
                <button
                  onClick={fetchTopFile}
                  className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
                >
                  Reintentar
                </button>
              </div>
            ) : topFile ? (
              <div className="space-y-4">
                {/* Info del usuario */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0">
                      {topFile.usuario.imagen ? (
                        <img 
                          src={topFile.usuario.imagen} 
                          alt={topFile.usuario.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-2xl font-bold">
                          {topFile.usuario.nombre?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{topFile.usuario.nombre}</h3>
                      {topFile.usuario.apodo && (
                        <p className="text-sm text-cyan-400">@{topFile.usuario.apodo}</p>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{topFile.usuario.email}</span>
                        </div>
                        {topFile.usuario.telefono && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Phone className="w-4 h-4" />
                            <span>{topFile.usuario.telefono}</span>
                          </div>
                        )}
                        {(topFile.usuario.ciudad || topFile.usuario.pais) && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-4 h-4" />
                            <span>{[topFile.usuario.ciudad, topFile.usuario.pais].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>Desde {formatDate(topFile.usuario.fechaRegistro)}</span>
                        </div>
                      </div>
                    </div>
                    {topFile.usuario.organizacion && (
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Building className="w-4 h-4" />
                          <span>{topFile.usuario.organizacion.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Stats rápidos */}
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-cyan-400">{topFile.estadisticasTareas.completed}</p>
                      <p className="text-xs text-slate-400">Tareas Completadas</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{topFile.llamadas.completadas}</p>
                      <p className="text-xs text-slate-400">Llamadas</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-400">{topFile.cuestionarios.completados}</p>
                      <p className="text-xs text-slate-400">Cuestionarios</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{topFile.preRegistros.total}</p>
                      <p className="text-xs text-slate-400">Pre-registros</p>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN: HISTORIAL DE LLAMADAS */}
                <CollapsibleSection
                  title="Historial de Llamadas"
                  icon={<PhoneCall className="w-5 h-5 text-green-400" />}
                  count={topFile.llamadas.total}
                  isExpanded={expandedSections.has('llamadas')}
                  onToggle={() => toggleSection('llamadas')}
                  color="green"
                >
                  {/* Llamadas de Game Changer */}
                  {topFile.llamadas.llamadasGC && topFile.llamadas.llamadasGC.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Llamadas de Game Changer ({topFile.llamadas.llamadasGC.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {topFile.llamadas.llamadasGC.map((call: any) => (
                          <div key={`gc-${call.id}`} className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-600/30 overflow-hidden flex items-center justify-center">
                                  {call.gameChanger?.imagen ? (
                                    <img src={call.gameChanger.imagen} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-emerald-400 text-sm font-medium">GC</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{call.gameChanger?.nombre || 'Game Changer'}</p>
                                  <p className="text-xs text-slate-400">{formatDate(call.fecha)}</p>
                                  {call.vision && (
                                    <p className="text-xs text-emerald-400">{call.vision.nombre}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(call.estado)}`}>
                                  {getStatusLabel(call.estado)}
                                </span>
                                {call.duracion && (
                                  <p className="text-xs text-slate-400 mt-1">{call.duracion} min</p>
                                )}
                              </div>
                            </div>
                            {call.notas && (
                              <p className="text-xs text-slate-300 mt-2 bg-slate-700/30 p-2 rounded">{call.notas}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intentos de Llamada GC */}
                  {topFile.llamadas.intentosGC && topFile.llamadas.intentosGC.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Intentos de Llamada ({topFile.llamadas.intentosGC.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {topFile.llamadas.intentosGC.map((attempt: any) => (
                          <div key={`attempt-${attempt.id}`} className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-white">{attempt.gameChanger?.nombre || 'Game Changer'}</p>
                                <p className="text-xs text-slate-400">{formatDate(attempt.fecha)}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(attempt.resultado)}`}>
                                {getStatusLabel(attempt.resultado)}
                              </span>
                            </div>
                            {attempt.notas && (
                              <p className="text-xs text-slate-400 mt-1">{attempt.notas}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Llamadas de Mentoría (historial original) */}
                  {topFile.llamadas.historial.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Llamadas de Mentoría ({topFile.llamadas.historial.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {topFile.llamadas.historial.map((call: any) => (
                          <div key={call.id} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden">
                                {call.mentor?.imagen ? (
                                  <img src={call.mentor.imagen} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                    {call.mentor?.nombre?.charAt(0) || 'M'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{call.mentor?.nombre || 'Mentor'}</p>
                                <p className="text-xs text-slate-400">{formatDate(call.fecha)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(call.estado)}`}>
                                {getStatusLabel(call.estado)}
                              </span>
                              {call.calificacion && (
                                <div className="flex items-center gap-1 mt-1 justify-end">
                                  <Star className="w-3 h-3 text-amber-400" />
                                  <span className="text-xs text-amber-400">{call.calificacion}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje si no hay llamadas */}
                  {topFile.llamadas.historial.length === 0 && 
                   (!topFile.llamadas.llamadasGC || topFile.llamadas.llamadasGC.length === 0) &&
                   (!topFile.llamadas.intentosGC || topFile.llamadas.intentosGC.length === 0) && (
                    <p className="text-slate-500 text-sm text-center py-4">Sin llamadas registradas</p>
                  )}
                </CollapsibleSection>

                {/* SECCIÓN: RESPUESTAS DE CUESTIONARIOS */}
                <CollapsibleSection
                  title="Respuestas de Cuestionarios"
                  icon={<ClipboardList className="w-5 h-5 text-blue-400" />}
                  count={topFile.cuestionarios.total}
                  isExpanded={expandedSections.has('cuestionarios')}
                  onToggle={() => toggleSection('cuestionarios')}
                  color="blue"
                >
                  {topFile.cuestionarios.respuestas.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Sin respuestas a cuestionarios</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {topFile.cuestionarios.respuestas.map((sub: any) => (
                        <div key={sub.id} className="bg-slate-700/30 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-white">{sub.mision.titulo}</p>
                              <p className="text-xs text-slate-400 mt-1">{sub.mision.descripcion}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                                  {sub.mision.tipo}
                                </span>
                                {sub.mision.producto && (
                                  <span className="text-xs text-slate-500">{sub.mision.producto.name}</span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(sub.estado)}`}>
                              {getStatusLabel(sub.estado)}
                            </span>
                          </div>
                          
                          {/* Respuestas a preguntas */}
                          {sub.respuestasPreguntas && sub.respuestasPreguntas.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-2">
                              {sub.respuestasPreguntas.map((qa: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <p className="text-cyan-400/80 font-medium">📋 {qa.pregunta}</p>
                                  <p className="text-white pl-4 mt-1">
                                    {qa.respuestaTexto || 
                                     (qa.opcionesSeleccionadas?.length > 0 ? qa.opcionesSeleccionadas.join(', ') : null) ||
                                     (qa.valorEscala !== null ? `Escala: ${qa.valorEscala}` : null) ||
                                     (qa.respuestaBooleana !== null ? (qa.respuestaBooleana ? 'Sí' : 'No') : null) ||
                                     '—'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Respuesta de texto libre */}
                          {sub.respuestaTexto && (
                            <div className="mt-3 pt-3 border-t border-slate-600/50">
                              <p className="text-xs text-slate-400 mb-1">Respuesta:</p>
                              <p className="text-sm text-white">{sub.respuestaTexto}</p>
                            </div>
                          )}
                          
                          {/* Nota de aprendizaje */}
                          {sub.notaAprendizaje && (
                            <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                              <p className="text-xs text-purple-400 mb-1">💡 Nota de aprendizaje:</p>
                              <p className="text-sm text-purple-300">{sub.notaAprendizaje}</p>
                            </div>
                          )}
                          
                          {/* Fecha y puntos */}
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                            <span>Enviado: {formatDate(sub.fechaEnvio)}</span>
                            {sub.puntosGanados > 0 && (
                              <span className="text-amber-400">+{sub.puntosGanados} pts</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                {/* SECCIÓN: QUIZ MÉDICO */}
                <CollapsibleSection
                  title="Quiz Médico"
                  icon={<Stethoscope className="w-5 h-5 text-red-400" />}
                  count={topFile.quizMedico.completado ? 1 : 0}
                  isExpanded={expandedSections.has('quizMedico')}
                  onToggle={() => toggleSection('quizMedico')}
                  color="red"
                  badge={topFile.quizMedico.tieneAlertas ? (
                    <span className="text-xs px-2 py-0.5 bg-red-500/30 text-red-400 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Alertas
                    </span>
                  ) : null}
                >
                  {!topFile.quizMedico.completado ? (
                    <p className="text-slate-500 text-sm text-center py-4">Quiz médico no completado</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Condiciones médicas */}
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(topFile.quizMedico.condiciones || {}).map(([key, value]: [string, any]) => {
                          const labels: Record<string, string> = {
                            enfermedadActual: 'Enfermedad actual',
                            tratamientoActual: 'Tratamiento actual',
                            tomaMedicamentos: 'Toma medicamentos',
                            alergias: 'Alergias',
                            cirugias: 'Cirugías',
                            hospitalizaciones: 'Hospitalizaciones',
                            enfermedadCronica: 'Enfermedad crónica',
                            lesionFisica: 'Lesión física',
                            restriccionesActividad: 'Restricciones de actividad',
                            condicionPsicologica: 'Condición psicológica'
                          }
                          
                          return (
                            <div 
                              key={key}
                              className={`p-2 rounded-lg text-sm ${
                                value.tiene 
                                  ? 'bg-red-500/20 border border-red-500/30' 
                                  : 'bg-slate-700/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={value.tiene ? 'text-red-400' : 'text-slate-400'}>
                                  {labels[key] || key}
                                </span>
                                {value.tiene ? (
                                  <AlertTriangle className="w-4 h-4 text-red-400" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                )}
                              </div>
                              {value.tiene && value.detalles && (
                                <p className="text-xs text-red-300 mt-1">{value.detalles}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Contacto de emergencia */}
                      {topFile.quizMedico.contactoEmergencia && (
                        <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
                          <p className="text-xs text-slate-400 mb-2">Contacto de emergencia:</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <p className="font-medium text-white">{topFile.quizMedico.contactoEmergencia.nombre}</p>
                              <p className="text-xs text-slate-400">{topFile.quizMedico.contactoEmergencia.relacion}</p>
                            </div>
                            <a 
                              href={`tel:${topFile.quizMedico.contactoEmergencia.telefono}`}
                              className="ml-auto flex items-center gap-1 text-cyan-400 hover:underline"
                            >
                              <Phone className="w-4 h-4" />
                              {topFile.quizMedico.contactoEmergencia.telefono}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleSection>

                {/* SECCIÓN: PRE-REGISTROS AVANZADOS */}
                <CollapsibleSection
                  title="Pre-registros Avanzados"
                  icon={<CreditCard className="w-5 h-5 text-amber-400" />}
                  count={topFile.preRegistros.total}
                  isExpanded={expandedSections.has('preRegistros')}
                  onToggle={() => toggleSection('preRegistros')}
                  color="amber"
                >
                  {topFile.preRegistros.historial.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Sin pre-registros</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {topFile.preRegistros.historial.map((reg: any) => (
                        <div key={reg.id} className="bg-slate-700/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-400">{reg.productoOrigen?.name}</span>
                              <span className="text-slate-500">→</span>
                              <span className="text-sm text-amber-400 font-medium">{reg.productoDestino?.name}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(reg.estado)}`}>
                              {getStatusLabel(reg.estado)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Escaneado: {formatDate(reg.fechaEscaneo)}</span>
                            {reg.estado === 'PAID' && (
                              <span className="text-green-400">${reg.montoPagado} MXN</span>
                            )}
                            {reg.estado === 'PENDING' && (
                              <span className="text-amber-400">Promo: ${reg.precioPromo} MXN</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                {/* SECCIÓN: HISTORIAL DE PRODUCTOS */}
                <CollapsibleSection
                  title="Historial de Productos"
                  icon={<BookOpen className="w-5 h-5 text-purple-400" />}
                  count={topFile.historialProductos.enrollments.length}
                  isExpanded={expandedSections.has('historial')}
                  onToggle={() => toggleSection('historial')}
                  color="purple"
                >
                  {topFile.historialProductos.enrollments.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">Sin enrollments</p>
                  ) : (
                    <div className="space-y-2">
                      {topFile.historialProductos.enrollments.map((enroll: any) => (
                        <div key={enroll.id} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{enroll.vision?.name}</p>
                            <p className="text-xs text-slate-400">Nivel: {enroll.nivel}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(enroll.estado)}`}>
                              {getStatusLabel(enroll.estado)}
                            </span>
                            <p className="text-xs text-slate-500 mt-1">{formatDate(enroll.fechaInscripcion)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                {/* SECCIÓN: CARTA FRUTOS */}
                {topFile.cartaFrutos && (
                  <CollapsibleSection
                    title="Carta Frutos"
                    icon={<Target className="w-5 h-5 text-cyan-400" />}
                    count={1}
                    isExpanded={expandedSections.has('carta')}
                    onToggle={() => toggleSection('carta')}
                    color="cyan"
                  >
                    <div className="space-y-4">
                      {/* Estado */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(topFile.cartaFrutos.estado)}`}>
                          {topFile.cartaFrutos.estado}
                        </span>
                        {topFile.cartaFrutos.fechaAprobacion && (
                          <span className="text-xs text-slate-400">
                            Aprobada: {formatDate(topFile.cartaFrutos.fechaAprobacion)}
                          </span>
                        )}
                      </div>
                      
                      {/* Declaraciones */}
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2">Declaraciones:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(topFile.cartaFrutos.declaraciones || {}).map(([key, value]: [string, any]) => {
                            if (!value) return null
                            const labels: Record<string, string> = {
                              finanzas: '💰 Finanzas',
                              relaciones: '❤️ Relaciones',
                              talentos: '🎯 Talentos',
                              salud: '🏃 Salud',
                              pazMental: '🧘 Paz Mental',
                              ocio: '🎮 Ocio',
                              servicioTrans: '🌟 Servicio Trans.',
                              servicioComunidad: '🤝 Servicio Com.'
                            }
                            return (
                              <div key={key} className="bg-slate-700/30 p-2 rounded-lg">
                                <p className="text-xs text-cyan-400">{labels[key] || key}</p>
                                <p className="text-white text-sm mt-1">{value}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      {/* Metas con avance */}
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2">Metas y Avances:</p>
                        <div className="space-y-2">
                          {Object.entries(topFile.cartaFrutos.metas || {}).map(([key, value]: [string, any]) => {
                            if (!value?.meta) return null
                            const labels: Record<string, string> = {
                              finanzas: '💰 Finanzas',
                              relaciones: '❤️ Relaciones',
                              talentos: '🎯 Talentos',
                              salud: '🏃 Salud',
                              pazMental: '🧘 Paz Mental',
                              ocio: '🎮 Ocio',
                              servicioTrans: '🌟 Servicio Trans.',
                              servicioComunidad: '🤝 Servicio Com.',
                              enrolamiento: '👥 Enrolamiento'
                            }
                            return (
                              <div key={key} className="bg-slate-700/30 p-2 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs text-cyan-400">{labels[key] || key}</p>
                                  <span className="text-xs text-amber-400">{value.avance || 0}%</span>
                                </div>
                                <p className="text-white text-sm">{value.meta}</p>
                                <div className="mt-2 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                    style={{ width: `${value.avance || 0}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>
                )}

                {/* SECCIÓN: ESTADÍSTICAS DE TAREAS */}
                <CollapsibleSection
                  title="Estadísticas de Tareas"
                  icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                  count={topFile.estadisticasTareas.total}
                  isExpanded={expandedSections.has('tareas')}
                  onToggle={() => toggleSection('tareas')}
                  color="emerald"
                >
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{topFile.estadisticasTareas.total}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{topFile.estadisticasTareas.completed}</p>
                      <p className="text-xs text-slate-400">Completadas</p>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{topFile.estadisticasTareas.pending}</p>
                      <p className="text-xs text-slate-400">Pendientes</p>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{topFile.estadisticasTareas.cancelled}</p>
                      <p className="text-xs text-slate-400">Canceladas</p>
                    </div>
                  </div>
                  
                  {/* Barra de progreso */}
                  {topFile.estadisticasTareas.total > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-slate-400">Progreso general</span>
                        <span className="text-cyan-400">
                          {Math.round((topFile.estadisticasTareas.completed / topFile.estadisticasTareas.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                          style={{ 
                            width: `${(topFile.estadisticasTareas.completed / topFile.estadisticasTareas.total) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CollapsibleSection>

              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Componente auxiliar para secciones colapsables
function CollapsibleSection({ 
  title, 
  icon, 
  count, 
  isExpanded, 
  onToggle, 
  color,
  badge,
  children 
}: {
  title: string
  icon: React.ReactNode
  count: number
  isExpanded: boolean
  onToggle: () => void
  color: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  const colorClasses: Record<string, string> = {
    green: 'from-green-500/10 to-green-500/5 border-green-500/30 hover:border-green-500/50',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/30 hover:border-blue-500/50',
    red: 'from-red-500/10 to-red-500/5 border-red-500/30 hover:border-red-500/50',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/30 hover:border-amber-500/50',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/30 hover:border-purple-500/50',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50'
  }

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} border rounded-xl overflow-hidden transition-colors`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-white">{title}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{count}</span>
          {badge}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
